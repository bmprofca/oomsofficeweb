import { useSyncExternalStore } from 'react';
import {
  DEFAULT_SMS_CHANNEL,
  getStoredSmsChannel,
  subscribeSmsChannel,
} from '../services/smsChannelStore';

export const useSmsChannel = () =>
  useSyncExternalStore(
    subscribeSmsChannel,
    getStoredSmsChannel,
    () => DEFAULT_SMS_CHANNEL,
  );
