const express = require('express');
const router = express.Router();
const {
  authStudent,
  authTeacher,
  authAdmin,
  getUserProfile,
  setupTeacherPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Auth routes
router.post('/student/login', authStudent);
router.post('/teacher/login', authTeacher);
router.post('/teacher/setup-password', setupTeacherPassword);
router.post('/admin/login', authAdmin);
router.get('/profile', protect, getUserProfile);

module.exports = router; 