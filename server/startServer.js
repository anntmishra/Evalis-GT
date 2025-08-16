const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const colors = require('colors');
const morgan = require('morgan');
const path = require('path');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { connectDB } = require('./config/db');

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Welcome route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Evalis API',
    status: 'Server is running'
  });
});

// API routes
app.use('/api/auth', require('./routes/authRoutes'));

// Handle 404s
app.use(notFound);

// Error handler
app.use(errorHandler);

// Set port
const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.log(`Error: ${err.message}`.red);
      console.log('Shutting down server due to unhandled promise rejection');
      server.close(() => process.exit(1));
    });
    
  } catch (error) {
    console.error(`Server error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

startServer(); 