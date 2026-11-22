const express = require('express');
const router = express.Router();
const {
  proposeHandout,
  getPendingHandouts,
  voteHandout
} = require('../controllers/handoutController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.post('/', protect, requireRole(['hod']), proposeHandout);
router.get('/pending', protect, requireRole(['hod', 'dean', 'assistant_dean']), getPendingHandouts);
router.post('/:id/vote', protect, requireRole(['hod']), voteHandout);

module.exports = router;
