const asyncHandler = require('express-async-handler');
const { Student, Teacher, RedemptionHistory } = require('../models');
const { Op } = require('sequelize');

async function loadEthers() {
  try {
    const mod = await import('ethers');
    return mod.ethers ?? mod;
  } catch {
    return require('ethers');
  }
}

// Token ABI for balance checking and burning
const tokenAbi = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function burn(uint256 amount) external',
  'function burnFrom(address account, uint256 amount) external'
];

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

// Check if web3 is properly configured
function isWeb3Available() {
  try {
    requireEnv('CHAIN_RPC_URL');
    requireEnv('TOKEN_ADDRESS');
    return true;
  } catch {
    return false;
  }
}

// Merchandise and discount catalog
const MERCHANDISE_CATALOG = [
  // College Merchandise
  {
    id: 'college-tshirt',
    name: 'Official College T-Shirt',
    description: 'Premium quality cotton t-shirt with college logo',
    category: 'apparel',
    originalPrice: 25, // USD
    discountPrice: 15, // USD after token discount
    tokenCost: 50, // EVLT tokens required
    image: '/merchandise/college-tshirt.jpg',
    available: true,
    maxRedemptions: 100
  },
  {
    id: 'college-hoodie',
    name: 'College Hoodie',
    description: 'Warm hoodie perfect for campus life',
    category: 'apparel',
    originalPrice: 45,
    discountPrice: 30,
    tokenCost: 75,
    image: '/merchandise/college-hoodie.jpg',
    available: true,
    maxRedemptions: 50
  },
  {
    id: 'laptop-stickers',
    name: 'College Laptop Sticker Pack',
    description: 'Set of 5 premium vinyl stickers',
    category: 'accessories',
    originalPrice: 10,
    discountPrice: 5,
    tokenCost: 25,
    image: '/merchandise/laptop-stickers.jpg',
    available: true,
    maxRedemptions: 200
  },
  {
    id: 'water-bottle',
    name: 'Insulated Water Bottle',
    description: 'Keeps drinks cold for 24hrs, hot for 12hrs',
    category: 'accessories',
    originalPrice: 20,
    discountPrice: 12,
    tokenCost: 40,
    image: '/merchandise/water-bottle.jpg',
    available: true,
    maxRedemptions: 75
  },
  {
    id: 'notebook-set',
    name: 'Premium Notebook Set',
    description: 'Set of 3 college-branded notebooks',
    category: 'stationery',
    originalPrice: 15,
    discountPrice: 8,
    tokenCost: 35,
    image: '/merchandise/notebook-set.jpg',
    available: true,
    maxRedemptions: 150
  },
  
  // Official Services
  {
    id: 'transcript-expedite',
    name: 'Express Transcript Service',
    description: 'Get your official transcript in 24 hours instead of 7 days',
    category: 'services',
    originalPrice: 30,
    discountPrice: 15,
    tokenCost: 60,
    image: '/services/transcript-express.jpg',
    available: true,
    maxRedemptions: null // Unlimited
  },
  {
    id: 'parking-pass',
    name: 'Monthly Parking Pass',
    description: 'One month premium parking pass',
    category: 'services',
    originalPrice: 50,
    discountPrice: 30,
    tokenCost: 80,
    image: '/services/parking-pass.jpg',
    available: true,
    maxRedemptions: 20
  },
  {
    id: 'library-late-fee',
    name: 'Library Late Fee Waiver',
    description: 'Waive up to $25 in library late fees',
    category: 'services',
    originalPrice: 25,
    discountPrice: 0, // Free with tokens
    tokenCost: 45,
    image: '/services/library-waiver.jpg',
    available: true,
    maxRedemptions: null
  },
  {
    id: 'graduation-priority',
    name: 'Priority Graduation Seating',
    description: 'Reserve premium seating for 2 guests at graduation',
    category: 'services',
    originalPrice: 40,
    discountPrice: 20,
    tokenCost: 100,
    image: '/services/graduation-seating.jpg',
    available: true,
    maxRedemptions: 50
  },
  
  // Study Resources
  {
    id: 'exam-prep-bundle',
    name: 'Digital Exam Prep Bundle',
    description: 'Access to premium study materials and practice tests',
    category: 'academic',
    originalPrice: 35,
    discountPrice: 20,
    tokenCost: 70,
    image: '/academic/exam-prep.jpg',
    available: true,
    maxRedemptions: null
  },
  {
    id: 'tutoring-session',
    name: 'One-on-One Tutoring Session',
    description: '2-hour session with certified tutor',
    category: 'academic',
    originalPrice: 60,
    discountPrice: 35,
    tokenCost: 120,
    image: '/academic/tutoring.jpg',
    available: true,
    maxRedemptions: 30
  },
  
  // Event Access
  {
    id: 'tech-conference',
    name: 'Annual Tech Conference Ticket',
    description: 'VIP access to college tech conference',
    category: 'events',
    originalPrice: 75,
    discountPrice: 45,
    tokenCost: 150,
    image: '/events/tech-conference.jpg',
    available: true,
    maxRedemptions: 25
  },
  {
    id: 'career-fair-premium',
    name: 'Premium Career Fair Access',
    description: 'Early access and premium company meetings',
    category: 'events',
    originalPrice: 25,
    discountPrice: 10,
    tokenCost: 55,
    image: '/events/career-fair.jpg',
    available: true,
    maxRedemptions: 40
  }
];

