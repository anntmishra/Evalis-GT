const axios = require('axios');
const colors = require('colors');

const testAdminLogin = async () => {
  console.log('🧪 Testing Admin Login API'.yellow.bold);
  console.log('='*50);
  
  const loginData = {
    username: 'admin',
    password: 'zyExeKhXoMFtd1Gc'
  };
  
  console.log('📤 Sending login request...'.blue);
  console.log(`   Username: ${loginData.username}`.gray);
  console.log(`   Password: ${'*'.repeat(loginData.password.length)}`.gray);
  
  try {
    // Test against local server first
    console.log('\n🏠 Testing against local server...'.cyan);
    const localResponse = await axios.post('http://localhost:5000/api/auth/admin/login', loginData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Local login successful!'.green);
    console.log(`   Token: ${localResponse.data.token ? 'Present' : 'Missing'}`.gray);
    console.log(`   Role: ${localResponse.data.role}`.gray);
    console.log(`   Auth Method: ${localResponse.data.authMethod}`.gray);
    
  } catch (localError) {
    console.log('❌ Local login failed:'.red);
    if (localError.response) {
      console.log(`   Status: ${localError.response.status}`.red);
      console.log(`   Message: ${localError.response.data?.message || 'No message'}`.red);
    } else if (localError.code === 'ECONNREFUSED') {
      console.log('   Local server not running'.yellow);
    } else {
      console.log(`   Error: ${localError.message}`.red);
    }
  }
  
  try {
    // Test against production
    console.log('\n🌐 Testing against production...'.cyan);
    const prodResponse = await axios.post('https://evalis-gt.vercel.app/api/auth/admin/login', loginData, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Production login successful!'.green);
    console.log(`   Token: ${prodResponse.data.token ? 'Present' : 'Missing'}`.gray);
    console.log(`   Role: ${prodResponse.data.role}`.gray);
    console.log(`   Auth Method: ${prodResponse.data.authMethod}`.gray);
    
  } catch (prodError) {
    console.log('❌ Production login failed:'.red);
    if (prodError.response) {
      console.log(`   Status: ${prodError.response.status}`.red);
      console.log(`   Message: ${prodError.response.data?.message || 'No message'}`.red);
      console.log(`   Data:`, prodError.response.data);
    } else {
      console.log(`   Error: ${prodError.message}`.red);
    }
  }
  
  console.log('\n' + '='*50);
  console.log('🏁 Test completed'.blue.bold);
};

testAdminLogin().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
