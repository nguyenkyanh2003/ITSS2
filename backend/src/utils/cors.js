const buildCorsOptions = () => {
  const defaultOrigins = [
    'https://itss-2-ten.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  // Merge any extra origins from CORS_ORIGIN env var (comma-separated)
  const envOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin) || origin.endsWith('.vercel.app')) {
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
