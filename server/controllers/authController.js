const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const { Student, Teacher, Admin, Subject, Batch } = require('../models');
const { generateTokenWithSession, logout } = require('../utils/sessionManager');
const { logger } = require('../utils/logger');

/**
 * @desc    Auth student & get token
 * @route   POST /api/auth/student/login
 * @access  Public
 */
const authStudent = asyncHandler(async (req, res) => {
  const { id, password } = req.body;

  logger.info(`Student login attempt for ID: ${id}`);

  // Check for student
  const student = await Student.findOne({ where: { id } });

  if (student && (await student.matchPassword(password))) {
    const { token, sessionId } = generateTokenWithSession(student, 'student');
    
    logger.info(`Student login successful: ${student.id}`);
    
    res.json({
      id: student.id,
      name: student.name,
      section: student.section,
      batch: student.batch,
      email: student.email,
      role: 'student',
      token: token,
      sessionId: sessionId,
    });
  } else {
    logger.warn(`Student login failed for ID: ${id}`);
    res.status(401);
    throw new Error('Invalid ID or password');
  }
});

/**
 * @desc    Auth teacher & get token
 * @route   POST /api/auth/teacher/login
 * @access  Public
 */
const authTeacher = asyncHandler(async (req, res) => {
  const { email, password, id } = req.body;
  
  logger.info(`Teacher login attempt with email: ${email}, ID: ${id}`);
  
  if ((!email && !id) || !password) {
    logger.warn('Teacher login rejected: Missing email/ID or password');
    res.status(400);
    throw new Error('Please provide email/ID and password');
  }

  try {
    // Check for teacher by email (primary login method) or ID (secondary method)
    const whereClause = email ? { email } : { id };
    logger.debug(`Searching for teacher with:`, whereClause);
    
    const teacher = await Teacher.findOne({ 
      where: whereClause,
      include: [{
        model: Subject,
        include: [{
          model: Batch
        }],
        through: { attributes: [] }
      }]
    });

    logger.debug(`Teacher found: ${teacher ? 'Yes' : 'No'}`);
    
    if (teacher) {
      logger.debug(`Teacher ID: ${teacher.id}, Name: ${teacher.name}, Email: ${teacher.email}`);
      const isMatch = await teacher.matchPassword(password);
      logger.debug(`Password match result: ${isMatch}`);
      
      if (isMatch) {
        // Generate token with session management
        const { token, sessionId } = generateTokenWithSession(teacher, 'teacher');
        logger.info(`Teacher authentication successful: ${teacher.id}`);
        
        // Extract batch IDs from subjects
        const batchIds = [...new Set(
          teacher.Subjects
            .map(subject => subject.batchId)
            .filter(id => id)
        )];
        
        res.json({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          subjects: teacher.Subjects || [],
          batchIds: batchIds,
          role: 'teacher',
          token: token,
          sessionId: sessionId,
        });
        return;
      } else {
        logger.warn(`Teacher password mismatch for ${email || id}`);
        res.status(401);
        throw new Error('Invalid password');
      }
    } else {
      console.log('Teacher not found');
      res.status(401);
      throw new Error('Teacher not found with the provided email/ID');
    }
  } catch (error) {
    console.error('Error in teacher authentication:', error);
    if (!res.statusCode || res.statusCode === 200) {
      res.status(500);
    }
    throw error;
  }
});

/**
 * @desc    Auth admin & get token
 * @route   POST /api/auth/admin/login
 * @access  Public
 */
const authAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  logger.info(`Admin login attempt for username: ${username}`);

  // Check for admin
  const admin = await Admin.findOne({ where: { username } });

  if (!admin) {
    logger.warn(`Admin login failed: No admin found with username ${username}`);
    res.status(401);
    throw new Error('Invalid username or password');
  }

  const isMatch = await admin.matchPassword(password);
  logger.debug(`Admin password match result: ${isMatch}`);

  if (admin && isMatch) {
    logger.info(`Admin login successful for: ${admin.username}`);
    const { token, sessionId } = generateTokenWithSession(admin, 'admin');
    
    res.json({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: 'admin',
      token: token,
      sessionId: sessionId,
    });
  } else {
    logger.warn(`Admin login failed: Invalid password for ${username}`);
    res.status(401);
    throw new Error('Invalid username or password');
  }
});

