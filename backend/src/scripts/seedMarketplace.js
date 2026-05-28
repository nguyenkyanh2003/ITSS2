require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Product = require('../models/product.model');

const imagePath = (fileName) => `/config/do_sv/${fileName}`;

const sellers = [
  {
    fullName: 'Nguyễn Minh Anh',
    email: 'minhanh@sis.hust.edu.vn',
    phoneNumber: '0901234567',
    password: '12345678',
    role: 'user',
    status: 'active',
    isVerified: true,
    student: {
      studentId: '20260011',
      faculty: 'Công nghệ thông tin',
      cohort: 'K70',
      className: 'IT01',
    },
    profile: {
      avatarUrl: imagePath('macbook_pro.jpg'),
      bio: 'Bán đồ công nghệ, laptop và phụ kiện học tập.',
      gender: 'female',
    },
    location: {
      campusArea: 'KTX Bách Khoa',
      dorm: 'A2',
      district: 'Hai Bà Trưng',
      city: 'Hà Nội',
    },
    contactPreferences: {
      showPhone: true,
      preferredContact: 'zalo',
    },
    followersCount: 128,
    followingCount: 24,
    stats: { totalListings: 0, totalSold: 18, totalBought: 6 },
    trustStats: { averageRating: 4.9, totalTransactions: 26, isBlacklisted: false },
    lastActiveAt: new Date(),
  },
  {
    fullName: 'Trần Thu Hằng',
    email: 'thuhang@sis.hust.edu.vn',
    phoneNumber: '0912345678',
    password: '12345678',
    role: 'user',
    status: 'active',
    isVerified: true,
    student: {
      studentId: '20260012',
      faculty: 'Kinh tế',
      cohort: 'K69',
      className: 'KT02',
    },
    profile: {
      avatarUrl: imagePath('balo.jpg'),
      bio: 'Chuyên đồ gia dụng nhỏ và sách giáo trình.',
      gender: 'female',
    },
    location: {
      campusArea: 'Khu giảng đường',
      dorm: 'C5',
      district: 'Cầu Giấy',
      city: 'Hà Nội',
    },
    contactPreferences: {
      showPhone: true,
      preferredContact: 'phone',
    },
    followersCount: 84,
    followingCount: 19,
    stats: { totalListings: 0, totalSold: 11, totalBought: 4 },
    trustStats: { averageRating: 4.8, totalTransactions: 15, isBlacklisted: false },
    lastActiveAt: new Date(),
  },
  {
    fullName: 'Lê Hoàng Nam',
    email: 'hoangnam@sis.hust.edu.vn',
    phoneNumber: '0923456789',
    password: '12345678',
    role: 'user',
    status: 'active',
    isVerified: true,
    student: {
      studentId: '20260013',
      faculty: 'Điện - Điện tử',
      cohort: 'K70',
      className: 'EE03',
    },
    profile: {
      avatarUrl: imagePath('den_hoc.jpg'),
      bio: 'Đồ điện tử, đồ học tập, đồ phòng trọ.',
      gender: 'male',
    },
    location: {
      campusArea: 'KTX Bách Khoa',
      dorm: 'B1',
      district: 'Hai Bà Trưng',
      city: 'Hà Nội',
    },
    contactPreferences: {
      showPhone: true,
      preferredContact: 'zalo',
    },
    followersCount: 96,
    followingCount: 33,
    stats: { totalListings: 0, totalSold: 12, totalBought: 7 },
    trustStats: { averageRating: 4.7, totalTransactions: 19, isBlacklisted: false },
    lastActiveAt: new Date(),
  },
  {
    fullName: 'Phạm Ngọc Lan',
    email: 'ngoclan@sis.hust.edu.vn',
    phoneNumber: '0934567890',
    password: '12345678',
    role: 'user',
    status: 'active',
    isVerified: true,
    student: {
      studentId: '20260014',
      faculty: 'Công nghệ thực phẩm',
      cohort: 'K69',
      className: 'TP04',
    },
    profile: {
      avatarUrl: imagePath('dong_phuc_bach_khoa.jpg'),
      bio: 'Đồ dùng cá nhân, quần áo, phụ kiện.',
      gender: 'female',
    },
    location: {
      campusArea: 'Thư viện TTA',
      dorm: 'D1',
      district: 'Hai Bà Trưng',
      city: 'Hà Nội',
    },
    contactPreferences: {
      showPhone: true,
      preferredContact: 'phone',
    },
    followersCount: 71,
    followingCount: 20,
    stats: { totalListings: 0, totalSold: 9, totalBought: 5 },
    trustStats: { averageRating: 4.6, totalTransactions: 14, isBlacklisted: false },
    lastActiveAt: new Date(),
  },
];

