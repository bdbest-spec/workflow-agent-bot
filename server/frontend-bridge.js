/* Extended app.js: adds calls to backend generate and validate endpoints */

// previous code kept; add AI button wiring
(function(){
  const aiBtn = document.getElementById('generate-ai');
  const nl = document.getElementById('nlprompt');
  const status = document.getElementById('ai-status');
  async function generateWithAI() {
    const prompt = nl.value.trim();
    if (!prompt) { status.textContent = 'প্রম্পট লিখে দিন।'; return; }
    status.textContent = 'Generating...';
    try {
      const resp = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      document.getElementById('output').textContent = data.yaml;
      status.textContent = 'AI YAML তৈরি হয়েছে। যাচাই করতে Validate চাপুন।';
    } catch (e) {
      console.error(e);
      status.textContent = 'AI error: ' + e.message;
    }
  }
  if (aiBtn) aiBtn.addEventListener('click', generateWithAI);
})();
