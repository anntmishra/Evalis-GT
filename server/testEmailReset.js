const { generatePasswordResetLink } = require('./utils/firebaseUtils');
const { sendPasswordResetLink } = require('./utils/emailUtils');

async function testEmailReset() {
  console.log('🧪 Testing Email Reset Functionality');
  console.log('=' .repeat(50));
  
  const testEmail = 'anantmishra249@gmail.com'; // Use a real email you can check
  
  try {
    console.log(`📧 Step 1: Creating test user for email: ${testEmail}`);
    
    // First create a test user
    const { createFirebaseUser } = require('./utils/firebaseUtils');
    const createResult = await createFirebaseUser(testEmail, 'tempPassword123', {
      name: 'Test User',
      id: 'TEST001',
      role: 'student'
    });
    
    if (createResult.success) {
      console.log(`✅ Test user created successfully with UID: ${createResult.uid}`);
      
      console.log(`\n🔗 Step 2: Generating password reset link...`);
      
      // Generate reset link
      const resetResult = await generatePasswordResetLink(testEmail);
      
      if (resetResult.success) {
        console.log(`✅ Reset link generated successfully`);
        console.log(`🔗 Reset Link: ${resetResult.resetLink}`);
        
        console.log(`\n📨 Step 3: Sending email with reset link...`);
        
        // Send email with the reset link
        await sendPasswordResetLink({
          email: testEmail,
          name: 'Test User'
        }, resetResult.resetLink);
        
        console.log(`✅ Email sent successfully!`);
        console.log(`📬 Check your email at: ${testEmail}`);
        
      } else {
        console.log(`❌ Failed to generate reset link: ${resetResult.error}`);
      }
      
    } else {
      console.log(`❌ Failed to create test user: ${createResult.error}`);
    }
    
  } catch (error) {
    console.error(`❌ Error during test:`, error);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Test completed');
  console.log('💡 If you received an email, the system is working!');
  console.log('💡 If not, check your EMAIL_USER and EMAIL_PASS in .env file');
}

// Run the test
testEmailReset().then(() => {
  console.log('Exiting...');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
