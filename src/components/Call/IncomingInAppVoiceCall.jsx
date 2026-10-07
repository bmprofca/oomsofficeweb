import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { FiMaximize2, FiMic, FiMicOff, FiMinimize2, FiMonitor, FiPhoneCall, FiPhoneOff, FiX } from 'react-icons/fi';
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
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenShareBusy, setScreenShareBusy] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [remoteScreenCount, setRemoteScreenCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [permissionReady, setPermissionReady] = useState(false);
  const roomRef = useRef(null);
  const audioContainerRef = useRef(null);
  const screenShareContainerRef = useRef(null);
  const screenShareTilesRef = useRef(new Map());
  const active = Boolean(localStorage.getItem('user_token') && localStorage.getItem('user_username') && localStorage.getItem('branch_id'));
  const callRef = useRef(null);
  const callId = call?.call_id;
  const status = call?.status;
  const terminal = Boolean(status && TERMINAL_STATUSES.has(status));

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  useEffect(() => {
    setMinimized(false);
  }, [callId]);

  useEffect(() => {
    if (terminal) setMinimized(false);
  }, [terminal]);

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
      screenShareTilesRef.current.forEach((tile) => tile.remove());
      screenShareTilesRef.current.clear();
      if (roomRef.current === room) roomRef.current = null;
      room?.disconnect();
      if (audioContainerRef.current) audioContainerRef.current.replaceChildren();
      if (screenShareContainerRef.current) screenShareContainerRef.current.replaceChildren();
      if (mounted) {
        setConnected(false);
        setScreenSharing(false);
        setRemoteScreenCount(0);
      }
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
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (publication.source === Track.Source.ScreenShare) {
            const container = screenShareContainerRef.current;
            if (!container || screenShareTilesRef.current.has(track)) return;
            const tile = document.createElement('div');
            tile.className = 'overflow-hidden rounded-lg bg-black';
            const label = document.createElement('p');
            label.className = 'px-3 py-2 text-left text-xs font-medium text-white';
            label.textContent = `${participant.name || 'Participant'} is sharing`;
            const element = track.attach();
            element.autoplay = true;
            element.playsInline = true;
            element.className = 'max-h-[55vh] w-full object-contain';
            tile.append(label, element);
            container.appendChild(tile);
            screenShareTilesRef.current.set(track, tile);
            setRemoteScreenCount(screenShareTilesRef.current.size);
            return;
          }
          if (track.kind !== Track.Kind.Audio || !audioContainerRef.current) return;
          const element = track.attach();
          element.autoplay = true;
          audioContainerRef.current.appendChild(element);
          const playback = element.play?.();
          if (playback?.catch) playback.catch(() => setError('Allow audio playback in your browser to hear the caller.'));
          tracks.add(track);
        });
        room.on(RoomEvent.TrackUnsubscribed, (track, publication) => {
          if (publication.source === Track.Source.ScreenShare) {
            track.detach().forEach((element) => element.remove());
            screenShareTilesRef.current.get(track)?.remove();
            screenShareTilesRef.current.delete(track);
            setRemoteScreenCount(screenShareTilesRef.current.size);
            return;
          }
          track.detach().forEach((element) => element.remove());
          tracks.delete(track);
        });
        room.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (publication.source === Track.Source.ScreenShare) {
            setScreenSharing(true);
            setMinimized(true);
          }
        });
        room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
          if (publication.source === Track.Source.ScreenShare) setScreenSharing(false);
        });
        room.on(RoomEvent.Disconnected, () => {
          if (mounted) {
            setConnected(false);
            setScreenSharing(false);
            screenShareTilesRef.current.forEach((tile) => tile.remove());
            screenShareTilesRef.current.clear();
            setRemoteScreenCount(0);
            if (screenShareContainerRef.current) screenShareContainerRef.current.replaceChildren();
          }
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

  const toggleScreenShare = async () => {
    const room = roomRef.current;
    if (!room || screenShareBusy) return;
    if (!screenSharing && !navigator.mediaDevices?.getDisplayMedia) {
      setError('Screen sharing is not supported by this browser.');
      return;
    }
    setScreenShareBusy(true);
    setError('');
    try {
      await room.localParticipant.setScreenShareEnabled(!screenSharing);
      const sharing = room.localParticipant.isScreenShareEnabled;
      setScreenSharing(sharing);
      if (sharing) setMinimized(true);
    } catch (shareError) {
      setError(shareError?.message || 'Unable to start screen sharing. Check your browser permissions and try again.');
    } finally {
      setScreenShareBusy(false);
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
    <>
    <div className={`fixed inset-0 z-[120] items-center justify-center bg-slate-950/60 p-4 ${minimized ? 'hidden' : 'flex'}`} role="dialog" aria-modal="true" aria-label="Incoming voice call">
      <div className={`relative w-full rounded-2xl bg-white p-6 text-center shadow-2xl ${remoteScreenCount ? 'max-w-4xl' : 'max-w-sm'}`}>
        {!terminal ? (
          <button type="button" onClick={() => setMinimized(true)} className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Minimize call and return to the app">
            <FiMinimize2 />
          </button>
        ) : null}
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
        <div
          ref={screenShareContainerRef}
          className={`mt-4 grid max-h-[55vh] gap-3 overflow-auto ${connected && remoteScreenCount ? '' : 'hidden'}`}
          aria-label="Shared screens"
        />
        {connected && screenSharing ? (
          <p className="mt-3 text-xs font-medium text-emerald-700" role="status" aria-live="polite">
            Your screen is being shared with the other participant.
          </p>
        ) : null}
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
            <button type="button" onClick={toggleScreenShare} disabled={!connected || screenShareBusy} aria-label={screenSharing ? 'Stop sharing screen' : 'Share screen'} title={screenSharing ? 'Stop sharing screen' : 'Share your screen with the other participant'} className={`flex h-14 w-14 items-center justify-center rounded-full ${screenSharing ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'} disabled:opacity-50`}>
              <FiMonitor className="h-5 w-5" />
            </button>
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
    {minimized && !terminal ? (
      <div className="fixed bottom-4 right-4 z-[121] flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-white shadow-xl" role="region" aria-label="Minimized voice call">
        <span className="max-w-40 truncate text-sm">{callerName} · {screenSharing ? 'Sharing screen' : connected ? 'Call active' : 'Connecting'}</span>
        {screenSharing ? (
          <button type="button" onClick={toggleScreenShare} disabled={screenShareBusy} className="rounded-full p-2 text-emerald-300 hover:bg-slate-700 disabled:opacity-50" aria-label="Stop sharing screen">
            <FiMonitor />
          </button>
        ) : null}
        <button type="button" onClick={() => setMinimized(false)} className="rounded-full p-2 hover:bg-slate-700" aria-label="Return to call">
          <FiMaximize2 />
        </button>
        <button type="button" onClick={endCall} disabled={working} className="rounded-full bg-red-600 p-2 hover:bg-red-700 disabled:opacity-50" aria-label="End call">
          <FiPhoneOff />
        </button>
      </div>
    ) : null}
    </>
  );
}
