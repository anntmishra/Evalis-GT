const { sequelize } = require('../config/db');

async function removeNonPrimaryQuizIndexes() {
  try {
    console.log('Removing non-primary quiz-related indexes...');
    
    // List of specific indexes that are causing conflicts
    const conflictingIndexes = [
      'quiz_questions_quiz_id',
      'quizzes_teacher_id', 
      'quizzes_subject_id',
      'quizzes_batch_id',
      'quiz_attempts_quiz_id_student_id',
      'quiz_attempts_quiz_id',
      'quiz_attempts_student_id',
      'quiz_options_question_id',
      'quiz_answers_quiz_attempt_id',
      'quiz_answers_question_id',
      'quiz_answers_selected_option_id'
    ];
    
    for (const indexName of conflictingIndexes) {
      try {
        await sequelize.query(`DROP INDEX IF EXISTS "${indexName}";`);
        console.log(`Dropped index: ${indexName}`);
      } catch (error) {
        console.log(`Could not drop index ${indexName}:`, error.message);
      }
    }
    
    // Also drop any tables that have both snake_case and PascalCase versions
    const duplicateTables = [
      'Quizzes',  // Keep the snake_case 'quizzes'
      'QuizQuestions',  // Keep the snake_case 'quiz_questions' if it exists
      'QuizSecurityLogs'  // This is extra, not in our models
    ];
    
    for (const tableName of duplicateTables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
        console.log(`Dropped duplicate table: ${tableName}`);
      } catch (error) {
        console.log(`Could not drop table ${tableName}:`, error.message);
      }
    }
    
    console.log('Successfully removed conflicting indexes and tables!');
    
  } catch (error) {
    console.error('Failed to remove indexes:', error);
    throw error;
  }
}

// Run cleanup if called directly
if (require.main === module) {
  removeNonPrimaryQuizIndexes()
    .then(() => {
      console.log('Index cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Index cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { removeNonPrimaryQuizIndexes };