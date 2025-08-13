const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { rateLimit, authRateLimit } = require('./middleware/rateLimitMiddleware');
const models = require('./models');
const { logger, requestLogger } = require('./utils/logger');
const healthRoutes = require('./routes/healthRoutes');
const { validateSession } = require('./utils/sessionManager');
const { serveUploadedFile } = require('./utils/uploadHelper');

// Load env vars
dotenv.config();

// Create Express app
const app = express();

// Disable x-powered-by header
app.disable('x-powered-by');

// Trust proxy for accurate IP addresses behind Vercel
app.set('trust proxy', 1);

// Apply rate limiting
app.use(rateLimit);

// Apply request logging
app.use(requestLogger);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload middleware for Vercel
app.use(serveUploadedFile);

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// Health and monitoring routes
app.use('/api/health', healthRoutes);
app.use('/api', require('./routes/monitoringRoutes'));

// Auth rate limiting for sensitive routes
app.use('/api/auth', authRateLimit);

// Initialize database connection
let dbConnected = false;
const initializeApp = async () => {
  if (!dbConnected) {
    try {
      await connectDB();
      await models.initModels();
      dbConnected = true;
      logger.info('Database connected for serverless function');
    } catch (error) {
      logger.error(`Database connection failed: ${error.message}`);
      throw error;
    }
  }
};

// Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const batchRoutes = require('./routes/batchRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const semesterRoutes = require('./routes/semesterRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/assignments', assignmentRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error middleware
app.use(notFound);
app.use(errorHandler);

// Serverless function handler
module.exports = async (req, res) => {
  try {
    await initializeApp();
    return app(req, res);
  } catch (error) {
    logger.error(`Serverless function error: ${error.message}`);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Export app for local development
module.exports.app = app;
