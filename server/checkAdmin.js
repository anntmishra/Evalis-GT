const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const { Admin } = require('./models');

dotenv.config();

const checkAdmin = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    
    console.log('Checking admin users...');
    const admins = await Admin.findAll();
    
    console.log(`Found ${admins.length} admin(s):`);
    admins.forEach(admin => {
      console.log(`- ID: ${admin.id}`);
      console.log(`- Username: ${admin.username}`);
      console.log(`- Email: ${admin.email}`);
      console.log(`- Name: ${admin.name}`);
      console.log(`- Password Hash: ${admin.password.substring(0, 20)}...`);
      console.log('---');
    });
    
    // Test password for admin user
    const adminUser = await Admin.findOne({ where: { username: 'admin' } });
    if (adminUser) {
      const testPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'zyExeKhXoMFtd1Gc';
      console.log('Testing configured admin password...');
      const isMatch = await adminUser.matchPassword(testPassword);
      console.log(`Password test result: ${isMatch}`);
    } else {
      console.log('No admin user found with username "admin"');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAdmin();
