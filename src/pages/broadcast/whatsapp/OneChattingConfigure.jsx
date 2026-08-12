import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiSearch,
  FiUsers,
  FiLoader,
  FiPower,
  FiKey,
  FiLock,
  FiRefreshCw,
  FiAlertTriangle,
  FiMoreVertical,
} from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import TablePagination from "../../../components/TablePagination";
import ConfirmActionModal from "../../../components/ConfirmActionModal";
import OneChattingTokenModal from "../../../components/Modals/OneChattingTokenModal";
import OneChattingProjectTokenModal from "../../../components/Modals/OneChattingProjectTokenModal";
import {
  whatsappApi,
  normalizeList,
  normalizePagination,
} from "../../../services/whatsappApi";
import { useUserPermissions } from "../../../utils/permission-helper";

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
const CELL_META = "text-xs text-gray-400 uppercase tracking-wide";
const CELL_BODY = "text-sm font-medium text-gray-700";
const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const TOOLBAR_INPUT =
  "w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-gray-400";

const MENU_Z = 99999;
const MENU_GAP = 8;
const MENU_PAD = 8;

const getContactParts = (profile) => {
  if (!profile) return { mobile: "", email: "" };
  const mobile = profile.mobile
    ? `${profile.country_code || ""}${profile.mobile}`.trim()
    : "";
  return { mobile, email: profile.email || "" };
};

const ContactCell = ({ profile }) => {
  const { mobile, email } = getContactParts(profile);
  if (!mobile && !email) {
    return <p className={`${CELL_BODY} text-gray-400`}>—</p>;
  }
  return (
    <div className="min-w-0 overflow-hidden">
      {mobile ? <p className={`${CELL_BODY} truncate`}>{mobile}</p> : null}
      {email ? (
        <p
          className={`${mobile ? "text-xs text-gray-400 mt-0.5" : CELL_BODY} truncate`}
        >
          {email}
        </p>
      ) : null}
    </div>
  );
};

const StatusBadge = ({ enabled }) =>
  enabled ? (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
      Enabled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
      Disabled
    </span>
  );

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

