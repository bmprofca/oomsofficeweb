import { useEffect, useRef } from 'react';
import {
  fetchCallChannel,
  isAuthenticatedSession,
} from '../../services/callChannelStore';

const CallChannelBootstrap = () => {
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current || !isAuthenticatedSession()) return;

    fetchedRef.current = true;
    fetchCallChannel().catch(() => {
      // Keep the last stored channel (or default) if the request fails.
    });
  }, []);

  return null;
};

export default CallChannelBootstrap;
