const express = require('express');
const router = express.Router();
const { calculateSGPA } = require('../controllers/gradeController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.post('/calculate-sgpa', protect, requireRole(['programme_coordinator', 'hod', 'dean', 'assistant_dean']), calculateSGPA);

module.exports = router;
