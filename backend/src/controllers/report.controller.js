const mongoose = require('mongoose');
const Report = require('../models/Report');

const REPORT_TYPES = ['fake_product', 'fraud', 'inappropriate', 'spam', 'other'];

exports.createReport = async (req, res) => {
  try {
    const { reportedUserId, reportedProductId, type, description } = req.body;

    if (!reportedUserId && !reportedProductId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp người dùng hoặc sản phẩm bị báo cáo.',
      });
    }

    if (reportedUserId && !mongoose.Types.ObjectId.isValid(reportedUserId)) {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ.' });
    }

    if (reportedProductId && !mongoose.Types.ObjectId.isValid(reportedProductId)) {
      return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ.' });
    }

    if (reportedUserId && reportedUserId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Bạn không thể báo cáo chính mình.' });
    }

    if (!REPORT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Loại báo cáo không hợp lệ. Cho phép: ${REPORT_TYPES.join(', ')}.`,
      });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng mô tả lý do báo cáo.' });
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportedUser: reportedUserId || null,
      reportedProduct: reportedProductId || null,
      type,
      description: description.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Báo cáo đã được gửi. Chúng tôi sẽ xem xét trong thời gian sớm nhất.',
      data: { report },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi server.' });
  }
};

exports.getMyReports = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 50);
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find({ reporter: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reportedUser', 'fullName email')
        .populate('reportedProduct', 'title price'),
      Report.countDocuments({ reporter: req.user._id }),
    ]);

    return res.status(200).json({
      success: true,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data: { reports },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi server.' });
  }
};

exports.getAllReports = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporter', 'fullName email')
        .populate('reportedUser', 'fullName email')
        .populate('reportedProduct', 'title price'),
      Report.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data: { reports },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi server.' });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID báo cáo không hợp lệ.' });
    }

    const allowedStatuses = ['pending', 'reviewing', 'resolved', 'dismissed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ.' });
    }

    const update = { status };
    if (adminNote) update.adminNote = adminNote.trim();

    const report = await Report.findByIdAndUpdate(id, update, { new: true });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo.' });
    }

    return res.status(200).json({ success: true, data: { report } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi server.' });
  }
};
