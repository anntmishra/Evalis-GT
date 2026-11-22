const dotenv = require('dotenv');
const colors = require('colors');
const { connectDB, sequelize } = require('./config/db');

// Load environment variables
dotenv.config();

const setupFreshDatabase = async () => {
  try {
    console.log('🚀 Setting up fresh database...'.cyan.bold);
    console.log('Connecting to database...'.yellow);
    await connectDB();
    
    console.log('Creating database tables...'.yellow);
    
    // Import all models to ensure they are registered
    const models = require('./models');
    
    // Create PostgreSQL schemas required by Evalis architecture
    const schemas = ['users', 'academics', 'subjects', 'examinations', 'grading', 'results', 'notifications', 'administration'];
    for (const schema of schemas) {
      await sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    }
    console.log('✅ Required PostgreSQL schemas ensured.'.green);

    // Force sync to recreate all tables
    await sequelize.sync({ force: true });
    console.log('✅ All database tables created successfully!'.green.bold);
    
    // Create default admin
    console.log('👤 Creating default admin user...'.yellow);
    const Admin = require('./models/adminModel');
    const bcrypt = require('bcryptjs');
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', salt);
    
    await Admin.create({
      username: 'admin',
      password: hashedPassword,
      name: 'System Administrator',
      email: 'admin@evalis.com'
    });
    console.log('✅ Default admin created successfully!'.green);
    console.log('📋 Admin credentials:'.cyan);
    console.log(`   Username: admin`.cyan);
    console.log(`   Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'}`.cyan);
    
    console.log('\n🎉 Database setup completed successfully!'.green.bold);
    console.log('Your Evalis system is ready to use.'.green);
    
    // Close connection
    await sequelize.close();
    console.log('Connection closed.'.yellow);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:'.red.bold);
    console.error(`${error.message}`.red);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the setup
setupFreshDatabase();
