const RENDER_DEFAULT_DOMAIN = '.onrender.com';
const DEFAULT_DEV_ORIGIN = 'http://localhost:5000';

const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const stripSuffix = (value, suffix) =>
  value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;

const normalizeHost = (rawHost = '') => {
  const trimmed = rawHost.trim();
  if (!trimmed) return '';

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '').split('/')[0];
  if (!withoutProtocol) return '';

  const [hostPart, ...portParts] = withoutProtocol.split(':');
  const finalHost = hostPart.includes('.')
    ? hostPart
    : `${hostPart}${RENDER_DEFAULT_DOMAIN}`;
  const port = portParts.length > 0 ? `:${portParts.join(':')}` : '';

  return `${finalHost}${port}`;
};

const getExplicitApiUrl = () => {
  const explicit =
    process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';

  return explicit ? stripTrailingSlash(explicit.trim()) : '';
};

const getBackendHost = () => {
  const host =
    process.env.NEXT_PUBLIC_BACKEND_HOST || process.env.BACKEND_HOST || '';

  const normalized = normalizeHost(host);
  return normalized;
};

const getBackendOrigin = () => {
  const explicitApi = getExplicitApiUrl();
  if (explicitApi) {
    return stripTrailingSlash(stripSuffix(explicitApi, '/api'));
  }

  const host = getBackendHost();
  if (host) {
    return `https://${host}`;
  }

  return DEFAULT_DEV_ORIGIN;
};

const getBackendApiBase = () => {
  const explicitApi = getExplicitApiUrl();
  if (explicitApi) {
    return explicitApi;
  }

  return `${stripTrailingSlash(getBackendOrigin())}/api`;
};

const getBackendSocketBase = () => stripTrailingSlash(getBackendOrigin());

module.exports = {
  getBackendHost,
  getBackendOrigin,
  getBackendApiBase,
  getBackendSocketBase,
};
