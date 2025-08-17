const axios = require('axios');

const testNewEndpoints = async () => {
  console.log('🧪 TESTING NEW BYPASS ENDPOINTS');
  console.log('='*50);
  
  const baseUrl = 'https://evalis-7pj484mol-anntmishras-projects.vercel.app';
  
  // Test health endpoint
  console.log('🔍 Testing /api/health...');
  try {
    const healthResponse = await axios.get(`${baseUrl}/api/health`);
    console.log('✅ Health endpoint working:', healthResponse.data);
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.response?.data || error.message);
  }
  
  // Test login endpoint
  console.log('\n🔍 Testing /api/test-login...');
  try {
    const loginResponse = await axios.post(`${baseUrl}/api/test-login`, {
      email: 'admin@university.edu',
      password: 'zyExeKhXoMFtd1Gc'
    });
    console.log('✅ Test login working:', loginResponse.data);
    
    const token = loginResponse.data.token;
    console.log(`Token: ${token.substring(0, 20)}...`);
    
  } catch (error) {
    console.log('❌ Test login failed:', error.response?.data || error.message);
  }
  
  console.log('\n🧪 Testing complete!');
};

testNewEndpoints();
