import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FiActivity,
  FiCheckCircle,
  FiHome,
  FiLoader,
  FiLogOut,
  FiRefreshCw,
  FiSend,
  FiSmartphone,
  FiWifi,
  FiWifiOff,
} from 'react-icons/fi';
import { Header, Sidebar } from '../../../components/header';
import { extractApiError } from './oneChattingSendUtils';
import { whatsappApi } from './whatsappApi';

const STATUS_POLL_MS = 3000;
const QR_POLL_MS = 2500;

const STATUS_META = {
  not_configured: {
    label: 'Not configured',
    className: 'bg-gray-100 text-gray-700',
  },
  connecting: {
    label: 'Connecting',
    className: 'bg-amber-100 text-amber-700',
  },
  qr: {
    label: 'Scan QR code',
    className: 'bg-blue-100 text-blue-700',
  },
  pairing: {
    label: 'Enter pairing code',
    className: 'bg-blue-100 text-blue-700',
  },
  connected: {
    label: 'Connected',
    className: 'bg-green-100 text-green-700',
  },
  disconnected: {
    label: 'Disconnected',
    className: 'bg-red-100 text-red-700',
  },
  destroyed: {
    label: 'Session removed',
    className: 'bg-gray-100 text-gray-600',
  },
};

const SessionStatusBadge = ({ status, connected }) => {
  const normalized = connected ? 'connected' : status || 'not_configured';
  const meta = STATUS_META[normalized] || STATUS_META.not_configured;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.className}`}
    >
      {connected ? (
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
      ) : null}
      {meta.label}
    </span>
  );
};

const WhatsAppWebSession = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'),
  );

  const [healthLoading, setHealthLoading] = useState(false);
  const [health, setHealth] = useState(null);

  const [statusLoading, setStatusLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState(null);

  const [loginMethod, setLoginMethod] = useState('qr');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [phone, setPhone] = useState('');
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

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await whatsappApi.getWhatsAppWebHealth();
      setHealth(res?.data || null);
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to fetch server health'));
      setHealth(null);
    } finally {
      setHealthLoading(false);
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
        toast.error(extractApiError(error, 'Failed to fetch session status'));
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
      if (data?.connected || data?.status === 'connected') {
        clearPollers();
        setQrCode(null);
        toast.success('WhatsApp connected successfully');
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
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    fetchHealth();
    fetchStatus();
    return () => clearPollers();
  }, [fetchHealth, fetchStatus, clearPollers]);

  useEffect(() => {
    const status = sessionStatus?.status;
    const connected = Boolean(sessionStatus?.connected);

    if (connected) {
      clearPollers();
      return;
    }

    if (status === 'qr' || status === 'connecting') {
      startStatusPolling();
      if (loginMethod === 'qr') {
        fetchQr();
        startQrPolling();
      }
      return;
    }

    if (status === 'pairing') {
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
      const payload = {};
      if (webhookUrl.trim()) payload.webhookUrl = webhookUrl.trim();

      await whatsappApi.createWhatsAppWebSession(payload);
      toast.success('Session created. Scan the QR code with WhatsApp.');
      await fetchStatus(true);
      await fetchQr();
      startStatusPolling();
      startQrPolling();
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to create session'));
    } finally {
      setCreatingSession(false);
    }
  };

  const handleCreatePairingSession = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      toast.error('Enter a valid phone number (10–15 digits, country code included)');
      return;
    }

    setCreatingSession(true);
    setQrCode(null);
    setPairingCode(null);
    try {
      const payload = { pairingCodeEnabled: true };
      if (webhookUrl.trim()) payload.webhookUrl = webhookUrl.trim();

      await whatsappApi.createWhatsAppWebSession(payload);
      setRequestingPairing(true);
      const res = await whatsappApi.requestWhatsAppWebPairingCode({ phone: digits });
      setPairingCode(res?.data?.pairingCode || null);
      toast.success('Pairing code generated. Enter it on your phone.');
      await fetchStatus(true);
      startStatusPolling();
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to start pairing login'));
    } finally {
      setCreatingSession(false);
      setRequestingPairing(false);
    }
  };

  const handleRefreshPairingCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      toast.error('Enter a valid phone number first');
      return;
    }

    setRequestingPairing(true);
    try {
      const res = await whatsappApi.requestWhatsAppWebPairingCode({ phone: digits });
      setPairingCode(res?.data?.pairingCode || null);
      toast.success('Pairing code refreshed');
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to get pairing code'));
    } finally {
      setRequestingPairing(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Disconnect WhatsApp Web for this branch?')) return;

    setLoggingOut(true);
    clearPollers();
    try {
      const res = await whatsappApi.deleteWhatsAppWebSession();
      toast.success(res?.message || 'Session disconnected');
      setQrCode(null);
      setPairingCode(null);
      await fetchStatus(true);
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to disconnect session'));
    } finally {
      setLoggingOut(false);
    }
  };

  const connected = Boolean(sessionStatus?.connected);
  const status = sessionStatus?.status || 'not_configured';
  const showLoginForm = !connected && status === 'not_configured';
  const showQrPanel =
    !connected &&
    loginMethod === 'qr' &&
    (status === 'connecting' || status === 'qr' || qrCode);
  const showPairingPanel =
    !connected &&
    (loginMethod === 'pairing' || status === 'pairing') &&
    (pairingCode || status === 'pairing');

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
        className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <nav className="flex items-center text-sm text-gray-600 mb-4">
            <Link
              to="/"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <FiHome className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <Link
              to="/broadcast/whatsapp"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <FiSend className="w-4 h-4" />
              <span>Broadcast</span>
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900 font-medium">WhatsApp Web</span>
          </nav>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">WhatsApp Web Session</h1>
            <p className="text-sm text-gray-500 mt-1">
              Connect this branch to WhatsApp Web via QR scan or pairing code
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiActivity className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-800 m-0">
                      Server health
                    </h2>
                    <p className="text-xs text-gray-500 m-0">
                      WhatsApp Web upstream service status
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchHealth}
                  disabled={healthLoading}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw
                    className={`w-4 h-4 ${healthLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
              <div className="px-6 py-4">
                {healthLoading && !health ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FiLoader className="w-4 h-4 animate-spin" />
                    Checking server...
                  </div>
                ) : health ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 m-0">Status</p>
                      <p className="font-medium text-gray-800 m-0 mt-0.5 capitalize">
                        {health.status || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 m-0">Uptime</p>
                      <p className="font-medium text-gray-800 m-0 mt-0.5">
                        {health.uptime || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 m-0">Sessions</p>
                      <p className="font-medium text-gray-800 m-0 mt-0.5">
                        {health.sessions ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 m-0">Connected</p>
                      <p className="font-medium text-gray-800 m-0 mt-0.5">
                        {health.connected ?? '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 m-0">
                    Unable to load server health.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    {connected ? (
                      <FiWifi className="w-4 h-4 text-green-600" />
                    ) : (
                      <FiWifiOff className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-800 m-0">
                      Branch session
                    </h2>
                    <p className="text-xs text-gray-500 m-0">
                      One session per branch — managed automatically by OOMS
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchStatus()}
                    disabled={statusLoading}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    title="Refresh status"
                  >
                    <FiRefreshCw
                      className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`}
                    />
                  </button>
                  {connected || (sessionStatus?.sessionId && status !== 'not_configured') ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50"
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

              <div className="px-6 py-5 space-y-5">
                {statusLoading && !sessionStatus ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <FiLoader className="w-5 h-5 animate-spin mr-2" />
                    Loading session status...
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <SessionStatusBadge
                        status={status}
                        connected={connected}
                      />
                      {sessionStatus?.sessionId ? (
                        <span className="text-xs text-gray-500 font-mono">
                          Session: {sessionStatus.sessionId}
                        </span>
                      ) : null}
                    </div>

                    {connected ? (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <div className="flex items-start gap-3">
                          <FiCheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-green-800 m-0">
                              WhatsApp is connected
                            </p>
                            <p className="text-sm text-green-700 mt-1 m-0">
                              {sessionStatus.displayName
                                ? `${sessionStatus.displayName}`
                                : 'Ready to send messages'}
                              {sessionStatus.phone
                                ? ` · +${sessionStatus.phone}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {status === 'disconnected' ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        Connection was lost. The server may reconnect automatically,
                        or disconnect and sign in again.
                      </div>
                    ) : null}

                    {showLoginForm ? (
                      <div className="space-y-4 border-t border-gray-100 pt-5">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Login method
                          </p>
                          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                            <button
                              type="button"
                              onClick={() => setLoginMethod('qr')}
                              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                loginMethod === 'qr'
                                  ? 'bg-white text-green-700 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              QR code
                            </button>
                            <button
                              type="button"
                              onClick={() => setLoginMethod('pairing')}
                              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                loginMethod === 'pairing'
                                  ? 'bg-white text-green-700 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              Pairing code
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Webhook URL{' '}
                            <span className="text-gray-400 font-normal">(optional)</span>
                          </label>
                          <input
                            type="url"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://your-app.com/webhook/whatsapp"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          />
                        </div>

                        {loginMethod === 'pairing' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone number
                            </label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="919999999999"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none font-mono"
                            />
                            <p className="text-xs text-gray-500 mt-1 m-0">
                              Country code + number, digits only (10–15 digits)
                            </p>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={
                            loginMethod === 'qr'
                              ? handleCreateQrSession
                              : handleCreatePairingSession
                          }
                          disabled={creatingSession || requestingPairing}
                          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                        >
                          {creatingSession || requestingPairing ? (
                            <FiLoader className="w-4 h-4 animate-spin" />
                          ) : (
                            <FiSmartphone className="w-4 h-4" />
                          )}
                          {loginMethod === 'qr'
                            ? 'Connect with QR code'
                            : 'Generate pairing code'}
                        </button>
                      </div>
                    ) : null}

                    {showQrPanel ? (
                      <div className="border-t border-gray-100 pt-5">
                        <p className="text-sm font-medium text-gray-800 mb-3 m-0">
                          Scan this QR code with WhatsApp
                        </p>
                        <p className="text-xs text-gray-500 mb-4 m-0">
                          Open WhatsApp on your phone → Linked devices → Link a device
                        </p>
                        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-6 min-h-[280px]">
                          {qrCode ? (
                            <img
                              src={qrCode}
                              alt="WhatsApp QR code"
                              className="w-64 h-64 object-contain bg-white rounded-lg border border-gray-200"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-gray-500">
                              <FiLoader className="w-8 h-8 animate-spin mb-3" />
                              <p className="text-sm m-0">
                                {qrLoading
                                  ? 'Loading QR code...'
                                  : 'Waiting for QR code...'}
                              </p>
                              <button
                                type="button"
                                onClick={fetchQr}
                                className="mt-3 text-xs text-green-700 hover:text-green-800 font-medium"
                              >
                                Retry now
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {showPairingPanel ? (
                      <div className="border-t border-gray-100 pt-5">
                        <p className="text-sm font-medium text-gray-800 mb-2 m-0">
                          Enter this pairing code on your phone
                        </p>
                        <p className="text-xs text-gray-500 mb-4 m-0">
                          WhatsApp → Linked devices → Link with phone number
                        </p>
                        {pairingCode ? (
                          <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-5 text-center">
                            <p className="text-3xl font-bold tracking-widest text-green-800 font-mono m-0">
                              {pairingCode}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-8 text-gray-500">
                            <FiLoader className="w-5 h-5 animate-spin mr-2" />
                            Generating pairing code...
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleRefreshPairingCode}
                          disabled={requestingPairing}
                          className="mt-4 inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium disabled:opacity-50"
                        >
                          <FiRefreshCw
                            className={`w-4 h-4 ${requestingPairing ? 'animate-spin' : ''}`}
                          />
                          Refresh pairing code
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppWebSession;
