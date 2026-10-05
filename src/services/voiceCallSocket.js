import { io } from 'socket.io-client';
import { API_BASE_URL_NO_VERSION } from '../utils/api-controller';

const SOCKET_URL = new URL(API_BASE_URL_NO_VERSION, window.location.origin).origin;

export function connectOfficeVoiceCallSocket({ onAuthenticated, onIncoming }) {
  const username = localStorage.getItem('user_username') || '';
  const token = localStorage.getItem('user_token') || '';
  const branch = localStorage.getItem('branch_id') || '';
  const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    timeout: 10000,
    autoConnect: false,
  });

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
