const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/product.model');

const buildOrderResponse = (order) => ({
  id: order._id,
  product: order.product,
  buyer: order.buyer,
  seller: order.seller,
  status: order.status,
  meetingSpot: order.meetingSpot,
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

exports.createOrder = async (req, res) => {
  try {
    const { productId, meetingSpot, timeSlot, note } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'ID sản phẩm không hợp lệ.',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    if (product.seller?.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể đặt mua sản phẩm của chính mình.',
      });
    }

    if (product.status !== 'available') {
      return res.status(409).json({
        success: false,
        message: 'Sản phẩm đã được giữ chỗ hoặc không còn khả dụng.',
      });
    }

    const existingOrder = await Order.findOne({
      product: productId,
      status: { $in: ['scheduling', 'pending'] },
    });

    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: 'Sản phẩm đang có đơn hàng đang xử lý.',
      });
    }

    const order = await Order.create({
      product: productId,
      buyer: req.user._id,
      seller: product.seller,
      meetingSpot,
      timeSlot,
      note,
      status: 'scheduling',
    });

    product.status = 'reserved';
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Đã giữ chỗ sản phẩm. Vui lòng chọn lịch hẹn.',
      data: {
        order: buildOrderResponse(order),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi tạo đơn hàng.',
    });
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

    res.status(200).json({
      success: true,
      data: {
        order: buildOrderResponse(order),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy đơn hàng.',
    });
  }
};

exports.scheduleOrder = async (req, res) => {
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
        message: 'Đơn hàng đã hoàn tất, không thể cập nhật lịch.',
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã bị hủy, không thể cập nhật lịch.',
      });
    }

    const { meetingSpot, scheduledTime, timeSlot, note, status } = req.body;

    if (meetingSpot !== undefined) {
      order.meetingSpot = meetingSpot;
    }
    if (scheduledTime !== undefined) {
      order.scheduledTime = scheduledTime;
    }
    if (timeSlot !== undefined) {
      order.timeSlot = timeSlot;
    }
    if (note !== undefined) {
      order.note = note;
    }

    if (status === 'pending') {
      order.status = 'pending';
    } else if (order.status === 'scheduling') {
      order.status = 'pending';
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: {
        order: buildOrderResponse(order),
      },
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
