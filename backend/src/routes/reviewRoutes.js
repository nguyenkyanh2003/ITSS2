const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/seller/:sellerId', reviewController.getReviewsBySeller);
router.get('/product/:productId', reviewController.getReviewsByProduct);
router.get('/me', protect, reviewController.getMyReviews);
router.post('/', protect, reviewController.createReview);

module.exports = router;
