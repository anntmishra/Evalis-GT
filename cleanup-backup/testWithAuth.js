const axios = require('axios');

const testWithAuth = async () => {
  console.log('🔑 TESTING API ENDPOINTS WITH AUTHENTICATION');
  console.log('='*60);
  
  const baseUrl = 'https://evalis-7pj484mol-anntmishras-projects.vercel.app';
  
  // First, get an auth token
  console.log('🔐 Getting authentication token...');
  
  try {
    const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'admin@university.edu',
      password: 'zyExeKhXoMFtd1Gc'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token obtained');
    
    // Test endpoints with token
    const endpoints = [
      '/api/auth/status',
      '/api/subjects',
      '/api/teachers',
      '/api/students',
      '/api/batches'
    ];
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔍 Testing ${endpoint} with auth...`);
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          headers,
          timeout: 15000
        });
        
        console.log(`✅ ${endpoint}: ${response.status} - ${response.statusText}`);
        
        // Show meaningful response data
        if (response.data) {
          if (Array.isArray(response.data)) {
            console.log(`   Response: Array with ${response.data.length} items`);
            if (response.data.length > 0) {
              console.log(`   Sample: ${JSON.stringify(response.data[0]).substring(0, 100)}...`);
            }
          } else {
            console.log(`   Response: ${JSON.stringify(response.data).substring(0, 150)}...`);
          }
        }
        
      } catch (error) {
        if (error.response) {
          console.log(`❌ ${endpoint}: ${error.response.status} - ${error.response.statusText}`);
          if (error.response.data && typeof error.response.data === 'object') {
            console.log(`   Error: ${JSON.stringify(error.response.data).substring(0, 150)}...`);
          } else {
            console.log(`   Error: ${error.response.data ? error.response.data.substring(0, 100) : 'No error details'}...`);
          }
        } else {
          console.log(`❌ ${endpoint}: ${error.message}`);
        }
      }
    }
    
  } catch (loginError) {
    console.error('❌ Login failed:', loginError.response?.data || loginError.message);
  }
  
  console.log('\n🧪 Authentication testing complete!');
};

testWithAuth();
