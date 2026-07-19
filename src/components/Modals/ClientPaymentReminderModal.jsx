import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiLoader,
  FiMail,
  FiSend,
  FiSmartphone,
  FiX,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa6";
import toast from "react-hot-toast";
import API_BASE_URL from "../../utils/api-controller";
import getHeaders from "../../utils/get-headers";

const EMPTY_STATUS = {
  email: { available: false, reason: "" },
  whatsapp: { available: false, reason: "" },
  sms: { available: false, reason: "" },
};

const CHANNELS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: FaWhatsapp,
    card: "border-slate-200 bg-white hover:border-emerald-300",
    selectedCard: "border-emerald-400 bg-emerald-50",
    iconBox: "bg-emerald-500 text-white",
    check: "border-emerald-600 bg-emerald-600",
  },
  {
    id: "email",
    label: "Email",
    icon: FiMail,
    card: "border-slate-200 bg-white hover:border-sky-300",
    selectedCard: "border-sky-400 bg-sky-50",
    iconBox: "bg-sky-500 text-white",
    check: "border-sky-600 bg-sky-600",
  },
  {
    id: "sms",
    label: "SMS",
    icon: FiSmartphone,
    card: "border-slate-200 bg-white hover:border-violet-300",
    selectedCard: "border-violet-400 bg-violet-50",
    iconBox: "bg-violet-500 text-white",
    check: "border-violet-600 bg-violet-600",
  },
];

