import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const whatsappAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

whatsappAxios.interceptors.request.use((config) => {
  const headers = getHeaders();
  if (!headers) {
    return Promise.reject(new Error('Missing authentication headers. Please sign in again.'));
  }

  config.headers = { ...(config.headers || {}), ...headers };
  return config;
});

const unwrap = (res) => res?.data;

export const WHATSAPP_CHANNEL_OPTIONS = [
  { value: 'disabled', label: 'Disable' },
  { value: 'ooms system', label: 'OOMS System' },
  { value: 'onechatting', label: 'OneChatting' },
  { value: 'ooms web', label: 'OOMS Web' },
];

export const WHATSAPP_SUB_TABS = WHATSAPP_CHANNEL_OPTIONS.filter(
  (option) => option.value !== 'disabled'
);

export const whatsappApi = {
  getChannel: () => whatsappAxios.get('/broadcast/whatsapp/channel').then(unwrap),
  updateChannel: (payload) => whatsappAxios.put('/broadcast/whatsapp/channel', payload).then(unwrap),
  listDeveloperTokens: (params) =>
    whatsappAxios.get('/broadcast/whatsapp/onechatting/developer-tokens', { params }).then(unwrap),
  updateDeveloperToken: (payload) =>
    whatsappAxios.put('/broadcast/whatsapp/onechatting/developer-token', payload).then(unwrap),
  syncClientsToOneChatting: (payload = {}) =>
    whatsappAxios
      .post('/broadcast/whatsapp/onechatting/sync-clients', payload, { timeout: 180000 })
      .then(unwrap),
  getChatList: (params) =>
    whatsappAxios.get('/broadcast/whatsapp/onechatting/chat-list', { params }).then(unwrap),
  getChatHistory: (params) =>
    whatsappAxios.get('/broadcast/whatsapp/onechatting/chat-history', { params }).then(unwrap),
  getChatAssignPermission: (params) =>
    whatsappAxios
      .get('/broadcast/whatsapp/onechatting/chat-assign-permission', { params })
      .then(unwrap),
  chatAssign: (payload) =>
    whatsappAxios.post('/broadcast/whatsapp/onechatting/chat-assign', payload).then(unwrap),
  markAsRead: (payload) =>
    whatsappAxios.post('/broadcast/whatsapp/onechatting/mark-as-read', payload).then(unwrap),
  sendTextMessage: (payload) =>
    whatsappAxios.post('/broadcast/whatsapp/onechatting/send-text-message', payload).then(unwrap),
  sendImageMessage: (payload) =>
    whatsappAxios.post('/broadcast/whatsapp/onechatting/send-image-message', payload).then(unwrap),
  sendVideoMessage: (payload) =>
    whatsappAxios.post('/broadcast/whatsapp/onechatting/send-video-message', payload).then(unwrap),
  sendDocumentMessage: (payload) =>
    whatsappAxios.post('/broadcast/whatsapp/onechatting/send-document-message', payload).then(unwrap),
  sendAudioMessage: (payload) =>
    whatsappAxios.post('/broadcast/whatsapp/onechatting/send-audio-message', payload).then(unwrap),
  sendTemplateMessage: (payload) =>
    whatsappAxios.post('/broadcast/whatsapp/onechatting/send-template', payload).then(unwrap),
  getTemplateList: (params) =>
    whatsappAxios.get('/broadcast/whatsapp/onechatting/template-list', { params }).then(unwrap),
  getTemplateMapList: () =>
    whatsappAxios.get('/broadcast/whatsapp/onechatting/template-map-list').then(unwrap),
  setTemplateMap: (payload) =>
    whatsappAxios.put('/broadcast/whatsapp/onechatting/template-map/set', payload).then(unwrap),
  unsetTemplateMap: (payload) =>
    whatsappAxios.put('/broadcast/whatsapp/onechatting/template-map/unset', payload).then(unwrap),
  getTemplateDetails: (params) =>
    whatsappAxios.get('/broadcast/whatsapp/onechatting/template-details', { params }).then(unwrap),
  createCampaign: (payload) =>
    whatsappAxios
      .post('/broadcast/whatsapp/onechatting/campaign/create', payload, { timeout: 120000 })
      .then(unwrap),
  resolveCampaignRecipients: (payload) =>
    whatsappAxios
      .post('/broadcast/whatsapp/onechatting/campaign/resolve-recipients', payload, {
        timeout: 120000,
      })
      .then(unwrap),
  listCampaigns: (params) =>
    whatsappAxios.get('/broadcast/whatsapp/onechatting/campaign/list', { params }).then(unwrap),
  getCampaignDetails: (params) =>
    whatsappAxios
      .get('/broadcast/whatsapp/onechatting/campaign/details', { params })
      .then(unwrap),
  listCampaignMessages: (params) =>
    whatsappAxios
      .get('/broadcast/whatsapp/onechatting/campaign/messages', { params })
      .then(unwrap),
  deleteCampaign: (payload) =>
    whatsappAxios.post('/broadcast/whatsapp/onechatting/campaign/delete', payload).then(unwrap),
  getCampaignClientNumbers: () =>
    whatsappAxios
      .get('/broadcast/whatsapp/onechatting/campaign/client-numbers', { timeout: 120000 })
      .then(unwrap),
  getWhatsAppWebHealth: () =>
    whatsappAxios.get('/broadcast/whatsapp/whatsappweb/health').then(unwrap),
  getWhatsAppWebStatus: () =>
    whatsappAxios.get('/broadcast/whatsapp/whatsappweb/status').then(unwrap),
  createWhatsAppWebSession: (payload = {}) =>
    whatsappAxios
      .post('/broadcast/whatsapp/whatsappweb/session/create', payload)
      .then(unwrap),
  getWhatsAppWebQr: () =>
    whatsappAxios.get('/broadcast/whatsapp/whatsappweb/qr').then(unwrap),
  requestWhatsAppWebPairingCode: (payload) =>
    whatsappAxios
      .post('/broadcast/whatsapp/whatsappweb/pairing-code', payload)
      .then(unwrap),
  deleteWhatsAppWebSession: () =>
    whatsappAxios.delete('/broadcast/whatsapp/whatsappweb/session').then(unwrap),
  getWhatsAppWebTemplateList: (params) =>
    whatsappAxios.get('/broadcast/whatsapp/whatsappweb/template/list', { params }).then(unwrap),
  getWhatsAppWebTemplateDetails: (templateId) =>
    whatsappAxios
      .get(`/broadcast/whatsapp/whatsappweb/template/details/${templateId}`)
      .then(unwrap),
  createWhatsAppWebTemplate: (payload) =>
    whatsappAxios.post('/broadcast/whatsapp/whatsappweb/template/create', payload).then(unwrap),
  editWhatsAppWebTemplate: (payload) =>
    whatsappAxios.put('/broadcast/whatsapp/whatsappweb/template/edit', payload).then(unwrap),
  getWhatsAppWebTemplateMapList: () =>
    whatsappAxios.get('/broadcast/whatsapp/whatsappweb/template-map-list').then(unwrap),
  setWhatsAppWebTemplateMap: (payload) =>
    whatsappAxios.put('/broadcast/whatsapp/whatsappweb/template-map/set', payload).then(unwrap),
  unsetWhatsAppWebTemplateMap: (payload) =>
    whatsappAxios.put('/broadcast/whatsapp/whatsappweb/template-map/unset', payload).then(unwrap),
  getWpSystemTemplateMapList: () =>
    whatsappAxios.get('/broadcast/whatsapp/wp-system/template-map-list').then(unwrap),
  getWpSystemTemplatesByType: (type) =>
    whatsappAxios
      .get('/broadcast/whatsapp/wp-system/templates', { params: { type } })
      .then(unwrap),
  setWpSystemTemplateMap: (payload) =>
    whatsappAxios.put('/broadcast/whatsapp/wp-system/template-map/set', payload).then(unwrap),
  unsetWpSystemTemplateMap: (payload) =>
    whatsappAxios.put('/broadcast/whatsapp/wp-system/template-map/unset', payload).then(unwrap),
};

