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
  FiShare2,
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
};

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COUNTRY_DIAL_CODES = [
  { code: "91", label: "India (+91)" },
  { code: "1", label: "USA / Canada (+1)" },
  { code: "44", label: "UK (+44)" },
  { code: "971", label: "UAE (+971)" },
  { code: "966", label: "Saudi Arabia (+966)" },
  { code: "65", label: "Singapore (+65)" },
  { code: "61", label: "Australia (+61)" },
  { code: "49", label: "Germany (+49)" },
  { code: "33", label: "France (+33)" },
  { code: "81", label: "Japan (+81)" },
  { code: "86", label: "China (+86)" },
  { code: "977", label: "Nepal (+977)" },
  { code: "880", label: "Bangladesh (+880)" },
  { code: "94", label: "Sri Lanka (+94)" },
  { code: "92", label: "Pakistan (+92)" },
  { code: "60", label: "Malaysia (+60)" },
  { code: "62", label: "Indonesia (+62)" },
  { code: "27", label: "South Africa (+27)" },
  { code: "55", label: "Brazil (+55)" },
  { code: "234", label: "Nigeria (+234)" },
];

function sanitizeCountryCode(value, fallback = "91") {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 4);
  return digits || fallback;
}

function resolveCountryCode(value, fallback = "91") {
  const code = sanitizeCountryCode(value, fallback);
  if (COUNTRY_DIAL_CODES.some((item) => item.code === code)) return code;
  return code; // allow unknown codes from profile even if not in list
}

/** Local mobile digits only (country code is separate). */
function sanitizeMobileInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 12);
}

function isValidMobileNumber(value) {
  const digits = sanitizeMobileInput(value);
  return /^\d{7,12}$/.test(digits);
}

function sanitizeEmailInput(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9.@_+-]/g, "");
}

function isValidEmailAddress(value) {
  const email = String(value || "").trim();
  return email.length > 0 && EMAIL_FORMAT_REGEX.test(email);
}

const CHANNELS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: FaWhatsapp,
    card: "border-slate-200 bg-white hover:border-emerald-300",
    selectedCard: "border-emerald-400 bg-emerald-50",
    iconBox: "bg-emerald-500 text-white",
    check: "border-emerald-600 bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "email",
    label: "Email",
    icon: FiMail,
    card: "border-slate-200 bg-white hover:border-sky-300",
    selectedCard: "border-sky-400 bg-sky-50",
    iconBox: "bg-sky-500 text-white",
    check: "border-sky-600 bg-sky-600",
    badge: "bg-sky-100 text-sky-800",
  },
];

/**
 * Reusable document share modal (ledger, invoices, etc.).
 * Checks `/utils/notification-availability?type=…` then calls
 * `onSend({ channels, mobile, email, country_code })`.
 */
