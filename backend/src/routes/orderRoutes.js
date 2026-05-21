const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middlewares/auth.middleware');

router.get('/me', protect, orderController.getMyOrders);
router.get('/:id', protect, orderController.getOrderById);
router.post('/', protect, orderController.createOrder);
router.patch('/:id/schedule', protect, orderController.scheduleOrder);
router.patch('/:id/complete', protect, orderController.completeOrder);
router.patch('/:id/cancel', protect, orderController.cancelOrder);

module.exports = router;
