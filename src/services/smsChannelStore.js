import { smsApi } from './smsApi';

export const SMS_CHANNEL_STORAGE_KEY = 'sms_channel';
export const SMS_CHANNEL_CHANGE_EVENT = 'sms-channel-changed';
export const DEFAULT_SMS_CHANNEL = 'disabled';

const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new CustomEvent(SMS_CHANNEL_CHANGE_EVENT));
};

export const getStoredSmsChannel = () =>
  localStorage.getItem(SMS_CHANNEL_STORAGE_KEY) || DEFAULT_SMS_CHANNEL;

export const setStoredSmsChannel = (channel) => {
  const value = channel || DEFAULT_SMS_CHANNEL;
  localStorage.setItem(SMS_CHANNEL_STORAGE_KEY, value);
  notify();
  return value;
};

export const clearStoredSmsChannel = () => {
  localStorage.removeItem(SMS_CHANNEL_STORAGE_KEY);
  notify();
};

export const fetchSmsChannel = async () => {
  const res = await smsApi.getChannel();
  const channel = res?.data?.channel || DEFAULT_SMS_CHANNEL;
  return setStoredSmsChannel(channel);
};

export const subscribeSmsChannel = (listener) => {
  listeners.add(listener);

  const onStorage = (event) => {
    if (event.key === SMS_CHANNEL_STORAGE_KEY) {
      listener();
    }
  };

  const onCustom = () => listener();

  window.addEventListener('storage', onStorage);
  window.addEventListener(SMS_CHANNEL_CHANGE_EVENT, onCustom);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(SMS_CHANNEL_CHANGE_EVENT, onCustom);
  };
};

export const isAuthenticatedSession = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('user_token');
  const username = localStorage.getItem('username') || localStorage.getItem('user_username');
  return Boolean(token && username);
};
