import axios from 'axios';
import API_BASE_URL from '../../../utils/api-controller';
import getHeaders from '../../../utils/get-headers';

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
  getChatList: (params) =>
    whatsappAxios.get('/broadcast/whatsapp/onechatting/chat-list', { params }).then(unwrap),
  getChatHistory: (params) =>
    whatsappAxios.get('/broadcast/whatsapp/onechatting/chat-history', { params }).then(unwrap),
};

export const normalizeList = (data) => (Array.isArray(data) ? data : []);
export const normalizePagination = (pagination) => ({
  page_no: Number(pagination?.page_no || 1),
  limit: Number(pagination?.limit || 20),
  total: Number(pagination?.total || 0),
  total_pages: Number(pagination?.total_pages || 1),
  has_more: Boolean(pagination?.has_more),
});