// Get merchandise catalog
exports.getMerchandiseCatalog = asyncHandler(async (req, res) => {
  const { category, available } = req.query;
  
  let catalog = [...MERCHANDISE_CATALOG];
  
  // Filter by category if specified
  if (category) {
    catalog = catalog.filter(item => item.category === category);
  }
  
  // Filter by availability if specified
  if (available !== undefined) {
    const isAvailable = available === 'true';
    catalog = catalog.filter(item => item.available === isAvailable);
  }
  
  // Get redemption counts for each item
  const catalogWithCounts = await Promise.all(
    catalog.map(async (item) => {
      if (item.maxRedemptions) {
        const redemptionCount = await RedemptionHistory.count({
          where: { itemId: item.id, status: 'completed' }
        });
        return {
          ...item,
          redemptionCount,
          remainingStock: item.maxRedemptions - redemptionCount,
          inStock: redemptionCount < item.maxRedemptions
        };
      }
      return { ...item, inStock: true, remainingStock: null };
    })
  );
  
  res.json({
    catalog: catalogWithCounts,
    categories: ['apparel', 'accessories', 'stationery', 'services', 'academic', 'events']
  });
});

// Get user's token balance and redemption history
exports.getRedemptionProfile = asyncHandler(async (req, res) => {
  if (!isWeb3Available()) {
    return res.status(503).json({ message: 'Web3 not configured' });
  }
  
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Get user data
  let user = null;
  if (userRole === 'student') {
    user = await Student.findByPk(userId);
  } else if (userRole === 'teacher') {
    user = await Teacher.findByPk(userId);
  }
  
  if (!user || !user.walletAddress) {
    return res.status(400).json({ message: 'Please link your wallet first' });
  }
  
  // Get token balance
  let tokenBalance = '0';
  let balanceFormatted = '0';
  try {
    const ethers = await loadEthers();
    const checksummedAddress = ethers.getAddress(user.walletAddress.toLowerCase());
    const provider = new (ethers.JsonRpcProvider || ethers.providers.JsonRpcProvider)(requireEnv('CHAIN_RPC_URL'));
    const token = new ethers.Contract(requireEnv('TOKEN_ADDRESS'), tokenAbi, provider);
    const [bal, dec] = await Promise.all([token.balanceOf(checksummedAddress), token.decimals()]);
    
    tokenBalance = bal.toString();
    balanceFormatted = ethers.formatUnits(bal, dec);
  } catch (e) {
    console.error('Error fetching token balance:', e);
  }
  
  // Get redemption history
  const redemptionHistory = await RedemptionHistory.findAll({
    where: { userId, userRole },
    order: [['createdAt', 'DESC']],
    limit: 50
  });
  
  // Calculate total tokens spent
  const totalTokensSpent = redemptionHistory
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + parseFloat(r.tokenAmount), 0);
  
  res.json({
    user: {
      id: user.id,
      name: user.name,
      walletAddress: user.walletAddress
    },
    tokenBalance: tokenBalance,
    balanceFormatted: balanceFormatted,
    totalTokensSpent,
    redemptionHistory: redemptionHistory.map(r => ({
      id: r.id,
      itemId: r.itemId,
      itemName: r.itemName,
      tokenAmount: r.tokenAmount,
      discountAmount: r.discountAmount,
      status: r.status,
      redemptionCode: r.redemptionCode,
      createdAt: r.createdAt
    }))
  });
});

