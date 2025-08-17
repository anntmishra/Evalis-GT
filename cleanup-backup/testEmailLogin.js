const axios = require('axios');

const testAdminLoginWithEmail = async () => {
  console.log('🧪 Testing Admin Login with Email');
  console.log('='*50);
  
  const loginData = {
    email: 'admin@university.edu',
    password: 'zyExeKhXoMFtd1Gc'
  };
  
  console.log('📤 Sending login request...');
  console.log(`   Email: ${loginData.email}`);
  console.log(`   Password: ${'*'.repeat(loginData.password.length)}`);
  
  try {
    const response = await axios.post('https://evalis-gt.vercel.app/api/auth/admin/login', loginData, {
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        return status < 600; // Accept all status codes
      }
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`);
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Login successful!'.green);
    } else {
      console.log(`❌ Login failed with status ${response.status}`);
    }
    
  } catch (error) {
    console.log('❌ Request failed:');
    console.log(`   Error: ${error.message}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
  }
};

testAdminLoginWithEmail();
