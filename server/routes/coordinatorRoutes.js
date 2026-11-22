const express = require('express');
const router = express.Router();
const {
  getMyStudents,
  getStudentDetail,
  updateStudent,
  getSectionGroups,
  createSectionGroup,
  getSpecializations
} = require('../controllers/coordinatorController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// requireRole always lets 'admin' through too, so Master Admin can use these as well.
router.use(protect, requireRole(['programme_coordinator']));

router.get('/students', getMyStudents);
router.get('/students/:id', getStudentDetail);
router.put('/students/:id', updateStudent);

router.get('/section-groups', getSectionGroups);
router.post('/section-groups', createSectionGroup);

router.get('/specializations', getSpecializations);

module.exports = router;
