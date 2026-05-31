const parseCorsOrigins = () => {
  const raw = process.env.CORS_ORIGIN || '';
  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

const isVercelPreviewOrigin = (origin) => {
  if (process.env.ALLOW_VERCEL_PREVIEWS !== 'true') return false;

  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app');
  } catch (error) {
    return false;
  }
};

const buildCorsOptions = () => {
  const allowedOrigins = parseCorsOrigins();

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin) || isVercelPreviewOrigin(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  };
};

module.exports = {
  buildCorsOptions,
  parseCorsOrigins,
};
