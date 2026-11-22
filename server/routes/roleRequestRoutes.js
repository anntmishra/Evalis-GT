const express = require('express');
const router = express.Router();
const {
  proposeRole,
  getRequests,
  approveRequest,
  rejectRequest
} = require('../controllers/roleRequestController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.post('/', protect, requireRole('programme_coordinator'), proposeRole);
router.get('/', protect, requireRole(['dean', 'assistant_dean']), getRequests);
router.put('/:id/approve', protect, requireRole(['dean', 'assistant_dean']), approveRequest);
router.put('/:id/reject', protect, requireRole(['dean', 'assistant_dean']), rejectRequest);

module.exports = router;
