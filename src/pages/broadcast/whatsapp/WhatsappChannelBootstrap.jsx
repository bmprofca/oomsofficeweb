import { useEffect, useRef } from 'react';
import {
  fetchWhatsappChannel,
  isAuthenticatedSession,
} from './whatsappChannelStore';

const WhatsappChannelBootstrap = () => {
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current || !isAuthenticatedSession()) return;

    fetchedRef.current = true;
    fetchWhatsappChannel().catch(() => {
      // Keep the last stored channel (or default) if the request fails.
    });
  }, []);

  return null;
};

export default WhatsappChannelBootstrap;
