const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'products');
const AVATAR_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'avatars');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir(PRODUCT_UPLOAD_DIR);
ensureDir(AVATAR_UPLOAD_DIR);

const buildStorage = (destinationDir) => multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, destinationDir);
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

const storage = buildStorage(PRODUCT_UPLOAD_DIR);
const avatarStorage = buildStorage(AVATAR_UPLOAD_DIR);

// Supported image mimetypes
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Supported video mimetypes (common list)
const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-ms-wmv']);

const imageFileFilter = (req, file, cb) => {
  if (!IMAGE_MIMES.has(file.mimetype)) {
    const error = new Error('Chỉ cho phép ảnh JPG, PNG, WEBP, GIF.');
    error.statusCode = 400;
    error.code = 'INVALID_IMAGE_TYPE';
    return cb(error, false);
  }
  return cb(null, true);
};

const videoFileFilter = (req, file, cb) => {
  if (!VIDEO_MIMES.has(file.mimetype)) {
    const error = new Error('Chỉ cho phép video MP4/WEBM/QUICKTIME.');
    error.statusCode = 400;
    error.code = 'INVALID_VIDEO_TYPE';
    return cb(error, false);
  }
  return cb(null, true);
};

// Default image uploader (smaller limit)
const uploadImages = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
});

// Larger uploader to accept one video + multiple images
const uploadMedia = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // accept images or videos
    if (IMAGE_MIMES.has(file.mimetype)) return cb(null, true);
    if (VIDEO_MIMES.has(file.mimetype)) return cb(null, true);
    const error = new Error('Loại tập tin không được hỗ trợ.');
    error.statusCode = 400;
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  },
  limits: {
    // allow bigger uploads to accommodate short videos
    fileSize: 50 * 1024 * 1024,
    files: 7,
  },
});

const uploadProductImages = uploadImages.array('images', 6);
const uploadSingleImage = uploadImages.single('image');
const uploadAvatarImage = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
}).single('image');

// fields: images[] and optional video
const uploadProductMedia = uploadMedia.fields([
  { name: 'images', maxCount: 6 },
  { name: 'video', maxCount: 1 },
]);

module.exports = {
  uploadImages,
  uploadMedia,
  uploadProductImages,
  uploadSingleImage,
  uploadAvatarImage,
  uploadProductMedia,
  UPLOAD_ROOT,
  PRODUCT_UPLOAD_DIR,
  AVATAR_UPLOAD_DIR,
};
