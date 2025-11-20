#!/usr/bin/env node

/**
 * Test script to verify the quiz authentication fix
 * This script tests the authentication flow and quiz creation endpoints
 */

const axios = require('axios');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const TEST_CREDENTIALS = {
  email: 'teacher@example.com',
  password: 'password123',
  id: 'TCH001'
};

// Test data for quiz creation
const TEST_QUIZ_DATA = {
  title: 'Test Quiz Authentication',
  description: 'Testing quiz creation after auth fix',
  subjectId: '1', // Will need to be updated with actual subject ID
  batchId: '1',   // Will need to be updated with actual batch ID
  timeLimit: 60,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  passingMarks: 10,
  allowMultipleAttempts: false,
  maxAttempts: 1,
  shuffleQuestions: false,
  showResultsImmediately: true,
  instructions: 'Test instructions',
  isPublished: false,
  questions: [
    {
      questionText: 'This is a test question to verify authentication fix works correctly?',
      questionType: 'multiple_choice',
      marks: 5,
      explanation: 'Test explanation',
      imageUrl: null,
      options: [
        { optionText: 'Option A', isCorrect: true, explanation: '' },
        { optionText: 'Option B', isCorrect: false, explanation: '' },
        { optionText: 'Option C', isCorrect: false, explanation: '' },
        { optionText: 'Option D', isCorrect: false, explanation: '' }
      ],
      orderIndex: 1
    },
    {
      questionText: 'This is another test question to ensure multiple questions work properly?',
      questionType: 'true_false',
      marks: 5,
      explanation: 'Another test explanation',
      imageUrl: null,
      options: [
        { optionText: 'True', isCorrect: true, explanation: '' },
        { optionText: 'False', isCorrect: false, explanation: '' }
      ],
      orderIndex: 2
    }
  ]
};

