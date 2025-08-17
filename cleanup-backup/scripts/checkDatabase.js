const { sequelize } = require('../config/db');
const { Student, Batch, Teacher, Subject } = require('../models');
const colors = require('colors');

// Connect to database and display data
const checkDatabase = async () => {
  try {
    console.log('Connecting to database...'.yellow);
    await sequelize.authenticate();
    console.log(`Database connected`.cyan.underline);

    // Count all records in main tables
    const studentCount = await Student.count();
    const batchCount = await Batch.count();
    const teacherCount = await Teacher.count();
    const subjectCount = await Subject.count();

    console.log('\nDatabase Summary:'.cyan.bold);
    console.log(`Students: ${studentCount}`.cyan);
    console.log(`Batches: ${batchCount}`.cyan);
    console.log(`Teachers: ${teacherCount}`.cyan);
    console.log(`Subjects: ${subjectCount}`.cyan);

    // Show batches
    console.log('\nBatch List:'.yellow.bold);
    const batches = await Batch.findAll();
    if (batches.length === 0) {
      console.log('No batches found'.grey);
    } else {
      batches.forEach(batch => {
        console.log(`  - ${batch.id}: ${batch.name}`.white);
      });
    }

    // Show students per batch
    console.log('\nStudents per Batch:'.yellow.bold);
    for (const batch of batches) {
      const students = await Student.findAll({
        where: { batch: batch.id },
        attributes: ['id', 'name', 'section', 'batch']
      });
      
      console.log(`\n  ${batch.name} (${batch.id}): ${students.length} students`.cyan);
      
      if (students.length > 0) {
        const testStudents = students.filter(s => 
          s.name.toLowerCase().includes('test') || 
          s.id.toLowerCase().includes('test')
        );
        
        const realStudents = students.filter(s => 
          !s.name.toLowerCase().includes('test') && 
          !s.id.toLowerCase().includes('test')
        );
        
        if (testStudents.length > 0) {
          console.log(`    Test students: ${testStudents.length}`.yellow);
        }
        
        if (realStudents.length > 0) {
          console.log(`    Real students: ${realStudents.length}`.green);
        }
        
        // Show first 5 students as sample
        const sampleStudents = students.slice(0, 5);
        sampleStudents.forEach(student => {
          const isTest = student.name.toLowerCase().includes('test') || 
                         student.id.toLowerCase().includes('test');
          
          const studentInfo = `    - ${student.id}: ${student.name} (${student.section})`;
          console.log(isTest ? studentInfo.grey : studentInfo.white);
        });
        
        if (students.length > 5) {
          console.log(`    ... and ${students.length - 5} more`.grey);
        }
      }
    }

    console.log('\nDatabase check completed'.green.bold);
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

// Run the function
checkDatabase(); 