const { sequelize } = require('../config/db');
const { Student, Batch, TeacherSubject } = require('../models');
const colors = require('colors');

// Connect to database and clean up test data
const cleanDatabase = async () => {
  try {
    console.log('Connecting to database...'.yellow);
    await sequelize.authenticate();
    console.log(`Database connected`.cyan.underline);

    // Find test students (those with 'test' in their name or id)
    console.log('Finding test students...'.yellow);
    const testStudents = await Student.findAll({
      where: sequelize.or(
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('name')),
          'LIKE',
          '%test%'
        ),
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('id')),
          'LIKE',
          '%test%'
        )
      )
    });

    console.log(`Found ${testStudents.length} test students`.cyan);
    
    if (testStudents.length > 0) {
      // Display the students to be deleted
      testStudents.forEach(student => {
        console.log(`  - ${student.id}: ${student.name} (${student.section})`.grey);
      });
      
      // Delete test students
      console.log('Deleting test students...'.yellow);
      const deletedStudents = await Student.destroy({
        where: sequelize.or(
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            'LIKE',
            '%test%'
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('id')),
            'LIKE',
            '%test%'
          )
        )
      });
      
      console.log(`Deleted ${deletedStudents} test students`.green);
    }

    // Find test batches (those with 'test' in their name or id)
    console.log('Finding test batches...'.yellow);
    const testBatches = await Batch.findAll({
      where: sequelize.or(
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('name')),
          'LIKE',
          '%test%'
        ),
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('id')),
          'LIKE',
          '%test%'
        )
      )
    });

    console.log(`Found ${testBatches.length} test batches`.cyan);
    
    if (testBatches.length > 0) {
      // Display the batches to be deleted
      testBatches.forEach(batch => {
        console.log(`  - ${batch.id}: ${batch.name}`.grey);
      });
      
      // Delete test batches
      console.log('Deleting test batches...'.yellow);
      const deletedBatches = await Batch.destroy({
        where: sequelize.or(
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            'LIKE',
            '%test%'
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('id')),
            'LIKE',
            '%test%'
          )
        )
      });
      
      console.log(`Deleted ${deletedBatches} test batches`.green);
    }

    console.log('Database cleanup completed successfully'.green.bold);
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

// Run the function
cleanDatabase(); 