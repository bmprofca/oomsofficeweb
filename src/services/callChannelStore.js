import { callApi } from './callApi';

export const CALL_CHANNEL_STORAGE_KEY = 'call_channel';
export const CALL_CHANNEL_CHANGE_EVENT = 'call-channel-changed';
export const DEFAULT_CALL_CHANNEL = 'disabled';

const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new CustomEvent(CALL_CHANNEL_CHANGE_EVENT));
};

export const getStoredCallChannel = () =>
  localStorage.getItem(CALL_CHANNEL_STORAGE_KEY) || DEFAULT_CALL_CHANNEL;

export const setStoredCallChannel = (channel) => {
  const value = channel || DEFAULT_CALL_CHANNEL;
  localStorage.setItem(CALL_CHANNEL_STORAGE_KEY, value);
  notify();
  return value;
};

export const clearStoredCallChannel = () => {
  localStorage.removeItem(CALL_CHANNEL_STORAGE_KEY);
  notify();
};

export const isAuthenticatedSession = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('user_token');
  const username = localStorage.getItem('username') || localStorage.getItem('user_username');
  const branchId = localStorage.getItem('branch_id');
  // Match getHeaders(): capability/initiate need username + token + branch
  return Boolean(token && username && branchId);
};

export const fetchCallChannel = async () => {
  const res = await callApi.getChannel();
  const channel = res?.data?.channel || DEFAULT_CALL_CHANNEL;
  return setStoredCallChannel(channel);
};

export const subscribeCallChannel = (listener) => {
  listeners.add(listener);

  const onStorage = (event) => {
    if (event.key === CALL_CHANNEL_STORAGE_KEY) {
      listener();
    }
  };

  const onCustom = () => listener();

  window.addEventListener('storage', onStorage);
  window.addEventListener(CALL_CHANNEL_CHANGE_EVENT, onCustom);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CALL_CHANNEL_CHANGE_EVENT, onCustom);
  };
};
