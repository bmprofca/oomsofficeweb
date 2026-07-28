import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiCheckCircle,
  FiLoader,
  FiLogOut,
  FiRefreshCw,
  FiSmartphone,
  FiWifi,
  FiWifiOff,
  FiLock,
} from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import { extractApiError } from "../../../utils/oneChattingSendUtils";
import { whatsappApi } from "../../../services/whatsappApi";
import { useUserPermissions } from "../../../utils/permission-helper";

/** Task-table typography baseline — see CLIENT/context/typography.md */
const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const TOOLBAR_BTN = "px-3 py-2 text-sm font-medium rounded-lg";
const SECTION_LABEL =
  "text-[11px] font-bold text-gray-700 uppercase tracking-wide";
const CELL_TITLE = "font-semibold text-gray-800 text-sm";
const CELL_BODY = "text-sm font-medium text-gray-700";
const CELL_META = "text-xs text-gray-400";
const FIELD_INPUT =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60 placeholder:text-gray-400";
const EMPTY_WRAP =
  "flex flex-col items-center justify-center py-12 text-gray-500 px-4";
const EMPTY_TITLE = "text-sm font-medium text-gray-500";
const EMPTY_SUBTITLE = "text-xs text-gray-400 mt-1";

const STATUS_POLL_MS = 3000;
const QR_POLL_MS = 2500;

const STATUS_META = {
  not_configured: {
    label: "Not configured",
    className: "bg-gray-100 text-gray-700",
  },
  connecting: {
    label: "Connecting",
    className: "bg-amber-100 text-amber-700",
  },
  qr: {
    label: "Scan QR code",
    className: "bg-blue-100 text-blue-700",
  },
  pairing: {
    label: "Enter pairing code",
    className: "bg-blue-100 text-blue-700",
  },
  connected: {
    label: "Connected",
    className: "bg-green-100 text-green-700",
  },
  disconnected: {
    label: "Disconnected",
    className: "bg-red-100 text-red-700",
  },
  destroyed: {
    label: "Session removed",
    className: "bg-gray-100 text-gray-600",
  },
};

