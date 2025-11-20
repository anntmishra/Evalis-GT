// Comprehensive Authentication Debug
const axios = require('axios');
const fs = require('fs');

// Simulate browser localStorage
const localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; }
};

// Import the same config used by frontend
const config = {
  API_BASE_URL: 'http://localhost:3000/api',
  AUTH: {
    TOKEN_STORAGE_KEY: 'userToken',
    USER_STORAGE_KEY: 'user',
    CURRENT_USER_KEY: 'currentUser',
  }
};

// Replicate the getToken function from quizService
const getToken = () => {
  let token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
  
  console.log('=== Token Debug ===');
  console.log('TOKEN_STORAGE_KEY:', config.AUTH.TOKEN_STORAGE_KEY);
  console.log('Direct token from localStorage:', token ? `${token.substring(0, 20)}...` : 'null');
  
  if (!token) {
    try {
      const currentUser = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
      console.log('CURRENT_USER_KEY:', config.AUTH.CURRENT_USER_KEY);
      console.log('Current user data:', currentUser ? 'exists' : 'null');
      
      if (currentUser) {
        const userData = JSON.parse(currentUser);
        token = userData.token;
        console.log('Token from currentUser:', token ? `${token.substring(0, 20)}...` : 'null');
        
        if (token) {
          localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, token);
          console.log('Auto-synced token to main storage');
        }
      }
    } catch (e) {
      console.error('Error parsing current user data:', e);
    }
  }
  
  console.log('Final token selected:', token ? `${token.substring(0, 20)}...` : 'null');
  console.log('==================');
  
  return token;
};

// Test authentication function
const testAuthentication = async () => {
  try {
    console.log('🔐 Testing authentication...');
    
    const token = getToken();
    if (!token) {
      console.log('❌ No token available');
      return { success: false, error: 'No authentication token found' };
    }
    
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    console.log('🔍 Making test request to auth status endpoint...');
    console.log('URL:', `${config.API_BASE_URL}/auth/status`);
    console.log('Headers:', { ...headers, Authorization: headers.Authorization.substring(0, 30) + '...' });
    
    const response = await axios.get(`${config.API_BASE_URL}/auth/status`, { headers });
    
    const isValid = response.status === 200 && response.data?.valid === true;
    console.log('✅ Authentication test result:', { 
      status: response.status, 
      valid: response.data?.valid,
      user: response.data?.user?.email || response.data?.user?.id,
      isValid,
      fullResponse: response.data
    });
    
    if (isValid) {
      return { success: true, status: response.status };
    } else {
      return { success: false, status: response.status, error: response.data?.message || 'Authentication validation failed' };
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code
    });
    return { 
      success: false, 
      status: error.response?.status || 500, 
      error: error.response?.data?.message || error.message || 'Authentication test failed'
    };
  }
};

// Main test function
const runTest = async () => {
  console.log('🚀 Starting comprehensive auth test...\n');
  
  // Test 1: No token scenario
  console.log('--- Test 1: No token ---');
  let result = await testAuthentication();
  console.log('Result:', result);
  console.log('');
  
  // Test 2: Valid token scenario (simulate a logged-in user)
  console.log('--- Test 2: With valid token ---');
  // Create a test token (would normally come from login)
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const testToken = jwt.sign(
    { id: 1, email: 'teacher@test.com', role: 'teacher' }, 
    secret, 
    { expiresIn: '24h' }
  );
  
  localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, testToken);
  console.log('Stored test token in localStorage');
  
  result = await testAuthentication();
  console.log('Result:', result);
  console.log('');
  
  // Test 3: Invalid token scenario
  console.log('--- Test 3: With invalid token ---');
  localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, 'invalid-token');
  
  result = await testAuthentication();
  console.log('Result:', result);
};

// Run the test
runTest().catch(console.error);