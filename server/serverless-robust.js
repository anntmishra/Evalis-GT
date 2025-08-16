const express = require('express');
const cors = require('cors');
const path = require('path');

// Create Express app first
const app = express();

// Basic middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins for now
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Health check route (most important)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: 'serverless-robust'
  });
});

// Inline admin login route
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    console.log('Admin login attempt:', req.body);
    
    const { username, password, email } = req.body;
    
    if ((!username && !email) || !password) {
      return res.status(400).json({
        message: 'Please provide username/email and password'
      });
    }
    
    // Try to load database models
    try {
      const { Admin } = require('./models');
      
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
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        message: 'Database connection error',
        error: dbError.message
      });
    }
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Auth health check
app.get('/api/auth/health', (req, res) => {
  res.json({
    status: 'Auth working',
    timestamp: new Date().toISOString()
  });
});

// Auth status endpoint
app.get('/api/auth/status', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        message: 'No token provided'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({
      valid: true,
      user: decoded,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(401).json({
      valid: false,
      message: 'Invalid token',
      error: error.message
    });
  }
});

// Load environment variables
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '../.env') });
  console.log('✅ Environment loaded');
} catch (error) {
  console.error('❌ Environment loading failed:', error.message);
}

// Initialize database connection
let dbConnected = false;
try {
  const { connectDB } = require('./config/db');
  connectDB().then(() => {
    dbConnected = true;
    console.log('✅ Database connected');
  }).catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });
} catch (error) {
  console.error('❌ Database module loading failed:', error.message);
}

// For now, skip route loading since paths are problematic in Vercel
// We'll inline critical routes above

// Basic teachers endpoint for compatibility
app.get('/api/teachers', async (req, res) => {
  try {
    const { Teacher } = require('./models');
    const teachers = await Teacher.findAll({
      attributes: ['id', 'name', 'email', 'phone', 'department']
    });
    
    res.json(teachers);
  } catch (error) {
    console.error('Teachers fetch error:', error);
    res.status(500).json({
      message: 'Error fetching teachers',
      error: error.message
    });
  }
});

// Basic students endpoint for compatibility  
app.get('/api/students', async (req, res) => {
  try {
    const { Student } = require('./models');
    const students = await Student.findAll({
      attributes: ['id', 'name', 'email', 'phone', 'batchId']
    });
    
    res.json(students);
  } catch (error) {
    console.error('Students fetch error:', error);
    res.status(500).json({
      message: 'Error fetching students',
      error: error.message
    });
  }
});

// Basic batches endpoint
app.get('/api/batches', async (req, res) => {
  try {
    const { Batch } = require('./models');
    const batches = await Batch.findAll({
      attributes: ['id', 'name', 'description', 'year', 'semester']
    });
    
    res.json(batches);
  } catch (error) {
    console.error('Batches fetch error:', error);
    res.status(500).json({
      message: 'Error fetching batches',
      error: error.message
    });
  }
});

// Basic subjects endpoint
app.get('/api/subjects', async (req, res) => {
  try {
    const { Subject } = require('./models');
    const subjects = await Subject.findAll({
      attributes: ['id', 'name', 'code', 'description', 'credits']
    });
    
    res.json(subjects);
  } catch (error) {
    console.error('Subjects fetch error:', error);
    res.status(500).json({
      message: 'Error fetching subjects',
      error: error.message
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({
    error: error.message,
    path: req.originalUrl
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      '/api/health',
      '/api/auth/*',
      '/api/students/*',
      '/api/teachers/*',
      '/api/subjects/*',
      '/api/batches/*',
      '/api/submissions/*',
      '/api/admin/*',
      '/api/semesters/*',
      '/api/assignments/*'
    ]
  });
});

module.exports = app;
