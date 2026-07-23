import React from "react";

export function ImportSummary({ summary }) {
  const items = [
    { label: "Total Rows", value: summary.total, cls: "text-gray-800" },
    { label: "Valid", value: summary.valid, cls: "text-emerald-700" },
    { label: "Invalid", value: summary.invalid, cls: "text-red-700" },
    { label: "Ready to Import", value: summary.ready, cls: "text-indigo-700" },
    { label: "Imported", value: summary.imported, cls: "text-emerald-700" },
    { label: "Failed", value: summary.failed, cls: "text-red-700" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-gray-200 bg-gray-50/60 px-2.5 py-2 text-center"
        >
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
            {item.label}
          </div>
          <div className={`text-base font-bold tabular-nums ${item.cls}`}>
            {item.value ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}
