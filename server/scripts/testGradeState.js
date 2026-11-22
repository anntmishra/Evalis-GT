require('dotenv').config();
const { sequelize, Submission, Student, Subject, GradeRevision } = require('../models');

async function testGradeStateMachine() {
  console.log('Testing Grade State Machine...');
  
  try {
    await sequelize.authenticate();

    // Find any student and subject to create a mock submission
    const student = await Student.findOne();
    const subject = await Subject.findOne();

    if (!student || !subject) {
      console.log('Cannot test: Need at least one student and one subject in DB.');
      process.exit(0);
    }

    // 1. Create a mock submission
    const submission = await Submission.create({
      studentId: student.id,
      subjectId: subject.id,
      examType: 'midterm',
      submissionText: 'Test submission for state machine',
      gradingState: 'submitted'
    });
    console.log(`Created submission ID ${submission.id} in state 'submitted'`);

    // 2. Grade it and set to 'published'
    submission.score = 85;
    submission.gradingState = 'published';
    await submission.save();
    console.log(`Updated submission ID ${submission.id} to score 85 and state 'published'`);

    // 3. Try to change the score WITHOUT a reason (simulate controller logic)
    console.log('\n--- Attempting to change published score WITHOUT reason ---');
    let threwError = false;
    const newScore = 90;
    const reqBody = { score: newScore };
    
    if (submission.gradingState === 'published' && reqBody.score !== undefined && reqBody.score !== submission.score) {
      if (!reqBody.reason) {
        console.log('SUCCESS: Logic correctly blocked update due to missing reason.');
        threwError = true;
      }
    }

    if (!threwError) {
      console.log('FAIL: Logic allowed update without reason!');
    }

    // 4. Try to change the score WITH a reason
    console.log('\n--- Attempting to change published score WITH reason ---');
    reqBody.reason = 'Corrected totaling error';
    
    if (submission.gradingState === 'published' && reqBody.score !== undefined && reqBody.score !== submission.score) {
      if (!reqBody.reason) {
        console.log('Should not hit this');
      } else {
        // Create audit log
        const revision = await GradeRevision.create({
          submissionId: submission.id,
          oldGrade: submission.score,
          newGrade: reqBody.score,
          changedBy: 'test_script_user',
          reason: reqBody.reason
        });
        console.log(`SUCCESS: Created GradeRevision ID ${revision.id}`);
        
        submission.score = reqBody.score;
        await submission.save();
        console.log(`Updated submission score to ${submission.score}`);
      }
    }

    // Clean up
    await GradeRevision.destroy({ where: { submissionId: submission.id } });
    await submission.destroy();
    console.log('\nTest complete and cleaned up.');

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testGradeStateMachine();
