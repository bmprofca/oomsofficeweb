import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiLayers,
  FiLoader,
  FiLock,
  FiMessageSquare,
  FiMoreVertical,
  FiPhone,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiUser,
  FiX,
  FiXCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import TablePagination from "../../../components/TablePagination";
import ConfirmActionModal from "../../../components/ConfirmActionModal";
import CustomSelect from "../../../components/CustomSelect";
import { useUserPermissions } from "../../../utils/permission-helper";
import {
  smsApi,
  normalizeList,
  normalizePagination,
} from "../../../services/smsApi";

const TABLE_TH =
  "px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const MENU_Z = 99999;
const MENU_GAP = 8;
const MENU_PAD = 8;

const MESSAGE_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
];

const formatHumanTime = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return String(value);
  }
};

const StatusBadge = ({ status }) => {
  const normalized = String(status || "").toLowerCase();
  const styles = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    scheduled: "bg-indigo-100 text-indigo-800 border-indigo-200",
    processing: "bg-sky-100 text-sky-800 border-sky-200",
    sent: "bg-emerald-100 text-emerald-800 border-emerald-200",
    complete: "bg-emerald-100 text-emerald-800 border-emerald-200",
    failed: "bg-rose-100 text-rose-800 border-rose-200",
  };
  const icons = {
    pending: FiClock,
    processing: FiLoader,
    sent: FiCheckCircle,
    complete: FiCheckCircle,
    failed: FiXCircle,
  };
  const Icon = icons[normalized] || FiAlertCircle;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
        styles[normalized] || "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      <Icon className={`h-3 w-3 ${normalized === "processing" ? "animate-spin" : ""}`} />
      {normalized || "Unknown"}
    </span>
  );
};

const StatChip = ({ label, value, icon: Icon, tone = "blue" }) => {
  const tones = {
    blue: "from-blue-50 to-white border-blue-100 text-blue-700",
    emerald: "from-emerald-50 to-white border-emerald-100 text-emerald-700",
    rose: "from-rose-50 to-white border-rose-100 text-rose-700",
    amber: "from-amber-50 to-white border-amber-100 text-amber-700",
  };
  return (
    <div
      className={`min-w-0 rounded-xl border bg-gradient-to-br px-4 py-3 shadow-sm ${tones[tone] || tones.blue}`}
    >
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-3.5 w-3.5 opacity-80" /> : null}
        <p className="m-0 text-[11px] font-bold uppercase tracking-wide opacity-80">
          {label}
        </p>
      </div>
      <p className="m-0 mt-2 text-2xl font-bold leading-none text-gray-900">
        {value}
      </p>
    </div>
  );
};

/** 3-dot action menu — portal + viewport flip (CLIENT/context/action-button.md) */
const ActionMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const visibleItems = items.filter(Boolean);

  const calcPos = useCallback(() => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const mH = menu?.offsetHeight || Math.max(44, visibleItems.length * 36 + 8);
    const mW = menu?.offsetWidth || 168;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const candidates = [
      { top: r.top - mH - MENU_GAP, left: r.right - mW },
      { top: r.bottom + MENU_GAP, left: r.right - mW },
      { top: r.top, left: r.right + MENU_GAP },
      { top: r.top, left: r.left - mW - MENU_GAP },
    ];
    const fits = (p) =>
      p.top >= MENU_PAD &&
      p.left >= MENU_PAD &&
      p.top + mH <= vh - MENU_PAD &&
      p.left + mW <= vw - MENU_PAD;
    const chosen = candidates.find(fits) || candidates[1];
    setPos({
      top: Math.min(Math.max(MENU_PAD, chosen.top), vh - MENU_PAD - mH),
      left: Math.min(Math.max(MENU_PAD, chosen.left), vw - MENU_PAD - mW),
    });
  }, [visibleItems.length]);

  useEffect(() => {
    if (!open) return undefined;
    const raf = requestAnimationFrame(() => calcPos());
    return () => cancelAnimationFrame(raf);
  }, [open, calcPos]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onClose = () => setOpen(false);
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", calcPos);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", calcPos);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, calcPos]);

  if (!visibleItems.length) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-700"
        aria-label="Actions"
      >
        <FiMoreVertical className="h-4 w-4" />
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "fixed",
                  top: pos.top,
                  left: pos.left,
                  zIndex: MENU_Z,
                  height: "auto",
                }}
                className="w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
              >
                {visibleItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.disabled) return;
                      setOpen(false);
                      item.onClick?.();
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      item.danger
                        ? "text-red-600 hover:bg-red-50"
                        : "text-gray-700 hover:bg-gray-50"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {item.icon ? (
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                    ) : null}
                    {item.label}
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

