const dotenv = require('dotenv');
const colors = require('colors');
const { connectDB, sequelize } = require('../server/config/db');

dotenv.config();

const dropQuizTables = async () => {
  try {
    console.log('🗑️  DROPPING ALL QUIZ TABLES'.red.bold);
    console.log('='*50);
    
    await connectDB();
    console.log('✅ Connected to database'.green);
    
    // Drop tables in reverse order of dependencies
    const tables = [
      'QuizAnswers',
      'QuizAttempts', 
      'QuizOptions',
      'QuizQuestions',
      'Quizzes'
    ];
    
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`✅ Dropped table: ${table}`.green);
      } catch (error) {
        console.log(`⚠️  Table ${table} doesn't exist or error: ${error.message}`.yellow);
      }
    }
    
    console.log('\n🎉 All quiz tables dropped successfully!'.green.bold);
    console.log('You can now rebuild the quiz system from scratch.'.cyan);
    
  } catch (error) {
    console.error('❌ Error dropping tables:'.red, error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

dropQuizTables();
