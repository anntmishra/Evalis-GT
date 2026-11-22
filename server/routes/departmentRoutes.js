const express = require('express');
const router = express.Router();
const { 
  getDepartments,
  createDepartment,
  createProgram
} = require('../controllers/departmentController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getDepartments)
  .post(protect, requireRole(['coe']), createDepartment);

router.route('/:id/programs')
  .post(protect, requireRole(['coe']), createProgram);

module.exports = router;
