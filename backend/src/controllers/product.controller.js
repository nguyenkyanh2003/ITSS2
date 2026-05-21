const mongoose = require('mongoose');
const path = require('path');
const Product = require('../models/product.model');
const Order = require('../models/Order');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseList = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseMaybeJson = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const shouldParse =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));

  if (!shouldParse) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return value;
  }
};

const appendOrConditions = (filter, conditions) => {
  if (!conditions.length) {
    return;
  }

  if (!filter.$or) {
    filter.$or = conditions;
    return;
  }

  filter.$or = filter.$or.concat(conditions);
};

const buildProductResponse = (product) => ({
  id: product._id,
  title: product.title,
  description: product.description,
  price: product.price,
  category: product.category,
  productStatus: product.productStatus,
  purchaseDate: product.purchaseDate,
  usageLevel: product.usageLevel,
  videoUrl: product.videoUrl,
  status: product.status,
  location: product.location,
  meetingSpots: product.meetingSpots,
  availableTimeSlots: product.availableTimeSlots,
  images: product.images,
  seller: product.seller,
  viewCount: product.viewCount,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const pickUpdateFields = (payload) => {
  const allowedFields = [
    'title',
    'description',
    'price',
    'category',
    'productStatus',
    'purchaseDate',
    'usageLevel',
    'videoUrl',
    'status',
    'location',
    'meetingSpots',
    'availableTimeSlots',
    'images',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      updates[field] = payload[field];
    }
  });

  return updates;
};

const resolveProductStatusParam = (query) =>
  query.productStatus || query.product_status || query.condition || '';

const buildImageUrl = (req, filePath) => {
  const rootDir = path.join(__dirname, '..', '..');
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  return `${req.protocol}://${req.get('host')}/${relativePath}`;
};

exports.createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      productStatus,
      purchaseDate,
      usageLevel,
      videoUrl,
      status,
      location,
      meetingSpots,
      availableTimeSlots,
      images,
    } = req.body;

    if (!title || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tiêu đề và giá sản phẩm.',
      });
    }

    const normalizedLocation = parseMaybeJson(location);
    const normalizedMeetingSpots = parseMaybeJson(meetingSpots);
    const normalizedAvailableTimeSlots = parseMaybeJson(availableTimeSlots);
    const normalizedImages = parseMaybeJson(images);

    const baseImages = [];
    if (Array.isArray(normalizedImages)) {
      baseImages.push(...normalizedImages);
    } else if (normalizedImages && typeof normalizedImages === 'object') {
      baseImages.push(normalizedImages);
    }

    const uploadedImages = (req.files || []).map((file) => ({
      url: buildImageUrl(req, file.path),
      alt: file.originalname || 'product-image',
    }));

    const finalImages = [...baseImages, ...uploadedImages];

    const product = await Product.create({
      title,
      description,
      price,
      category,
      productStatus,
      purchaseDate,
      usageLevel,
      videoUrl,
      status,
      location: normalizedLocation,
      meetingSpots: normalizedMeetingSpots,
      availableTimeSlots: normalizedAvailableTimeSlots,
      images: finalImages,
      seller: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: {
        product: buildProductResponse(product),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi tạo sản phẩm.',
    });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const keyword = (req.query.keyword || req.query.search || req.query.q || '').trim();
    const categories = parseList(req.query.category || req.query.category_id);
    const statuses = parseList(req.query.status);
    const productStatuses = parseList(resolveProductStatusParam(req.query));

    const minPrice = parseNumber(req.query.minPrice || req.query.min_price);
    const maxPrice = parseNumber(req.query.maxPrice || req.query.max_price);

    const filter = {};

    if (categories.length) {
      filter.category = { $in: categories };
    }

    if (statuses.length) {
      filter.status = { $in: statuses };
    }

    if (productStatuses.length) {
      filter.productStatus = { $in: productStatuses };
    }

    if (minPrice !== null || maxPrice !== null) {
      filter.price = {};
      if (minPrice !== null) {
        filter.price.$gte = minPrice;
      }
      if (maxPrice !== null) {
        filter.price.$lte = maxPrice;
      }
    }

    const locationKeyword = (req.query.location || '').trim();
    if (locationKeyword) {
      const locationRegex = new RegExp(escapeRegex(locationKeyword), 'i');
      appendOrConditions(filter, [
        { 'location.campusArea': locationRegex },
        { 'location.dorm': locationRegex },
        { 'location.district': locationRegex },
        { 'location.city': locationRegex },
      ]);
    }

    ['campusArea', 'dorm', 'district', 'city'].forEach((field) => {
      const value = req.query[field];
      if (value) {
        filter[`location.${field}`] = new RegExp(escapeRegex(String(value)), 'i');
      }
    });

    if (keyword) {
      filter.$text = { $search: keyword };
    }

    const sortBy = String(req.query.sort_by || '').toLowerCase();
    let sort = { createdAt: -1 };

    if (sortBy === 'price_asc') {
      sort = { price: 1, createdAt: -1 };
    } else if (sortBy === 'price_desc') {
      sort = { price: -1, createdAt: -1 };
    } else if (sortBy === 'created_at_asc') {
      sort = { createdAt: 1 };
    } else if (sortBy === 'created_at_desc') {
      sort = { createdAt: -1 };
    } else if (sortBy === 'relevance' && keyword) {
      sort = { score: { $meta: 'textScore' } };
    } else if (keyword) {
      sort = { score: { $meta: 'textScore' }, createdAt: -1 };
    }

    const projection = keyword ? { score: { $meta: 'textScore' } } : {};

    const [products, total] = await Promise.all([
      Product.find(filter, projection).sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
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
        products: products.map((product) => buildProductResponse(product)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy danh sách sản phẩm.',
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID sản phẩm không hợp lệ.',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        product: buildProductResponse(product),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy thông tin sản phẩm.',
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID sản phẩm không hợp lệ.',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    const isOwner = product.seller?.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật sản phẩm này.',
      });
    }

    const updates = pickUpdateFields(req.body);
    Object.assign(product, updates);
    await product.save();

    res.status(200).json({
      success: true,
      data: {
        product: buildProductResponse(product),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật sản phẩm.',
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID sản phẩm không hợp lệ.',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    const isOwner = product.seller?.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa sản phẩm này.',
      });
    }

    product.status = 'inactive';
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Sản phẩm đã được ngừng hiển thị.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi xóa sản phẩm.',
    });
  }
};

