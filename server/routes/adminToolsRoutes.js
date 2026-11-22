const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { protect, adminOrCoe } = require('../middleware/authMiddleware');
const { importAcademicWorkbook } = require('../controllers/bulkImportController');
const { sendAccountAccess } = require('../controllers/accountAccessController');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/logs', protect, (req, res) => {
  try {
    const logPath = path.join(__dirname, '../logs/combined.log');
    if (!fs.existsSync(logPath)) {
      return res.json([]);
    }
    
    // Read last 200 lines (simplified implementation)
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n').slice(-200);
    
    const parsedLogs = lines.map((line, index) => {
      try {
        const parsed = JSON.parse(line);
        return { id: index, ...parsed };
      } catch (e) {
        // Fallback for non-JSON logs
        return { id: index, message: line, level: 'info', timestamp: new Date().toISOString() };
      }
    }).reverse();
    
    res.json(parsedLogs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to read logs' });
  }
});

router.post('/import-academic', protect, adminOrCoe, upload.single('file'), importAcademicWorkbook);
router.post('/send-account-access', protect, adminOrCoe, sendAccountAccess);

module.exports = router;
