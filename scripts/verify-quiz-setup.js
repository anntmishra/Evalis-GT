#!/usr/bin/env node
/**
 * Quiz System Verification Script
 * Checks if quiz tables exist and shows sample data
 */

const models = require('../server/models');
const { connectDB } = require('../server/config/db');

async function verifyQuizSetup() {
  console.log('🔍 Verifying Quiz System Setup...\n');

  try {
    await connectDB();

    // Check Quiz table
    const quizCount = await models.Quiz.count();
    console.log(`✅ Quiz table exists: ${quizCount} quizzes found`);

    // Check QuizQuestion table
    const questionCount = await models.QuizQuestion.count();
    console.log(`✅ QuizQuestion table exists: ${questionCount} questions found`);

    // Check QuizOption table
    const optionCount = await models.QuizOption.count();
    console.log(`✅ QuizOption table exists: ${optionCount} options found`);

    // Check QuizAttempt table
    const attemptCount = await models.QuizAttempt.count();
    console.log(`✅ QuizAttempt table exists: ${attemptCount} attempts found`);

    // Check QuizAnswer table
    const answerCount = await models.QuizAnswer.count();
    console.log(`✅ QuizAnswer table exists: ${answerCount} answers found\n`);

    // Show sample published quiz if exists
    const publishedQuiz = await models.Quiz.findOne({
      where: { isPublished: true },
      include: [
        { model: models.Teacher, attributes: ['name'] },
        { model: models.Subject, attributes: ['name'] },
        { model: models.Batch, attributes: ['name'] }
      ]
    });

    if (publishedQuiz) {
      console.log('📋 Sample Published Quiz:');
      console.log(`   Title: ${publishedQuiz.title}`);
      console.log(`   Teacher: ${publishedQuiz.Teacher?.name || 'N/A'}`);
      console.log(`   Subject: ${publishedQuiz.Subject?.name || 'N/A'}`);
      console.log(`   Batch: ${publishedQuiz.Batch?.name || 'N/A'}`);
      console.log(`   Status: ${publishedQuiz.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Published: ${publishedQuiz.isPublished ? 'Yes' : 'No'}`);
      console.log(`   Dates: ${publishedQuiz.startDate.toLocaleDateString()} - ${publishedQuiz.endDate.toLocaleDateString()}\n`);
    } else {
      console.log('ℹ️  No published quizzes found. Create one from Teacher Portal.\n');
    }

    // Check if any students exist
    const studentCount = await models.Student.count();
    console.log(`👥 Students in database: ${studentCount}`);

    if (studentCount > 0) {
      const sampleStudent = await models.Student.findOne();
      console.log(`   Sample student batch: ${sampleStudent.batch}\n`);

      // Check if there are quizzes for this batch
      const batchQuizzes = await models.Quiz.count({
        where: {
          batchId: sampleStudent.batch,
          isPublished: true,
          isActive: true
        }
      });
      console.log(`   Quizzes available for batch ${sampleStudent.batch}: ${batchQuizzes}`);
    }

    console.log('\n✅ Quiz system is properly set up!');
    console.log('\n📝 Next steps:');
    console.log('   1. Login as teacher at /teacher');
    console.log('   2. Navigate to Quizzes tab');
    console.log('   3. Create a new quiz and click "Publish Quiz"');
    console.log('   4. Login as student in the same batch');
    console.log('   5. Check Quizzes tab to see the published quiz\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nPlease ensure:');
    console.error('   1. Database is running');
    console.error('   2. Database migrations are complete');
    console.error('   3. Quiz models are properly synced\n');
    process.exit(1);
  }
}

verifyQuizSetup();
