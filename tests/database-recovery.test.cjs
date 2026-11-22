const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readRecoveryExport } = require('../server/scripts/lib/databaseSetup');

function fixture(t, change = () => {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'evalis-export-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const data = Object.fromEntries(['Batches','Semesters','Subjects','Admins','Teachers','Students','Assignments','Submissions','TeacherSubjects'].map(name => [name, []]));
  data.Batches = [{ id: 'test-batch' }];
  data.Students = [{ id: 'test-student', batch: 'test-batch', password: '$2b$10$' + 'A'.repeat(53) }];
  change(data);
  const tables = Object.fromEntries(Object.entries(data).map(([name, rows]) => [name, rows.length]));
  for (const [name, rows] of Object.entries(data)) fs.writeFileSync(path.join(directory, `${name}.json`), JSON.stringify(rows));
  fs.writeFileSync(path.join(directory, 'export_metadata.json'), JSON.stringify({ tables, totalRecords: Object.values(tables).reduce((sum, count) => sum + count, 0) }));
  return directory;
}

test('recovery preflight accepts consistent export without connecting to a database', t => {
  const result = readRecoveryExport(fixture(t));
  assert.equal(result.metadata.totalRecords, 2);
});
test('recovery preflight rejects dangling relationships', t => {
  assert.throws(() => readRecoveryExport(fixture(t, data => { data.Students[0].batch = 'missing'; })), /Unresolved export relationship/);
});
test('recovery preflight rejects duplicate IDs', t => {
  assert.throws(() => readRecoveryExport(fixture(t, data => { data.Batches.push({ id: 'test-batch' }); })), /duplicate ID/);
});
test('recovery preflight rejects plaintext passwords', t => {
  assert.throws(() => readRecoveryExport(fixture(t, data => { data.Students[0].password = 'not-a-hash'; })), /Expected bcrypt/);
});
test('recovery preflight rejects incomplete export', t => {
  const directory = fixture(t);
  fs.writeFileSync(path.join(directory, 'Batches.json'), '[]');
  assert.throws(() => readRecoveryExport(directory), /Export count mismatch/);
});
