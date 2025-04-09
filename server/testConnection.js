const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');

// Load environment variables
dotenv.config();

console.log('Starting MongoDB Atlas connection test...'.yellow);
console.log(`Connection string: ${process.env.MONGODB_URI.substring(0, 50)}...`.cyan);

// Updated options for connection (compatible with current driver)
const options = {
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 60000
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, options)
  .then(conn => {
    console.log('================================='.green);
    console.log('CONNECTION SUCCESSFUL!'.green.bold);
    console.log(`Connected to: ${conn.connection.host}`.green);
    console.log(`Database: ${conn.connection.name}`.green);
    console.log('================================='.green);
    
    // Close connection
    mongoose.disconnect().then(() => {
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
    console.error('2. MongoDB Atlas IP whitelist (current IP should be added)');
    console.error('3. MongoDB Atlas username and password');
    console.error('4. MongoDB Atlas connection string format');
    process.exit(1);
  }); 