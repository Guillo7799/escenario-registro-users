import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./node_modules/@playwright/test/cli.js', import.meta.url));
const child = spawn(process.execPath, [cli, 'test', '--headed', '--workers=1'], {
  cwd: process.cwd(),
  env: { ...process.env, PW_DEMO: '1' },
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code) => process.exit(code ?? 1));