const DocumentShareModal = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Share Document",
  notificationType = "document sharing",
  defaultMobile = "",
  defaultEmail = "",
  defaultCountryCode = "91",
  onSend,
  // Kept for call-site compatibility; not rendered in the body.
  subtitle: _subtitle,
  recipientLabel: _recipientLabel,
}) => {
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [sending, setSending] = useState(false);
  const [channelStatus, setChannelStatus] = useState(EMPTY_STATUS);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [sendResults, setSendResults] = useState(null);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("91");
  const [mobileTouched, setMobileTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const countryOptions = useMemo(() => {
    const code = resolveCountryCode(defaultCountryCode);
    if (COUNTRY_DIAL_CODES.some((item) => item.code === code)) {
      return COUNTRY_DIAL_CODES;
    }
    return [{ code, label: `+${code}` }, ...COUNTRY_DIAL_CODES];
  }, [defaultCountryCode]);

  useEffect(() => {
    if (!isOpen) return undefined;
    setMobile(sanitizeMobileInput(defaultMobile));
    setEmail(sanitizeEmailInput(defaultEmail));
    setCountryCode(resolveCountryCode(defaultCountryCode));
    setMobileTouched(false);
    setEmailTouched(false);
  }, [isOpen, defaultMobile, defaultEmail, defaultCountryCode]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;

    const loadAvailability = async () => {
      setLoadingAvailability(true);
      setSendResults(null);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/utils/notification-availability`,
          {
            params: { type: notificationType },
            headers: getHeaders(),
          },
        );
        if (cancelled) return;
        const incoming = response.data?.data?.channels || {};
        const nextStatus = {
          email: { ...EMPTY_STATUS.email, ...incoming.email },
          whatsapp: { ...EMPTY_STATUS.whatsapp, ...incoming.whatsapp },
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
  }, [isOpen, notificationType]);

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

  const whatsappAvailable =
    !loadingAvailability && channelStatus.whatsapp?.available === true;
  const emailAvailable =
    !loadingAvailability && channelStatus.email?.available === true;
  const showRecipientFields = whatsappAvailable || emailAvailable;

  const needsMobile = selectedChannels.includes("whatsapp");
  const needsEmail = selectedChannels.includes("email");
  const mobileInvalid =
    mobileTouched && mobile.length > 0 && !isValidMobileNumber(mobile);
  const emailInvalid =
    emailTouched && email.length > 0 && !isValidEmailAddress(email);

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
    if (
      selectedChannels.length === 0 ||
      sending ||
      typeof onSend !== "function"
    )
      return;

    const trimmedMobile = sanitizeMobileInput(mobile);
    const trimmedEmail = sanitizeEmailInput(email);

    if (needsMobile) {
      setMobileTouched(true);
      if (!trimmedMobile) {
        toast.error("Enter a mobile number for WhatsApp");
        return;
      }
      if (!isValidMobileNumber(trimmedMobile)) {
        toast.error("Enter a valid mobile number (7–12 digits)");
        return;
      }
    }
    if (needsEmail) {
      setEmailTouched(true);
      if (!trimmedEmail) {
        toast.error("Enter an email address");
        return;
      }
      if (!isValidEmailAddress(trimmedEmail)) {
        toast.error("Enter a valid email address");
        return;
      }
    }

    const trimmedCountryCode = sanitizeCountryCode(countryCode);

    setSending(true);
    setSendResults(null);
    try {
      const result = await onSend({
        channels: selectedChannels,
        mobile: trimmedMobile,
        email: trimmedEmail,
        country_code: trimmedCountryCode,
      });
      const data = result?.data;
      if (result?.success !== false) {
        toast.success(result?.message || "Document shared successfully");
        setSendResults(null);
        if (typeof onSuccess === "function") onSuccess(data);
        onClose();
      } else {
        setSendResults(data?.channels || null);
        toast.error(result?.message || "Failed to share document");
      }
    } catch (error) {
      const data = error.response?.data?.data;
      setSendResults(data?.channels || null);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to share document",
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
            aria-label="Close document share modal"
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
            aria-labelledby="document-share-title"
          >
            {/* Header ~20% taller than previous compact bar (py-2.5 → py-3, icon 7→8) */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-5 py-3 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                  <FiShare2 className="w-4 h-4" />
                </div>
                <h2
                  id="document-share-title"
                  className="text-base font-bold truncate"
                >
                  {title}
                </h2>
              </div>
              <motion.button
                onClick={handleClose}
                disabled={sending}
                className="text-white hover:text-teal-200 transition-colors p-1.5 rounded-lg hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX className="w-5 h-5" />
              </motion.button>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {showRecipientFields && (
                <div className="mb-4 space-y-3 rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/80 via-white to-sky-50/60 p-3">
                  {whatsappAvailable && (
                    <div>
                      <label
                        htmlFor="document-share-mobile"
                        className="mb-1 block text-xs font-medium text-emerald-800"
                      >
                        Mobile
                        {needsMobile ? (
                          <span className="text-red-500"> *</span>
                        ) : null}
                      </label>
                      <div className="flex gap-2">
                        <select
                          id="document-share-country-code"
                          aria-label="Country code"
                          value={countryCode}
                          disabled={sending}
                          onChange={(e) => {
                            setSendResults(null);
                            setCountryCode(
                              sanitizeCountryCode(e.target.value),
                            );
                          }}
                          className="w-[7.5rem] shrink-0 rounded-lg border border-emerald-200 bg-emerald-50/40 py-2 pl-2 pr-1 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {countryOptions.map((item) => (
                            <option key={item.code} value={item.code}>
                              +{item.code}
                            </option>
                          ))}
                        </select>
                        <div className="relative min-w-0 flex-1">
                          <FiSmartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                          <input
                            id="document-share-mobile"
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="tel-national"
                            value={mobile}
                            disabled={sending}
                            maxLength={12}
                            onBlur={() => setMobileTouched(true)}
                            onChange={(e) => {
                              setSendResults(null);
                              setMobile(sanitizeMobileInput(e.target.value));
                            }}
                            onKeyDown={(e) => {
                              if (
                                e.ctrlKey ||
                                e.metaKey ||
                                e.altKey ||
                                [
                                  "Backspace",
                                  "Delete",
                                  "Tab",
                                  "Escape",
                                  "Enter",
                                  "ArrowLeft",
                                  "ArrowRight",
                                  "ArrowUp",
                                  "ArrowDown",
                                  "Home",
                                  "End",
                                ].includes(e.key)
                              ) {
                                return;
                              }
                              if (!/^\d$/.test(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            placeholder="Mobile number"
                            className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              mobileInvalid
                                ? "border-red-300 bg-red-50/50 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20"
                                : "border-emerald-200 bg-emerald-50/40 placeholder:text-emerald-700/40 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                            }`}
                          />
                        </div>
                      </div>
                      {mobileInvalid ? (
                        <p className="mt-1 text-xs text-red-600">
                          Enter digits only (7–12 numbers, without country code).
                        </p>
                      ) : null}
                    </div>
                  )}
                  {emailAvailable && (
                    <div>
                      <label
                        htmlFor="document-share-email"
                        className="mb-1 block text-xs font-medium text-sky-800"
                      >
                        Email
                        {needsEmail ? (
                          <span className="text-red-500"> *</span>
                        ) : null}
                      </label>
                      <div className="relative">
                        <FiMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500" />
                        <input
                          id="document-share-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          value={email}
                          disabled={sending}
                          onBlur={() => setEmailTouched(true)}
                          onChange={(e) => {
                            setSendResults(null);
                            setEmail(sanitizeEmailInput(e.target.value));
                          }}
                          placeholder="name@example.com"
                          className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            emailInvalid
                              ? "border-red-300 bg-red-50/50 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20"
                              : "border-sky-200 bg-sky-50/40 placeholder:text-sky-700/40 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                          }`}
                        />
                      </div>
                      {emailInvalid ? (
                        <p className="mt-1 text-xs text-red-600">
                          Enter a valid email (e.g. name@example.com).
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {CHANNELS.map((channel) => {
                  const status =
                    channelStatus[channel.id] || EMPTY_STATUS[channel.id];
                  const selected = selectedChannels.includes(channel.id);
                  const disabled =
                    !status.available || loadingAvailability || sending;
                  const Icon = channel.icon;
                  const result = sendResults?.[channel.id];
                  const channelDetail =
                    channel.id === "whatsapp"
                      ? status.channel_label || status.detail || ""
                      : status.smtp_name ||
                        status.config_name ||
                        status.detail ||
                        "";

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">
                            {channel.label}
                          </span>
                          {!loadingAvailability && status.available && channelDetail ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${channel.badge}`}
                            >
                              {channelDetail}
                            </span>
                          ) : null}
                          {!loadingAvailability && !status.available && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              UNAVAILABLE
                            </span>
                          )}
                        </div>
                        {!loadingAvailability && !status.available && (
                          <p className="mt-0.5 text-xs text-slate-500 whitespace-normal break-words leading-relaxed">
                            {status.reason ||
                              `${channel.label} is not configured`}
                          </p>
                        )}
                        {result && (
                          <p
                            className={`mt-0.5 flex items-start gap-1 text-xs font-semibold whitespace-normal break-words leading-relaxed ${
                              result.status === "sent"
                                ? "text-emerald-700"
                                : "text-red-600"
                            }`}
                          >
                            {result.status === "sent" ? (
                              <FiCheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>
                              {result.status === "sent"
                                ? "Sent"
                                : result.reason || "Send failed"}
                            </span>
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
                <div className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 leading-relaxed">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    No document-sharing channel is configured. Map a Document
                    Sharing template for WhatsApp / email first.
                  </span>
                </div>
              )}
            </div>

            <div className="border-t px-5 py-3.5 bg-gray-50 shrink-0">
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
                  className={`flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 ${
                    sending ||
                    loadingAvailability ||
                    selectedChannels.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:from-teal-700 hover:to-teal-800"
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
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <FiSend className="w-4 h-4" />
                      Share
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

export default DocumentShareModal;
