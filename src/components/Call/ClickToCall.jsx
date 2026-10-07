import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FiPhone, FiPhoneCall } from "react-icons/fi";
import toast from "react-hot-toast";
import ConfirmActionModal from "../ConfirmActionModal";
import { InAppVoiceCallButton } from "./InAppVoiceCall";
import { callApi } from "../../services/callApi";
import { voiceCallApi } from "../../services/voiceCallApi";
import {
  getStoredCallChannel,
  isAuthenticatedSession,
  CALL_CHANNEL_CHANGE_EVENT,
} from "../../services/callChannelStore";

const ClickToCallContext = createContext({
  canCall: false,
  channelEnabled: false,
  refresh: () => {},
  openCall: () => {},
});

export function useClickToCall() {
  return useContext(ClickToCallContext);
}

function missingSetupMessage(reasons = {}) {
  if (!reasons.channel_enabled) {
    return "Enable OOMS System Call channel in Broadcast → Call";
  }
  if (!reasons.system_url_configured) {
    return "Admin has not configured the Call API URL yet";
  }
  if (!reasons.branch_token_configured) {
    return "Save the branch Call API token in Call → Configuration";
  }
  if (reasons.call_enabled === false) {
    return "Call access is disabled for your account. Ask an admin to enable it.";
  }
  if (!reasons.extension_configured) {
    return "Set your PBX extension in Call → Configuration";
  }
  return "Calling is not available for your account";
}

function isOomsCallChannel(value) {
  return (
    String(value || "")
      .trim()
      .toLowerCase() === "ooms system"
  );
}

