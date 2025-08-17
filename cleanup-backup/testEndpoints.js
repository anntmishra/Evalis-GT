const axios = require('axios');

const testEndpoints = async () => {
  console.log('🧪 TESTING API ENDPOINTS');
  console.log('='*50);
  
  const baseUrl = 'https://evalis-7pj484mol-anntmishras-projects.vercel.app';
  
  const endpoints = [
    '/api/auth/status',
    '/api/subjects',
    '/api/teachers',
    '/api/students',
    '/api/batches'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing ${endpoint}...`);
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        timeout: 10000
      });
      
      console.log(`✅ ${endpoint}: ${response.status} - ${response.statusText}`);
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${endpoint}: ${error.response.status} - ${error.response.statusText}`);
        console.log(`   Error: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
      } else {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
  }
  
  console.log('\n🧪 Testing complete!');
};

testEndpoints();
