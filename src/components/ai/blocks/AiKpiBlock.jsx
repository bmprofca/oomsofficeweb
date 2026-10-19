import React from 'react';
import { formatValue } from './format';

export default function AiKpiBlock({ block }) {
  const items = block.items || [];
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      {block.title && <p className="mb-2 text-[13px] font-semibold text-slate-900">{block.title}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
            <p className="truncate text-[11px] font-medium text-slate-500">{item.label}</p>
            <p className="mt-0.5 truncate font-display text-[15px] font-semibold tabular-nums text-slate-900">
              {formatValue(item.value, item.format)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
