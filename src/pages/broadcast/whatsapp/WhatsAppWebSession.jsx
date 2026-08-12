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
const EMPTY_WRAP =
  "flex flex-col items-center justify-center py-12 text-gray-500 px-4";
const EMPTY_TITLE = "text-sm font-medium text-gray-500";
const EMPTY_SUBTITLE = "text-xs text-gray-400 mt-1";

const STATUS_POLL_MS = 3000;
const QR_POLL_MS = 2000;

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
  reconnecting: {
    label: "Reconnecting",
    className: "bg-amber-100 text-amber-700",
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

function withCacheBust(url) {
  if (!url) return null;
  const base = String(url).split("?")[0];
  return `${base}?t=${Date.now()}`;
}

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

  const [creatingSession, setCreatingSession] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [qrCode, setQrCode] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  const statusPollRef = useRef(null);
  const qrPollRef = useRef(null);
  const connectedToastShownRef = useRef(false);

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
        setQrCode(withCacheBust(qrImage));
        return true;
      }
      // QR_NOT_FOUND often means already connected — refresh status
      await fetchStatus(true);
      return false;
    } catch (error) {
      await fetchStatus(true);
      return false;
    } finally {
      setQrLoading(false);
    }
  }, [fetchStatus]);

  const startStatusPolling = useCallback(() => {
    if (statusPollRef.current) return;
    statusPollRef.current = setInterval(async () => {
      const data = await fetchStatus(true);
      if (data?.connected || data?.status === "connected") {
        clearPollers();
        setQrCode(null);
        if (!connectedToastShownRef.current) {
          connectedToastShownRef.current = true;
          toast.success("WhatsApp connected successfully");
        }
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
      setQrCode(null);
      return;
    }

    connectedToastShownRef.current = false;

    if (
      status === "qr" ||
      status === "connecting" ||
      status === "reconnecting"
    ) {
      startStatusPolling();
      if (status !== "reconnecting") {
        fetchQr();
        startQrPolling();
      }
      return;
    }

    if (status === "disconnected") {
      startStatusPolling();
    }
  }, [
    sessionStatus?.status,
    sessionStatus?.connected,
    clearPollers,
    startStatusPolling,
    startQrPolling,
    fetchQr,
  ]);

  const handleCreateQrSession = async () => {
    setCreatingSession(true);
    setQrCode(null);
    connectedToastShownRef.current = false;
    try {
      await whatsappApi.createWhatsAppWebSession({});
      toast.success("Session started. Scan the QR code with WhatsApp.");
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

  const handleReconnect = async () => {
    setReconnecting(true);
    connectedToastShownRef.current = false;
    try {
      const res = await whatsappApi.reconnectWhatsAppWebSession();
      toast.success(res?.message || "Reconnecting…");
      await fetchStatus(true);
      startStatusPolling();
    } catch (error) {
      toast.error(extractApiError(error, "Failed to reconnect session"));
    } finally {
      setReconnecting(false);
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
      connectedToastShownRef.current = false;
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
    (status === "connecting" ||
      status === "qr" ||
      Boolean(qrCode) ||
      (sessionStatus?.sessionId &&
        status !== "disconnected" &&
        status !== "reconnecting" &&
        status !== "destroyed"));
  const showReconnecting = !connected && status === "reconnecting";
  const busy = creatingSession || reconnecting || loggingOut;

  const linkedUserName =
    sessionStatus?.user?.name || sessionStatus?.displayName || null;
  const linkedUserId = sessionStatus?.user?.id || null;

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
                    Connect this branch by scanning a QR code
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
                            {linkedUserName
                              ? linkedUserName
                              : "Ready to send messages"}
                            {linkedUserId ? (
                              <span className="block text-xs font-mono text-green-700/80 mt-0.5">
                                {linkedUserId}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {status === "disconnected" ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-3">
                      <p className="text-sm font-medium text-amber-800 m-0">
                        Connection was lost. Reconnect if auth files are still
                        valid, or start a new QR login.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleReconnect}
                          disabled={busy}
                          className={`${TOOLBAR_BTN} inline-flex items-center gap-2 text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50`}
                        >
                          {reconnecting ? (
                            <FiLoader className="w-4 h-4 animate-spin" />
                          ) : (
                            <FiRefreshCw className="w-4 h-4" />
                          )}
                          Reconnect
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateQrSession}
                          disabled={busy}
                          className={`${TOOLBAR_BTN} inline-flex items-center gap-2 text-amber-900 border border-amber-300 bg-white hover:bg-amber-50 disabled:opacity-50`}
                        >
                          {creatingSession ? (
                            <FiLoader className="w-4 h-4 animate-spin" />
                          ) : (
                            <FiSmartphone className="w-4 h-4" />
                          )}
                          New QR login
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {showReconnecting ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2">
                      <FiLoader className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                      <p className={`${CELL_BODY} text-amber-900 m-0`}>
                        Reconnecting… status will update when linked again.
                      </p>
                    </div>
                  ) : null}

                  {showLoginForm ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5 pt-1">
                      <div className="space-y-4 min-w-0">
                        <div>
                          <p className={`${SECTION_LABEL} mb-2`}>Connect</p>
                          <p className={`${CELL_BODY} m-0 mb-4`}>
                            Start a session and scan the QR code from WhatsApp
                            on your phone (Linked devices).
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleCreateQrSession}
                          disabled={busy}
                          className={`${TOOLBAR_BTN} inline-flex items-center gap-2 text-white bg-green-600 hover:bg-green-700 disabled:opacity-50`}
                        >
                          {creatingSession ? (
                            <FiLoader className="w-4 h-4 animate-spin" />
                          ) : (
                            <FiSmartphone className="w-4 h-4" />
                          )}
                          Connect with QR code
                        </button>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 h-fit">
                        <p className={`${SECTION_LABEL} m-0 mb-2`}>
                          How it works
                        </p>
                        <ol className="m-0 pl-4 space-y-2 list-decimal">
                          <li className={CELL_BODY}>
                            Click Connect with QR code.
                          </li>
                          <li className={CELL_BODY}>
                            Open WhatsApp → Linked devices → Link a device.
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
                            (scan within about 60 seconds)
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

                  {!connected &&
                  !showLoginForm &&
                  !showQrPanel &&
                  !showReconnecting &&
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
