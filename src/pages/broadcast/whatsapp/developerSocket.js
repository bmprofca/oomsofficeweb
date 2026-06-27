import { io } from 'socket.io-client';
import { emitDeveloperAuth, isMyProject } from './oneChattingSocketUtils';

export const W1CHAT_SOCKET_URL =
  process.env.REACT_APP_W1CHAT_SOCKET_URL || 'https://server.onechatting.com';

export const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  AUTHENTICATED: 'authenticated',
  ERROR: 'error',
};

const SOCKET_OPTIONS = {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  autoConnect: false,
};

/**
 * @example
 * const socket = createDeveloperSocket({
 *   token: developerToken,
 *   onChat: (payload) => { ... },
 *   onMessageStatus: (payload) => { ... },
 *   onUnreadCount: (payload) => { ... },
 *   onChatAssigned: (payload) => { ... },
 *   onCaseStatus: (payload) => { ... },
 *   onAuth: (profile) => { ... },
 *   onError: (err) => { ... },
 * });
 * await socket.connect();
 * socket.disconnect();
 */
export const createDeveloperSocket = ({
  token,
  url = W1CHAT_SOCKET_URL,
  onChat,
  onMessageStatus,
  onUnreadCount,
  onChatAssigned,
  onCaseStatus,
  onAuth,
  onError,
  onStateChange,
} = {}) => {
  let socket = null;
  let projectId = null;
  let state = CONNECTION_STATES.DISCONNECTED;
  let authFailed = false;

  const setState = (next) => {
    state = next;
    onStateChange?.(next);
  };

  const shouldHandle = (eventProjectId) =>
    isMyProject(eventProjectId, projectId);

  const authenticate = () => {
    if (!socket || authFailed || !token?.trim()) return;
    emitDeveloperAuth(socket, token.trim());
  };

  const handleReconnect = () => {
    if (!authFailed) authenticate();
  };

  const bindSocketEvents = () => {
    socket.on('connect', () => {
      setState(CONNECTION_STATES.CONNECTED);
      authenticate();
    });

    socket.on('disconnect', (reason) => {
      console.log('Developer socket disconnected:', reason);
      if (!authFailed) {
        setState(CONNECTION_STATES.DISCONNECTED);
      }
    });

    socket.on('connect_error', (error) => {
      onError?.(error);
    });

    socket.on('auth_status', (ok) => {
      if (ok) {
        setState(CONNECTION_STATES.AUTHENTICATED);
        return;
      }

      authFailed = true;
      setState(CONNECTION_STATES.ERROR);
      onError?.(new Error('Socket authentication failed'));
      console.error('Developer socket authentication failed');
    });

    socket.on('auth_profile', (profile) => {
      projectId = profile?.project_id ?? null;
      onAuth?.(profile);
    });

    socket.on('chat', (payload) => {
      if (!shouldHandle(payload?.project_id)) return;
      onChat?.(payload);
    });

    socket.on('message_status', (payload) => {
      if (!shouldHandle(payload?.project_id)) return;
      onMessageStatus?.(payload);
    });

    socket.on('total_unread_count', (payload) => {
      if (payload?.project_id && !shouldHandle(payload.project_id)) return;
      onUnreadCount?.(payload);
    });

    socket.on('chat_assigned', (payload) => {
      onChatAssigned?.(payload);
    });

    socket.on('case_status', (payload) => {
      onCaseStatus?.(payload);
    });

    socket.io.on('reconnect', handleReconnect);
  };

  const teardown = () => {
    if (!socket) return;

    socket.io.off('reconnect', handleReconnect);
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    projectId = null;
    authFailed = false;
  };

  return {
    connect() {
      const trimmedToken = token?.trim();
      const socketUrl = url?.trim() || W1CHAT_SOCKET_URL;

      if (!trimmedToken) {
        return Promise.reject(new Error('Missing developer token'));
      }

      if (socket?.connected && state === CONNECTION_STATES.AUTHENTICATED) {
        return Promise.resolve();
      }

      teardown();
      authFailed = false;
      setState(CONNECTION_STATES.CONNECTING);

      socket = io(socketUrl, SOCKET_OPTIONS);
      bindSocketEvents();
      socket.connect();

      return new Promise((resolve, reject) => {
        const cleanup = () => {
          socket?.off('auth_status', onAuthStatus);
          socket?.off('connect_error', onConnectError);
        };

        const onAuthStatus = (ok) => {
          if (!ok) return;
          cleanup();
          resolve();
        };

        const onConnectError = (error) => {
          cleanup();
          reject(error);
        };

        socket.once('auth_status', onAuthStatus);
        socket.once('connect_error', onConnectError);
      });
    },

    disconnect() {
      teardown();
      setState(CONNECTION_STATES.DISCONNECTED);
    },

    getState: () => state,
    getProjectId: () => projectId,
  };
};

export const extractDeveloperToken = (response) =>
  response?.developer_token?.trim() || '';
