const express = require('express');
const router = express.Router();
const { 
  getSections,
  createSection
} = require('../controllers/sectionController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSections)
  .post(protect, createSection);

module.exports = router;
