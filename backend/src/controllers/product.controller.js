const mongoose = require('mongoose');
const path = require('path');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { normalizeLocationId } = require('../utils/location');
const { buildRelativeFileUrl, getPublicBaseUrl, normalizeMediaUrl } = require('../utils/media');
const { uploadToCloudinaryIfConfigured } = require('../utils/cloudinaryUpload');

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



const buildSellerResponse = (seller, baseUrl = null) => {
  if (!seller) return null;

  if (!seller.fullName && !seller.email) {
    return { id: seller.toString ? seller.toString() : seller };
  }

  return {
    id: seller._id,
    fullName: seller.fullName,
    email: seller.email,
    // avatarUrl may be a relative path from seeds; normalize on response side
    avatarUrl: normalizeMediaUrl(seller.profile?.avatarUrl || null, baseUrl),
    bio: seller.profile?.bio || null,
    city: seller.location?.city || null,
    campusArea: seller.location?.campusArea || null,
    isVerified: Boolean(seller.isVerified),
    verified: Boolean(seller.isVerified),
    rating: seller.trustStats?.averageRating || seller.stats?.averageRating || null,
    stats: seller.stats || null,
    trustStats: seller.trustStats || null,
    followersCount: seller.followersCount || 0,
    followingCount: seller.followingCount || 0,
  };
};

const getIdString = (value) => {
  if (!value) return null;
  if (value._id) return value._id.toString();
  if (value.toString) return value.toString();
  return String(value);
};

const buildBookingResponse = (order) => {
  if (!order) return undefined;

  const note = order.timeSlot?.note || order.finalTime?.note || order.note || '';
  const time = note.startsWith('Time:') ? note.replace(/^Time:\s*/i, '').trim() : note;

  return {
    time,
    spot: order.meetingSpot || order.meetingLocationId || '',
  };
};

const getImageUrl = (image) => {
  if (!image) return null;
  if (typeof image === 'string') return image;
  return image.url || null;
};

const buildImageResponse = (image, baseUrl) => {
  if (!image) return image;
  if (typeof image === 'string') {
    return {
      url: normalizeMediaUrl(image, baseUrl),
      alt: 'product-image',
    };
  }

  const leanImg = image.toObject ? image.toObject() : image;
  return {
    ...leanImg,
    url: normalizeMediaUrl(getImageUrl(leanImg), baseUrl),
  };
};

