// API Base URL — set via REACT_APP_API_BASE_URL in .env.development / .env.production
const API_BASE_URL_NO_VERSION =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:8877';
const API_BASE_URL = `${API_BASE_URL_NO_VERSION.replace(/\/$/, '')}/api/v1`;
export { API_BASE_URL_NO_VERSION };
export default API_BASE_URL;
