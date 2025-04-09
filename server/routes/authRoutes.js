const express = require('express');
const router = express.Router();
const {
  loginStudent,
  loginTeacher,
  loginAdmin,
  getUserProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Auth routes
router.post('/student/login', loginStudent);
router.post('/teacher/login', loginTeacher);
router.post('/admin/login', loginAdmin);
router.get('/profile', protect, getUserProfile);

module.exports = router; 