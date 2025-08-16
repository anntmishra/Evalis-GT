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
  syncFirebasePassword,
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');
const { authRateLimit } = require('../middleware/rateLimitMiddleware');
const jwt = require('jsonwebtoken');
const { Student, Teacher, Admin } = require('../models');

// Auth routes with rate limiting
router.post('/student/login', authRateLimit, authStudent);
router.post('/teacher/login', authRateLimit, authTeacher);
router.post('/teacher/setup-password', authRateLimit, setupTeacherPassword);
router.post('/admin/login', authRateLimit, authAdmin);
// Development-only admin credential debug (does not issue token)
if (process.env.NODE_ENV !== 'production') {
  const { Admin } = require('../models');
  const bcrypt = require('bcryptjs');
  router.post('/admin/debug-check', async (req, res) => {
    try {
      const { username, password } = req.body;
      const admin = await Admin.findOne({ where: { username } });
      if (!admin) return res.status(404).json({ ok: false, reason: 'not_found' });
      const match = await bcrypt.compare(password || '', admin.password || '');
      return res.json({ ok: true, user: admin.username, match, hashPrefix: admin.password?.substring(0,10) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  });
}
// Lightweight status endpoint for token validation / keep-alive (always 200 to avoid console noise)
router.get('/status', async (req, res) => {
  const authHeader = req.headers.authorization;
  let token = null;
  let decoded = null;
  let user = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Try role-based lookup first
      if (decoded.role === 'student') {
        user = await Student.findOne({ where: { id: decoded.id }, attributes: { exclude: ['password'] } });
      } else if (decoded.role === 'teacher') {
        user = await Teacher.findOne({ where: { id: decoded.id }, attributes: { exclude: ['password'] } });
      } else if (decoded.role === 'admin') {
        user = await Admin.findOne({ where: { username: decoded.id }, attributes: { exclude: ['password'] } });
      }
      // Fallback brute force if role missing
      if (!user) {
        user = await Student.findOne({ where: { id: decoded.id }, attributes: { exclude: ['password'] } }) ||
               await Teacher.findOne({ where: { id: decoded.id }, attributes: { exclude: ['password'] } }) ||
               await Admin.findOne({ where: { username: decoded.id }, attributes: { exclude: ['password'] } });
      }
    } catch (e) {
      // Invalid token -> treat as unauthenticated, do not 401
    }
  }

  if (!user) {
    return res.json({
      status: 'unauthenticated',
      authenticated: false,
      timestamp: Date.now()
    });
  }

  res.json({
    status: 'ok',
    authenticated: true,
    user: {
      id: user.id || user.username,
      role: user.role,
      name: user.name || user.username
    },
    timestamp: Date.now()
  });
});
router.get('/profile', protect, getUserProfile);
router.post('/student/reset-password', protect, resetStudentPassword);
router.post('/bulk-password-reset', protect, admin, bulkPasswordReset);

// Password sync route for Firebase password resets
router.post('/sync-firebase-password', authRateLimit, syncFirebasePassword);

// Logout routes
router.post('/logout', protect, logoutUser);
router.post('/logout-all', protect, logoutAllSessions);

module.exports = router; 