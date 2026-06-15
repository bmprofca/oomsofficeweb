import { whatsappApi } from './whatsappApi';

export const WHATSAPP_CHANNEL_STORAGE_KEY = 'whatsapp_channel';
export const WHATSAPP_CHANNEL_CHANGE_EVENT = 'whatsapp-channel-changed';
export const DEFAULT_WHATSAPP_CHANNEL = 'disabled';

const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new CustomEvent(WHATSAPP_CHANNEL_CHANGE_EVENT));
};

export const getStoredWhatsappChannel = () =>
  localStorage.getItem(WHATSAPP_CHANNEL_STORAGE_KEY) || DEFAULT_WHATSAPP_CHANNEL;

export const setStoredWhatsappChannel = (channel) => {
  const value = channel || DEFAULT_WHATSAPP_CHANNEL;
  localStorage.setItem(WHATSAPP_CHANNEL_STORAGE_KEY, value);
  notify();
  return value;
};

export const clearStoredWhatsappChannel = () => {
  localStorage.removeItem(WHATSAPP_CHANNEL_STORAGE_KEY);
  notify();
};

export const fetchWhatsappChannel = async () => {
  const res = await whatsappApi.getChannel();
  const channel = res?.data?.channel || DEFAULT_WHATSAPP_CHANNEL;
  return setStoredWhatsappChannel(channel);
};

export const subscribeWhatsappChannel = (listener) => {
  listeners.add(listener);

  const onStorage = (event) => {
    if (event.key === WHATSAPP_CHANNEL_STORAGE_KEY) {
      listener();
    }
  };

  const onCustom = () => listener();

  window.addEventListener('storage', onStorage);
  window.addEventListener(WHATSAPP_CHANNEL_CHANGE_EVENT, onCustom);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(WHATSAPP_CHANNEL_CHANGE_EVENT, onCustom);
  };
};

export const isAuthenticatedSession = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('user_token');
  const username = localStorage.getItem('username') || localStorage.getItem('user_username');
  return Boolean(token && username);
};
