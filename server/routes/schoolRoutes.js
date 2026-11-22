const express = require('express');
const router = express.Router();
const { getSchools, createSchool, deleteSchool } = require('../controllers/schoolController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSchools)
  .post(protect, requireRole(['coe']), createSchool);

router.route('/:id')
  .delete(protect, requireRole(['coe']), deleteSchool);

module.exports = router;
