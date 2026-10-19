import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';
import TablePagination from '../../TablePagination';
import { buildHref, formatValue, statusTone } from './format';

const PAGE_SIZE = 10;

// Spreadsheet formula injection guard: cells starting with = + - @ are prefixed.
function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function tableToCsv(block) {
  const header = block.columns.map((c) => csvCell(c.label)).join(',');
  const body = block.rows.map((row) => block.columns.map((c) => csvCell(row[c.key])).join(','));
  return [header, ...body].join('\n');
}

function downloadCsv(block) {
  const blob = new Blob([`﻿${tableToCsv(block)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(block.title || 'ooms-report').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'ooms-report'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Cell({ column, row }) {
  const value = row[column.key];
  const text = formatValue(value, column.type);
  const href = column.href ? buildHref(column.href, row) : null;
  if (column.type === 'status' && value) {
    return (
      <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${statusTone(value)}`}>
        {text}
      </span>
    );
  }
  if (href) {
    return (
      <Link to={href} className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
        {text}
      </Link>
    );
  }
  return <>{text}</>;
}

export default function AiTableBlock({ block }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const rows = useMemo(() => block.rows || [], [block.rows]);
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const visible = useMemo(() => rows.slice((page - 1) * limit, page * limit), [rows, page, limit]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-900">{block.title}</p>
          <p className="text-[11px] text-slate-500">
            {block.total > rows.length ? `${rows.length} of ${block.total} records` : `${rows.length} record${rows.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {rows.length > 0 && (
          <button type="button" onClick={() => downloadCsv(block)} className="ui-btn ui-btn-ghost ui-btn-sm shrink-0" title="Download CSV">
            <FiDownload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-center text-[13px] text-slate-500">No matching records found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[12.5px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                {block.columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={`whitespace-nowrap px-3 py-2 font-semibold ${c.type === 'money' || c.type === 'number' ? 'text-right' : ''}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  {block.columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 align-top text-slate-700 ${c.type === 'money' || c.type === 'number' ? 'whitespace-nowrap text-right tabular-nums' : ''}`}
                    >
                      <Cell column={c} row={row} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > limit && (
        <TablePagination
          page={page}
          limit={limit}
          total={rows.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          rowOptions={[10, 20, 50]}
          defaultRows={PAGE_SIZE}
          showJump={false}
          showFirstLast={false}
        />
      )}
      {block.note && <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-500">{block.note}</p>}
    </div>
  );
}
