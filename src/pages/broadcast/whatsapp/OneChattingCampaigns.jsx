import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiLayers,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiEye,
  FiTrash2,
  FiMoreVertical,
  FiLock,
  FiAlertTriangle,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import TablePagination from "../../../components/TablePagination";
import ConfirmActionModal from "../../../components/ConfirmActionModal";
import CustomSelect from "../../../components/CustomSelect";
import { useUserPermissions } from "../../../utils/permission-helper";
import { extractApiError } from "../../../utils/oneChattingSendUtils";
import {
  normalizeList,
  normalizePagination,
  whatsappApi,
} from "../../../services/whatsappApi";

/** Task-table typography baseline — see CLIENT/context/typography.md */
const TABLE_HEAD_ROW =
  "bg-gradient-to-r from-gray-50 to-white border-b border-gray-200";
const TABLE_TH =
  "px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const TABLE_ROW =
  "border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors";
const TABLE_TD = "px-3 py-3 min-w-0 text-left align-middle";
const CELL_INDEX = "text-[11px] font-bold text-gray-800";
const CELL_TITLE = "font-semibold text-gray-800 text-sm";
const CELL_MOBILE_TITLE = "text-xs font-semibold text-gray-800";
const CELL_META = "text-xs text-gray-400";
const CELL_BODY = "text-sm font-medium text-gray-700";
const CELL_EMPTY = "text-sm text-gray-400";
const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const TOOLBAR_BTN = "px-3 py-2 text-sm font-medium rounded-lg";
const EMPTY_WRAP =
  "flex flex-col items-center justify-center py-12 text-gray-500 px-4";
const EMPTY_ICON_WRAP =
  "w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3";
const EMPTY_TITLE = "text-sm font-medium text-gray-500";
const EMPTY_SUBTITLE = "text-xs text-gray-400 mt-1";

const MENU_Z = 99999;
const MENU_GAP = 8;
const MENU_PAD = 8;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "complete", label: "Complete" },
  { value: "stopped", label: "Stopped" },
];

const SkeletonRow = ({ cols = 7 }) => (
  <tr className="animate-pulse border-b border-gray-100">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-3 py-3">
        <div
          className="h-3 bg-gray-200 rounded"
          style={{ width: `${55 + (i % 3) * 18}px` }}
        />
      </td>
    ))}
  </tr>
);

