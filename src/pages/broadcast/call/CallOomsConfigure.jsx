import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiSearch,
  FiUsers,
  FiLoader,
  FiLock,
  FiRefreshCw,
  FiSave,
  FiPhone,
  FiKey,
  FiPower,
  FiMoreVertical,
  FiAlertTriangle,
  FiEdit2,
} from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import TablePagination from "../../../components/TablePagination";
import ConfirmActionModal from "../../../components/ConfirmActionModal";
import CallExtensionModal from "../../../components/Modals/CallExtensionModal";
import {
  callApi,
  normalizeList,
  normalizePagination,
} from "../../../services/callApi";
import { useUserPermissions } from "../../../utils/permission-helper";

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
  "w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder:text-gray-400";

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
      top: Math.max(MENU_PAD, Math.min(chosen.top, vh - mH - MENU_PAD)),
      left: Math.max(MENU_PAD, Math.min(chosen.left, vw - mW - MENU_PAD)),
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    calcPos();
    const onDoc = (e) => {
      if (
        menuRef.current?.contains(e.target) ||
        btnRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", calcPos);
    window.addEventListener("scroll", calcPos, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", calcPos);
      window.removeEventListener("scroll", calcPos, true);
    };
  }, [open, calcPos]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        aria-label="Actions"
      >
        <FiMoreVertical className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: MENU_Z }}
            className="min-w-[168px] rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm disabled:opacity-50 ${
                    item.danger
                      ? "text-red-600 hover:bg-red-50"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};

