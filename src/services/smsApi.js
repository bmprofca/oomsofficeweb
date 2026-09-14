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
  { value: 'ooms system', label: 'OOMS System' },
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

function campaignApi(prefix) {
  return {
    resolveCampaignRecipients: (payload) =>
      smsAxios.post(`${prefix}/campaign/resolve-recipients`, payload).then(unwrap),
    createCampaign: (payload) =>
      smsAxios.post(`${prefix}/campaign/create`, payload).then(unwrap),
    listCampaignSchedules: (params) =>
      smsAxios.get(`${prefix}/campaign/schedules`, { params }).then(unwrap),
    createCampaignSchedule: (payload) =>
      smsAxios.post(`${prefix}/campaign/schedules`, payload).then(unwrap),
    updateCampaignSchedule: (scheduleId, payload) =>
      smsAxios
        .put(`${prefix}/campaign/schedules/${scheduleId}`, payload)
        .then(unwrap),
    deleteCampaignSchedule: (scheduleId) =>
      smsAxios.delete(`${prefix}/campaign/schedules/${scheduleId}`).then(unwrap),
    runCampaignSchedule: (scheduleId) =>
      smsAxios
        .post(`${prefix}/campaign/schedules/${scheduleId}/run`, null, {
          timeout: 120000,
        })
        .then(unwrap),
    listCampaigns: (params) =>
      smsAxios.get(`${prefix}/campaign/list`, { params }).then(unwrap),
    getCampaignDetails: (params) =>
      smsAxios.get(`${prefix}/campaign/details`, { params }).then(unwrap),
    listCampaignMessages: (params) =>
      smsAxios.get(`${prefix}/campaign/messages`, { params }).then(unwrap),
    getCampaignMessageDetail: (params) =>
      smsAxios.get(`${prefix}/campaign/message-detail`, { params }).then(unwrap),
    retryCampaignMessage: (payload) =>
      smsAxios.post(`${prefix}/campaign/message-retry`, payload).then(unwrap),
    deleteCampaign: (payload) =>
      smsAxios.post(`${prefix}/campaign/delete`, payload).then(unwrap),
    processCampaign: (payload) =>
      smsAxios.post(`${prefix}/campaign/process`, payload).then(unwrap),
  };
}

const fast2smsCampaigns = campaignApi('/broadcast/sms/fast2sms');
const oomsSystemCampaigns = campaignApi('/broadcast/sms/ooms-system');

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

  // OOMS System notification mapping + templates
  listOomsSystemTemplates: (params) =>
    smsAxios.get('/broadcast/sms/ooms-system/templates', { params }).then(unwrap),
  getOomsSystemTemplateMapList: () =>
    smsAxios.get('/broadcast/sms/ooms-system/template-map-list').then(unwrap),
  setOomsSystemTemplateMap: (payload) =>
    smsAxios.put('/broadcast/sms/ooms-system/template-map/set', payload).then(unwrap),
  unsetOomsSystemTemplateMap: (payload) =>
    smsAxios.put('/broadcast/sms/ooms-system/template-map/unset', payload).then(unwrap),

  ...fast2smsCampaigns,

  /** Campaign APIs scoped by mode (`fast2sms` | `ooms_system`). */
  forMode(mode) {
    return mode === 'ooms_system' ? oomsSystemCampaigns : fast2smsCampaigns;
  },
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
