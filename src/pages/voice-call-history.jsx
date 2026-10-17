import React, { useEffect, useMemo, useState } from 'react';
import {
  FiPhoneCall,
  FiPhoneIncoming,
  FiPhoneOutgoing,
  FiRefreshCw,
  FiAlertCircle,
} from 'react-icons/fi';
import { Header, Sidebar } from '../components/header';
import { voiceCallApi } from '../services/voiceCallApi';
import CustomSelect from '../components/CustomSelect';
import TablePagination from '../components/TablePagination';
import { optionByValue } from '../utils/customSelectHelpers';

const DEFAULT_PAGE_SIZE = 25;

const STATUS_LABELS = {
  ringing: 'Ringing',
  accepted: 'In progress',
  rejected: 'Declined',
  cancelled: 'Cancelled',
  missed: 'Missed',
  ended: 'Completed',
  failed: 'Failed',
};

const DIRECTION_OPTIONS = [
  { value: '', label: 'All directions' },
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All outcomes' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

function parseCallDate(value) {
  if (!value) return null;
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCallDay(value) {
  const date = parseCallDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatCallTime(value) {
  const date = parseCallDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
}

function formatDuration(value) {
  if (value == null) return '—';
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Status pill: tint + word, never colour alone. */
function statusClass(status) {
  if (status === 'ended') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'accepted' || status === 'ringing') return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
  if (status === 'missed' || status === 'rejected' || status === 'failed') return 'bg-rose-50 text-rose-700 ring-rose-200';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

const TH = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap';
const TD = 'px-4 py-3 align-middle';

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      <td className={TD}><div className="ui-skeleton h-3 w-5" /></td>
      <td className={TD}>
        <div className="flex items-center gap-3">
          <div className="ui-skeleton h-9 w-9 rounded-full" />
          <div className="space-y-1.5"><div className="ui-skeleton h-3 w-32" /><div className="ui-skeleton h-2.5 w-24" /></div>
        </div>
      </td>
      <td className={TD}><div className="ui-skeleton h-5 w-20 rounded-full" /></td>
      <td className={TD}><div className="ui-skeleton h-3 w-28" /></td>
      <td className={TD}><div className="space-y-1.5"><div className="ui-skeleton h-3 w-24" /><div className="ui-skeleton h-2.5 w-14" /></div></td>
      <td className={TD}><div className="ui-skeleton h-5 w-20 rounded-full" /></td>
      <td className={`${TD} text-right`}><div className="ui-skeleton ml-auto h-3 w-12" /></td>
    </tr>
  );
}

export default function VoiceCallHistoryPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sidebarMinimized') || 'false');
    } catch {
      return false;
    }
  });
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [status, setStatus] = useState('');
  const [direction, setDirection] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    } catch {
      /* ignore */
    }
  }, [isMinimized]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    voiceCallApi
      .getHistory({
        page,
        limit,
        status: status || undefined,
        direction: direction || undefined,
      })
      .then((response) => {
        if (!active) return;
        setItems(response?.data?.items || []);
        setPagination(response?.data?.pagination || { page: 1, total: 0, total_pages: 1 });
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError?.response?.data?.message || requestError.message || 'Could not load call history.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [direction, page, limit, refreshKey, status]);

  const directionValue = useMemo(() => optionByValue(DIRECTION_OPTIONS, direction), [direction]);
  const statusValue = useMemo(() => optionByValue(STATUS_OPTIONS, status), [status]);
  const total = Number(pagination.total) || 0;
  const rowOffset = (page - 1) * limit;

  return (
    <div className="app-page">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />

      <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="mx-3 my-3 flex flex-col rounded-xl border border-slate-200 bg-white sm:mx-5 sm:my-4 lg:mx-8 lg:my-5">
          {/* Header */}
          <div className="border-b border-slate-200 px-4 py-3.5 md:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                  <FiPhoneCall className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 md:text-xl">Call history</h1>
                  <p className="mt-0.5 text-xs text-slate-500">In-app voice calls involving your account in this branch.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="w-44 min-w-[11rem]">
                  <CustomSelect
                    options={DIRECTION_OPTIONS}
                    value={directionValue}
                    onChange={(option) => {
                      setDirection(option?.value || '');
                      setPage(1);
                    }}
                    placeholder="All directions"
                    isSearchable={false}
                    isClearable={false}
                  />
                </div>
                <div className="w-44 min-w-[11rem]">
                  <CustomSelect
                    options={STATUS_OPTIONS}
                    value={statusValue}
                    onChange={(option) => {
                      setStatus(option?.value || '');
                      setPage(1);
                    }}
                    placeholder="All outcomes"
                    isSearchable={false}
                    isClearable={false}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRefreshKey((current) => current + 1)}
                  disabled={loading}
                  title="Refresh"
                  aria-label="Refresh call history"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50"
                >
                  <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th scope="col" className={`${TH} w-12`}>#</th>
                  <th scope="col" className={TH}>Participant</th>
                  <th scope="col" className={TH}>Direction</th>
                  <th scope="col" className={TH}>Branch</th>
                  <th scope="col" className={TH}>Date &amp; time</th>
                  <th scope="col" className={TH}>Outcome</th>
                  <th scope="col" className={`${TH} text-right`}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center" role="alert">
                        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                          <FiAlertCircle className="h-5 w-5" />
                        </span>
                        <p className="text-sm font-semibold text-slate-800">Unable to load call history</p>
                        <p className="mt-1 text-xs text-slate-500">{error}</p>
                        <button
                          type="button"
                          onClick={() => setRefreshKey((current) => current + 1)}
                          className="ui-btn ui-btn-secondary ui-btn-sm mt-4"
                        >
                          Try again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : items.length ? (
                  items.map((call, index) => {
                    const incoming = call.direction === 'incoming';
                    const name = call.other_participant_name || 'OOMS user';
                    return (
                      <tr key={call.call_id} className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50">
                        <td className={`${TD} text-xs font-semibold tabular-nums text-slate-500`}>{rowOffset + index + 1}</td>
                        <td className={TD}>
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-100">
                              {initials(name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{name}</p>
                              <p className="truncate font-mono text-xs text-slate-500">{call.other_participant_username || 'Unknown user'}</p>
                            </div>
                          </div>
                        </td>
                        <td className={TD}>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                              incoming ? 'bg-teal-50 text-teal-700 ring-teal-200' : 'bg-sky-50 text-sky-700 ring-sky-200'
                            }`}
                          >
                            {incoming ? <FiPhoneIncoming className="h-3.5 w-3.5" /> : <FiPhoneOutgoing className="h-3.5 w-3.5" />}
                            {incoming ? 'Incoming' : 'Outgoing'}
                          </span>
                        </td>
                        <td className={`${TD} text-slate-700`}>
                          <span className="block max-w-[14rem] truncate">{call.branch_name || call.branch_id || '—'}</span>
                        </td>
                        <td className={TD}>
                          <span className="block font-mono text-[13px] text-slate-800">{formatCallDay(call.create_date)}</span>
                          <span className="block font-mono text-xs text-slate-500">{formatCallTime(call.create_date)}</span>
                        </td>
                        <td className={TD}>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(call.status)}`}>
                            {STATUS_LABELS[call.status] || call.status}
                          </span>
                        </td>
                        <td className={`${TD} text-right font-mono tabular-nums text-slate-800`}>{formatDuration(call.duration_seconds)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <FiPhoneCall className="h-5 w-5" />
                        </span>
                        <p className="text-sm font-semibold text-slate-800">No calls found</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {status || direction ? 'Try another direction or outcome filter.' : 'Calls you make or receive in OOMS will appear here.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={page}
            limit={limit}
            total={total}
            totalPages={Math.max(1, Number(pagination.total_pages) || Math.ceil(total / limit) || 1)}
            rowOptions={[10, 25, 50, 100]}
            defaultRows={DEFAULT_PAGE_SIZE}
            onPageChange={(next) => setPage(next)}
            onLimitChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
