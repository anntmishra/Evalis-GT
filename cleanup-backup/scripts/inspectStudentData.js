/*
 * Diagnostic script to inspect student subjects & assignments linkage.
 * Usage: node server/scripts/inspectStudentData.js <STUDENT_ID>
 */
require('dotenv').config();
const { Student, Subject, Assignment, sequelize } = require('../models');
const { Op } = require('sequelize');

async function run() {
  const studentId = process.argv[2];
  console.log('--- Inspect Student Data ---');
  if (!studentId || studentId === 'STUDENT_ID') {
    console.log('Provide a real STUDENT_ID. Showing first 5 students:');
    const students = await Student.findAll({ limit: 5 });
    console.table(students.map(s => ({ id: s.id, batch: s.batch, activeSemesterId: s.activeSemesterId })));
    return;
  }
  const student = await Student.findByPk(studentId);
  if (!student) {
    console.error('Student not found:', studentId);
    console.log('Showing first 5 available students instead:');
    const students = await Student.findAll({ limit: 5 });
    console.table(students.map(s => ({ id: s.id, batch: s.batch, activeSemesterId: s.activeSemesterId })));
    return;
  }
  console.log('Student:', { id: student.id, batch: student.batch, activeSemesterId: student.activeSemesterId });

  // Subjects query similar to controller logic
  let subjects = await Subject.findAll({
    where: student.activeSemesterId ? {
      batchId: student.batch,
      [Op.or]: [
        { semesterId: student.activeSemesterId },
        { semesterId: null }
      ]
    } : { batchId: student.batch }
  });
  if (!subjects.length && student.activeSemesterId) {
    subjects = await Subject.findAll({ where: { batchId: student.batch } });
  }
  console.table(subjects.map(s => ({ id: s.id, batchId: s.batchId, semesterId: s.semesterId })));

  const subjectIds = subjects.map(s => s.id);
  const assignments = await Assignment.findAll({ where: { subjectId: { [Op.in]: subjectIds } } });
  console.table(assignments.map(a => ({ id: a.id, title: a.title, subjectId: a.subjectId, teacherId: a.teacherId })));

  console.log('Counts:', { subjects: subjects.length, assignments: assignments.length });
}

run().catch(err => {
  console.error('Error running diagnostic:', err);
}).finally(() => {
  sequelize.close();
});
