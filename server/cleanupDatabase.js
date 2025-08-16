const { connectDB, sequelize } = require('./config/db');
const models = require('./models');
const { Admin } = models;
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function cleanupDatabase() {
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Connect to database
    await connectDB();
    
    // Check which tables exist
    console.log('\n� Checking existing tables and record counts:');
    const counts = {};
    
    try {
      counts.students = await models.Student.count();
      console.log(`Students: ${counts.students}`);
    } catch (e) { console.log('Students table: Not found or empty'); }
    
    try {
      counts.teachers = await models.Teacher.count();
      console.log(`Teachers: ${counts.teachers}`);
    } catch (e) { console.log('Teachers table: Not found or empty'); }
    
    try {
      counts.submissions = await models.Submission.count();
      console.log(`Submissions: ${counts.submissions}`);
    } catch (e) { console.log('Submissions table: Not found or empty'); }
    
    try {
      counts.assignments = await models.Assignment.count();
      console.log(`Assignments: ${counts.assignments}`);
    } catch (e) { console.log('Assignments table: Not found or empty'); }
    
    try {
      counts.admins = await models.Admin.count();
      console.log(`Admins: ${counts.admins}`);
    } catch (e) { console.log('Admins table: Not found or empty'); }
    
    // Clean up old/test data
    console.log('\n🗑️  Cleaning up data...');
    
    // Delete old submissions (keep only last 7 days to save space)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    try {
      const deletedSubmissions = await models.Submission.destroy({
        where: {
          createdAt: {
            [models.Sequelize.Op.lt]: sevenDaysAgo
          }
        }
      });
      console.log(`Deleted ${deletedSubmissions} old submissions`);
    } catch (e) { console.log('Submissions cleanup: Skipped (table issues)'); }
    
    // Delete test students (those with IDs starting with 'TEST' or similar patterns)
    try {
      const deletedTestStudents = await models.Student.destroy({
        where: {
          [models.Sequelize.Op.or]: [
            { id: { [models.Sequelize.Op.like]: 'TEST%' } },
            { id: { [models.Sequelize.Op.like]: 'test%' } },
            { name: { [models.Sequelize.Op.like]: 'Test%' } },
            { email: { [models.Sequelize.Op.like]: '%test%' } }
          ]
        }
      });
      console.log(`Deleted ${deletedTestStudents} test students`);
    } catch (e) { console.log('Test students cleanup: Skipped (table issues)'); }
    
    // Delete test teachers
    try {
      const deletedTestTeachers = await models.Teacher.destroy({
        where: {
          [models.Sequelize.Op.or]: [
            { email: { [models.Sequelize.Op.like]: '%test%' } },
            { name: { [models.Sequelize.Op.like]: 'Test%' } }
          ]
        }
      });
      console.log(`Deleted ${deletedTestTeachers} test teachers`);
    } catch (e) { console.log('Test teachers cleanup: Skipped (table issues)'); }
    
    console.log('\n✅ Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.log('Continuing with admin reset...');
  }
}

async function resetAdmin() {
  try {
    console.log('\n🔧 Resetting admin account...');
    
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    
    // Delete existing admin accounts
    await models.Admin.destroy({ where: {} });
    console.log('Deleted existing admin accounts');
    
    // Create new admin (password will be hashed automatically by the model hook)
    const admin = await models.Admin.create({
      username: 'admin',
      email: 'admin@evalis.com',
      password: defaultPassword,
      name: 'System Administrator',
      role: 'admin'
    });
    
    console.log('✅ Admin account created successfully!');
    console.log('Username: admin');
    console.log('Email: admin@evalis.com');
    console.log(`Password: ${defaultPassword}`);
    
    return admin;
  } catch (error) {
    console.error('❌ Admin reset failed:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await cleanupDatabase();
    await resetAdmin();
    
    console.log('\n🎉 All operations completed successfully!');
    console.log('\nYou can now login with:');
    console.log('Email: admin@evalis.com');
    console.log(`Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'}`);
    
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanupDatabase, resetAdmin };
