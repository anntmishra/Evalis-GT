const express = require('express');
const router = express.Router();
const {
  getAssignments,
  getStudentAssignments,
  getTeacherAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions
} = require('../controllers/assignmentController');
const { protect, admin, teacher, student } = require('../middleware/authMiddleware');
const { createUploadMiddleware, processUploadedFile } = require('../utils/uploadHelper');

// Configure multer for file uploads
const upload = createUploadMiddleware();

// Assignment routes
router.route('/')
  .get(protect, admin, getAssignments)
  .post(protect, teacher, createAssignment);

// File upload route
router.post('/upload', protect, teacher, upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('Request body:', req.body);
    console.log('File received:', req.file ? req.file.originalname : 'No file attached');
    
    // Process the uploaded file (handles both local and Vercel environments)
    const fileUrl = await processUploadedFile(req.file, req);
    console.log('File URL:', fileUrl);
    
    // Add file URL to the request body
    req.body.fileUrl = fileUrl;
    
    // Call the same create assignment controller function
    await createAssignment(req, res);
  } catch (error) {
    console.error('Error in upload route:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// Student assignments
router.route('/student')
  .get(protect, student, getStudentAssignments);

// Teacher assignments
router.route('/teacher')
  .get(protect, teacher, getTeacherAssignments);

// Assignment by ID
router.route('/:id')
  .get(protect, getAssignmentById)
  .put(protect, teacher, updateAssignment)
  .delete(protect, teacher, deleteAssignment);

// Assignment submissions
router.route('/:id/submissions')
  .get(protect, teacher, getAssignmentSubmissions);

module.exports = router; 