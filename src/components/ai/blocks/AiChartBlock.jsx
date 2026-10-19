import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatValue } from './format';

// Brand blue first, then distinguishable accents (same family as dashboard widgets).
const COLORS = ['#1A73E8', '#13D180', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#64748B'];

function shortLabel(v) {
  const s = String(v ?? '');
  return s.length > 14 ? `${s.slice(0, 13)}…` : s;
}

export default function AiChartBlock({ block }) {
  const data = block.data || [];
  if (!data.length) return null;
  const series = block.series || [];
  const isMoney = /amount|sales|expense|balance/i.test(series.map((s) => s.key).join(' '));
  const fmt = (v) => formatValue(v, isMoney ? 'money' : 'number');

  let chart;
  if (block.kind === 'pie') {
    const s = series[0];
    chart = (
      <PieChart>
        <Pie data={data} dataKey={s.key} nameKey={block.xKey} outerRadius={80} label={(d) => shortLabel(d[block.xKey])}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={fmt} />
      </PieChart>
    );
  } else {
    const Chart = block.kind === 'line' ? LineChart : BarChart;
    chart = (
      <Chart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey={block.xKey} tickFormatter={shortLabel} tick={{ fontSize: 11, fill: '#64748B' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} width={56} tickFormatter={(v) => (isMoney ? `₹${Number(v).toLocaleString('en-IN', { notation: 'compact' })}` : v)} />
        <Tooltip formatter={fmt} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s, i) =>
          block.kind === 'line' ? (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ) : (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={36} />
          )
        )}
      </Chart>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-[13px] font-semibold text-slate-900">{block.title}</p>
      <div className="h-56 w-full" role="img" aria-label={block.title}>
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
