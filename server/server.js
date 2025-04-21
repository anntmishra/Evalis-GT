const express = require('express');
const dotenv = require('dotenv');
const colors = require('colors');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const models = require('./models');
const { DEFAULT_PORT } = require('./config/constants');

// Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const batchRoutes = require('./routes/batchRoutes');
const submissionRoutes = require('./routes/submissionRoutes');

// Load env vars
dotenv.config();

// Connect to database
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Sync models with database
    // In production, you shouldn't use force: true
    const isDev = process.env.NODE_ENV === 'development';
    console.log(`Syncing database in ${isDev ? 'development' : 'production'} mode...`.yellow);
    
    await models.sequelize.sync({ alter: isDev });
    console.log('Database synced successfully'.green);
    
    const app = express();
    
    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(fileUpload({
      useTempFiles: false,
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    }));
    
    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/students', studentRoutes);
    app.use('/api/teachers', teacherRoutes);
    app.use('/api/subjects', subjectRoutes);
    app.use('/api/batches', batchRoutes);
    app.use('/api/submissions', submissionRoutes);
    
    // Error middleware
    app.use(notFound);
    app.use(errorHandler);
    
    const PORT = process.env.PORT || DEFAULT_PORT;
    
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`.red.bold);
    process.exit(1);
  }
};

startServer(); 