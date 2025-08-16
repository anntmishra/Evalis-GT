/*
 * Lists students, subjects (with batchId/semesterId), and assignments.
 * Usage: node server/scripts/inspectAcademicData.js
 */
require('dotenv').config();
const { Student, Subject, Assignment, TeacherSubject, Teacher, sequelize } = require('../models');

(async () => {
  try {
    const students = await Student.findAll({ limit: 20 });
    console.log('\n=== Students ===');
    console.table(students.map(s => ({ id: s.id, batch: s.batch, activeSemesterId: s.activeSemesterId })));

    const subjects = await Subject.findAll({ limit: 50 });
    console.log('\n=== Subjects ===');
    console.table(subjects.map(s => ({ id: s.id, batchId: s.batchId, semesterId: s.semesterId })));

    const assignments = await Assignment.findAll({ limit: 50 });
    console.log('\n=== Assignments ===');
    console.table(assignments.map(a => ({ id: a.id, title: a.title, subjectId: a.subjectId, teacherId: a.teacherId })));

    // Cross-check: for student S12345 list subjects in same batch
    const targetId = 'S12345';
    const student = students.find(s => s.id === targetId);
    if (student) {
      const batchSubjects = subjects.filter(sub => sub.batchId === student.batch);
      console.log(`\nBatch subjects for ${targetId}:`, batchSubjects.map(b => b.id));
      const batchAssignments = assignments.filter(a => batchSubjects.some(sub => sub.id === a.subjectId));
      console.log(`Assignments tied to those subjects:`, batchAssignments.map(a => a.id));
    } else {
      console.log('Student S12345 not present in DB (unexpected).');
    }
  } catch (e) {
    console.error('Diagnostic error:', e.message);
  } finally {
    await sequelize.close();
  }
})();
