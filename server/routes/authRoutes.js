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
const {
  resetPasswordWithToken,
  validateResetToken
} = require('../controllers/passwordResetController');
const { protect, admin } = require('../middleware/authMiddleware');
const { authRateLimit } = require('../middleware/rateLimitMiddleware');
const jwt = require('jsonwebtoken');
const { Student, Teacher, Admin } = require('../models');
const { verifyClerkToken, mapClerkUserToLocal } = require('../utils/clerk');

// Password reset routes (public)
router.post('/reset-password', authRateLimit, resetPasswordWithToken);
router.get('/validate-reset-token/:token', validateResetToken);

// Password reset routes (public)
router.post('/reset-password', authRateLimit, resetPasswordWithToken);
router.get('/validate-reset-token/:token', validateResetToken);

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
      return res.json({ ok: true, user: admin.username, match, hashPrefix: admin.password?.substring(0, 10) });
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
  let resolvedRole = null;
  let authSource = 'none';

  console.log('--- /auth/status called ---');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
    console.log('Token received (length):', token.length);
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('JWT verified successfully. Role:', decoded.role, 'ID:', decoded.id);
      resolvedRole = decoded.role || resolvedRole;
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
        console.log('User not found by role, trying all tables...');
        user = await Student.findOne({ where: { id: decoded.id }, attributes: { exclude: ['password'] } }) ||
          await Teacher.findOne({ where: { id: decoded.id }, attributes: { exclude: ['password'] } }) ||
          await Admin.findOne({ where: { username: decoded.id }, attributes: { exclude: ['password'] } });
      }
      if (user) {
        console.log('User found in DB:', user.id || user.username);
        authSource = 'jwt';
      } else {
        console.log('User NOT found in DB despite valid JWT');
      }
    } catch (e) {
      console.log('JWT verification failed:', e.message);
      // Invalid token -> fall through to Clerk verification
    }
  } else {
    console.log('No Bearer token in header');
  }

  // Clerk fallback when JWT verification fails or user not found
  if (!user && token) {
    console.log('Attempting Clerk verification...');
    try {
      const clerkUser = await verifyClerkToken(token);
      if (clerkUser) {
        console.log('Clerk token verified');
        const mapped = await mapClerkUserToLocal(clerkUser, { Student, Teacher, Admin });
        if (mapped?.user) {
          console.log('Clerk user mapped to local DB user');
          user = mapped.user;
          resolvedRole = mapped.role || resolvedRole || user.role || null;
          authSource = 'clerk';
        } else {
          console.log('Clerk user valid but NOT mapped to local DB');
        }
      } else {
        console.log('Clerk verification returned null');
      }
    } catch (clerkErr) {
      console.log('Clerk verification error:', clerkErr.message);
      // Ignore Clerk verification errors for status endpoint diagnostics
    }
  }

  if (!user) {
    console.log('Final verdict: Unauthenticated');
    return res.json({
      status: 'unauthenticated',
      authenticated: false,
      timestamp: Date.now()
    });
  }

  const userId = user.id || user.username;
  const role = user.role || resolvedRole || decoded?.role || null;

  console.log('Final verdict: Authenticated as', role, userId);
  res.json({
    status: 'ok',
    authenticated: true,
    user: {
      id: userId,
      role,
      name: user.name || user.username
    },
    authSource,
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

// Clear session endpoint (no auth required for troubleshooting)
router.post('/clear-session', (req, res) => {
  // This endpoint helps clear any stale browser/session data
  // It doesn't need authentication since it's just clearing client-side state
  res.json({
    success: true,
    message: 'Session cleared',
    timestamp: Date.now()
  });
});

// Email/Password Authentication Routes
router.post('/signin', authRateLimit, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    let user;
    let Model;

    // Determine which model to use based on role
    switch (role) {
      case 'student':
        Model = Student;
        break;
      case 'teacher':
        Model = Teacher;
        break;
      case 'admin':
        Model = Admin;
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    // Find user by email
    user = await Model.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: role
      }
    });

  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ message: 'Server error during sign in' });
  }
});

router.post('/signup', authRateLimit, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let Model;

    // Determine which model to use based on role
    switch (role) {
      case 'student':
        Model = Student;
        break;
      case 'teacher':
        Model = Teacher;
        break;
      case 'admin':
        Model = Admin;
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await Model.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userData = {
      email,
      password: hashedPassword,
      name
    };

    // Add role-specific fields
    if (role === 'admin') {
      userData.username = email; // For admin, use email as username
    }

    const user = await Model.create(userData);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: role
      },
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({ message: 'Server error during sign up' });
  }
});

module.exports = router; 