const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const XLSX = require('xlsx');

const templatePath = path.join(__dirname, '..', 'outputs', 'import-system', 'Evalis_Academic_Import_Template.xlsx');
const workbook = XLSX.readFile(templatePath);
const rows = name => XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' });

test('academic bulk import template contains every dependency sheet in import order', () => {
  assert.deepEqual(workbook.SheetNames, [
    'Instructions', 'Schools', 'Departments', 'Programmes', 'Batches', 'Semesters',
    'Subjects', 'Students', 'Teachers', 'Teaching Assignments', 'Lists',
  ]);
});

test('template models the BTECH CSE 2026-30 batch with eight valid semesters', () => {
  const batches = rows('Batches');
  const semesters = rows('Semesters');
  assert.equal(batches.length, 1);
  assert.equal(batches[0].Batch_ID, 'BTECH-CSE-2026-2030');
  assert.equal(semesters.length, 8);
  assert.deepEqual(semesters.map(item => item.Number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(semesters.every(item => item.Batch_ID === batches[0].Batch_ID));
});

test('all cross-sheet identifiers resolve and no password column exists', () => {
  const batchIds = new Set(rows('Batches').map(item => item.Batch_ID));
  const semesterRows = rows('Semesters');
  const semesterIds = new Set(semesterRows.map(item => item.Semester_ID));
  const subjectRows = rows('Subjects');
  const subjectIds = new Set(subjectRows.map(item => item.Subject_ID));
  const teacherIds = new Set(rows('Teachers').map(item => item.Teacher_ID));

  assert.ok(semesterRows.every(item => batchIds.has(item.Batch_ID)));
  assert.ok(subjectRows.every(item => batchIds.has(item.Batch_ID) && semesterIds.has(item.Semester_ID)));
  assert.ok(rows('Students').every(item => batchIds.has(item.Batch_ID)));
  assert.ok(rows('Teaching Assignments').every(item => teacherIds.has(item.Teacher_ID) && subjectIds.has(item.Subject_ID)));

  for (const name of workbook.SheetNames) {
    const headers = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' })[0] || [];
    assert.equal(headers.some(header => /password/i.test(String(header))), false, `${name} must not contain password columns`);
  }
});

test('screenshot semester-one subjects and credits are represented exactly', () => {
  const semesterOne = rows('Subjects').filter(item => item.Semester_ID.endsWith('-SEM1'));
  assert.deepEqual(semesterOne.map(item => [item.Subject_ID, item.Name, item.Credits]), [
    ['CSET111-26', 'Computer Networks', 4],
    ['CSET221-26', 'Database Management System', 7],
    ['CSET202-26', 'Operating System', 4],
  ]);
  assert.equal(semesterOne.reduce((sum, item) => sum + item.Credits, 0), 15);
});
