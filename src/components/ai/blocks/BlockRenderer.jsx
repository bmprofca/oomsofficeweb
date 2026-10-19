import React from 'react';
import AiTableBlock from './AiTableBlock';
import AiKpiBlock from './AiKpiBlock';
import AiChartBlock from './AiChartBlock';

/**
 * Renders structured blocks from the server (built from real tool rows).
 * Contract mirrors SERVER/ai/blocks.js. Unknown or malformed blocks render nothing —
 * model output is never rendered as HTML or executed.
 */
function isValid(block) {
  if (!block || typeof block !== 'object') return false;
  if (block.type === 'table') return Array.isArray(block.columns) && Array.isArray(block.rows);
  if (block.type === 'kpi') return Array.isArray(block.items);
  if (block.type === 'chart') return Array.isArray(block.series) && Array.isArray(block.data) && typeof block.xKey === 'string';
  if (block.type === 'clarification') return typeof block.question === 'string';
  return false;
}

export default function BlockRenderer({ block, onOption, disabled }) {
  if (!isValid(block)) return null;
  switch (block.type) {
    case 'table':
      return <AiTableBlock block={block} />;
    case 'kpi':
      return <AiKpiBlock block={block} />;
    case 'chart':
      return <AiChartBlock block={block} />;
    case 'clarification':
      return (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
          <p className="text-[13px] font-medium text-slate-800">{block.question}</p>
          {block.options?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {block.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={disabled}
                  onClick={() => onOption?.(opt)}
                  className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-[12px] font-medium text-indigo-700 transition-colors hover:bg-indigo-600 hover:text-white disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}
