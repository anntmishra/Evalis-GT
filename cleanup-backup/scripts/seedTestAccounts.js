#!/usr/bin/env node
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });
const { connectDB } = require('../config/db');
const { Student, Teacher } = require('../models');

(async () => {
  try {
    await connectDB();
    const studentId = 'STEST001';
    const teacherId = 'TTEST001';

    const [student, createdStudent] = await Student.findOrCreate({
      where: { id: studentId },
      defaults: {
        id: studentId,
        name: 'Test Student',
        section: 'A',
        batch: '2023-2027',
        email: 'teststudent@example.com',
        password: 'studpass123'
      }
    });

    if (!createdStudent) {
      // Reset password if exists
      student.password = 'studpass123';
      await student.save();
    }

    const [teacher, createdTeacher] = await Teacher.findOrCreate({
      where: { id: teacherId },
      defaults: {
        id: teacherId,
        name: 'Test Teacher',
        email: 'testteacher@example.com',
        password: 'teachpass123'
      }
    });

    if (!createdTeacher) {
      teacher.password = 'teachpass123';
      await teacher.save();
    }

    console.log('Seeded / updated test accounts:');
    console.log('Student login -> id: STEST001  password: studpass123');
    console.log('Teacher login -> email: testteacher@example.com  password: teachpass123');
    process.exit(0);
  } catch (e) {
    console.error('Seeding error:', e);
    process.exit(1);
  }
})();
