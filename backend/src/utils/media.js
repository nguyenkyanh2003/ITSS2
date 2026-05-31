const path = require('path');

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const getPublicBaseUrl = (req) => {
  const configured =
    process.env.PUBLIC_API_URL ||
    process.env.API_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL;

  if (configured) {
    return trimTrailingSlash(configured);
  }

  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || req.get('host');

  return host ? `${protocol}://${host}` : '';
};

const normalizeMediaUrl = (url, baseUrl = '') => {
  if (!url) return null;

  const str = String(url).trim();
  if (!str) return null;
  if (str.startsWith('data:') || str.startsWith('blob:')) return str;
  if (str.startsWith('//')) return `https:${str}`;

  const normalizedBaseUrl = trimTrailingSlash(baseUrl);

  if (/^https?:\/\//i.test(str)) {
    try {
      const parsed = new URL(str);
      if (
        normalizedBaseUrl &&
        (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/config/'))
      ) {
        return `${normalizedBaseUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return str;
    } catch (error) {
      return str;
    }
  }

  if (str.startsWith('/')) {
    return normalizedBaseUrl ? `${normalizedBaseUrl}${str}` : str;
  }

  return str;
};

const buildRelativeFileUrl = (rootDir, filePath) => {
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  return `/${relativePath}`;
};

module.exports = {
  buildRelativeFileUrl,
  getPublicBaseUrl,
  normalizeMediaUrl,
};
