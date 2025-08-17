const { sendPasswordResetEmail } = require('./utils/emailUtils');
const { createFirebaseUser, generatePasswordResetLink, deleteFirebaseUserByEmail } = require('./utils/firebaseUtils');

async function testEmailWithRealCredentials() {
    console.log('🧪 Testing Email Sending with Real Credentials');
    console.log('==================================================');
    
    const testEmail = 'test.email.real@example.com';
    const testPassword = 'tempPassword123';
    
    try {
        // Step 1: Create Firebase user
        console.log(`📧 Creating Firebase user: ${testEmail}`);
        const { uid } = await createFirebaseUser(testEmail, testPassword);
        console.log(`✅ Firebase user created: ${uid}`);
        
        // Step 2: Generate password reset link
        console.log('🔗 Generating password reset link...');
        const resetLink = await generatePasswordResetLink(testEmail);
        console.log(`✅ Reset link generated: ${resetLink.substring(0, 50)}...`);
        
        // Step 3: Send email
        console.log('📤 Sending password reset email...');
        await sendPasswordResetEmail(
            testEmail,
            resetLink,
            {
                username: 'Test User',
                role: 'teacher'
            }
        );
        console.log('✅ Email sent successfully!');
        
        // Step 4: Cleanup
        console.log('🧹 Cleaning up test user...');
        await deleteFirebaseUserByEmail(testEmail);
        console.log('✅ Test user deleted');
        
        console.log('\n🎉 EMAIL CONFIGURATION IS WORKING!');
        console.log('✅ Password reset emails will now be sent when users are created');
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        
        // Cleanup on error
        try {
            await deleteFirebaseUserByEmail(testEmail);
            console.log('🧹 Test user cleaned up after error');
        } catch (cleanupError) {
            console.error('⚠️  Cleanup failed:', cleanupError.message);
        }
    }
}

// Run the test
testEmailWithRealCredentials();
