import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiExternalLink,
  FiLock,
  FiPaperclip,
  FiRefreshCw,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Header, Sidebar } from '../components/header';
import TablePagination from '../components/TablePagination';
import CustomSelect from '../components/CustomSelect';
import ConfirmActionModal from '../components/ConfirmActionModal';
import EmailActionMenu from './broadcast/email/EmailActionMenu';
import { useUserPermissions } from '../utils/permission-helper';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const STATUS_OPTIONS = [
  { value: '0', label: 'Pending' },
  { value: '1', label: 'Approved' },
  { value: '2', label: 'Rejected' },
  { value: '', label: 'All' },
];

const sk = 'animate-pulse rounded bg-slate-200/80';

const formatMoney = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
  }
  return raw;
};

const formatMobile = (mobile, countryCode) => {
  if (!mobile) return null;
  const cc = countryCode ? `+${String(countryCode).replace(/^\+/, '')} ` : '';
  return `${cc}${mobile}`;
};

function statusBadge(statusText) {
  const s = String(statusText || '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-50 text-emerald-700';
  if (s === 'rejected') return 'bg-rose-50 text-rose-700';
  return 'bg-amber-50 text-amber-800';
}

const TABLE_HEADERS = [
  { key: 'index', label: '#', align: 'left', width: '5%' },
  { key: 'staff', label: 'Staff', align: 'left', width: '18%' },
  { key: 'item', label: 'Item', align: 'left', width: '16%' },
  { key: 'amount', label: 'Amount', align: 'right', width: '12%' },
  { key: 'date', label: 'Date', align: 'left', width: '12%' },
  { key: 'status', label: 'Status', align: 'left', width: '10%' },
  { key: 'attachment', label: 'Attachment', align: 'left', width: '12%' },
  { key: 'reviewer', label: 'Reviewed by', align: 'left', width: '15%' },
  { key: 'actions', label: 'Actions', align: 'right', width: '8%' },
];

function TableHead() {
  return (
    <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
      <tr>
        {TABLE_HEADERS.map((h) => (
          <th
            key={h.key}
            style={{ width: h.width }}
            className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-700 ${
              h.align === 'right' ? 'text-right' : 'text-left'
            }`}
          >
            {h.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function PageSkeleton({ rows = 8 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/70" aria-busy="true">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-100/90 via-white to-emerald-50/40 py-2.5 px-3 sm:px-4 space-y-2.5">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className={`${sk} h-5 w-36`} />
          <div className={`${sk} h-9 flex-1 rounded-lg`} />
          <div className={`${sk} h-9 w-44 rounded-lg`} />
          <div className={`${sk} h-9 w-24 rounded-lg`} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-left text-sm">
          <TableHead />
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-3 py-2.5"><div className={`${sk} h-3.5 w-6`} /></td>
                <td className="px-3 py-2.5">
                  <div className={`${sk} h-3.5 w-28 mb-1`} />
                  <div className={`${sk} h-3 w-20`} />
                </td>
                <td className="px-3 py-2.5"><div className={`${sk} h-3.5 w-24`} /></td>
                <td className="px-3 py-2.5"><div className={`${sk} ml-auto h-3.5 w-16`} /></td>
                <td className="px-3 py-2.5"><div className={`${sk} h-3.5 w-20`} /></td>
                <td className="px-3 py-2.5"><div className={`${sk} h-5 w-16 rounded-full`} /></td>
                <td className="px-3 py-2.5"><div className={`${sk} h-3.5 w-12`} /></td>
                <td className="px-3 py-2.5">
                  <div className={`${sk} h-3.5 w-24 mb-1`} />
                  <div className={`${sk} h-3 w-20`} />
                </td>
                <td className="px-3 py-2.5"><div className={`${sk} ml-auto h-7 w-7 rounded-lg`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-3">
        <div className={`${sk} h-9 w-full max-w-md rounded-lg`} />
      </div>
    </div>
  );
}

export default function StaffExpensesReview() {
  const { check } = useUserPermissions();
  const canFinanceEntry = check('finance_entry');
  const canView = check('finance_report') || canFinanceEntry;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sidebarMinimized') || 'false');
    } catch {
      return false;
    }
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState('');

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter?.value]);

  const loadList = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter?.value !== undefined && statusFilter.value !== '') {
        params.set('status', statusFilter.value);
      }

      const res = await fetch(`${API_BASE_URL}/staff-expenses/admin-list?${params}`, {
        headers: getHeaders(),
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to load staff expenses');
      }
      setRows(Array.isArray(result.data) ? result.data : []);
      const pagination = result.pagination || {};
      setTotal(Number(pagination.total) || 0);
      setTotalPages(Number(pagination.total_pages) || 1);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to load staff expenses');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canView, page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const verifyExpense = async (expenseId, action, remarks = '') => {
    if (!canFinanceEntry) {
      toast.error('Need Access Permission');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/staff-expenses/verify`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expense_id: expenseId,
          action,
          remarks: remarks || undefined,
        }),
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.message || `Failed to ${action} expense`);
      }
      toast.success(result.message || (action === 'approve' ? 'Accepted' : 'Rejected'));
      setConfirmModal(null);
      setRejectRemarks('');
      await loadList();
    } catch (err) {
      console.error(err);
      toast.error(err.message || `Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const serialBase = (page - 1) * limit;

  const confirmTitle = useMemo(() => {
    if (!confirmModal) return '';
    return confirmModal.action === 'approve' ? 'Accept expense' : 'Reject expense';
  }, [confirmModal]);

  if (!canView) {
    return (
      <>
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
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${
            isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
          }`}
        >
          <div className="text-center text-slate-500">
            <FiLock className="mx-auto mb-2 h-8 w-8" />
            <p className="font-medium">Need finance access to view staff expenses</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
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
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          {loading && rows.length === 0 ? (
            <PageSkeleton rows={Math.min(limit, 8)} />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/70"
            >
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-100/90 via-white to-emerald-50/40 py-2.5 pl-3 pr-3 sm:pl-4 sm:pr-3 space-y-2.5">
                <div className="flex flex-col gap-2 min-w-0 xl:flex-row xl:items-center xl:gap-3">
                  <h5 className="text-sm font-bold tracking-tight text-slate-800 sm:text-base shrink-0 m-0">
                    Staff Expenses
                  </h5>

                  <div className="relative w-full min-w-0 flex-1 xl:min-w-[12rem]">
                    <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search staff, item, remark…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="w-full sm:w-44">
                    <CustomSelect
                      options={STATUS_OPTIONS}
                      value={statusFilter}
                      onChange={(opt) => setStatusFilter(opt || STATUS_OPTIONS[0])}
                      placeholder="Status"
                      isClearable={false}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={loadList}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <table className="min-w-full table-fixed text-left text-sm" aria-busy="true">
                    <TableHead />
                    <tbody>
                      {Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-3 py-2.5"><div className={`${sk} h-3.5 w-6`} /></td>
                          <td className="px-3 py-2.5">
                            <div className={`${sk} h-3.5 w-28 mb-1`} />
                            <div className={`${sk} h-3 w-20`} />
                          </td>
                          <td className="px-3 py-2.5"><div className={`${sk} h-3.5 w-24`} /></td>
                          <td className="px-3 py-2.5"><div className={`${sk} ml-auto h-3.5 w-16`} /></td>
                          <td className="px-3 py-2.5"><div className={`${sk} h-3.5 w-20`} /></td>
                          <td className="px-3 py-2.5"><div className={`${sk} h-5 w-16 rounded-full`} /></td>
                          <td className="px-3 py-2.5"><div className={`${sk} h-3.5 w-12`} /></td>
                          <td className="px-3 py-2.5">
                            <div className={`${sk} h-3.5 w-24 mb-1`} />
                            <div className={`${sk} h-3 w-20`} />
                          </td>
                          <td className="px-3 py-2.5"><div className={`${sk} ml-auto h-7 w-7 rounded-lg`} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="min-w-full table-fixed text-left text-sm font-sans">
                    <TableHead />
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-3 py-16 text-center text-sm text-slate-400">
                            No staff expenses found
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, idx) => {
                          const isPending = String(row.status) === '0' || row.status_text === 'pending';
                          const staffMobile = formatMobile(row.staff_mobile, row.staff_country_code);
                          const reviewerMobile = formatMobile(
                            row.approved_by_mobile,
                            row.approved_by_country_code
                          );
                          const actionItems = [];
                          if (row.attachment_url) {
                            actionItems.push({
                              label: 'View attachment',
                              icon: FiPaperclip,
                              onClick: () => window.open(row.attachment_url, '_blank', 'noopener,noreferrer'),
                            });
                          }
                          if (isPending && canFinanceEntry) {
                            actionItems.push({
                              label: 'Accept',
                              icon: FiCheckCircle,
                              onClick: () => {
                                setRejectRemarks('');
                                setConfirmModal({ action: 'approve', row });
                              },
                            });
                            actionItems.push({
                              label: 'Reject',
                              icon: FiXCircle,
                              danger: true,
                              onClick: () => {
                                setRejectRemarks('');
                                setConfirmModal({ action: 'reject', row });
                              },
                            });
                          } else if (isPending && !canFinanceEntry) {
                            actionItems.push({
                              label: 'Need permission',
                              icon: FiLock,
                              disabled: true,
                              onClick: () => toast.error('Need Access Permission'),
                            });
                          }

                          return (
                            <tr
                              key={row.expense_id}
                              className="border-b border-gray-100 bg-white hover:bg-blue-50/30 transition-colors"
                            >
                              <td className="px-3 py-2.5 text-[11px] font-bold text-gray-800 tabular-nums">
                                {serialBase + idx + 1}
                              </td>
                              <td className="px-3 py-2.5 min-w-0">
                                <div className="text-sm font-medium text-slate-800 truncate">
                                  {row.staff_name || '—'}
                                </div>
                                {staffMobile ? (
                                  <div className="text-[11px] text-slate-500 tabular-nums">{staffMobile}</div>
                                ) : null}
                                {row.description ? (
                                  <div
                                    className="mt-0.5 max-w-[14rem] truncate text-[11px] text-slate-400"
                                    title={row.description}
                                  >
                                    {row.description}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-slate-700 truncate">
                                {row.item_name || row.title || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                                {formatMoney(row.amount)}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-slate-600 tabular-nums whitespace-nowrap">
                                {formatDate(row.expense_date)}
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadge(
                                    row.status_text
                                  )}`}
                                >
                                  {row.status_text || 'pending'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                {row.attachment_url ? (
                                  <a
                                    href={row.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                                  >
                                    <FiPaperclip className="h-3.5 w-3.5" />
                                    View
                                    <FiExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 min-w-0">
                                {!isPending ? (
                                  <>
                                    <div className="text-sm font-medium text-slate-800 truncate">
                                      {row.approved_by_name || '—'}
                                    </div>
                                    {reviewerMobile ? (
                                      <div className="text-[11px] text-slate-500 tabular-nums">
                                        {reviewerMobile}
                                      </div>
                                    ) : null}
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                {actionItems.length ? (
                                  <EmailActionMenu
                                    buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                                    items={actionItems}
                                  />
                                ) : (
                                  <span className="text-xs text-slate-300">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <TablePagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                defaultRows={20}
                rowOptions={[5, 10, 20, 50, 100]}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            </motion.div>
          )}
        </div>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(confirmModal)}
        title={confirmTitle}
        heading={
          confirmModal?.action === 'approve'
            ? 'Accept this staff expense?'
            : 'Reject this staff expense?'
        }
        message={
          confirmModal
            ? `${confirmModal.row.item_name || confirmModal.row.title || 'Expense'} · ${formatMoney(
                confirmModal.row.amount
              )} · ${confirmModal.row.staff_name || 'Staff'}`
            : ''
        }
        confirmLabel={confirmModal?.action === 'approve' ? 'Accept' : 'Reject'}
        cancelLabel="Cancel"
        loading={actionLoading}
        tone={confirmModal?.action === 'approve' ? 'primary' : 'danger'}
        icon={confirmModal?.action === 'approve' ? FiCheckCircle : FiXCircle}
        onCancel={() => {
          if (actionLoading) return;
          setConfirmModal(null);
          setRejectRemarks('');
        }}
        onConfirm={() => {
          if (!confirmModal) return;
          verifyExpense(
            confirmModal.row.expense_id,
            confirmModal.action,
            confirmModal.action === 'reject' ? rejectRemarks : ''
          );
        }}
      >
        {confirmModal?.action === 'reject' ? (
          <textarea
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            rows={3}
            disabled={actionLoading}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-400/40"
            placeholder="Reason (optional)"
          />
        ) : null}
      </ConfirmActionModal>
    </>
  );
}
