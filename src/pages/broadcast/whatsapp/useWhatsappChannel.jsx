import { useSyncExternalStore } from 'react';
import {
  DEFAULT_WHATSAPP_CHANNEL,
  getStoredWhatsappChannel,
  subscribeWhatsappChannel,
} from './whatsappChannelStore';

export const useWhatsappChannel = () =>
  useSyncExternalStore(
    subscribeWhatsappChannel,
    getStoredWhatsappChannel,
    () => DEFAULT_WHATSAPP_CHANNEL,
  );
