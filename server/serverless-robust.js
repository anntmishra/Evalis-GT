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

// Load routes conditionally
const loadRoute = (routePath, routeName) => {
  try {
    const route = require(routePath);
    console.log(`✅ ${routeName} route loaded`);
    return route;
  } catch (error) {
    console.error(`❌ ${routeName} route failed:`, error.message);
    const fallbackRouter = express.Router();
    fallbackRouter.use('*', (req, res) => {
      res.status(500).json({
        error: `${routeName} route unavailable`,
        message: error.message
      });
    });
    return fallbackRouter;
  }
};

// Load all routes
const authRoutes = loadRoute('./routes/authRoutes', 'Auth');
const studentRoutes = loadRoute('./routes/studentRoutes', 'Student');
const teacherRoutes = loadRoute('./routes/teacherRoutes', 'Teacher');
const subjectRoutes = loadRoute('./routes/subjectRoutes', 'Subject');
const batchRoutes = loadRoute('./routes/batchRoutes', 'Batch');
const submissionRoutes = loadRoute('./routes/submissionRoutes', 'Submission');
const adminRoutes = loadRoute('./routes/adminRoutes', 'Admin');
const semesterRoutes = loadRoute('./routes/semesterRoutes', 'Semester');
const assignmentRoutes = loadRoute('./routes/assignmentRoutes', 'Assignment');
const healthRoutes = loadRoute('./routes/healthRoutes', 'Health');

// Apply routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/health', healthRoutes);

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
