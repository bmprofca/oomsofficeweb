import { useEffect, useRef, useState } from 'react';
import {
  CONNECTION_STATES,
  W1CHAT_SOCKET_URL,
  createDeveloperSocket,
} from './developerSocket';

const useDeveloperSocket = (developerToken, handlers = {}) => {
  const handlersRef = useRef(handlers);
  const serviceRef = useRef(null);
  const [connectionState, setConnectionState] = useState(
    CONNECTION_STATES.DISCONNECTED,
  );

  handlersRef.current = handlers;

  useEffect(() => {
    const token = developerToken?.trim();
    if (!token) {
      serviceRef.current?.disconnect();
      serviceRef.current = null;
      setConnectionState(CONNECTION_STATES.DISCONNECTED);
      return undefined;
    }

    const service = createDeveloperSocket({
      token,
      url: W1CHAT_SOCKET_URL,
      onStateChange: setConnectionState,
      onChat: (payload) => handlersRef.current.onChat?.(payload),
      onMessageStatus: (payload) =>
        handlersRef.current.onMessageStatus?.(payload),
      onUnreadCount: (payload) =>
        handlersRef.current.onUnreadCount?.(payload),
      onChatAssigned: (payload) =>
        handlersRef.current.onChatAssigned?.(payload),
      onCaseStatus: (payload) => handlersRef.current.onCaseStatus?.(payload),
      onAuth: (profile) => handlersRef.current.onAuth?.(profile),
      onError: (error) => handlersRef.current.onError?.(error),
    });

    serviceRef.current = service;

    service.connect().catch((error) => {
      console.error('Developer socket connect failed:', error);
    });

    return () => {
      service.disconnect();
      serviceRef.current = null;
    };
  }, [developerToken]);

  return {
    connectionState,
    authenticated: connectionState === CONNECTION_STATES.AUTHENTICATED,
    connecting: connectionState === CONNECTION_STATES.CONNECTING,
    error: connectionState === CONNECTION_STATES.ERROR,
  };
};

export default useDeveloperSocket;
