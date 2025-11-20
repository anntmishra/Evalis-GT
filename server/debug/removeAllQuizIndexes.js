const { sequelize } = require('../config/db');

async function removeAllQuizIndexes() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Finding and removing ALL quiz-related indexes and constraints...');
    
    // Get all indexes that contain 'quiz' in their name
    const [indexes] = await sequelize.query(`
      SELECT indexname, schemaname
      FROM pg_indexes 
      WHERE indexname ILIKE '%quiz%'
      AND schemaname = 'public'
      ORDER BY indexname;
    `);
    
    console.log('Found quiz-related indexes:', indexes.map(i => i.indexname));
    
    // Drop all quiz-related indexes
    for (const index of indexes) {
      try {
        await sequelize.query(`DROP INDEX IF EXISTS "${index.indexname}" CASCADE;`, { transaction });
        console.log(`Dropped index: ${index.indexname}`);
      } catch (error) {
        console.log(`Could not drop index ${index.indexname}:`, error.message);
      }
    }
    
    // Get all constraints that contain 'quiz' in their name
    const [constraints] = await sequelize.query(`
      SELECT constraint_name, table_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE constraint_name ILIKE '%quiz%'
      AND constraint_schema = 'public'
      ORDER BY constraint_name;
    `);
    
    console.log('Found quiz-related constraints:', constraints);
    
    // Drop all quiz-related constraints (except primary keys)
    for (const constraint of constraints) {
      if (constraint.constraint_type !== 'PRIMARY KEY') {
        try {
          await sequelize.query(`ALTER TABLE "${constraint.table_name}" DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}" CASCADE;`, { transaction });
          console.log(`Dropped constraint: ${constraint.constraint_name} from ${constraint.table_name}`);
        } catch (error) {
          console.log(`Could not drop constraint ${constraint.constraint_name}:`, error.message);
        }
      } else {
        console.log(`Skipped primary key constraint: ${constraint.constraint_name}`);
      }
    }
    
    // Also check for any sequences
    const [sequences] = await sequelize.query(`
      SELECT sequencename, schemaname
      FROM pg_sequences 
      WHERE sequencename ILIKE '%quiz%'
      AND schemaname = 'public';
    `);
    
    console.log('Found quiz-related sequences:', sequences);
    
    // Check if there are any quiz tables other than the main ones we want
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_name ILIKE '%quiz%'
      AND table_schema = 'public'
      AND table_name NOT IN ('quizzes', 'QuizQuestions', 'QuizOptions', 'QuizAttempts', 'QuizAnswers')
      ORDER BY table_name;
    `);
    
    console.log('Found other quiz-related tables:', tables);
    
    // Drop any unexpected quiz tables
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE;`, { transaction });
        console.log(`Dropped unexpected table: ${table.table_name}`);
      } catch (error) {
        console.log(`Could not drop table ${table.table_name}:`, error.message);
      }
    }
    
    await transaction.commit();
    console.log('Successfully removed all quiz-related indexes and constraints!');
    
  } catch (error) {
    await transaction.rollback();
    console.error('Failed to remove quiz indexes:', error);
    throw error;
  }
}

// Run cleanup if called directly
if (require.main === module) {
  removeAllQuizIndexes()
    .then(() => {
      console.log('Quiz index cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Quiz index cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { removeAllQuizIndexes };