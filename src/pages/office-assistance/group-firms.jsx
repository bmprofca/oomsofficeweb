import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  FiPlus,
  FiEye,
  FiTrash2,
  FiSearch,
  FiRefreshCw,
  FiUsers,
  FiMoreVertical,
  FiUpload,
  FiPhone,
  FiMail,
} from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Header, Sidebar } from "../../components/header";
import TablePagination from "../../components/TablePagination";
import { ViewportTooltip } from "../../components/ViewportTooltip";
import FirmsDetailsModal from "../../components/Modals/FirmsDetailsModal";
import {
  GroupFirmsAddModal,
  GroupFirmsDeleteModal,
  GroupFirmsBulkDeleteModal,
} from "../../components/Modals/GroupFirmsModals";
import BulkImportFirmsModal from "../../components/Modals/BulkImportFirmsModal";
import getHeaders from "../../utils/get-headers";
import API_BASE_URL from "../../utils/api-controller";
import { useUserPermissions } from "../../utils/permission-helper";

/** Task-table typography baseline — see context/typography.md */
const TABLE_HEAD_ROW =
  "bg-gradient-to-r from-gray-50 to-white border-b border-gray-200";
const TABLE_TH =
  "px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const TABLE_ROW =
  "border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors group";
const TABLE_TD = "px-3 py-3 min-w-0 text-left align-middle";
const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gray-50";
const TOOLBAR_INPUT =
  "w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-gray-400";
const CELL_BODY = "text-sm font-medium text-gray-700";
const CELL_INDEX = "text-[11px] font-bold text-gray-800";
const CELL_TITLE =
  "font-semibold text-gray-800 text-sm hover:text-indigo-600 transition-colors";
const CELL_META = "text-xs text-gray-400";

const COL_COUNT = 7;

const formatBalance = (balance, canViewFees) => {
  if (!canViewFees) {
    return <span className="blur-[3.5px] select-none">₹99,999</span>;
  }
  const amount = Number(balance || 0);
  return `${amount < 0 ? "-" : ""}₹${Math.abs(amount).toLocaleString()}`;
};

const SkeletonRow = ({ cols = COL_COUNT }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-3 py-3">
        <div
          className="h-3.5 bg-gray-200 rounded-full"
          style={{ width: `${55 + (i % 3) * 18}px` }}
        />
      </td>
    ))}
  </tr>
);

/** Same animated checkbox as TaskTable.js */
const AnimatedCheckbox = ({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate, checked]);

  const isActive = checked || indeterminate;

  return (
    <label className="relative inline-flex items-center cursor-pointer group">
      <input
        ref={inputRef}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
      />
      <motion.span
        className={`flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border-2 transition-colors duration-200 ${
          isActive
            ? "bg-indigo-600 border-indigo-600 shadow-sm shadow-indigo-200"
            : "bg-white border-gray-300 group-hover:border-indigo-400"
        }`}
        animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}
        transition={{ duration: 0.18 }}
      >
        <AnimatePresence initial={false} mode="wait">
          {indeterminate ? (
            <motion.span
              key="dash"
              className="block w-2 h-0.5 bg-white rounded-full"
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.4 }}
              transition={{ duration: 0.12 }}
            />
          ) : checked ? (
            <motion.svg
              key="check"
              viewBox="0 0 12 12"
              className="w-3 h-3 text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <path
                d="M2.5 6l2.2 2.2 4.8-4.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          ) : null}
        </AnimatePresence>
      </motion.span>
    </label>
  );
};

const MENU_Z = 99999;
const MENU_GAP = 8;
const MENU_PAD = 8;


/* ─── 3-dot action menu (portal · tooltip.md) ──────────────────── */
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
    const mH = menu?.offsetHeight || 140;
    const mW = menu?.offsetWidth || 144;
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
      <ViewportTooltip label="Actions">
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
          <FiMoreVertical className="w-3.5 h-3.5" />
        </button>
      </ViewportTooltip>

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
                className="w-36 bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden"
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
                    {item.icon}
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