const SkeletonBone = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-slate-200/90 ${className}`} />
);

const CampaignDetailsSkeleton = () => (
  <div className="space-y-4" aria-busy="true">
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <SkeletonBone className="mb-2 h-6 w-48" />
      <SkeletonBone className="h-3 w-64" />
    </div>
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
      <SkeletonBone className="h-3 w-28" />
      <SkeletonBone className="h-20 w-full" />
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-white px-4 py-3">
          <SkeletonBone className="mb-3 h-3 w-14" />
          <SkeletonBone className="h-7 w-12" />
        </div>
      ))}
    </div>
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="border-b px-4 py-3">
        <SkeletonBone className="h-5 w-32" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBone key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  </div>
);

const DetailRow = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </span>
    <span className="min-w-0 text-right text-sm text-slate-800">{children}</span>
  </div>
);

const MessageDetailModal = ({ open, loading, data, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const title =
    data?.message?.name || data?.message?.mobile || "Audience details";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="sms-audience-detail"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[10080] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sms-audience-detail-title"
            className="relative z-[1] pointer-events-auto flex w-full max-w-lg max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-blue-500/25 bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3.5 text-white">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <FiEye className="h-3.5 w-3.5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                    Audience details
                  </p>
                  <h2
                    id="sms-audience-detail-title"
                    className="m-0 truncate text-sm font-semibold"
                  >
                    {loading ? "Loading…" : title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                aria-label="Close"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {loading ? (
                <div className="space-y-3" aria-busy="true">
                  <SkeletonBone className="h-24 w-full rounded-xl" />
                  <SkeletonBone className="h-20 w-full rounded-xl" />
                  <SkeletonBone className="h-16 w-full rounded-xl" />
                </div>
              ) : data ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <StatusBadge status={data.message?.status} />
                      {data.message?.mobile ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-700">
                          <FiPhone className="h-3 w-3" />
                          {data.message.mobile}
                        </span>
                      ) : null}
                    </div>
                    <DetailRow label="Name">
                      {data.message?.name || "—"}
                    </DetailRow>
                    <DetailRow label="Username">
                      {data.message?.username || "—"}
                    </DetailRow>
                    <DetailRow label="Sent at">
                      {formatHumanTime(data.message?.sent_at)}
                    </DetailRow>
                    <DetailRow label="Created">
                      {formatHumanTime(data.message?.create_date)}
                    </DetailRow>
                    <DetailRow label="Request ID">
                      <span className="break-all font-mono text-xs">
                        {data.message?.provider_request_id || "—"}
                      </span>
                    </DetailRow>
                  </div>

                  <div className="rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
                    <p className="mb-2 m-0 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                      <FiMessageSquare className="h-3.5 w-3.5" />
                      Sent SMS
                    </p>
                    <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                      {data.preview_text || "—"}
                    </p>
                  </div>

                  {Array.isArray(data.variable_parts) &&
                  data.variable_parts.some((p) => String(p || "").trim()) ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="mb-2 m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Variables
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.variable_parts.map((part, idx) => (
                          <span
                            key={`${idx}-${part}`}
                            className="inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 font-mono text-[11px] font-medium text-indigo-700"
                          >
                            {idx + 1}: {part || "—"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {data.message?.error_message ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                      {data.message.error_message}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="m-0 text-sm text-slate-500">No details found.</p>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

const Fast2SmsCampaignDetails = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const canView = check("broadcast_send") || check("broadcast_config_edit");
  const canSend = check("broadcast_send");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );
  const [detailLoading, setDetailLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msgStatus, setMsgStatus] = useState(MESSAGE_STATUS_OPTIONS[0]);
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailModal, setDetailModal] = useState({
    open: false,
    loading: false,
    data: null,
  });
  const [retryingId, setRetryingId] = useState(null);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchDetails = useCallback(async () => {
    if (!campaignId) return;
    setDetailLoading(true);
    try {
      const res = await smsApi.getCampaignDetails({ campaign_id: campaignId });
      setCampaign(res?.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load campaign");
      setCampaign(null);
    } finally {
      setDetailLoading(false);
    }
  }, [campaignId]);

  const fetchMessages = useCallback(
    async (page = 1, limit = pagination.limit, status = msgStatus?.value) => {
      if (!campaignId) return;
      setMessagesLoading(true);
      try {
        const res = await smsApi.listCampaignMessages({
          campaign_id: campaignId,
          page_no: page,
          limit,
          status: status || "all",
        });
        const list = normalizeList(res?.data);
        setMessages(list);
        setPagination(
          normalizePagination(res?.pagination, { page_no: page, limit }),
        );
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load messages");
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [campaignId, msgStatus?.value, pagination.limit],
  );

  useEffect(() => {
    if (canView) {
      fetchDetails();
      fetchMessages(1);
    }
  }, [canView, fetchDetails, fetchMessages]);

  const runDelete = async () => {
    setDeleting(true);
    try {
      await smsApi.deleteCampaign({ campaign_id: campaignId });
      toast.success("Campaign deleted");
      navigate("/broadcast/sms/fast2sms/campaigns");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const openMessageDetails = async (row) => {
    setDetailModal({ open: true, loading: true, data: null });
    try {
      const res = await smsApi.getCampaignMessageDetail({
        campaign_id: campaignId,
        message_id: row.message_id,
      });
      setDetailModal({ open: true, loading: false, data: res?.data || null });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load details");
      setDetailModal({ open: false, loading: false, data: null });
    }
  };

  const retryMessage = async (row) => {
    if (!canSend) return;
    setRetryingId(row.message_id);
    try {
      await smsApi.retryCampaignMessage({
        campaign_id: campaignId,
        message_id: row.message_id,
      });
      toast.success("Message resent");
      await Promise.all([fetchDetails(), fetchMessages(pagination.page_no)]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Retry failed");
      fetchMessages(pagination.page_no);
    } finally {
      setRetryingId(null);
    }
  };

  const getActionItems = (row) => {
    const status = String(row.status || "").toLowerCase();
    const canRetry =
      canSend && ["failed", "pending"].includes(status) && retryingId !== row.message_id;
    return [
      {
        label: "Details",
        icon: FiEye,
        onClick: () => openMessageDetails(row),
      },
      canRetry
        ? {
            label: retryingId === row.message_id ? "Retrying…" : "Retry send",
            icon: FiSend,
            disabled: Boolean(retryingId),
            onClick: () => retryMessage(row),
          }
        : null,
    ];
  };

  const preview = campaign?.preview || null;
  const serialBase = (pagination.page_no - 1) * pagination.limit;
  const pendingCount = useMemo(() => {
    if (!campaign) return 0;
    return Math.max(
      0,
      (campaign.total_count || 0) -
        (campaign.sent_count || 0) -
        (campaign.failed_count || 0),
    );
  }, [campaign]);

  if (!canView) {
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
          className={`flex h-[calc(100vh-4rem)] items-center justify-center pt-16 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
        >
          <div className="mx-4 max-w-sm rounded-lg border bg-white p-8 text-center">
            <FiLock className="mx-auto mb-3 h-8 w-8 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-500">Access Denied</h3>
          </div>
        </div>
      </div>
    );
  }

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";

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
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
      >
        <div className="mx-2 my-3 flex h-full flex-col space-y-4 sm:mx-4 md:mx-8 md:my-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/broadcast/sms/fast2sms/campaigns")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900"
            >
              <FiArrowLeft className="h-4 w-4" />
              Campaigns
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  fetchDetails();
                  fetchMessages(pagination.page_no);
                }}
                className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                aria-label="Refresh"
              >
                <FiRefreshCw
                  className={`h-4 w-4 ${detailLoading || messagesLoading ? "animate-spin" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
              >
                <FiTrash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>

          {detailLoading ? (
            <CampaignDetailsSkeleton />
          ) : !campaign ? (
            <div className="rounded-xl border bg-white py-16 text-center text-gray-500">
              Campaign not found
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 shadow-sm md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                        <FiLayers className="h-4 w-4" />
                      </span>
                      <h1 className="m-0 text-xl font-bold text-gray-900">
                        {campaign.name}
                      </h1>
                    </div>
                    <p className="m-0 mt-2 text-sm text-gray-600">
                      {campaign.template_name || "—"}
                      {campaign.route ? ` · ${String(campaign.route).toUpperCase()}` : ""}
                      {campaign.dlt_message_id
                        ? ` · ${campaign.dlt_message_id}`
                        : ""}
                    </p>
                    <p className="m-0 mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <FiClock className="h-3.5 w-3.5 text-blue-500" />
                      Created {formatHumanTime(campaign.create_date)}
                    </p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>
                {campaign.error_message ? (
                  <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {campaign.error_message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-sky-700">
                    <FiMessageSquare className="h-3.5 w-3.5" />
                    Message preview
                  </p>
                  {preview?.name || preview?.mobile ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800">
                      <FiUser className="h-3 w-3" />
                      {preview.name || preview.mobile}
                    </span>
                  ) : null}
                </div>
                {preview?.preview_text || campaign.message_body ? (
                  <p className="m-0 whitespace-pre-wrap rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white p-3 text-sm leading-relaxed text-gray-800">
                    {preview?.preview_text || campaign.message_body}
                  </p>
                ) : (
                  <p className="m-0 text-sm text-gray-400">—</p>
                )}
                {preview?.mobile ? (
                  <p className="m-0 mt-2 text-xs text-gray-500">
                    Using first audience · {preview.mobile}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatChip
                  label="Total"
                  value={campaign.total_count ?? 0}
                  icon={FiLayers}
                  tone="blue"
                />
                <StatChip
                  label="Sent"
                  value={campaign.sent_count ?? 0}
                  icon={FiCheckCircle}
                  tone="emerald"
                />
                <StatChip
                  label="Failed"
                  value={campaign.failed_count ?? 0}
                  icon={FiXCircle}
                  tone="rose"
                />
                <StatChip
                  label="Pending"
                  value={pendingCount}
                  icon={FiClock}
                  tone="amber"
                />
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 py-3">
                  <h2 className="m-0 flex items-center gap-2 text-base font-semibold text-gray-800">
                    <FiSend className="h-4 w-4 text-blue-600" />
                    Delivery report
                  </h2>
                  <div className="ml-auto w-40">
                    <CustomSelect
                      value={msgStatus}
                      onChange={setMsgStatus}
                      options={MESSAGE_STATUS_OPTIONS}
                      isSearchable={false}
                    />
                  </div>
                </div>

                {messagesLoading ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonBone key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-500">
                    No messages for this filter.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className={TABLE_TH}>#</th>
                            <th className={TABLE_TH}>Mobile</th>
                            <th className={TABLE_TH}>Name</th>
                            <th className={TABLE_TH}>Status</th>
                            <th className={TABLE_TH}>Sent at</th>
                            <th className={TABLE_TH}>Request ID</th>
                            <th className={TABLE_TH}>Error</th>
                            <th className={TABLE_TH}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {messages.map((row, index) => (
                            <tr
                              key={row.message_id}
                              className="border-b border-gray-100 hover:bg-blue-50/30"
                            >
                              <td className="px-3 py-3 text-[11px] font-bold text-gray-800">
                                {serialBase + index + 1}
                              </td>
                              <td className="px-3 py-3 font-mono text-sm text-gray-800">
                                {row.mobile}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700">
                                {row.name || "—"}
                              </td>
                              <td className="px-3 py-3">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                                {formatHumanTime(row.sent_at)}
                              </td>
                              <td className="px-3 py-3 font-mono text-xs text-gray-500">
                                {row.provider_request_id || "—"}
                              </td>
                              <td className="px-3 py-3 text-xs text-rose-600 max-w-[180px] truncate">
                                {row.error_message || "—"}
                              </td>
                              <td className="px-3 py-3">
                                <ActionMenu items={getActionItems(row)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <TablePagination
                      page={pagination.page_no}
                      limit={pagination.limit}
                      total={pagination.total}
                      totalPages={pagination.total_pages}
                      rowOptions={[10, 20, 50, 100]}
                      defaultRows={20}
                      onPageChange={(page) => fetchMessages(page)}
                      onLimitChange={(limit) => {
                        setPagination((p) => ({ ...p, limit, page_no: 1 }));
                        fetchMessages(1, Number(limit));
                      }}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <MessageDetailModal
        open={detailModal.open}
        loading={detailModal.loading}
        data={detailModal.data}
        onClose={() =>
          setDetailModal({ open: false, loading: false, data: null })
        }
      />

      <ConfirmActionModal
        isOpen={confirmDelete}
        loading={deleting}
        onCancel={() => !deleting && setConfirmDelete(false)}
        onConfirm={runDelete}
        title="Delete campaign"
        heading="Delete this campaign?"
        message="This will permanently delete the campaign and all delivery rows."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        tone="danger"
      />
    </div>
  );
};

export default Fast2SmsCampaignDetails;
