const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getMerchandiseCatalog,
  getRedemptionProfile,
  redeemTokens,
  getAllRedemptions
} = require('../web3/merchandiseController');

// @desc    Get merchandise catalog
// @route   GET /api/merchandise/catalog
// @access  Public (but token balance info requires auth)
router.get('/catalog', getMerchandiseCatalog);

// @desc    Get user's redemption profile (balance + history)
// @route   GET /api/merchandise/profile
// @access  Private
router.get('/profile', protect, getRedemptionProfile);

// @desc    Redeem tokens for merchandise/discount
// @route   POST /api/merchandise/redeem
// @access  Private
router.post('/redeem', protect, redeemTokens);

// @desc    Get all redemptions (admin only)
// @route   GET /api/merchandise/admin/redemptions
// @access  Private/Admin
router.get('/admin/redemptions', protect, getAllRedemptions);

module.exports = router;
