const mongoose = require('mongoose');
const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/user.model');

const normalizeReviewer = (reviewer) => {
  if (!reviewer) return null;
  if (typeof reviewer === 'object') {
    return {
      id: reviewer._id || reviewer.id,
      fullName: reviewer.fullName || null,
      avatarUrl: reviewer.profile?.avatarUrl || reviewer.avatarUrl || null,
    };
  }
  return reviewer;
};

const buildReviewResponse = (review) => ({
  id: review._id,
  order: review.order,
  reviewer: normalizeReviewer(review.reviewer),
  reviewedUser: review.reviewedUser,
  rating: review.rating,
  comment: review.comment,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

const normalizeRating = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const computeTrustStats = async (reviewedUserId) => {
  const [stats] = await Review.aggregate([
    {
      $match: {
        reviewedUser: new mongoose.Types.ObjectId(reviewedUserId),
      },
    },
    {
      $group: {
        _id: '$reviewedUser',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const averageRating = stats ? Number(stats.averageRating.toFixed(2)) : 0;
  const totalReviews = stats ? stats.totalReviews : 0;

  await User.findByIdAndUpdate(reviewedUserId, {
    'trustStats.averageRating': averageRating,
    'trustStats.totalTransactions': totalReviews,
  });

  return {
    averageRating,
    totalTransactions: totalReviews,
  };
};

const listReviews = async ({ filter, page, limit }) => {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('reviewer', 'fullName profile.avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  return {
    reviews,
    total,
    page,
    limit,
  };
};

exports.createReview = async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn hàng không hợp lệ.',
      });
    }

    const normalizedRating = normalizeRating(rating);
    if (normalizedRating === null || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn số sao từ 1 đến 5.',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng.',
      });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể đánh giá khi đơn hàng đã hoàn tất.',
      });
    }

    const reviewerId = req.user._id.toString();
    if (order.buyer?.toString() !== reviewerId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể đánh giá người bán của đơn hàng này.',
      });
    }

    const reviewedUserId = order.seller?.toString();
    if (!reviewedUserId) {
      return res.status(400).json({
        success: false,
        message: 'Không xác định được người bán để đánh giá.',
      });
    }

    if (reviewedUserId === reviewerId) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự đánh giá chính mình.',
      });
    }

    const existingReview = await Review.findOne({
      order: order._id,
      reviewer: req.user._id,
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã đánh giá đơn hàng này.',
      });
    }

    const review = await Review.create({
      order: order._id,
      reviewer: req.user._id,
      reviewedUser: order.seller,
      rating: normalizedRating,
      comment,
    });

    const trustStats = await computeTrustStats(order.seller);

    return res.status(201).json({
      success: true,
      message: 'Đánh giá thành công.',
      data: {
        review: buildReviewResponse(review),
        trustStats,
      },
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã đánh giá đơn hàng này.',
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi đánh giá người bán.',
    });
  }
};

exports.getReviewsBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ.',
      });
    }

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 50);

    const { reviews, total } = await listReviews({
      filter: { reviewedUser: sellerId },
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: {
        reviews: reviews.map((review) => buildReviewResponse(review)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy đánh giá.',
    });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 50);

    const { reviews, total } = await listReviews({
      filter: { reviewedUser: req.user._id },
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: {
        reviews: reviews.map((review) => buildReviewResponse(review)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy đánh giá của bạn.',
    });
  }
};
