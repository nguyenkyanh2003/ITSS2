const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || res.statusCode;
  if (!statusCode || statusCode === 200) {
    statusCode = 500;
  }

  let message = err.message || 'Loi server.';

  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File qua lon. Gioi han 5MB.';
    } else {
      message = 'Loi upload file.';
    }
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    statusCode = 400;
    message = err.message || 'Loai file khong hop le.';
  }

  const payload = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = {
  notFound,
  errorHandler,
};
