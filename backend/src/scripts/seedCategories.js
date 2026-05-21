require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

const categories = [
  {
    name: 'Đồ điện tử',
    iconUrl: '/icons/electronics.svg',
    description: 'Máy tính, sạc, linh kiện, thiết bị học tập.',
    sortOrder: 1,
  },
  {
    name: 'Laptop & PC',
    iconUrl: '/icons/laptop.svg',
    description: 'Laptop, màn hình, linh kiện PC.',
    sortOrder: 2,
  },
  {
    name: 'Điện thoại & Tablet',
    iconUrl: '/icons/phone.svg',
    description: 'Điện thoại, máy tính bảng, phụ kiện đi kèm.',
    sortOrder: 3,
  },
  {
    name: 'Tai nghe & Phụ kiện',
    iconUrl: '/icons/headphones.svg',
    description: 'Tai nghe, chuột, bàn phím, cáp sạc.',
    sortOrder: 4,
  },
  {
    name: 'Đồ gia dụng nhỏ',
    iconUrl: '/icons/home.svg',
    description: 'Quạt, đèn bàn, đồ bếp nhỏ gọn.',
    sortOrder: 5,
  },
  {
    name: 'Giáo trình & Tài liệu',
    iconUrl: '/icons/book.svg',
    description: 'Giáo trình, sách tham khảo, tài liệu học tập.',
    sortOrder: 6,
  },
  {
    name: 'Nội thất nhỏ & Đồ phòng',
    iconUrl: '/icons/room.svg',
    description: 'Bàn, ghế, kệ, đồ dùng phòng trọ/KTX.',
    sortOrder: 7,
  },
  {
    name: 'Xe đạp & Phụ tùng',
    iconUrl: '/icons/bike.svg',
    description: 'Xe đạp, phụ tùng, khóa xe.',
    sortOrder: 8,
  },
  {
    name: 'Thời trang & Phụ kiện',
    iconUrl: '/icons/fashion.svg',
    description: 'Quần áo, balo, giày, đồng hồ.',
    sortOrder: 9,
  },
  {
    name: 'Đồ thể thao',
    iconUrl: '/icons/sport.svg',
    description: 'Dụng cụ thể thao, đồ tập.',
    sortOrder: 10,
  },
];

const seedCategories = async () => {
  const shouldReset = process.argv.includes('--reset');
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  if (shouldReset) {
    await Category.deleteMany({});
  }

  for (const category of categories) {
    const slug = slugify(category.name);
    const payload = {
      ...category,
      slug,
      isActive: true,
    };

    const existing = await Category.findOne({ slug });
    if (existing) {
      await Category.updateOne({ _id: existing._id }, { $set: payload });
      console.log(`Updated: ${category.name}`);
    } else {
      await Category.create(payload);
      console.log(`Inserted: ${category.name}`);
    }
  }

  await mongoose.disconnect();
  console.log('Seed categories done.');
};

seedCategories().catch((error) => {
  console.error('Seed categories failed:', error.message || error);
  mongoose.disconnect().finally(() => process.exit(1));
});
