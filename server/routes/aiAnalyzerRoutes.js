const express = require('express');
const { getComprehensiveStudentData } = require('../controllers/aiAnalyzerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/ai-analyzer/comprehensive-data/:studentId
// @desc    Get comprehensive student data for AI analysis
// @access  Private
router.get('/comprehensive-data/:studentId', protect, getComprehensiveStudentData);

// @route   GET /api/ai-analyzer/health
// @desc    Health check for AI analyzer service
// @access  Public
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'ai-analyzer-api',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