const CampaignStatusBadge = ({ status }) => {
  const normalized = String(status || "").toLowerCase();
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    scheduled: "bg-indigo-100 text-indigo-700",
    complete: "bg-green-100 text-green-700",
    stopped: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium capitalize ${
        styles[normalized] || "bg-gray-100 text-gray-700"
      }`}
    >
      {normalized || "Unknown"}
    </span>
  );
};

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
    const mH = menu?.offsetHeight || 120;
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
  }, []);

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
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Actions"
      >
        <FiMoreVertical className="w-4 h-4" />
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
                }}
                className="w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden"
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
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                      item.danger
                        ? "text-red-600 hover:bg-red-50"
                        : "text-gray-700 hover:bg-gray-50"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {item.icon ? (
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
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

const OneChattingCampaigns = () => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });

  const fetchCampaigns = useCallback(
    async (page = 1, limit = 20, status = "all") => {
      setLoading(true);
      try {
        const res = await whatsappApi.listCampaigns({
          page_no: page,
          limit,
          status: status || "all",
        });
        const list = normalizeList(res?.data);
        setRows(list);
        setPagination(
          normalizePagination(res?.meta ?? res?.pagination, {
            page_no: page,
            limit,
            itemCount: list.length,
          }),
        );
      } catch (error) {
        toast.error(extractApiError(error, "Failed to load campaigns"));
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    fetchCampaigns(1, pagination.limit, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, fetchCampaigns]);

  const handlePageChange = (page) => {
    fetchCampaigns(page, pagination.limit, statusFilter);
  };

  const handleLimitChange = (newLimit) => {
    const limit = Number(newLimit);
    setPagination((prev) => ({ ...prev, limit, page_no: 1 }));
    fetchCampaigns(1, limit, statusFilter);
  };

  const runDelete = async () => {
    if (!confirmRow?.campaign_id) return;
    setDeletingId(confirmRow.campaign_id);
    try {
      const res = await whatsappApi.deleteCampaign({
        campaign_id: confirmRow.campaign_id,
      });
      toast.success(res?.msg || res?.message || "Campaign deleted");
      setConfirmRow(null);
      fetchCampaigns(pagination.page_no, pagination.limit, statusFilter);
    } catch (error) {
      toast.error(extractApiError(error, "Failed to delete campaign"));
    } finally {
      setDeletingId(null);
    }
  };

  const selectedStatus =
    STATUS_OPTIONS.find((o) => o.value === statusFilter) || STATUS_OPTIONS[0];
  const indexOffset = (pagination.page_no - 1) * pagination.limit;

  const getActionItems = (row) => [
    {
      label: "View",
      icon: FiEye,
      onClick: () =>
        navigate(`/broadcast/whatsapp/onechatting/campaigns/${row.campaign_id}`),
    },
    {
      label: "Delete",
      icon: FiTrash2,
      danger: true,
      disabled: deletingId === row.campaign_id,
      onClick: () => setConfirmRow(row),
    },
  ];

  if (!check("broadcast_send")) {
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
              You do not have permission to view campaigns.
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
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <FiLayers className="w-4 h-4 text-green-600" />
                </div>
                <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight truncate">
                  Campaigns
                </h1>
              </div>

              <div className="flex items-center gap-2 ml-auto min-w-0 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                <div className="w-full sm:w-44 shrink-0">
                  <CustomSelect
                    options={STATUS_OPTIONS}
                    value={selectedStatus}
                    onChange={(option) =>
                      setStatusFilter(option?.value || "all")
                    }
                    placeholder="All statuses"
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    fetchCampaigns(
                      pagination.page_no,
                      pagination.limit,
                      statusFilter,
                    )
                  }
                  disabled={loading}
                  className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 shrink-0"
                  title="Refresh"
                >
                  <FiRefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/broadcast/whatsapp/onechatting/campaigns/create",
                    )
                  }
                  className={`${TOOLBAR_BTN} inline-flex items-center gap-1.5 text-white bg-green-600 hover:bg-green-700 shrink-0`}
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  Create campaign
                </button>
              </div>
            </div>

            {loading ? (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full table-fixed min-w-[860px]">
                  <thead>
                    <tr className={TABLE_HEAD_ROW}>
                      <th className={`${TABLE_TH} w-12`}>#</th>
                      <th className={`${TABLE_TH} w-[22%]`}>Campaign</th>
                      <th className={`${TABLE_TH} w-[14%]`}>Status</th>
                      <th className={`${TABLE_TH} w-[18%]`}>Template</th>
                      <th className={`${TABLE_TH} w-[16%]`}>Schedule</th>
                      <th className={`${TABLE_TH} w-[18%]`}>Recipients</th>
                      <th className={`${TABLE_TH} w-16 text-center`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : rows.length === 0 ? (
              <div className={EMPTY_WRAP}>
                <div className={EMPTY_ICON_WRAP}>
                  <FiLayers className="w-5 h-5 text-gray-400" />
                </div>
                <p className={EMPTY_TITLE}>No campaigns found</p>
                <p className={EMPTY_SUBTITLE}>
                  Create a campaign to send WhatsApp templates in bulk
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full table-fixed min-w-[860px]">
                    <thead>
                      <tr className={TABLE_HEAD_ROW}>
                        <th className={`${TABLE_TH} w-12`}>#</th>
                        <th className={`${TABLE_TH} w-[22%]`}>Campaign</th>
                        <th className={`${TABLE_TH} w-[14%]`}>Status</th>
                        <th className={`${TABLE_TH} w-[18%]`}>Template</th>
                        <th className={`${TABLE_TH} w-[16%]`}>Schedule</th>
                        <th className={`${TABLE_TH} w-[18%]`}>Recipients</th>
                        <th className={`${TABLE_TH} w-16 text-center`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr
                          key={row.campaign_id}
                          className={`${TABLE_ROW} cursor-pointer`}
                          onClick={() =>
                            navigate(
                              `/broadcast/whatsapp/onechatting/campaigns/${row.campaign_id}`,
                            )
                          }
                        >
                          <td className={`${TABLE_TD} ${CELL_INDEX}`}>
                            {indexOffset + idx + 1}
                          </td>
                          <td className={TABLE_TD}>
                            <p className={`${CELL_TITLE} truncate`}>
                              {row.name || "—"}
                            </p>
                            <p className={`${CELL_META} mt-0.5 truncate`}>
                              {row.campaign_id}
                            </p>
                          </td>
                          <td className={TABLE_TD}>
                            <CampaignStatusBadge status={row.status} />
                          </td>
                          <td className={TABLE_TD}>
                            <p className={`${CELL_BODY} truncate`}>
                              {row.template?.template_name || "—"}
                            </p>
                          </td>
                          <td className={TABLE_TD}>
                            <p
                              className={
                                row.schedule_date ? CELL_BODY : CELL_EMPTY
                              }
                            >
                              {row.schedule_date || "—"}
                            </p>
                          </td>
                          <td className={TABLE_TD}>
                            {row.entry_complete && row.recipients ? (
                              <p className={CELL_BODY}>
                                {row.recipients.sent ?? 0}/
                                {row.recipients.total ?? 0} sent
                              </p>
                            ) : (
                              <p className={CELL_EMPTY}>Preparing…</p>
                            )}
                          </td>
                          <td
                            className={`${TABLE_TD} text-center`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {deletingId === row.campaign_id ? (
                              <FiLoader className="w-4 h-4 animate-spin text-gray-400 inline-block" />
                            ) : (
                              <ActionMenu items={getActionItems(row)} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-100">
                  {rows.map((row, idx) => (
                    <div key={row.campaign_id} className="p-3 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="min-w-0 flex gap-2 flex-1 text-left"
                          onClick={() =>
                            navigate(
                              `/broadcast/whatsapp/onechatting/campaigns/${row.campaign_id}`,
                            )
                          }
                        >
                          <span className={`${CELL_INDEX} shrink-0 pt-0.5`}>
                            {indexOffset + idx + 1}.
                          </span>
                          <div className="min-w-0">
                            <p className={`${CELL_MOBILE_TITLE} truncate`}>
                              {row.name || "—"}
                            </p>
                            <p className={`${CELL_META} truncate mt-0.5`}>
                              {row.template?.template_name || "—"}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <CampaignStatusBadge status={row.status} />
                          <ActionMenu items={getActionItems(row)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <TablePagination
                  page={pagination.page_no}
                  limit={pagination.limit}
                  total={pagination.total}
                  totalPages={pagination.total_pages}
                  isLastPage={
                    !pagination.has_more &&
                    pagination.page_no >= pagination.total_pages
                  }
                  rowOptions={[10, 20, 50, 100]}
                  defaultRows={20}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(confirmRow)}
        loading={Boolean(deletingId)}
        onCancel={() => !deletingId && setConfirmRow(null)}
        onConfirm={runDelete}
        icon={FiAlertTriangle}
        title="Delete campaign"
        heading="Delete this campaign?"
        message={`“${confirmRow?.name || "This campaign"}” will be soft-deleted and removed from the list.`}
        confirmLabel={deletingId ? "Deleting…" : "Delete"}
        tone="danger"
      />
    </div>
  );
};

export default OneChattingCampaigns;
