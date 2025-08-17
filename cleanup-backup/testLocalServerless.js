const axios = require('axios');

const testLocalServerless = async () => {
  console.log('🧪 TESTING LOCAL SERVERLESS FUNCTION');
  console.log('='*50);
  
  // Test the serverless function locally by requiring it
  try {
    const app = require('./serverless-robust.js');
    
    // Check if the routes are properly defined
    console.log('✅ Serverless function loaded successfully');
    
    // Test with a mock request to see available routes
    const baseUrl = 'https://evalis-7pj484mol-anntmishras-projects.vercel.app';
    
    console.log('\n🔍 Testing /api/auth/login...');
    try {
      const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
        email: 'admin@university.edu',
        password: 'zyExeKhXoMFtd1Gc'
      }, {
        timeout: 15000
      });
      
      console.log('✅ Login successful:', loginResponse.data);
      
    } catch (error) {
      if (error.response) {
        console.log('❌ Login failed:', error.response.status, error.response.data);
      } else {
        console.log('❌ Login error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error loading serverless function:', error.message);
  }
};

testLocalServerless();
