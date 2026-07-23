import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  FiPlus,
  FiTrash2,
  FiSearch,
  FiUser,
  FiArrowLeft,
  FiArrowRight,
} from "react-icons/fi";
import { GroupModalShell, MODAL_BODY_CLASS } from "./GroupModalParts";
import getHeaders from "../../utils/get-headers";
import API_BASE_URL from "../../utils/api-controller";

const FIRM_LIST_LIMIT = 20;

const LIST_SCROLL_CLASS =
  "flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const SkeletonBar = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-gray-200/90 ${className}`} aria-hidden />
);

function FirmListSkeleton({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={`firm-sk-${i}`}
          className="p-2.5 bg-white border border-gray-200 rounded-lg space-y-2"
          aria-hidden
        >
          <SkeletonBar className="h-4 w-3/4 max-w-[180px]" />
          <SkeletonBar className="h-3 w-1/2 max-w-[120px]" />
          <div className="flex gap-3 pt-0.5">
            <SkeletonBar className="h-3 w-16" />
            <SkeletonBar className="h-3 w-20" />
          </div>
        </div>
      ))}
    </>
  );
}

function mapFirmToOption(f) {
  return {
    value: f.firm_id,
    label: f.client ? `${f.firm_name} – ${f.client.name}` : f.firm_name || "",
    __firm: f,
  };
}

function getFirmFileNo(firm) {
  const c = firm?.client || {};
  return firm?.file_no || c?.file_no || "";
}

