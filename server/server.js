const express = require('express');
const dotenv = require('dotenv');
const colors = require('colors');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const models = require('./models');
const { DEFAULT_PORT } = require('./config/constants');
const fs = require('fs');

// Load env vars
dotenv.config();

// Log environment variables
console.log('Environment Variables:'.yellow);
console.log('NODE_ENV:'.cyan, process.env.NODE_ENV);
console.log('DATABASE_URL:'.cyan, process.env.DATABASE_URL ? 'Set (NeonDB connection)' : 'Not set');

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

// Connect to database
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Sync models with database
    // In production, you shouldn't use force: true
    const isDev = process.env.NODE_ENV === 'development';
    console.log(`Syncing database in ${isDev ? 'development' : 'production'} mode...`.yellow);
    
    await models.sequelize.sync({ alter: true });
    console.log('Database synced successfully'.green);
    
    const app = express();
    
    // Middleware
    app.use(cors({
      origin: process.env.NODE_ENV === 'development' 
        ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5179', 'http://localhost:5180']
        : process.env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use(express.json());
    
    // Serve static files from the uploads directory - use absolute path
    const uploadsPath = path.join(__dirname, 'uploads');
    console.log('Serving uploads from:', uploadsPath);
    app.use('/uploads', express.static(uploadsPath));
    
    // Also try with relative path as fallback
    app.use('/uploads', express.static('server/uploads'));
    console.log('Also serving uploads from: server/uploads (relative path)');
    
    // Add a test endpoint for uploads
    app.get('/api/check-uploads', (req, res) => {
      const files = [];
      try {
        if (fs.existsSync(uploadsPath)) {
          const items = fs.readdirSync(uploadsPath);
          items.forEach(item => {
            const itemPath = path.join(uploadsPath, item);
            if (fs.statSync(itemPath).isDirectory()) {
              const subItems = fs.readdirSync(itemPath);
              files.push(`Directory ${item}: ${subItems.length} files`);
              subItems.forEach(subItem => {
                files.push(`  - ${subItem}`);
              });
            } else {
              files.push(`File: ${item}`);
            }
          });
        } else {
          files.push('Uploads directory does not exist');
        }
      } catch (error) {
        files.push(`Error reading uploads: ${error.message}`);
      }
      
      res.json({
        uploadsPath,
        exists: fs.existsSync(uploadsPath),
        files
      });
    });
    
    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/students', studentRoutes);
    app.use('/api/teachers', teacherRoutes);
    app.use('/api/subjects', subjectRoutes);
    app.use('/api/batches', batchRoutes);
    app.use('/api/submissions', submissionRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/semesters', semesterRoutes);
    app.use('/api/assignments', assignmentRoutes);
    
    // Test route for debugging CORS issues
    app.get('/api/test', (req, res) => {
      res.json({ message: 'CORS is working properly!' });
    });
    
    // Error middleware
    app.use(notFound);
    app.use(errorHandler);
    
    // Use a different port if the default is already in use
    const PORT = process.env.PORT || DEFAULT_PORT;
    
    // Try to start server and handle errors gracefully
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const alternatePort = PORT + 1;
        console.log(`Port ${PORT} is in use, trying port ${alternatePort}...`.yellow);
        
        // Try another port
        app.listen(alternatePort, () => {
          console.log(`Server running in ${process.env.NODE_ENV} mode on alternate port ${alternatePort}`.green.bold);
        });
      } else {
        console.error(`Error starting server: ${err.message}`.red.bold);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`.red.bold);
    process.exit(1);
  }
};

startServer();