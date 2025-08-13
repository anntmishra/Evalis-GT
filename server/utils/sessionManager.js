const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

// Session store to track active sessions and prevent conflicts
class SessionManager {
  constructor() {
    this.activeSessions = new Map(); // userId -> { sessionId, role, lastActivity, loginTime }
    this.sessionTokens = new Map(); // token -> { userId, role, sessionId }
    
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  // Generate a unique session ID
  generateSessionId() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  // Create a new session for a user
  createSession(userId, role, deviceInfo = {}) {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    
    // Check if user already has an active session
    const existingSession = this.activeSessions.get(userId);
    if (existingSession) {
      logger.info(`User ${userId} already has an active session, invalidating previous session`);
      // Invalidate the previous session token
      for (const [token, tokenData] of this.sessionTokens.entries()) {
        if (tokenData.userId === userId) {
          this.sessionTokens.delete(token);
        }
      }
    }

    // Create new session
    const sessionData = {
      sessionId,
      role,
      lastActivity: now,
      loginTime: now,
      deviceInfo,
      isActive: true
    };

    this.activeSessions.set(userId, sessionData);
    
    logger.info(`Created new session for user ${userId} with role ${role}`);
    return sessionId;
  }

  // Register a token with a session
  registerToken(token, userId, role, sessionId) {
    this.sessionTokens.set(token, { userId, role, sessionId });
  }

  // Check if a session is valid
  isValidSession(userId, sessionId) {
    const session = this.activeSessions.get(userId);
    return session && session.sessionId === sessionId && session.isActive;
  }

  // Update session activity
  updateActivity(userId) {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  // Invalidate a session
  invalidateSession(userId) {
    const session = this.activeSessions.get(userId);
    if (session) {
      // Remove all tokens for this user
      for (const [token, tokenData] of this.sessionTokens.entries()) {
        if (tokenData.userId === userId) {
          this.sessionTokens.delete(token);
        }
      }
      
      this.activeSessions.delete(userId);
      logger.info(`Invalidated session for user ${userId}`);
      return true;
    }
    return false;
  }

  // Invalidate a specific token
  invalidateToken(token) {
    const tokenData = this.sessionTokens.get(token);
    if (tokenData) {
      this.sessionTokens.delete(token);
      logger.info(`Invalidated token for user ${tokenData.userId}`);
      return true;
    }
    return false;
  }

  // Check if token is valid
  isValidToken(token) {
    return this.sessionTokens.has(token);
  }

  // Get session info for a token
  getSessionInfo(token) {
    return this.sessionTokens.get(token);
  }

  // Clean up expired sessions (inactive for more than 24 hours)
  cleanupExpiredSessions() {
    const now = Date.now();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours

    for (const [userId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > expirationTime) {
        this.invalidateSession(userId);
        logger.info(`Cleaned up expired session for user ${userId}`);
      }
    }
  }

  // Get all active sessions (for admin monitoring)
  getActiveSessions() {
    const sessions = {};
    for (const [userId, session] of this.activeSessions.entries()) {
      sessions[userId] = {
        role: session.role,
        loginTime: new Date(session.loginTime).toISOString(),
        lastActivity: new Date(session.lastActivity).toISOString(),
        deviceInfo: session.deviceInfo
      };
    }
    return sessions;
  }

  // Get session statistics
  getSessionStats() {
    const now = Date.now();
    const stats = {
      totalActiveSessions: this.activeSessions.size,
      totalActiveTokens: this.sessionTokens.size,
      sessionsByRole: {},
      recentActivity: 0 // Sessions active in last hour
    };

    for (const [userId, session] of this.activeSessions.entries()) {
      // Count by role
      if (!stats.sessionsByRole[session.role]) {
        stats.sessionsByRole[session.role] = 0;
      }
      stats.sessionsByRole[session.role]++;

      // Count recent activity (last hour)
      if (now - session.lastActivity < 60 * 60 * 1000) {
        stats.recentActivity++;
      }
    }

    return stats;
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Enhanced token generation with session management
const generateTokenWithSession = (user, role) => {
  const userId = user.id || user.username; // Handle both regular users and admin
  const deviceInfo = {
    userAgent: 'server-generated', // This would come from request headers in real implementation
    ip: 'server-generated'
  };

  // Create session
  const sessionId = sessionManager.createSession(userId, role, deviceInfo);

  // Generate JWT token with session ID
  const payload = {
    id: userId,
    role: role,
    sessionId: sessionId,
    iat: Math.floor(Date.now() / 1000)
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h',
  });

  // Register token with session
  sessionManager.registerToken(token, userId, role, sessionId);

  return { token, sessionId };
};

// Middleware to validate session along with token
const validateSession = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session is valid
    if (!sessionManager.isValidSession(decoded.id, decoded.sessionId)) {
      logger.warn(`Invalid session for user ${decoded.id}, token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ 
        message: 'Session expired or invalid. Please login again.',
        code: 'SESSION_INVALID'
      });
    }

    // Check if token is still registered
    if (!sessionManager.isValidToken(token)) {
      logger.warn(`Token not registered for user ${decoded.id}`);
      return res.status(401).json({ 
        message: 'Token is no longer valid. Please login again.',
        code: 'TOKEN_INVALID'
      });
    }

    // Update session activity
    sessionManager.updateActivity(decoded.id);
    
    next();
  } catch (error) {
    next();
  }
};

// Logout function to invalidate session
const logout = (userId, token = null) => {
  if (token) {
    sessionManager.invalidateToken(token);
  } else {
    sessionManager.invalidateSession(userId);
  }
};

module.exports = {
  sessionManager,
  generateTokenWithSession,
  validateSession,
  logout
};
