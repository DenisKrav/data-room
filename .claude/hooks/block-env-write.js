// PreToolUse hook (Write|Edit): block writes to real .env files.
// .env.example stays editable — only files whose basename is exactly ".env"
// or ".env.<something-that-is-not-example>" are blocked.
let data = '';
process.stdin.on('data', (chunk) => (data += chunk));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(data);
  } catch {
    process.exit(0);
  }

  const filePath = (input.tool_input && input.tool_input.file_path) || '';
  const base = filePath.replace(/\\/g, '/').split('/').pop() || '';
  const isEnvFile = /^\.env(\..*)?$/.test(base) && !base.endsWith('.example');

  if (isEnvFile) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason:
            'Editing .env files is blocked by project policy — update .env.example as the template and set real secrets outside Claude (Render/Vercel/Supabase dashboards or your local shell).',
        },
      }),
    );
  }
});