const { Sequelize } = require('sequelize');
const colors = require('colors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

 // NeonDB connection string
const DATABASE_URL = process.env.DATABASE_URL;

// Log database connection info
console.log('Database configuration:'.yellow);
console.log('Using NeonDB serverless PostgreSQL'.cyan);

// Create Sequelize instance using the connection string
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000,
    evict: 1000
  }
});

const connectDB = async () => {
  try {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    console.log('Connecting to NeonDB PostgreSQL...'.yellow);
    await sequelize.authenticate();
    console.log(`NeonDB PostgreSQL Connected`.cyan.underline);
    return sequelize;
  } catch (error) {
    console.error(`Error connecting to NeonDB PostgreSQL: ${error.message}`.red.bold);
    console.error('Please check:');
    console.error('1. Your network connection');
    console.error('2. DATABASE_URL environment variable is set');
    console.error('3. Database exists and is accessible');
    process.exit(1);
  }
};

module.exports = { connectDB, sequelize };