export default function CallOomsConfigure() {
  const { check } = useUserPermissions();
  const canEdit = check("broadcast_config_edit");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sidebarMinimized") || "false");
    } catch {
      return false;
    }
  });

  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [configMeta, setConfigMeta] = useState({
    configured: false,
    api_key_masked: "",
    status: "active",
  });

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [savingMapId, setSavingMapId] = useState(null);
  const [modalRow, setModalRow] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await callApi.getBranchConfig();
      const data = res?.data || {};
      setConfigMeta({
        configured: Boolean(data.configured),
        api_key_masked: data.api_key_masked || "",
        status: data.status || "active",
      });
      setApiKey("");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err.message || "Failed to load config"
      );
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(
    async (pageNo = page, pageLimit = limit, searchTerm = search) => {
      setLoading(true);
      try {
        const res = await callApi.listStaff({
          page_no: pageNo,
          limit: pageLimit,
          search: searchTerm || undefined,
        });
        const list = normalizeList(res?.data);
        setRows(list);
        setPagination(normalizePagination(res?.pagination));
      } catch (err) {
        toast.error(
          err?.response?.data?.message || err.message || "Failed to load staff"
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [page, limit, search]
  );

  useEffect(() => {
    if (!canEdit) return;
    fetchConfig();
  }, [canEdit, fetchConfig]);

  useEffect(() => {
    if (!canEdit) return;
    fetchStaff(page, limit, search);
  }, [canEdit, page, limit, search, fetchStaff]);

  const handleSaveToken = async () => {
    if (!configMeta.configured && !apiKey.trim()) {
      toast.error("API token is required");
      return;
    }
    setConfigSaving(true);
    try {
      const payload = { status: "active" };
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      const res = await callApi.updateBranchConfig(payload);
      toast.success(res?.message || "Token saved");
      setApiKey("");
      await fetchConfig();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Save failed");
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleModalSubmit = async (payload) => {
    setModalSaving(true);
    setSavingMapId(payload.map_id);
    try {
      const res = await callApi.updateStaffExtension(payload);
      toast.success(res?.message || "Call access updated");
      setModalRow(null);
      await fetchStaff(page, limit, search);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err.message || "Update failed"
      );
    } finally {
      setModalSaving(false);
      setSavingMapId(null);
    }
  };

  const handleDisable = async (row) => {
    setSavingMapId(row.map_id);
    try {
      const res = await callApi.updateStaffExtension({
        map_id: row.map_id,
        enabled: false,
        call_extension: "",
      });
      toast.success(res?.message || "Call access disabled");
      setConfirmState(null);
      await fetchStaff(page, limit, search);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err.message || "Disable failed"
      );
    } finally {
      setSavingMapId(null);
    }
  };

  const getActionItems = (row) => {
    const isSaving = savingMapId === row.map_id;
    if (row.call_enabled) {
      return [
        {
          label: "Update Extension",
          icon: FiEdit2,
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
        icon: FiPhone,
        disabled: isSaving,
        onClick: () => setModalRow(row),
      },
    ];
  };

  const indexOffset = (page - 1) * limit;

  if (!canEdit) {
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
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${
            isMinimized ? "md:pl-20" : "md:pl-[260px]"
          }`}
        >
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiLock className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Access Denied
            </h3>
            <p className="text-xs text-gray-400">
              You need broadcast config permission to manage call settings.
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
        className={`pt-16 transition-all duration-300 ${
          isMinimized ? "md:pl-20" : "md:pl-[260px]"
        }`}
      >
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4 space-y-3 md:space-y-4">
          {/* Branch API token */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                  <FiKey className="w-4 h-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-800 leading-tight truncate m-0">
                    Branch API Token
                  </h2>
                  <p className="text-xs text-gray-500 truncate m-0 mt-0.5">
                    PBX x-api-key used for click-to-call from this branch
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                {configLoading ? (
                  <FiLoader className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <StatusBadge enabled={configMeta.configured} />
                )}
                <button
                  type="button"
                  onClick={() => {
                    fetchConfig();
                    fetchStaff(page, limit, search);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  title="Refresh"
                >
                  <FiRefreshCw
                    className={`h-3.5 w-3.5 ${
                      loading || configLoading ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="px-3 md:px-4 py-4 border-t border-gray-100 bg-gradient-to-br from-white to-teal-50/30">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="min-w-0 flex-1">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    API token (x-api-key)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      configMeta.configured
                        ? `Saved: ${configMeta.api_key_masked}`
                        : "Paste PBX API key"
                    }
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                    disabled={configLoading || configSaving}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveToken}
                  disabled={configLoading || configSaving}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 shrink-0"
                >
                  {configSaving ? (
                    <FiLoader className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FiSave className="h-3.5 w-3.5" />
                  )}
                  Save token
                </button>
              </div>
              <p className="mt-2.5 mb-0 text-xs text-gray-500 leading-relaxed">
                {configMeta.configured
                  ? "Token is configured. Leave the field blank to keep the existing key."
                  : "Add the branch PBX API key before enabling staff extensions."}
              </p>
            </div>
          </motion.div>

          {/* Staff list */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className={`${TOOLBAR_ROW} flex-wrap`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <FiUsers className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight truncate m-0">
                    Staff Call Access
                  </h1>
                  <p className="text-xs text-gray-500 truncate m-0 mt-0.5">
                    Enable click-to-call and assign PBX extensions
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSearch}
                className="flex items-center gap-2 shrink-0 ml-auto min-w-0 w-full sm:w-auto"
              >
                <div className="relative flex-1 sm:w-56 md:w-64 min-w-0">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search name, mobile, extension…"
                    className={TOOLBAR_INPUT}
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shrink-0"
                >
                  Search
                </button>
              </form>
            </div>

            {loading && rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FiLoader className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm font-medium text-gray-500">
                  Loading active staff…
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <FiUsers className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  No active staff found
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {search
                    ? "Try a different search term"
                    : "Only accepted, active staff are listed here"}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full table-fixed min-w-[820px]">
                    <thead>
                      <tr className={TABLE_HEAD_ROW}>
                        <th className={`${TABLE_TH} w-12`}>#</th>
                        <th className={`${TABLE_TH} w-[24%]`}>Staff</th>
                        <th className={`${TABLE_TH} w-[22%]`}>Contact</th>
                        <th className={`${TABLE_TH} w-[12%]`}>Role</th>
                        <th className={`${TABLE_TH} w-[14%]`}>Status</th>
                        <th className={`${TABLE_TH} w-[16%]`}>Extension</th>
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
                            <ContactCell profile={row.profile} />
                          </td>
                          <td className={TABLE_TD}>
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                              {row.type || "—"}
                            </span>
                          </td>
                          <td className={TABLE_TD}>
                            <StatusBadge enabled={row.call_enabled} />
                          </td>
                          <td className={TABLE_TD}>
                            {row.call_enabled && row.call_extension ? (
                              <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-1 font-mono text-sm font-semibold text-teal-800">
                                {row.call_extension}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
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
                          <StatusBadge enabled={row.call_enabled} />
                          {savingMapId === row.map_id ? (
                            <FiLoader className="w-4 h-4 animate-spin text-gray-400" />
                          ) : (
                            <ActionMenu items={getActionItems(row)} />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pl-5">
                        <div>
                          <p className="text-gray-400 m-0">Role</p>
                          <p className="text-gray-700 font-medium capitalize m-0">
                            {row.type || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 m-0">Extension</p>
                          <p className="text-gray-700 font-mono font-semibold m-0">
                            {row.call_enabled && row.call_extension
                              ? row.call_extension
                              : "—"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-400 mb-0.5 m-0">Contact</p>
                          <ContactCell profile={row.profile} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <TablePagination
                  page={page}
                  totalPages={pagination.total_pages}
                  total={pagination.total}
                  limit={limit}
                  defaultRows={20}
                  rowOptions={[10, 20, 50, 100]}
                  onPageChange={setPage}
                  onLimitChange={(next) => {
                    setLimit(next);
                    setPage(1);
                  }}
                />
              </>
            )}
          </motion.div>
        </div>
      </div>

      <CallExtensionModal
        isOpen={Boolean(modalRow)}
        row={modalRow}
        onClose={() => !modalSaving && setModalRow(null)}
        onSubmit={handleModalSubmit}
        saving={modalSaving}
      />

      <ConfirmActionModal
        isOpen={Boolean(confirmState)}
        loading={Boolean(
          confirmState?.row && savingMapId === confirmState.row.map_id
        )}
        onCancel={() => !savingMapId && setConfirmState(null)}
        onConfirm={() =>
          confirmState?.row ? handleDisable(confirmState.row) : null
        }
        icon={FiAlertTriangle}
        title="Disable call access"
        heading="Disable click-to-call for this staff?"
        message={
          confirmState?.row
            ? `${confirmState.row.profile?.name || "This staff"} will no longer be able to place calls until re-enabled with an extension.`
            : ""
        }
        confirmLabel="Disable"
        cancelLabel="Cancel"
        tone="danger"
      />
    </div>
  );
}
