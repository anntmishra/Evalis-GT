const router = require('express').Router();
const { protect, teacher, requireRole } = require('../middleware/authMiddleware');
const controller = require('../controllers/questionPaperController');

router.use(protect);
router.get('/mine', teacher, controller.myPapers);
router.get('/approvals', requireRole(['hod', 'dean', 'assistant_dean', 'coe']), controller.approvalQueue);
router.post('/', teacher, controller.createPaper);
router.post('/:id/decision', requireRole(['hod', 'dean', 'assistant_dean', 'coe']), controller.decidePaper);
router.get('/:id', teacher, controller.getPaper);
router.put('/:id', teacher, controller.updatePaper);

module.exports = router;