const ClientPaymentReminderModal = ({
  isOpen,
  onClose,
  onSuccess,
  client,
  clients = [],
  isAll = false,
}) => {
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [sending, setSending] = useState(false);
  const [channelStatus, setChannelStatus] = useState(EMPTY_STATUS);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [sendResults, setSendResults] = useState(null);
  const reminderClients = useMemo(() => {
    const source = Array.isArray(clients) && clients.length > 0
      ? clients
      : client
        ? [client]
        : [];
    const seen = new Set();
    return source.filter((item) => {
      const username = String(item?.username || "").trim();
      if (!username || seen.has(username)) return false;
      seen.add(username);
      return true;
    });
  }, [client, clients]);
  const usernames = useMemo(
    () => reminderClients.map((item) => String(item.username).trim()),
    [reminderClients],
  );
  const recipientKey = isAll ? "all-clients" : usernames.join("|");

  useEffect(() => {
    if (!isOpen || (!isAll && usernames.length === 0)) return undefined;
    let cancelled = false;

    const loadAvailability = async () => {
      setLoadingAvailability(true);
      setSendResults(null);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/utils/notification-availability`,
          {
            params: { type: "payment_reminder" },
            headers: getHeaders(),
          },
        );
        if (cancelled) return;
        const incoming = response.data?.data?.channels || {};
        const nextStatus = {
          email: { ...EMPTY_STATUS.email, ...incoming.email },
          whatsapp: { ...EMPTY_STATUS.whatsapp, ...incoming.whatsapp },
          sms: { ...EMPTY_STATUS.sms, ...incoming.sms },
        };
        setChannelStatus(nextStatus);
        setSelectedChannels(
          CHANNELS.filter(({ id }) => nextStatus[id].available).map(
            ({ id }) => id,
          ),
        );
      } catch (error) {
        if (cancelled) return;
        setChannelStatus({
          email: {
            available: false,
            reason: "Could not check email availability",
          },
          whatsapp: {
            available: false,
            reason: "Could not check WhatsApp availability",
          },
          sms: {
            available: false,
            reason: "Could not check SMS availability",
          },
        });
        setSelectedChannels([]);
        toast.error(
          error.response?.data?.message ||
            "Could not check notification availability",
        );
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    };

    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [isAll, isOpen, recipientKey, usernames.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, sending]);

  const availableCount = useMemo(
    () =>
      CHANNELS.filter(({ id }) => channelStatus[id]?.available === true).length,
    [channelStatus],
  );

  const toggleChannel = (channelId) => {
    if (!channelStatus[channelId]?.available || sending) return;
    setSendResults(null);
    setSelectedChannels((current) =>
      current.includes(channelId)
        ? current.filter((item) => item !== channelId)
        : [...current, channelId],
    );
  };

  const handleSend = async () => {
    if ((!isAll && usernames.length === 0) || selectedChannels.length === 0 || sending) return;
    setSending(true);
    setSendResults(null);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/client/payment-reminder`,
        {
          ...(isAll ? { is_all: true } : { usernames }),
          channels: selectedChannels,
        },
        { headers: getHeaders() },
      );
      const data = response.data?.data;
      if (response.data?.success) {
        toast.success(response.data.message || "Payment reminder sent");
        setSendResults(null);
        if (typeof onSuccess === "function") onSuccess(data);
        onClose();
      } else {
        setSendResults(
          data?.details?.length === 1 ? data.details[0]?.channels || {} : null,
        );
        toast.error(response.data?.message || "Payment reminder failed");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send payment reminder",
      );
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
    setSendResults(null);
    onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[250] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.button
            type="button"
            aria-label="Close payment reminder modal"
            className="absolute inset-0 bg-black bg-opacity-50 pointer-events-auto"
            onClick={handleClose}
          />

          <motion.div
            className="relative z-[1] pointer-events-auto flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl max-h-[90vh]"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-payment-reminder-title"
          >
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <FiSend className="w-5 h-5" />
                </div>
                <h2
                  id="client-payment-reminder-title"
                  className="text-lg font-bold"
                >
                  Payment Reminder
                </h2>
              </div>
              <motion.button
                onClick={handleClose}
                disabled={sending}
                className="text-white hover:text-purple-200 transition-colors p-2 rounded-lg hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX className="w-5 h-5" />
              </motion.button>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-6 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Choose delivery channels
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAll
                      ? "All clients with a debit balance"
                      : `${usernames.length} client${usernames.length === 1 ? "" : "s"} selected`}
                  </p>
                </div>
                {!loadingAvailability && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {availableCount} available
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {CHANNELS.map((channel) => {
                  const status =
                    channelStatus[channel.id] || EMPTY_STATUS[channel.id];
                  const selected = selectedChannels.includes(channel.id);
                  const disabled =
                    !status.available || loadingAvailability || sending;
                  const Icon = channel.icon;
                  const result = sendResults?.[channel.id];

                  return (
                    <label
                      key={channel.id}
                      className={`relative flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                        disabled
                          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-65"
                          : `cursor-pointer ${selected ? channel.selectedCard : channel.card}`
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selected}
                        disabled={disabled}
                        onChange={() => toggleChannel(channel.id)}
                      />
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${channel.iconBox}`}
                      >
                        {loadingAvailability ? (
                          <FiLoader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {channel.label}
                          </span>
                          {!loadingAvailability && !status.available && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              UNAVAILABLE
                            </span>
                          )}
                        </div>
                        {!loadingAvailability && !status.available && (
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {status.reason ||
                              `${channel.label} is not configured`}
                          </p>
                        )}
                        {result && (
                          <p
                            className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${
                              result.status === "sent"
                                ? "text-emerald-700"
                                : "text-red-600"
                            }`}
                          >
                            {result.status === "sent" ? (
                              <FiCheckCircle className="h-3.5 w-3.5" />
                            ) : (
                              <FiAlertCircle className="h-3.5 w-3.5" />
                            )}
                            {result.status === "sent"
                              ? "Reminder sent"
                              : result.reason || "Send failed"}
                          </p>
                        )}
                      </div>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                          selected
                            ? `${channel.check} text-white`
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {selected && <FiCheck className="h-3.5 w-3.5" />}
                      </span>
                    </label>
                  );
                })}
              </div>

              {!loadingAvailability && availableCount === 0 && (
                <div className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  No payment-reminder channel is configured. Enable a channel
                  and add its payment reminder template first.
                </div>
              )}
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 shrink-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  onClick={handleClose}
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSend}
                  disabled={
                    sending ||
                    loadingAvailability ||
                    selectedChannels.length === 0
                  }
                  className={`flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 ${
                    sending ||
                    loadingAvailability ||
                    selectedChannels.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:from-purple-700 hover:to-purple-800"
                  }`}
                  whileHover={
                    sending ||
                    loadingAvailability ||
                    selectedChannels.length === 0
                      ? {}
                      : { scale: 1.02 }
                  }
                  whileTap={
                    sending ||
                    loadingAvailability ||
                    selectedChannels.length === 0
                      ? {}
                      : { scale: 0.98 }
                  }
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FiSend className="w-4 h-4" />
                      Send
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ClientPaymentReminderModal;
