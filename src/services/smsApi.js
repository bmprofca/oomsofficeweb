import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const smsAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

smsAxios.interceptors.request.use((config) => {
  const headers = getHeaders();
  if (!headers) {
    return Promise.reject(new Error('Missing authentication headers. Please sign in again.'));
  }
  config.headers = { ...(config.headers || {}), ...headers };
  return config;
});

const unwrap = (res) => res?.data;

export const SMS_CHANNEL_OPTIONS = [
  { value: 'disabled', label: 'Disable' },
  { value: 'fast2sms', label: 'Fast2SMS' },
];

export const SMS_SUB_TABS = SMS_CHANNEL_OPTIONS.filter(
  (option) => option.value !== 'disabled'
);

export const FAST2SMS_ROUTE_OPTIONS = [
  { value: 'dlt', label: 'DLT' },
  { value: 'dlt_manual', label: 'DLT Manual' },
  { value: 'otp', label: 'OTP' },
  { value: 'q', label: 'Quick SMS' },
];

export const smsApi = {
  getChannel: () => smsAxios.get('/broadcast/sms/channel').then(unwrap),
  updateChannel: (payload) => smsAxios.put('/broadcast/sms/channel', payload).then(unwrap),
  getFast2SmsConfig: () => smsAxios.get('/broadcast/sms/fast2sms/config').then(unwrap),
  saveFast2SmsConfig: (payload) => smsAxios.put('/broadcast/sms/fast2sms/config', payload).then(unwrap),

  listTemplates: (params) =>
    smsAxios.get('/broadcast/sms/fast2sms/template/list', { params }).then(unwrap),
  createTemplate: (payload) =>
    smsAxios.post('/broadcast/sms/fast2sms/template/create', payload).then(unwrap),
  updateTemplate: (payload) =>
    smsAxios.put('/broadcast/sms/fast2sms/template/update', payload).then(unwrap),

  getTemplateMapList: () =>
    smsAxios.get('/broadcast/sms/fast2sms/template-map-list').then(unwrap),
  setTemplateMap: (payload) =>
    smsAxios.put('/broadcast/sms/fast2sms/template-map/set', payload).then(unwrap),
  unsetTemplateMap: (payload) =>
    smsAxios.put('/broadcast/sms/fast2sms/template-map/unset', payload).then(unwrap),

  resolveCampaignRecipients: (payload) =>
    smsAxios
      .post('/broadcast/sms/fast2sms/campaign/resolve-recipients', payload)
      .then(unwrap),
  createCampaign: (payload) =>
    smsAxios.post('/broadcast/sms/fast2sms/campaign/create', payload).then(unwrap),
  listCampaigns: (params) =>
    smsAxios.get('/broadcast/sms/fast2sms/campaign/list', { params }).then(unwrap),
  getCampaignDetails: (params) =>
    smsAxios.get('/broadcast/sms/fast2sms/campaign/details', { params }).then(unwrap),
  listCampaignMessages: (params) =>
    smsAxios.get('/broadcast/sms/fast2sms/campaign/messages', { params }).then(unwrap),
  getCampaignMessageDetail: (params) =>
    smsAxios
      .get('/broadcast/sms/fast2sms/campaign/message-detail', { params })
      .then(unwrap),
  retryCampaignMessage: (payload) =>
    smsAxios
      .post('/broadcast/sms/fast2sms/campaign/message-retry', payload)
      .then(unwrap),
  deleteCampaign: (payload) =>
    smsAxios.post('/broadcast/sms/fast2sms/campaign/delete', payload).then(unwrap),
  processCampaign: (payload) =>
    smsAxios.post('/broadcast/sms/fast2sms/campaign/process', payload).then(unwrap),
};

export const normalizeList = (data) => (Array.isArray(data) ? data : []);

export const normalizePagination = (pagination, defaults = {}) => {
  const source = pagination && typeof pagination === 'object' ? pagination : {};
  const page_no = Math.max(1, Number(source.page_no ?? defaults.page_no ?? 1) || 1);
  const limit = Math.max(1, Number(source.limit ?? defaults.limit ?? 20) || 20);
  const total = Math.max(0, Number(source.total) || 0);
  const total_pages = Math.max(
    1,
    Number(source.total_pages) || Math.ceil(total / limit) || 1,
  );
  return { page_no, limit, total, total_pages, has_more: page_no < total_pages };
};
