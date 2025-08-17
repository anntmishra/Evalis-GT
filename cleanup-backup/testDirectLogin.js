const axios = require('axios');

const testDirectLogin = async () => {
  console.log('🧪 TESTING DIRECT LOGIN ENDPOINTS');
  console.log('='*50);
  
  const baseUrl = 'https://evalis-7pj484mol-anntmishras-projects.vercel.app';
  
  const loginData = {
    email: 'admin@university.edu',
    password: 'zyExeKhXoMFtd1Gc'
  };
  
  const endpoints = [
    '/api/auth/login',
    '/api/auth/admin/login'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔍 Testing ${endpoint}...`);
    try {
      const response = await axios.post(`${baseUrl}${endpoint}`, loginData, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ ${endpoint}: SUCCESS`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Token: ${response.data.token ? response.data.token.substring(0, 20) + '...' : 'No token'}`);
      console.log(`   User: ${response.data.email || response.data.username || 'Unknown'}`);
      
      // Test with this token
      if (response.data.token) {
        console.log('   🔑 Testing authenticated endpoint...');
        try {
          const authResponse = await axios.get(`${baseUrl}/api/auth/status`, {
            headers: {
              'Authorization': `Bearer ${response.data.token}`
            }
          });
          console.log(`   ✅ Auth status: ${authResponse.data.status || 'OK'}`);
        } catch (authError) {
          console.log(`   ❌ Auth status failed: ${authError.response?.status || authError.message}`);
        }
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${endpoint}: ${error.response.status}`);
        console.log(`   Error: ${JSON.stringify(error.response.data).substring(0, 150)}...`);
      } else {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
  }
  
  console.log('\n🧪 Testing complete!');
};

testDirectLogin();