/** Add firms to the group via searchable dual-list (task-create firm select UI). */
export function GroupFirmsAddModal({
  open,
  saving = false,
  excludeFirmIds = [],
  onClose,
  onCancel,
  onSubmit,
}) {
  const [firmSearchQuery, setFirmSearchQuery] = useState("");
  const [firmSearchResults, setFirmSearchResults] = useState([]);
  const [firmSearchLoading, setFirmSearchLoading] = useState(false);
  const [firmSearchLoadingMore, setFirmSearchLoadingMore] = useState(false);
  const [firmSearchPage, setFirmSearchPage] = useState(1);
  const [firmSearchHasMore, setFirmSearchHasMore] = useState(false);
  const [selectedFirmOptions, setSelectedFirmOptions] = useState([]);
  const firmAbortRef = useRef(null);
  const firmFetchIdRef = useRef(0);
  const listRef = useRef(null);
  const sentinelRef = useRef(null);
  const excludeSet = useRef(new Set());
  excludeSet.current = new Set(
    (excludeFirmIds || []).map((id) => String(id)).filter(Boolean),
  );

  const resetState = useCallback(() => {
    firmAbortRef.current?.abort();
    setFirmSearchQuery("");
    setFirmSearchResults([]);
    setFirmSearchLoading(false);
    setFirmSearchLoadingMore(false);
    setFirmSearchPage(1);
    setFirmSearchHasMore(false);
    setSelectedFirmOptions([]);
  }, []);

  const fetchFirmList = useCallback(
    async ({ pageNo = 1, search = "", append = false } = {}) => {
      const headers = getHeaders();
      if (!headers) return;

      let ac;
      let fetchId;
      if (!append) {
        firmAbortRef.current?.abort();
        ac = new AbortController();
        firmAbortRef.current = ac;
        fetchId = ++firmFetchIdRef.current;
        setFirmSearchLoading(true);
      } else {
        fetchId = firmFetchIdRef.current;
        setFirmSearchLoadingMore(true);
      }

      try {
        const base = API_BASE_URL.replace(/\/$/, "");
        const res = await axios.get(`${base}/firm/list`, {
          headers,
          signal: ac?.signal,
          params: {
            page_no: pageNo,
            limit: FIRM_LIST_LIMIT,
            search: String(search ?? ""),
          },
        });

        if (fetchId !== firmFetchIdRef.current) return;

        const data = res.data;
        if (!data?.success) {
          if (!append) setFirmSearchResults([]);
          setFirmSearchHasMore(false);
          return;
        }

        const list = Array.isArray(data.data) ? data.data : [];
        const options = list
          .map(mapFirmToOption)
          .filter((o) => o.value && !excludeSet.current.has(String(o.value)));

        setFirmSearchResults((prev) => {
          if (!append) return options;
          const seen = new Set(prev.map((o) => o.value));
          return [...prev, ...options.filter((o) => !seen.has(o.value))];
        });
        setFirmSearchPage(pageNo);
        const isLastPage =
          data.pagination?.is_last_page === true ||
          data.pagination?.is_last_page === 1 ||
          list.length < FIRM_LIST_LIMIT;
        setFirmSearchHasMore(!isLastPage);
      } catch (err) {
        if (
          axios.isCancel?.(err) ||
          err?.name === "AbortError" ||
          err?.name === "CanceledError"
        ) {
          return;
        }
        if (!append) setFirmSearchResults([]);
        setFirmSearchHasMore(false);
      } finally {
        if (fetchId === firmFetchIdRef.current) {
          setFirmSearchLoading(false);
          setFirmSearchLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    const delay = firmSearchQuery.trim() ? 400 : 0;
    const t = setTimeout(() => {
      fetchFirmList({ pageNo: 1, search: firmSearchQuery, append: false });
    }, delay);
    return () => {
      clearTimeout(t);
      firmAbortRef.current?.abort();
    };
  }, [open, firmSearchQuery, fetchFirmList, resetState]);

  const loadMoreFirms = useCallback(() => {
    if (firmSearchLoading || firmSearchLoadingMore || !firmSearchHasMore) return;
    fetchFirmList({
      pageNo: firmSearchPage + 1,
      search: firmSearchQuery,
      append: true,
    });
  }, [
    firmSearchLoading,
    firmSearchLoadingMore,
    firmSearchHasMore,
    firmSearchPage,
    firmSearchQuery,
    fetchFirmList,
  ]);

  const availableFirms = firmSearchResults.filter(
    (f) => !selectedFirmOptions.some((s) => s.value === f.value),
  );

  useEffect(() => {
    const root = listRef.current;
    const sentinel = sentinelRef.current;
    if (!open || !root || !sentinel || !firmSearchHasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreFirms();
      },
      { root, rootMargin: "48px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, firmSearchHasMore, availableFirms.length, firmSearchQuery, loadMoreFirms]);

  const addFirm = (opt) => {
    setSelectedFirmOptions((prev) =>
      prev.some((s) => s.value === opt.value) ? prev : [...prev, opt],
    );
  };

  const removeFirm = (opt) => {
    setSelectedFirmOptions((prev) => prev.filter((s) => s.value !== opt.value));
  };

  const addAllFirmsFromResults = () => {
    setSelectedFirmOptions((prev) => {
      const seen = new Set(prev.map((s) => s.value));
      return [
        ...prev,
        ...availableFirms.filter((o) => !seen.has(o.value)),
      ];
    });
  };

  const removeAllFirms = () => setSelectedFirmOptions([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const ids = selectedFirmOptions
      .map((o) => String(o.value || "").trim())
      .filter(Boolean);
    onSubmit?.(ids);
  };

  return (
    <GroupModalShell
      open={open}
      onClose={onClose}
      closeDisabled={saving}
      maxWidth="max-w-4xl"
      icon={FiPlus}
      title="Add Firms"
      subtitle="Search and select firms to add to this group"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">
              {selectedFirmOptions.length}
            </span>{" "}
            selected
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-firms-form"
              disabled={saving || selectedFirmOptions.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              Add Firms
            </button>
          </div>
        </div>
      }
    >
      <div
        className={MODAL_BODY_CLASS}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <form id="add-firms-form" onSubmit={handleSubmit} className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <FiUser className="w-4 h-4 text-indigo-600" />
            Firms
          </label>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 min-w-0">
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex flex-col h-72">
                <div className="p-3 border-b border-gray-200 bg-white shrink-0">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={firmSearchQuery}
                      onChange={(e) => setFirmSearchQuery(e.target.value)}
                      placeholder="Search firms..."
                      disabled={saving}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-50"
                    />
                  </div>
                </div>
                <div ref={listRef} className={`${LIST_SCROLL_CLASS} p-2 space-y-1.5`}>
                  {firmSearchLoading && availableFirms.length === 0 ? (
                    <FirmListSkeleton count={5} />
                  ) : null}
                  {!firmSearchLoading && availableFirms.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-6">
                      No firms found
                    </div>
                  ) : null}
                  {availableFirms.map((opt) => {
                    const f = opt.__firm;
                    const c = f?.client || {};
                    const fileNo = getFirmFileNo(f);
                    return (
                      <div
                        key={opt.value}
                        onClick={() => !saving && addFirm(opt)}
                        className="p-2.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                      >
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {f?.firm_name || opt.label}
                        </div>
                        {c.name ? (
                          <div className="text-xs text-gray-600 truncate">
                            {c.name}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-x-2 mt-0.5 text-xs text-gray-500">
                          {f?.pan_no || c.pan_number ? (
                            <span>PAN: {f?.pan_no || c.pan_number}</span>
                          ) : null}
                          {fileNo ? <span>File No: {fileNo}</span> : null}
                        </div>
                      </div>
                    );
                  })}
                  {firmSearchLoadingMore ? <FirmListSkeleton count={2} /> : null}
                  {firmSearchHasMore && !firmSearchLoadingMore ? (
                    <div ref={sentinelRef} className="h-1 shrink-0" aria-hidden />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 flex lg:flex-col justify-center items-center gap-2">
              <motion.button
                type="button"
                onClick={addAllFirmsFromResults}
                disabled={saving || availableFirms.length === 0}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                whileTap={{ scale: 0.95 }}
                aria-label="Add all visible firms"
              >
                <FiArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                type="button"
                onClick={removeAllFirms}
                disabled={saving || selectedFirmOptions.length === 0}
                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                whileTap={{ scale: 0.95 }}
                aria-label="Remove all selected firms"
              >
                <FiArrowLeft className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="lg:col-span-2 min-w-0">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-72 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-2 shrink-0">
                  <span className="text-sm font-medium text-gray-700">
                    Selected Firms
                  </span>
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                    {selectedFirmOptions.length}
                  </span>
                </div>
                <div className={`${LIST_SCROLL_CLASS} space-y-1.5`}>
                  {selectedFirmOptions.map((opt) => {
                    const f = opt.__firm;
                    const c = f?.client || {};
                    const fileNo = getFirmFileNo(f);
                    return (
                      <div
                        key={opt.value}
                        onClick={() => !saving && removeFirm(opt)}
                        className="p-2.5 bg-white border border-indigo-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
                      >
                        <div className="font-medium text-sm text-gray-800 truncate">
                          {f?.firm_name || opt.label}
                        </div>
                        {c.name ? (
                          <div className="text-xs text-gray-600 truncate">
                            {c.name}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-x-2 mt-0.5 text-xs text-gray-500">
                          {f?.pan_no || c.pan_number ? (
                            <span>PAN: {f?.pan_no || c.pan_number}</span>
                          ) : null}
                          {fileNo ? <span>File No: {fileNo}</span> : null}
                        </div>
                      </div>
                    );
                  })}
                  {selectedFirmOptions.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">
                      No firms selected
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </GroupModalShell>
  );
}

/** Remove a single firm from the group. */
export function GroupFirmsDeleteModal({
  firm,
  saving = false,
  onClose,
  onCancel,
  onConfirm,
}) {
  return (
    <GroupModalShell
      open={Boolean(firm)}
      onClose={onClose}
      closeDisabled={saving}
      maxWidth="max-w-sm"
      headerClass="bg-gradient-to-r from-red-600 to-rose-600"
      icon={FiTrash2}
      title="Remove firm?"
      subtitle={firm?.name || "Firm"}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            Remove
          </button>
        </div>
      }
    >
      <div
        className={MODAL_BODY_CLASS}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <p className="text-sm text-gray-600">
          Remove{" "}
          <span className="font-semibold text-gray-800">
            &ldquo;{firm?.name}&rdquo;
          </span>{" "}
          from this group? The firm itself will not be deleted.
        </p>
      </div>
    </GroupModalShell>
  );
}

/** Remove selected / all matching firms from the group. */
export function GroupFirmsBulkDeleteModal({
  open,
  saving = false,
  selectedCount = 0,
  selectAllAcrossPages = false,
  searchTerm = "",
  onClose,
  onCancel,
  onConfirm,
}) {
  return (
    <GroupModalShell
      open={open}
      onClose={onClose}
      closeDisabled={saving}
      maxWidth="max-w-sm"
      headerClass="bg-gradient-to-r from-red-600 to-rose-600"
      icon={FiTrash2}
      title="Remove selected?"
      subtitle={`${selectedCount.toLocaleString()} firm(s)`}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            Delete
          </button>
        </div>
      }
    >
      <div
        className={MODAL_BODY_CLASS}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <p className="text-sm text-gray-600">
          {selectAllAcrossPages ? (
            <>
              Remove all{" "}
              <span className="font-semibold text-gray-800">
                {selectedCount.toLocaleString()}
              </span>{" "}
              firm(s)
              {searchTerm.trim() ? " matching your search" : ""} from this group?
            </>
          ) : (
            <>
              Remove{" "}
              <span className="font-semibold text-gray-800">
                {selectedCount.toLocaleString()}
              </span>{" "}
              firm(s) from this group?
            </>
          )}
        </p>
      </div>
    </GroupModalShell>
  );
}
