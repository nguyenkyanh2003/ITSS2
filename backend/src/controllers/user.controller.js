const mongoose = require('mongoose');
const User = require('../models/user.model');

const buildUserResponse = (user, viewer) => {
  const canSeeContact = Boolean(
    viewer && (viewer.role === 'admin' || viewer._id?.toString() === user._id.toString())
  );
  const showEmail = user.contactPreferences?.showEmail || canSeeContact;
  const showPhone = canSeeContact;

  const response = {
    id: user._id,
    fullName: user.fullName,
    email: showEmail ? user.email : undefined,
    phoneNumber: showPhone ? user.phoneNumber : undefined,
    isVerified: user.isVerified,
    profile: user.profile,
    student: user.student,
    location: user.location,
    contactPreferences: user.contactPreferences,
    socialLinks: user.socialLinks,
    trustStats: user.trustStats,
    stats: user.stats,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (canSeeContact) {
    response.status = user.status;
    response.role = user.role;
    response.lastActiveAt = user.lastActiveAt;
  }

  return response;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pickUpdateFields = (payload) => {
  const updates = {};
  const simpleFields = ['fullName', 'phoneNumber'];
  const nestedFields = [
    'student',
    'profile',
    'location',
    'contactPreferences',
    'socialLinks',
  ];

  simpleFields.forEach((field) => {
    if (payload[field] !== undefined) {
      updates[field] = payload[field];
    }
  });

  nestedFields.forEach((field) => {
    const value = payload[field];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([key, nestedValue]) => {
        if (nestedValue !== undefined) {
          updates[`${field}.${key}`] = nestedValue;
        }
      });
    }
  });

  return updates;
};

exports.getAllUsers = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';

    const query = {};
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { fullName: new RegExp(escapedSearch, 'i') },
        { email: new RegExp(escapedSearch, 'i') },
        { phoneNumber: new RegExp(escapedSearch, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: {
        users: users.map((user) => buildUserResponse(user, req.user)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy danh sách người dùng',
    });
  }
};

exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: buildUserResponse(req.user, req.user),
    },
  });
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: buildUserResponse(user, req.user),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy thông tin người dùng',
    });
  }
};

exports.updateMe = async (req, res) => {
  try {
    if (req.body.password || req.body.newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng dùng API đổi mật khẩu để cập nhật mật khẩu.',
      });
    }

    const updates = pickUpdateFields(req.body);
    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: {
        user: buildUserResponse(updatedUser, req.user),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật thông tin',
    });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ảnh đại diện.',
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { 'profile.avatarUrl': avatarUrl },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: {
        user: buildUserResponse(updatedUser, req.user),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật ảnh đại diện',
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi đổi mật khẩu',
    });
  }
};

exports.deactivateMe = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { status: 'inactive' });
    res.status(200).json({
      success: true,
      message: 'Tài khoản đã được ngừng hoạt động.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi ngừng hoạt động tài khoản',
    });
  }
};

exports.followUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ.',
      });
    }

    if (currentUserId === id) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể theo dõi chính mình.',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng.',
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id, following: { $ne: id } },
      { $addToSet: { following: id }, $inc: { followingCount: 1 } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã theo dõi người dùng này.',
      });
    }

    await User.findByIdAndUpdate(id, {
      $inc: { followersCount: 1 },
    });

    res.status(200).json({
      success: true,
      message: 'Theo dõi thành công.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi theo dõi người dùng',
    });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ.',
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id, following: id },
      { $pull: { following: id }, $inc: { followingCount: -1 } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa theo dõi người dùng này.',
      });
    }

    await User.findByIdAndUpdate(id, {
      $inc: { followersCount: -1 },
    });

    res.status(200).json({
      success: true,
      message: 'Bỏ theo dõi thành công.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi bỏ theo dõi',
    });
  }
};

exports.getFavorites = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      favorites: req.user.favorites || [],
    },
  });
};

exports.addFavorite = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'ID sản phẩm không hợp lệ.',
      });
    }

    const isExists = req.user.favorites?.some(
      (favoriteId) => favoriteId.toString() === itemId
    );
    if (isExists) {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm đã nằm trong danh sách yêu thích.',
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { favorites: itemId },
    });

    res.status(200).json({
      success: true,
      message: 'Đã thêm vào danh sách yêu thích.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi thêm yêu thích',
    });
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'ID sản phẩm không hợp lệ.',
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { favorites: itemId },
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa khỏi danh sách yêu thích.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi xóa yêu thích',
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isBlacklisted } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ.',
      });
    }

    const updates = {};
    if (status) {
      updates.status = status;
    }
    if (typeof isBlacklisted === 'boolean') {
      updates['trustStats.isBlacklisted'] = isBlacklisted;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: buildUserResponse(updatedUser, req.user),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật trạng thái',
    });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ.',
      });
    }

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ.',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: buildUserResponse(updatedUser, req.user),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật vai trò',
    });
  }
};