/** Compact call action next to a mobile number. */
export function ClickToCallButton({
  phoneNumber,
  countryCode: _countryCode,
  displayName,
  className = "",
  stopPropagation = true,
}) {
  const { canCall, openCall } = useClickToCall();
  // India dial: always use last 10 digits; ignore country code for PBX.
  const mobile = String(phoneNumber || "").replace(/\D/g, "").slice(-10);
  if (!canCall || !mobile || mobile.length < 8) return null;

  return (
    <button
      type="button"
      title="Call"
      aria-label="Initiate call"
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ${className}`}
      onClick={(e) => {
        if (stopPropagation) {
          e.stopPropagation();
          e.preventDefault();
        }
        openCall({ phoneNumber: mobile, displayName });
      }}
    >
      <FiPhoneCall className="h-3.5 w-3.5" />
    </button>
  );
}

export function ClientListCallButton({
  phoneNumber,
  displayName,
  clientUsername,
  countryCode,
  className = "",
}) {
  const { canCall, openCall, startAppCall } = useClickToCall();
  const [chooserOpen, setChooserOpen] = useState(false);
  const [appAvailability, setAppAvailability] = useState({
    available: false,
    checking: true,
    reason: "",
  });
  const mobile = String(phoneNumber || "").replace(/\D/g, "").slice(-10);

  useEffect(() => {
    if (!chooserOpen) return undefined;
    let active = true;
    setAppAvailability({ available: false, checking: true, reason: "" });
    if (!clientUsername) {
      setAppAvailability({
        available: false,
        checking: false,
        reason: "This client profile has no OOMS username.",
      });
      return undefined;
    }
    let unsubscribe;
    voiceCallApi
      .watchCapability(clientUsername, "client", (update) => {
        if (!active || !update?.success) return;
        const reason = update?.data?.reason === "client_offline"
          ? "Client is offline in the client web app."
          : update?.data?.reason || "";
        setAppAvailability({
          available: Boolean(update?.data?.can_call),
          checking: false,
          reason,
        });
      })
      .then((watch) => {
        unsubscribe = watch.unsubscribe;
        if (!active) return;
        const response = watch.capability;
        const reason = response?.data?.reason === "client_offline"
          ? "Client is offline in the client web app."
          : response?.data?.reason || "";
        setAppAvailability({
          available: Boolean(response?.data?.can_call),
          checking: false,
          reason,
        });
      })
      .catch((requestError) => {
        if (!active) return;
        console.error("Could not check app-to-app call availability:", requestError);
        setAppAvailability({
          available: false,
          checking: false,
          reason: requestError?.response?.data?.message || requestError?.message || "Could not check call availability.",
        });
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [chooserOpen, clientUsername]);

  if (!mobile || mobile.length < 8) return null;

  const closeChooser = () => setChooserOpen(false);
  const startNormalCall = () => {
    closeChooser();
    openCall({ phoneNumber: mobile, displayName });
  };
  const startClientAppCall = () => {
    setChooserOpen(false);
    startAppCall({ clientUsername, displayName });
  };

  return (
    <>
      <button
        type="button"
        title="Choose a call method"
        aria-label={`Choose call method for ${displayName || mobile}`}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ${className}`}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          setChooserOpen(true);
        }}
      >
        <FiPhoneCall className="h-3.5 w-3.5" />
      </button>

      {chooserOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/50 p-4"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeChooser();
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeChooser();
              }}
            >
              <section
                className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="client-call-method-title"
              >
                <h2
                  id="client-call-method-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Call {displayName || "client"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose how you want to place this call.
                </p>
                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    onClick={startNormalCall}
                    disabled={!canCall}
                    title={!canCall ? "Normal calling is not available for this account." : undefined}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <FiPhone className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        Normal call
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Place a call to {mobile}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={startClientAppCall}
                    disabled={!clientUsername || appAvailability.checking || !appAvailability.available}
                    title={
                      !clientUsername
                        ? "This client profile has no OOMS username."
                        : appAvailability.checking
                          ? "Checking app-to-app call availability."
                          : !appAvailability.available
                            ? "App-to-app calling is unavailable for this client."
                            : "Start an app-to-app voice call"
                    }
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <FiPhoneCall className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        App-to-app call
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {appAvailability.checking
                          ? "Checking client availability..."
                          : appAvailability.available
                            ? "Call through the OOMS client app"
                            : appAvailability.reason || "Unavailable for this client"}
                      </span>
                    </span>
                  </button>
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={closeChooser}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function ClickToCallProvider({ children }) {
  const [canCall, setCanCall] = useState(false);
  const [channelEnabled, setChannelEnabled] = useState(() =>
    isOomsCallChannel(getStoredCallChannel()),
  );
  const [reasons, setReasons] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appCallRequest, setAppCallRequest] = useState(null);
  const appCallRef = React.useRef(null);
  const appCallRequestId = React.useRef(0);
  const startedAppCallRequestId = React.useRef(null);

  const startAppCall = useCallback(({ clientUsername, displayName }) => {
    if (!clientUsername) {
      toast.error("This client profile has no OOMS username.");
      return;
    }
    if (appCallRequest) {
      toast.error("An app-to-app call is already in progress.");
      return;
    }
    setAppCallRequest({
      id: ++appCallRequestId.current,
      clientUsername,
      displayName: displayName || "",
    });
  }, [appCallRequest]);

  const closeAppCall = useCallback(() => {
    setAppCallRequest(null);
  }, []);

  useEffect(() => {
    if (
      !appCallRequest ||
      startedAppCallRequestId.current === appCallRequest.id
    ) return;
    startedAppCallRequestId.current = appCallRequest.id;
    appCallRef.current?.startCall();
  }, [appCallRequest]);

  const refresh = useCallback(async () => {
    const storedEnabled = isOomsCallChannel(getStoredCallChannel());
    if (!isAuthenticatedSession()) {
      setCanCall(false);
      setChannelEnabled(false);
      setReasons({});
      return;
    }
    try {
      const res = await callApi.getCapability();
      const data = res?.data || {};
      setCanCall(Boolean(data.can_call));
      setChannelEnabled(
        Boolean(data.reasons?.channel_enabled) ||
          isOomsCallChannel(data.channel) ||
          storedEnabled,
      );
      setReasons(data.reasons || {});
    } catch {
      setCanCall(false);
      setChannelEnabled(storedEnabled);
      setReasons({});
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onChannel = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener(CALL_CHANNEL_CHANGE_EVENT, onChannel);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(CALL_CHANNEL_CHANGE_EVENT, onChannel);
    };
  }, [refresh]);

  const openCall = useCallback(
    ({ phoneNumber, displayName }) => {
      const phone = String(phoneNumber || "").replace(/\D/g, "").slice(-10);
      if (!phone || phone.length < 8) {
        toast.error("Mobile number is missing");
        return;
      }
      if (!canCall) {
        toast.error(missingSetupMessage(reasons));
        return;
      }
      setConfirmState({
        phoneNumber: phone,
        displayName: displayName || "",
      });
    },
    [canCall, reasons],
  );

  const closeConfirm = useCallback(() => {
    if (loading) return;
    setConfirmState(null);
  }, [loading]);

  const handleConfirm = useCallback(async () => {
    if (!confirmState) return;
    setLoading(true);
    try {
      const res = await callApi.initiate({
        phoneNumber: confirmState.phoneNumber,
      });
      toast.success(res?.message || "Call initiated");
      setConfirmState(null);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to initiate call",
      );
    } finally {
      setLoading(false);
    }
  }, [confirmState]);

  const value = useMemo(
    () => ({ canCall, channelEnabled, refresh, openCall, startAppCall }),
    [canCall, channelEnabled, refresh, openCall, startAppCall],
  );

  const displayPhone = confirmState ? confirmState.phoneNumber : "";

  return (
    <ClickToCallContext.Provider value={value}>
      {children}
      {appCallRequest ? (
        <InAppVoiceCallButton
          key={appCallRequest.id}
          ref={appCallRef}
          clientUsername={appCallRequest.clientUsername}
          displayName={appCallRequest.displayName}
          showTrigger={false}
          checkAvailability={false}
          availabilityOverride
          onCallClosed={closeAppCall}
        />
      ) : null}
      <ConfirmActionModal
        isOpen={Boolean(confirmState)}
        loading={loading}
        onCancel={closeConfirm}
        onConfirm={handleConfirm}
        icon={FiPhoneCall}
        tone="primary"
        title="Initiate call"
        heading="Place this call now?"
        message={
          confirmState
            ? `${confirmState.displayName ? `${confirmState.displayName} · ` : ""}${displayPhone}`
            : ""
        }
        confirmLabel="Call"
        cancelLabel="Cancel"
      />
    </ClickToCallContext.Provider>
  );
}

export default ClickToCallProvider;