const buildProductResponse = (product, baseUrl = null, options = {}) => ({
  id: product._id,
  title: product.title,
  description: product.description,
  price: product.price,
  stock: product.stock,
  originalPrice: product.originalPrice,
  discountPercent: product.discountPercent,
  category: product.category,
  productStatus: product.productStatus,
  purchaseDate: product.purchaseDate,
  usageLevel: product.usageLevel,
  videoUrl: normalizeMediaUrl(product.videoUrl, baseUrl) || null,
  isFeatured: product.isFeatured,
  status: product.status === 'available' ? 'in-stock' : product.status,
  location: product.location,
  meetingSpots: product.meetingSpots,
  availableTimeSlots: product.availableTimeSlots,
  reservedBy: options.reservedBy || getIdString(product.reservedBy),
  booking: options.booking,
  images: Array.isArray(product.images)
    ? product.images.map((img) => buildImageResponse(img, baseUrl))
    : product.images,
  image: normalizeMediaUrl((product.images && product.images.length) ? getImageUrl(product.images[0]) : null, baseUrl),
  seller: buildSellerResponse(product.seller, baseUrl),
  viewCount: product.viewCount,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const pickUpdateFields = (payload, options = {}) => {
  const { isAdmin = false, allowStatus = false } = options;
  const allowedFields = [
    'title',
    'description',
    'price',
    'originalPrice',
    'category',
    'productStatus',
    'purchaseDate',
    'usageLevel',
    'videoUrl',
    'location',
    'meetingSpots',
    'availableTimeSlots',
    'images',
  ];

  if (isAdmin) {
    allowedFields.push('isFeatured', 'discountPercent');
  }

  if (isAdmin || allowStatus) {
    allowedFields.push('status');
  }

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
  return buildRelativeFileUrl(rootDir, filePath);
};

exports.createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      stock,
      originalPrice,
      discountPercent,
      category,
      productStatus,
      purchaseDate,
      usageLevel,
      videoUrl,
      isFeatured,
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
    const normalizedOriginalPrice = parseNumber(originalPrice);
    let normalizedDiscountPercent = parseNumber(discountPercent);
    const normalizedStock = parseNumber(stock);
    const normalizedIsFeatured = String(isFeatured).toLowerCase() === 'true';

    if (normalizedOriginalPrice && price && normalizedOriginalPrice > price) {
      normalizedDiscountPercent = Math.round(((normalizedOriginalPrice - price) / normalizedOriginalPrice) * 100);
    } else if (normalizedDiscountPercent === null) {
      normalizedDiscountPercent = 0;
    }

    const baseImages = [];
    if (Array.isArray(normalizedImages)) {
      baseImages.push(...normalizedImages);
    } else if (normalizedImages && typeof normalizedImages === 'object') {
      baseImages.push(normalizedImages);
    }

    let uploadedFiles = [];
    if (!req.files) {
      uploadedFiles = [];
    } else if (Array.isArray(req.files)) {
      uploadedFiles = req.files;
    } else if (typeof req.files === 'object') {
      uploadedFiles = Object.values(req.files).flat();
    }

    const uploadedImageFiles = uploadedFiles
      .filter((f) => f && f.fieldname === 'images');
    const uploadedImages = await Promise.all(
      uploadedImageFiles.map(async (file) => {
        const cloudinaryFile = await uploadToCloudinaryIfConfigured(file, 'husttrade/products');
        return {
          url: cloudinaryFile?.url || buildImageUrl(req, file.path),
          publicId: cloudinaryFile?.publicId,
          alt: file.originalname || 'product-image',
        };
      })
    );

    const videoFile = uploadedFiles.find((f) => f && f.fieldname === 'video');
    const cloudinaryVideo = await uploadToCloudinaryIfConfigured(videoFile, 'husttrade/products/videos');
    const finalImages = [...baseImages, ...uploadedImages];

    const product = await Product.create({
      title,
      description,
      price,
      stock: normalizedStock ?? undefined,
      originalPrice: normalizedOriginalPrice,
      discountPercent: normalizedDiscountPercent,
      category,
      productStatus,
      purchaseDate,
      usageLevel,
      isFeatured: normalizedIsFeatured,
      status,
      location: normalizedLocation,
      meetingSpots: normalizedMeetingSpots,
      availableTimeSlots: normalizedAvailableTimeSlots,
      images: finalImages,
      videoUrl: cloudinaryVideo?.url || (videoFile ? buildImageUrl(req, videoFile.path) : (videoUrl || undefined)),
      seller: req.user._id,
    });

    const baseUrl = getPublicBaseUrl(req);
    res.status(201).json({
      success: true,
      data: {
        product: buildProductResponse(product, baseUrl),
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
    } else {
      // Only show available and reserved products; hide sold and inactive
      filter.status = { $in: ['available', 'reserved'] };
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
        { meetingSpots: locationRegex },
      ]);
    }

    const campusAreaValue = (req.query.campusArea || '').trim();
    if (campusAreaValue) {
      const campusRegex = new RegExp(escapeRegex(campusAreaValue), 'i');
      const areaOrConditions = [
        { 'location.campusArea': campusRegex },
        { meetingSpots: campusRegex },
      ];

      // Legacy DB values from seed data that the frontend maps to each display area
      const LEGACY_AREA_VALUES = {
        'Nhà B1': ['KTX Bách Khoa', 'B1', 'b1', null, ''],
        'Parabol': ['Khu giảng đường'],
        'Trần Đại Nghĩa': ['Khu thực hành'],
      };

      for (const [key, legacyValues] of Object.entries(LEGACY_AREA_VALUES)) {
        if (campusAreaValue.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(campusAreaValue.toLowerCase())) {
          areaOrConditions.push({ 'location.campusArea': { $in: legacyValues } });
          if (key === 'Nhà B1') {
            // Nhà B1 is the default area — include products with no campusArea field at all
            areaOrConditions.push({ 'location.campusArea': { $exists: false } });
          }
          break;
        }
      }

      const areaCondition = { $or: areaOrConditions };
      filter.$and = filter.$and ? [...filter.$and, areaCondition] : [areaCondition];
    }

    ['dorm', 'district', 'city'].forEach((field) => {
      const value = req.query[field];
      if (value) {
        filter[`location.${field}`] = new RegExp(escapeRegex(String(value)), 'i');
      }
    });

    if (keyword) {
      // AND logic: every word in the query must appear in title, description, or category
      const searchWords = keyword.trim().split(/\s+/).filter(Boolean);
      const wordConditions = searchWords.map((w) => ({
        $or: [
          { title: new RegExp(escapeRegex(w), 'i') },
          { description: new RegExp(escapeRegex(w), 'i') },
          { category: new RegExp(escapeRegex(w), 'i') },
        ],
      }));
      filter.$and = filter.$and ? [...filter.$and, ...wordConditions] : wordConditions;
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
    }

    const projection = {};
    const sellerPopulate = 'fullName email profile.avatarUrl profile.bio location isVerified stats trustStats followersCount followingCount';

    const [products, total] = await Promise.all([
      Product.find(filter, projection).populate('seller', sellerPopulate).sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    const baseUrl = getPublicBaseUrl(req);
    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: {
        products: products.map((product) => buildProductResponse(product, baseUrl)),
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

    const product = await Product.findById(id).populate(
      'seller',
      'fullName email profile.avatarUrl profile.bio location isVerified stats trustStats followersCount followingCount'
    );
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    const baseUrl = getPublicBaseUrl(req);
    let activeOrder = null;

    if (req.user && product.status === 'reserved') {
      activeOrder = await Order.findOne({
        'items.product': id,
        buyer: req.user._id,
        status: { $in: ['scheduling', 'pending'] },
      }).sort({ updatedAt: -1, createdAt: -1 });
    }

    const productData = product.toObject();
    const sellerId = productData.seller?._id || productData.seller?.id || productData.seller;

    if (sellerId) {
      const sellerObjectId = new mongoose.Types.ObjectId(String(sellerId));
      const [soldAgg, reviewAgg] = await Promise.all([
        Order.aggregate([
          { $match: { seller: sellerObjectId, status: 'completed' } },
          { $unwind: '$items' },
          { $group: { _id: '$seller', totalSold: { $sum: '$items.quantity' } } },
        ]),
        Review.aggregate([
          { $match: { reviewedUser: sellerObjectId } },
          { $group: { _id: '$reviewedUser', averageRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } },
        ]),
      ]);

      const soldCount = soldAgg?.[0]?.totalSold ?? productData.seller?.stats?.totalSold ?? 0;
      const rawAvg = reviewAgg?.[0]?.averageRating;
      const averageRating = Number.isFinite(rawAvg)
        ? Number(Number(rawAvg).toFixed(2))
        : (productData.seller?.trustStats?.averageRating ?? 0);
      const totalReviews = reviewAgg?.[0]?.totalReviews ?? productData.seller?.trustStats?.totalTransactions ?? 0;

      productData.seller = {
        ...productData.seller,
        stats: {
          ...(productData.seller?.stats || {}),
          totalSold: soldCount,
        },
        trustStats: {
          ...(productData.seller?.trustStats || {}),
          averageRating,
          totalTransactions: totalReviews,
        },
      };
    }

    res.status(200).json({
      success: true,
      data: {
        product: buildProductResponse(productData, baseUrl, {
          booking: buildBookingResponse(activeOrder),
          reservedBy: activeOrder ? getIdString(activeOrder.buyer) : null,
        }),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy thông tin sản phẩm.',
    });
  }
};

exports.getHomeFeed = async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 12, 24);
    const sellerPopulate = 'fullName email profile.avatarUrl profile.bio location isVerified stats trustStats followersCount followingCount';

    const [featuredProducts, latestProducts, topSellers] = await Promise.all([
      Product.find({ status: 'available', isFeatured: true })
        .populate('seller', sellerPopulate)
        .sort({ createdAt: -1 })
        .limit(Math.min(limit, 8)),
      Product.find({ status: 'available' })
        .populate('seller', sellerPopulate)
        .sort({ viewCount: -1, createdAt: -1 })
        .limit(limit),
      User.find({ status: 'active' })
        .select('fullName email profile.avatarUrl profile.bio location isVerified stats trustStats followersCount followingCount')
        .sort({ 'trustStats.averageRating': -1, followersCount: -1, 'stats.totalListings': -1 })
        .limit(6),
    ]);

    const baseUrl = getPublicBaseUrl(req);
    res.status(200).json({
      success: true,
      data: {
        featuredProducts: featuredProducts.map((product) => buildProductResponse(product, baseUrl)),
        latestProducts: latestProducts.map((product) => buildProductResponse(product, baseUrl)),
        topSellers: topSellers.map((seller) => buildSellerResponse(seller, baseUrl)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy dữ liệu trang chủ.',
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
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật sản phẩm này.',
      });
    }

    // Parse JSON strings that arrive as plain text from multipart/form-data
    const fieldsToNormalize = ['availableTimeSlots', 'meetingSpots', 'location', 'images'];
    fieldsToNormalize.forEach((field) => {
      if (typeof req.body[field] === 'string') {
        req.body[field] = parseMaybeJson(req.body[field]);
      }
    });

    const updates = pickUpdateFields(req.body, { isAdmin, allowStatus: isOwner });

    // Handle newly uploaded image files (requires maybeUploadProductImages middleware on route)
    let uploadedFiles = [];
    if (!req.files) {
      uploadedFiles = [];
    } else if (Array.isArray(req.files)) {
      uploadedFiles = req.files;
    } else if (typeof req.files === 'object') {
      uploadedFiles = Object.values(req.files).flat();
    }

    const uploadedImageFiles = uploadedFiles.filter((f) => f && f.fieldname === 'images');
    if (uploadedImageFiles.length > 0) {
      const newImages = await Promise.all(
        uploadedImageFiles.map(async (file) => {
          const cloudinaryFile = await uploadToCloudinaryIfConfigured(file, 'husttrade/products');
          return {
            url: cloudinaryFile?.url || buildImageUrl(req, file.path),
            publicId: cloudinaryFile?.publicId,
            alt: file.originalname || 'product-image',
          };
        })
      );
      // Append new images to existing ones (max 6 total)
      const existingImages = Array.isArray(product.images) ? product.images : [];
      updates.images = [...existingImages, ...newImages].slice(0, 6);
    }

    const newPrice = updates.price !== undefined ? updates.price : product.price;
    const newOriginalPrice = updates.originalPrice !== undefined ? updates.originalPrice : product.originalPrice;

    if (newOriginalPrice && newPrice && newOriginalPrice > newPrice) {
      updates.discountPercent = Math.round(((newOriginalPrice - newPrice) / newOriginalPrice) * 100);
    } else if (newOriginalPrice && newPrice && newOriginalPrice <= newPrice) {
      updates.discountPercent = 0;
    }

    Object.assign(product, updates);
    await product.save();

    const baseUrl = getPublicBaseUrl(req);
    res.status(200).json({
      success: true,
      data: {
        product: buildProductResponse(product, baseUrl),
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

    const existingOrder = await Order.findOne({
      'items.product': id,
      status: { $in: ['scheduling', 'pending'] },
    });

    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: 'Sản phẩm đang có đơn hàng đang xử lý.',
      });
    }

    const {
      meetingLocationId,
      meetingSpot,
      proposedTimeSlots,
      timeSlot,
      finalTime,
      note,
    } = req.body;

    if (proposedTimeSlots || timeSlot || finalTime) {
      return res.status(400).json({
        success: false,
        message: 'Không thể chọn khung giờ khi tạo đơn hàng.',
      });
    }

    const normalizedLocationId = normalizeLocationId(meetingLocationId);
    const meetingLocationText = typeof meetingLocationId === 'string' ? meetingLocationId.trim() : '';
    const normalizedSpot = typeof meetingSpot === 'string' ? meetingSpot.trim() : '';
    const rawSpot = normalizedSpot || (normalizedLocationId ? '' : meetingLocationText);
    const spotAsLocationId = normalizeLocationId(rawSpot);

    if (!rawSpot && !normalizedLocationId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn hoặc nhập địa điểm giao dịch.',
      });
    }

    const finalMeetingLocationId = normalizedLocationId || spotAsLocationId || undefined;
    const finalMeetingSpot = rawSpot || undefined;

    let reservedProduct;

    try {
      reservedProduct = await Product.findOneAndUpdate(
        { _id: id, status: 'available' },
        { status: 'reserved', reservedBy: req.user._id },
        { returnDocument: 'after' }
      );

      if (!reservedProduct) {
        return res.status(409).json({
          success: false,
          message: 'Sản phẩm đã có người đặt.',
        });
      }

      const order = await Order.create({
        items: [
          {
            product: id,
            quantity: 1,
            price: product.price,
          },
        ],
        totalPrice: product.price,
        buyer: req.user._id,
        seller: product.seller,
        meetingLocationId: finalMeetingLocationId,
        meetingSpot: finalMeetingSpot,
        note,
        status: 'scheduling',
      });

      const baseUrl = getPublicBaseUrl(req);
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
          product: buildProductResponse(reservedProduct, baseUrl, {
            booking: buildBookingResponse(order),
          }),
        },
      });
    } catch (error) {
      if (reservedProduct) {
        await Product.findByIdAndUpdate(reservedProduct._id, { status: 'available', reservedBy: null });
      }

      throw error;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi giữ chỗ sản phẩm.',
    });
  }
};