export const normalizeList = (data) => (Array.isArray(data) ? data : []);

/**
 * Normalize API pagination. OneChatting often returns `meta` (with `has_more`)
 * instead of a full `pagination` object — pass that via `pagination` and optional
 * `defaults` (`page_no`, `limit`, `itemCount`) so the footer can still render.
 */
export const normalizePagination = (pagination, defaults = {}) => {
  const source = pagination && typeof pagination === 'object' ? pagination : {};
  const page_no = Math.max(
    1,
    Number(source.page_no ?? defaults.page_no ?? 1) || 1,
  );
  const limit = Math.max(
    1,
    Number(source.limit ?? defaults.limit ?? 20) || 20,
  );
  const has_more = Boolean(source.has_more ?? defaults.has_more);
  const itemCount = Math.max(0, Number(defaults.itemCount) || 0);

  let total = Number(source.total ?? source.total_records);
  if (!Number.isFinite(total) || total < 0) total = 0;
  if (total === 0 && (itemCount > 0 || has_more)) {
    total = has_more
      ? page_no * limit + 1
      : (page_no - 1) * limit + itemCount;
  }

  let total_pages = Number(source.total_pages);
  if (!Number.isFinite(total_pages) || total_pages < 1) {
    total_pages = Math.max(1, Math.ceil(total / limit) || 1);
    if (has_more && total_pages <= page_no) total_pages = page_no + 1;
  }

  return { page_no, limit, total, total_pages, has_more };
};
