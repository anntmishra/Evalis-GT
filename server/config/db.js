const { Sequelize } = require('sequelize');
const colors = require('colors');

 // NeonDB connection string
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_OmpMql4AR0cs@ep-super-smoke-a1vkw609-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

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
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    console.log('Connecting to NeonDB PostgreSQL...'.yellow);
    await sequelize.authenticate();
    console.log(`NeonDB PostgreSQL Connected`.cyan.underline);
    return sequelize;
  } catch (error) {
    console.error(`Error connecting to NeonDB PostgreSQL: ${error.message}`.red.bold);
    console.error('Please check:');
    console.error('1. Your network connection');
    console.error('2. NeonDB connection string is correct');
    console.error('3. Database exists and is accessible');
    process.exit(1);
  }
};

module.exports = { connectDB, sequelize };
