require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Product = require('../models/product.model');

const imagePath = (fileName) => `/config/do_sv/${fileName}`;

const campusAreaMap = {
  'KTX BK': 'KTX Bách Khoa',
  'KTX Bách Khoa': 'KTX Bách Khoa',
  'Khu giảng đường': 'Khu giảng đường',
  'Thư viện TTA': 'Thư viện TTA',
  'Khu thực hành': 'Khu thực hành',
};

const normalizeLocation = (location = {}) => ({
  ...location,
  campusArea: campusAreaMap[location.campusArea] || location.campusArea,
  district: location.district || 'Hai Bà Trưng',
  city: location.city || 'Hà Nội',
});

const buildImages = (items) =>
  items.map((item) => ({
    url: imagePath(item.file),
    alt: item.alt,
  }));

const buildProduct = (product) => ({
  ...product,
  originalPrice: product.originalPrice ?? product.price,
  discountPercent: product.discountPercent ?? 0,
  isFeatured: product.isFeatured ?? false,
  status: product.status || 'available',
  location: normalizeLocation(product.location),
});

const seedUser = {
  fullName: 'Nguyễn Văn A',
  email: 'demo@sis.hust.edu.vn',
  phoneNumber: '0912345678',
  password: '12345678',
  role: 'admin',
  status: 'active',
  isVerified: true,
  student: {
    studentId: '20260001',
    faculty: 'Công nghệ thông tin',
    cohort: 'K70',
    className: 'CNTT01',
  },
  profile: {
    avatarUrl: imagePath('ghe.jpg'),
    bio: 'Tài khoản mô tả dữ liệu mẫu cho trang chủ và seed database.',
    gender: 'male',
  },
  location: {
    campusArea: 'KTX Bách Khoa',
    dorm: 'A2',
    district: 'Hai Bà Trưng',
    city: 'Hà Nội',
  },
  contactPreferences: {
    showEmail: true,
    showPhone: true,
    preferredContact: 'phone',
  },
};

