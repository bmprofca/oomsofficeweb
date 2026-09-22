import React, { useCallback, useEffect, useState } from 'react';
import {
  FiMonitor,
  FiRefreshCw,
  FiShield,
  FiXCircle,
  FiLogOut,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../components/header';
import TablePagination from '../components/TablePagination';
import ConfirmActionModal from '../components/ConfirmActionModal';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />
);

const STATUS_FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'all', label: 'All' },
];

function methodLabel(method) {
  if (!method) return 'Unknown';
  const map = {
    email: 'Email',
    google: 'Google',
    mobile: 'Mobile OTP',
    facebook: 'Facebook',
    twitter: 'Twitter',
    truecaller: 'Truecaller',
  };
  return map[String(method).toLowerCase()] || String(method);
}

function formatSessionDateTime(value) {
  if (!value) return '—';
  const raw = String(value).trim();
  // MySQL "YYYY-MM-DD HH:mm:ss" → parse safely across browsers
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)
    ? raw.replace(' ', 'T')
    : raw;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const Sessions = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('sidebarMinimized');
    return saved ? JSON.parse(saved) : false;
  });
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
  });
  const [confirmState, setConfirmState] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchSessions = useCallback(
    async (page = pagination.page_no, limit = pagination.limit) => {
      setLoading(true);
      try {
        const headers = getHeaders();
        if (!headers) throw new Error('Authentication required');
        const qs = new URLSearchParams({
          status: statusFilter,
          page_no: String(page),
          limit: String(limit),
        });
        const res = await fetch(`${API_BASE_URL}/auth/sessions?${qs}`, {
          headers,
        });
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to load sessions');
        }
        setSessions(Array.isArray(result.data) ? result.data : []);
        if (result.pagination) {
          setPagination({
            page_no: Number(result.pagination.page_no || page),
            limit: Number(result.pagination.limit || limit),
            total: Number(result.pagination.total || 0),
            total_pages: Number(result.pagination.total_pages || 1),
          });
        }
      } catch (error) {
        console.error(error);
        toast.error(error.message || 'Failed to load sessions');
        setSessions([]);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, pagination.page_no, pagination.limit]
  );

  useEffect(() => {
    fetchSessions(pagination.page_no, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pagination.page_no, pagination.limit]);

  const openRevokeOne = (session) => {
    setConfirmState({
      type: 'one',
      tokenId: session.token_id,
      title: 'End Session',
      heading: 'End this session?',
      message:
        'This device or browser will be signed out immediately. You can sign in again later.',
      confirmLabel: 'End session',
    });
  };

  const openRevokeOthers = () => {
    setConfirmState({
      type: 'others',
      title: 'End Other Sessions',
      heading: 'End all other sessions?',
      message:
        'Every active login except this device will be signed out. This device stays signed in.',
      confirmLabel: 'End other sessions',
    });
  };

  const handleConfirm = async () => {
    if (!confirmState || submitting) return;
    setSubmitting(true);
    try {
      const headers = getHeaders();
      if (!headers) throw new Error('Authentication required');

      if (confirmState.type === 'one') {
        const res = await fetch(
          `${API_BASE_URL}/auth/sessions/${encodeURIComponent(
            confirmState.tokenId
          )}/revoke`,
          { method: 'POST', headers }
        );
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to revoke session');
        }
        toast.success('Session ended');
      } else {
        const res = await fetch(
          `${API_BASE_URL}/auth/sessions/revoke-others`,
          { method: 'POST', headers }
        );
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to end other sessions');
        }
        const revoked = Number(result.data?.revoked) || 0;
        toast.success(
          revoked
            ? `Ended ${revoked} other session${revoked === 1 ? '' : 's'}`
            : 'No other active sessions'
        );
      }

      setConfirmState(null);
      await fetchSessions(pagination.page_no, pagination.limit);
    } catch (error) {
      toast.error(error.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div
        className={`min-h-screen pt-16 transition-all duration-300 ease-in-out ${
          isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
        }`}
      >
        <div className="mx-2 my-3 sm:mx-4 md:mx-8 md:my-4">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-3 md:px-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                    <FiMonitor className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold leading-tight text-gray-800 md:text-lg">
                      Sessions
                    </h1>
                    <p className="text-xs text-gray-500">
                      Devices and browsers where you are signed in
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      fetchSessions(pagination.page_no, pagination.limit)
                    }
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    <FiRefreshCw
                      className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                    />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={openRevokeOthers}
                    disabled={loading || submitting}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    <FiXCircle className="h-3.5 w-3.5" />
                    End all other sessions
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-3 md:p-4">
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(f.key);
                      setPagination((prev) => ({ ...prev, page_no: 1 }));
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      statusFilter === f.key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonPulse key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
                  <FiShield className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    No{' '}
                    {statusFilter === 'all' ? '' : `${statusFilter} `}
                    sessions found
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {statusFilter === 'active'
                      ? 'You have no active logins in this list.'
                      : 'Try another filter to see more sessions.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold">#</th>
                          <th className="px-3 py-2.5 font-semibold">Method</th>
                          <th className="px-3 py-2.5 font-semibold">IP</th>
                          <th className="px-3 py-2.5 font-semibold">
                            Signed in
                          </th>
                          <th className="px-3 py-2.5 font-semibold">
                            Last used
                          </th>
                          <th className="px-3 py-2.5 font-semibold">Expires</th>
                          <th className="px-3 py-2.5 font-semibold">Status</th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sessions.map((session, idx) => {
                          const rowNo =
                            (pagination.page_no - 1) * pagination.limit +
                            idx +
                            1;
                          return (
                            <tr
                              key={session.token_id}
                              className={
                                session.is_current
                                  ? 'bg-indigo-50/50'
                                  : 'bg-white hover:bg-gray-50/80'
                              }
                            >
                              <td className="px-3 py-2.5 text-gray-500">
                                {rowNo}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-semibold text-gray-800">
                                    {methodLabel(session.login_method)}
                                  </span>
                                  {session.is_current ? (
                                    <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                      This device
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                                {session.last_ip || session.create_ip || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                                {formatSessionDateTime(session.create_date)}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                                {formatSessionDateTime(session.last_used_date)}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                                {formatSessionDateTime(session.expire_date)}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                      session.status === 'active'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {session.status}
                                  </span>
                                  {session.is_expired ? (
                                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                      Expired
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                {session.status === 'active' &&
                                !session.is_current ? (
                                  <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => openRevokeOne(session)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                                  >
                                    <FiXCircle className="h-3.5 w-3.5" />
                                    End
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {pagination.total > 0 ? (
                    <TablePagination
                      showRange
                      showRows
                      showJump
                      showFirstLast
                      rowOptions={[10, 20, 50, 100]}
                      defaultRows={10}
                      page={pagination.page_no}
                      limit={pagination.limit}
                      total={pagination.total}
                      totalPages={pagination.total_pages}
                      onPageChange={(page) =>
                        setPagination((prev) => ({ ...prev, page_no: page }))
                      }
                      onLimitChange={(limit) =>
                        setPagination((prev) => ({
                          ...prev,
                          limit,
                          page_no: 1,
                        }))
                      }
                    />
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(confirmState)}
        title={confirmState?.title || 'Confirm'}
        heading={confirmState?.heading || 'Are you sure?'}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        cancelLabel="Cancel"
        loading={submitting}
        tone="danger"
        icon={FiLogOut}
        onCancel={() => {
          if (!submitting) setConfirmState(null);
        }}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default Sessions;
