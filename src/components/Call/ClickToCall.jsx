import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FiPhoneCall } from "react-icons/fi";
import toast from "react-hot-toast";
import ConfirmActionModal from "../ConfirmActionModal";
import { callApi } from "../../services/callApi";
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

export function ClickToCallProvider({ children }) {
  const [canCall, setCanCall] = useState(false);
  const [channelEnabled, setChannelEnabled] = useState(() =>
    isOomsCallChannel(getStoredCallChannel()),
  );
  const [reasons, setReasons] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [loading, setLoading] = useState(false);

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
    () => ({ canCall, channelEnabled, refresh, openCall }),
    [canCall, channelEnabled, refresh, openCall],
  );

  const displayPhone = confirmState ? confirmState.phoneNumber : "";

  return (
    <ClickToCallContext.Provider value={value}>
      {children}
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
