const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { logger } = require('./logger');

// Vercel doesn't support persistent file storage, so we need to handle uploads differently
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;

// Memory storage for Vercel (files will be processed and potentially uploaded to cloud storage)
const memoryStorage = multer.memoryStorage();

// Disk storage for local development
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'assignments');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow common document and image formats
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

// Configure multer based on environment
const createUploadMiddleware = (options = {}) => {
  const config = {
    storage: isVercel ? memoryStorage : diskStorage,
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    ...options
  };
  
  return multer(config);
};

// Helper function to handle file processing in Vercel
const processUploadedFile = async (file, req) => {
  if (!file) return null;
  
  if (isVercel) {
    // In Vercel, file is in memory (file.buffer)
    // You can implement cloud storage upload here (AWS S3, Cloudinary, etc.)
    // For now, we'll return a mock URL and log the file info
    logger.info(`File uploaded in memory: ${file.originalname}, size: ${file.size}`);
    
    // Mock file URL for demo purposes
    // In production, upload to cloud storage and return the actual URL
    const mockUrl = `/api/files/${Date.now()}-${file.originalname}`;
    
    // Store file metadata (you might want to save this to database)
    req.uploadedFile = {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: mockUrl,
      buffer: file.buffer // Available in memory
    };
    
    return mockUrl;
  } else {
    // Local development - file is saved to disk
    return `/uploads/assignments/${file.filename}`;
  }
};

// Middleware to serve uploaded files in Vercel
const serveUploadedFile = (req, res, next) => {
  if (isVercel && req.path.startsWith('/api/files/')) {
    // In production, you'd retrieve from cloud storage
    // For demo, return a 404 or redirect to cloud storage URL
    return res.status(404).json({ 
      message: 'File storage not configured for production environment',
      note: 'Implement cloud storage integration for file serving'
    });
  }
  next();
};

module.exports = {
  createUploadMiddleware,
  processUploadedFile,
  serveUploadedFile,
  isVercel
};
