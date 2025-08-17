const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Create Express app
const app = express();

// CORS configuration for Vercel
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'https://evalis-gt.vercel.app',
      'https://evalis-gt-anntmishra.vercel.app'
    ];
    
    // Allow Vercel preview deployments
    if (origin.includes('vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(null, true); // Allow all origins for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  try {
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'Present' : 'Missing',
      JWT_SECRET: process.env.JWT_SECRET ? 'Present' : 'Missing',
      DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD ? 'Present' : 'Missing',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
    };
    
    res.json({
      status: 'debug',
      timestamp: new Date().toISOString(),
      environment: envVars,
      cwd: process.cwd(),
      nodeVersion: process.version
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Simple admin login test endpoint
app.post('/api/auth/admin/test', async (req, res) => {
  try {
    console.log('Test admin login endpoint called');
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password required'
      });
    }
    
    // Test database connection
    const { connectDB } = require('./config/db');
    await connectDB();
    
    // Test admin lookup
    const { Admin } = require('./models');
    const admin = await Admin.findOne({ where: { username } });
    
    if (!admin) {
      return res.status(401).json({
        error: 'Admin not found'
      });
    }
    
    // Test password
    const isMatch = await admin.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid password'
      });
    }
    
    res.json({
      success: true,
      message: 'Test login successful',
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name
      }
    });
    
  } catch (error) {
    console.error('Test admin login error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Import and use main routes
try {
  const authRoutes = require('./routes/authRoutes');
  const healthRoutes = require('./routes/healthRoutes');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/health', healthRoutes);
} catch (error) {
  console.error('Error loading routes:', error);
  
  // Fallback routes
  app.use('/api/*', (req, res) => {
    res.status(500).json({
      error: 'Route loading failed',
      message: error.message
    });
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error handler:', error);
  res.status(500).json({
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

module.exports = app;
