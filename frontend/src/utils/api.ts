export const getApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path) || path.startsWith('//')) {
    return path;
  }

  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

export const getAssetUrl = (value?: string | null) => {
  if (!value) return '';

  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/config/')) {
        return getApiUrl(`${url.pathname}${url.search}${url.hash}`);
      }

      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.protocol === 'http:') {
        url.protocol = 'https:';
        return url.toString();
      }

      return trimmed;
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/config/')) {
    return getApiUrl(trimmed);
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};