const products = [
  buildProduct({
    title: 'MacBook Pro M1 13 inch',
    description: 'Máy đẹp, pin tốt, phù hợp học tập và lập trình.',
    price: 18000000,
    originalPrice: 22500000,
    discountPercent: 20,
    category: 'Laptop & máy tính',
    productStatus: 'used',
    usageLevel: 'Sử dụng kỹ, còn ngoại hình đẹp.',
    isFeatured: true,
    location: {
      campusArea: 'KTX Bách Khoa',
      dorm: 'A2',
      district: 'Hai Bà Trưng',
      city: 'Hà Nội',
    },
    meetingSpots: ['Cửa A2', 'Sân trung tâm BKHN'],
    availableTimeSlots: [
      { startAt: '2026-05-24T08:00:00.000Z', endAt: '2026-05-24T12:00:00.000Z', note: 'Có thể xem máy trực tiếp' },
    ],
    images: buildImages([
      { file: 'macbook_pro.jpg', alt: 'MacBook Pro M1' },
      { file: 'man_hinh_may-tinh.jpg', alt: 'Màn hình máy tính' },
    ]),
  }),
  buildProduct({
    title: 'Laptop Dell Inspiron i5',
    description: 'Máy học tập ổn định, chạy Word, Excel và code mượt.',
    price: 9800000,
    originalPrice: 12500000,
    discountPercent: 22,
    category: 'Laptop & máy tính',
    productStatus: 'used',
    usageLevel: 'Đã dùng 1 năm, pin còn tốt.',
    location: { campusArea: 'Khu giảng đường', dorm: 'C6', district: 'Cầu Giấy', city: 'Hà Nội' },
    meetingSpots: ['Cổng C6', 'Thư viện TTA'],
    availableTimeSlots: [{ startAt: '2026-05-25T09:00:00.000Z', endAt: '2026-05-25T11:00:00.000Z', note: 'Có thể test máy tại chỗ' }],
    images: buildImages([{ file: 'laptop_dell.png', alt: 'Laptop Dell Inspiron' }]),
  }),
  buildProduct({
    title: 'Máy tính để bàn sinh viên',
    description: 'Cấu hình đủ mạnh cho đồ án, học online và giải trí nhẹ.',
    price: 6500000,
    originalPrice: 8500000,
    discountPercent: 24,
    category: 'Laptop & máy tính',
    productStatus: 'used',
    usageLevel: 'Máy hoạt động tốt, đã vệ sinh lại.',
    isFeatured: true,
    location: { campusArea: 'Khu thực hành', dorm: 'A4', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Phòng máy A4', 'Cổng sau trường'],
    availableTimeSlots: [{ startAt: '2026-05-25T14:00:00.000Z', endAt: '2026-05-25T18:00:00.000Z', note: 'Có thể xem cấu hình' }],
    images: buildImages([{ file: 'may_tinh_de_ban.jpg', alt: 'Máy tính để bàn' }, { file: 'pc.jpg', alt: 'Case PC' }]),
  }),
  buildProduct({
    title: 'Màn hình máy tính 24 inch',
    description: 'Màn hình Full HD, phù hợp làm việc và học tập tại ký túc xá.',
    price: 2200000,
    originalPrice: 2800000,
    discountPercent: 21,
    category: 'Laptop & máy tính',
    productStatus: 'used',
    usageLevel: 'Không điểm chết, bao test.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'B1', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Cửa B1', 'Sảnh tầng 1'],
    availableTimeSlots: [{ startAt: '2026-05-26T08:00:00.000Z', endAt: '2026-05-26T12:00:00.000Z', note: 'Mang theo dây HDMI nếu cần' }],
    images: buildImages([{ file: 'man_hinh_may-tinh.jpg', alt: 'Màn hình máy tính 24 inch' }]),
  }),
  buildProduct({
    title: 'iPad Air / Máy tính bảng học tập',
    description: 'Hợp ghi chú, đọc PDF và học trực tuyến.',
    price: 7200000,
    originalPrice: 8500000,
    discountPercent: 15,
    category: 'Điện thoại & Tablet',
    productStatus: 'used',
    usageLevel: 'Còn đẹp, pin ổn.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'A3', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Sân A3', 'Canteen khu A'],
    availableTimeSlots: [{ startAt: '2026-05-26T13:00:00.000Z', endAt: '2026-05-26T16:00:00.000Z', note: 'Có thể đăng xuất tài khoản trước khi bán' }],
    images: buildImages([{ file: 'may_tinh_bang.jpg', alt: 'Máy tính bảng' }]),
  }),
  buildProduct({
    title: 'Tai nghe AirPods',
    description: 'Âm thanh tốt, hộp sạc còn mới, phù hợp đi học và nghe nhạc.',
    price: 2500000,
    originalPrice: 3300000,
    discountPercent: 24,
    category: 'Tai nghe & phụ kiện',
    productStatus: 'used',
    usageLevel: 'Dùng ít, còn đủ phụ kiện.',
    isFeatured: true,
    location: { campusArea: 'Khu giảng đường', dorm: 'C5', district: 'Cầu Giấy', city: 'Hà Nội' },
    meetingSpots: ['Cổng C5', 'Nhà xe'],
    availableTimeSlots: [{ startAt: '2026-05-24T18:00:00.000Z', endAt: '2026-05-24T20:00:00.000Z', note: 'Có thể test tai nghe' }],
    images: buildImages([{ file: 'tai_nghe_airpod.jpg', alt: 'Tai nghe AirPods' }]),
  }),
  buildProduct({
    title: 'Tai nghe Hoco',
    description: 'Tai nghe có mic, dùng học online và gọi điện ổn định.',
    price: 180000,
    originalPrice: 250000,
    discountPercent: 28,
    category: 'Tai nghe & phụ kiện',
    productStatus: 'new',
    usageLevel: 'Mới 100%, nguyên hộp.',
    location: { campusArea: 'Thư viện TTA', dorm: 'D1', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Thư viện TTA', 'Phòng đọc tầng 2'],
    availableTimeSlots: [{ startAt: '2026-05-25T10:00:00.000Z', endAt: '2026-05-25T12:00:00.000Z', note: 'Có thể lấy trong giờ hành chính' }],
    images: buildImages([{ file: 'tai_nghe_hoco.jpg', alt: 'Tai nghe Hoco' }]),
  }),
  buildProduct({
    title: 'Sạc dự phòng 20.000mAh',
    description: 'Dung lượng lớn, phù hợp cho sinh viên di chuyển nhiều.',
    price: 320000,
    originalPrice: 450000,
    discountPercent: 29,
    category: 'Tai nghe & phụ kiện',
    productStatus: 'used',
    usageLevel: 'Còn tốt, sạc nhanh ổn định.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'B2', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Sân B2', 'Cửa hàng tiện lợi gần KTX'],
    availableTimeSlots: [{ startAt: '2026-05-26T09:00:00.000Z', endAt: '2026-05-26T11:00:00.000Z', note: 'Có thể test cổng sạc' }],
    images: buildImages([{ file: 'sac_du_phong.jpg', alt: 'Sạc dự phòng' }, { file: 'sac_du_phong_100w.png', alt: 'Sạc dự phòng 100W' }]),
  }),
  buildProduct({
    title: 'Chuột vi tính không dây',
    description: 'Nhỏ gọn, phù hợp đi học và làm việc văn phòng.',
    price: 150000,
    originalPrice: 220000,
    discountPercent: 32,
    category: 'Tai nghe & phụ kiện',
    productStatus: 'used',
    usageLevel: 'Đã dùng 6 tháng.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'A4', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Sảnh A4', 'Cổng sau trường'],
    availableTimeSlots: [{ startAt: '2026-05-24T18:00:00.000Z', endAt: '2026-05-24T20:00:00.000Z', note: 'Có thể giao buổi tối' }],
    images: buildImages([{ file: 'chuot_vi_tinh.jpg', alt: 'Chuột vi tính' }]),
  }),
  buildProduct({
    title: 'Bàn phím cơ Bluetooth',
    description: 'Kết nối Bluetooth, pin ổn, phù hợp code và học tập.',
    price: 780000,
    originalPrice: 980000,
    discountPercent: 20,
    category: 'Tai nghe & phụ kiện',
    productStatus: 'new',
    usageLevel: 'Mới 100%, còn hộp.',
    isFeatured: true,
    location: { campusArea: 'Khu giảng đường', dorm: 'C6', district: 'Cầu Giấy', city: 'Hà Nội' },
    meetingSpots: ['Cổng C6', 'Tiệm sách BK'],
    availableTimeSlots: [{ startAt: '2026-05-25T09:00:00.000Z', endAt: '2026-05-25T12:00:00.000Z', note: 'Có thể xem hàng trực tiếp' }],
    images: buildImages([{ file: 'ban_phim_co_bluetooth.jpg', alt: 'Bàn phím cơ Bluetooth' }, { file: 'ban_phim_co.jpg', alt: 'Bàn phím cơ' }]),
  }),
  buildProduct({
    title: 'Lót chuột gaming',
    description: 'Bề mặt mượt, size lớn, dễ dùng cho học và làm việc.',
    price: 60000,
    originalPrice: 90000,
    discountPercent: 33,
    category: 'Tai nghe & phụ kiện',
    productStatus: 'new',
    usageLevel: 'Chưa dùng, còn nguyên bao bì.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'A1', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Cửa A1', 'Sảnh khu A'],
    availableTimeSlots: [{ startAt: '2026-05-26T08:00:00.000Z', endAt: '2026-05-26T10:00:00.000Z', note: 'Nhận hàng nhanh' }],
    images: buildImages([{ file: 'lot_chuot.jpg', alt: 'Lót chuột gaming' }]),
  }),
  buildProduct({
    title: 'Đèn học LED tiết kiệm điện',
    description: 'Đèn sáng tốt, tiết kiệm điện, phù hợp phòng trọ.',
    price: 190000,
    originalPrice: 260000,
    discountPercent: 27,
    category: 'Đồ gia dụng nhỏ',
    productStatus: 'used',
    usageLevel: 'Còn rất tốt, không lỗi.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'B1', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Cửa B1', 'Hành lang tầng 1'],
    availableTimeSlots: [{ startAt: '2026-05-25T14:00:00.000Z', endAt: '2026-05-25T18:00:00.000Z', note: 'Ưu tiên giao trong ngày' }],
    images: buildImages([{ file: 'den_hoc.jpg', alt: 'Đèn học' }]),
  }),
  buildProduct({
    title: 'Ấm siêu tốc 1.8L',
    description: 'Đun nhanh, phù hợp nấu mì và pha đồ uống nóng.',
    price: 170000,
    originalPrice: 240000,
    discountPercent: 29,
    category: 'Đồ gia dụng nhỏ',
    productStatus: 'used',
    usageLevel: 'Dùng tốt, đã vệ sinh sạch.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'B2', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Sân B2', 'Canteen khu B'],
    availableTimeSlots: [{ startAt: '2026-05-26T13:00:00.000Z', endAt: '2026-05-26T16:00:00.000Z', note: 'Có thể cắm điện test' }],
    images: buildImages([{ file: 'am_sieu_toc.jpg', alt: 'Ấm siêu tốc' }, { file: 'noi_com_dien.jpg', alt: 'Nồi cơm điện' }]),
  }),
  buildProduct({
    title: 'Lò vi sóng mini',
    description: 'Dễ dùng, phù hợp sinh viên ở ký túc xá.',
    price: 520000,
    originalPrice: 720000,
    discountPercent: 28,
    category: 'Đồ gia dụng nhỏ',
    productStatus: 'used',
    usageLevel: 'Còn hoạt động tốt, ít sử dụng.',
    location: { campusArea: 'Khu thực hành', dorm: 'C1', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Cửa C1', 'Sân xe khu C'],
    availableTimeSlots: [{ startAt: '2026-05-26T17:00:00.000Z', endAt: '2026-05-26T20:00:00.000Z', note: 'Có thể test nóng lạnh' }],
    images: buildImages([{ file: 'lo_vi_song.jpg', alt: 'Lò vi sóng mini' }]),
  }),
  buildProduct({
    title: 'Quạt cây đứng',
    description: 'Làm mát nhanh, phù hợp mùa hè trong phòng trọ.',
    price: 240000,
    originalPrice: 320000,
    discountPercent: 25,
    category: 'Đồ gia dụng nhỏ',
    productStatus: 'used',
    usageLevel: 'Còn mới, chạy êm.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'A2', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Cửa A2', 'Sân khu A'],
    availableTimeSlots: [{ startAt: '2026-05-27T08:00:00.000Z', endAt: '2026-05-27T11:00:00.000Z', note: 'Có thể thử quạt' }],
    images: buildImages([{ file: 'quat_cay.jpg', alt: 'Quạt cây đứng' }]),
  }),
  buildProduct({
    title: 'Tủ lạnh mini',
    description: 'Phù hợp phòng trọ hoặc ký túc xá, tiết kiệm điện.',
    price: 1800000,
    originalPrice: 2400000,
    discountPercent: 25,
    category: 'Đồ gia dụng nhỏ',
    productStatus: 'used',
    usageLevel: 'Làm lạnh tốt, sạch sẽ.',
    isFeatured: true,
    location: { campusArea: 'KTX Bách Khoa', dorm: 'B3', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Sân B3', 'Cửa hàng gần KTX'],
    availableTimeSlots: [{ startAt: '2026-05-27T13:00:00.000Z', endAt: '2026-05-27T16:00:00.000Z', note: 'Cần xe chở hàng' }],
    images: buildImages([{ file: 'tu_lanh.jpg', alt: 'Tủ lạnh mini' }]),
  }),
  buildProduct({
    title: 'Giường ngủ sinh viên',
    description: 'Giường đơn chắc chắn, phù hợp phòng ở lâu dài.',
    price: 1200000,
    originalPrice: 1600000,
    discountPercent: 25,
    category: 'Nội thất nhỏ & Đồ phòng',
    productStatus: 'used',
    usageLevel: 'Khung còn chắc, ít trầy xước.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'C2', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Cửa C2', 'Phòng trọ khu C'],
    availableTimeSlots: [{ startAt: '2026-05-26T08:00:00.000Z', endAt: '2026-05-26T12:00:00.000Z', note: 'Có thể tháo lắp' }],
    images: buildImages([{ file: 'giuong.jpg', alt: 'Giường ngủ' }, { file: 'tu_quan_ao.jpg', alt: 'Tủ quần áo' }]),
  }),
  buildProduct({
    title: 'Bộ bàn học sinh viên',
    description: 'Bộ bàn ghế gọn nhẹ, phù hợp phòng trọ.',
    price: 450000,
    originalPrice: 600000,
    discountPercent: 25,
    category: 'Nội thất nhỏ & Đồ phòng',
    productStatus: 'used',
    usageLevel: 'Sử dụng 8 tháng, còn tốt.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'A2', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Cửa A2', 'Sân BKHN'],
    availableTimeSlots: [{ startAt: '2026-05-24T08:00:00.000Z', endAt: '2026-05-24T11:00:00.000Z', note: 'Có thể giao vào buổi sáng' }],
    images: buildImages([{ file: 'bo_ban_hoc.jpg', alt: 'Bộ bàn học' }, { file: 'ban_hoc.jpg', alt: 'Bàn học' }]),
  }),
  buildProduct({
    title: 'Ghế ngồi học điều chỉnh',
    description: 'Ghế ngồi học có thể điều chỉnh độ cao, phù hợp học và làm việc lâu.',
    price: 320000,
    originalPrice: 420000,
    discountPercent: 24,
    category: 'Nội thất nhỏ & Đồ phòng',
    productStatus: 'used',
    usageLevel: 'Còn mới, ít xước nhẹ.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'A3', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Sân A3', 'Thư viện TTA'],
    availableTimeSlots: [{ startAt: '2026-05-24T13:00:00.000Z', endAt: '2026-05-24T17:00:00.000Z', note: 'Ưu tiên gặp cuối giờ chiều' }],
    images: buildImages([{ file: 'ghe_ngoi_hoc.jpg', alt: 'Ghế ngồi học' }, { file: 'ghe.jpg', alt: 'Ghế gỗ' }]),
  }),
  buildProduct({
    title: 'Balo sinh viên đa năng',
    description: 'Balo đựng laptop, sách vở, phù hợp đi học hằng ngày.',
    price: 210000,
    originalPrice: 290000,
    discountPercent: 28,
    category: 'Thời trang & Phụ kiện',
    productStatus: 'used',
    usageLevel: 'Dùng tốt, khóa kéo còn bền.',
    location: { campusArea: 'KTX Bách Khoa', dorm: 'A1', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Cửa A1', 'Sân trường'],
    availableTimeSlots: [{ startAt: '2026-05-26T17:00:00.000Z', endAt: '2026-05-26T20:00:00.000Z', note: 'Có thể xem hàng sau giờ học' }],
    images: buildImages([{ file: 'balo.jpg', alt: 'Balo sinh viên' }]),
  }),
  buildProduct({
    title: 'Áo đồng phục Bách Khoa',
    description: 'Áo đồng phục sạch đẹp, phù hợp đi học, đi sự kiện và hoạt động CLB.',
    price: 130000,
    originalPrice: 180000,
    discountPercent: 28,
    category: 'Thời trang & Phụ kiện',
    productStatus: 'used',
    usageLevel: 'Mặc 2 lần, còn mới.',
    location: { campusArea: 'Khu giảng đường', dorm: 'C5', district: 'Cầu Giấy', city: 'Hà Nội' },
    meetingSpots: ['Cổng C5', 'Sân thể thao'],
    availableTimeSlots: [{ startAt: '2026-05-25T16:00:00.000Z', endAt: '2026-05-25T19:00:00.000Z', note: 'Có thể thử áo trực tiếp' }],
    images: buildImages([{ file: 'dong_phuc_bach_khoa.jpg', alt: 'Áo đồng phục Bách Khoa' }]),
  }),
  buildProduct({
    title: 'Giáo trình cấu trúc dữ liệu',
    description: 'Tài liệu và giáo trình phục vụ học tập môn cấu trúc dữ liệu.',
    price: 70000,
    originalPrice: 100000,
    discountPercent: 30,
    category: 'Giáo trình & Tài liệu',
    productStatus: 'used',
    usageLevel: 'Đã gạch bút chì vào vài trang.',
    location: { campusArea: 'Thư viện TTA', dorm: 'D1', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Thư viện TTA', 'Phòng đọc tầng 2'],
    availableTimeSlots: [{ startAt: '2026-05-24T10:00:00.000Z', endAt: '2026-05-24T12:00:00.000Z', note: 'Có thể giao tại thư viện' }],
    images: buildImages([{ file: 'giao_trinh_cau_truc_du_lieu.jpg', alt: 'Giáo trình cấu trúc dữ liệu' }, { file: 'cam_nang_danh_gia_tu_duy.jpg', alt: 'Cẩm nang tư duy' }]),
  }),
  buildProduct({
    title: 'Giáo trình Tư tưởng Hồ Chí Minh',
    description: 'Sách học phần mới, bìa đẹp, dễ mang theo.',
    price: 60000,
    originalPrice: 85000,
    discountPercent: 29,
    category: 'Giáo trình & Tài liệu',
    productStatus: 'new',
    usageLevel: 'Mới, chưa ghi chú.',
    location: { campusArea: 'Thư viện TTA', dorm: 'D1', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Thư viện TTA', 'Sảnh đọc sách'],
    availableTimeSlots: [{ startAt: '2026-05-25T10:00:00.000Z', endAt: '2026-05-25T12:00:00.000Z', note: 'Nhận trong giờ hành chính' }],
    images: buildImages([{ file: 'giao_trinh_tu_tuong_ho_chi_minh.jpg', alt: 'Giáo trình Tư tưởng Hồ Chí Minh' }]),
  }),
  buildProduct({
    title: 'Giáo trình Tư pháp quốc tế',
    description: 'Tài liệu chuyên ngành, còn mới, thích hợp cho sinh viên luật.',
    price: 80000,
    originalPrice: 110000,
    discountPercent: 27,
    category: 'Giáo trình & Tài liệu',
    productStatus: 'used',
    usageLevel: 'Đã học 1 kỳ, còn tốt.',
    location: { campusArea: 'Thư viện TTA', dorm: 'D1', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Thư viện TTA', 'Phòng học D1'],
    availableTimeSlots: [{ startAt: '2026-05-25T14:00:00.000Z', endAt: '2026-05-25T17:00:00.000Z', note: 'Có thể giao gần trường' }],
    images: buildImages([{ file: 'giao_trinh_tu_phap_quoc_te.jpg', alt: 'Giáo trình Tư pháp quốc tế' }]),
  }),
  buildProduct({
    title: 'Giáo trình Giải tích III',
    description: 'Sách giải tích dùng cho năm nhất, còn rất sạch.',
    price: 90000,
    originalPrice: 120000,
    discountPercent: 25,
    category: 'Giáo trình & Tài liệu',
    productStatus: 'used',
    usageLevel: 'Đã học qua, còn nguyên bìa.',
    location: { campusArea: 'Thư viện TTA', dorm: 'D2', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Thư viện TTA', 'Cửa D2'],
    availableTimeSlots: [{ startAt: '2026-05-26T09:00:00.000Z', endAt: '2026-05-26T11:00:00.000Z', note: 'Có thể gặp sáng' }],
    images: buildImages([{ file: 'giao_trinh_giai_tich_iii.jpg', alt: 'Giáo trình Giải tích III' }]),
  }),
  buildProduct({
    title: 'Bài tập Vật lý đại cương',
    description: 'Tài liệu bài tập, phù hợp luyện đề và ôn thi.',
    price: 50000,
    originalPrice: 75000,
    discountPercent: 33,
    category: 'Giáo trình & Tài liệu',
    productStatus: 'used',
    usageLevel: 'Có vài dấu bút, vẫn đọc tốt.',
    location: { campusArea: 'Thư viện TTA', dorm: 'D2', district: 'Hai Bà Trưng', city: 'Hà Nội' },
    meetingSpots: ['Thư viện TTA', 'Khu photocopy'],
    availableTimeSlots: [{ startAt: '2026-05-24T16:00:00.000Z', endAt: '2026-05-24T18:00:00.000Z', note: 'Nhận nhanh trong ngày' }],
    images: buildImages([{ file: 'bai_tap_vat_ly_dai_cuong.jpg', alt: 'Bài tập Vật lý đại cương' }]),
  }),
];

const upsertUser = async () => {
  const existingUser = await User.findOne({ email: seedUser.email });

  if (existingUser) {
    Object.assign(existingUser, seedUser);
    await existingUser.save();
    return existingUser;
  }

  return User.create(seedUser);
};

const upsertProduct = async (sellerId, productData) => {
  const payload = {
    ...productData,
    location: normalizeLocation(productData.location),
    seller: sellerId,
  };

  const existing = await Product.findOne({ title: productData.title });
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return 'Updated';
  }

  await Product.create(payload);
  return 'Inserted';
};

const seedProducts = async () => {
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

  const seller = await upsertUser();

  for (const product of products) {
    const result = await upsertProduct(seller._id, product);
    console.log(`${result}: ${product.title}`);
  }

  await mongoose.disconnect();
  console.log('Seed products done.');
};

seedProducts().catch((error) => {
  console.error('Seed products failed:', error.message || error);
  mongoose.disconnect().finally(() => process.exit(1));
});