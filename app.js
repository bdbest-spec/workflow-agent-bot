const activities = {
  pull_request: ['opened', 'edited', 'closed', 'reopened', 'synchronize', 'labeled', 'unlabeled', 'ready_for_review', 'review_requested'],
  issues: ['opened', 'edited', 'closed', 'reopened', 'labeled', 'unlabeled', 'assigned', 'unassigned'],
  issue_comment: ['created', 'edited', 'deleted'],
  pull_request_review: ['submitted', 'edited', 'dismissed'],
  discussion: ['created', 'edited', 'deleted', 'answered', 'unanswered']
};
const $ = id => document.getElementById(id);
const event = $('event'), activity = $('activity'), activityPanel = $('activity-panel');
function fillActivities() {
  const values = activities[event.value] || [];
  activity.innerHTML = values.map(item => `<option value="${item}">${item}</option>`).join('');
  activityPanel.hidden = !values.length;
  $('filters').hidden = !['push', 'pull_request'].includes(event.value);
  $('cron-panel').hidden = event.value !== 'schedule';
}
function list(id) { return $(id).value.split(',').map(v => v.trim()).filter(Boolean); }
function quote(value) { return JSON.stringify(value); }
function generate() {
  const name = event.value;
  let lines = ['name: Workflow Agent Bot', 'on:'];
  const selected = [...activity.selectedOptions].map(o => o.value);
  if (name === 'schedule') {
    lines.push(`  schedule:`, `    - cron: ${quote($('cron').value)}`);
  } else if (name === 'workflow_dispatch' || name === 'workflow_call') {
    lines.push(`  ${name}:`);
  } else if (selected.length || list('branches').length || list('paths').length) {
    lines.push(`  ${name}:`);
    if (selected.length) lines.push(`    types: [${selected.join(', ')}]`);
    if (list('branches').length) lines.push(`    branches: [${list('branches').join(', ')}]`);
    if (list('paths').length) lines.push(`    paths: [${list('paths').join(', ')}]`);
  } else lines.push(`  ${name}:`);
  lines.push('', 'jobs:', '  agent:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: echo "Workflow Agent Bot is running"');
  $('output').textContent = lines.join('\n');
}
event.addEventListener('change', () => { fillActivities(); generate(); });
$('generate').addEventListener('click', () => { generate(); $('status').textContent = 'YAML তৈরি হয়েছে।'; });
$('copy').addEventListener('click', async () => { await navigator.clipboard.writeText($('output').textContent); $('status').textContent = 'YAML কপি হয়েছে।'; });
$('reset').addEventListener('click', () => { event.value = 'push'; $('branches').value = ''; $('paths').value = ''; fillActivities(); generate(); $('status').textContent = ''; });
fillActivities(); generate();
