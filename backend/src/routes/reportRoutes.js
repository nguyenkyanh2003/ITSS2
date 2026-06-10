const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const {
  createReport,
  getMyReports,
  getAllReports,
  updateReportStatus,
} = require('../controllers/report.controller');

router.use(protect);

router.post('/', createReport);
router.get('/me', getMyReports);

// Admin only
router.get('/', restrictTo('admin'), getAllReports);
router.patch('/:id/status', restrictTo('admin'), updateReportStatus);

module.exports = router;