const imageDir = path.join(__dirname, '..', 'config', 'do_sv');
const imageFiles = fs
  .readdirSync(imageDir)
  .filter((file) => /\.(jpe?g|png)$/i.test(file))
  .sort((left, right) => left.localeCompare(right, 'vi'));

const titleOverrides = {
  'am_sieu_toc': 'Ấm siêu tốc 1.8L',
  'bai_tap_vat_ly_dai_cuong': 'Bài tập Vật lý đại cương',
  'balo': 'Balo sinh viên đa năng',
  'ban_hoc': 'Bàn học gấp gọn',
  'ban_phim_co': 'Bàn phím cơ',
  'ban_phim_co_bluetooth': 'Bàn phím cơ Bluetooth',
  'ban_phim_chuot': 'Bộ bàn phím chuột',
  'bep_tu': 'Bếp từ mini sinh viên',
  'binh_giu_nhiet': 'Bình giữ nhiệt 500ml',
  'bo_ban_hoc': 'Bộ bàn học sinh viên',
  'bo_ban_phim_chuot': 'Bộ bàn phím chuột',
  'cam_nang_danh_gia_tu_duy': 'Cẩm nang đánh giá tư duy',
  'chuot_vi_tinh': 'Chuột vi tính không dây',
  'den_hoc': 'Đèn học LED tiết kiệm điện',
  'dong_phuc_bach_khoa': 'Áo đồng phục Bách Khoa',
  'ghe': 'Ghế gỗ phòng trọ',
  'ghe_ngoi_hoc': 'Ghế ngồi học điều chỉnh',
  'giao_trinh_cau_truc_du_lieu': 'Giáo trình cấu trúc dữ liệu',
  'giao_trinh_giai_tich_iii': 'Giáo trình Giải tích III',
  'giao_trinh_tu_phap_quoc_te': 'Giáo trình Tư pháp quốc tế',
  'giao_trinh_tu_tuong_ho_chi_minh': 'Giáo trình Tư tưởng Hồ Chí Minh',
  'giuong': 'Giường ngủ sinh viên',
  'ipad_vang': 'iPad Air Vàng',
  'laptop_dell': 'Laptop Dell Inspiron',
  'loa_vi_tinh': 'Loa vi tính',
  'lo_vi_song': 'Lò vi sóng mini',
  'lot_chuot': 'Lót chuột gaming',
  'macbook_pro': 'MacBook Pro M1 13 inch',
  'man_hinh_may-tinh': 'Màn hình máy tính 24 inch',
  'may_in_hp': 'Máy in HP',
  'may_tinh_bang': 'Máy tính bảng học tập',
  'may_tinh_de_ban': 'Máy tính để bàn sinh viên',
  'may_say_toc': 'Máy sấy tóc',
  'may_uon_toc': 'Máy uốn tóc',
  'noi_com_dien': 'Nồi cơm điện 1.8L',
  'pc': 'Case PC',
  'quat_cay': 'Quạt cây đứng',
  'sac_du_phong': 'Sạc dự phòng 20.000mAh',
  'sac_du_phong_100w': 'Sạc dự phòng 100W',
  'tai_nghe_airpod': 'Tai nghe AirPods',
  'tai_nghe_hoco': 'Tai nghe Hoco',
  'tu_lanh': 'Tủ lạnh mini',
  'tu_quan_ao': 'Tủ quần áo',
  'xe_dap': 'Xe đạp sinh viên',
};

const categoryRules = [
  { match: /(macbook|laptop_dell|may_tinh_de_ban|man_hinh|pc|may_in|may_tinh_bang|ipad)/i, category: 'Laptop & PC', productStatus: 'used' },
  { match: /(tai_nghe|chuot|ban_phim|lot_chuot|sac_du_phong|loa)/i, category: 'Tai nghe & Phụ kiện', productStatus: 'new' },
  { match: /(giao_trinh|bai_tap|cam_nang)/i, category: 'Giáo trình & Tài liệu', productStatus: 'used' },
  { match: /(dong_phuc|balo|may_uon_toc|may_say_toc)/i, category: 'Thời trang & Phụ kiện', productStatus: 'used' },
  { match: /(den_hoc|am_sieu_toc|noi_com_dien|lo_vi_song|quat_cay|tu_lanh|giuong|tu_quan_ao|bep_tu|binh_giu_nhiet)/i, category: 'Đồ gia dụng nhỏ', productStatus: 'used' },
  { match: /xe_dap/i, category: 'Xe đạp & Phụ tùng', productStatus: 'used' },
  { match: /(iphone|ipad|may_tinh_bang)/i, category: 'Điện thoại & Tablet', productStatus: 'used' },
  { match: /(ghe|ban_hoc|bo_ban_hoc)/i, category: 'Nội thất nhỏ & Đồ phòng', productStatus: 'used' },
];

