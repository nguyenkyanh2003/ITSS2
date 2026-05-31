const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { protect } = require('../middlewares/auth.middleware');
const { validateProposedTimeSlots } = require('../middlewares/order.middleware');

router.get('/me', protect, orderController.getMyOrders);
router.get('/:id', protect, orderController.getOrderById);
router.post('/', protect, orderController.createOrder);
router.patch('/:id/propose-times', protect, validateProposedTimeSlots, orderController.proposeTimes);
router.patch('/:id/confirm-time', protect, orderController.confirmTime);
router.patch('/:id/schedule', protect, orderController.scheduleOrder);
router.patch('/:id/complete', protect, orderController.completeOrder);
router.patch('/:id/cancel', protect, orderController.cancelOrder);
router.patch('/:id/status', protect, orderController.updateOrderStatus);

module.exports = router;
