const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const { CAMPUS_LOCATION_IDS } = require('../constants/locations');

const buildOrderResponse = (order) => ({
  id: order._id,
  product: order.product,
  buyer: order.buyer,
  seller: order.seller,
  status: order.status,
  meetingLocationId: order.meetingLocationId || order.meetingSpot || null,
  meetingSpot: order.meetingSpot,
  proposedTimeSlots: order.proposedTimeSlots || [],
  finalTime: order.finalTime || order.timeSlot || null,
  scheduledTime: order.scheduledTime,
  timeSlot: order.timeSlot,
  note: order.note,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const ensureParticipant = (order, userId) => {
  const buyerId = order.buyer?.toString();
  const sellerId = order.seller?.toString();
  return buyerId === userId || sellerId === userId;
};

const normalizeLocationId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  return CAMPUS_LOCATION_IDS.has(normalized) ? normalized : null;
};

const normalizeTimeSlot = (slot) => {
  if (!slot || typeof slot !== 'object') {
    return null;
  }

  const startAt = new Date(slot.startAt);
  const endAt = new Date(slot.endAt);

  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime())) {
    return null;
  }

  if (endAt <= startAt) {
    return null;
  }

  const normalized = {
    startAt,
    endAt,
  };

  if (typeof slot.note === 'string' && slot.note.trim()) {
    normalized.note = slot.note.trim();
  }

  return normalized;
};

const normalizeTimeSlots = (slots) => {
  if (!Array.isArray(slots)) {
    return null;
  }

  const normalized = slots.map((slot) => normalizeTimeSlot(slot));
  if (normalized.some((slot) => !slot)) {
    return null;
  }

  return normalized;
};

const isSameTimeSlot = (left, right) => {
  if (!left || !right) {
    return false;
  }

  return (
    left.startAt.getTime() === right.startAt.getTime() &&
    left.endAt.getTime() === right.endAt.getTime()
  );
};

exports.createOrder = async (req, res) => {
  const {
    productId,
    meetingLocationId,
    meetingSpot,
    proposedTimeSlots,
    timeSlot,
    finalTime,
    note,
  } = req.body;

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      success: false,
      message: 'ID sản phẩm không hợp lệ.',
    });
  }

  let session;
  let sessionEnded = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const product = await Product.findById(productId).session(session);
    if (!product) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    if (product.seller?.toString() === req.user._id.toString()) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      return res.status(400).json({
        success: false,
        message: 'Bạn không thể đặt mua sản phẩm của chính mình.',
      });
    }

    const existingOrder = await Order.findOne({
      product: productId,
      status: { $in: ['scheduling', 'pending'] },
    }).session(session);

    if (existingOrder) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      return res.status(409).json({
        success: false,
        message: 'Sản phẩm đang có đơn hàng đang xử lý.',
      });
    }

    if (proposedTimeSlots || timeSlot || finalTime) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      return res.status(400).json({
        success: false,
        message: 'Không thể chọn khung giờ khi tạo đơn hàng.',
      });
    }

    const normalizedLocationId = normalizeLocationId(meetingLocationId || meetingSpot);
    if ((meetingLocationId !== undefined || meetingSpot !== undefined) && !normalizedLocationId) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      return res.status(400).json({
        success: false,
        message: 'Địa điểm giao dịch không hợp lệ.',
      });
    }

    const reservedProduct = await Product.findOneAndUpdate(
      { _id: productId, status: 'available' },
      { status: 'reserved' },
      { new: true, session }
    );

    if (!reservedProduct) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      return res.status(409).json({
        success: false,
        message: 'Sản phẩm đã có người đặt.',
      });
    }

    const [order] = await Order.create(
      [
        {
          product: productId,
          buyer: req.user._id,
          seller: product.seller,
          meetingLocationId: normalizedLocationId || undefined,
          meetingSpot: normalizedLocationId || undefined,
          note,
          status: 'scheduling',
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Đã giữ chỗ sản phẩm. Vui lòng chọn lịch hẹn.',
      data: {
        order: buildOrderResponse(order),
      },
    });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }

    if (session) {
      session.endSession();
      sessionEnded = true;
    }

    const buyerId = req.user?._id ? req.user._id.toString() : 'unknown';
    const safeProductId = productId || 'unknown';
    const errorMessage = error?.message || String(error);

    console.error(
      `[ORDER_ROLLBACK] buyerId=${buyerId} productId=${safeProductId} error=${errorMessage}`
    );

    return res.status(500).json({
      success: false,
      message: 'Hệ thống gặp sự cố khi tạo đơn, vui lòng thử lại sau',
    });
  } finally {
    if (session && !sessionEnded) {
      session.endSession();
    }
  }
};

