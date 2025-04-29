/**
 * Script to create a test teacher account
 * Run with: node server/createTestTeacher.js
 */
require('dotenv').config();
const axios = require('axios');
const colors = require('colors');

const API_URL = 'http://localhost:3000/api/teachers/create-test-account';

// Use the specific email from the error message
const SPECIFIC_EMAIL = 'e23cseu0324@bennett.edu.im';

async function createTestTeacher() {
  console.log('Creating test teacher account...'.yellow);
  
  try {
    // Add the specific email to the request
    const response = await axios.post(API_URL, { email: SPECIFIC_EMAIL });
    
    if (response.status === 200 || response.status === 201) {
      console.log('\n=== TEST TEACHER ACCOUNT ==='.green.bold);
      console.log('ID:'.cyan, response.data.id);
      console.log('Name:'.cyan, response.data.name);
      console.log('Email:'.cyan, response.data.email);
      console.log('Password:'.cyan, response.data.password);
      console.log('========================='.green.bold);
      console.log('\nUse these credentials to log in as a teacher.'.green);
    } else {
      console.error('Unexpected response:'.red, response.status);
    }
  } catch (error) {
    console.error('Error creating test account:'.red);
    if (error.response) {
      console.error('Status:'.red, error.response.status);
      console.error('Data:'.red, error.response.data);
    } else {
      console.error(error.message.red);
    }
    console.log('\nMake sure the server is running first!'.yellow);
  }
}

createTestTeacher(); 