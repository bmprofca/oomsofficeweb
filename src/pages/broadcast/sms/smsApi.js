import axios from 'axios';
import API_BASE_URL from '../../../utils/api-controller';
import getHeaders from '../../../utils/get-headers';

const smsAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

smsAxios.interceptors.request.use((config) => {
  const isFormData = config.data instanceof FormData;
  const headers = getHeaders(isFormData);
  if (!headers) {
    return Promise.reject(new Error('Missing authentication headers. Please sign in again.'));
  }

  config.headers = { ...(config.headers || {}), ...headers };

  if (isFormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

const unwrap = (res) => res?.data;

export const smsApi = {
  // SMS Config
  createConfig: (payload) => smsAxios.post('/broadcast/sms/config/create', payload).then(unwrap),
  updateConfig: (payload) => smsAxios.put('/broadcast/sms/config/update', payload).then(unwrap),
  listConfigs: (params) => smsAxios.get('/broadcast/sms/config/list', { params }).then(unwrap),
  configDetails: (configId) => smsAxios.get(`/broadcast/sms/config/details/${configId}`).then(unwrap),
  testConfig: (payload) => smsAxios.post('/broadcast/sms/config/test', payload).then(unwrap),
  setDefaultConfig: (payload) => smsAxios.put('/broadcast/sms/config/set-default', payload).then(unwrap),
  changeConfigStatus: (payload) => smsAxios.put('/broadcast/sms/config/change-status', payload).then(unwrap),

  // Templates
  createTemplate: (payload) => smsAxios.post('/broadcast/sms/template/create', payload).then(unwrap),
  updateTemplate: (payload) => smsAxios.put('/broadcast/sms/template/update', payload).then(unwrap),
  listTemplates: (params) => smsAxios.get('/broadcast/sms/template/list', { params }).then(unwrap),
  templateDetails: (templateId) => smsAxios.get(`/broadcast/sms/template/details/${templateId}`).then(unwrap),
  previewTemplate: (payload) => smsAxios.post('/broadcast/sms/template/preview', payload).then(unwrap),
  previewTemplateById: (templateId, params) => smsAxios.get(`/broadcast/sms/template/preview/${templateId}`, { params }).then(unwrap),
  changeTemplateStatus: (payload) => smsAxios.put('/broadcast/sms/template/change-status', payload).then(unwrap),

  // Broadcasts
  createBroadcast: (payload) => smsAxios.post('/broadcast/sms/broadcast/create', payload).then(unwrap),
  listBroadcasts: (params) => smsAxios.get('/broadcast/sms/broadcast/list', { params }).then(unwrap),
  broadcastDetails: (id) => smsAxios.get(`/broadcast/sms/broadcast/details/${id}`).then(unwrap),
  recipientList: (id, params) => smsAxios.get(`/broadcast/sms/broadcast/recipient-list/${id}`, { params }).then(unwrap),
  pauseBroadcast: (payload) => smsAxios.post('/broadcast/sms/broadcast/pause', payload).then(unwrap),
  resumeBroadcast: (payload) => smsAxios.post('/broadcast/sms/broadcast/resume', payload).then(unwrap),
  cancelBroadcast: (payload) => smsAxios.post('/broadcast/sms/broadcast/cancel', payload).then(unwrap),
  retryFailed: (payload) => smsAxios.post('/broadcast/sms/broadcast/retry-failed', payload).then(unwrap),
  
  // Dynamic Variables
  getVariableKeys: (type) => smsAxios.get(`/broadcast/sms/variable-keys/${type}`).then(unwrap),
  getDynamicVariables: (type, identifier) => smsAxios.get(`/broadcast/sms/dynamic-variables/${type}/${identifier}`).then(unwrap),

  // Bulk Upload & Mappings
  uploadRecipients: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return smsAxios.post('/broadcast/sms/upload-recipients', formData).then(unwrap);
  },
  createBroadcastFromUpload: (payload) => smsAxios.post('/broadcast/sms/broadcast/create-from-upload', payload).then(unwrap),
  getUploadedRecipientsInfo: () => smsAxios.get('/broadcast/sms/uploaded-recipients-info').then(unwrap),
  clearUploadedRecipients: () => smsAxios.post('/broadcast/sms/clear-uploaded-recipients', {}).then(unwrap),
};

export const normalizeList = (data) => (Array.isArray(data) ? data : []);
export const normalizePagination = (pagination) => ({
  page_no: Number(pagination?.page_no || 1),
  limit: Number(pagination?.limit || 10),
  total: Number(pagination?.total || 0),
  total_pages: Number(pagination?.total_pages || 1),
  has_more: Boolean(pagination?.has_more),
});
