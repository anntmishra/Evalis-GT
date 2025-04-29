/**
 * Script to check and fix teacher accounts in the database
 * Run with: node server/checkTeachers.js
 */
require('dotenv').config();
const { Teacher } = require('./models');
const colors = require('colors');
const bcrypt = require('bcryptjs');

async function checkTeachers() {
  try {
    console.log('Connecting to database and fetching teachers...'.yellow);
    
    // Find all teachers
    const teachers = await Teacher.findAll();
    
    console.log(`\nFound ${teachers.length} teachers in the database:`.green);
    
    if (teachers.length === 0) {
      console.log('No teachers found in the database.'.red);
      return;
    }
    
    // Display all teachers
    for (const teacher of teachers) {
      console.log(`\n${'-'.repeat(50)}`);
      console.log(`ID:`.cyan, teacher.id);
      console.log(`Name:`.cyan, teacher.name);
      console.log(`Email:`.cyan, teacher.email);
      console.log(`Role:`.cyan, teacher.role || 'teacher');
      console.log(`Password Hash:`.cyan, teacher.password.substring(0, 20) + '...');
    }
    
    // Ask if we should reset all passwords
    console.log('\nDo you want to reset all teacher passwords to match their IDs? (y/n)'.yellow);
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('> ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        console.log('\nResetting passwords...'.yellow);
        
        for (const teacher of teachers) {
          // Create a simple password based on teacher ID
          const newPassword = teacher.id;
          console.log(`Setting password for ${teacher.id} (${teacher.email}) to: ${newPassword}`.cyan);
          
          // Hash the password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(newPassword, salt);
          
          // Update the teacher
          teacher.password = hashedPassword;
          await teacher.save();
        }
        
        console.log('\nAll teacher passwords have been reset.'.green);
        console.log('Teachers can now log in with their ID as the password.'.green);
      } else {
        console.log('\nPassword reset canceled.'.yellow);
      }
      
      readline.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:'.red, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkTeachers(); 