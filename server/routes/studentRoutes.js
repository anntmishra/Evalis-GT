const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentSubmissions,
  importStudents,
  importStudentsFromExcel,
} = require('../controllers/studentController');
const { protect, admin, teacher } = require('../middleware/authMiddleware');

// Student routes
router.route('/')
  .get(protect, admin, getStudents)
  .post(protect, admin, createStudent);

router.route('/import')
  .post(protect, admin, importStudents);

router.route('/import-excel')
  .post(protect, admin, importStudentsFromExcel);

router.route('/:id')
  .get(protect, getStudentById)
  .put(protect, admin, updateStudent)
  .delete(protect, admin, deleteStudent);

router.route('/:id/submissions')
  .get(protect, getStudentSubmissions);

module.exports = router; 