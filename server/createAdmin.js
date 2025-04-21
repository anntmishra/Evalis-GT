const dotenv = require('dotenv');
const colors = require('colors');
const { Admin, sequelize } = require('./models');
const { connectDB } = require('./config/db');

// Load env vars
dotenv.config();

const createAdmin = async () => {
  try {
    console.log('Connecting to database...'.yellow);
    await connectDB();
    console.log('Database connected'.green);

    // Create admin user
    const adminExists = await Admin.findOne({ where: { username: 'admin' } });
    
    if (adminExists) {
      console.log('Admin user already exists'.yellow);
      process.exit(0);
    }
    
    const admin = await Admin.create({
      username: 'admin',
      name: 'Administrator',
      email: 'admin@example.com',
      password: 'admin123', // This will be hashed by the model hooks
      role: 'admin'
    });
    
    console.log('Admin user created:'.green);
    console.log('Username:'.cyan, admin.username);
    console.log('Password:'.cyan, 'admin123');
    
    console.log('\nPlease use these credentials to log in.'.green);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:'.red, error.message);
    process.exit(1);
  }
};

createAdmin(); 