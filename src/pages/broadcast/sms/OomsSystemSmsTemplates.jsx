import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiCheck,
  FiEdit2,
  FiFileText,
  FiInfo,
  FiLoader,
  FiLock,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import TablePagination from "../../../components/TablePagination";
import ConfirmActionModal from "../../../components/ConfirmActionModal";
import EmailActionMenu from "../email/EmailActionMenu";
import { useUserPermissions } from "../../../utils/permission-helper";
import { formatActivityType } from "../../../utils/oomsSystemTemplateUtils";
import { normalizeList, smsApi } from "../../../services/smsApi";
import { useSmsChannel } from "../../../hooks/useSmsChannel";

const TABLE_TH =
  "p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const TABLE_TD = "p-3 text-left align-middle";
const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const MappingStatusBadge = ({ isSet }) =>
  isSet ? (
    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
      Mapped
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
      Not mapped
    </span>
  );

function SmsSystemPickerModal({ activityType, currentId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(currentId || "");
  const [listSearch, setListSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await smsApi.listOomsSystemTemplates({ type: activityType });
        if (cancelled) return;
        const list = normalizeList(res?.data);
        setTemplates(list);
        setSelectedId(currentId || list[0]?.template_id || "");
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load templates");
        setTemplates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityType, currentId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const filteredTemplates = useMemo(() => {
    const term = listSearch.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter((item) =>
      [item.name, item.message_body, item.route]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [templates, listSearch]);

  const selected = templates.find((t) => t.template_id === selectedId) || null;
  const isAlreadyMapped = Boolean(currentId) && selectedId === currentId;

  const handleSave = async () => {
    if (!selectedId) {
      toast.error("Select a template");
      return;
    }
    setSaving(true);
    try {
      await smsApi.setOomsSystemTemplateMap({
        type: activityType,
        sms_template_id: selectedId,
      });
      toast.success("Template mapped");
      onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save mapping");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="sms-system-picker"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
          aria-label="Close"
          onClick={saving ? undefined : onClose}
          disabled={saving}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="relative z-[1] pointer-events-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
            <h3 className="m-0 min-w-0 truncate text-sm font-bold text-gray-800">
              Map template
              <span className="mx-1.5 font-medium text-gray-400">·</span>
              <span className="font-semibold text-gray-700">
                {formatActivityType(activityType)}
              </span>
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              aria-label="Close"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
            <aside className="flex max-h-[42vh] min-h-0 flex-col overflow-hidden border-b border-gray-200 md:max-h-none md:w-1/2 md:border-b-0 md:border-r">
              <div className="shrink-0 border-b border-gray-100 px-4 py-2.5">
                <div className="relative">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div
                className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain ${SCROLL_HIDE}`}
              >
                {loading ? (
                  <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-500">
                    <FiLoader className="animate-spin" /> Loading…
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="m-0 text-sm font-medium text-gray-500">
                      No templates available
                    </p>
                    <p className="m-0 mt-1 text-xs text-gray-400">
                      Ask an admin to add an active system template for this
                      type.
                    </p>
                  </div>
                ) : (
                  filteredTemplates.map((item, index) => {
                    const selectedRow = item.template_id === selectedId;
                    return (
                      <button
                        key={item.template_id}
                        type="button"
                        onClick={() => setSelectedId(item.template_id)}
                        className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors ${
                          selectedRow ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[11px] font-bold tabular-nums text-gray-800">
                          {index + 1}
                        </span>
                        <span
                          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            selectedRow
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {selectedRow ? <FiCheck size={11} /> : null}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 truncate text-sm font-semibold text-gray-800">
                            {item.name}
                          </p>
                          <p className="m-0 mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                            {item.route || "dlt"}
                            {Array.isArray(item.variable_keys) &&
                            item.variable_keys.length
                              ? ` · ${item.variable_keys.length} vars`
                              : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50/80 md:w-1/2">
              <div
                className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 ${SCROLL_HIDE}`}
              >
                {!selected ? (
                  <div className="flex h-full min-h-[180px] flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
                      <FiFileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="m-0 text-sm font-medium text-gray-500">
                      Select a template
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                          Preview
                        </p>
                        <p className="m-0 mt-0.5 text-sm font-semibold text-gray-800">
                          {selected.name}
                        </p>
                      </div>
                      {isAlreadyMapped ? (
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-700 ring-1 ring-green-200">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3.5 py-3">
                      <p className="m-0 whitespace-pre-wrap text-sm font-medium leading-relaxed text-gray-700">
                        {selected.message_body || "No body text"}
                      </p>
                    </div>
                    {Array.isArray(selected.variable_keys) &&
                    selected.variable_keys.length ? (
                      <div className="mt-3">
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                          Variables
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.variable_keys.map((key) => (
                            <span
                              key={key}
                              className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-gray-600"
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !selectedId || isAlreadyMapped}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <FiLoader className="animate-spin" /> : null}
              {isAlreadyMapped ? "Already mapped" : "Save mapping"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

const OomsSystemSmsTemplates = () => {
  const { check } = useUserPermissions();
  const smsChannel = useSmsChannel();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [pickerType, setPickerType] = useState(null);
  const [unmapRow, setUnmapRow] = useState(null);
  const [unmapping, setUnmapping] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await smsApi.getOomsSystemTemplateMapList();
      setRows(normalizeList(res?.data));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load mappings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.type, row.description, row.sms_template_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [rows, search]);

  const safePage = Math.min(
    page,
    Math.max(1, Math.ceil(filteredRows.length / limit) || 1),
  );
  const pagedRows = filteredRows.slice((safePage - 1) * limit, safePage * limit);

  const confirmUnmap = async () => {
    if (!unmapRow?.type) return;
    setUnmapping(true);
    try {
      await smsApi.unsetOomsSystemTemplateMap({ type: unmapRow.type });
      toast.success("Mapping cleared");
      setUnmapRow(null);
      fetchMappings();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to unset mapping");
    } finally {
      setUnmapping(false);
    }
  };

  const getRowActionItems = (item) => [
    {
      label: item.is_set ? "Change" : "Map",
      icon: FiEdit2,
      onClick: () => setPickerType(item.type),
    },
    ...(item.is_set
      ? [
          {
            label: "Unset",
            icon: FiX,
            danger: true,
            onClick: () => setUnmapRow(item),
          },
        ]
      : []),
  ];

  if (!check("broadcast_config_edit") && !check("broadcast_send")) {
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
          className={`flex h-[calc(100vh-4rem)] items-center justify-center pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
        >
          <div className="mx-4 max-w-sm rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <FiLock className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="m-0 text-sm font-medium text-gray-500">
              Access Denied
            </h3>
            <p className="m-0 mt-1 text-xs text-gray-400">
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
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
      >
        <div className="mx-2 my-3 flex h-full flex-col sm:mx-4 md:mx-8 md:my-4">
          <div className="mb-3">
            <h1 className="m-0 text-base font-bold text-gray-800 md:text-lg">
              OOMS System SMS Templates
            </h1>
            <p className="m-0 mt-0.5 text-xs text-gray-500">
              Map notification types to platform templates for automated SMS.
            </p>
          </div>

          {smsChannel !== "ooms system" ? (
            <div className="mb-3 flex gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p className="m-0 text-sm font-medium text-blue-900">
                Your branch SMS channel is currently{" "}
                <span className="font-semibold capitalize">
                  {smsChannel || "disabled"}
                </span>
                . Set it to OOMS System on the broadcast page for these mappings
                to take effect.
              </p>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between md:px-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <FiFileText className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="m-0 truncate text-base font-bold text-gray-800">
                    Notification mappings
                  </h2>
                  <p className="m-0 text-xs text-gray-500">
                    {filteredRows.filter((r) => r.is_set).length} of{" "}
                    {filteredRows.length} mapped
                  </p>
                </div>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:w-64">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search types…"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchMappings}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  <FiRefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <tr>
                    <th className={`${TABLE_TH} w-14`}>#</th>
                    <th className={TABLE_TH}>Type</th>
                    <th className={TABLE_TH}>Status</th>
                    <th className={TABLE_TH}>Template</th>
                    <th className={`${TABLE_TH} text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr
                        key={i}
                        className="animate-pulse border-b border-gray-100"
                      >
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className={TABLE_TD}>
                            <div className="h-3 max-w-[140px] rounded bg-gray-200" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <p className="m-0 text-sm font-medium text-gray-500">
                          No template types found.
                        </p>
                        <p className="m-0 mt-1 text-xs text-gray-400">
                          Try a different search term.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((item, index) => (
                      <tr
                        key={item.type}
                        className="border-b border-gray-100 bg-white transition-colors hover:bg-gray-50"
                      >
                        <td
                          className={`${TABLE_TD} text-[11px] font-bold tabular-nums text-gray-800`}
                        >
                          {(safePage - 1) * limit + index + 1}
                        </td>
                        <td className={TABLE_TD}>
                          <p className="m-0 text-sm font-semibold text-gray-800">
                            {formatActivityType(item.type)}
                          </p>
                          {item.description ? (
                            <p className="m-0 mt-0.5 line-clamp-1 text-xs text-gray-400">
                              {item.description}
                            </p>
                          ) : null}
                        </td>
                        <td className={TABLE_TD}>
                          <MappingStatusBadge isSet={Boolean(item.is_set)} />
                        </td>
                        <td className={TABLE_TD}>
                          {item.is_set ? (
                            <p className="m-0 text-sm font-medium text-gray-700">
                              {item.sms_template_name}
                            </p>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className={TABLE_TD}>
                          <div className="flex justify-end">
                            <EmailActionMenu items={getRowActionItems(item)} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={safePage}
              limit={limit}
              total={filteredRows.length}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {pickerType ? (
          <SmsSystemPickerModal
            activityType={pickerType}
            currentId={
              rows.find((r) => r.type === pickerType)?.sms_template_id || ""
            }
            onClose={() => setPickerType(null)}
            onSaved={fetchMappings}
          />
        ) : null}
      </AnimatePresence>

      <ConfirmActionModal
        isOpen={Boolean(unmapRow)}
        title="Unmap template"
        heading="Remove this mapping?"
        message={
          unmapRow
            ? `Unset “${unmapRow.sms_template_name || "template"}” from ${formatActivityType(
                unmapRow.type,
              )}. Automated SMS for this type will stop until you map another template.`
            : ""
        }
        confirmLabel="Unmap"
        cancelLabel="Cancel"
        tone="danger"
        loading={unmapping}
        onCancel={() => {
          if (!unmapping) setUnmapRow(null);
        }}
        onConfirm={confirmUnmap}
      />
    </div>
  );
};

export default OomsSystemSmsTemplates;