const GroupFirms = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const canViewFees = check("task_fees_view");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sidebarMinimized")) || false;
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firms, setFirms] = useState([]);
  const [groupDetails, setGroupDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [firmToDelete, setFirmToDelete] = useState(null);
  const [selectedFirms, setSelectedFirms] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);

  const searchTimer = useRef(null);
  const abortRef = useRef(null);
  const pageRef = useRef(page);
  const limitRef = useRef(limit);
  const searchRef = useRef(searchTerm);
  const selectAllAcrossPagesRef = useRef(false);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);
  useEffect(() => {
    searchRef.current = searchTerm;
  }, [searchTerm]);
  useEffect(() => {
    selectAllAcrossPagesRef.current = selectAllAcrossPages;
  }, [selectAllAcrossPages]);

  useEffect(() => {
    if (selectAllAcrossPages) {
      setSelectAll(true);
      return;
    }
    setSelectAll(
      firms.length > 0 && firms.every((f) => selectedFirms.includes(f.firm_id)),
    );
  }, [firms, selectedFirms, selectAllAcrossPages]);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [mobileMenuOpen]);


  const mapFirm = (firmData) => {
    const f = firmData.firm || {};
    const isActive = f.is_active === true || String(f.status) === "1";
    return {
      firm_id: f.firm_id,
      name: f.firm_name || "—",
      gstin: f.gst || "",
      file_no: f.file_no || "",
      status: isActive ? "active" : "inactive",
      created_date: firmData.create_date || null,
      modify_date: firmData.modify_date || null,
      unique_id: firmData.unique_id,
      create_by: firmData.create_by || null,
      modify_by: firmData.modify_by || null,
      firm_type: f.firm_type || "",
      pan: f.pan || "",
      username: f.username || firmData.client?.username || "",
      client_name: firmData.client?.name || "",
      care_of: firmData.client?.care_of || "",
      guardian_name: firmData.client?.guardian_name || "",
      mobile: firmData.client?.mobile || "",
      email: firmData.client?.email || "",
      country_code: firmData.client?.country_code || "",
      balance: Number(firmData.client?.balance) || 0,
      /** Shape expected by FirmsDetailsModal / FirmViewDetails */
      modalFirm: {
        firm_id: f.firm_id,
        firm_name: f.firm_name,
        firm_type: f.firm_type,
        username: f.username,
        status: isActive,
        file_no: f.file_no,
        pan: f.pan,
        gst: f.gst,
        tan: f.tan,
        vat: f.vat,
        cin: f.cin,
        create_date: firmData.create_date,
        modify_date: firmData.modify_date,
        create_by: firmData.create_by,
        modify_by: firmData.modify_by,
        address: {
          address_line_1: f.address_line_1,
          address_line_2: f.address_line_2,
          city: f.city,
          district: f.district,
          state: f.state,
          country: f.country,
          pincode: f.pincode,
        },
      },
    };
  };

  const fetchGroupFirms = useCallback(
    async ({ search = "", pageNo = 1, pageLimit = 20 } = {}) => {
      if (!groupId) return;

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/group/group-firms/list`,
          {
            headers: getHeaders(),
            signal: controller.signal,
            params: {
              group_id: groupId,
              page: String(pageNo),
              limit: String(pageLimit),
              ...(search.trim() ? { search: search.trim() } : {}),
            },
          },
        );

        if (response.data?.success) {
          const groupData = response.data.data?.group || null;
          const rows = Array.isArray(response.data.data?.firms)
            ? response.data.data.firms.map(mapFirm)
            : [];
          const pagination = response.data.pagination || {};

          setGroupDetails(groupData);
          setFirms(rows);
          setTotal(Number(pagination.total) || rows.length);
          setTotalPages(
            Math.max(
              1,
              Number(pagination.total_pages) ||
                Math.ceil(
                  (Number(pagination.total) || rows.length) / pageLimit,
                ) ||
                1,
            ),
          );
          setPage(Number(pagination.page) || pageNo);
        } else {
          setFirms([]);
          setTotal(0);
          setTotalPages(1);
          toast.error(response.data?.message || "Failed to load firms");
        }
      } catch (error) {
        if (
          axios.isCancel?.(error) ||
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError" ||
          error?.name === "AbortError"
        ) {
          return;
        }
        setFirms([]);
        setTotal(0);
        setTotalPages(1);
        toast.error(error.response?.data?.message || "Error loading firms");
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [groupId],
  );

  useEffect(() => {
    if (!groupId) {
      navigate("/staff/office-assistance/groups", { replace: true });
      return undefined;
    }
    fetchGroupFirms({ search: "", pageNo: 1, pageLimit: limit });
    return () => {
      if (abortRef.current) abortRef.current.abort();
      clearTimeout(searchTimer.current);
    };
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const clearSelection = () => {
    setSelectedFirms([]);
    setSelectAll(false);
    setSelectAllAcrossPages(false);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setLoading(true);
    setPage(1);
    clearSelection();
    if (abortRef.current) abortRef.current.abort();
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchGroupFirms({
        search: value,
        pageNo: 1,
        pageLimit: limitRef.current,
      });
    }, 400);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    fetchGroupFirms({
      search: searchRef.current,
      pageNo: nextPage,
      pageLimit: limitRef.current,
    });
  };

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
    fetchGroupFirms({
      search: searchRef.current,
      pageNo: 1,
      pageLimit: nextLimit,
    });
  };

  const handleRefresh = () => {
    fetchGroupFirms({
      search: searchRef.current,
      pageNo: pageRef.current,
      pageLimit: limitRef.current,
    });
  };

  const handleCreateSubmit = async (validFirmIds) => {
    if (!Array.isArray(validFirmIds) || validFirmIds.length === 0) {
      toast.error("Select at least one firm");
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/group/group-firms/add-firms`,
        { group_id: groupId, firm_ids: validFirmIds },
        { headers: getHeaders() },
      );
      if (response.data?.success) {
        toast.success(response.data.message || "Firms added");
        setShowCreateModal(false);
        fetchGroupFirms({
          search: searchRef.current,
          pageNo: 1,
          pageLimit: limitRef.current,
        });
      } else {
        toast.error(response.data?.message || "Failed to add firms");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding firms");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!firmToDelete?.firm_id) return;
    setSaving(true);
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/group/group-firms/remove`,
        {
          headers: getHeaders(),
          data: { group_id: groupId, firm_ids: [firmToDelete.firm_id] },
        },
      );
      if (response.data?.success) {
        toast.success(response.data.message || "Firm removed");
        setFirmToDelete(null);
        const nextPage =
          firms.length <= 1 && pageRef.current > 1
            ? pageRef.current - 1
            : pageRef.current;
        fetchGroupFirms({
          search: searchRef.current,
          pageNo: nextPage,
          pageLimit: limitRef.current,
        });
      } else {
        toast.error(response.data?.message || "Failed to remove firm");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error removing firm");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectAllAcrossPages && selectedFirms.length === 0) return;
    setSaving(true);
    try {
      const payload = selectAllAcrossPages
        ? {
            group_id: groupId,
            is_all: true,
            ...(searchRef.current.trim()
              ? { search: searchRef.current.trim() }
              : {}),
          }
        : { group_id: groupId, firm_ids: selectedFirms };

      const response = await axios.delete(
        `${API_BASE_URL}/group/group-firms/remove`,
        {
          headers: getHeaders(),
          data: payload,
        },
      );
      if (response.data?.success) {
        toast.success(response.data.message || "Firms removed");
        setShowBulkDeleteModal(false);
        clearSelection();
        fetchGroupFirms({
          search: searchRef.current,
          pageNo: 1,
          pageLimit: limitRef.current,
        });
      } else {
        toast.error(response.data?.message || "Bulk delete failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error removing firms");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    if (checked) {
      setSelectedFirms(firms.map((f) => f.firm_id).filter(Boolean));
      setSelectAll(true);
    } else {
      setSelectedFirms([]);
      setSelectAll(false);
    }
    setSelectAllAcrossPages(false);
  };

  const handleSelectFirm = (firmId) => (e) => {
    const nextChecked = e.target.checked;
    const pageIds = firms.map((f) => f.firm_id).filter(Boolean);
    let base = selectAllAcrossPages ? pageIds : selectedFirms;

    if (selectAllAcrossPages) setSelectAllAcrossPages(false);

    if (nextChecked) {
      base = base.includes(firmId) ? base : [...base, firmId];
    } else {
      base = base.filter((id) => id !== firmId);
    }
    setSelectedFirms(base);
    setSelectAll(
      pageIds.length > 0 && pageIds.every((id) => base.includes(id)),
    );
  };

  const indexOffset = (page - 1) * limit;
  const groupName = groupDetails?.group_name || "Group Firms";
  const pageFirmIds = firms.map((f) => f.firm_id).filter(Boolean);
  const effectiveSelectedIds = selectAllAcrossPages
    ? pageFirmIds
    : selectedFirms;
  const selectedCount = selectAllAcrossPages ? total : selectedFirms.length;
  const headerChecked = selectAllAcrossPages || selectAll;
  const headerIndeterminate =
    !selectAllAcrossPages &&
    selectedFirms.length > 0 &&
    selectedFirms.length < firms.length;

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
        className={`pt-16 transition-all duration-300 ease-in-out ${
          isMinimized ? "md:pl-20" : "md:pl-[260px]"
        }`}
      >
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className={`${TOOLBAR_ROW} flex-nowrap`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <FiUsers className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-gray-800 leading-tight truncate max-w-[10rem] sm:max-w-[16rem] md:max-w-xs">
                    {groupName}
                  </h1>
                  {groupDetails?.group_remark ? (
                    <p className="text-[11px] text-gray-500 truncate max-w-[10rem] sm:max-w-[16rem] md:max-w-xs">
                      {groupDetails.group_remark}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-auto min-w-0">
                {selectedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shrink-0"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      Delete ({selectedCount.toLocaleString()})
                    </span>
                  </button>
                ) : null}
                <div className="relative w-32 sm:w-44 md:w-56 min-w-0">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search firms…"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className={TOOLBAR_INPUT}
                  />
                </div>
                <ViewportTooltip label="Refresh">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-gray-300 bg-white"
                    aria-label="Refresh"
                  >
                    <FiRefreshCw
                      className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                </ViewportTooltip>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                >
                  <FiUpload className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Bulk Import</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shrink-0"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Firms</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>
            </div>

            {selectAll && total > firms.length ? (
              <div className="border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs text-indigo-800">
                {selectAllAcrossPages ? (
                  <>
                    All {total.toLocaleString()} firms are selected.{" "}
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="font-semibold underline hover:text-indigo-950"
                    >
                      Clear selection
                    </button>
                  </>
                ) : (
                  <>
                    All {firms.length.toLocaleString()} firms on this page are
                    selected.{" "}
                    <button
                      type="button"
                      onClick={() => setSelectAllAcrossPages(true)}
                      className="font-semibold underline hover:text-indigo-950"
                    >
                      Select all {total.toLocaleString()} firms
                    </button>
                  </>
                )}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[820px]">
                <thead>
                  <tr className={TABLE_HEAD_ROW}>
                    <th className={`${TABLE_TH} w-10`}>
                      <AnimatedCheckbox
                        checked={headerChecked}
                        indeterminate={headerIndeterminate}
                        onChange={handleSelectAll}
                        ariaLabel="Select all firms"
                      />
                    </th>
                    <th className={`${TABLE_TH} w-12`}>#</th>
                    <th className={`${TABLE_TH} w-[24%]`}>Firm</th>
                    <th className={`${TABLE_TH} w-[22%]`}>Client</th>
                    <th className={`${TABLE_TH} w-[20%]`}>Contact</th>
                    <th className={`${TABLE_TH} w-28`}>Balance</th>
                    <th className={`${TABLE_TH} w-24`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                      <SkeletonRow key={`skel-${i}`} />
                    ))
                  ) : firms.length === 0 ? (
                    <tr>
                      <td colSpan={COL_COUNT}>
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 px-4">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                            <FiUsers className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">
                            No firms found
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {searchTerm.trim()
                              ? "Try a different search term"
                              : "Add firms to this group to get started"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    firms.map((firm, index) => (
                      <tr key={firm.firm_id} className={TABLE_ROW}>
                        <td className={TABLE_TD}>
                          <AnimatedCheckbox
                            checked={
                              selectAllAcrossPages ||
                              effectiveSelectedIds.includes(firm.firm_id)
                            }
                            onChange={handleSelectFirm(firm.firm_id)}
                            ariaLabel={`Select ${firm.name}`}
                          />
                        </td>
                        <td className={TABLE_TD}>
                          <span className={CELL_INDEX}>
                            {indexOffset + index + 1}
                          </span>
                        </td>
                        <td className={TABLE_TD}>
                          <div className="min-w-0 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFirm(firm);
                                setShowViewModal(true);
                              }}
                              className={`${CELL_TITLE} text-left truncate block max-w-full`}
                              title={firm.name || undefined}
                            >
                              {firm.name || "—"}
                            </button>
                            <div
                              className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${CELL_META}`}
                            >
                              <span className="font-mono truncate">
                                PAN: {firm.pan || "—"}
                              </span>
                              <span className="text-gray-300">·</span>
                              <span className="truncate">
                                File: {firm.file_no || "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className={TABLE_TD}>
                          <div className="min-w-0 overflow-hidden">
                            {firm.username ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/client/profile/${encodeURIComponent(firm.username)}`,
                                  )
                                }
                                className={`${CELL_TITLE} text-left truncate block max-w-full`}
                                title={firm.client_name || firm.username}
                              >
                                {firm.client_name || "—"}
                              </button>
                            ) : (
                              <p className={`${CELL_BODY} truncate`}>
                                {firm.client_name || "—"}
                              </p>
                            )}
                            <p className={`${CELL_META} mt-0.5 truncate`}>
                              {firm.guardian_name || firm.care_of
                                ? `${firm.care_of || "C/O"}: ${firm.guardian_name || "—"}`
                                : "—"}
                            </p>
                          </div>
                        </td>
                        <td className={TABLE_TD}>
                          <div className="min-w-0 overflow-hidden space-y-0.5">
                            <p
                              className={`flex items-center gap-1.5 ${CELL_BODY} truncate`}
                            >
                              <FiPhone className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">
                                {firm.mobile || "—"}
                              </span>
                            </p>
                            <p
                              className={`flex items-center gap-1.5 ${CELL_META} truncate`}
                            >
                              <FiMail className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">
                                {firm.email || "—"}
                              </span>
                            </p>
                          </div>
                        </td>
                        <td className={TABLE_TD}>
                          {firm.username ? (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/client/profile/${encodeURIComponent(firm.username)}/ledger`,
                                )
                              }
                              className={`text-xs font-semibold tabular-nums hover:underline ${
                                (firm.balance || 0) < 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                              title="View ledger"
                            >
                              {formatBalance(firm.balance, canViewFees)}
                            </button>
                          ) : (
                            <span
                              className={`text-xs font-semibold tabular-nums ${
                                (firm.balance || 0) < 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {formatBalance(firm.balance, canViewFees)}
                            </span>
                          )}
                        </td>
                        <td className={TABLE_TD}>
                          <ActionMenu
                            items={[
                              {
                                label: "View",
                                icon: <FiEye className="w-3.5 h-3.5" />,
                                onClick: () => {
                                  setSelectedFirm(firm);
                                  setShowViewModal(true);
                                },
                              },
                              {
                                label: "Delete",
                                icon: <FiTrash2 className="w-3.5 h-3.5" />,
                                danger: true,
                                onClick: () => setFirmToDelete(firm),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && total > 0 ? (
              <TablePagination
                page={page}
                limit={limit}
                total={total}
                totalPages={totalPages}
                rowOptions={[10, 20, 50, 100]}
                defaultRows={20}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
              />
            ) : null}
          </div>
        </div>
      </div>

      <GroupFirmsAddModal
        open={showCreateModal}
        saving={saving}
        excludeFirmIds={firms.map((f) => f.firm_id).filter(Boolean)}
        onClose={() => !saving && setShowCreateModal(false)}
        onCancel={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
      />

      <FirmsDetailsModal
        isOpen={showViewModal && Boolean(selectedFirm)}
        onClose={() => {
          setShowViewModal(false);
          setSelectedFirm(null);
        }}
        firms={selectedFirm?.modalFirm ? [selectedFirm.modalFirm] : []}
        clientName={selectedFirm?.client_name || ""}
      />

      <GroupFirmsDeleteModal
        firm={firmToDelete}
        saving={saving}
        onClose={() => !saving && setFirmToDelete(null)}
        onCancel={() => setFirmToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <GroupFirmsBulkDeleteModal
        open={showBulkDeleteModal}
        saving={saving}
        selectedCount={selectedCount}
        selectAllAcrossPages={selectAllAcrossPages}
        searchTerm={searchTerm}
        onClose={() => !saving && setShowBulkDeleteModal(false)}
        onCancel={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
      />

      <BulkImportFirmsModal
        open={showImportModal}
        groupId={groupId}
        onClose={() => setShowImportModal(false)}
        onImported={() => {
          fetchGroupFirms({
            search: searchRef.current,
            pageNo: 1,
            pageLimit: limitRef.current,
          });
        }}
      />
    </div>
  );
};

export default GroupFirms;
