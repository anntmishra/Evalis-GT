const express = require('express');
const router = express.Router();
const { 
  getAllAssignments,
  assignTeacher,
  getMyAssignments,
  revokeAssignment
} = require('../controllers/teachingAssignmentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getAllAssignments)
  .post(protect, assignTeacher);

router.route('/me')
  .get(protect, getMyAssignments);

router.route('/:id')
  .delete(protect, revokeAssignment);

module.exports = router;
