const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1];
};

exports.protect = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để tiếp tục.',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET chưa được cấu hình.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id).select('+password');

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
      });
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.',
      });
    }

    if (currentUser.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đang bị tạm khóa hoặc ngừng hoạt động.',
      });
    }

    if (currentUser.trustStats?.isBlacklisted) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đang bị hạn chế do vi phạm.',
      });
    }

    req.user = currentUser;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn.',
    });
  }
};

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện thao tác này.',
    });
  }

  return next();
};