// Helper functions
const log = (message, color = 'white') => {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color] || colors.white}${message}${colors.reset}`);
};

const logSection = (title) => {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
};

const logStep = (step, description) => {
  log(`\n${step}. ${description}`, 'blue');
  log('-'.repeat(40), 'blue');
};

// Test functions
async function testHealthEndpoint() {
  logStep(1, 'Testing Health Endpoint');
  try {
    const response = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
    if (response.status === 200) {
      log('✅ Health endpoint working', 'green');
      return true;
    } else {
      log(`❌ Health endpoint returned ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Health endpoint failed: ${error.message}`, 'red');
    return false;
  }
}

async function testAuthEndpoints() {
  logStep(2, 'Testing Authentication Endpoints');
  
  // Test both possible auth status endpoints
  const authStatusEndpoints = [
    { url: `${API_BASE}/auth/status`, name: 'Auth Status (Primary)' },
  ];
  
  for (const endpoint of authStatusEndpoints) {
    try {
      log(`\n🔍 Testing: ${endpoint.name}`, 'yellow');
      const response = await axios.get(endpoint.url, {
        timeout: 5000,
        validateStatus: () => true // Accept any status
      });
      
      log(`   Status: ${response.status}`, 'cyan');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'cyan');
      
      if (response.status === 200) {
        // Check response format
        if (response.data.hasOwnProperty('valid')) {
          log('   Format: Serverless route (has "valid" field)', 'green');
        } else if (response.data.hasOwnProperty('authenticated')) {
          log('   Format: Auth routes (has "authenticated" field)', 'green');
        } else {
          log('   Format: Unknown response format', 'yellow');
        }
      }
      
    } catch (error) {
      log(`❌ ${endpoint.name} failed: ${error.message}`, 'red');
    }
  }
}

async function loginAsTeacher() {
  logStep(3, 'Attempting Teacher Login');
  
  // Try multiple login endpoints
  const loginEndpoints = [
    { url: `${API_BASE}/auth/teacher/login`, name: 'Teacher Login (Primary)' },
    { url: `${API_BASE}/auth/login`, name: 'General Login (Fallback)' }
  ];
  
  for (const endpoint of loginEndpoints) {
    try {
      log(`\n🔑 Trying: ${endpoint.name}`, 'yellow');
      
      // Try with different credential formats
      const credentialFormats = [
        { ...TEST_CREDENTIALS, description: 'Email + Password' },
        { id: TEST_CREDENTIALS.id, password: TEST_CREDENTIALS.password, description: 'ID + Password' }
      ];
      
      for (const creds of credentialFormats) {
        try {
          log(`   Testing with: ${creds.description}`, 'cyan');
          const response = await axios.post(endpoint.url, creds, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });
          
          if (response.status === 200 && response.data.token) {
            log('✅ Login successful!', 'green');
            log(`   Token: ${response.data.token.substring(0, 20)}...`, 'green');
            log(`   User: ${response.data.name || response.data.email || response.data.id}`, 'green');
            log(`   Role: ${response.data.role}`, 'green');
            return response.data.token;
          } else {
            log(`   ❌ Login failed: ${response.status} - ${JSON.stringify(response.data)}`, 'red');
          }
          
        } catch (credError) {
          log(`   ❌ Credential test failed: ${credError.response?.status || credError.message}`, 'red');
          if (credError.response?.data) {
            log(`      Error: ${JSON.stringify(credError.response.data)}`, 'red');
          }
        }
      }
      
    } catch (endpointError) {
      log(`❌ ${endpoint.name} unavailable: ${endpointError.message}`, 'red');
    }
  }
  
  log('\n❌ All login attempts failed. Cannot proceed with authenticated tests.', 'red');
  return null;
}

async function testAuthenticatedRequest(token) {
  logStep(4, 'Testing Authenticated Requests');
  
  if (!token) {
    log('❌ No token available for authenticated tests', 'red');
    return false;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  // Test auth status with token
  try {
    log('\n🔍 Testing auth status with token...', 'yellow');
    const response = await axios.get(`${API_BASE}/auth/status`, {
      headers,
      timeout: 5000
    });
    
    log(`   Status: ${response.status}`, 'cyan');
    log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'cyan');
    
    // Check if authentication is valid using the new logic
    const isValidServerless = response.data?.valid === true;
    const isValidAuthRoutes = response.data?.authenticated === true;
    const isValid = response.status === 200 && (isValidServerless || isValidAuthRoutes);
    
    if (isValid) {
      log('✅ Token validation successful!', 'green');
      log(`   Format: ${isValidServerless ? 'serverless' : 'authRoutes'}`, 'green');
      return true;
    } else {
      log('❌ Token validation failed', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Auth status test failed: ${error.response?.status || error.message}`, 'red');
    if (error.response?.data) {
      log(`   Error: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

async function testQuizCreation(token) {
  logStep(5, 'Testing Quiz Creation');
  
  if (!token) {
    log('❌ No token available for quiz creation test', 'red');
    return false;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  try {
    log('\n📝 Creating test quiz...', 'yellow');
    const response = await axios.post(`${API_BASE}/quizzes`, TEST_QUIZ_DATA, {
      headers,
      timeout: 15000
    });
    
    if (response.status === 200 || response.status === 201) {
      log('✅ Quiz creation successful!', 'green');
      log(`   Quiz ID: ${response.data.id || response.data.quiz?.id}`, 'green');
      log(`   Title: ${response.data.title || response.data.quiz?.title}`, 'green');
      return true;
    } else {
      log(`❌ Quiz creation failed: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Quiz creation failed: ${error.response?.status || error.message}`, 'red');
    if (error.response?.data) {
      log(`   Error: ${JSON.stringify(error.response.data)}`, 'red');
    }
    
    // Analyze the error to provide helpful feedback
    if (error.response?.status === 401) {
      log('   💡 This appears to be an authentication issue', 'yellow');
    } else if (error.response?.status === 400) {
      log('   💡 This appears to be a validation issue', 'yellow');
    } else if (error.response?.status === 404) {
      log('   💡 Quiz endpoint may not be available', 'yellow');
    }
    
    return false;
  }
}

// Main test execution
async function runTests() {
  logSection('QUIZ AUTHENTICATION FIX TEST');
  log('Testing the authentication flow for quiz creation', 'white');
  
  const results = {
    health: false,
    auth: false,
    login: null,
    authValidation: false,
    quizCreation: false
  };
  
  // Run tests sequentially
  results.health = await testHealthEndpoint();
  
  await testAuthEndpoints();
  
  results.login = await loginAsTeacher();
  
  if (results.login) {
    results.authValidation = await testAuthenticatedRequest(results.login);
    results.quizCreation = await testQuizCreation(results.login);
  }
  
  // Summary
  logSection('TEST RESULTS SUMMARY');
  log(`Health Endpoint: ${results.health ? '✅ PASS' : '❌ FAIL'}`, results.health ? 'green' : 'red');
  log(`Teacher Login: ${results.login ? '✅ PASS' : '❌ FAIL'}`, results.login ? 'green' : 'red');
  log(`Auth Validation: ${results.authValidation ? '✅ PASS' : '❌ FAIL'}`, results.authValidation ? 'green' : 'red');
  log(`Quiz Creation: ${results.quizCreation ? '✅ PASS' : '❌ FAIL'}`, results.quizCreation ? 'green' : 'red');
  
  const allPassed = results.health && results.login && results.authValidation && results.quizCreation;
  
  log('\n' + '='.repeat(60), 'cyan');
  log(`OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`, allPassed ? 'green' : 'red');
  log('='.repeat(60), 'cyan');
  
  if (allPassed) {
    log('\n🎉 The authentication fix appears to be working correctly!', 'green');
    log('   Quiz creation should now work properly in the UI.', 'green');
  } else {
    log('\n🔧 Some issues were found:', 'yellow');
    if (!results.health) log('   - API server may not be running', 'yellow');
    if (!results.login) log('   - Teacher login is not working', 'yellow');
    if (!results.authValidation) log('   - Token validation is failing', 'yellow');
    if (!results.quizCreation) log('   - Quiz creation endpoint has issues', 'yellow');
  }
  
  return allPassed;
}

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    log(`\n💥 Test execution failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runTests };