exports.reserveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID sản phẩm không hợp lệ.',
      });
    }

    const product = await Product.findById(id);
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
      product: id,
      status: { $in: ['scheduling', 'pending'] },
    });

    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: 'Sản phẩm đang có đơn hàng đang xử lý.',
      });
    }

    const { meetingSpot, timeSlot, note } = req.body;

    const order = await Order.create({
      product: id,
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
        order: {
          id: order._id,
          status: order.status,
          product: order.product,
          buyer: order.buyer,
          seller: order.seller,
        },
        product: buildProductResponse(product),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi giữ chỗ sản phẩm.',
    });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const keyword = (req.query.keyword || req.query.search || req.query.q || '').trim();
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 10, 20);

    if (!keyword) {
      return res.status(200).json({
        success: true,
        data: {
          suggestions: [],
        },
      });
    }

    const regex = new RegExp(escapeRegex(keyword), 'i');
    const candidates = await Product.find({
      $or: [{ title: regex }, { category: regex }, { description: regex }],
    })
      .select('title category')
      .limit(limit * 2);

    const suggestions = [];
    const seen = new Set();

    candidates.forEach((product) => {
      if (product.title && !seen.has(product.title)) {
        suggestions.push({ type: 'title', value: product.title });
        seen.add(product.title);
      }

      if (product.category && !seen.has(product.category)) {
        suggestions.push({ type: 'category', value: product.category });
        seen.add(product.category);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        suggestions: suggestions.slice(0, limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy gợi ý tìm kiếm.',
    });
  }
};

exports.addProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID sản phẩm không hợp lệ.',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    const isOwner = product.seller?.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật sản phẩm này.',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một ảnh.',
      });
    }

    const images = req.files.map((file) => ({
      url: buildImageUrl(req, file.path),
      alt: file.originalname || 'product-image',
    }));

    product.images = [...(product.images || []), ...images];
    await product.save();

    res.status(200).json({
      success: true,
      data: {
        product: buildProductResponse(product),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi thêm ảnh sản phẩm.',
    });
  }
};
