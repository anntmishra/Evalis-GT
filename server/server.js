const express = require('express');
const dotenv = require('dotenv');
const colors = require('colors');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const rateLimit = require('./middleware/rateLimitMiddleware');
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

// Function to try binding to ports recursively
const startServerOnPort = (app, port, maxAttempts = 10) => {
  if (maxAttempts <= 0) {
    console.error('Exceeded maximum port attempts. Cannot start server.'.red.bold);
    process.exit(1);
    return;
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port)
      .on('listening', () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${port}`.green.bold);
        resolve(server);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} is in use, trying port ${port + 1}...`.yellow);
          // Close the server that failed to bind
          server.close();
          // Try the next port
          startServerOnPort(app, port + 1, maxAttempts - 1)
            .then(resolve)
            .catch(reject);
        } else {
          console.error(`Failed to start server: ${err.message}`.red);
          reject(err);
        }
      });
      
    // Set timeouts for idle connections to prevent resource exhaustion
    server.keepAliveTimeout = 65000; // Close idle connections after 65 seconds
    server.headersTimeout = 66000;   // Slightly longer than keepAliveTimeout
      
    // Set server connection limits if needed
    if (process.env.MAX_CONNECTIONS) {
      server.maxConnections = parseInt(process.env.MAX_CONNECTIONS, 10);
      console.log(`Server connection limit set to: ${server.maxConnections}`.yellow);
    }
      
    // Monitor active connections (development only)
    if (process.env.NODE_ENV === 'development') {
      let connections = 0;
      server.on('connection', () => {
        connections++;
        console.log(`New connection established. Total connections: ${connections}`.cyan);
      });
      
      // Log when connections are closed
      server.on('close', () => {
        connections--;
        console.log(`Connection closed. Total connections: ${connections}`.cyan);
      });
    }
  });
};

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
        ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']
        : process.env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400 // Cache preflight requests for 24 hours
    }));
    app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
    app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Limit form data size
    
    // Apply rate limiting
    app.use(rateLimit);
    
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
    const initialPort = process.env.PORT || DEFAULT_PORT;
    
    // Start the server with port retry mechanism
    await startServerOnPort(app, initialPort);
  } catch (error) {
    console.error(`Error starting server: ${error.message}`.red.bold);
    process.exit(1);
  }
};

startServer();