const sellerEmailCycle = sellers.map((seller) => seller.email);

const humanizeFallback = (value) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\b(\w)/g, (match) => match.toUpperCase())
    .replace(/\bAirpod\b/i, 'AirPods')
    .replace(/\bIpad\b/i, 'iPad')
    .replace(/\bMacbook\b/i, 'MacBook');

const makeUniqueTitle = (baseTitle, baseName, index, usedTitles) => {
  let title = baseTitle;
  if (!usedTitles.has(title)) {
    usedTitles.add(title);
    return title;
  }

  const fallbackCandidates = [
    `${baseTitle} ${index + 1}`,
    `${baseTitle} - ${baseName}`,
    `${baseTitle} (${baseName.replace(/_/g, ' ')})`,
  ];

  for (const candidate of fallbackCandidates) {
    if (!usedTitles.has(candidate)) {
      usedTitles.add(candidate);
      return candidate;
    }
  }

  let suffix = 2;
  while (usedTitles.has(`${baseTitle} ${suffix}`)) {
    suffix += 1;
  }

  title = `${baseTitle} ${suffix}`;
  usedTitles.add(title);
  return title;
};

const pickMeetingSpotText = (meetingSpots = []) => {
  if (!meetingSpots.length) {
    return 'địa điểm thuận tiện';
  }

  if (meetingSpots.length === 1) {
    return meetingSpots[0];
  }

  return `${meetingSpots[0]} hoặc ${meetingSpots[1]}`;
};

const buildDescription = ({ title, category, productStatus, usageLevel, meetingSpots, location }) => {
  const conditionText = productStatus === 'new' ? 'còn mới, ít sử dụng' : 'đã qua sử dụng nhưng vẫn ổn';
  const spotText = pickMeetingSpotText(meetingSpots);
  const campusText = location?.campusArea ? `${location.campusArea}` : 'khuôn viên trường';

  const templates = {
    'Giáo trình & Tài liệu': `${title} phù hợp cho sinh viên, ${conditionText}. Có thể xem hàng trực tiếp tại ${spotText}.`,
    'Laptop & PC': `${title} phù hợp học tập và làm bài tập lớn, ${conditionText}. Có thể kiểm tra trực tiếp tại ${spotText}.`,
    'Tai nghe & Phụ kiện': `${title} tiện cho học online và sử dụng hằng ngày, ${conditionText}. Giao dịch tại ${spotText}.`,
    'Thời trang & Phụ kiện': `${title} phù hợp đi học và đi chơi, ${conditionText}. Xem hàng trực tiếp tại ${spotText}.`,
    'Đồ gia dụng nhỏ': `${title} tiện cho phòng trọ hoặc ký túc xá, ${conditionText}. Nhận hàng tại ${spotText}.`,
    'Xe đạp & Phụ tùng': `${title} phù hợp đi học, ${conditionText}. Có thể xem xe tại ${spotText}.`,
    'Điện thoại & Tablet': `${title} phù hợp học tập và giải trí, ${conditionText}. Giao dịch tại ${spotText}.`,
    'Nội thất nhỏ & Đồ phòng': `${title} phù hợp sắp xếp phòng ở, ${conditionText}. Có thể xem hàng tại ${spotText}.`,
  };

  if (templates[category]) {
    return templates[category];
  }

  return `${title} phù hợp cho sinh viên, ${usageLevel ? usageLevel.toLowerCase() : conditionText}. Xem hàng trực tiếp tại ${campusText}.`;
};

