const dotenv = require('dotenv');
const colors = require('colors');
const bcrypt = require('bcryptjs');
const Admin = require('./models/adminModel');
const { connectDB } = require('./config/db');

// Load env vars
dotenv.config();

// Add this for debugging
console.log('Environment Variables:'.yellow);
console.log('NODE_ENV:'.cyan, process.env.NODE_ENV);
console.log('POSTGRES_USER:'.cyan, process.env.POSTGRES_USER || 'Not set');
console.log('POSTGRES_DB:'.cyan, process.env.POSTGRES_DB || 'Not set');
console.log('POSTGRES_HOST:'.cyan, process.env.POSTGRES_HOST || 'Not set');
console.log('POSTGRES_PORT:'.cyan, process.env.POSTGRES_PORT || 'Not set');

const verifyAdmin = async () => {
  try {
    console.log('Connecting to database...'.yellow);
    await connectDB();
    console.log('Database connected'.green);

    // Find admin user
    const admin = await Admin.findOne({ where: { username: 'admin' } });
    
    if (!admin) {
      console.log('Admin user does not exist'.red);
      console.log('Run createAdmin.js to create an admin user'.yellow);
      process.exit(1);
    }
    
    console.log('Admin user found:'.green);
    console.log('Username:'.cyan, admin.username);
    console.log('Email:'.cyan, admin.email);
    
    // Test password match
    const testPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'zyExeKhXoMFtd1Gc';
    const isMatch = await admin.matchPassword(testPassword);
    
    console.log('\nPassword match test:'.cyan);
    if (isMatch) {
      console.log('Admin password is correctly configured!'.green);
      console.log('You should be able to log in with:'.green);
      console.log('Username:'.cyan, 'admin');
      console.log('Password:'.cyan, '[Use the configured admin password]');
    } else {
      console.log('Admin password needs to be updated!'.red);
      console.log('Updating admin password...'.yellow);
      
      // Update password
      admin.password = testPassword;
      await admin.save();
      
      console.log('Admin password updated'.green);
      console.log('You should now be able to log in with:'.green);
      console.log('Username:'.cyan, 'admin');
      console.log('Password:'.cyan, '[Use the configured admin password]');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:'.red, error.message);
    process.exit(1);
  }
};

verifyAdmin(); 