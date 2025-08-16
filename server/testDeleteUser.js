const { deleteFirebaseUserByEmail, getFirebaseUserByEmail } = require('./utils/firebaseUtils');

async function testDeleteSpecificUser() {
  const testEmail = 'anantmishra249@gmail.com';
  
  console.log('🧪 Testing Firebase User Deletion');
  console.log('=' .repeat(50));
  
  try {
    // First, check if the user exists
    console.log(`🔍 Step 1: Checking if user exists with email: ${testEmail}`);
    const userRecord = await getFirebaseUserByEmail(testEmail);
    
    if (userRecord) {
      console.log(`✅ User found:`);
      console.log(`   - UID: ${userRecord.uid}`);
      console.log(`   - Email: ${userRecord.email}`);
      console.log(`   - Display Name: ${userRecord.displayName || 'Not set'}`);
      console.log(`   - Created: ${userRecord.metadata.creationTime}`);
      console.log(`   - Last Sign In: ${userRecord.metadata.lastSignInTime || 'Never'}`);
      
      // Now delete the user
      console.log(`\n🗑️  Step 2: Deleting user from Firebase Authentication...`);
      const deleteResult = await deleteFirebaseUserByEmail(testEmail);
      
      console.log(`\n📋 Deletion Result:`);
      console.log(`   - Success: ${deleteResult.success}`);
      console.log(`   - Message: ${deleteResult.message}`);
      if (deleteResult.details) {
        console.log(`   - Details: ${deleteResult.details}`);
      }
      if (deleteResult.deletedUid) {
        console.log(`   - Deleted UID: ${deleteResult.deletedUid}`);
      }
      if (deleteResult.error) {
        console.log(`   - Error: ${deleteResult.error}`);
      }
      
      // Verify deletion
      console.log(`\n🔍 Step 3: Verifying deletion...`);
      const verifyUser = await getFirebaseUserByEmail(testEmail);
      
      if (!verifyUser) {
        console.log(`✅ SUCCESS: User ${testEmail} has been completely removed from Firebase Authentication`);
        console.log(`🔒 This user can no longer log in to the dashboard`);
      } else {
        console.log(`❌ FAILED: User ${testEmail} still exists in Firebase Authentication`);
      }
      
    } else {
      console.log(`ℹ️  User with email ${testEmail} not found in Firebase Authentication`);
      console.log(`   This means they were either already deleted or never created`);
    }
    
  } catch (error) {
    console.error(`❌ Error during test:`, error);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Test completed');
}

// Run the test
testDeleteSpecificUser().then(() => {
  console.log('Exiting...');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