exports.getMyOrders = async (req, res) => {
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

    const orders = await Order.find(filter).sort({ updatedAt: -1 }).limit(50);

    res.status(200).json({
      success: true,
      data: {
        orders: orders.map((order) => buildOrderResponse(order)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy danh sách đơn hàng.',
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn hàng không hợp lệ.',
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng.',
      });
    }

    if (!ensureParticipant(order, req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn hàng này.',
      });
    }

    const responseOrder = buildOrderResponse(order);

    if (order.status === 'pending') {
      const [buyer, seller] = await Promise.all([
        User.findById(order.buyer).select('phoneNumber'),
        User.findById(order.seller).select('phoneNumber'),
      ]);

      responseOrder.buyerPhone = buyer?.phoneNumber || null;
      responseOrder.sellerPhone = seller?.phoneNumber || null;
    }

    res.status(200).json({
      success: true,
      data: {
        order: responseOrder,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy đơn hàng.',
    });
  }
};

const handleProposeTimes = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID đơn hàng không hợp lệ.',
    });
  }

  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng.',
    });
  }

  if (order.seller?.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ người bán mới được đề xuất khung giờ.',
    });
  }

  if (order.status !== 'scheduling') {
    return res.status(400).json({
      success: false,
      message: 'Chỉ có thể đề xuất khung giờ khi đơn hàng đang xếp lịch.',
    });
  }

  const normalizedSlots =
    req.validatedProposedTimeSlots || normalizeTimeSlots(req.body.proposedTimeSlots);
  if (!normalizedSlots || normalizedSlots.length !== 3) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng đề xuất đúng 3 khung giờ hợp lệ.',
    });
  }

  order.proposedTimeSlots = normalizedSlots;
  order.finalTime = undefined;
  order.timeSlot = undefined;
  await order.save();

  return res.status(200).json({
    success: true,
    data: {
      order: buildOrderResponse(order),
    },
  });
};

const handleConfirmTime = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID đơn hàng không hợp lệ.',
    });
  }

  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng.',
    });
  }

  if (order.buyer?.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ người mua mới được chốt khung giờ.',
    });
  }

  if (order.status !== 'scheduling') {
    return res.status(400).json({
      success: false,
      message: 'Chỉ có thể chốt lịch khi đơn hàng đang xếp lịch.',
    });
  }

  const finalPayload = req.body.finalTime || req.body.timeSlot;
  const normalizedFinal = normalizeTimeSlot(finalPayload);
  if (!normalizedFinal) {
    return res.status(400).json({
      success: false,
      message: 'Khung giờ chốt không hợp lệ.',
    });
  }

  if (!Array.isArray(order.proposedTimeSlots) || order.proposedTimeSlots.length !== 3) {
    return res.status(400).json({
      success: false,
      message: 'Người bán chưa đề xuất đủ 3 khung giờ.',
    });
  }

  const matchedSlot = order.proposedTimeSlots.find((slot) =>
    isSameTimeSlot(slot, normalizedFinal)
  );

  if (!matchedSlot) {
    return res.status(400).json({
      success: false,
      message: 'Khung giờ đã chọn không nằm trong danh sách đề xuất.',
    });
  }

  const locationIdInput =
    req.body.meetingLocationId ||
    req.body.meetingSpot ||
    order.meetingLocationId ||
    order.meetingSpot;
  const normalizedLocationId = normalizeLocationId(locationIdInput);

  if (!normalizedLocationId) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng chọn địa điểm giao dịch hợp lệ.',
    });
  }

  order.meetingLocationId = normalizedLocationId;
  order.meetingSpot = normalizedLocationId;
  order.finalTime = matchedSlot;
  order.timeSlot = matchedSlot;
  order.status = 'pending';
  await order.save();

  return res.status(200).json({
    success: true,
    data: {
      order: buildOrderResponse(order),
    },
  });
};

exports.proposeTimes = handleProposeTimes;
exports.confirmTime = handleConfirmTime;

exports.scheduleOrder = async (req, res) => {
  try {
    if (req.body.proposedTimeSlots) {
      return await handleProposeTimes(req, res);
    }

    if (req.body.finalTime || req.body.timeSlot) {
      return await handleConfirmTime(req, res);
    }

    return res.status(400).json({
      success: false,
      message: 'Vui lòng dùng API đề xuất hoặc chốt lịch hẹn phù hợp.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật lịch hẹn.',
    });
  }
};

exports.completeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn hàng không hợp lệ.',
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng.',
      });
    }

    if (!ensureParticipant(order, req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật đơn hàng này.',
      });
    }

    if (order.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã hoàn tất.',
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hoàn tất khi đơn hàng ở trạng thái chờ giao dịch.',
      });
    }

    order.status = 'completed';
    await order.save();

    await Product.findByIdAndUpdate(order.product, { status: 'sold' });

    res.status(200).json({
      success: true,
      message: 'Đã hoàn tất đơn hàng.',
      data: {
        order: buildOrderResponse(order),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi hoàn tất đơn hàng.',
    });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn hàng không hợp lệ.',
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng.',
      });
    }

    if (!ensureParticipant(order, req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật đơn hàng này.',
      });
    }

    if (order.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã hoàn tất, không thể hủy.',
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã bị hủy.',
      });
    }

    order.status = 'cancelled';
    await order.save();

    await Product.findByIdAndUpdate(order.product, { status: 'available' });

    res.status(200).json({
      success: true,
      message: 'Đã hủy đơn hàng.',
      data: {
        order: buildOrderResponse(order),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi hủy đơn hàng.',
    });
  }
};
