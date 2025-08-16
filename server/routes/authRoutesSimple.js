const express = require('express');
const router = express.Router();

// Simple admin login without heavy dependencies
router.post('/admin/login', async (req, res) => {
  try {
    console.log('Admin login attempt:', req.body);
    
    const { username, password, email } = req.body;
    
    if ((!username && !email) || !password) {
      return res.status(400).json({
        message: 'Please provide username/email and password'
      });
    }
    
    // Try to load database models
    const { Admin } = require('../models');
    
    // Look up admin
    const whereClause = username ? { username } : { email };
    const admin = await Admin.findOne({ where: whereClause });
    
    if (!admin) {
      return res.status(401).json({
        message: 'Invalid username/email or password'
      });
    }
    
    // Check password
    const isMatch = await admin.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid username/email or password'
      });
    }
    
    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: admin.id,
        username: admin.username,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: 'admin',
      token: token,
      authMethod: 'database'
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check for auth
router.get('/health', (req, res) => {
  res.json({
    status: 'Auth route working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
