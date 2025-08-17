const { deleteFirebaseUserByEmail, getFirebaseUserByEmail, admin } = require('./utils/firebaseUtils');

/**
 * Test Firebase user deletion functionality
 */
async function testFirebaseDeletion() {
  console.log('🧪 Testing Firebase deletion functionality...');
  
  try {
    // List current users in Firebase
    console.log('\n📋 Current Firebase Authentication users:');
    const listUsersResult = await admin.auth().listUsers(10);
    
    if (listUsersResult.users.length === 0) {
      console.log('   No users found in Firebase Authentication');
    } else {
      listUsersResult.users.forEach((user, index) => {
        console.log(`   ${index + 1}. Email: ${user.email || 'No email'}, UID: ${user.uid}`);
      });
    }
    
    // Test email for deletion (you can change this)
    const testEmail = 'test.firebase.teacher@example.com';
    
    console.log(`\n🔍 Testing deletion for email: ${testEmail}`);
    
    // Check if user exists first
    const userExists = await getFirebaseUserByEmail(testEmail);
    
    if (userExists) {
      console.log(`✓ User found: ${userExists.email} (UID: ${userExists.uid})`);
      
      // Delete the user
      console.log(`\n🗑️  Attempting to delete user...`);
      const deleteResult = await deleteFirebaseUserByEmail(testEmail);
      
      console.log(`\n📊 Deletion result:`, deleteResult);
      
      // Verify deletion
      console.log(`\n🔍 Verifying deletion...`);
      const userAfterDeletion = await getFirebaseUserByEmail(testEmail);
      
      if (userAfterDeletion) {
        console.log(`❌ FAILED: User still exists after deletion attempt`);
      } else {
        console.log(`✅ SUCCESS: User successfully removed from Firebase Authentication`);
      }
      
    } else {
      console.log(`ℹ️  User with email ${testEmail} not found in Firebase Authentication`);
    }
    
    // List users again to see the difference
    console.log('\n📋 Firebase Authentication users after deletion test:');
    const listUsersAfter = await admin.auth().listUsers(10);
    
    if (listUsersAfter.users.length === 0) {
      console.log('   No users found in Firebase Authentication');
    } else {
      listUsersAfter.users.forEach((user, index) => {
        console.log(`   ${index + 1}. Email: ${user.email || 'No email'}, UID: ${user.uid}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during Firebase deletion test:', error);
  }
}

// Run the test
testFirebaseDeletion();