// Redeem tokens for merchandise/discount
exports.redeemTokens = asyncHandler(async (req, res) => {
  if (!isWeb3Available()) {
    return res.status(503).json({ message: 'Web3 not configured' });
  }
  
  const { itemId, quantity = 1 } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  if (!itemId) {
    return res.status(400).json({ message: 'Item ID is required' });
  }
  
  // Find the item in catalog
  const item = MERCHANDISE_CATALOG.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ message: 'Item not found' });
  }
  
  if (!item.available) {
    return res.status(400).json({ message: 'Item is currently unavailable' });
  }
  
  // Check stock if limited
  if (item.maxRedemptions) {
    const redemptionCount = await RedemptionHistory.count({
      where: { itemId: item.id, status: 'completed' }
    });
    
    if (redemptionCount + quantity > item.maxRedemptions) {
      return res.status(400).json({ 
        message: 'Insufficient stock', 
        available: item.maxRedemptions - redemptionCount 
      });
    }
  }
  
  // Get user data
  let user = null;
  if (userRole === 'student') {
    user = await Student.findByPk(userId);
  } else if (userRole === 'teacher') {
    user = await Teacher.findByPk(userId);
  }
  
  if (!user || !user.walletAddress) {
    return res.status(400).json({ message: 'Please link your wallet first' });
  }
  
  // Check token balance
  const totalTokenCost = item.tokenCost * quantity;
  const ethers = await loadEthers();
  const checksummedAddress = ethers.getAddress(user.walletAddress.toLowerCase());
  const provider = new (ethers.JsonRpcProvider || ethers.providers.JsonRpcProvider)(requireEnv('CHAIN_RPC_URL'));
  const token = new ethers.Contract(requireEnv('TOKEN_ADDRESS'), tokenAbi, provider);
  
  const balance = await token.balanceOf(checksummedAddress);
  const decimals = await token.decimals();
  const requiredBalance = ethers.parseUnits(totalTokenCost.toString(), decimals);
  
  if (balance < requiredBalance) {
    const currentBalance = ethers.formatUnits(balance, decimals);
    return res.status(400).json({ 
      message: 'Insufficient token balance',
      required: totalTokenCost.toString(),
      current: currentBalance
    });
  }
  
  // Generate redemption code
  const redemptionCode = `EVLT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  // Calculate discount
  const originalTotal = item.originalPrice * quantity;
  const discountedTotal = item.discountPrice * quantity;
  const discountAmount = originalTotal - discountedTotal;
  
  try {
    // For this demo, we'll create the redemption record without actually burning tokens
    // In production, you would burn tokens from the user's wallet here
    
    // Create redemption record
    const redemption = await RedemptionHistory.create({
      userId,
      userRole,
      itemId: item.id,
      itemName: item.name,
      tokenAmount: totalTokenCost.toString(),
      originalPrice: originalTotal,
      discountPrice: discountedTotal,
      discountAmount,
      quantity,
      redemptionCode,
      status: 'completed', // In production: 'pending' until tokens are burned
      metadata: {
        walletAddress: user.walletAddress,
        itemCategory: item.category,
        redemptionDate: new Date().toISOString()
      }
    });
    
    res.json({
      message: 'Redemption successful!',
      redemption: {
        id: redemption.id,
        redemptionCode,
        item: {
          name: item.name,
          description: item.description,
          category: item.category
        },
        pricing: {
          originalPrice: originalTotal,
          discountPrice: discountedTotal,
          savings: discountAmount,
          tokensSpent: totalTokenCost
        },
        quantity,
        instructions: getRedemptionInstructions(item, redemptionCode)
      }
    });
    
  } catch (error) {
    console.error('Redemption error:', error);
    res.status(500).json({ message: 'Redemption failed: ' + error.message });
  }
});

// Get redemption instructions based on item type
function getRedemptionInstructions(item, redemptionCode) {
  const baseInstructions = `Your redemption code is: ${redemptionCode}`;
  
  switch (item.category) {
    case 'apparel':
    case 'accessories':
    case 'stationery':
      return `${baseInstructions}\n\nVisit the college bookstore with this code to claim your ${item.name}. Valid for 30 days.`;
    
    case 'services':
      return `${baseInstructions}\n\nContact the relevant office with this code to redeem your ${item.name}. Processing may take 1-2 business days.`;
    
    case 'academic':
      return `${baseInstructions}\n\nCheck your student portal for access to ${item.name}. Digital resources will be activated within 24 hours.`;
    
    case 'events':
      return `${baseInstructions}\n\nYour ${item.name} has been reserved. You'll receive confirmation details via email within 24 hours.`;
    
    default:
      return `${baseInstructions}\n\nContact student services for redemption details.`;
  }
}

// Admin: Get all redemptions
exports.getAllRedemptions = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  const { status, category, dateFrom, dateTo, limit = 100 } = req.query;
  
  const where = {};
  if (status) where.status = status;
  if (category) where.itemCategory = category;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
    if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
  }
  
  const redemptions = await RedemptionHistory.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit)
  });
  
  // Calculate summary statistics
  const stats = {
    totalRedemptions: redemptions.length,
    totalTokensRedeemed: redemptions
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + parseFloat(r.tokenAmount), 0),
    totalSavingsProvided: redemptions
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.discountAmount, 0),
    byCategory: {}
  };
  
  // Group by category
  redemptions.forEach(r => {
    const category = r.metadata?.itemCategory || 'unknown';
    if (!stats.byCategory[category]) {
      stats.byCategory[category] = { count: 0, tokens: 0, savings: 0 };
    }
    stats.byCategory[category].count++;
    if (r.status === 'completed') {
      stats.byCategory[category].tokens += parseFloat(r.tokenAmount);
      stats.byCategory[category].savings += r.discountAmount;
    }
  });
  
  res.json({
    redemptions,
    stats
  });
});

module.exports = {
  getMerchandiseCatalog: exports.getMerchandiseCatalog,
  getRedemptionProfile: exports.getRedemptionProfile,
  redeemTokens: exports.redeemTokens,
  getAllRedemptions: exports.getAllRedemptions
};
