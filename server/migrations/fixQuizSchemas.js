const { sequelize } = require('../config/db');

async function migrateQuizSchemas() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting quiz schema migration...');
    
    // Drop existing foreign key constraints that might have wrong types
    const queries = [
      // Drop existing foreign key constraints if they exist
      'ALTER TABLE IF EXISTS "QuizAnswers" DROP CONSTRAINT IF EXISTS "QuizAnswers_quizAttemptId_fkey"',
      'ALTER TABLE IF EXISTS "QuizAnswers" DROP CONSTRAINT IF EXISTS "QuizAnswers_questionId_fkey"', 
      'ALTER TABLE IF EXISTS "QuizAnswers" DROP CONSTRAINT IF EXISTS "QuizAnswers_selectedOptionId_fkey"',
      
      'ALTER TABLE IF EXISTS "QuizAttempts" DROP CONSTRAINT IF EXISTS "QuizAttempts_quizId_fkey"',
      'ALTER TABLE IF EXISTS "QuizAttempts" DROP CONSTRAINT IF EXISTS "QuizAttempts_studentId_fkey"',
      
      'ALTER TABLE IF EXISTS "QuizOptions" DROP CONSTRAINT IF EXISTS "QuizOptions_questionId_fkey"',
      
      'ALTER TABLE IF EXISTS "QuizQuestions" DROP CONSTRAINT IF EXISTS "QuizQuestions_quizId_fkey"',
      
      'ALTER TABLE IF EXISTS "Quizzes" DROP CONSTRAINT IF EXISTS "Quizzes_teacherId_fkey"',
      'ALTER TABLE IF EXISTS "Quizzes" DROP CONSTRAINT IF EXISTS "Quizzes_subjectId_fkey"',
      'ALTER TABLE IF EXISTS "Quizzes" DROP CONSTRAINT IF EXISTS "Quizzes_batchId_fkey"',
      
      // Also handle snake_case constraint names that might exist
      'ALTER TABLE IF EXISTS "quizzes" DROP CONSTRAINT IF EXISTS "quizzes_teacher_id_fkey"',
      'ALTER TABLE IF EXISTS "quizzes" DROP CONSTRAINT IF EXISTS "quizzes_subject_id_fkey"',
      'ALTER TABLE IF EXISTS "quizzes" DROP CONSTRAINT IF EXISTS "quizzes_batch_id_fkey"',
      
      'ALTER TABLE IF EXISTS "quiz_questions" DROP CONSTRAINT IF EXISTS "quiz_questions_quiz_id_fkey"',
      'ALTER TABLE IF EXISTS "quiz_options" DROP CONSTRAINT IF EXISTS "quiz_options_question_id_fkey"',
      'ALTER TABLE IF EXISTS "quiz_attempts" DROP CONSTRAINT IF EXISTS "quiz_attempts_quiz_id_fkey"',
      'ALTER TABLE IF EXISTS "quiz_attempts" DROP CONSTRAINT IF EXISTS "quiz_attempts_student_id_fkey"',
      'ALTER TABLE IF EXISTS "quiz_answers" DROP CONSTRAINT IF EXISTS "quiz_answers_quiz_attempt_id_fkey"',
      'ALTER TABLE IF EXISTS "quiz_answers" DROP CONSTRAINT IF EXISTS "quiz_answers_question_id_fkey"',
      'ALTER TABLE IF EXISTS "quiz_answers" DROP CONSTRAINT IF EXISTS "quiz_answers_selected_option_id_fkey"'
    ];
    
    // Execute constraint removal queries
    for (const query of queries) {
      try {
        await sequelize.query(query, { transaction });
        console.log(`Executed: ${query}`);
      } catch (error) {
        console.log(`Skipped (constraint might not exist): ${query}`);
      }
    }
    
    // Now let the models recreate the tables with correct schema
    console.log('Syncing models with alter: true to fix data types...');
    await sequelize.sync({ alter: true, transaction });
    
    await transaction.commit();
    console.log('Quiz schema migration completed successfully!');
    
  } catch (error) {
    await transaction.rollback();
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateQuizSchemas()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateQuizSchemas };