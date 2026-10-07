import React, { useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiPhoneCall, FiRefreshCw } from 'react-icons/fi';
import { Header, Sidebar } from '../components/header';
import { voiceCallApi } from '../services/voiceCallApi';

const PAGE_SIZE = 25;

const STATUS_LABELS = {
  ringing: 'Ringing',
  accepted: 'In progress',
  rejected: 'Declined',
  cancelled: 'Cancelled',
  missed: 'Missed',
  ended: 'Completed',
  failed: 'Failed',
};

function formatCallDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDuration(value) {
  if (value == null) return '—';
  const seconds = Math.max(0, Number(value));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function statusStyle(status) {
  if (status === 'ended' || status === 'accepted') return 'bg-emerald-50 text-emerald-700';
  if (status === 'missed' || status === 'rejected' || status === 'failed') return 'bg-rose-50 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

function CallHistoryRow({ call }) {
  const incoming = call.direction === 'incoming';
  return (
    <article className="grid gap-3 border-b border-slate-200 px-4 py-4 last:border-b-0 sm:px-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_90px] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${incoming ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'}`}>
          <FiPhoneCall className={`h-4 w-4 ${incoming ? '-rotate-45' : 'rotate-135'}`} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{call.other_participant_name || 'OOMS user'}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{call.other_participant_username || 'Unknown user'}</p>
        </div>
      </div>
      <div className="min-w-0 pl-[52px] md:pl-0">
        <p className="truncate text-sm text-slate-700">{call.branch_name || call.branch_id || 'Branch unavailable'}</p>
        <p className="mt-0.5 text-xs capitalize text-slate-500">{call.direction} call · {formatCallDate(call.create_date)}</p>
      </div>
      <div className="flex items-center gap-2 pl-[52px] md:pl-0">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(call.status)}`}>
          {STATUS_LABELS[call.status] || call.status}
        </span>
      </div>
      <div className="pl-[52px] text-xs font-medium text-slate-600 md:pl-0 md:text-right">
        {formatDuration(call.duration_seconds)}
      </div>
    </article>
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
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [status, setStatus] = useState('');
  const [direction, setDirection] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    voiceCallApi.getHistory({
      page: pagination.page,
      limit: PAGE_SIZE,
      status: status || undefined,
      direction: direction || undefined,
    })
      .then((response) => {
        if (!active) return;
        setItems(response?.data?.items || []);
        setPagination(response?.data?.pagination || { page: 1, total: 0, total_pages: 1 });
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || requestError.message || 'Could not load call history.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [direction, pagination.page, refreshKey, status]);

  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const pageChange = (nextPage) => {
    setPagination((current) => ({ ...current, page: nextPage }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
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
      <main className={`min-h-screen pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase text-teal-700">OOMS voice</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Call history</h1>
              <p className="mt-1 text-sm text-slate-500">Calls involving your account in this branch.</p>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </header>

          <section className="mt-2 flex flex-wrap items-end justify-between gap-4" aria-label="Call history filters">
            <div className="flex flex-wrap gap-3">
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Direction
                <select value={direction} onChange={changeFilter(setDirection)} className="h-10 min-w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-teal-600">
                  <option value="">All directions</option>
                  <option value="incoming">Incoming</option>
                  <option value="outgoing">Outgoing</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Outcome
                <select value={status} onChange={changeFilter(setStatus)} className="h-10 min-w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-teal-600">
                  <option value="">All outcomes</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-sm text-slate-500">{pagination.total} {pagination.total === 1 ? 'call' : 'calls'}</p>
          </section>

          <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Call records">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_90px] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase text-slate-500 md:grid">
              <span>Participant</span><span>Branch and time</span><span>Outcome</span><span className="text-right">Duration</span>
            </div>
            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500" role="status">Loading call history...</div>
            ) : error ? (
              <div className="px-5 py-12 text-center" role="alert">
                <p className="text-sm font-semibold text-rose-700">{error}</p>
                <button type="button" onClick={() => setRefreshKey((current) => current + 1)} className="mt-3 text-sm font-semibold text-teal-700 hover:underline">Try again</button>
              </div>
            ) : items.length ? (
              items.map((call) => <CallHistoryRow key={call.call_id} call={call} />)
            ) : (
              <div className="px-5 py-16 text-center">
                <FiPhoneCall className="mx-auto h-8 w-8 text-slate-400" />
                <h2 className="mt-3 text-base font-semibold text-slate-800">No calls found</h2>
                <p className="mt-1 text-sm text-slate-500">Try another outcome or direction filter.</p>
              </div>
            )}
          </section>

          <footer className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.total_pages}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => pageChange(pagination.page - 1)} disabled={loading || pagination.page <= 1} aria-label="Previous page" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                <FiChevronLeft />
              </button>
              <button type="button" onClick={() => pageChange(pagination.page + 1)} disabled={loading || pagination.page >= pagination.total_pages} aria-label="Next page" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                <FiChevronRight />
              </button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}