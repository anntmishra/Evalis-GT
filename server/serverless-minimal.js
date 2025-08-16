// Minimal test serverless function for debugging
const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Minimal test endpoint working',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'unknown'
  });
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Admin login test without dependencies
app.post('/api/auth/admin/test-simple', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password required'
      });
    }
    
    // Simple hardcoded test
    if (username === 'admin' && password === 'zyExeKhXoMFtd1Gc') {
      res.json({
        success: true,
        message: 'Simple test login successful',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(401).json({
        error: 'Invalid credentials'
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Catch all
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = app;
