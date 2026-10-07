import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { FiMaximize2, FiMic, FiMicOff, FiMinimize2, FiMonitor, FiPhoneCall, FiPhoneOff, FiStopCircle, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { voiceCallApi } from '../../services/voiceCallApi';
import { startCallTone } from '../../services/voiceCallTone';

const TERMINAL_STATUSES = new Set([
  'rejected',
  'cancelled',
  'missed',
  'ended',
  'failed',
]);

const STATUS_LABELS = {
  ringing: 'Ringing...',
  accepted: 'Connecting audio...',
  rejected: 'Call declined',
  cancelled: 'Call cancelled',
  missed: 'No answer',
  ended: 'Call ended',
  failed: 'Call failed',
};

function makeIdempotencyKey() {
  return `web_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
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

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

export const InAppVoiceCallButton = forwardRef(function InAppVoiceCallButton({
  clientUsername,
  displayName,
  recipientPanel = 'client',
  showTrigger = true,
  checkAvailability = true,
  availabilityOverride = null,
  onAvailabilityChange,
  onCallStarted,
  onCallClosed,
}, ref) {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [call, setCall] = useState(null);
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenShareBusy, setScreenShareBusy] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [remoteScreenCount, setRemoteScreenCount] = useState(0);
  const [changingMute, setChangingMute] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const roomRef = useRef(null);
  const callIdRef = useRef(null);
  const audioContainerRef = useRef(null);
  const screenShareContainerRef = useRef(null);
  const screenShareTilesRef = useRef(new Map());
  const joiningCallRef = useRef(null);

  useEffect(() => {
    let active = true;
    setAvailable(false);
    setChecking(true);
    if (availabilityOverride !== null) {
      setAvailable(Boolean(availabilityOverride));
      setChecking(false);
      return () => {
        active = false;
      };
    }
    if (!checkAvailability) {
      return () => {
        active = false;
      };
    }
    if (!clientUsername) {
      setChecking(false);
      return undefined;
    }

    voiceCallApi
      .getCapability(clientUsername, recipientPanel)
      .then((response) => {
        if (active) setAvailable(Boolean(response?.data?.can_call));
      })
      .catch((requestError) => {
        if (active) {
          console.error('Could not check in-app call availability:', requestError);
          toast.error(requestError?.response?.data?.message || requestError.message || 'Could not check voice call availability');
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [availabilityOverride, checkAvailability, clientUsername, recipientPanel]);

  useEffect(() => {
    onAvailabilityChange?.({ available, checking });
  }, [available, checking, onAvailabilityChange]);

  useEffect(() => {
    if (call?.status !== 'ringing') return undefined;
    return startCallTone('outgoing');
  }, [call?.call_id, call?.status]);

  const disconnectRoom = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (!room) return;
    room.removeAllListeners();
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        publication.track?.detach().forEach((element) => element.remove());
      });
    });
    screenShareTilesRef.current.forEach((tile) => tile.remove());
    screenShareTilesRef.current.clear();
    room.disconnect();
    if (audioContainerRef.current) audioContainerRef.current.replaceChildren();
    if (screenShareContainerRef.current) screenShareContainerRef.current.replaceChildren();
    setScreenSharing(false);
    setRemoteScreenCount(0);
  }, []);

  const closeCall = useCallback(async () => {
    await disconnectRoom();
    setCall(null);
    setConnected(false);
    setMuted(false);
    setDuration(0);
    setError('');
    callIdRef.current = null;
    joiningCallRef.current = null;
    onCallClosed?.();
  }, [disconnectRoom, onCallClosed]);

  const hangUp = useCallback(async () => {
    const callId = callIdRef.current;
    if (!callId) {
      await closeCall();
      return;
    }
    setStarting(true);
    try {
      const response = await voiceCallApi.end(callId);
      setCall((current) =>
        current
          ? {
              ...current,
              status: response?.data?.status || (current.status === 'ringing' ? 'cancelled' : 'ended'),
              ended_by_name: response?.data?.ended_by_name,
            }
          : current,
      );
      await disconnectRoom();
      setConnected(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Could not end the call');
    } finally {
      setStarting(false);
    }
  }, [closeCall, disconnectRoom]);

  const startCall = useCallback(async () => {
    if (starting || !clientUsername) return;
    const canStartCall = availabilityOverride === null ? available : availabilityOverride;
    if ((checking && availabilityOverride === null) || !canStartCall) {
      toast.error(`App-to-app calling is unavailable for ${recipientPanel === 'ca' ? 'this CA' : 'this client'}.`);
      return;
    }
    setStarting(true);
    setError('');
    try {
      const response = await voiceCallApi.create(
        clientUsername,
        makeIdempotencyKey(),
        recipientPanel,
      );
      const createdCall = response?.data;
      if (!createdCall?.call_id) throw new Error('The server did not create the call invitation.');
      callIdRef.current = createdCall.call_id;
      setCall(createdCall);
      onCallStarted?.();
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || requestError.message || 'Could not start the voice call');
    } finally {
      setStarting(false);
    }
  }, [
    starting,
    clientUsername,
    checking,
    available,
    availabilityOverride,
    recipientPanel,
    setStarting,
    onCallStarted,
  ]);

  useImperativeHandle(ref, () => ({
    startCall,
    available,
    checking,
  }), [startCall, available, checking]);

  useEffect(() => {
    if (!call?.call_id || TERMINAL_STATUSES.has(call.status)) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const response = await voiceCallApi.get(call.call_id);
        if (active) setCall(response.data);
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.message || requestError.message || 'Could not refresh call status');
      }
    };
    const timer = window.setInterval(refresh, 1800);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [call?.call_id, call?.status]);

  useEffect(() => {
    if (
      call?.status !== 'accepted' ||
      !call.call_id ||
      joiningCallRef.current === call.call_id
    ) {
      return undefined;
    }

    let active = true;
    joiningCallRef.current = call.call_id;
    setJoining(true);
    const connect = async () => {
      try {
        const response = await voiceCallApi.token(call.call_id);
        if (!active) return;
        const { server_url: serverUrl, token } = response?.data || {};
        if (!serverUrl || !token) throw new Error('The server returned invalid audio credentials.');

        const room = new Room({ adaptiveStream: false, dynacast: false });
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
          if (track.kind !== 'audio' || !audioContainerRef.current) return;
          const element = track.attach();
          element.autoplay = true;
          audioContainerRef.current.appendChild(element);
          const playback = element.play?.();
          if (playback?.catch) playback.catch(() => setError('Allow audio playback in your browser to hear the client.'));
        });
        room.on(RoomEvent.TrackUnsubscribed, (track, publication) => {
          if (publication.source === Track.Source.ScreenShare) {
            track.detach().forEach((element) => element.remove());
            screenShareTilesRef.current.get(track)?.remove();
            screenShareTilesRef.current.delete(track);
            setRemoteScreenCount(screenShareTilesRef.current.size);
          }
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
        room.on(RoomEvent.ParticipantDisconnected, () => {
          setError('The client left the call.');
          hangUp();
        });
        room.on(RoomEvent.Disconnected, () => {
          setConnected(false);
          setScreenSharing(false);
          screenShareTilesRef.current.forEach((tile) => tile.remove());
          screenShareTilesRef.current.clear();
          setRemoteScreenCount(0);
          if (screenShareContainerRef.current) screenShareContainerRef.current.replaceChildren();
        });
        room.on(RoomEvent.TrackMuted, (_publication, participant) => {
          if (participant === room.localParticipant) setMuted(true);
        });
        room.on(RoomEvent.TrackUnmuted, (_publication, participant) => {
          if (participant === room.localParticipant) setMuted(false);
        });

        await room.connect(serverUrl, token);
        if (!active) {
          room.disconnect();
          return;
        }
        await room.localParticipant.setMicrophoneEnabled(true);
        setMuted(!room.localParticipant.isMicrophoneEnabled);
        setConnected(true);
        setError('');
      } catch (requestError) {
        if (active) {
          setError(requestError?.response?.data?.message || requestError.message || 'Could not connect call audio');
          joiningCallRef.current = null;
        }
      } finally {
        if (active) setJoining(false);
      }
    };
    connect();

    return () => {
      active = false;
    };
  }, [call?.call_id, call?.status, hangUp]);

  useEffect(() => {
    const callStatus = call?.status;
    if (!callStatus || !TERMINAL_STATUSES.has(callStatus)) return;
    disconnectRoom();
    setConnected(false);
  }, [call?.status, disconnectRoom]);

  useEffect(() => {
    if (!connected) return undefined;
    const timer = window.setInterval(() => setDuration((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [connected]);

  useEffect(() => () => {
    if (callIdRef.current) {
      voiceCallApi.end(callIdRef.current).catch((requestError) => {
        console.error('Could not end voice call while leaving the client profile:', requestError);
      });
    }
    const room = roomRef.current;
    if (room) {
      room.removeAllListeners();
      room.disconnect();
    }
  }, []);

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room || changingMute) return;
    setChangingMute(true);
    try {
      await room.localParticipant.setMicrophoneEnabled(
        !room.localParticipant.isMicrophoneEnabled,
      );
      setMuted(!room.localParticipant.isMicrophoneEnabled);
    } catch (muteError) {
      setError(muteError.message || 'Could not change microphone state');
    } finally {
      setChangingMute(false);
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

  const terminal = Boolean(call && TERMINAL_STATUSES.has(call.status));
  useEffect(() => {
    if (terminal) setMinimized(false);
  }, [terminal]);
  const recipientLabel = recipientPanel === 'ca' ? 'CA' : 'client';
  const unavailableTitle = checking
    ? `Checking app-to-app call availability for this ${recipientLabel}`
    : `App-to-app calling is unavailable for this ${recipientLabel}`;

  return (
    <>
      {showTrigger ? (
        <>
          <span
            className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold ${
              checking
                ? 'bg-slate-100 text-slate-600'
                : available
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
            }`}
            role="status"
            aria-live="polite"
          >
            {checking ? 'Checking availability' : available ? 'Available' : 'Unavailable'}
          </span>
          <button
            type="button"
            onClick={startCall}
            disabled={checking || !available || starting}
            title={available ? 'Start an app-to-app voice call' : unavailableTitle}
            aria-label={`Start in-app voice call with ${displayName || (recipientPanel === 'ca' ? 'CA' : 'client')}`}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiPhoneCall className="h-4 w-4" />
            App-to-app call
          </button>
        </>
      ) : null}

      {call ? (
        <>
        <div className={`fixed inset-0 z-[120] items-center justify-center bg-slate-950/55 p-4 ${minimized ? 'hidden' : 'flex'}`} role="dialog" aria-modal="true" aria-label="In-app voice call">
          <div className={`relative w-full rounded-2xl bg-white p-6 text-center shadow-2xl ${remoteScreenCount ? 'max-w-4xl' : 'max-w-sm'}`}>
            {!terminal ? (
              <button type="button" onClick={() => setMinimized(true)} className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Minimize call and return to the app">
                <FiMinimize2 />
              </button>
            ) : null}
            {terminal ? (
              <button type="button" onClick={closeCall} className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close call">
                <FiX />
              </button>
            ) : null}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <FiPhoneCall className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-slate-900">{displayName || 'Client'}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {terminal
                ? STATUS_LABELS[call.status] || call.status
                : connected
                  ? formatDuration(duration)
                  : joining
                    ? 'Connecting audio...'
                    : STATUS_LABELS[call.status] || call.status}
            </p>
            {(call.status === 'ended' || call.status === 'cancelled') && call.ended_by_name ? (
              <p className="mt-1 text-xs text-slate-400">
                {call.status === 'cancelled' ? 'Call cancelled' : 'Call ended'} by {call.ended_by_name}
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
            {connected ? (
              <CallActionTransition transitionKey={call.status}>
                <div className="mt-8 flex items-center justify-center gap-5">
                <button type="button" onClick={toggleScreenShare} disabled={screenShareBusy} aria-label={screenSharing ? 'Stop sharing screen' : 'Share screen'} title={screenSharing ? 'Stop sharing screen' : 'Share your screen with the other participant'} className={`flex h-14 w-14 items-center justify-center rounded-full ${screenSharing ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'} disabled:cursor-wait disabled:opacity-60`}>
                  <FiMonitor className="h-5 w-5" />
                </button>
                <button type="button" onClick={toggleMute} disabled={changingMute} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'} title={muted ? 'Unmute microphone' : 'Mute microphone'} className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:cursor-wait disabled:opacity-60">
                  {muted ? <FiMicOff className="h-5 w-5" /> : <FiMic className="h-5 w-5" />}
                </button>
                <button type="button" onClick={hangUp} disabled={starting} aria-label="End call" className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                  <FiPhoneOff className="h-5 w-5" />
                </button>
                </div>
              </CallActionTransition>
            ) : null}
            {!connected && !terminal ? (
              <button type="button" onClick={hangUp} disabled={starting} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-60">
                <FiPhoneOff />
                {starting ? 'Ending...' : 'Cancel call'}
              </button>
            ) : null}
            {terminal ? (
              <button type="button" onClick={closeCall} className="mt-8 rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800">
                Done
              </button>
            ) : null}
          </div>
        </div>
        {minimized && !terminal ? (
          <div className="fixed bottom-4 right-4 z-[121] flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-white shadow-xl" role="region" aria-label="Minimized voice call">
            <span className="max-w-40 truncate text-sm">{displayName || 'Client'} · {screenSharing ? `Sharing screen · ${formatDuration(duration)}` : connected ? formatDuration(duration) : 'Call active'}</span>
            {connected ? (
              <button type="button" onClick={toggleMute} disabled={changingMute} className="rounded-full p-2 hover:bg-slate-700 disabled:opacity-50" aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>
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
            <button type="button" onClick={hangUp} disabled={starting} className="rounded-full bg-red-600 p-2 hover:bg-red-700 disabled:opacity-50" aria-label="End call">
              <FiPhoneOff />
            </button>
          </div>
        ) : null}
        </>
      ) : null}
    </>
  );
});

export default InAppVoiceCallButton;