const SessionStatusBadge = ({ status, connected }) => {
  const normalized = connected ? "connected" : status || "not_configured";
  const meta = STATUS_META[normalized] || STATUS_META.not_configured;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${meta.className}`}
    >
      {connected ? (
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
      ) : null}
      {meta.label}
    </span>
  );
};

const WhatsAppWebSession = () => {
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [statusLoading, setStatusLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState(null);

  const [loginMethod, setLoginMethod] = useState("qr");
  const [phone, setPhone] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const [requestingPairing, setRequestingPairing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [qrCode, setQrCode] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState(null);

  const statusPollRef = useRef(null);
  const qrPollRef = useRef(null);

  const clearPollers = useCallback(() => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setStatusLoading(true);
    try {
      const res = await whatsappApi.getWhatsAppWebStatus();
      setSessionStatus(res?.data || null);
      return res?.data || null;
    } catch (error) {
      if (!silent) {
        toast.error(extractApiError(error, "Failed to fetch session status"));
      }
      return null;
    } finally {
      if (!silent) setStatusLoading(false);
    }
  }, []);

  const fetchQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await whatsappApi.getWhatsAppWebQr();
      const qrImage = res?.data?.imageUrl || res?.data?.qr;
      if (res?.success && qrImage) {
        setQrCode(qrImage);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      setQrLoading(false);
    }
  }, []);

  const startStatusPolling = useCallback(() => {
    clearPollers();
    statusPollRef.current = setInterval(async () => {
      const data = await fetchStatus(true);
      if (data?.connected || data?.status === "connected") {
        clearPollers();
        setQrCode(null);
        toast.success("WhatsApp connected successfully");
      }
    }, STATUS_POLL_MS);
  }, [clearPollers, fetchStatus]);

  const startQrPolling = useCallback(() => {
    if (qrPollRef.current) return;
    qrPollRef.current = setInterval(() => {
      fetchQr();
    }, QR_POLL_MS);
  }, [fetchQr]);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    fetchStatus();
    return () => clearPollers();
  }, [fetchStatus, clearPollers]);

  useEffect(() => {
    const status = sessionStatus?.status;
    const connected = Boolean(sessionStatus?.connected);

    if (connected) {
      clearPollers();
      return;
    }

    if (status === "qr" || status === "connecting") {
      startStatusPolling();
      if (loginMethod === "qr") {
        fetchQr();
        startQrPolling();
      }
      return;
    }

    if (status === "pairing") {
      startStatusPolling();
    }
  }, [
    sessionStatus?.status,
    sessionStatus?.connected,
    loginMethod,
    clearPollers,
    startStatusPolling,
    startQrPolling,
    fetchQr,
  ]);

  const handleCreateQrSession = async () => {
    setCreatingSession(true);
    setQrCode(null);
    setPairingCode(null);
    try {
      await whatsappApi.createWhatsAppWebSession({});
      toast.success("Session created. Scan the QR code with WhatsApp.");
      await fetchStatus(true);
      await fetchQr();
      startStatusPolling();
      startQrPolling();
    } catch (error) {
      toast.error(extractApiError(error, "Failed to create session"));
    } finally {
      setCreatingSession(false);
    }
  };

  const handleCreatePairingSession = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      toast.error(
        "Enter a valid phone number (10–15 digits, country code included)",
      );
      return;
    }

    setCreatingSession(true);
    setQrCode(null);
    setPairingCode(null);
    try {
      const payload = { pairingCodeEnabled: true };

      await whatsappApi.createWhatsAppWebSession(payload);
      setRequestingPairing(true);
      const res = await whatsappApi.requestWhatsAppWebPairingCode({
        phone: digits,
      });
      setPairingCode(res?.data?.pairingCode || null);
      toast.success("Pairing code generated. Enter it on your phone.");
      await fetchStatus(true);
      startStatusPolling();
    } catch (error) {
      toast.error(extractApiError(error, "Failed to start pairing login"));
    } finally {
      setCreatingSession(false);
      setRequestingPairing(false);
    }
  };

  const handleRefreshPairingCode = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      toast.error("Enter a valid phone number first");
      return;
    }

    setRequestingPairing(true);
    try {
      const res = await whatsappApi.requestWhatsAppWebPairingCode({
        phone: digits,
      });
      setPairingCode(res?.data?.pairingCode || null);
      toast.success("Pairing code refreshed");
    } catch (error) {
      toast.error(extractApiError(error, "Failed to get pairing code"));
    } finally {
      setRequestingPairing(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("Disconnect WhatsApp Web for this branch?")) return;

    setLoggingOut(true);
    clearPollers();
    try {
      const res = await whatsappApi.deleteWhatsAppWebSession();
      toast.success(res?.message || "Session disconnected");
      setQrCode(null);
      setPairingCode(null);
      await fetchStatus(true);
    } catch (error) {
      toast.error(extractApiError(error, "Failed to disconnect session"));
    } finally {
      setLoggingOut(false);
    }
  };

  const connected = Boolean(sessionStatus?.connected);
  const status = sessionStatus?.status || "not_configured";
  const showLoginForm = !connected && status === "not_configured";
  const showQrPanel =
    !connected &&
    loginMethod === "qr" &&
    (status === "connecting" || status === "qr" || qrCode);
  const showPairingPanel =
    !connected &&
    (loginMethod === "pairing" || status === "pairing") &&
    (pairingCode || status === "pairing");
  const busy = creatingSession || requestingPairing || loggingOut;

  if (!check("broadcast_config_edit")) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMinimized={isMinimized}
          setIsMinimized={setIsMinimized}
        />
        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMinimized={isMinimized}
          setIsMinimized={setIsMinimized}
        />
        <div
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
        >
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiLock className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Access Denied
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              You do not have permission to manage WhatsApp Web.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />

      <div
        className={`pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4 space-y-3 md:space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  {connected ? (
                    <FiWifi className="w-4 h-4 text-green-600" />
                  ) : (
                    <FiSmartphone className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight truncate m-0">
                    WhatsApp Web Session
                  </h1>
                  <p className={`${CELL_META} m-0 mt-0.5`}>
                    Connect this branch via QR scan or pairing code
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                <button
                  type="button"
                  onClick={() => fetchStatus()}
                  disabled={statusLoading}
                  className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw
                    className={`w-4 h-4 ${statusLoading ? "animate-spin" : ""}`}
                  />
                </button>
                {connected ||
                (sessionStatus?.sessionId && status !== "not_configured") ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className={`${TOOLBAR_BTN} inline-flex items-center gap-1.5 text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50`}
                  >
                    {loggingOut ? (
                      <FiLoader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FiLogOut className="w-3.5 h-3.5" />
                    )}
                    Disconnect
                  </button>
                ) : null}
              </div>
            </div>

            <div className="p-4 md:p-5">
              {statusLoading && !sessionStatus ? (
                <div className={EMPTY_WRAP}>
                  <FiLoader className="w-5 h-5 animate-spin text-gray-400 mb-2" />
                  <p className={EMPTY_TITLE}>Loading session status…</p>
                  <p className={EMPTY_SUBTITLE}>
                    Checking WhatsApp Web for this branch
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <SessionStatusBadge
                      status={status}
                      connected={connected}
                    />
                    {sessionStatus?.sessionId ? (
                      <span className={`${CELL_META} font-mono truncate`}>
                        {sessionStatus.sessionId}
                      </span>
                    ) : (
                      <span className={CELL_META}>
                        One session per branch · managed by OOMS
                      </span>
                    )}
                  </div>

                  {connected ? (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-green-200 flex items-center justify-center shrink-0">
                          <FiCheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className={`${CELL_TITLE} text-green-800 m-0`}>
                            WhatsApp is connected
                          </p>
                          <p className="text-sm font-medium text-green-700 mt-1 m-0">
                            {sessionStatus.displayName
                              ? sessionStatus.displayName
                              : "Ready to send messages"}
                            {sessionStatus.phone
                              ? ` · +${sessionStatus.phone}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {status === "disconnected" ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-sm font-medium text-amber-800 m-0">
                        Connection was lost. The server may reconnect
                        automatically, or disconnect and sign in again.
                      </p>
                    </div>
                  ) : null}

                  {showLoginForm ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5 pt-1">
                      <div className="space-y-4 min-w-0">
                        <div>
                          <p className={`${SECTION_LABEL} mb-2`}>
                            Login method
                          </p>
                          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setLoginMethod("qr")}
                              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
                                loginMethod === "qr"
                                  ? "bg-white text-green-700 shadow-sm"
                                  : "text-gray-600 hover:text-gray-800"
                              }`}
                            >
                              QR code
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setLoginMethod("pairing")}
                              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
                                loginMethod === "pairing"
                                  ? "bg-white text-green-700 shadow-sm"
                                  : "text-gray-600 hover:text-gray-800"
                              }`}
                            >
                              Pairing code
                            </button>
                          </div>
                        </div>

                        {loginMethod === "pairing" ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone number
                            </label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="919999999999"
                              disabled={busy}
                              className={`${FIELD_INPUT} font-mono`}
                            />
                            <p className={`${CELL_META} mt-1 m-0`}>
                              Country code + number, digits only (10–15
                              digits)
                            </p>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={
                            loginMethod === "qr"
                              ? handleCreateQrSession
                              : handleCreatePairingSession
                          }
                          disabled={busy}
                          className={`${TOOLBAR_BTN} inline-flex items-center gap-2 text-white bg-green-600 hover:bg-green-700 disabled:opacity-50`}
                        >
                          {creatingSession || requestingPairing ? (
                            <FiLoader className="w-4 h-4 animate-spin" />
                          ) : (
                            <FiSmartphone className="w-4 h-4" />
                          )}
                          {loginMethod === "qr"
                            ? "Connect with QR code"
                            : "Generate pairing code"}
                        </button>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 h-fit">
                        <p className={`${SECTION_LABEL} m-0 mb-2`}>
                          How it works
                        </p>
                        <ol className="m-0 pl-4 space-y-2 list-decimal">
                          <li className={CELL_BODY}>
                            Choose QR or pairing code login.
                          </li>
                          <li className={CELL_BODY}>
                            Complete the link on your WhatsApp phone app.
                          </li>
                          <li className={CELL_BODY}>
                            Keep this page open until status shows Connected.
                          </li>
                        </ol>
                      </div>
                    </div>
                  ) : null}

                  {showQrPanel ? (
                    <div className="border-t border-gray-100 pt-5">
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] gap-5 items-start">
                        <div>
                          <p className={`${CELL_TITLE} m-0 mb-1`}>
                            Scan this QR code with WhatsApp
                          </p>
                          <p className={`${CELL_META} m-0 mb-4`}>
                            Open WhatsApp → Linked devices → Link a device
                          </p>
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <ul className="m-0 pl-4 space-y-2 list-disc">
                              <li className={CELL_BODY}>
                                Use the same phone number you want for
                                broadcasts.
                              </li>
                              <li className={CELL_BODY}>
                                QR refreshes automatically while connecting.
                              </li>
                              <li className={CELL_BODY}>
                                Status updates every few seconds after scan.
                              </li>
                            </ul>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-5 min-h-[280px]">
                          {qrCode ? (
                            <img
                              src={qrCode}
                              alt="WhatsApp QR code"
                              className="w-56 h-56 sm:w-64 sm:h-64 object-contain bg-white rounded-lg border border-gray-200"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-center">
                              <FiLoader className="w-6 h-6 animate-spin text-gray-400 mb-3" />
                              <p className={`${EMPTY_TITLE} m-0`}>
                                {qrLoading
                                  ? "Loading QR code…"
                                  : "Waiting for QR code…"}
                              </p>
                              <button
                                type="button"
                                onClick={fetchQr}
                                className="mt-3 text-xs font-medium text-green-700 hover:text-green-800"
                              >
                                Retry now
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {showPairingPanel ? (
                    <div className="border-t border-gray-100 pt-5">
                      <p className={`${CELL_TITLE} m-0 mb-1`}>
                        Enter this pairing code on your phone
                      </p>
                      <p className={`${CELL_META} m-0 mb-4`}>
                        WhatsApp → Linked devices → Link with phone number
                      </p>
                      {pairingCode ? (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-6 text-center max-w-md">
                          <p className="text-3xl font-bold tracking-widest text-green-800 font-mono m-0">
                            {pairingCode}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center py-6 text-gray-500">
                          <FiLoader className="w-4 h-4 animate-spin mr-2" />
                          <span className={CELL_BODY}>
                            Generating pairing code…
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleRefreshPairingCode}
                        disabled={requestingPairing}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800 disabled:opacity-50"
                      >
                        <FiRefreshCw
                          className={`w-4 h-4 ${requestingPairing ? "animate-spin" : ""}`}
                        />
                        Refresh pairing code
                      </button>
                    </div>
                  ) : null}

                  {!connected &&
                  !showLoginForm &&
                  !showQrPanel &&
                  !showPairingPanel &&
                  status !== "disconnected" ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-2">
                      <FiWifiOff className="w-4 h-4 text-gray-400 shrink-0" />
                      <p className={`${CELL_BODY} m-0`}>
                        Session is preparing. Status will update automatically.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppWebSession;
