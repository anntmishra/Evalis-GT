const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const { Student, Subject, Teacher, Assignment, TeacherSubject, sequelize } = require('./models');

dotenv.config();

(async () => {
  try {
    await connectDB();
    const student = await Student.findByPk('S12345');
    if (!student) throw new Error('Test student S12345 not found');
    const subjects = await Subject.findAll({ where: { batchId: student.batch } });
    if (!subjects.length) throw new Error('No subjects found for student batch');
    const subject = subjects[0];

    // Ensure we have a teacher assigned to subject
    let teacher = await Teacher.findOne();
    if (!teacher) throw new Error('No teacher found');
    await TeacherSubject.findOrCreate({ where: { teacherId: teacher.id, subjectId: subject.id } });

    const assignment = await Assignment.create({
      title: 'Sample Assignment 1',
      description: 'Demo assignment for diagnostics',
      subjectId: subject.id,
      teacherId: teacher.id,
      examType: 'Assignment',
      dueDate: new Date(Date.now() + 7*24*3600*1000)
    });
    console.log('Created assignment:', assignment.id, 'subject', subject.id, 'teacher', teacher.id);
  } catch (e) {
    console.error('Error creating test assignment:', e.message);
  } finally {
    await sequelize.close();
  }
})();
