const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');

// Load from parent directory
const { connectDB, sequelize } = require(path.join(__dirname, '../server/config/db'));

dotenv.config();

const syncQuizTables = async () => {
  try {
    console.log('🔄 SYNCING QUIZ TABLES'.cyan.bold);
    console.log('='*50);
    
    await connectDB();
    console.log('✅ Connected to database'.green);
    
    // Import models to register them
    const { Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizAnswer } = require(path.join(__dirname, '../server/models'));
    
    // Sync models in order of dependencies
    console.log('\n📦 Creating Quiz table...'.yellow);
    await Quiz.sync({ force: false });
    console.log('✅ Quiz table created'.green);
    
    console.log('\n📦 Creating QuizQuestion table...'.yellow);
    await QuizQuestion.sync({ force: false });
    console.log('✅ QuizQuestion table created'.green);
    
    console.log('\n📦 Creating QuizOption table...'.yellow);
    await QuizOption.sync({ force: false });
    console.log('✅ QuizOption table created'.green);
    
    console.log('\n📦 Creating QuizAttempt table...'.yellow);
    await QuizAttempt.sync({ force: false });
    console.log('✅ QuizAttempt table created'.green);
    
    console.log('\n📦 Creating QuizAnswer table...'.yellow);
    await QuizAnswer.sync({ force: false });
    console.log('✅ QuizAnswer table created'.green);
    
    console.log('\n🎉 All quiz tables synced successfully!'.green.bold);
    console.log('The quiz system is ready to use.'.cyan);
    
  } catch (error) {
    console.error('❌ Error syncing tables:'.red, error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

syncQuizTables();
