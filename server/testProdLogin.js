const axios = require('axios');
const colors = require('colors');

const testProductionLogin = async () => {
  console.log('🧪 Testing Production Admin Login'.yellow.bold);
  console.log('='*50);
  
  const loginData = {
    username: 'admin',
    password: 'zyExeKhXoMFtd1Gc'
  };
  
  console.log('📤 Sending login request to production...'.blue);
  console.log('   URL: https://evalis-gt.vercel.app/api/auth/admin/login'.gray);
  console.log(`   Username: ${loginData.username}`.gray);
  console.log(`   Password: ${'*'.repeat(loginData.password.length)}`.gray);
  
  try {
    const response = await axios.post('https://evalis-gt.vercel.app/api/auth/admin/login', loginData, {
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AdminLoginTest/1.0'
      },
      validateStatus: function (status) {
        return status < 600; // Accept all status codes
      }
    });
    
    console.log(`📊 Response Status: ${response.status}`.blue);
    console.log(`📊 Response Headers:`.blue);
    console.log(JSON.stringify(response.headers, null, 2).gray);
    console.log(`📊 Response Data:`.blue);
    console.log(JSON.stringify(response.data, null, 2).gray);
    
    if (response.status === 200) {
      console.log('✅ Login successful!'.green.bold);
    } else if (response.status === 500) {
      console.log('❌ Server error occurred'.red.bold);
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`.yellow.bold);
    }
    
  } catch (error) {
    console.log('❌ Request failed:'.red.bold);
    console.log(`   Error Type: ${error.constructor.name}`.red);
    console.log(`   Error Message: ${error.message}`.red);
    
    if (error.response) {
      console.log(`   Response Status: ${error.response.status}`.red);
      console.log(`   Response Data:`, error.response.data);
    }
    
    if (error.code) {
      console.log(`   Error Code: ${error.code}`.red);
    }
  }
  
  console.log('\n' + '='*50);
  console.log('🏁 Test completed'.blue.bold);
};

testProductionLogin();
