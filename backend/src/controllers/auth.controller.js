const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const isHustStudentEmail = (email) => {
  if (typeof email !== 'string') {
    return false;
  }

  return /@sis\.hust\.edu\.vn$/i.test(email.trim());
};

const pickRegisterFields = (payload) => {
  const optionalFields = [
    'student',
    'profile',
    'location',
    'contactPreferences',
    'socialLinks',
  ];

  const picked = {};
  optionalFields.forEach((field) => {
    if (payload[field] !== undefined) {
      picked[field] = payload[field];
    }
  });

  return picked;
};

exports.register = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password } = req.body;

    if (!fullName || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin đăng ký.',
      });
    }

    if (!isHustStudentEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng sử dụng email sinh viên (@sis.hust.edu.vn).',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được sử dụng. Vui lòng đăng nhập.',
      });
    }

    const extraFields = pickRegisterFields(req.body);
    const newUser = await User.create({
      fullName,
      email,
      phoneNumber,
      password,
      isVerified: true,
      ...extraFields,
    });

    const token = signToken(newUser._id);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      token,
      data: {
        user: {
          id: newUser._id,
          fullName: newUser.fullName,
          email: newUser.email,
          isVerified: newUser.isVerified,
          role: newUser.role,
          status: newUser.status
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi đăng ký',
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ email và mật khẩu.',
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đang bị tạm khóa hoặc ngừng hoạt động.',
      });
    }

    if (user.trustStats?.isBlacklisted) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đang bị hạn chế do vi phạm.',
      });
    }

    user.lastActiveAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);
    user.password = undefined;

    res.status(200).json({
      success: true,
      token,
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng nhập',
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email để đặt lại mật khẩu.',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
      });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const response = {
      success: true,
      message: 'Tạo token đặt lại mật khẩu thành công. Vui lòng dùng token này để đặt lại mật khẩu.',
      expiresInMinutes: 10,
    };

    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = resetToken;
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi tạo token đặt lại mật khẩu',
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp token và mật khẩu mới.',
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn.',
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const authToken = signToken(user._id);
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công.',
      token: authToken,
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi đặt lại mật khẩu',
    });
  }
};