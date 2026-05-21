const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/me', protect, transactionController.getMyTransactions);
router.patch('/:id/schedule', protect, transactionController.scheduleTransaction);
router.patch('/:id/complete', protect, transactionController.completeTransaction);
router.patch('/:id/cancel', protect, transactionController.cancelTransaction);

module.exports = router;
