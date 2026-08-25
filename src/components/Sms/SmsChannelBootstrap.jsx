import { useEffect, useRef } from 'react';
import {
  fetchSmsChannel,
  isAuthenticatedSession,
} from '../../services/smsChannelStore';

const SmsChannelBootstrap = () => {
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current || !isAuthenticatedSession()) return;

    fetchedRef.current = true;
    fetchSmsChannel().catch(() => {
      // Keep the last stored channel (or default) if the request fails.
    });
  }, []);

  return null;
};

export default SmsChannelBootstrap;
