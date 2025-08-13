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
  logoutUser,
  logoutAllSessions,
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');
const { authRateLimit } = require('../middleware/rateLimitMiddleware');

// Auth routes with rate limiting
router.post('/student/login', authRateLimit, authStudent);
router.post('/teacher/login', authRateLimit, authTeacher);
router.post('/teacher/setup-password', authRateLimit, setupTeacherPassword);
router.post('/admin/login', authRateLimit, authAdmin);
router.get('/profile', protect, getUserProfile);
router.post('/student/reset-password', protect, resetStudentPassword);
router.post('/bulk-password-reset', protect, admin, bulkPasswordReset);

// Logout routes
router.post('/logout', protect, logoutUser);
router.post('/logout-all', protect, logoutAllSessions);

module.exports = router; 