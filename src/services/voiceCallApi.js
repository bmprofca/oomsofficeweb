import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import {
  requestOfficeVoiceCallCapability,
  watchOfficeVoiceCallCapability,
} from './voiceCallSocket';
import { getOfficeVoiceCallSessionId } from './voiceCallSocket';

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
  config.headers['x-voice-call-session-id'] = getOfficeVoiceCallSessionId();
  return config;
});

const unwrap = (response) => {
  if (response?.data?.success === false) {
    throw new Error(response.data.message || 'Voice call request failed');
  }
  return response?.data;
};

export const voiceCallApi = {
  getHistory: (params = {}) =>
    voiceCallAxios.get('/history', { params }).then(unwrap),
  getCapability: (recipientUsername, recipientPanel = 'client') =>
    requestOfficeVoiceCallCapability(recipientUsername, recipientPanel),
  watchCapability: (recipientUsername, recipientPanel, onUpdate) =>
    watchOfficeVoiceCallCapability(recipientUsername, recipientPanel, onUpdate),
  create: (recipientUsername, idempotencyKey, recipientPanel = 'client') =>
    voiceCallAxios
      .post(
        '/create',
        { recipient_username: recipientUsername, recipient_panel: recipientPanel },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then(unwrap),
  getIncoming: () =>
    voiceCallAxios.get('/incoming').then(unwrap),
  get: (callId) =>
    voiceCallAxios.get(`/${encodeURIComponent(callId)}`).then(unwrap),
  getStaffCall: (callId) =>
    voiceCallAxios.get(`/staff/${encodeURIComponent(callId)}`).then(unwrap),
  respondAsStaff: (callId, action) =>
    voiceCallAxios
      .post(`/${encodeURIComponent(callId)}/respond`, { action })
      .then(unwrap),
  respondToStaffCall: (callId, action) =>
    voiceCallAxios
      .post(`/staff/${encodeURIComponent(callId)}/respond`, { action })
      .then(unwrap),
  token: (callId) =>
    voiceCallAxios
      .post(`/${encodeURIComponent(callId)}/token`)
      .then(unwrap),
  staffToken: (callId) =>
    voiceCallAxios
      .post(`/staff/${encodeURIComponent(callId)}/token`)
      .then(unwrap),
  end: (callId) =>
    voiceCallAxios
      .post(`/${encodeURIComponent(callId)}/end`)
      .then(unwrap),
  endStaffCall: (callId) =>
    voiceCallAxios
      .post(`/staff/${encodeURIComponent(callId)}/end`)
      .then(unwrap),
};

export default voiceCallApi;
