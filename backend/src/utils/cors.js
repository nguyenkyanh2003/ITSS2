const buildCorsOptions = () => {
  const allowedOrigins = [
    'https://itss-2-ten.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      console.warn(`[CORS Blocked] Origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  };
};

module.exports = {
  buildCorsOptions,
};
