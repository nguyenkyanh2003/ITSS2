const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/user.model');
const { getPublicBaseUrl, normalizeMediaUrl } = require('../utils/media');

const buildMessageResponse = (message) => ({
  id: message._id,
  sender: message.sender,
  receiver: message.receiver,
  content: message.content,
  isRead: message.isRead,
  readAt: message.readAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const getDocumentId = (value) => {
  if (!value) return '';
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
};

const getParticipantsKey = (firstUserId, secondUserId) => {
  return [String(firstUserId), String(secondUserId)].sort().join('_');
};

const buildUserSummary = (user, baseUrl = null) => {
  if (!user) return null;
  const profile = user.profile?.toObject ? user.profile.toObject() : { ...(user.profile || {}) };

  return {
    id: user._id || user.id,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: profile.avatarUrl ? normalizeMediaUrl(profile.avatarUrl, baseUrl) : undefined,
  };
};

const buildConversationResponse = (conversation, currentUserId = null, unreadCount = 0, baseUrl = null) => {
  const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
  const otherParticipant = currentUserId
    ? participants.find((participant) => getDocumentId(participant) !== String(currentUserId))
    : null;

  const lastMessage = conversation.lastMessage && conversation.lastMessage._id
    ? buildMessageResponse(conversation.lastMessage)
    : conversation.lastMessage;

  return {
    id: conversation._id,
    participants,
    otherUser: otherParticipant && typeof otherParticipant === 'object'
      ? buildUserSummary(otherParticipant, baseUrl)
      : undefined,
    lastMessage,
    unreadCount,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

const normalizeContent = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const parsePage = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const parseLimit = (value, fallback = 20, max = 100) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const ensureUserExists = async (userId) => {
  return await User.findById(userId).select('_id');
};

const normalizeUserId = (value) => {
  if (!value) {
    return '';
  }

  return String(value).trim();
};

exports.getOrCreateConversation = async (req, res) => {
  try {
    const currentUserId = req.user?._id ? String(req.user._id) : '';
    const otherUserId = normalizeUserId(req.body?.sellerId || req.body?.userId);

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ID người bán để bắt đầu trò chuyện.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ.',
      });
    }

    if (otherUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tạo hội thoại với chính mình.',
      });
    }

    const receiver = await ensureUserExists(otherUserId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng cần liên hệ.',
      });
    }

    const participantIds = [currentUserId, otherUserId].sort();
    const participantsKey = getParticipantsKey(currentUserId, otherUserId);

    let conversation = await Conversation.findOne({ participantsKey });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: participantIds,
        participantsKey,
        createdBy: currentUserId,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        conversation: buildConversationResponse(conversation),
        otherUserId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi tạo hội thoại.',
    });
  }
};

exports.listConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;

    const [conversations, total, unreadGroups] = await Promise.all([
      Conversation.find({ participants: currentUserId })
        .populate({
          path: 'participants',
          select: 'fullName email profile.avatarUrl',
        })
        .populate('lastMessage')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments({ participants: currentUserId }),
      Message.aggregate([
        {
          $match: {
            receiver: currentUserId,
            isRead: false,
          },
        },
        {
          $group: {
            _id: '$sender',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const unreadBySender = new Map(
      unreadGroups.map((item) => [String(item._id), item.count])
    );
    const baseUrl = getPublicBaseUrl(req);

    const data = conversations.map((conversation) => {
      const otherParticipant = conversation.participants.find(
        (participant) => getDocumentId(participant) !== String(currentUserId)
      );
      const unreadCount = unreadBySender.get(getDocumentId(otherParticipant)) || 0;
      return buildConversationResponse(conversation, currentUserId, unreadCount, baseUrl);
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
        conversations: data,
        unreadTotal: unreadGroups.reduce((sum, item) => sum + item.count, 0),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy danh sách hội thoại.',
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ.',
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể nhắn tin cho chính mình.',
      });
    }

    const receiver = await ensureUserExists(userId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng nhận tin nhắn.',
      });
    }

    const content = normalizeContent(req.body.content);
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung tin nhắn.',
      });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiver._id,
      content,
    });

    const participantIds = [String(req.user._id), String(receiver._id)].sort();
    const participantsKey = getParticipantsKey(req.user._id, receiver._id);
    await Conversation.findOneAndUpdate(
      { participantsKey },
      {
        $set: {
          participants: participantIds,
          participantsKey,
          lastMessage: message._id,
        },
        $setOnInsert: {
          createdBy: req.user._id,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Đã gửi tin nhắn.',
      data: {
        message: buildMessageResponse(message),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi gửi tin nhắn.',
    });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ.',
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Không thể lấy hội thoại với chính mình.',
      });
    }

    const receiver = await ensureUserExists(userId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng.',
      });
    }

    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { sender: req.user._id, receiver: receiver._id },
        { sender: receiver._id, receiver: req.user._id },
      ],
    };

    const [messages, total] = await Promise.all([
      Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Message.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: {
        messages: messages.map((message) => buildMessageResponse(message)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy hội thoại.',
    });
  }
};

exports.markConversationRead = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ.',
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Không thể cập nhật hội thoại với chính mình.',
      });
    }

    const receiver = await ensureUserExists(userId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng.',
      });
    }

    const result = await Message.updateMany(
      {
        sender: receiver._id,
        receiver: req.user._id,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        updatedCount: result.modifiedCount || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật trạng thái tin nhắn.',
    });
  }
};
