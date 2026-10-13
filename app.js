const activities = {
  pull_request: ['opened', 'edited', 'closed', 'reopened', 'synchronize', 'labeled', 'unlabeled', 'ready_for_review', 'review_requested'],
  issues: ['opened', 'edited', 'closed', 'reopened', 'labeled', 'unlabeled', 'assigned', 'unassigned'],
  issue_comment: ['created', 'edited', 'deleted'],
  pull_request_review: ['submitted', 'edited', 'dismissed'],
  discussion: ['created', 'edited', 'deleted', 'answered', 'unanswered'],
  // Added workflow_run support (common types)
  workflow_run: ['completed', 'requested', 'rerequested']
};

const $ = id => document.getElementById(id);
const event = $('event'), activity = $('activity'), activityPanel = $('activity-panel');

function ensureCronErrorNode() {
  const panel = $('cron-panel');
  if (!panel) return null;
  let err = $('cron-error');
  if (!err) {
    err = document.createElement('div');
    err.id = 'cron-error';
    err.style.color = '#c53030';
    err.style.marginTop = '8px';
    err.style.fontSize = '0.9rem';
    panel.appendChild(err);
  }
  return err;
}

function isValidCron(expr) {
  if (!expr || !expr.trim()) return false;
  // Very small validation: 5 fields, allowed characters digits/*,- and ranges
  const re = /^([\d\*\/\-,]+)\s+([\d\*\/\-,]+)\s+([\d\*\/\-,]+)\s+([\d\*\/\-,]+)\s+([\d\*\/\-,]+)$/;
  return re.test(expr.trim());
}

function fillActivities() {
  const values = activities[event.value] || [];
  activity.innerHTML = values.map(item => `<option value="${item}">${item}</option>`).join('');
  activityPanel.hidden = !values.length;
  $('filters').hidden = !['push', 'pull_request'].includes(event.value);
  $('cron-panel').hidden = event.value !== 'schedule';

  // Show/hide workflow_run note (workflow_run requires a workflow name filter)
  const workflowNoteId = 'workflow-run-note';
  let note = $(workflowNoteId);
  if (event.value === 'workflow_run') {
    if (!note) {
      note = document.createElement('small');
      note.id = workflowNoteId;
      note.style.display = 'block';
      note.style.color = '#6b7280';
      note.style.marginTop = '6px';
      note.textContent = 'Note: workflow_run typically filters by workflow name and run types (e.g. completed). Use the "paths"/"branches" as needed.';
      activityPanel.appendChild(note);
    }
  } else if (note) {
    note.remove();
  }
}

function list(id) { return ($(id).value || '').split(',').map(v => v.trim()).filter(Boolean); }
function quote(value) { return JSON.stringify(value); }

function generate() {
  const name = event.value;
  let lines = [
    'name: Workflow Agent Bot',
    'on:'
  ];
  const selected = [...activity.selectedOptions].map(o => o.value);

  if (name === 'schedule') {
    const cronValue = $('cron').value || '';
    lines.push(`  schedule:`, `    - cron: ${quote(cronValue)}`);
  } else if (name === 'workflow_dispatch' || name === 'workflow_call') {
    lines.push(`  ${name}:`);
  } else if (selected.length || list('branches').length || list('paths').length) {
    lines.push(`  ${name}:`);
    if (selected.length) lines.push(`    types: [${selected.map(s => s).join(', ')}]`);
    if (list('branches').length) lines.push(`    branches: [${list('branches').join(', ')}]`);
    if (list('paths').length) lines.push(`    paths: [${list('paths').join(', ')}]`);
  } else lines.push(`  ${name}:`);

  lines.push('', 'jobs:', '  agent:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: echo "Workflow Agent Bot is running"');
  const out = lines.join('\n');
  $('output').textContent = out;
  updateDownloadLink(out);
}

// Create or update a download button/link for the generated YAML
function ensureDownloadButton() {
  if ($('download')) return $('download');
  const copyBtn = $('copy');
  if (!copyBtn) return null;
  const dl = document.createElement('button');
  dl.id = 'download';
  dl.className = 'ghost';
  dl.type = 'button';
  dl.textContent = 'ডাউনলোড';
  dl.style.marginLeft = '8px';
  copyBtn.insertAdjacentElement('afterend', dl);
  dl.addEventListener('click', () => {
    const text = $('output').textContent || '';
    if (!text) return;
    const blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent.yml';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    $('status').textContent = 'YAML ডাউনলোড করা হয়েছে।';
  });
  return dl;
}

function updateDownloadLink(text) {
  // ensure button exists so user can download
  ensureDownloadButton();
}

// Event wiring
event.addEventListener('change', () => { fillActivities(); generate(); });
$('generate').addEventListener('click', () => { generate(); $('status').textContent = 'YAML তৈরি হয়েছে। (কপি বা ডাউনলোড করুন)'; });
$('copy').addEventListener('click', async () => { await navigator.clipboard.writeText($('output').textContent); $('status').textContent = 'YAML কপি করা হয়েছে।'; });
$('reset').addEventListener('click', () => { event.value = 'push'; $('branches').value = ''; $('paths').value = ''; const cron = $('cron'); if (cron) cron.value = '0 0 * * *'; fillActivities(); generate(); $('status').textContent = ''; });

// Cron validation
const cronInput = $('cron');
if (cronInput) {
  const err = ensureCronErrorNode();
  const validate = () => {
    const val = cronInput.value || '';
    if (!isValidCron(val)) {
      if (err) err.textContent = 'সঠিক cron expression প্রয়োজন (৫ ফিল্ড: মিনিট ঘণ্টা দিন মাস সপ্তাহ)। উদাহরণ: 0 0 * * *';
      cronInput.style.borderColor = '#c53030';
      return false;
    }
    if (err) err.textContent = '';
    cronInput.style.borderColor = '';
    return true;
  };
  cronInput.addEventListener('input', validate);
  // validate once on load
  validate();
}

// Initialize download button and UI
ensureDownloadButton();
fillActivities();
generate();
