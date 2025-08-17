#!/usr/bin/env node
// Quick auth debug: lists counts and sample students/teachers with password hash length
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { connectDB } = require('../config/db');
const models = require('../models');

(async () => {
  try {
    await connectDB();
    const { Student, Teacher } = models;
    const studentCount = await Student.count();
    const teacherCount = await Teacher.count();
    console.log(`Students: ${studentCount}, Teachers: ${teacherCount}`);

    const sampleStudents = await Student.findAll({ limit: 5 });
    const sampleTeachers = await Teacher.findAll({ limit: 5 });

    const mapUser = u => ({ id: u.id, email: u.email, name: u.name, section: u.section, hashLen: u.password ? u.password.length : 0 });
    console.log('Sample Students:', sampleStudents.map(mapUser));
    console.log('Sample Teachers:', sampleTeachers.map(mapUser));

    if(sampleStudents.some(s => s.password && !s.password.startsWith('$2'))) {
      console.warn('Some student passwords not bcrypt hashed – login will fail for those until reset.');
    }
    if(sampleTeachers.some(t => t.password && !t.password.startsWith('$2'))) {
      console.warn('Some teacher passwords not bcrypt hashed – login will fail for those until reset.');
    }

    process.exit(0);
  } catch (e) {
    console.error('Debug auth script error:', e.message);
    process.exit(1);
  }
})();
