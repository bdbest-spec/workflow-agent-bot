const allowedEvents = [
  'branch_protection_rule','check_run','check_suite','create','delete','deployment','deployment_status',
  'discussion','discussion_comment','fork','gollum','image_version','issue_comment','issues','label','merge_group',
  'milestone','page_build','project','project_card','project_column','public','pull_request','pull_request_comment',
  'pull_request_review','pull_request_review_comment','pull_request_target','push','registry_package','release',
  'repository_dispatch','schedule','status','watch','workflow_call','workflow_dispatch','workflow_run'
];

function validateTopology(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Top-level document must be a mapping/object'] };
  }
  // check on
  if (!('on' in obj)) errors.push('Top-level key "on" is missing');
  // check jobs
  if (!('jobs' in obj)) errors.push('Top-level key "jobs" is missing');
  // If on is string or mapping, validate event names
  if (obj.on) {
    if (typeof obj.on === 'string') {
      if (!allowedEvents.includes(obj.on) && !obj.on.startsWith('workflow_')) errors.push(`Unknown event: ${obj.on}`);
    } else if (Array.isArray(obj.on)) {
      obj.on.forEach(ev => { if (typeof ev === 'string' && !allowedEvents.includes(ev) && !ev.startsWith('workflow_')) errors.push(`Unknown event: ${ev}`); });
    } else if (typeof obj.on === 'object') {
      Object.keys(obj.on).forEach(k => { if (!allowedEvents.includes(k) && !k.startsWith('workflow_')) errors.push(`Unknown event: ${k}`); });
    }
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { validateTopology };
