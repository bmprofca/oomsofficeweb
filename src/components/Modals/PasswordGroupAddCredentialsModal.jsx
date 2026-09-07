import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiPlus, FiX, FiLoader, FiTrash2, FiUsers, FiSearch } from "react-icons/fi";
import { toast } from "react-hot-toast";
import axios from "axios";
import CustomSelect from "../CustomSelect";
import { passwordGroupService } from "../../services/passwordGroupService";
import { searchFirmSelectOptions } from "../../services/complianceService";
import API_BASE_URL from "../../utils/api-controller";
import getHeaders from "../../utils/get-headers";

const FIELD_LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";
const FIELD_INPUT =
  "w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60 bg-white";
const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const emptyCard = (firm) => ({
  key: `${firm.firm_id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  firm_id: firm.firm_id,
  firm_name: firm.firm_name || "—",
  pan_no: firm.pan_no || "",
  client_name: firm.client_name || "",
  username: "",
  password: "",
  description: "",
});

const loadFirmOptions = async (search, page = 1) =>
  searchFirmSelectOptions({
    search,
    page_no: page,
    limit: 30,
  });

const loadGroupOptions = async (search, page = 1) => {
  const headers = getHeaders();
  if (!headers) return { options: [], hasMore: false };

  const response = await axios.get(`${API_BASE_URL}/group/list`, {
    headers,
    params: {
      search: String(search || "").trim(),
      page: String(page),
      limit: "30",
    },
  });

  const list = Array.isArray(response.data?.data) ? response.data.data : [];
  const pagination = response.data?.pagination || {};
  const options = list.map((group) => {
    const firmCount = Number(group.firm_count) || 0;
    const name = group.name || group.group_name || group.group_id;
    return {
      value: group.group_id,
      label: `${name} (${firmCount} firm${firmCount === 1 ? "" : "s"})`,
      firm_count: firmCount,
      isDisabled: firmCount <= 0,
    };
  });

  const hasMore =
    pagination.is_last_page === false ||
    Number(pagination.page || page) < Number(pagination.total_pages || 1);

  return { options, hasMore };
};

const fetchAllGroupFirms = async (groupId) => {
  const headers = getHeaders();
  if (!headers) return [];

  const collected = [];
  let page = 1;
  let lastPage = false;

  while (!lastPage && page <= 20) {
    const response = await axios.get(`${API_BASE_URL}/group/group-firms/list`, {
      headers,
      params: {
        group_id: groupId,
        page: String(page),
        limit: "100",
      },
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load group firms");
    }

    const rows = Array.isArray(response.data.data?.firms) ? response.data.data.firms : [];
    collected.push(
      ...rows
        .map((row) => {
          const firm = row.firm || row;
          const client = row.client || {};
          return {
            firm_id: firm.firm_id,
            firm_name: firm.firm_name,
            pan_no: firm.pan || firm.pan_no || client.pan_number || "",
            client_name: client.name || "",
          };
        })
        .filter((f) => f.firm_id),
    );

    lastPage =
      response.data.pagination?.is_last_page === true ||
      rows.length < 100;
    page += 1;
  }

  return collected;
};

export default function PasswordGroupAddCredentialsModal({
  open,
  groupId,
  saving = false,
  onClose,
  onSuccess,
}) {
  const [source, setSource] = useState("search");
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    if (!open) return;
    setSource("search");
    setSelectedFirm(null);
    setSelectedGroup(null);
    setCards([]);
    setImporting(false);
    setSubmitting(false);
  }, [open]);

  const busy = submitting || saving || importing;

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !(submitting || saving || importing)) onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, saving, importing, onClose]);

  const addFirms = useCallback((firms) => {
    setCards((prev) => {
      const seen = new Set(prev.map((c) => c.firm_id));
      const next = [...prev];
      let added = 0;
      firms.forEach((firm) => {
        if (!firm?.firm_id || seen.has(firm.firm_id)) return;
        seen.add(firm.firm_id);
        next.push(emptyCard(firm));
        added += 1;
      });
      if (added === 0 && firms.length) {
        toast("Those firms are already on the list", { icon: "ℹ️" });
      }
      return next;
    });
  }, []);

  const handlePickFirm = (option) => {
    if (!option?.value) {
      setSelectedFirm(null);
      return;
    }
    addFirms([
      {
        firm_id: option.value,
        firm_name: option.firm_name || option.label,
        pan_no: option.pan_no || "",
        client_name: "",
      },
    ]);
    setSelectedFirm(null);
  };

  const handleImportGroup = async () => {
    if (!selectedGroup?.value) {
      toast.error("Select a group first");
      return;
    }
    setImporting(true);
    try {
      const firms = await fetchAllGroupFirms(selectedGroup.value);
      if (!firms.length) {
        toast.error("This group has no firms");
        return;
      }
      addFirms(firms);
      toast.success(`Imported ${firms.length} firm${firms.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to import firms");
    } finally {
      setImporting(false);
    }
  };

  const updateCard = (key, field, value) => {
    setCards((prev) => prev.map((card) => (card.key === key ? { ...card, [field]: value } : card)));
  };

  const removeCard = (key) => {
    setCards((prev) => prev.filter((card) => card.key !== key));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || saving) return;
    if (!cards.length) {
      toast.error("Add at least one firm");
      return;
    }

    const incomplete = cards.filter((c) => !c.username.trim() || !c.password.trim());
    if (incomplete.length) {
      toast.error("Enter username and password on every firm card");
      return;
    }

    setSubmitting(true);
    const failedKeys = new Set();

    for (const card of cards) {
      try {
        const response = await passwordGroupService.createFirmCredential({
          group_id: groupId,
          firm_id: card.firm_id,
          username: card.username.trim(),
          password: card.password,
          description: card.description.trim() || undefined,
        });
        if (!response.data?.success) failedKeys.add(card.key);
      } catch {
        failedKeys.add(card.key);
      }
    }

    setSubmitting(false);
    const saved = cards.length - failedKeys.size;
    const failed = failedKeys.size;

    if (saved && !failed) {
      toast.success(`${saved} credential${saved === 1 ? "" : "s"} saved`);
      onSuccess?.();
      onClose?.();
      return;
    }
    if (saved && failed) {
      setCards((prev) => prev.filter((card) => failedKeys.has(card.key)));
      toast.error(`Saved ${saved}, failed ${failed}. Remaining cards were not saved.`);
      onSuccess?.();
      return;
    }
    toast.error("Failed to save credentials");
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="pwg-add-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-label="Close"
            onClick={busy ? undefined : onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[min(calc(100vh-1.5rem),100dvh)] sm:h-[min(calc(100vh-2rem),56rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-50">
                  <FiPlus className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-800 m-0">Add firm credentials</h3>
                  <p className="text-xs text-gray-500 m-0">
                    Search firms or import a group, then type credentials on each card
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0" autoComplete="off">
              <div className="shrink-0 px-5 py-3 border-b border-gray-100 bg-white">
                <div className="flex gap-1.5 mb-3">
                  {[
                    { id: "search", label: "Search firms", icon: FiSearch },
                    { id: "group", label: "Import from group", icon: FiUsers },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSource(tab.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
                          source === tab.id
                            ? "bg-indigo-600 text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {source === "search" ? (
                  <div>
                    <label className={FIELD_LABEL}>Add a firm</label>
                    <CustomSelect
                      loadOptions={loadFirmOptions}
                      defaultOptions
                      debounceMs={350}
                      value={selectedFirm}
                      onChange={handlePickFirm}
                      placeholder="Search firm by name, PAN, or client…"
                      searchPlaceholder="Search firms…"
                      isDisabled={busy}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1 min-w-0">
                      <label className={FIELD_LABEL}>Office group</label>
                      <CustomSelect
                        loadOptions={loadGroupOptions}
                        defaultOptions
                        debounceMs={350}
                        value={selectedGroup}
                        onChange={setSelectedGroup}
                        placeholder="Select a group…"
                        searchPlaceholder="Search groups…"
                        isDisabled={busy}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleImportGroup}
                      disabled={busy || !selectedGroup?.value}
                      className="inline-flex items-center justify-center gap-1.5 h-10 px-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 shrink-0"
                    >
                      {importing ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiUsers className="w-3.5 h-3.5" />}
                      Import firms
                    </button>
                  </div>
                )}
              </div>

              <div
                className={`px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain ${SCROLL_HIDE}`}
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {cards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-12 text-center">
                    <p className="text-sm font-medium text-gray-500 m-0">No firms added yet</p>
                    <p className="text-xs text-gray-400 mt-1 mb-0">
                      Search a firm or import a group to create credential cards
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 m-0 mb-3">
                      {cards.length} firm{cards.length === 1 ? "" : "s"} — type username and password on each card
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {cards.map((card, index) => (
                        <div key={card.key} className="rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 m-0 truncate">
                                {index + 1}. {card.firm_name}
                              </p>
                              <p className="text-xs text-gray-500 m-0 truncate">
                                {[card.pan_no && `PAN ${card.pan_no}`, card.client_name].filter(Boolean).join(" · ") || "—"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCard(card.key)}
                              disabled={busy}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                              title="Remove"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className={FIELD_LABEL}>
                                Username <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={card.username}
                                onChange={(e) => updateCard(card.key, "username", e.target.value)}
                                className={FIELD_INPUT}
                                placeholder="Username"
                                disabled={busy}
                                autoComplete="off"
                              />
                            </div>
                            <div>
                              <label className={FIELD_LABEL}>
                                Password <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={card.password}
                                onChange={(e) => updateCard(card.key, "password", e.target.value)}
                                className={FIELD_INPUT}
                                placeholder="Password"
                                disabled={busy}
                                autoComplete="new-password"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className={FIELD_LABEL}>Description</label>
                              <input
                                type="text"
                                value={card.description}
                                onChange={(e) => updateCard(card.key, "description", e.target.value)}
                                className={FIELD_INPUT}
                                placeholder="Optional notes"
                                disabled={busy}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !cards.length}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save {cards.length ? `${cards.length} ` : ""}credential{cards.length === 1 ? "" : "s"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
