import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const callAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

callAxios.interceptors.request.use((config) => {
  const headers = getHeaders();
  if (!headers) {
    return Promise.reject(new Error('Missing authentication headers. Please sign in again.'));
  }
  config.headers = { ...(config.headers || {}), ...headers };
  return config;
});

const unwrap = (res) => res?.data;

export const CALL_CHANNEL_OPTIONS = [
  { value: 'disabled', label: 'Disable' },
  { value: 'ooms system', label: 'OOMS System' },
];

export const CALL_SUB_TABS = CALL_CHANNEL_OPTIONS.filter(
  (option) => option.value !== 'disabled'
);

export const callApi = {
  getChannel: () => callAxios.get('/broadcast/call/channel').then(unwrap),
  updateChannel: (payload) =>
    callAxios.put('/broadcast/call/channel', payload).then(unwrap),
  getBranchConfig: () =>
    callAxios.get('/broadcast/call/ooms-system/config').then(unwrap),
  updateBranchConfig: (payload) =>
    callAxios.put('/broadcast/call/ooms-system/config', payload).then(unwrap),
  listStaff: (params) =>
    callAxios.get('/broadcast/call/ooms-system/staff', { params }).then(unwrap),
  updateStaffExtension: (payload) =>
    callAxios.put('/broadcast/call/ooms-system/staff', payload).then(unwrap),
  getCapability: () => callAxios.get('/broadcast/call/capability').then(unwrap),
  initiate: (payload) =>
    callAxios.post('/broadcast/call/initiate', payload).then(unwrap),
};

export const normalizeList = (data) => (Array.isArray(data) ? data : []);

export const normalizePagination = (pagination) => ({
  page_no: Number(pagination?.page_no) || 1,
  limit: Number(pagination?.limit) || 20,
  total: Number(pagination?.total) || 0,
  total_pages: Number(pagination?.total_pages) || 1,
  is_last_page: Boolean(pagination?.is_last_page),
});

export default callApi;
