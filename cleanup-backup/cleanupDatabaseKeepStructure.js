require('dotenv').config();
const { connectDB } = require('./config/db');

const cleanupDatabase = async () => {
  try {
    console.log('🧹 Starting database cleanup...');
    console.log('📋 This will remove all data but keep table structures');
    
    await connectDB();
    console.log('✅ Database connected');

    // Import models
    const { 
      Admin, 
      Student, 
      Teacher, 
      Batch, 
      Subject, 
      TeacherSubject, 
      Semester,
      Assignment,
      Submission
    } = require('./models');

    // Clear all data but keep tables
    console.log('\n🗑️  Clearing data from tables...');
    
    // Clear submissions first (has foreign keys)
    const submissionCount = await Submission.count();
    if (submissionCount > 0) {
      await Submission.destroy({ where: {}, force: true });
      console.log(`   ✅ Cleared ${submissionCount} submissions`);
    } else {
      console.log('   ℹ️  No submissions to clear');
    }

    // Clear assignments
    const assignmentCount = await Assignment.count();
    if (assignmentCount > 0) {
      await Assignment.destroy({ where: {}, force: true });
      console.log(`   ✅ Cleared ${assignmentCount} assignments`);
    } else {
      console.log('   ℹ️  No assignments to clear');
    }

    // Clear teacher-subject relationships
    const teacherSubjectCount = await TeacherSubject.count();
    if (teacherSubjectCount > 0) {
      await TeacherSubject.destroy({ where: {}, force: true });
      console.log(`   ✅ Cleared ${teacherSubjectCount} teacher-subject assignments`);
    } else {
      console.log('   ℹ️  No teacher-subject assignments to clear');
    }

    // Clear students
    const studentCount = await Student.count();
    if (studentCount > 0) {
      await Student.destroy({ where: {}, force: true });
      console.log(`   ✅ Cleared ${studentCount} students`);
    } else {
      console.log('   ℹ️  No students to clear');
    }

    // Clear teachers
    const teacherCount = await Teacher.count();
    if (teacherCount > 0) {
      await Teacher.destroy({ where: {}, force: true });
      console.log(`   ✅ Cleared ${teacherCount} teachers`);
    } else {
      console.log('   ℹ️  No teachers to clear');
    }

    // Clear subjects
    const subjectCount = await Subject.count();
    if (subjectCount > 0) {
      await Subject.destroy({ where: {}, force: true });
      console.log(`   ✅ Cleared ${subjectCount} subjects`);
    } else {
      console.log('   ℹ️  No subjects to clear');
    }

    // Clear semesters
    const semesterCount = await Semester.count();
    if (semesterCount > 0) {
      await Semester.destroy({ where: {}, force: true });
      console.log(`   ✅ Cleared ${semesterCount} semesters`);
    } else {
      console.log('   ℹ️  No semesters to clear');
    }

    // Clear batches
    const batchCount = await Batch.count();
    if (batchCount > 0) {
      await Batch.destroy({ where: {}, force: true });
      console.log(`   ✅ Cleared ${batchCount} batches`);
    } else {
      console.log('   ℹ️  No batches to clear');
    }

    // Keep admin user but show info
    const adminCount = await Admin.count();
    console.log(`   ℹ️  Keeping ${adminCount} admin user(s)`);

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ All student data removed');
    console.log('   ✅ All teacher data removed');
    console.log('   ✅ All batch data removed');
    console.log('   ✅ All subject data removed');
    console.log('   ✅ All semester data removed');
    console.log('   ✅ All assignment data removed');
    console.log('   ✅ All submission data removed');
    console.log('   ✅ All teacher-subject assignments removed');
    console.log('   ✅ Admin user(s) preserved');
    console.log('   ✅ All table structures intact');
    
    console.log('\n🚀 Ready for fresh start with clean database!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
};

// Run cleanup if called directly
if (require.main === module) {
  cleanupDatabase();
}

module.exports = { cleanupDatabase };