const inferProductMeta = (fileName, index, usedTitles) => {
  const baseName = fileName.replace(/\.(jpe?g|png)$/i, '');
  const rule = categoryRules.find((entry) => entry.match.test(baseName));
  const category = rule?.category || 'Đồ gia dụng nhỏ';
  const productStatus = rule?.productStatus || 'used';
  const title = makeUniqueTitle(titleOverrides[baseName] || humanizeFallback(baseName), baseName, index, usedTitles);

  const priceProfiles = {
    'Laptop & PC': { min: 1800000, max: 18000000 },
    'Tai nghe & Phụ kiện': { min: 60000, max: 2500000 },
    'Giáo trình & Tài liệu': { min: 30000, max: 150000 },
    'Thời trang & Phụ kiện': { min: 80000, max: 500000 },
    'Đồ gia dụng nhỏ': { min: 50000, max: 1800000 },
    'Xe đạp & Phụ tùng': { min: 200000, max: 3500000 },
    'Điện thoại & Tablet': { min: 1200000, max: 9000000 },
    'Nội thất nhỏ & Đồ phòng': { min: 180000, max: 1300000 },
  };

  const profile = priceProfiles[category] || { min: 100000, max: 800000 };
  const ratio = (index % 7) / 6;
  const price = Math.round(profile.min + (profile.max - profile.min) * ratio);
  const originalPrice = Math.round(price * (1.15 + (index % 3) * 0.08));
  const discountPercent = Math.max(5, Math.min(40, Math.round((1 - price / originalPrice) * 100)));
  const isFeatured = index % 6 === 0;

  return {
    title,
    description: buildDescription({
      title,
      category,
      productStatus,
      usageLevel: productStatus === 'new' ? 'Mới 100%, chưa sử dụng.' : 'Đã qua sử dụng, còn tốt.',
      meetingSpots: [
        index % 2 === 0 ? 'Cổng trường' : 'Cổng ký túc xá',
        index % 3 === 0 ? 'Sảnh tầng 1' : 'Sân trung tâm',
      ],
      location: {
        campusArea: index % 4 === 0 ? 'KTX Bách Khoa' : index % 4 === 1 ? 'Khu giảng đường' : index % 4 === 2 ? 'Thư viện TTA' : 'Khu thực hành',
      },
    }),
    price,
    originalPrice,
    discountPercent,
    category,
    productStatus,
    usageLevel: productStatus === 'new' ? 'Mới 100%, chưa sử dụng.' : 'Đã qua sử dụng, còn tốt.',
    status: 'available',
    isFeatured,
    location: {
      campusArea: index % 4 === 0 ? 'KTX Bách Khoa' : index % 4 === 1 ? 'Khu giảng đường' : index % 4 === 2 ? 'Thư viện TTA' : 'Khu thực hành',
      dorm: index % 4 === 0 ? 'A2' : index % 4 === 1 ? 'C5' : index % 4 === 2 ? 'D1' : 'B1',
      district: index % 2 === 0 ? 'Hai Bà Trưng' : 'Cầu Giấy',
      city: 'Hà Nội',
    },
    meetingSpots: [
      index % 2 === 0 ? 'Cổng trường' : 'Cổng ký túc xá',
      index % 3 === 0 ? 'Sảnh tầng 1' : 'Sân trung tâm',
    ],
    availableTimeSlots: [
      {
        startAt: `2026-05-${24 + (index % 4)}T08:00:00.000Z`,
        endAt: `2026-05-${24 + (index % 4)}T12:00:00.000Z`,
        note: 'Có thể xem hàng trực tiếp',
      },
    ],
    images: [{ url: imagePath(fileName), alt: title }],
    sellerEmail: sellerEmailCycle[index % sellerEmailCycle.length],
  };
};

const usedTitles = new Set();
const products = imageFiles.map((fileName, index) => inferProductMeta(fileName, index, usedTitles));

const normalizeLocation = (location = {}) => ({
  ...location,
  city: location.city || 'Hà Nội',
  district: location.district || 'Hai Bà Trưng',
});

const upsertSeller = async (sellerSeed) => {
  const payload = { ...sellerSeed };
  const existing = await User.findOne({ email: payload.email });

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }

  return User.create(payload);
};

const upsertProduct = async (sellerId, productSeed) => {
  const payload = {
    ...productSeed,
    seller: sellerId,
    location: normalizeLocation(productSeed.location),
  };

  const existing = await Product.findOne({ title: payload.title });
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }

  return Product.create(payload);
};

const seedMarketplace = async () => {
  const shouldReset = process.argv.includes('--reset');
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  if (shouldReset) {
    await Product.deleteMany({});
  }

  const sellerDocs = new Map();
  for (const seller of sellers) {
    const doc = await upsertSeller(seller);
    sellerDocs.set(seller.email, doc);
  }

  for (const product of products) {
    const sellerDoc = sellerDocs.get(product.sellerEmail);
    if (!sellerDoc) {
      throw new Error(`Không tìm thấy seller cho sản phẩm: ${product.title}`);
    }

    await upsertProduct(sellerDoc._id, product);
  }

  for (const seller of sellerDocs.values()) {
    const totalListings = await Product.countDocuments({ seller: seller._id });
    seller.stats = {
      ...(seller.stats || {}),
      totalListings,
    };
    seller.lastActiveAt = new Date();
    await seller.save();
  }

  await mongoose.disconnect();
  console.log(`Seed marketplace done. Products: ${products.length}`);
};

seedMarketplace().catch((error) => {
  console.error('Seed marketplace failed:', error.message || error);
  mongoose.disconnect().finally(() => process.exit(1));
});