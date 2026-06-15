const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const { normalizeLocationId } = require('../utils/location');
const { createNotification } = require('../utils/notification');
const {
  orderCreatedSellerEmail,
  orderTimeConfirmedEmail,
  orderCompletedEmail,
  orderCancelledEmail,
} = require('../utils/email');

const buildOrderResponse = (order) => ({
  id: order._id,
  items: order.items || [],
  totalPrice: order.totalPrice,
  paymentMethod: order.paymentMethod,
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
    items,
    paymentMethod,
    meetingLocationId,
    meetingSpot,
    proposedTimeSlots,
    timeSlot,
    finalTime,
    note,
  } = req.body;

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp ít nhất một sản phẩm.',
    });
  }

  // Validate each item
  for (const item of items) {
    if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
      return res.status(400).json({
        success: false,
        message: 'ID sản phẩm không hợp lệ.',
      });
    }
    if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng sản phẩm phải là số nguyên dương.',
      });
    }
    if (!item.price || item.price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá sản phẩm không hợp lệ.',
      });
    }
  }

  if (proposedTimeSlots || timeSlot || finalTime) {
    return res.status(400).json({
      success: false,
      message: 'Không thể chọn khung giờ khi tạo đơn hàng.',
    });
  }

  let session;
  let sessionEnded = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // Fetch all products and check stock & seller
    const productIds = items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).session(session);

    if (products.length !== items.length) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(404).json({
        success: false,
        message: 'Một hoặc nhiều sản phẩm không tồn tại.',
      });
    }

    // Create a map of products by ID for quick lookup
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // Get seller ID from first product (assuming all products from same seller)
    const sellerId = products[0].seller;
    
    // Check if buyer is seller
    if (sellerId?.toString() === req.user._id.toString()) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể đặt mua sản phẩm của chính mình.',
      });
    }

    // Check all sellers are the same (if multi-seller needed, remove this)
    const allSameSeller = products.every((p) => p.seller?.toString() === sellerId?.toString());
    if (!allSameSeller) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(400).json({
        success: false,
        message: 'Tất cả sản phẩm phải từ cùng một người bán.',
      });
    }

    // Validate stock for each item
    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productMap.get(item.product.toString());
      if (!product) {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        return res.status(404).json({
          success: false,
          message: `Sản phẩm ${item.product} không tồn tại.`,
        });
      }

      if (product.stock <= 0) {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        return res.status(400).json({
          success: false,
          message: 'Sản phẩm đã hết hàng',
        });
      }

      if (product.stock < item.quantity) {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        return res.status(409).json({
          success: false,
          message: `Sản phẩm "${product.title}" chỉ còn ${product.stock} cái, không đủ ${item.quantity} cái.`,
        });
      }

      const actualPrice = product.price;
      const itemTotal = actualPrice * item.quantity;
      totalPrice += itemTotal;
      orderItems.push({
        product: item.product,
        quantity: item.quantity,
        price: actualPrice,
      });
    }

    // Validate meeting location
    const normalizedLocationId = normalizeLocationId(meetingLocationId);
    const meetingLocationText = typeof meetingLocationId === 'string' ? meetingLocationId.trim() : '';
    const normalizedSpot = typeof meetingSpot === 'string' ? meetingSpot.trim() : '';
    const rawSpot = normalizedSpot || (normalizedLocationId ? '' : meetingLocationText);
    const spotAsLocationId = normalizeLocationId(rawSpot);

    if (!rawSpot && !normalizedLocationId) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn hoặc nhập địa điểm giao dịch.',
      });
    }

    const finalMeetingLocationId = normalizedLocationId || spotAsLocationId || undefined;
    const finalMeetingSpot = rawSpot || undefined;

    // Create order with new schema
    const [order] = await Order.create(
      [
        {
          items: orderItems,
          totalPrice,
          paymentMethod: paymentMethod || 'COD',
          buyer: req.user._id,
          seller: sellerId,
          meetingLocationId: finalMeetingLocationId,
          meetingSpot: finalMeetingSpot,
          note,
          status: 'scheduling',
        },
      ],
      { session }
    );

    // Deduct stock from all products atomically to prevent race conditions
    for (const item of items) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session, new: true }
      );

      if (!updatedProduct) {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        return res.status(400).json({
          success: false,
          message: 'Sản phẩm đã hết hàng hoặc không đủ số lượng do có người vừa mua.',
        });
      }
    }

    await session.commitTransaction();

    // Populate items with product details for response
    await order.populate('items.product', 'title price images');

    // Notify seller about new order (fire-and-forget)
    const buyer = req.user;
    const seller = await User.findById(sellerId).select('fullName email');
    if (seller) {
      const itemSummary = order.items.map((i) => ({
        title: i.product?.title || 'Sản phẩm',
        quantity: i.quantity,
        price: i.price,
      }));
      createNotification(
        sellerId,
        'order_created',
        'Bạn có đơn hàng mới!',
        `${buyer.fullName} vừa đặt mua hàng của bạn.`,
        { orderId: order._id }
      );
      orderCreatedSellerEmail(seller.email, seller.fullName, {
        orderId: order._id,
        buyerName: buyer.fullName,
        totalPrice: order.totalPrice,
        items: itemSummary,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Đã tạo đơn hàng. Vui lòng chọn lịch hẹn.',
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
    const errorMessage = error?.message || String(error);

    console.error(
      `[ORDER_ROLLBACK] buyerId=${buyerId} error=${errorMessage}`
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
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (role === 'buyer') {
      filter.buyer = req.user._id;
    } else if (role === 'seller') {
      filter.seller = req.user._id;
    } else {
      filter.$or = [{ buyer: req.user._id }, { seller: req.user._id }];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.product', 'title price images category productStatus status')
        .populate('seller', 'fullName')
        .populate('buyer', 'fullName'),
      Order.countDocuments(filter),
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

  createNotification(
    order.buyer,
    'order_time_proposed',
    'Người bán đề xuất lịch hẹn',
    'Người bán đã gửi 3 khung giờ giao dịch. Vui lòng chọn khung giờ phù hợp.',
    { orderId: order._id }
  );

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

  if (!ensureParticipant(order, req.user._id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ người mua hoặc người bán mới được chốt khung giờ.',
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

  // Notify seller + email both parties
  createNotification(
    order.seller,
    'order_time_confirmed',
    'Lịch hẹn đã được chốt',
    'Người mua đã chọn khung giờ giao dịch. Vui lòng chuẩn bị đúng giờ.',
    { orderId: order._id }
  );

  const [buyerUser, sellerUser] = await Promise.all([
    User.findById(order.buyer).select('fullName email'),
    User.findById(order.seller).select('fullName email'),
  ]);
  const emailData = { orderId: order._id, finalTime: matchedSlot, meetingSpot: normalizedLocationId };
  if (buyerUser) orderTimeConfirmedEmail(buyerUser.email, buyerUser.fullName, emailData);
  if (sellerUser) orderTimeConfirmedEmail(sellerUser.email, sellerUser.fullName, emailData);

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

    // Mark products as sold if stock is depleted, clear reservation
    if (order.items && order.items.length > 0) {
      const productIds = order.items.map((item) => item.product);

      // Backward-compat: old booking flow didn't decrement stock at reservation time.
      // If a product is still 'reserved' with stock > 0, decrement now.
      for (const item of order.items) {
        await Product.findOneAndUpdate(
          { _id: item.product, status: 'reserved', stock: { $gt: 0 } },
          { $inc: { stock: -item.quantity } }
        );
      }

      await Product.updateMany(
        { _id: { $in: productIds }, stock: { $lte: 0 } },
        { status: 'sold', reservedBy: null }
      );
    }

    const totalItems = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      : 0;

    if (totalItems > 0) {
      await Promise.all([
        User.findByIdAndUpdate(order.seller, { $inc: { 'stats.totalSold': totalItems } }),
        User.findByIdAndUpdate(order.buyer, { $inc: { 'stats.totalBought': totalItems } }),
      ]);
    }

    // Notify both parties + send emails
    const emailData = { orderId: order._id, totalPrice: order.totalPrice };
    const [buyerUser, sellerUser] = await Promise.all([
      User.findById(order.buyer).select('fullName email'),
      User.findById(order.seller).select('fullName email'),
    ]);

    createNotification(order.buyer, 'order_completed', 'Đơn hàng hoàn tất', 'Giao dịch đã hoàn thành thành công!', { orderId: order._id });
    createNotification(order.seller, 'order_completed', 'Đơn hàng hoàn tất', 'Giao dịch đã hoàn thành thành công!', { orderId: order._id });
    if (buyerUser) orderCompletedEmail(buyerUser.email, buyerUser.fullName, emailData);
    if (sellerUser) orderCompletedEmail(sellerUser.email, sellerUser.fullName, emailData);

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
  let session;
  let sessionEnded = false;

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn hàng không hợp lệ.',
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const order = await Order.findById(id).session(session);
    if (!order) {
      if (session.inTransaction()) await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng.',
      });
    }

    if (!ensureParticipant(order, req.user._id.toString())) {
      if (session.inTransaction()) await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật đơn hàng này.',
      });
    }

    if (order.status === 'completed') {
      if (session.inTransaction()) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã hoàn tất, không thể hủy.',
      });
    }

    if (order.status === 'cancelled') {
      if (session.inTransaction()) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã bị hủy.',
      });
    }

    order.status = 'cancelled';
    await order.save({ session });

    // Restore stock for all items in order and set status back to available
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: { stock: item.quantity },
            $set: { status: 'available', reservedBy: null }
          },
          { session }
        );
      }
    }

    await session.commitTransaction();

    // Notify the other party + send emails (fire-and-forget after commit)
    const cancellerName = req.user.fullName || 'Người dùng';
    const otherId = req.user._id.toString() === order.buyer.toString() ? order.seller : order.buyer;
    createNotification(
      otherId,
      'order_cancelled',
      'Đơn hàng đã bị hủy',
      `${cancellerName} đã hủy đơn hàng.`,
      { orderId: order._id }
    );
    const [buyerUser, sellerUser] = await Promise.all([
      User.findById(order.buyer).select('fullName email'),
      User.findById(order.seller).select('fullName email'),
    ]);
    const emailData = { orderId: order._id, cancelledBy: cancellerName };
    if (buyerUser) orderCancelledEmail(buyerUser.email, buyerUser.fullName, emailData);
    if (sellerUser) orderCancelledEmail(sellerUser.email, sellerUser.fullName, emailData);

    res.status(200).json({
      success: true,
      message: 'Đã hủy đơn hàng.',
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

    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi hủy đơn hàng.',
    });
  } finally {
    if (session && !sessionEnded) {
      session.endSession();
    }
  }
};

const ALLOWED_SELLER_STATUSES = new Set(['scheduling', 'pending', 'cancelled']);

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ.' });
    }

    if (!status || !ALLOWED_SELLER_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ. Cho phép: ${[...ALLOWED_SELLER_STATUSES].join(', ')}.`,
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    if (order.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Chỉ người bán mới được cập nhật trạng thái đơn hàng.' });
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Không thể thay đổi trạng thái đơn hàng đã hoàn tất hoặc đã hủy.' });
    }

    order.status = status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công.',
      data: { order: buildOrderResponse(order) }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi server khi cập nhật trạng thái.' });
  }
};
