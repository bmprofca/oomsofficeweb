import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiFile,
  FiFileText,
  FiHardDrive,
  FiImage,
  FiLoader,
  FiArchive,
  FiFilm,
  FiMusic,
  FiX,
} from "react-icons/fi";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import API_BASE_URL from "../../utils/api-controller";
import getHeaders from "../../utils/get-headers";

const TYPE_META = {
  pdf: { color: "#ef4444", icon: FiFileText },
  image: { color: "#06b6d4", icon: FiImage },
  spreadsheet: { color: "#22c55e", icon: FiFile },
  document: { color: "#3b82f6", icon: FiFileText },
  archive: { color: "#a855f7", icon: FiArchive },
  video: { color: "#f59e0b", icon: FiFilm },
  audio: { color: "#ec4899", icon: FiMusic },
  text: { color: "#64748b", icon: FiFileText },
  other: { color: "#94a3b8", icon: FiFile },
};

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
      <p className="text-xs text-slate-500 mt-0.5">
        {formatBytes(item.bytes)} · {item.count} file{item.count === 1 ? "" : "s"}
      </p>
      <p className="text-xs text-slate-400">{item.percent}% of used</p>
    </div>
  );
}

/**
 * Modal: client document storage usage broken down by file type.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - clientUsername: string
 * - storageLimitBytes?: number (fallback display only; API returns limit)
 */
const DocumentStorageUsageModal = ({
  open,
  onClose,
  clientUsername,
  storageLimitBytes = 5 * 1024 * 1024 * 1024,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const fetchUsage = useCallback(async () => {
    if (!clientUsername) {
      setError("Client username is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = getHeaders();
      if (!headers) {
        throw new Error("Authentication headers not found");
      }

      const response = await fetch(
        `${API_BASE_URL}/client/details/documents/storage-usage?username=${encodeURIComponent(clientUsername)}`,
        { method: "GET", headers }
      );
      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || "Failed to load storage usage");
      }

      setData(result.data);
    } catch (err) {
      setData(null);
      setError(err.message || "Failed to load storage usage");
    } finally {
      setLoading(false);
    }
  }, [clientUsername]);

  useEffect(() => {
    if (!open) return undefined;
    fetchUsage();

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, fetchUsage, onClose]);

  const chartData = useMemo(() => {
    const rows = Array.isArray(data?.by_type) ? data.by_type : [];
    return rows
      .filter((row) => Number(row.bytes) > 0)
      .map((row) => ({
        ...row,
        value: Number(row.bytes) || 0,
        color: TYPE_META[row.type]?.color || TYPE_META.other.color,
      }));
  }, [data]);

  const usedBytes = Number(data?.used_bytes) || 0;
  const limitBytes = Number(data?.limit_bytes) || storageLimitBytes;
  const usedPercent = Math.min(
    100,
    Number(data?.used_percent) || (limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0)
  );
  const barColor =
    usedPercent >= 90 ? "bg-rose-500" : usedPercent >= 70 ? "bg-amber-500" : "bg-emerald-500";

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          type="button"
          aria-label="Close storage usage modal"
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          onClick={onClose}
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="storage-usage-title"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                <FiHardDrive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2
                  id="storage-usage-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Storage usage
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Breakdown by file type for this client
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-5.5rem)] px-6 py-5 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                <FiLoader className="w-7 h-7 animate-spin text-slate-400" />
                <p className="text-sm">Loading storage usage…</p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center">
                <p className="text-sm text-rose-700 font-medium">{error}</p>
                <button
                  type="button"
                  onClick={fetchUsage}
                  className="mt-3 text-sm text-rose-600 underline hover:text-rose-800"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Used
                      </p>
                      <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                        {formatBytes(usedBytes)}
                        <span className="text-sm font-medium text-slate-400 ml-2">
                          / {formatBytes(limitBytes)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Files</p>
                      <p className="text-lg font-semibold text-slate-800 tabular-nums">
                        {Number(data?.total_files) || 0}
                      </p>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {usedPercent.toFixed(1)}% of quota ·{" "}
                    {formatBytes(Number(data?.remaining_bytes) || Math.max(0, limitBytes - usedBytes))}{" "}
                    remaining
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="h-64 relative">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={92}
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={2}
                          >
                            {chartData.map((entry) => (
                              <Cell key={entry.type} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        No files uploaded yet
                      </div>
                    )}
                    {chartData.length > 0 && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xs text-slate-400">Total</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {formatBytes(usedBytes)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {chartData.length === 0 ? (
                      <p className="text-sm text-slate-400 py-8 text-center">
                        Upload documents to see type usage here.
                      </p>
                    ) : (
                      chartData.map((row) => {
                        const Icon = TYPE_META[row.type]?.icon || FiFile;
                        return (
                          <div
                            key={row.type}
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5"
                          >
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${row.color}18`, color: row.color }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-slate-800 truncate">
                                  {row.label}
                                </p>
                                <p className="text-xs font-semibold text-slate-600 tabular-nums shrink-0">
                                  {row.percent}%
                                </p>
                              </div>
                              <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.max(row.percent, 1)}%`,
                                    backgroundColor: row.color,
                                  }}
                                />
                              </div>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {formatBytes(row.bytes)} · {row.count} file
                                {row.count === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default DocumentStorageUsageModal;
