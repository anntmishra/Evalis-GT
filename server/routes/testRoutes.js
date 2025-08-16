const express = require('express');
const router = express.Router();
const { sendLoginCredentials } = require('../utils/emailUtils');

// Test email endpoint
router.post('/send-test-email', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const testUser = {
      email,
      name: name || 'Test User',
      id: 'TEST001'
    };
    
    const testPassword = 'TestPassword123!';
    
    console.log(`Sending test email to: ${email}`);
    const result = await sendLoginCredentials(testUser, testPassword);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      recipient: email
    });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

module.exports = router;
