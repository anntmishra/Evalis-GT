const express = require('express');
const dotenv = require('dotenv');
const colors = require('colors');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { rateLimit, authRateLimit } = require('./middleware/rateLimitMiddleware');
const models = require('./models');
const { DEFAULT_PORT } = require('./config/constants');
const fs = require('fs');
const { logger, requestLogger } = require('./utils/logger');
const healthRoutes = require('./routes/healthRoutes');
const { validateSession } = require('./utils/sessionManager');

// Load env vars
dotenv.config();

// Log environment variables
logger.info('Starting Evalis Server...');
logger.info(`Environment: ${process.env.NODE_ENV}`);
logger.info(`Database configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
logger.info(`Port: ${process.env.PORT || DEFAULT_PORT}`);

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
    logger.error('Exceeded maximum port attempts. Cannot start server.');
    process.exit(1);
    return;
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port)
      .on('listening', () => {
        logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
        resolve(server);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          logger.warn(`Port ${port} is in use, trying port ${port + 1}...`);
          // Close the server that failed to bind
          server.close();
          // Try the next port
          startServerOnPort(app, parseInt(port) + 1, maxAttempts - 1)
            .then(resolve)
            .catch(reject);
        } else {
          logger.error(`Failed to start server: ${err.message}`);
          reject(err);
        }
      });
      
    // Set timeouts for idle connections to prevent resource exhaustion
    server.keepAliveTimeout = 65000; // Close idle connections after 65 seconds
    server.headersTimeout = 66000;   // Slightly longer than keepAliveTimeout
      
    // Set server connection limits if needed
    if (process.env.MAX_CONNECTIONS) {
      server.maxConnections = parseInt(process.env.MAX_CONNECTIONS, 10);
      logger.info(`Server connection limit set to: ${server.maxConnections}`);
    }
      
    // Monitor active connections (development only)
    if (process.env.NODE_ENV === 'development') {
      let connections = 0;
      server.on('connection', () => {
        connections++;
        logger.debug(`New connection established. Total connections: ${connections}`);
      });
      
      // Log when connections are closed
      server.on('close', () => {
        connections--;
        logger.debug(`Connection closed. Total connections: ${connections}`);
      });
    }

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close((err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        logger.info('HTTP server closed.');
        
        // Close database connections
        models.sequelize.close()
          .then(() => {
            logger.info('Database connections closed.');
            process.exit(0);
          })
          .catch((dbErr) => {
            logger.error('Error closing database connections:', dbErr);
            process.exit(1);
          });
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after 30 seconds');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  });
};

// Connect to database
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize models and sync database
    logger.info('Initializing database models...');
    await models.initModels();
    logger.info('Database models initialized successfully');
    
    const app = express();
    
    // Request logging middleware (only in development or if explicitly enabled)
    if (isDev || process.env.ENABLE_REQUEST_LOGGING === 'true') {
      app.use(requestLogger);
    }

    // Session validation middleware
    app.use(validateSession);
    
    // Middleware
    app.use(cors({
      origin: process.env.NODE_ENV === 'development' 
        ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']
        : process.env.FRONTEND_URL?.split(',') || false,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400 // Cache preflight requests for 24 hours
    }));
    app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' })); // Configurable JSON payload size
    app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '10mb' })); // Configurable form data size
    
    // Apply rate limiting
    app.use(rateLimit);
    
    // Health check routes (before other routes)
    app.use('/api', healthRoutes);
    
    // Serve static files from the uploads directory - use absolute path
    const uploadsPath = path.join(__dirname, 'uploads');
    logger.debug('Serving uploads from:', uploadsPath);
    app.use('/uploads', express.static(uploadsPath));
    
    // Also try with relative path as fallback
    app.use('/uploads', express.static('server/uploads'));
    logger.debug('Also serving uploads from: server/uploads (relative path)');
    
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
    const initialPort = parseInt(process.env.PORT) || DEFAULT_PORT;
    
    // Start the server with port retry mechanism
    await startServerOnPort(app, initialPort);
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();