const OneChattingConfigure = () => {
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [loading, setLoading] = useState(false);
  const [savingMapId, setSavingMapId] = useState(null);
  const [rows, setRows] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });
  const [modalRow, setModalRow] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [syncingClients, setSyncingClients] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  const [projectTokenLoading, setProjectTokenLoading] = useState(true);
  const [projectTokenConfigured, setProjectTokenConfigured] = useState(false);
  const [projectDeveloperToken, setProjectDeveloperToken] = useState("");
  const [projectTokenModalOpen, setProjectTokenModalOpen] = useState(false);
  const [projectTokenSaving, setProjectTokenSaving] = useState(false);

  const fetchProjectToken = useCallback(async () => {
    setProjectTokenLoading(true);
    try {
      const res = await whatsappApi.getProjectDeveloperToken();
      const configured = Boolean(res?.data?.configured);
      setProjectTokenConfigured(configured);
      setProjectDeveloperToken(
        configured ? String(res?.data?.developer_token || "") : "",
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to load project developer token",
      );
    } finally {
      setProjectTokenLoading(false);
    }
  }, []);

  const fetchData = useCallback(
    async (page = 1, limit = 20, searchTerm = "") => {
      setLoading(true);
      try {
        const params = { page_no: page, limit };
        if (searchTerm.trim()) params.search = searchTerm.trim();

        const res = await whatsappApi.listDeveloperTokens(params);
        setRows(normalizeList(res?.data));
        setPagination(normalizePagination(res?.pagination));
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error.message ||
            "Failed to load users",
        );
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
    fetchProjectToken();
  }, [fetchProjectToken]);

  useEffect(() => {
    fetchData(1, pagination.limit, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handlePageChange = (page) => {
    fetchData(page, pagination.limit, search);
  };

  const handleLimitChange = (newLimit) => {
    const limit = Number(newLimit);
    setPagination((prev) => ({ ...prev, limit, page_no: 1 }));
    fetchData(1, limit, search);
  };

  const closeConfirm = () => {
    if (syncingClients || savingMapId || projectTokenSaving) return;
    setConfirmState(null);
  };

  const runDisable = async (row) => {
    setSavingMapId(row.map_id);
    try {
      await whatsappApi.updateDeveloperToken({
        map_id: row.map_id,
        enabled: false,
      });
      toast.success("OneChatting disabled successfully");
      setConfirmState(null);
      fetchData(pagination.page_no, pagination.limit, search);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to disable OneChatting",
      );
    } finally {
      setSavingMapId(null);
    }
  };

  const runSyncClients = async () => {
    setSyncingClients(true);
    const toastId = toast.loading("Syncing clients to OneChatting...");
    try {
      const res = await whatsappApi.syncClientsToOneChatting({ wait: true });
      const data = res?.data || {};
      const prepared = Number(data.contacts_prepared || 0);
      const skipped = Number(data.skipped_invalid_mobile || 0);
      const duplicates = Number(data.duplicate_numbers_skipped || 0);
      const batches = Number(data.chunks || data.jobs?.length || 0);
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      const timedOut = jobs.some((job) => job?.timed_out);

      if (prepared === 0) {
        toast.success(res?.message || "No clients to sync", { id: toastId });
      } else if (timedOut) {
        toast.success(
          `Queued ${prepared} contacts in ${batches} batch${batches === 1 ? "" : "es"}. Some jobs are still processing.`,
          { id: toastId, duration: 5000 },
        );
      } else {
        const extra = [];
        if (skipped) extra.push(`${skipped} invalid`);
        if (duplicates) extra.push(`${duplicates} duplicate numbers`);
        toast.success(
          `Synced ${prepared} contact${prepared === 1 ? "" : "s"} in ${batches} batch${
            batches === 1 ? "" : "es"
          }${extra.length ? ` (${extra.join(", ")})` : ""}.`,
          { id: toastId, duration: 5000 },
        );
      }
      setConfirmState(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.msg ||
          error.message ||
          "Failed to sync clients",
        { id: toastId },
      );
    } finally {
      setSyncingClients(false);
    }
  };

  const handleConfirmAction = () => {
    if (!confirmState) return;
    if (confirmState.type === "sync") {
      runSyncClients();
      return;
    }
    if (confirmState.type === "clear-project-token") {
      runClearProjectToken();
      return;
    }
    if (confirmState.type === "disable" && confirmState.row) {
      runDisable(confirmState.row);
    }
  };

  const runClearProjectToken = async () => {
    setProjectTokenSaving(true);
    try {
      await whatsappApi.updateProjectDeveloperToken({ clear: true });
      toast.success("Project developer token cleared");
      setConfirmState(null);
      setProjectTokenConfigured(false);
      setProjectDeveloperToken("");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to clear project developer token",
      );
    } finally {
      setProjectTokenSaving(false);
    }
  };

  const handleProjectTokenSubmit = async (payload) => {
    setProjectTokenSaving(true);
    try {
      const res = await whatsappApi.updateProjectDeveloperToken(payload);
      toast.success(res?.message || "Project developer token saved");
      setProjectTokenModalOpen(false);
      setProjectTokenConfigured(Boolean(res?.data?.configured));
      setProjectDeveloperToken(res?.data?.developer_token || "");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to save project developer token",
      );
    } finally {
      setProjectTokenSaving(false);
    }
  };

  const handleModalSubmit = async (payload) => {
    setModalSaving(true);
    try {
      const res = await whatsappApi.updateDeveloperToken(payload);
      toast.success(res?.message || "Developer token updated successfully");
      setModalRow(null);
      fetchData(pagination.page_no, pagination.limit, search);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to update developer token",
      );
    } finally {
      setModalSaving(false);
    }
  };

  const getActionItems = (row) => {
    const isSaving = savingMapId === row.map_id;

    if (row.onechatting_enabled) {
      return [
        {
          label: "Update Token",
          icon: FiKey,
          disabled: isSaving,
          onClick: () => setModalRow(row),
        },
        {
          label: "Disable",
          icon: FiPower,
          danger: true,
          disabled: isSaving,
          onClick: () => setConfirmState({ type: "disable", row }),
        },
      ];
    }

    return [
      {
        label: "Enable",
        icon: FiKey,
        disabled: isSaving,
        onClick: () => setModalRow(row),
      },
    ];
  };

  const indexOffset = (pagination.page_no - 1) * pagination.limit;
  const confirmLoading =
    confirmState?.type === "sync"
      ? syncingClients
      : confirmState?.type === "clear-project-token"
        ? projectTokenSaving
        : Boolean(confirmState?.row && savingMapId === confirmState.row.map_id);

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
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiLock className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Access Denied
            </h3>
            <p className="text-xs text-gray-400">
              You do not have permission to view this page.
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
          {/* Project developer token (branch-level) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <FiKey className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-800 leading-tight truncate m-0">
                    Project Developer Token
                  </h2>
                  <p className="text-xs text-gray-500 truncate m-0 mt-0.5">
                    Branch token for templates, contacts sync, and project APIs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                {projectTokenLoading ? (
                  <FiLoader className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <StatusBadge enabled={projectTokenConfigured} />
                )}
                <button
                  type="button"
                  onClick={() => setProjectTokenModalOpen(true)}
                  disabled={projectTokenLoading || projectTokenSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  <FiKey className="w-3.5 h-3.5" />
                  {projectTokenConfigured ? "Update" : "Set token"}
                </button>
                {projectTokenConfigured ? (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmState({ type: "clear-project-token" })
                    }
                    disabled={projectTokenLoading || projectTokenSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  >
                    <FiPower className="w-3.5 h-3.5" />
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            <div className="px-3 md:px-4 py-3 border-t border-gray-100 bg-gray-50/60">
              <p className="text-xs text-gray-500 m-0 leading-relaxed">
                This is the{" "}
                <span className="font-semibold text-gray-700">project</span>{" "}
                developer token for the branch. Staff and admin{" "}
                <span className="font-semibold text-gray-700">user</span> tokens
                are managed in the list below.
              </p>
              {projectTokenConfigured && projectDeveloperToken ? (
                <p className="mt-2 text-xs font-mono text-gray-600 truncate m-0">
                  {projectDeveloperToken.length > 16
                    ? `${projectDeveloperToken.slice(0, 8)}…${projectDeveloperToken.slice(-6)}`
                    : "••••••••"}
                </p>
              ) : null}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className={`${TOOLBAR_ROW} flex-wrap`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <FiUsers className="w-4 h-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight truncate">
                    User Developer Tokens
                  </h1>
                  <p className="text-xs text-gray-500 truncate">
                    Enable OneChatting for admins and staff
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-auto min-w-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setConfirmState({ type: "sync" })}
                  disabled={syncingClients || loading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 shrink-0"
                  title="Upsert branch clients into OneChatting contacts"
                >
                  {syncingClients ? (
                    <FiLoader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FiRefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {syncingClients ? "Syncing…" : "Sync clients"}
                  </span>
                </button>

                <form
                  onSubmit={handleSearch}
                  className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0"
                >
                  <div className="relative flex-1 sm:w-56 md:w-64 min-w-0">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search name, email…"
                      className={TOOLBAR_INPUT}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shrink-0"
                  >
                    Search
                  </button>
                </form>
              </div>
            </div>

            {loading && rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FiLoader className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm font-medium text-gray-500">
                  Loading users…
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <FiUsers className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  No users found
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {search
                    ? "Try a different search term"
                    : "No branch mappings available"}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full table-fixed min-w-[760px]">
                    <thead>
                      <tr className={TABLE_HEAD_ROW}>
                        <th className={`${TABLE_TH} w-12`}>#</th>
                        <th className={`${TABLE_TH} w-[28%]`}>User</th>
                        <th className={`${TABLE_TH} w-[12%]`}>Type</th>
                        <th className={`${TABLE_TH} w-[28%]`}>Contact</th>
                        <th className={`${TABLE_TH} w-[14%]`}>Status</th>
                        <th className={`${TABLE_TH} w-16 text-center`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={row.map_id} className={TABLE_ROW}>
                          <td className={`${TABLE_TD} ${CELL_INDEX}`}>
                            {indexOffset + idx + 1}
                          </td>
                          <td className={TABLE_TD}>
                            <div className="min-w-0 overflow-hidden">
                              <p className={`${CELL_TITLE} truncate`}>
                                {row.profile?.name || "—"}
                              </p>
                              <p className={`${CELL_META} mt-0.5 truncate`}>
                                {row.designation || "—"}
                              </p>
                            </div>
                          </td>
                          <td className={TABLE_TD}>
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                              {row.type || "—"}
                            </span>
                          </td>
                          <td className={TABLE_TD}>
                            <ContactCell profile={row.profile} />
                          </td>
                          <td className={TABLE_TD}>
                            <StatusBadge enabled={row.onechatting_enabled} />
                          </td>
                          <td className={`${TABLE_TD} text-center`}>
                            {savingMapId === row.map_id ? (
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
                    <div key={row.map_id} className="p-3 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex gap-2 flex-1">
                          <span className={`${CELL_INDEX} shrink-0 pt-0.5`}>
                            {indexOffset + idx + 1}.
                          </span>
                          <div className="min-w-0">
                            <p className={`${CELL_TITLE} truncate`}>
                              {row.profile?.name || "—"}
                            </p>
                            <p className={`${CELL_META} truncate`}>
                              {row.designation || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge enabled={row.onechatting_enabled} />
                          {savingMapId === row.map_id ? (
                            <FiLoader className="w-4 h-4 animate-spin text-gray-400" />
                          ) : (
                            <ActionMenu items={getActionItems(row)} />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pl-5">
                        <div>
                          <p className="text-gray-400">Type</p>
                          <p className="text-gray-700 font-medium capitalize">
                            {row.type || "—"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-400 mb-0.5">Contact</p>
                          <ContactCell profile={row.profile} />
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

      <OneChattingTokenModal
        isOpen={Boolean(modalRow)}
        row={modalRow}
        onClose={() => !modalSaving && setModalRow(null)}
        onSubmit={handleModalSubmit}
        saving={modalSaving}
      />

      <OneChattingProjectTokenModal
        isOpen={projectTokenModalOpen}
        initialToken={projectDeveloperToken}
        onClose={() => !projectTokenSaving && setProjectTokenModalOpen(false)}
        onSubmit={handleProjectTokenSubmit}
        saving={projectTokenSaving}
      />

      <ConfirmActionModal
        isOpen={Boolean(confirmState)}
        loading={confirmLoading}
        onCancel={closeConfirm}
        onConfirm={handleConfirmAction}
        icon={FiAlertTriangle}
        {...(confirmState?.type === "sync"
          ? {
              title: "Sync clients",
              heading: "Sync clients to OneChatting?",
              message:
                "All branch clients with mobile numbers will be upserted as OneChatting contacts. Existing numbers will be updated.",
              confirmLabel: syncingClients ? "Syncing…" : "Sync clients",
              tone: "primary",
            }
          : confirmState?.type === "clear-project-token"
            ? {
                title: "Clear project token",
                heading: "Clear project developer token?",
                message:
                  "Template list, contact sync, and other project APIs will stop working until a new project token is set.",
                confirmLabel: projectTokenSaving ? "Clearing…" : "Clear token",
                tone: "danger",
              }
            : {
                title: "Disable OneChatting",
                heading: "Disable OneChatting?",
                message: `OneChatting access will be turned off for ${
                  confirmState?.row?.profile?.name ||
                  confirmState?.row?.username ||
                  "this user"
                }.`,
                confirmLabel: confirmLoading ? "Disabling…" : "Disable",
                tone: "danger",
              })}
      />
    </div>
  );
};

export default OneChattingConfigure;
