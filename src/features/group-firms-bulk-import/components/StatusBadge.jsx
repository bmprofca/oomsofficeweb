import React from "react";
import {
  LOCAL_STATUS,
  SERVER_STATUS,
  IMPORT_STATUS,
} from "../constants";

const STYLES = {
  green:
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow:
    "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  gray: "bg-gray-50 text-gray-600 border-gray-200",
};

export function StatusBadge({ tone = "gray", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STYLES[tone] || STYLES.gray}`}
    >
      {children}
    </span>
  );
}

export function LocalStatusBadge({ status, errors = [] }) {
  if (status === LOCAL_STATUS.VALID) {
    return <StatusBadge tone="green">✔ Valid</StatusBadge>;
  }
  if (status === LOCAL_STATUS.INVALID) {
    return (
      <div className="space-y-1">
        <StatusBadge tone="red">❌ Invalid</StatusBadge>
        {errors.length > 0 ? (
          <ul className="list-disc pl-4 text-[10px] text-red-600 space-y-0.5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  return <StatusBadge tone="yellow">Pending</StatusBadge>;
}

export function ServerStatusBadge({ status }) {
  switch (status) {
    case SERVER_STATUS.READY:
      return <StatusBadge tone="green">Ready to Import</StatusBadge>;
    case SERVER_STATUS.ALREADY_EXISTS:
      return <StatusBadge tone="red">Already Exists</StatusBadge>;
    case SERVER_STATUS.NOT_FOUND:
      return <StatusBadge tone="red">Firm Not Found</StatusBadge>;
    case SERVER_STATUS.ERROR:
      return <StatusBadge tone="red">Error</StatusBadge>;
    default:
      return <StatusBadge tone="yellow">Pending Validation</StatusBadge>;
  }
}

export function ImportStatusBadge({ status }) {
  switch (status) {
    case IMPORT_STATUS.IMPORTED:
      return <StatusBadge tone="green">Imported</StatusBadge>;
    case IMPORT_STATUS.FAILED:
      return <StatusBadge tone="red">Failed</StatusBadge>;
    case IMPORT_STATUS.SKIPPED:
      return <StatusBadge tone="gray">Skipped</StatusBadge>;
    default:
      return <StatusBadge tone="yellow">Pending</StatusBadge>;
  }
}
