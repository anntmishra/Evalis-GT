#!/usr/bin/env node

/**
 * Test script to verify Google API key is working
 * Run: node test-google-api.js
 */

const axios = require('axios');
require('dotenv').config();

const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
const GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function testGoogleAPI() {
  console.log('Testing Google API...\n');
  console.log('API Key (masked):', GOOGLE_API_KEY ? GOOGLE_API_KEY.substring(0, 20) + '...' : 'NOT FOUND');
  console.log('API URL:', GOOGLE_API_URL);
  console.log('\n---\n');

  if (!GOOGLE_API_KEY) {
    console.error('❌ Error: VITE_GOOGLE_API_KEY not found in .env file');
    process.exit(1);
  }

  try {
    console.log('Sending test request...');
    const response = await axios.post(`${GOOGLE_API_URL}?key=${GOOGLE_API_KEY}`, {
      contents: [{
        parts: [{
          text: 'Say "Hello, the API is working!" in a single sentence.'
        }]
      }]
    }, {
      timeout: 10000
    });

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const text = response.data.candidates[0].content.parts[0].text;
      console.log('✅ Success! API Response:', text);
      console.log('\n✅ Google API is configured correctly and working!');
    } else {
      console.log('⚠️  Warning: Unexpected response format');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error testing API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
      
      if (error.response.status === 429) {
        console.error('\n⚠️  Rate limit exceeded. Please wait a moment and try again.');
      } else if (error.response.status === 400) {
        console.error('\n⚠️  Invalid API key or request format.');
      } else if (error.response.status === 403) {
        console.error('\n⚠️  API key does not have permission or is invalid.');
      }
    } else if (error.request) {
      console.error('No response received from server');
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

testGoogleAPI();
