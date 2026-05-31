const buildCorsOptions = () => {
  const allowedMainDomains = [
    'https://itss-2-ten.vercel.app'
  ];

  return {
    origin(origin, callback) {
      // Cho phép request không có origin (ví dụ: curl, postman, mobile app...)
      if (!origin) {
        return callback(null, true);
      }

      const isAllowedMain = allowedMainDomains.includes(origin);
      const isLocalhost = origin.startsWith('http://localhost:');
      const isVercelPreview = origin.endsWith('.vercel.app');

      if (isAllowedMain || isLocalhost || isVercelPreview) {
        return callback(null, true);
      }

      console.warn(`[CORS Blocked] Origin: ${origin}`);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  };
};

module.exports = {
  buildCorsOptions,
};
