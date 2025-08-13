const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const colors = require('colors');
const { connectDB, sequelize } = require('./config/db');
const { Admin } = require('./models');

// Load environment variables
dotenv.config();

const createAdminUser = async () => {
  try {
    console.log('Connecting to NeonDB...'.yellow);
    await connectDB();
    
    // Default admin credentials
    const adminData = {
      username: 'admin',
      name: 'Administrator',
      email: 'admin@evalis.edu',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'zyExeKhXoMFtd1Gc', // this will be hashed by the model hook
      role: 'admin'
    };
    
    console.log('Creating admin user...'.cyan);
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ where: { username: adminData.username } });
    
    if (existingAdmin) {
      console.log('Admin user already exists'.yellow);
      console.log(`Username: ${existingAdmin.username}`.green);
      console.log(`Email: ${existingAdmin.email}`.green);
      console.log('To login, use this username and the password you set previously'.cyan);
      console.log('If you forgot the password, you can update it with:'.cyan);
      
      // Update password if needed
      if (process.argv.includes('--reset')) {
        existingAdmin.password = adminData.password;
        await existingAdmin.save();
        console.log('Admin password reset to: admin123'.green);
      }
    } else {
      // Create new admin
      const newAdmin = await Admin.create(adminData);
      console.log('✅ Admin user created successfully!'.green.bold);
      console.log(`Username: ${newAdmin.username}`.green);
      console.log(`Password: admin123`.green);
      console.log(`Email: ${newAdmin.email}`.green);
      console.log('Please change the default password after first login'.yellow);
    }
    
    // Close connection
    await sequelize.close();
    console.log('Database connection closed.'.yellow);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:'.red.bold);
    console.error(`${error.message}`.red);
    if (sequelize) await sequelize.close();
    process.exit(1);
  }
};

// Run the script
createAdminUser();