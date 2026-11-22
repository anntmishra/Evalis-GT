// Parse application code without importing it, loading secrets, or connecting to a DB.
const { readdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '..');
function filesIn(directory) {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : file.endsWith('.js') ? [file] : [];
  });
}
const files = ['server/server.js', 'server/index.js', ...[
  'config', 'controllers', 'middleware', 'models', 'routes', 'services', 'utils',
].flatMap(directory => filesIn(`server/${directory}`))];
let failures = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    failures++;
    console.error(`${file}\n${result.stderr || result.error}`);
  }
}
console.log(`Server syntax: ${files.length - failures}/${files.length} files passed.`);
process.exitCode = failures ? 1 : 0;
