console.log('=== Environment Debug ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);

// Try to start the server and test auth endpoint
const express = require('express');
const jwt = require('jsonwebtoken');

// Test JWT creation/verification
const testPayload = { id: 1, email: 'test@example.com', role: 'teacher' };
const secret = process.env.JWT_SECRET || 'fallback-secret';

try {
  const token = jwt.sign(testPayload, secret, { expiresIn: '24h' });
  console.log('Token created successfully:', token.substring(0, 20) + '...');
  
  const decoded = jwt.verify(token, secret);
  console.log('Token verified successfully:', decoded);
} catch (error) {
  console.error('JWT test failed:', error.message);
}