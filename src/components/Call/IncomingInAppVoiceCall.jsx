import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { FiArrowLeft, FiBriefcase, FiClock, FiMaximize2, FiMic, FiMicOff, FiMinimize2, FiMonitor, FiPhoneCall, FiPhoneOff, FiStopCircle, FiUser, FiX } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
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

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function formatCallTime(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function CallActionTransition({ transitionKey, children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [transitionKey]);

  return (
    <div className={`transition-all duration-300 ease-out ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'}`}>
      {children}
    </div>
  );
}

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
  const [duration, setDuration] = useState(0);
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
  const terminal = Boolean(
    status && TERMINAL_STATUSES.has(status),
  );
  const dismissAnsweredCall = useCallback((event) => {
    const current = callRef.current;
    if (
      !current?.call_id ||
      String(current.call_id) !== String(event?.call_id) ||
      current.status !== 'ringing'
    ) return;
    const answeredByName = String(event.answered_by_name || 'Another OOMS user');
    callRef.current = null;
    setCall(null);
    toast(`${answeredByName} already answered this call.`);
  }, []);
  const dismissCancelledCall = useCallback((event) => {
    const current = callRef.current;
    if (
      !current?.call_id ||
      String(current.call_id) !== String(event?.call_id) ||
      current.status !== 'ringing'
    ) return;
    callRef.current = null;
    setCall(null);
  }, []);

  useEffect(() => {
    if (!connected) {
      setDuration(0);
      return undefined;
    }
    const interval = window.setInterval(() => setDuration((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [connected, call?.call_id]);

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
    if (!callId || status !== 'accepted' || minimized) return undefined;
    window.history.pushState({ activeVoiceCall: callId }, '', window.location.href);
    const minimizeOnBack = () => setMinimized(true);
    window.addEventListener('popstate', minimizeOnBack);
    return () => window.removeEventListener('popstate', minimizeOnBack);
  }, [callId, minimized, status]);

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
      onAnswered: dismissAnsweredCall,
      onCancelled: dismissCancelledCall,
    });
    return () => {
      mounted = false;
      socket.off('voice_call_incoming', acceptIncomingCall);
      socket.off('voice_call_answered', dismissAnsweredCall);
      socket.off('voice_call_cancelled', dismissCancelledCall);
      socket.disconnect();
    };
  }, [active, location.pathname, dismissAnsweredCall, dismissCancelledCall]);

  useEffect(() => {
    if (!permissionReady || !callId || terminal) return undefined;
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
          if (callRef.current?.call_id !== callId) return;
          if (response.data.session_declined) {
            callRef.current = null;
            setCall(null);
            return;
          }
          if (response.data.accepted_on_another_device) {
            dismissAnsweredCall({
              call_id: callId,
              answered_by_name: response.data.accepted_by_name,
            });
            return;
          }
          callRef.current = response.data;
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
  }, [permissionReady, callId, status, call?.initiated_by, terminal, dismissAnsweredCall]);

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
            tile.className = 'flex h-full min-h-[280px] w-full flex-col overflow-hidden rounded-lg bg-black';
            const label = document.createElement('p');
            label.className = 'shrink-0 px-4 py-2.5 text-left text-xs font-semibold text-white';
            label.textContent = `${participant.name || 'Participant'} is sharing`;
            const element = track.attach();
            element.autoplay = true;
            element.playsInline = true;
            element.className = 'min-h-0 w-full flex-1 object-contain';
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
      if (action === 'decline') {
        callRef.current = null;
        setCall(null);
        return;
      }
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
  const callerUsername = call.other_participant_username;
  const branchName = call.branch_name || call.branch_id;
  const callTime = formatCallTime(call.create_date);
  const isCallPage = status !== 'ringing';
  const CallFrame = isCallPage ? 'main' : 'div';

  return (
    <>
    <CallFrame
      className={`fixed inset-0 z-[120] ${isCallPage ? 'flex flex-col bg-slate-50' : 'flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4'} ${minimized ? 'hidden' : ''}`}
      role={isCallPage ? undefined : 'dialog'}
      aria-modal={isCallPage ? undefined : 'true'}
      aria-label="Incoming voice call"
    >
      {isCallPage ? (
        <header className="flex min-h-20 shrink-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-[1_1_20rem]">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <p className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-teal-700">OOMS voice</p>
              <span className="inline-flex min-h-5 max-w-full items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{connected ? `Connected · ${formatDuration(duration)}` : joining ? 'Connecting…' : STATUS_LABELS[status] || status}</span>
            </div>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <h1 className="max-w-full truncate text-base font-bold text-slate-900">{callerName}</h1>
              {callerUsername ? <p className="min-w-0 max-w-full truncate text-xs text-slate-500">{callerUsername}</p> : null}
            </div>
          </div>
          {branchName ? (
            <div className="max-w-[45vw] shrink-0 text-right sm:max-w-[30vw]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Branch</p>
              <p className="max-w-full truncate text-sm font-semibold text-slate-800">{branchName}</p>
            </div>
          ) : null}
          {!terminal ? (
            <button type="button" onClick={() => setMinimized(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2" aria-label="Back to the app and keep call active" title="Back to app">
              <FiArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
        </header>
      ) : null}
      <section className={isCallPage
        ? `relative mx-auto flex min-h-0 w-full flex-1 flex-col text-center ${remoteScreenCount ? 'max-w-none items-stretch justify-start overflow-hidden px-2 py-1' : 'max-w-3xl items-center justify-center overflow-y-auto px-5 py-8'}`
        : `relative my-auto max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-2xl sm:p-6 ${remoteScreenCount ? 'max-w-4xl' : 'max-w-md'}`
      }>
        {!terminal && !isCallPage ? (
          <button type="button" onClick={() => setMinimized(true)} className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Minimize call and return to the app">
            <FiMinimize2 />
          </button>
        ) : null}
        {terminal ? (
          <button type="button" onClick={close} className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close call">
            <FiX />
          </button>
        ) : null}
        {!isCallPage ? (
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <FiPhoneCall className="h-8 w-8" />
          </div>
        ) : null}
        {!isCallPage ? (
          <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-teal-700">
            Incoming voice call
          </p>
        ) : null}
        {!isCallPage ? <h2 className="mt-5 text-xl font-semibold text-slate-900">{callerName}</h2> : null}
        {!isCallPage ? <p className="mt-2 text-sm text-slate-500">
          {terminal
            ? STATUS_LABELS[status] || status
            : connected
              ? 'Voice call connected'
              : joining
                ? 'Connecting audio...'
                : STATUS_LABELS[status] || status}
        </p> : null}
        {(branchName || callerUsername || callTime) && !isCallPage ? (
          <div className="mx-auto mt-5 grid w-full max-w-xs gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
            {branchName ? (
              <div className="flex items-start gap-3">
                <FiBriefcase className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Calling from branch</p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">{branchName}</p>
                </div>
              </div>
            ) : null}
            {callerUsername ? (
              <div className="flex items-start gap-3">
                <FiUser className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-slate-500">OOMS account</p>
                  <p className="mt-0.5 break-all text-sm font-medium text-slate-800">{callerUsername}</p>
                </div>
              </div>
            ) : null}
            {callTime ? (
              <div className="flex items-start gap-3">
                <FiClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Call received</p>
                  <p className="mt-0.5 text-sm text-slate-700">{callTime}</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {(status === 'ended' || status === 'cancelled') && call.ended_by_name ? (
          <p className="mt-1 text-xs text-slate-400">
            {status === 'cancelled' ? 'Call cancelled' : 'Call ended'} by {call.ended_by_name}
          </p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-600" role="alert">{error}</p> : null}
        <div ref={audioContainerRef} className="sr-only" />
        <div
          ref={screenShareContainerRef}
          className={`${isCallPage ? 'mt-0 min-h-0 flex-1 rounded-none p-0' : 'mt-2 h-[58vh] min-h-[280px] rounded-lg p-1.5'} grid w-full auto-rows-fr grid-cols-1 gap-2 overflow-hidden bg-slate-950 ${connected && remoteScreenCount ? '' : 'hidden'}`}
          aria-label="Shared screens"
        />
        {connected && screenSharing && !isCallPage ? (
          <p className="mt-3 text-xs font-medium text-emerald-700" role="status" aria-live="polite">
            Your screen is being shared with the other participant.
          </p>
        ) : null}
        {status === 'ringing' ? (
          <CallActionTransition transitionKey={status}>
            <div className={`flex shrink-0 justify-center gap-4 ${isCallPage ? 'h-[68px] items-center pb-2' : 'mt-3 pb-2'}`}>
              <button type="button" onClick={() => respond('decline')} disabled={working} aria-label="Decline call" className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform duration-200 hover:scale-110 hover:bg-red-700 disabled:opacity-50">
                <FiPhoneOff className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => respond('accept')} disabled={working} aria-label="Accept call" className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform duration-200 hover:scale-110 hover:bg-emerald-700 disabled:opacity-50">
                <FiPhoneCall className="h-5 w-5" />
              </button>
            </div>
          </CallActionTransition>
        ) : null}
        {status === 'accepted' ? (
          <CallActionTransition transitionKey={status}>
            <div className={`flex shrink-0 justify-center gap-4 ${isCallPage ? 'h-[68px] items-center pb-2' : 'mt-3 pb-2'}`}>
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
          </CallActionTransition>
        ) : null}
        {terminal ? (
          <button type="button" onClick={close} className="mt-8 rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800">
            Done
          </button>
        ) : null}
      </section>
    </CallFrame>
    {minimized && !terminal ? (
      <div className="fixed bottom-4 right-4 z-[121] flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-white shadow-xl" role="region" aria-label="Minimized voice call">
        <span className="max-w-40 truncate text-sm">{callerName} · {screenSharing ? `Sharing screen · ${formatDuration(duration)}` : connected ? formatDuration(duration) : 'Connecting'}</span>
        {connected ? (
          <button type="button" onClick={toggleMute} className="rounded-full p-2 hover:bg-slate-700" aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>
            {muted ? <FiMicOff /> : <FiMic />}
          </button>
        ) : null}
        {screenSharing ? (
          <button type="button" onClick={toggleScreenShare} disabled={screenShareBusy} className="rounded-full p-2 text-emerald-300 hover:bg-slate-700 disabled:opacity-50" aria-label="Stop sharing screen">
            <FiStopCircle />
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
