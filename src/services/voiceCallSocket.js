import { io } from 'socket.io-client';
import { API_BASE_URL_NO_VERSION } from '../utils/api-controller';

const SOCKET_URL = new URL(API_BASE_URL_NO_VERSION, window.location.origin).origin;

/** Socket.io sometimes emits non-Error values; CRA overlays those as "[object Object]". */
function asError(error, fallback = 'Voice call request failed') {
  if (error instanceof Error) return error;
  if (typeof error === 'string' && error.trim()) return new Error(error);
  if (error && typeof error === 'object') {
    const raw = error.message || error.description || error.msg || error.error;
    const message = typeof raw === 'string' && raw.trim() ? raw : fallback;
    const normalized = new Error(message);
    normalized.cause = error;
    return normalized;
  }
  return new Error(fallback);
}

export function getOfficeVoiceCallSessionId() {
  let sessionId = sessionStorage.getItem('ooms_voice_call_session_id');
  if (!sessionId) {
    sessionId = `web:${window.crypto.randomUUID()}`;
    sessionStorage.setItem('ooms_voice_call_session_id', sessionId);
  }
  return sessionId;
}

function createOfficeSocket(reconnection = true) {
  const username = localStorage.getItem('user_username') || '';
  const token = localStorage.getItem('user_token') || '';
  const branch = localStorage.getItem('branch_id') || '';
  const sessionId = getOfficeVoiceCallSessionId();
  return {
    username,
    token,
    branch,
    sessionId,
    socket: io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: false,
    }),
  };
}

export function connectOfficeVoiceCallSocket({ onAuthenticated, onIncoming, onAnswered, onCancelled }) {
  const { username, token, branch, sessionId, socket } = createOfficeSocket();
  socket.on('connect', () => socket.emit('auth', {
    username,
    token,
    branch,
    voice_call_session_id: sessionId,
  }));
  socket.on('auth_status', (authenticated) => {
    if (!authenticated) {
      console.error('Office voice-call socket authentication failed.');
      return;
    }
    onAuthenticated?.();
  });
  socket.on('voice_call_incoming', onIncoming);
  socket.on('voice_call_answered', onAnswered);
  socket.on('voice_call_cancelled', onCancelled);
  socket.connect();
  return socket;
}

export function requestOfficeVoiceCallCapability(recipientUsername, recipientPanel = 'client') {
  const { username, token, branch, socket } = createOfficeSocket(false);
  if (!username || !token || !branch) {
    socket.close();
    return Promise.reject(new Error('Sign in to OOMS to use voice calling.'));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => finish(new Error('The voice-call server did not respond in time.')), 12000);
    const finish = (error, response) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      socket.disconnect();
      if (error) reject(asError(error, 'Could not connect to the voice-call server.'));
      else resolve(response);
    };
    socket.on('connect', () => socket.emit('auth', { username, token, branch }));
    socket.on('auth_status', (authenticated) => {
      if (!authenticated) {
        finish(new Error('Office voice-call socket authentication failed.'));
        return;
      }
      socket.emit(
        'voice_call_capability_check',
        { recipient_username: recipientUsername, recipient_panel: recipientPanel },
        (response) => {
          if (!response?.success) {
            finish(new Error(response?.message || 'Could not check call availability.'));
          } else {
            finish(null, response);
          }
        },
      );
    });
    socket.on('connect_error', finish);
    socket.connect();
  });
}

export function watchOfficeVoiceCallCapability(recipientUsername, recipientPanel, onUpdate) {
  const { username, token, branch, socket } = createOfficeSocket();
  if (!username || !token || !branch) {
    socket.close();
    return Promise.reject(new Error('Sign in to OOMS to use voice calling.'));
  }
  return new Promise((resolve, reject) => {
    const subscriptionId = `office_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let active = true;
    let initialResolved = false;
    const timer = window.setTimeout(() => fail(new Error('The voice-call server did not respond in time.')), 12000);
    const unsubscribe = () => {
      if (!active) return;
      active = false;
      window.clearTimeout(timer);
      socket.emit('voice_call_capability_unwatch', subscriptionId);
      socket.disconnect();
    };
    const fail = (error) => {
      const normalized = asError(error, 'Could not connect to the voice-call server.');
      if (initialResolved) {
        onUpdate?.({ success: false, message: normalized.message });
        return;
      }
      initialResolved = true;
      active = false;
      window.clearTimeout(timer);
      socket.disconnect();
      reject(normalized);
    };
    const subscribe = () => {
      socket.emit(
        'voice_call_capability_watch',
        {
          subscription_id: subscriptionId,
          recipient_username: recipientUsername,
          recipient_panel: recipientPanel,
        },
        (response) => {
          if (!active) return;
          if (!response?.success) {
            fail(new Error(response?.message || 'Could not check call availability.'));
          } else if (!initialResolved) {
            initialResolved = true;
            window.clearTimeout(timer);
            resolve({ capability: response, unsubscribe });
          } else {
            onUpdate?.(response);
          }
        },
      );
    };
    socket.on('connect', () => socket.emit('auth', { username, token, branch }));
    socket.on('auth_status', (authenticated) => {
      if (!authenticated) {
        fail(new Error('Office voice-call socket authentication failed.'));
        return;
      }
      subscribe();
    });
    socket.on('voice_call_capability_update', (update) => {
      if (active && update?.subscription_id === subscriptionId) onUpdate?.(update);
    });
    socket.on('connect_error', fail);
    socket.connect();
  });
}