exports.rescheduleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ.' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
    }

    if (product.seller?.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Bạn không thể đổi lịch hẹn cho sản phẩm của chính mình.' });
    }

    if (product.status !== 'reserved') {
      return res.status(409).json({ success: false, message: 'Sản phẩm chưa được đặt hẹn.' });
    }

    const order = await Order.findOne({
      'items.product': id,
      buyer: req.user._id,
      status: { $in: ['scheduling', 'pending'] },
    }).sort({ updatedAt: -1, createdAt: -1 });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn để đổi.' });
    }

    // ensure the authenticated user is the buyer
    if (!order.buyer || order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền đổi lịch cho đơn hàng này.' });
    }

    const { meetingLocationId, meetingSpot, note } = req.body;

    const normalizedLocationId = normalizeLocationId(meetingLocationId);
    const meetingLocationText = typeof meetingLocationId === 'string' ? meetingLocationId.trim() : '';
    const normalizedSpot = typeof meetingSpot === 'string' ? meetingSpot.trim() : '';
    const rawSpot = normalizedSpot || (normalizedLocationId ? '' : meetingLocationText);
    const spotAsLocationId = normalizeLocationId(rawSpot);

    if (!rawSpot && !normalizedLocationId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hoặc nhập địa điểm giao dịch.' });
    }

    const finalMeetingLocationId = normalizedLocationId || spotAsLocationId || undefined;
    const finalMeetingSpot = rawSpot || undefined;

    order.meetingLocationId = finalMeetingLocationId;
    order.meetingSpot = finalMeetingSpot;
    if (typeof note === 'string') order.note = note.trim();

    await order.save();

    const baseUrl = getPublicBaseUrl(req);
    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật lịch hẹn.',
      data: {
        order: {
          id: order._id,
          status: order.status,
          meetingLocationId: order.meetingLocationId,
          meetingSpot: order.meetingSpot,
          note: order.note,
        },
        product: buildProductResponse(product, baseUrl),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi server khi đổi lịch hẹn.' });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const q = (req.query.keyword || req.query.search || req.query.q || '').trim();
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 10, 50);

    if (q.length < 2) {
      return res.status(200).json({ success: true, data: { suggestions: [] } });
    }

    // Use prefix-anchored regex to favor index usage for prefix searches.
    const prefix = '^' + escapeRegex(q);
    const regex = new RegExp(prefix, 'i');

    const candidates = await Product.find({
      $or: [{ title: regex }, { category: regex }],
    })
      .select('title category')
      .limit(limit * 3)
      .lean();

    const seen = new Set();
    const suggestions = [];

    for (const c of candidates) {
      if (c.title) {
        const key = c.title.trim().toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          suggestions.push({ type: 'title', value: c.title });
        }
      }
      if (c.category) {
        const key = c.category.trim().toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          suggestions.push({ type: 'category', value: c.category });
        }
      }
      if (suggestions.length >= limit) break;
    }

    return res.status(200).json({ success: true, data: { suggestions: suggestions.slice(0, limit) } });
  } catch (error) {
    console.error('getSuggestions error', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi server khi lấy gợi ý tìm kiếm.' });
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

    const images = await Promise.all(
      req.files.map(async (file) => {
        const cloudinaryFile = await uploadToCloudinaryIfConfigured(file, 'husttrade/products');
        return {
          url: cloudinaryFile?.url || buildImageUrl(req, file.path),
          publicId: cloudinaryFile?.publicId,
          alt: file.originalname || 'product-image',
        };
      })
    );

    product.images = [...(product.images || []), ...images];
    await product.save();

    const baseUrl = getPublicBaseUrl(req);
    res.status(200).json({
      success: true,
      data: {
        product: buildProductResponse(product, baseUrl),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi thêm ảnh sản phẩm.',
    });
  }
};
