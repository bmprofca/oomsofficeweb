import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { FiMic, FiMicOff, FiPhoneCall, FiPhoneOff, FiX } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import { voiceCallApi } from '../../services/voiceCallApi';
import { connectOfficeVoiceCallSocket } from '../../services/voiceCallSocket';
import { startCallTone } from '../../services/voiceCallTone';

const TERMINAL_STATUSES = new Set([
  'rejected',
  'cancelled',
  'missed',
  'ended',
  'failed',
]);

const STATUS_LABELS = {
  ringing: 'Incoming call',
  accepted: 'Connecting audio...',
  rejected: 'Call declined',
  cancelled: 'Call cancelled',
  missed: 'Call missed',
  ended: 'Call ended',
  failed: 'Call failed',
};

export default function IncomingInAppVoiceCall() {
  const location = useLocation();
  const [call, setCall] = useState(null);
  const [working, setWorking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [permissionReady, setPermissionReady] = useState(false);
  const roomRef = useRef(null);
  const audioContainerRef = useRef(null);
  const active = Boolean(localStorage.getItem('user_token') && localStorage.getItem('user_username') && localStorage.getItem('branch_id'));
  const callRef = useRef(null);
  const callId = call?.call_id;
  const status = call?.status;
  const terminal = Boolean(status && TERMINAL_STATUSES.has(status));

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  useEffect(() => {
    if (status !== 'ringing') return undefined;
    return startCallTone('incoming');
  }, [callId, status]);

  useEffect(() => {
    if (!active) {
      setPermissionReady(false);
      setCall(null);
      return undefined;
    }
    setPermissionReady(true);
    let mounted = true;
    const acceptIncomingCall = (incomingCall) => {
      if (
        !mounted ||
        !incomingCall?.call_id ||
        incomingCall.status !== 'ringing' ||
        (callRef.current && !TERMINAL_STATUSES.has(callRef.current.status))
      ) return;
      callRef.current = incomingCall;
      setError('');
      setCall(incomingCall);
    };
    const restoreIncomingCall = async () => {
      try {
        const response = await voiceCallApi.getIncoming();
        acceptIncomingCall(response?.data);
      } catch (requestError) {
        console.error('Unable to restore an incoming voice call after reconnect:', requestError);
      }
    };
    const socket = connectOfficeVoiceCallSocket({
      onAuthenticated: restoreIncomingCall,
      onIncoming: acceptIncomingCall,
    });
    return () => {
      mounted = false;
      socket.off('voice_call_incoming', acceptIncomingCall);
      socket.disconnect();
    };
  }, [active, location.pathname]);

  useEffect(() => {
    if (!permissionReady || !callId || TERMINAL_STATUSES.has(status)) return undefined;
    let mounted = true;
    let timer;
    let requestInProgress = false;
    const refresh = async () => {
      if (!mounted || requestInProgress) return;
      requestInProgress = true;
      try {
        const response = call?.initiated_by === 'staff'
          ? await voiceCallApi.getStaffCall(callId)
          : await voiceCallApi.get(callId);
        if (mounted) {
          setCall(response.data);
          setError('');
        }
      } catch (pollError) {
        if (mounted) {
          setError(pollError?.response?.data?.message || pollError?.message || 'Unable to refresh call status.');
          console.error('Unable to refresh incoming voice call:', pollError);
        }
      } finally {
        requestInProgress = false;
        if (mounted) timer = window.setTimeout(refresh, 1800);
      }
    };
    refresh();
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [permissionReady, callId, status, call?.initiated_by]);

  useEffect(() => {
    if (!permissionReady || !callId || status !== 'accepted') return undefined;
    let mounted = true;
    let room;
    const tracks = new Set();
    const disconnect = () => {
      tracks.forEach((track) => track.detach().forEach((element) => element.remove()));
      tracks.clear();
      if (roomRef.current === room) roomRef.current = null;
      room?.disconnect();
      if (audioContainerRef.current) audioContainerRef.current.replaceChildren();
      if (mounted) setConnected(false);
    };
    const connect = async () => {
      setJoining(true);
      setError('');
      try {
        const response = call?.initiated_by === 'staff'
          ? await voiceCallApi.staffToken(callId)
          : await voiceCallApi.token(callId);
        if (!mounted) return;
        room = new Room({ adaptiveStream: false, dynacast: false });
        roomRef.current = room;
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind !== Track.Kind.Audio || !audioContainerRef.current) return;
          const element = track.attach();
          element.autoplay = true;
          audioContainerRef.current.appendChild(element);
          const playback = element.play?.();
          if (playback?.catch) playback.catch(() => setError('Allow audio playback in your browser to hear the caller.'));
          tracks.add(track);
        });
        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((element) => element.remove());
          tracks.delete(track);
        });
        room.on(RoomEvent.Disconnected, () => {
          if (mounted) setConnected(false);
        });
        await room.connect(response.data.server_url, response.data.token);
        if (!mounted) {
          disconnect();
          return;
        }
        await room.localParticipant.setMicrophoneEnabled(true);
        setMuted(false);
        setConnected(true);
      } catch (joinError) {
        if (mounted) {
          setError(joinError?.response?.data?.message || joinError?.message || 'Unable to connect call audio.');
          console.error('Unable to connect incoming voice-call audio:', joinError);
        }
      } finally {
        if (mounted) setJoining(false);
      }
    };
    connect();
    return () => {
      mounted = false;
      disconnect();
    };
  }, [permissionReady, callId, status, call?.initiated_by]);

  const respond = async (action) => {
    if (!callId || working) return;
    setWorking(true);
    setError('');
    try {
      const response = call?.initiated_by === 'staff'
        ? await voiceCallApi.respondToStaffCall(callId, action)
        : await voiceCallApi.respondAsStaff(callId, action);
      setCall((current) => current ? { ...current, status: response.data.status } : current);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to respond to call.');
    } finally {
      setWorking(false);
    }
  };

  const endCall = async () => {
    if (!callId || working) return;
    setWorking(true);
    setError('');
    try {
      const response = call?.initiated_by === 'staff'
        ? await voiceCallApi.endStaffCall(callId)
        : await voiceCallApi.end(callId);
      setCall((current) => current
        ? {
          ...current,
          status: response?.data?.status || (current.status === 'ringing' ? 'cancelled' : 'ended'),
          ended_by_name: response?.data?.ended_by_name,
        }
        : current);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to end call.');
    } finally {
      setWorking(false);
    }
  };

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(muted);
      setMuted(!muted);
    } catch (muteError) {
      setError(muteError?.message || 'Unable to change microphone state.');
    }
  };

  const close = () => {
    if (!terminal) return;
    setCall(null);
    setError('');
  };

  if (!permissionReady || !call) return null;
  const callerName = call.other_participant_name || 'OOMS client';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Incoming voice call">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        {terminal ? (
          <button type="button" onClick={close} className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close call">
            <FiX />
          </button>
        ) : null}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <FiPhoneCall className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-900">{callerName}</h2>
        <p className="mt-2 text-sm text-slate-500">
          {terminal
            ? STATUS_LABELS[status] || status
            : connected
              ? 'Voice call connected'
              : joining
                ? 'Connecting audio...'
                : STATUS_LABELS[status] || status}
        </p>
        {(status === 'ended' || status === 'cancelled') && call.ended_by_name ? (
          <p className="mt-1 text-xs text-slate-400">
            {status === 'cancelled' ? 'Call cancelled' : 'Call ended'} by {call.ended_by_name}
          </p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-600" role="alert">{error}</p> : null}
        <div ref={audioContainerRef} className="sr-only" />
        {status === 'ringing' ? (
          <div className="mt-8 flex justify-center gap-5">
            <button type="button" onClick={() => respond('decline')} disabled={working} aria-label="Decline call" className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
              <FiPhoneOff className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => respond('accept')} disabled={working} aria-label="Accept call" className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              <FiPhoneCall className="h-5 w-5" />
            </button>
          </div>
        ) : null}
        {status === 'accepted' ? (
          <div className="mt-8 flex justify-center gap-5">
            <button type="button" onClick={toggleMute} disabled={!connected} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'} className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-50">
              {muted ? <FiMicOff className="h-5 w-5" /> : <FiMic className="h-5 w-5" />}
            </button>
            <button type="button" onClick={endCall} disabled={working} aria-label="End call" className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
              <FiPhoneOff className="h-5 w-5" />
            </button>
          </div>
        ) : null}
        {terminal ? (
          <button type="button" onClick={close} className="mt-8 rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800">
            Done
          </button>
        ) : null}
      </div>
    </div>
  );
}
