const { generatePasswordResetLink, createFirebaseUser } = require('./utils/firebaseUtils');
const { sendPasswordResetLink } = require('./utils/emailUtils');

async function testEmailSending() {
  console.log('🧪 Testing Email Sending Process');
  console.log('=' .repeat(50));
  
  const testEmail = 'test.email.check@example.com';
  const testPassword = 'TestPassword123!';
  
  try {
    // Step 1: Create a test Firebase user
    console.log(`📧 Step 1: Creating test Firebase user with email: ${testEmail}`);
    const createResult = await createFirebaseUser(testEmail, testPassword, {
      name: 'Test User',
      id: 'TEST001',
      role: 'student'
    });
    
    if (createResult.success) {
      console.log(`✅ Firebase user created: ${createResult.uid}`);
      
      // Step 2: Generate password reset link
      console.log(`🔗 Step 2: Generating password reset link...`);
      const resetLinkResult = await generatePasswordResetLink(testEmail);
      
      if (resetLinkResult.success) {
        console.log(`✅ Reset link generated successfully`);
        console.log(`🔗 Reset Link: ${resetLinkResult.resetLink.substring(0, 100)}...`);
        
        // Step 3: Try to send email
        console.log(`📤 Step 3: Attempting to send password reset email...`);
        try {
          await sendPasswordResetLink({
            email: testEmail,
            name: 'Test User'
          }, resetLinkResult.resetLink);
          
          console.log(`✅ Email sent successfully to ${testEmail}`);
        } catch (emailError) {
          console.error(`❌ Email sending failed:`, emailError.message);
          console.log(`📋 This is likely due to email configuration issues`);
        }
        
      } else {
        console.error(`❌ Failed to generate reset link: ${resetLinkResult.error}`);
      }
      
      // Clean up: Delete the test user
      console.log(`🧹 Cleanup: Deleting test user...`);
      const { deleteFirebaseUserByEmail } = require('./utils/firebaseUtils');
      await deleteFirebaseUserByEmail(testEmail);
      console.log(`✅ Test user deleted`);
      
    } else {
      console.error(`❌ Failed to create Firebase user: ${createResult.error}`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed:`, error);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Email test completed');
  
  // Check email configuration
  console.log('\n📋 Current Email Configuration:');
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER || 'NOT SET'}`);
  console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '[CONFIGURED]' : 'NOT SET'}`);
  console.log(`EMAIL_DRY_RUN: ${process.env.EMAIL_DRY_RUN || 'false'}`);
  console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST || 'smtp.gmail.com'}`);
  console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT || '587'}`);
  
  if (process.env.EMAIL_USER === 'your.email@gmail.com' || !process.env.EMAIL_USER) {
    console.log('\n⚠️  EMAIL CONFIGURATION NEEDED:');
    console.log('1. Set EMAIL_USER to your Gmail address');
    console.log('2. Set EMAIL_PASS to your Gmail App Password');
    console.log('3. Or set EMAIL_DRY_RUN=true for testing without emails');
  }
}

testEmailSending().then(() => {
  console.log('Exiting...');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
