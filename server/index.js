require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const yaml = require('js-yaml');
const Validator = require('./validator');
const { Octokit } = require('@octokit/rest');

const app = express();
app.use(bodyParser.json());
app.use(require('express').static('..'));

const PORT = process.env.PORT || 3000;

function isAzure() {
  return process.env.OPENAI_API_TYPE && process.env.OPENAI_API_TYPE.toLowerCase() === 'azure';
}

async function callLLM({ messages, max_tokens = 512, model = process.env.OPENAI_MODEL || 'gpt-4o-mini' }) {
  // Supports OpenAI and Azure OpenAI
  if (isAzure()) {
    const base = process.env.OPENAI_API_BASE; // e.g. https://your-resource.openai.azure.com
    const deployment = process.env.OPENAI_DEPLOYMENT; // the deployment/model name
    const apiVersion = process.env.OPENAI_API_VERSION || '2023-05-15';
    if (!base || !deployment) throw new Error('Azure configuration missing (OPENAI_API_BASE or OPENAI_DEPLOYMENT).');
    const url = `${base}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({ messages, max_tokens })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Azure OpenAI error: ${res.status} ${txt}`);
    }
    const data = await res.json();
    // Azure returns choices[0].message
    return data.choices[0].message.content;
  } else {
    const url = 'https://api.openai.com/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model, messages, max_tokens })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenAI error: ${res.status} ${txt}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }
}

// Basic prompt template
function buildPrompt(userPrompt, hints = {}) {
  const system = `You are a helpful assistant that outputs a GitHub Actions workflow YAML which sets only the workflow trigger (the \"on\" section) and a minimal job skeleton. Output valid YAML only, with no surrounding backticks. Use event names and filter fields that are supported by GitHub Actions. Do not include secrets or tokens.`;
  const user = `Description: ${userPrompt}\nHints: ${JSON.stringify(hints)}`;
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

app.post('/generate', async (req, res) => {
  try {
    const { prompt, hints = {} } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const messages = buildPrompt(prompt, hints);
    const content = await callLLM({ messages });
    // Return raw string
    res.json({ yaml: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/validate', (req, res) => {
  try {
    const { yaml: yamlText } = req.body;
    if (!yamlText) return res.status(400).json({ error: 'yaml is required' });
    let parsed;
    try {
      parsed = yaml.load(yamlText);
    } catch (e) {
      return res.json({ valid: false, errors: ['YAML parse error: ' + e.message] });
    }
    const result = Validator.validateTopology(parsed);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/create-pr', async (req, res) => {
  try {
    const { owner, repo, branchName, path, yaml: yamlText, prTitle, prBody } = req.body;
    if (!owner || !repo || !branchName || !path || !yamlText) {
      return res.status(400).json({ error: 'owner, repo, branchName, path and yaml are required' });
    }
    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(500).json({ error: 'Server missing GITHUB_TOKEN in environment' });
    const octokit = new Octokit({ auth: token });
    // Get default branch
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;
    // Get default branch sha
    const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
    const baseSha = refData.object.sha;
    // Create new branch ref
    try {
      await octokit.git.getRef({ owner, repo, ref: `heads/${branchName}` });
      // branch exists
    } catch (e) {
      // create branch
      await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: baseSha });
    }
    // Create or update file on that branch
    const content = Buffer.from(yamlText, 'utf8').toString('base64');
    const message = prTitle || `Add workflow ${path}`;
    // Use createOrUpdate
    await octokit.repos.createOrUpdateFileContents({ owner, repo, path, message, content, branch: branchName });
    // Create PR
    const { data: pr } = await octokit.pulls.create({ owner, repo, title: prTitle || message, head: branchName, base: defaultBranch, body: prBody || '' });
    res.json({ url: pr.html_url });
  } catch (err) {
    console.error(err);
    // Try to provide helpful message
    const msg = err && err.response && err.response.data ? err.response.data : err.message;
    res.status(500).json({ error: String(msg) });
  }
});

app.listen(PORT, () => console.log(`AI backend listening on ${PORT}`));
