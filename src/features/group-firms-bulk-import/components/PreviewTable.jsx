import React from "react";
import { FiTrash2 } from "react-icons/fi";
import {
  LocalStatusBadge,
  ServerStatusBadge,
  ImportStatusBadge,
} from "./StatusBadge";
import { ImportSummary } from "./ImportSummary";

export function PreviewTable({
  rows = [],
  summary,
  busy,
  error,
  importDone,
  onDelete,
}) {
  return (
    <div className="space-y-4">
      <ImportSummary summary={summary} />

      {error ? (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-14" />
            <col className="w-[12%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-20" />
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {[
                "#",
                "PAN",
                "Firm Name",
                "Local Validation",
                "Server Validation",
                "Final Status",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-10 text-center text-sm text-gray-400"
                >
                  No preview rows
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50/80"
                >
                  <td className="px-3 py-2.5 text-xs font-semibold text-gray-700 tabular-nums align-top">
                    {idx + 1}
                    <span className="block text-[10px] font-normal text-gray-400">
                      Excel {row.rowNumber}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono font-semibold text-gray-800 align-top break-all">
                    {row.pan || "—"}
                  </td>
                  <td
                    className="px-3 py-2.5 text-xs text-gray-700 align-top truncate"
                    title={row.name}
                  >
                    {row.name || "—"}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <LocalStatusBadge
                      status={row.localStatus}
                      errors={row.errors}
                    />
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <ServerStatusBadge status={row.serverStatus} />
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <ImportStatusBadge status={row.importStatus} />
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {!importDone ? (
                      <button
                        type="button"
                        onClick={() => onDelete?.(row.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40"
                        title="Delete row"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
