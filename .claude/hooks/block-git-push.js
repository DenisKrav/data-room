// PreToolUse hook (Bash): block `git push --force`/`--force-with-lease` and
// any push that would land directly on main/master.
const { execSync } = require('child_process');

let data = '';
process.stdin.on('data', (chunk) => (data += chunk));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(data);
  } catch {
    process.exit(0);
  }

  if (input.tool_name !== 'Bash') process.exit(0);
  const cmd = (input.tool_input && input.tool_input.command) || '';
  if (!/\bgit\b/.test(cmd) || !/\bpush\b/.test(cmd)) process.exit(0);

  const tokens = cmd.trim().split(/\s+/);
  const hasForce = tokens.some(
    (t) => t === '--force' || t === '--force-with-lease' || t === '-f' || t.startsWith('--force='),
  );

  const pushIdx = tokens.indexOf('push');
  const argsAfterPush = tokens.slice(pushIdx + 1).filter((t) => !t.startsWith('-'));

  function currentBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  }

  let targetsMain = false;
  if (argsAfterPush.length <= 1) {
    // bare `git push` or `git push origin` — pushes the current branch
    const branch = currentBranch();
    targetsMain = branch === 'main' || branch === 'master';
  } else {
    // e.g. `git push origin main` or `git push origin HEAD:main`
    const ref = argsAfterPush[argsAfterPush.length - 1];
    targetsMain = /(^|:)(main|master)$/.test(ref);
  }

  if (hasForce || targetsMain) {
    const reason = hasForce
      ? 'Force-pushing is blocked by project policy — resolve conflicts with a merge/rebase, or ask the user to force-push manually.'
      : 'Direct pushes to main are blocked by project policy — push a branch and open a pull request, or ask the user to push manually.';
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: reason,
        },
      }),
    );
  }
});