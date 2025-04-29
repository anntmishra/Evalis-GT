const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const colors = require('colors');
const { connectDB, sequelize } = require('./config/db');
const { Student, Teacher, Batch, Subject, TeacherSubject } = require('./models');

// Load environment variables
dotenv.config();

const createTestUsers = async () => {
  try {
    console.log('Connecting to NeonDB...'.yellow);
    await connectDB();
    
    // First, create a test batch
    console.log('Creating test batch...'.cyan);
    const [batch, batchCreated] = await Batch.findOrCreate({
      where: { name: 'Test Batch 2025' },
      defaults: {
        id: 'TB2025',
        name: 'Test Batch 2025',
        startYear: 2022,
        endYear: 2026,
        department: 'Computer Science',
        active: true
      }
    });
    
    if (batchCreated) {
      console.log('Test batch created'.green);
    } else {
      console.log('Test batch already exists'.yellow);
    }
    
    // Create test subjects
    console.log('Creating test subjects...'.cyan);
    const subjects = [
      { id: 'CS101', name: 'Introduction to Programming', credits: 4, section: 'A' },
      { id: 'CS102', name: 'Data Structures', credits: 4, section: 'A' }
    ];
    
    for (const subjectData of subjects) {
      const [subject, created] = await Subject.findOrCreate({
        where: { id: subjectData.id },
        defaults: subjectData
      });
      
      if (created) {
        console.log(`Subject ${subject.id} created`.green);
      } else {
        console.log(`Subject ${subject.id} already exists`.yellow);
      }
    }
    
    // Create test student
    console.log('Creating test student...'.cyan);
    const [student, studentCreated] = await Student.findOrCreate({
      where: { id: 'S12345' },
      defaults: {
        id: 'S12345',
        name: 'Test Student',
        email: 'student@test.com',
        password: 'password123',
        section: 'A',
        batch: batch.id
      }
    });
    
    if (studentCreated) {
      console.log('Test student created'.green);
      console.log(`Student ID: ${'S12345'.green}`);
      console.log(`Password: ${'password123'.green}`);
    } else {
      console.log('Test student already exists'.yellow);
    }
    
    // Create test teacher
    console.log('Creating test teacher...'.cyan);
    const [teacher, teacherCreated] = await Teacher.findOrCreate({
      where: { email: 'teacher@test.com' },
      defaults: {
        id: 'T12345',
        name: 'Test Teacher',
        email: 'teacher@test.com',
        password: 'password123',
        department: 'Computer Science'
      }
    });
    
    if (teacherCreated) {
      console.log('Test teacher created'.green);
      console.log(`Teacher Email: ${'teacher@test.com'.green}`);
      console.log(`Password: ${'password123'.green}`);
      
      // Assign subjects to teacher
      const allSubjects = await Subject.findAll({ where: { id: subjects.map(s => s.id) } });
      await Promise.all(
        allSubjects.map(subject => 
          TeacherSubject.findOrCreate({
            where: { teacherId: teacher.id, subjectId: subject.id }
          })
        )
      );
      console.log('Assigned subjects to teacher'.green);
    } else {
      console.log('Test teacher already exists'.yellow);
    }
    
    console.log('\n-----------------------------------'.cyan);
    console.log('Test users created successfully!'.green.bold);
    console.log('-----------------------------------'.cyan);
    console.log('You can now login with these credentials:'.cyan);
    console.log('\nAdmin:'.yellow);
    console.log('  Username:'.cyan, 'admin');
    console.log('  Password:'.cyan, 'admin123');
    console.log('\nTeacher:'.yellow);
    console.log('  Email:'.cyan, 'teacher@test.com');
    console.log('  Password:'.cyan, 'password123');
    console.log('\nStudent:'.yellow);
    console.log('  ID:'.cyan, 'S12345');
    console.log('  Password:'.cyan, 'password123');
    console.log('-----------------------------------'.cyan);
    
    // Close connection
    await sequelize.close();
    console.log('Database connection closed.'.yellow);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test users:'.red.bold);
    console.error(`${error.message}`.red);
    console.error(error.stack);
    if (sequelize) await sequelize.close();
    process.exit(1);
  }
};

// Run the script
createTestUsers();