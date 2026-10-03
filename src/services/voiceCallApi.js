import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const voiceCallAxios = axios.create({
  baseURL: `${API_BASE_URL}/voice-calls`,
  timeout: 20000,
});

voiceCallAxios.interceptors.request.use((config) => {
  const headers = getHeaders();
  if (!headers) {
    return Promise.reject(new Error('Missing authentication headers. Please sign in again.'));
  }
  config.headers = { ...(config.headers || {}), ...headers };
  return config;
});

const unwrap = (response) => {
  if (response?.data?.success === false) {
    throw new Error(response.data.message || 'Voice call request failed');
  }
  return response?.data;
};

export const voiceCallApi = {
  getCapability: (clientUsername) =>
    voiceCallAxios
      .get('/capability', { params: { client_username: clientUsername } })
      .then(unwrap),
  create: (clientUsername, idempotencyKey) =>
    voiceCallAxios
      .post(
        '/create',
        { client_username: clientUsername },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then(unwrap),
  get: (callId) =>
    voiceCallAxios.get(`/${encodeURIComponent(callId)}`).then(unwrap),
  token: (callId) =>
    voiceCallAxios
      .post(`/${encodeURIComponent(callId)}/token`)
      .then(unwrap),
  end: (callId) =>
    voiceCallAxios
      .post(`/${encodeURIComponent(callId)}/end`)
      .then(unwrap),
};

export default voiceCallApi;