/**
 * @desc    Get user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = asyncHandler(async (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

/**
 * @desc    Initial password setup for teachers
 * @route   POST /api/auth/teacher/setup-password
 * @access  Public
 */
const setupTeacherPassword = asyncHandler(async (req, res) => {
  const { id, email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Please provide email, current password, and new password');
  }

  // Find teacher by email
  const teacher = await Teacher.findOne({ where: { email } });

  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found with this email');
  }

  // Verify current password
  if (!(await teacher.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  // Update password
  teacher.password = newPassword;
  await teacher.save();

  res.status(200).json({ 
    message: 'Password updated successfully',
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    role: 'teacher',
    token: generateToken(teacher.id, 'teacher'),
  });
});

/**
 * @desc    Reset student password
 * @route   POST /api/auth/student/reset-password
 * @access  Private (Admin only)
 */
const resetStudentPassword = asyncHandler(async (req, res) => {
  const { studentId, newPassword } = req.body;

  // Verify admin access
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to reset passwords');
  }

  // Find student by ID
  const student = await Student.findOne({ where: { id: studentId } });

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Check if student has an email
  if (!student.email) {
    res.status(400);
    throw new Error('Student does not have an email address set');
  }

  // Update password
  if (newPassword) {
    student.password = newPassword;
    await student.save();
    console.log(`Password reset for student ${studentId} by admin`);
    
    res.status(200).json({
      success: true,
      message: 'Student password has been reset'
    });
  } else {
    // If no new password is provided, we assume this is just checking if the student can have their password reset
    res.status(200).json({
      success: true,
      message: 'Student is eligible for password reset',
      email: student.email
    });
  }
});

/**
 * @desc    Handle bulk password reset emails
 * @route   POST /api/auth/bulk-password-reset
 * @access  Private/Admin
 */
const bulkPasswordReset = asyncHandler(async (req, res) => {
  const { emails } = req.body;

  // Verify admin access
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to perform bulk operations');
  }

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    res.status(400);
    throw new Error('Please provide an array of email addresses');
  }

  const results = {
    total: emails.length,
    success: 0,
    failed: 0,
    errors: []
  };

  // For each email, find the student and log that a password reset was requested
  for (const email of emails) {
    try {
      if (!email) {
        results.failed++;
        results.errors.push({ email: 'undefined', error: 'Email address is required' });
        continue;
      }

      const student = await Student.findOne({ where: { email } });
      
      if (!student) {
        results.failed++;
        results.errors.push({ email, error: 'Student not found with this email' });
        continue;
      }

      // In a production system, you would call your email service here
      // For now, we'll just log the request and count it as successful
      console.log(`Password reset email would be sent to ${email} for student ID ${student.id}`);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({ email, error: error.message });
    }
  }

  res.status(200).json({
    message: `Password reset emails processed: ${results.success} successful, ${results.failed} failed`,
    results
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutUser = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const userId = req.user.id || req.user.username;
  
  if (token) {
    logout(userId, token);
    logger.info(`User logged out: ${userId}`);
  }
  
  res.json({ message: 'Logged out successfully' });
});

/**
 * @desc    Logout all sessions for user
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
const logoutAllSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.username;
  
  logout(userId); // This will invalidate all sessions for the user
  logger.info(`All sessions logged out for user: ${userId}`);
  
  res.json({ message: 'All sessions logged out successfully' });
});

// Generate JWT (keeping for backward compatibility)
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

module.exports = {
  authStudent,
  authTeacher,
  authAdmin,
  getUserProfile,
  setupTeacherPassword,
  resetStudentPassword,
  bulkPasswordReset,
  logoutUser,
  logoutAllSessions,
}; 