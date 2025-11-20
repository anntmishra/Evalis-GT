const { sequelize } = require('../config/db');

async function dropSpecificIndexes() {
  try {
    console.log('Dropping specific problematic indexes...');
    
    // List of specific indexes causing conflicts
    const problematicIndexes = [
      'quiz_questions_quiz_id',
      'quiz_attempts_status', 
      'quiz_attempts_flagged_for_review',
      'quiz_attempts_quiz_id_student_id',
      'quiz_attempts_result',
      'quiz_attempts_start_time',
      'quiz_questions_order_index',
      'quiz_questions_question_type',
      'quiz_security_logs_attempt_id',
      'quiz_security_logs_event_type',
      'quiz_security_logs_severity',
      'quiz_security_logs_student_id',
      'quiz_security_logs_timestamp',
      'quizzes_batch_id',
      'quizzes_is_active_is_published',
      'quizzes_start_date_end_date',
      'quizzes_start_time_end_time',
      'quizzes_status',
      'quizzes_subject_id',
      'quizzes_teacher_id'
    ];
    
    // Drop each index individually
    for (const indexName of problematicIndexes) {
      try {
        await sequelize.query(`DROP INDEX IF EXISTS "${indexName}";`);
        console.log(`✓ Dropped index: ${indexName}`);
      } catch (error) {
        console.log(`⚠ Could not drop index ${indexName}: ${error.message}`);
      }
    }
    
    // Also drop foreign key constraints that might conflict
    const problematicConstraints = [
      { table: 'quiz_questions', constraint: 'quiz_questions_quizId_fkey' },
      { table: 'quizzes', constraint: 'quizzes_batchId_fkey' },
      { table: 'quizzes', constraint: 'quizzes_subjectId_fkey' },
      { table: 'quizzes', constraint: 'quizzes_teacherId_fkey' }
    ];
    
    for (const { table, constraint } of problematicConstraints) {
      try {
        await sequelize.query(`ALTER TABLE IF EXISTS "${table}" DROP CONSTRAINT IF EXISTS "${constraint}";`);
        console.log(`✓ Dropped constraint: ${constraint} from ${table}`);
      } catch (error) {
        console.log(`⚠ Could not drop constraint ${constraint}: ${error.message}`);
      }
    }
    
    // Drop duplicate tables that might be causing conflicts
    const duplicateTables = ['Quizzes', 'QuizQuestions', 'QuizAttempts', 'QuizSecurityLogs'];
    
    for (const tableName of duplicateTables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
        console.log(`✓ Dropped duplicate table: ${tableName}`);
      } catch (error) {
        console.log(`⚠ Could not drop table ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run cleanup if called directly
if (require.main === module) {
  dropSpecificIndexes()
    .then(() => {
      console.log('Index cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Index cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { dropSpecificIndexes };