
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const colors = require('colors');

// Load environment variables
dotenv.config();

console.log('Starting NeonDB connection test (MongoDB replacement)...'.yellow);

//neondb connection string
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_OmpMql4AR0cs@ep-super-smoke-a1vkw609-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Connect to NeonDB
sequelize.authenticate()
  .then(() => {
    console.log('================================='.green);
    console.log('CONNECTION SUCCESSFUL!'.green.bold);
    console.log('Connected to NeonDB PostgreSQL (MongoDB replacement)'.green);
    console.log('================================='.green);
    
    // Close connection
    sequelize.close().then(() => {
      console.log('Connection closed.'.yellow);
      process.exit(0);
    });
  })
  .catch(err => {
    console.error('================================='.red);
    console.error('CONNECTION FAILED!'.red.bold);
    console.error(`Error: ${err.message}`.red);
    console.error('================================='.red);
    console.error('Please check:');
    console.error('1. Your network connection');
    console.error('2. NeonDB connection string is correct');
    console.error('3. NeonDB service is available');
    process.exit(1);
  });