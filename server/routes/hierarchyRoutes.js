const express = require('express');
const router = express.Router();
const { assignHod, assignCoordinator, getMyAssignments, assignDean, assignCoe } = require('../controllers/hierarchyController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.get('/me', protect, getMyAssignments);
router.post('/assign-hod', protect, requireRole(['coe', 'dean', 'assistant_dean']), assignHod);
router.post('/assign-coordinator', protect, requireRole(['hod', 'dean']), assignCoordinator);
// requireRole([]) means only the built-in 'admin' bypass passes -- admin/master-admin only
router.post('/assign-dean', protect, requireRole([]), assignDean);
router.post('/assign-coe', protect, requireRole([]), assignCoe);

module.exports = router;
