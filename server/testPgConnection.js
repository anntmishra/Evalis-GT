const dotenv = require('dotenv');
const colors = require('colors');
const { Sequelize } = require('sequelize');

// Load environment variables
dotenv.config();

console.log('Starting PostgreSQL connection test...'.yellow);

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'evalis',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'postgres',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: process.env.POSTGRES_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

// Test connection
sequelize.authenticate()
  .then(() => {
    console.log('================================='.green);
    console.log('CONNECTION SUCCESSFUL!'.green.bold);
    console.log(`Connected to: ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`.green);
    console.log(`Database: ${process.env.POSTGRES_DB}`.green);
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
    console.error('2. PostgreSQL server is running');
    console.error('3. Database credentials are correct');
    console.error('4. Database exists');
    process.exit(1);
  }); 