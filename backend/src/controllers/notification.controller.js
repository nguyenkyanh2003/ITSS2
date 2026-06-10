const mongoose = require('mongoose');
const Notification = require('../models/Notification');

exports.getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 50);
    const skip = (page - 1) * limit;
    const onlyUnread = req.query.unread === 'true';

    const filter = { recipient: req.user._id };
    if (onlyUnread) filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data: { notifications, unreadCount },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi server.' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID thông báo không hợp lệ.' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
    }

    return res.status(200).json({ success: true, data: { notification } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi server.' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.status(200).json({
      success: true,
      message: `Đã đánh dấu đọc ${result.modifiedCount} thông báo.`,
      data: { updatedCount: result.modifiedCount },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi server.' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID thông báo không hợp lệ.' });
    }

    const notification = await Notification.findOneAndDelete({ _id: id, recipient: req.user._id });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
    }

    return res.status(200).json({ success: true, message: 'Đã xóa thông báo.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi server.' });
  }
};
