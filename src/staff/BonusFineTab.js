import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
  FiRefreshCw,
    FiTrendingUp,
    FiTrendingDown,
  FiMoreVertical,
} from "react-icons/fi";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import TablePagination from "../components/TablePagination";
import { formatMonthLabel } from "../components/PortalMonthPicker";
import BonusFineModal from "../components/Modals/BonusFineModal";

const sk = "animate-pulse rounded bg-slate-200/80";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;

/** DD/MM/YYYY */
const formatDate = (value) => {
  if (!value) return "—";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const COLS = {
  index: "5%",
  date: "12%",
  month: "12%",
  type: "10%",
  amount: "12%",
  remark: "20%",
  createdBy: "19%",
  actions: "10%",
};

const TABLE_HEADERS = [
  { key: "index", label: "#", align: "left", width: COLS.index },
  { key: "date", label: "Date", align: "left", width: COLS.date },
  { key: "month", label: "Month", align: "left", width: COLS.month },
  { key: "type", label: "Type", align: "left", width: COLS.type },
  { key: "amount", label: "Amount", align: "right", width: COLS.amount },
  { key: "remark", label: "Remark", align: "left", width: COLS.remark },
  { key: "createdBy", label: "Created by", align: "left", width: COLS.createdBy },
  { key: "actions", label: "Actions", align: "right", width: COLS.actions },
];

function TableHead() {
  return (
    <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
      <tr>
        {TABLE_HEADERS.map((h) => (
          <th
            key={h.key}
            style={{ width: h.width }}
            className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-700 ${
              h.align === "right" ? "text-right" : "text-left"
            }`}
          >
            {h.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TableSkeleton({ rows = 8 }) {
  return (
    <div className="overflow-x-auto" aria-busy="true">
      <table className="min-w-full table-fixed text-left text-sm font-sans">
        <TableHead />
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="px-3 py-2.5">
                <div className={`${sk} h-3.5 w-6`} />
              </td>
              <td className="px-3 py-2.5">
                <div className={`${sk} h-3.5 w-20`} />
              </td>
              <td className="px-3 py-2.5">
                <div className={`${sk} h-3.5 w-20`} />
              </td>
              <td className="px-3 py-2.5">
                <div className={`${sk} h-6 w-14 rounded-full`} />
              </td>
              <td className="px-3 py-2.5">
                <div className={`${sk} ml-auto h-5 w-16 rounded`} />
              </td>
              <td className="px-3 py-2.5">
                <div className={`${sk} h-3.5 w-28 max-w-full`} />
              </td>
              <td className="px-3 py-2.5">
                <div className="space-y-1.5">
                  <div className={`${sk} h-3.5 w-24`} />
                  <div className={`${sk} h-3 w-20`} />
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className={`${sk} ml-auto h-7 w-7 rounded-lg`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const BonusFineTab = ({ username: usernameProp, variants, setBonusFine }) => {
  const username = usernameProp || "";
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showActionMenu, setShowActionMenu] = useState(null);
  const [menuEntry, setMenuEntry] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const actionAnchorRef = useRef(null);

  const fetchList = useCallback(async () => {
    if (!username) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/salary/bonus-fine/list?username=${encodeURIComponent(
        username,
      )}`;
      if (filterType === "bonus" || filterType === "fine") {
        url += `&type=${filterType}`;
      }
      const response = await fetch(url, {
        method: "GET",
        headers: getHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load bonus/fine");
      }
      const list = data.data?.entries || [];
      setEntries(list);
      setPage(1);
      if (typeof setBonusFine === "function") setBonusFine(list);
    } catch (err) {
      setEntries([]);
      toast.error(err.message || "Failed to load bonus/fine");
        } finally {
            setLoading(false);
        }
  }, [username, filterType, setBonusFine]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil(entries.length / limit) || 1);
  const paged = useMemo(() => {
    const start = (page - 1) * limit;
    return entries.slice(start, start + limit);
  }, [entries, page, limit]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const computeActionMenuPosition = useCallback((anchorEl, itemCount = 2) => {
    if (!anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = 8 + itemCount * 36;
    const gap = 8;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const space = {
      top: rect.top - margin,
      bottom: vh - rect.bottom - margin,
      right: vw - rect.right - margin,
      left: rect.left - margin,
    };

    const fits = {
      top: space.top >= menuHeight + gap,
      bottom: space.bottom >= menuHeight + gap,
      right: space.right >= menuWidth + gap,
      left: space.left >= menuWidth + gap,
    };

    const preferred = ["top", "bottom", "right", "left"];
    let placement = preferred.find((p) => fits[p]);
    if (!placement) {
      placement = preferred.reduce(
        (best, p) => (space[p] > space[best] ? p : best),
        "bottom",
      );
    }

    let top = 0;
    let left = 0;

    if (placement === "top") {
      top = rect.top - menuHeight - gap;
      left = rect.left + rect.width / 2 - menuWidth / 2;
    } else if (placement === "bottom") {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - menuWidth / 2;
    } else if (placement === "right") {
      top = rect.top + rect.height / 2 - menuHeight / 2;
      left = rect.right + gap;
    } else {
      top = rect.top + rect.height / 2 - menuHeight / 2;
      left = rect.left - menuWidth - gap;
    }

    const clampedLeft = Math.max(margin, Math.min(left, vw - menuWidth - margin));
    const clampedTop = Math.max(margin, Math.min(top, vh - menuHeight - margin));
    const anchorCenterX = rect.left + rect.width / 2;
    const anchorCenterY = rect.top + rect.height / 2;

    return {
      top: clampedTop,
      left: clampedLeft,
      placement,
      arrowX: Math.max(12, Math.min(menuWidth - 12, anchorCenterX - clampedLeft)),
      arrowY: Math.max(12, Math.min(menuHeight - 12, anchorCenterY - clampedTop)),
    };
  }, []);

  const closeActionMenu = useCallback(() => {
    setShowActionMenu(null);
    actionAnchorRef.current = null;
  }, []);

  useEffect(() => {
    if (!showActionMenu || !actionAnchorRef.current) return undefined;

    const updatePosition = () => {
      setActionMenuPosition(
        computeActionMenuPosition(actionAnchorRef.current, 2),
      );
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") closeActionMenu();
    };

    const handleOutside = (e) => {
      if (
        actionAnchorRef.current?.contains(e.target) ||
        e.target.closest?.("[data-bonus-fine-action-menu]")
      ) {
            return;
        }
      closeActionMenu();
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleOutside);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [showActionMenu, computeActionMenuPosition, closeActionMenu]);

  const toggleActionMenu = (e, row) => {
    e.stopPropagation();
    const willOpen = showActionMenu !== row.entry_id;
    if (willOpen) {
      actionAnchorRef.current = e.currentTarget;
      setMenuEntry(row);
      setShowActionMenu(row.entry_id);
      setActionMenuPosition(computeActionMenuPosition(e.currentTarget, 2));
            return;
        }
    closeActionMenu();
  };

  const openCreate = () => {
    closeActionMenu();
    setSelected(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (row) => {
    closeActionMenu();
    setSelected(row);
    setModalMode("edit");
    setModalOpen(true);
  };

  const openDelete = (row) => {
    closeActionMenu();
    setSelected(row);
    setModalMode("delete");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setSelected(null);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    const loadingToast = toast.loading(
      modalMode === "edit" ? "Updating…" : "Saving…",
    );
    try {
      const url =
        modalMode === "edit"
          ? `${API_BASE_URL}/salary/bonus-fine/update`
          : `${API_BASE_URL}/salary/bonus-fine/create`;
      const body =
        modalMode === "edit"
          ? {
              entry_id: payload.entry_id,
              type: payload.type,
              month: payload.month,
              year: payload.year,
              amount: payload.amount,
              remark: payload.remark,
            }
          : {
              username: payload.username,
              type: payload.type,
              month: payload.month,
              year: payload.year,
              amount: payload.amount,
              remark: payload.remark,
            };
      const response = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save");
      }
      toast.success(data.message || "Saved", { id: loadingToast });
      setModalOpen(false);
      setSelected(null);
      await fetchList();
    } catch (err) {
      toast.error(err.message || "Failed to save", { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!row?.entry_id) return;
    setSaving(true);
    const loadingToast = toast.loading("Deleting…");
    try {
      const response = await fetch(`${API_BASE_URL}/salary/bonus-fine/delete`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ entry_id: row.entry_id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete");
      }
      toast.success("Deleted", { id: loadingToast });
      setModalOpen(false);
      setSelected(null);
      await fetchList();
    } catch (err) {
      toast.error(err.message || "Failed to delete", { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const serialBase = (page - 1) * limit;
  const showMenu =
    Boolean(showActionMenu) && Boolean(menuEntry) && Boolean(actionMenuPosition);

    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base md:text-lg font-bold text-gray-800 m-0">
          Bonus / Fine
        </h2>
        <div className="flex items-center gap-2">
                            <button
            type="button"
            onClick={fetchList}
            disabled={!username || loading}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
                            </button>
                            <button
            type="button"
            onClick={openCreate}
            disabled={!username}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <FiPlus className="w-3.5 h-3.5" />
            Add
                            </button>
        </div>
      </div>

      {!username ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Staff username is missing.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: "All" },
          { id: "bonus", label: "Bonus" },
          { id: "fine", label: "Fine" },
        ].map((f) => (
                            <button
            key={f.id}
            type="button"
            onClick={() => setFilterType(f.id)}
            className={`h-8 rounded-lg px-3 text-xs font-semibold border transition ${
              filterType === f.id
                ? "border-teal-300 bg-teal-50 text-teal-800"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
                            </button>
        ))}
                        </div>
                        
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <TableSkeleton rows={Math.min(limit, 8)} />
        ) : entries.length === 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-left text-sm font-sans">
                <TableHead />
                <tbody>
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-sm text-gray-500"
                    >
                      No bonus or fine yet
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page}
              limit={limit}
              total={0}
              totalPages={1}
              defaultRows={20}
              rowOptions={[5, 10, 20, 50, 100]}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </>
        ) : (
          <>
                    <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-left text-sm font-sans">
                <TableHead />
                <tbody>
                  {paged.map((row, idx) => (
                    <tr
                      key={row.entry_id}
                      className="border-b border-gray-100 bg-white hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-[11px] font-bold text-gray-800 tabular-nums">
                        {serialBase + idx + 1}
                                            </td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-700 tabular-nums">
                        {formatDate(row.create_date)}
                                            </td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-700">
                        {row.month_name
                          ? `${row.month_name} ${row.year}`
                          : formatMonthLabel(row) || "—"}
                                            </td>
                      <td className="px-3 py-2.5">
                        {row.type === "bonus" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            <FiTrendingUp className="w-3 h-3" />
                            Bonus
                                                </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
                            <FiTrendingDown className="w-3 h-3" />
                            Fine
                                                </span>
                        )}
                                            </td>
                      <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-gray-800">
                        {formatCurrency(row.amount)}
                                            </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 truncate">
                        {row.remark || (
                          <span className="text-gray-400">—</span>
                        )}
                                            </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 min-w-0">
                        {row.create_by_name || row.create_by_mobile ? (
                          <div className="flex flex-col items-start gap-0.5 min-w-0">
                            <span className="font-medium text-gray-800 truncate max-w-full">
                              {row.create_by_name || "—"}
                            </span>
                            <span className="text-xs text-gray-500 tabular-nums truncate max-w-full">
                              {row.create_by_mobile
                                ? row.create_by_country_code
                                  ? `+${row.create_by_country_code} ${row.create_by_mobile}`
                                  : row.create_by_mobile
                                : "—"}
                                                    </span>
                          </div>
                                                ) : (
                          <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                      <td className="px-3 py-2.5 text-right">
                                                    <button
                          type="button"
                          onClick={(e) => toggleActionMenu(e, row)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                          aria-label="Actions"
                          aria-expanded={showActionMenu === row.entry_id}
                        >
                          <FiMoreVertical className="w-4 h-4" />
                                                    </button>
                                            </td>
                                        </tr>
                  ))}
                            </tbody>
                        </table>
                    </div>
            <TablePagination
              page={page}
              limit={limit}
              total={entries.length}
              totalPages={totalPages}
              defaultRows={20}
              rowOptions={[5, 10, 20, 50, 100]}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </>
                )}
            </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence
            onExitComplete={() => {
              if (!showActionMenu) {
                setMenuEntry(null);
                setActionMenuPosition(null);
              }
            }}
          >
            {showMenu ? (
                        <motion.div
                key="bonus-fine-action-menu"
                data-bonus-fine-action-menu
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                className="fixed z-[99999] w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                style={{
                  top: actionMenuPosition.top,
                  left: actionMenuPosition.left,
                  height: "auto",
                }}
                            onClick={(e) => e.stopPropagation()}
                        >
                <span
                  className="absolute h-2.5 w-2.5 rotate-45 border-slate-200 bg-white"
                  style={{
                    left:
                      actionMenuPosition.placement === "left" ||
                      actionMenuPosition.placement === "right"
                        ? undefined
                        : `${actionMenuPosition.arrowX - 5}px`,
                    top:
                      actionMenuPosition.placement === "bottom"
                        ? "-5px"
                        : actionMenuPosition.placement === "top"
                          ? undefined
                          : `${actionMenuPosition.arrowY - 5}px`,
                    bottom:
                      actionMenuPosition.placement === "top"
                        ? "-5px"
                        : undefined,
                    right:
                      actionMenuPosition.placement === "left"
                        ? "-5px"
                        : undefined,
                    borderTopWidth:
                      actionMenuPosition.placement === "bottom" ? "1px" : "0",
                    borderLeftWidth:
                      actionMenuPosition.placement === "bottom" ||
                      actionMenuPosition.placement === "right"
                        ? "1px"
                        : "0",
                    borderBottomWidth:
                      actionMenuPosition.placement === "top" ? "1px" : "0",
                    borderRightWidth:
                      actionMenuPosition.placement === "left" ? "1px" : "0",
                  }}
                />
                                    <button
                  type="button"
                  onClick={() => openEdit(menuEntry)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50"
                                    >
                  <FiEdit2 className="h-4 w-4 text-blue-600" />
                  Edit
                                    </button>
                                    <button
                  type="button"
                  onClick={() => openDelete(menuEntry)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-rose-700 transition-colors hover:bg-rose-50"
                >
                  <FiTrash2 className="h-4 w-4 text-rose-600" />
                  Delete
                                    </button>
                        </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}

      <BonusFineModal
        isOpen={modalOpen}
        mode={modalMode}
        entry={selected}
        username={username}
        saving={saving}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onConfirmDelete={handleDelete}
      />
        </motion.div>
    );
};

export default BonusFineTab;
