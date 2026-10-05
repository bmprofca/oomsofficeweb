import { io } from 'socket.io-client';
import { API_BASE_URL_NO_VERSION } from '../utils/api-controller';

const SOCKET_URL = new URL(API_BASE_URL_NO_VERSION, window.location.origin).origin;

function createOfficeSocket() {
  const username = localStorage.getItem('user_username') || '';
  const token = localStorage.getItem('user_token') || '';
  const branch = localStorage.getItem('branch_id') || '';
  return {
    username,
    token,
    branch,
    socket: io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: false,
    }),
  };
}

export function connectOfficeVoiceCallSocket({ onAuthenticated, onIncoming }) {
  const { username, token, branch, socket } = createOfficeSocket();
  socket.on('connect', () => {
    socket.emit('auth', { username, token, branch });
  });
  socket.on('auth_status', (authenticated) => {
    if (!authenticated) {
      console.error('Office voice-call socket authentication failed.');
      return;
    }
    onAuthenticated?.();
  });
  socket.on('voice_call_incoming', onIncoming);
  socket.connect();
  return socket;
}

export function requestOfficeVoiceCallCapability(recipientUsername, recipientPanel = 'client') {
  return new Promise((resolve, reject) => {
    const { username, token, branch, socket } = createOfficeSocket();
    if (!username || !token || !branch) {
      socket.close();
      reject(new Error('Sign in to OOMS to use voice calling.'));
      return;
    }

    let settled = false;
    const timer = window.setTimeout(() => finish(new Error('The voice-call server did not respond in time.')), 12000);
    const finish = (error, response) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      socket.disconnect();
      if (error) reject(error);
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
            return;
          }
          finish(null, response);
        },
      );
    });
    socket.on('connect_error', (error) => finish(error));
    socket.connect();
  });
}
