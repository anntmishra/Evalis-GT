const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('🔐 Testing admin login...');
    
    const loginData = {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.TEST_ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'
    };
    
    // Wait a bit for server to be ready
    console.log('⏳ Waiting for server to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  const base = process.env.TEST_ADMIN_BASE_URL || 'http://localhost:3000';
  console.log(`🌐 Attempting login to ${base}/api/auth/admin/login`);
    
  const response = await axios.post(`${base}/api/auth/admin/login`, loginData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', {
      id: response.data.id,
      name: response.data.name,
      email: response.data.email,
      role: response.data.role,
      token: response.data.token ? '[TOKEN_RECEIVED]' : 'No token'
    });
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not ready yet. Please wait for server to fully start.');
  console.log('You can manually test via frontend or curl once server is up.');
  console.log('Username:', loginData.username);
  console.log('Password:', loginData.password);
    } else if (error.response) {
      console.error('❌ Login failed:', error.response.data);
    } else {
      console.error('❌ Request failed:', error.message);
    }
  }
}

if (require.main === module) {
  testAdminLogin();
}
