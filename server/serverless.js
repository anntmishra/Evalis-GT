const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { rateLimit } = require('./middleware/rateLimitMiddleware');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import routes with error handling
let authRoutes, studentRoutes, teacherRoutes, subjectRoutes, batchRoutes;
let submissionRoutes, adminRoutes, semesterRoutes, assignmentRoutes, healthRoutes;

try {
  authRoutes = require('./routes/authRoutes');
  studentRoutes = require('./routes/studentRoutes');
  teacherRoutes = require('./routes/teacherRoutes');
  subjectRoutes = require('./routes/subjectRoutes');
  batchRoutes = require('./routes/batchRoutes');
  submissionRoutes = require('./routes/submissionRoutes');
  adminRoutes = require('./routes/adminRoutes');
  semesterRoutes = require('./routes/semesterRoutes');
  assignmentRoutes = require('./routes/assignmentRoutes');
  healthRoutes = require('./routes/healthRoutes');
  console.log('✅ All route modules imported successfully');
} catch (error) {
  console.error('❌ Error importing route modules:', error.message);
  // Create fallback routes
  const fallbackRouter = express.Router();
  fallbackRouter.use('*', (req, res) => {
    res.status(500).json({
      error: 'Route import failed',
      message: error.message,
      path: req.originalUrl
    });
  });
  
  authRoutes = studentRoutes = teacherRoutes = subjectRoutes = batchRoutes = 
  submissionRoutes = adminRoutes = semesterRoutes = assignmentRoutes = healthRoutes = fallbackRouter;
}

// Create Express app
const app = express();

// Connect to database with error handling
let dbConnected = false;
try {
  connectDB();
  dbConnected = true;
  console.log('✅ Database connection initiated');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

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
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting (more lenient for serverless)
app.use('/api/', rateLimit);

// Health check route (important for Vercel)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: 'serverless'
  });
});

// API Routes with error handling
try {
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/teachers', teacherRoutes);
  app.use('/api/subjects', subjectRoutes);
  app.use('/api/batches', batchRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/semesters', semesterRoutes);
  app.use('/api/assignments', assignmentRoutes);
  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  
  // Fallback route for when main routes fail
  app.use('/api/*', (req, res) => {
    res.status(500).json({
      error: 'Server configuration error',
      message: error.message,
      path: req.originalUrl
    });
  });
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Export the Express app for Vercel
module.exports = app;