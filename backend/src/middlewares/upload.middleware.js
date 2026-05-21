const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'products');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir(PRODUCT_UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PRODUCT_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const baseName = path
      .basename(file.originalname || 'upload', ext)
      .replace(/[^a-z0-9-_]/gi, '-')
      .toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${baseName || 'upload'}-${uniqueSuffix}${ext}`);
  },
});

const allowedMimes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const fileFilter = (req, file, cb) => {
  if (!allowedMimes.has(file.mimetype)) {
    const error = new Error('Chi cho phep anh JPG, PNG, WEBP, GIF.');
    error.statusCode = 400;
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
});

const uploadProductImages = upload.array('images', 6);
const uploadSingleImage = upload.single('image');

module.exports = {
  upload,
  uploadProductImages,
  uploadSingleImage,
  UPLOAD_ROOT,
  PRODUCT_UPLOAD_DIR,
};
