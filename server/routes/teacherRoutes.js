const express = require('express');
const router = express.Router();
const {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignSubject,
  removeSubject,
} = require('../controllers/teacherController');
const { protect, admin } = require('../middleware/authMiddleware');

// Teacher routes
router.route('/')
  .get(protect, admin, getTeachers)
  .post(protect, admin, createTeacher);

router.route('/:id')
  .get(protect, admin, getTeacherById)
  .put(protect, admin, updateTeacher)
  .delete(protect, admin, deleteTeacher);

router.route('/:id/subjects')
  .post(protect, admin, assignSubject);

router.route('/:id/subjects/:subjectId')
  .delete(protect, admin, removeSubject);

module.exports = router; 