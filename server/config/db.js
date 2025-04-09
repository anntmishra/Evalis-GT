const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    
    // Updated connection options compatible with current driver
    const options = {
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 60000
    };
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`.red.bold);
    console.error('Please check:');
    console.error('1. Your network connection');
    console.error('2. MongoDB Atlas IP whitelist (add IP: 115.241.34.101)');
    console.error('3. MongoDB Atlas username and password');
    console.error('4. MongoDB Atlas connection string format');
    process.exit(1);
  }
};

module.exports = connectDB; 