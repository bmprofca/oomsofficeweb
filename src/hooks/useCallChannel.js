import { useSyncExternalStore } from 'react';
import {
  DEFAULT_CALL_CHANNEL,
  getStoredCallChannel,
  subscribeCallChannel,
} from '../services/callChannelStore';

export const useCallChannel = () =>
  useSyncExternalStore(
    subscribeCallChannel,
    getStoredCallChannel,
    () => DEFAULT_CALL_CHANNEL,
  );
