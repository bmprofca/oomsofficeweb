import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiEye,
  FiLayers,
  FiLock,
  FiMoreVertical,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
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
const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const MENU_Z = 99999;
const MENU_GAP = 8;
const MENU_PAD = 8;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "processing", label: "Processing" },
  { value: "complete", label: "Complete" },
  { value: "failed", label: "Failed" },
];

const StatusBadge = ({ status }) => {
  const normalized = String(status || "").toLowerCase();
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    scheduled: "bg-indigo-100 text-indigo-700",
    processing: "bg-blue-100 text-blue-700",
    complete: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
        styles[normalized] || "bg-gray-100 text-gray-700"
      }`}
    >
      {normalized || "Unknown"}
    </span>
  );
};

/** 3-dot action menu — portal + viewport flip (CLIENT/context/action-button.md) */
const ActionMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const calcPos = useCallback(() => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const mH = menu?.offsetHeight || Math.max(44, items.length * 36 + 8);
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
  }, [items.length]);

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

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
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
                {items.map((item) => (
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

const CampaignsTableSkeleton = ({ rows = 8 }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          <th className={TABLE_TH}>#</th>
          <th className={TABLE_TH}>Created</th>
          <th className={TABLE_TH}>Name</th>
          <th className={TABLE_TH}>Template</th>
          <th className={TABLE_TH}>Status</th>
          <th className={TABLE_TH}>Recipients</th>
          <th className={TABLE_TH}>Sent / Failed</th>
          <th className={TABLE_TH}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="px-3 py-3">
              <SkeletonBone className="h-3 w-6" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-3 w-28" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-4 w-36" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-3 w-28" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-6 w-20 rounded-full" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-3 w-10" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-3 w-16" />
            </td>
            <td className="px-3 py-3">
              <SkeletonBone className="h-7 w-7 rounded-lg" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const formatCreated = (value) => {
  if (!value) return "—";
  try {
    return new Date(String(value).replace(" ", "T")).toLocaleString("en-IN");
  } catch {
    return String(value);
  }
};

const Fast2SmsCampaigns = () => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const canView = check("broadcast_send") || check("broadcast_config_edit");
  const canCreate = check("broadcast_send");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0]);
  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchCampaigns = useCallback(
    async (page = 1, limit = pagination.limit, status = statusFilter?.value) => {
      setLoading(true);
      try {
        const res = await smsApi.listCampaigns({
          page_no: page,
          limit,
          status: status || "all",
        });
        const list = normalizeList(res?.data);
        setRows(list);
        setPagination(
          normalizePagination(res?.pagination, { page_no: page, limit }),
        );
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load campaigns");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, statusFilter?.value],
  );

  useEffect(() => {
    if (canView) fetchCampaigns(1);
  }, [canView, statusFilter, fetchCampaigns]);

  const runDelete = async () => {
    if (!confirmRow?.campaign_id) return;
    setDeleting(true);
    try {
      await smsApi.deleteCampaign({ campaign_id: confirmRow.campaign_id });
      toast.success("Campaign deleted");
      setConfirmRow(null);
      fetchCampaigns(pagination.page_no);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete campaign");
    } finally {
      setDeleting(false);
    }
  };

  const getActionItems = (row) => [
    {
      label: "View",
      icon: FiEye,
      onClick: () =>
        navigate(`/broadcast/sms/fast2sms/campaigns/${row.campaign_id}`),
    },
    {
      label: "Delete",
      icon: FiTrash2,
      danger: true,
      onClick: () => setConfirmRow(row),
    },
  ];

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
  const serialBase = (pagination.page_no - 1) * pagination.limit;

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
        <div className="mx-2 my-3 flex h-full flex-col sm:mx-4 md:mx-8 md:my-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Fast2SMS Campaigns
            </h1>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className={TOOLBAR_ROW}>
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <FiLayers className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="m-0 text-base font-semibold text-gray-800">
                  Campaigns
                </h2>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="w-40">
                  <CustomSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={STATUS_OPTIONS}
                    isSearchable={false}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchCampaigns(pagination.page_no)}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                  aria-label="Refresh"
                >
                  <FiRefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                </button>
                {canCreate ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/broadcast/sms/fast2sms/campaigns/create")
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <FiPlus className="h-4 w-4" />
                    Create
                  </button>
                ) : null}
              </div>
            </div>

            {loading ? (
              <CampaignsTableSkeleton />
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <FiLayers className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm">No campaigns yet.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className={TABLE_TH}>#</th>
                        <th className={TABLE_TH}>Created</th>
                        <th className={TABLE_TH}>Name</th>
                        <th className={TABLE_TH}>Template</th>
                        <th className={TABLE_TH}>Status</th>
                        <th className={TABLE_TH}>Recipients</th>
                        <th className={TABLE_TH}>Sent / Failed</th>
                        <th className={TABLE_TH}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr
                          key={row.campaign_id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-3 py-3 text-[11px] font-bold text-gray-800">
                            {serialBase + index + 1}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {formatCreated(row.create_date)}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-gray-800">
                            {row.name}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">
                            {row.template_name || "—"}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-700">
                            {row.total_count ?? 0}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-700">
                            {row.sent_count ?? 0} / {row.failed_count ?? 0}
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
                  onPageChange={(page) => fetchCampaigns(page)}
                  onLimitChange={(limit) => {
                    setPagination((p) => ({ ...p, limit, page_no: 1 }));
                    fetchCampaigns(1, Number(limit));
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(confirmRow)}
        loading={deleting}
        onCancel={() => !deleting && setConfirmRow(null)}
        onConfirm={runDelete}
        title="Delete campaign"
        heading="Delete this campaign?"
        message={`“${confirmRow?.name || "This campaign"}” and its delivery rows will be permanently deleted.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        tone="danger"
      />
    </div>
  );
};

export default Fast2SmsCampaigns;
