import React, { useRef } from "react";
import { FiUpload, FiDownload } from "react-icons/fi";

export function UploadStep({ file, busy, error, onFile, onDownloadSample }) {
  const inputRef = useRef(null);

  const openPicker = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={openPicker}
        disabled={busy}
        className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl p-6 text-center bg-gray-50/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-gray-700 mb-1">
          Upload Excel (.xlsx / .xls)
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Click anywhere in this area to browse. First row = headers; first sheet
          only.
        </p>
        <span className="inline-flex px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg pointer-events-none">
          Choose File
        </span>
        {file ? (
          <p className="mt-3 text-xs font-semibold text-indigo-700">
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            e.target.value = "";
            if (f) onFile?.(f);
          }}
        />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3">
        <div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            Sample file
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Download a template with PAN and Firm Name columns
          </p>
        </div>
        <button
          type="button"
          onClick={onDownloadSample}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          <FiDownload className="w-3.5 h-3.5" />
          Download Sample File
        </button>
      </div>

      {error ? (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-medium text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
