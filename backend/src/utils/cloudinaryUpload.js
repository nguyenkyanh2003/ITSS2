const fs = require('fs/promises');
const { cloudinary } = require('../config/db/cloudinary');

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const cleanupLocalFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // File cleanup is best-effort; keep the request result if upload succeeded.
  }
};

const uploadToCloudinaryIfConfigured = async (file, folder) => {
  if (!file || !hasCloudinaryConfig()) {
    return null;
  }

  configureCloudinary();

  const result = await cloudinary.uploader.upload(file.path, {
    folder,
    resource_type: file.mimetype?.startsWith('video/') ? 'video' : 'image',
  });

  await cleanupLocalFile(file.path);

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

module.exports = {
  hasCloudinaryConfig,
  uploadToCloudinaryIfConfigured,
};
