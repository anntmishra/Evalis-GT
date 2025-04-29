const express = require('express');
const router = express.Router();
const {
  authUser,
  getUserProfile,
  authStudent,
  authTeacher,
  authAdmin,
  setupTeacherPassword,
  resetStudentPassword,
  bulkPasswordReset,
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

// Auth routes
router.post('/student/login', authStudent);
router.post('/teacher/login', authTeacher);
router.post('/teacher/setup-password', setupTeacherPassword);
router.post('/admin/login', authAdmin);
router.get('/profile', protect, getUserProfile);
router.post('/student/reset-password', protect, resetStudentPassword);
router.post('/bulk-password-reset', protect, admin, bulkPasswordReset);

module.exports = router; 