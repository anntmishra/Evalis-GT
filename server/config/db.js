const { Sequelize } = require('sequelize');
const colors = require('colors');

// Log environment variables for debugging
console.log('Database configuration:'.yellow);
console.log('POSTGRES_DB:'.cyan, process.env.POSTGRES_DB || 'evalis');
console.log('POSTGRES_USER:'.cyan, process.env.POSTGRES_USER || 'postgres');
console.log('POSTGRES_HOST:'.cyan, process.env.POSTGRES_HOST || 'localhost');
console.log('POSTGRES_PORT:'.cyan, process.env.POSTGRES_PORT || 5432);

// Create the database connection using environment variables
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'evalis',
  process.env.POSTGRES_USER, // No default value to force environment variable to be used
  process.env.POSTGRES_PASSWORD || '',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.POSTGRES_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    console.log('Connecting to PostgreSQL...'.yellow);
    console.log(`Attempting connection with user: ${process.env.POSTGRES_USER}`.cyan);
    await sequelize.authenticate();
    console.log(`PostgreSQL Connected: ${sequelize.options.host}:${sequelize.options.port}`.cyan.underline);
    return sequelize;
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${error.message}`.red.bold);
    console.error('Please check:');
    console.error('1. Your network connection');
    console.error('2. PostgreSQL server is running');
    console.error('3. Database credentials are correct');
    console.error('4. Database exists');
    process.exit(1);
  }
};

module.exports = { connectDB, sequelize };
