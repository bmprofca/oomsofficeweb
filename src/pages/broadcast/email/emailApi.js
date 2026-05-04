import axios from 'axios';
import API_BASE_URL from '../../../utils/api-controller';
import getHeaders from '../../../utils/get-headers';

const emailAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

emailAxios.interceptors.request.use((config) => {
  const headers = getHeaders();
  if (!headers) {
    return Promise.reject(new Error('Missing authentication headers. Please sign in again.'));
  }

  config.headers = { ...(config.headers || {}), ...headers };

  return config;
});

const unwrap = (res) => res?.data;

export const emailApi = {
  // SMTP Config
  createConfig: (payload) => emailAxios.post('/broadcast/email/config/create', payload).then(unwrap),
  updateConfig: (payload) => emailAxios.put('/broadcast/email/config/update', payload).then(unwrap),
  listConfigs: (params) => emailAxios.get('/broadcast/email/config/list', { params }).then(unwrap),
  configDetails: (configId) => emailAxios.get(`/broadcast/email/config/details/${configId}`).then(unwrap),
  testConfig: (payload) => emailAxios.post('/broadcast/email/config/test', payload).then(unwrap),
  setDefaultConfig: (payload) => emailAxios.put('/broadcast/email/config/set-default', payload).then(unwrap),
  changeConfigStatus: (payload) => emailAxios.put('/broadcast/email/config/change-status', payload).then(unwrap),

  // Templates
  createTemplate: (payload) => emailAxios.post('/broadcast/email/template/create', payload).then(unwrap),
  updateTemplate: (payload) => emailAxios.put('/broadcast/email/template/update', payload).then(unwrap),
  listTemplates: (params) => emailAxios.get('/broadcast/email/template/list', { params }).then(unwrap),
  templateDetails: (templateId) => emailAxios.get(`/broadcast/email/template/details/${templateId}`).then(unwrap),
  previewTemplate: (payload) => emailAxios.post('/broadcast/email/template/preview', payload).then(unwrap),
  changeTemplateStatus: (payload) => emailAxios.put('/broadcast/email/template/change-status', payload).then(unwrap),


  // Static Templates
  createStaticTemplate: (payload) => emailAxios.post('/broadcast/email/static-template/create', payload).then(unwrap),
  updateStaticTemplate: (payload) => emailAxios.put('/broadcast/email/static-template/update', payload).then(unwrap),
  listStaticTemplates: (params) => emailAxios.get('/broadcast/email/static-template/active-list', { params }).then(unwrap),
  staticTemplateDetails: (templateId) => emailAxios.get(`/broadcast/email/static-template/details/${templateId}`).then(unwrap),
  staticTemplatesByType: (templateType) => emailAxios.get(`/broadcast/email/static-template/by-type/${templateType}`).then(unwrap),
  deleteStaticTemplate: (payload) => emailAxios.put('/broadcast/email/static-template/delete', payload).then(unwrap),
  setDefaultStaticTemplate: (payload) => emailAxios.put('/broadcast/email/static-template/set-default', payload).then(unwrap),
  // Broadcast
  createBroadcast: (payload) => emailAxios.post('/broadcast/email/broadcast/create', payload).then(unwrap),
  listBroadcasts: (params) => emailAxios.get('/broadcast/email/broadcast/list', { params }).then(unwrap),
  broadcastDetails: (id) => emailAxios.get(`/broadcast/email/broadcast/details/${id}`).then(unwrap),
  recipientList: (id, params) => emailAxios.get(`/broadcast/email/broadcast/recipient-list/${id}`, { params }).then(unwrap),
  pauseBroadcast: (payload) => emailAxios.post('/broadcast/email/broadcast/pause', payload).then(unwrap),
  resumeBroadcast: (payload) => emailAxios.post('/broadcast/email/broadcast/resume', payload).then(unwrap),
  cancelBroadcast: (payload) => emailAxios.post('/broadcast/email/broadcast/cancel', payload).then(unwrap),
  retryFailed: (payload) => emailAxios.post('/broadcast/email/broadcast/retry-failed', payload).then(unwrap),
  processDue: (payload) => emailAxios.post('/broadcast/email/broadcast/process-due', payload || {}).then(unwrap),
};

export const normalizeList = (data) => (Array.isArray(data) ? data : []);
export const normalizePagination = (pagination) => ({
  page_no: Number(pagination?.page_no || 1),
  limit: Number(pagination?.limit || 10),
  total: Number(pagination?.total || 0),
  total_pages: Number(pagination?.total_pages || 1),
  has_more: Boolean(pagination?.has_more),
});
