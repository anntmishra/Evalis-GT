const express = require('express');
const router = express.Router();
const { getPrograms, createProgram, updateProgram, deleteProgram } = require('../controllers/programController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getPrograms)
  .post(protect, requireRole('master_admin'), createProgram);

router.route('/:id')
  .put(protect, requireRole('master_admin'), updateProgram)
  .delete(protect, requireRole('master_admin'), deleteProgram);

module.exports = router;
