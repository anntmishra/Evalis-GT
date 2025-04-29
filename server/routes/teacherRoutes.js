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
  importTeachersFromExcel,
  getStudentsByTeacher,
  getTeacherSubjects,
  createTestTeacher,
  getAccessibleStudents,
  getAccessibleBatches,
  getTeacherDashboard
} = require('../controllers/teacherController');
const { protect, admin, teacher } = require('../middleware/authMiddleware');

// Teacher routes
router.route('/')
  .get(protect, admin, getTeachers)
  .post(protect, admin, createTeacher);

// Development test account route
router.route('/create-test-account')
  .post(createTestTeacher);

router.route('/subjects')
  .get(protect, teacher, getTeacherSubjects);

// New dashboard route
router.route('/dashboard')
  .get(protect, teacher, getTeacherDashboard);

// New accessible students route
router.route('/students')
  .get(protect, teacher, getAccessibleStudents);

// New accessible batches route
router.route('/batches')
  .get(protect, teacher, getAccessibleBatches);

router.route('/:id')
  .get(protect, admin, getTeacherById)
  .put(protect, admin, updateTeacher)
  .delete(protect, admin, deleteTeacher);

router.route('/:id/subjects')
  .post(protect, admin, assignSubject);

router.route('/:id/subjects/:subjectId')
  .delete(protect, admin, removeSubject);

// New route to get students by teacher
router.route('/:id/students')
  .get(protect, teacher, getStudentsByTeacher);

// Route for Excel import
router.route('/import')
  .post(protect, admin, importTeachersFromExcel);

module.exports = router; 