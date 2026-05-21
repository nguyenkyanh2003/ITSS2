const mongoose = require('mongoose');
const Transaction = require('../models/transaction.model');
const Product = require('../models/product.model');

const buildTransactionResponse = (transaction) => ({
  id: transaction._id,
  product: transaction.product,
  buyer: transaction.buyer,
  seller: transaction.seller,
  status: transaction.status,
  meetingSpot: transaction.meetingSpot,
  scheduledTime: transaction.scheduledTime,
  timeSlot: transaction.timeSlot,
  note: transaction.note,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});

const ensureParticipant = (transaction, userId) => {
  const buyerId = transaction.buyer?.toString();
  const sellerId = transaction.seller?.toString();
  return buyerId === userId || sellerId === userId;
};

exports.getMyTransactions = async (req, res) => {
  try {
    const role = String(req.query.role || '').toLowerCase();
    const filter = {};

    if (role === 'buyer') {
      filter.buyer = req.user._id;
    } else if (role === 'seller') {
      filter.seller = req.user._id;
    } else {
      filter.$or = [{ buyer: req.user._id }, { seller: req.user._id }];
    }

    const transactions = await Transaction.find(filter)
      .sort({ updatedAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        transactions: transactions.map((transaction) => buildTransactionResponse(transaction)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy danh sách giao dịch.',
    });
  }
};

exports.scheduleTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID giao dịch không hợp lệ.',
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch.',
      });
    }

    if (!ensureParticipant(transaction, req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật giao dịch này.',
      });
    }

    if (transaction.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Giao dịch đã hoàn tất, không thể cập nhật lịch.',
      });
    }

    const { meetingSpot, scheduledTime, timeSlot, note, status } = req.body;

    if (meetingSpot !== undefined) {
      transaction.meetingSpot = meetingSpot;
    }
    if (scheduledTime !== undefined) {
      transaction.scheduledTime = scheduledTime;
    }
    if (timeSlot !== undefined) {
      transaction.timeSlot = timeSlot;
    }
    if (note !== undefined) {
      transaction.note = note;
    }

    if (status === 'pending') {
      transaction.status = 'pending';
    } else if (transaction.status === 'scheduling') {
      transaction.status = 'pending';
    }

    await transaction.save();

    res.status(200).json({
      success: true,
      data: {
        transaction: buildTransactionResponse(transaction),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật lịch hẹn.',
    });
  }
};

exports.completeTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID giao dịch không hợp lệ.',
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch.',
      });
    }

    if (!ensureParticipant(transaction, req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật giao dịch này.',
      });
    }

    if (transaction.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Giao dịch đã hoàn tất.',
      });
    }

    transaction.status = 'completed';
    await transaction.save();

    await Product.findByIdAndUpdate(transaction.product, { status: 'sold' });

    res.status(200).json({
      success: true,
      message: 'Đã hoàn tất giao dịch.',
      data: {
        transaction: buildTransactionResponse(transaction),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi hoàn tất giao dịch.',
    });
  }
};

exports.cancelTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID giao dịch không hợp lệ.',
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch.',
      });
    }

    if (!ensureParticipant(transaction, req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật giao dịch này.',
      });
    }

    if (transaction.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Giao dịch đã hoàn tất, không thể hủy.',
      });
    }

    transaction.status = 'cancelled';
    await transaction.save();

    await Product.findByIdAndUpdate(transaction.product, { status: 'available' });

    res.status(200).json({
      success: true,
      message: 'Đã hủy giao dịch.',
      data: {
        transaction: buildTransactionResponse(transaction),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi hủy giao dịch.',
    });
  }
};
