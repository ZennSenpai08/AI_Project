import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
let count = 0;
function checkDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) { if (!['node_modules', 'test-results', 'playwright-report'].includes(entry.name)) checkDirectory(join(directory, entry.name)); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const result = spawnSync(process.execPath, ['--check', join(directory, entry.name)], { encoding: 'utf8' });
    if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
    count++;
  }
}
for (const directory of ['server', 'public', 'scripts', 'tests']) checkDirectory(directory);
console.log(`Syntax checks passed: ${count} JavaScript files.`);
