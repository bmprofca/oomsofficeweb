import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiEye,
  FiEdit2,
  FiClock,
  FiRefreshCw,
  FiMoreVertical,
  FiCheckCircle,
  FiCalendar,
  FiLayers,
} from 'react-icons/fi';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import TablePagination from '../components/TablePagination';
import SalaryAssignmentModal from '../components/Modals/SalaryAssignmentModal';

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return '—';
  const raw = String(value);
  let date;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function formatDurationMinutes(total) {
  const n = Math.max(0, Number(total) || 0);
  if (!n) return '—';
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function toYmd(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Active assignment covering the current calendar month → Current. */
function isCurrentForThisMonth(row) {
  if (!row || String(row.status || '').toLowerCase() !== 'active') return false;
  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const from = toYmd(row.effective_from);
  const to = row.effective_to ? toYmd(row.effective_to) : null;
  if (!from) return true;
  if (from > monthEnd) return false;
  if (to && to < monthStart) return false;
  return true;
}

function buildPayload(username, form) {
  const isFlexible = form.salary_type === 'flexible';
  const expectedMinutes = isFlexible ? null : parseInt(form.expected_minutes, 10);
  const monthlyMinutes = isFlexible ? parseInt(form.monthly_working_minutes, 10) : null;
  const graceMinutes = isFlexible ? null : parseInt(form.grace_period_minutes, 10);
  const breakMinutes = parseInt(form.allowed_break_minutes, 10);
  return {
    username,
    salary_type: form.salary_type,
    monthly_salary: parseFloat(form.monthly_salary),
    monthly_working_minutes: Number.isFinite(monthlyMinutes) ? monthlyMinutes : null,
    effective_from: form.effective_from,
    working_hours_start: form.working_hours_start,
    working_hours_end: form.working_hours_end,
    expected_minutes: Number.isFinite(expectedMinutes) ? expectedMinutes : null,
    grace_period_minutes: Number.isFinite(graceMinutes) ? graceMinutes : null,
    overtime_enabled: isFlexible ? false : !!form.overtime_enabled,
    fine_enabled: isFlexible ? false : !!form.fine_enabled,
    day_off_days: isFlexible ? [] : Array.isArray(form.day_off_days) ? form.day_off_days : [],
    allowed_break_minutes: Number.isFinite(breakMinutes) ? breakMinutes : 30,
  };
}

function validateForm(form) {
  if (!form.monthly_salary || !form.effective_from) {
    return 'Amount and effective from are required';
  }
  if (
    form.salary_type === 'flexible' &&
    (!form.monthly_working_minutes || Number(form.monthly_working_minutes) <= 0)
  ) {
    return 'Monthly working time is required for flexible salary';
  }
  if (
    form.salary_type === 'fixed' &&
    (!form.expected_minutes || Number(form.expected_minutes) <= 0)
  ) {
    return 'Expected working time is required for fixed salary';
  }
  return null;
}

function StatusChip({ row }) {
  if (isCurrentForThisMonth(row)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <FiCheckCircle className="w-3 h-3" />
        Current
      </span>
    );
  }
  const status = String(row.status || '').toLowerCase();
  if (status === 'scheduled') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
        <FiCalendar className="w-3 h-3" />
        Scheduled
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
        <FiCheckCircle className="w-3 h-3" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
      <FiLayers className="w-3 h-3" />
      Expired
    </span>
  );
}

function TypeChip({ type }) {
  const isFlexible = String(type || 'fixed').toLowerCase() === 'flexible';
  if (isFlexible) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
        <FiClock className="w-3 h-3" />
        Flexible
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
      Fixed
    </span>
  );
}

const TableHead = () => (
  <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
    <tr>
      <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700 w-[6%]">
        #
      </th>
      <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700 w-[16%]">
        Amount
      </th>
      <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700 w-[14%]">
        Type
      </th>
      <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700 w-[14%]">
        Hours
      </th>
      <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700 w-[18%]">
        Effective from
      </th>
      <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700 w-[16%]">
        Status
      </th>
      <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-gray-700 w-[10%]">
        Actions
      </th>
    </tr>
  </thead>
);

const TableSkeleton = ({ rows = 6 }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full table-fixed text-left text-sm font-sans">
      <TableHead />
      <tbody>
        {Array.from({ length: rows }, (_, i) => (
          <tr key={`sk-${i}`} className="border-b border-gray-100">
            {Array.from({ length: 7 }, (_, j) => (
              <td key={`sk-${i}-${j}`} className="px-3 py-2.5">
                <div className="h-3.5 animate-pulse rounded bg-slate-200/90 w-full max-w-[5rem]" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SalaryTab = ({ username: usernameProp, staffName: staffNameProp, variants, readOnly = false }) => {
  const username = usernameProp || '';
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [salaryData, setSalaryData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [weeklyOffData, setWeeklyOffData] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [showActionMenu, setShowActionMenu] = useState(null);
  const [menuEntry, setMenuEntry] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const actionAnchorRef = useRef(null);

  const fetchWeeklyOff = useCallback(async (staffUsername) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/salary/admin/get-weekly-off?username=${encodeURIComponent(staffUsername)}`,
        { method: 'GET', headers: getHeaders() }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to fetch weekly off');
      setWeeklyOffData(data.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchSalaryHistory = useCallback(async (staffUsername) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${API_BASE_URL}/salary/admin/salary-history?username=${encodeURIComponent(staffUsername)}`,
        { method: 'GET', headers: getHeaders() }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch salary history');
      }

      setSalaryData(result.data);
      const rows = [];
      const pushRow = (item, status) => {
        if (!item) return;
        rows.push({
          ...item,
          status: item.status || status,
          status_display:
            (item.status || status) === 'active'
              ? 'Active'
              : (item.status || status) === 'scheduled'
                ? 'Scheduled'
                : 'Expired',
        });
      };
      pushRow(result.data.current, 'active');
      (result.data.scheduled || []).forEach((s) => pushRow(s, 'scheduled'));
      (result.data.history || []).forEach((s) => pushRow(s, 'expired'));
      setAssignments(rows);
      setPage(1);
    } catch (err) {
      setError(err.message);
      setAssignments([]);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!username) return;
    fetchSalaryHistory(username);
    fetchWeeklyOff(username);
  }, [username, fetchSalaryHistory, fetchWeeklyOff]);

  const totalPages = Math.max(1, Math.ceil(assignments.length / limit) || 1);
  const paged = useMemo(() => {
    const start = (page - 1) * limit;
    return assignments.slice(start, start + limit);
  }, [assignments, page, limit]);
  const serialBase = (page - 1) * limit;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const computeActionMenuPosition = useCallback((anchorEl, itemCount = 2) => {
    if (!anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = 8 + itemCount * 36;
    const gap = 8;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const space = {
      top: rect.top - margin,
      bottom: vh - rect.bottom - margin,
      right: vw - rect.right - margin,
      left: rect.left - margin,
    };

    const fits = {
      top: space.top >= menuHeight + gap,
      bottom: space.bottom >= menuHeight + gap,
      right: space.right >= menuWidth + gap,
      left: space.left >= menuWidth + gap,
    };

    const preferred = ['top', 'bottom', 'right', 'left'];
    let placement = preferred.find((p) => fits[p]);
    if (!placement) {
      placement = preferred.reduce(
        (best, p) => (space[p] > space[best] ? p : best),
        'bottom'
      );
    }

    let top = 0;
    let left = 0;

    if (placement === 'top') {
      top = rect.top - menuHeight - gap;
      left = rect.left + rect.width / 2 - menuWidth / 2;
    } else if (placement === 'bottom') {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - menuWidth / 2;
    } else if (placement === 'right') {
      top = rect.top + rect.height / 2 - menuHeight / 2;
      left = rect.right + gap;
    } else {
      top = rect.top + rect.height / 2 - menuHeight / 2;
      left = rect.left - menuWidth - gap;
    }

    const clampedLeft = Math.max(margin, Math.min(left, vw - menuWidth - margin));
    const clampedTop = Math.max(margin, Math.min(top, vh - menuHeight - margin));
    const anchorCenterX = rect.left + rect.width / 2;
    const anchorCenterY = rect.top + rect.height / 2;

    return {
      top: clampedTop,
      left: clampedLeft,
      placement,
      arrowX: Math.max(12, Math.min(menuWidth - 12, anchorCenterX - clampedLeft)),
      arrowY: Math.max(12, Math.min(menuHeight - 12, anchorCenterY - clampedTop)),
    };
  }, []);

  const closeActionMenu = useCallback(() => {
    setShowActionMenu(null);
    actionAnchorRef.current = null;
  }, []);

  useEffect(() => {
    if (!showActionMenu || !actionAnchorRef.current) return undefined;

    const menuCount = menuEntry && String(menuEntry.status) !== 'expired' ? 2 : 1;

    const updatePosition = () => {
      setActionMenuPosition(
        computeActionMenuPosition(actionAnchorRef.current, menuCount)
      );
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') closeActionMenu();
    };

    const handleOutside = (e) => {
      if (
        actionAnchorRef.current?.contains(e.target) ||
        e.target.closest?.('[data-salary-action-menu]')
      ) {
        return;
      }
      closeActionMenu();
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleOutside);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [showActionMenu, menuEntry, computeActionMenuPosition, closeActionMenu]);

  const rowKey = (row) => row.assignment_id || row.salary_id || row.id;

  const toggleActionMenu = (e, row) => {
    e.stopPropagation();
    const key = rowKey(row);
    const willOpen = showActionMenu !== key;
    if (willOpen) {
      const itemCount = String(row.status) !== 'expired' ? 2 : 1;
      actionAnchorRef.current = e.currentTarget;
      setMenuEntry(row);
      setShowActionMenu(key);
      setActionMenuPosition(computeActionMenuPosition(e.currentTarget, itemCount));
      return;
    }
    closeActionMenu();
  };

  const openCreate = () => {
    if (readOnly) return;
    closeActionMenu();
    setSelectedAssignment(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    if (readOnly) return;
    closeActionMenu();
    setSelectedAssignment(row);
    setModalMode('edit');
    setModalOpen(true);
  };

  const openView = (row) => {
    closeActionMenu();
    setSelectedAssignment(row);
    setModalMode('view');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setSelectedAssignment(null);
  };

  const handleModalSubmit = async (form) => {
    if (!username) {
      toast.error('Staff username missing');
      return;
    }
    const validationError = validateForm(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const isEdit = modalMode === 'edit';
    const loadingToast = toast.loading(isEdit ? 'Updating salary…' : 'Assigning salary…');
    try {
      setSaving(true);
      const payload = buildPayload(username, form);
      if (isEdit) {
        payload.assignment_id = selectedAssignment?.assignment_id || selectedAssignment?.salary_id;
      }

      const response = await fetch(
        `${API_BASE_URL}/salary/admin/${isEdit ? 'update-salary' : 'set-salary'}`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Failed to ${isEdit ? 'update' : 'assign'} salary`);
      }

      const isFlexible = form.salary_type === 'flexible';
      const offResponse = await fetch(`${API_BASE_URL}/salary/admin/set-weekly-off`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          username,
          days: isFlexible
            ? []
            : Array.isArray(form.day_off_days)
              ? form.day_off_days
              : [],
        }),
      });
      const offData = await offResponse.json();
      if (!offResponse.ok || !offData.success) {
        throw new Error(
          offData.message ||
            (isFlexible
              ? 'Salary saved but failed to clear day offs'
              : 'Salary saved but failed to update day offs')
        );
      }

      toast.success(data.message || (isEdit ? 'Salary updated' : 'Salary assigned'), {
        id: loadingToast,
      });
      setModalOpen(false);
      setSelectedAssignment(null);
      fetchSalaryHistory(username);
      fetchWeeklyOff(username);
    } catch (err) {
      toast.error(err.message || 'Failed to save salary', { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const currentWeeklyOffDays =
    weeklyOffData?.days ||
    weeklyOffData?.weekly_off_days ||
    (weeklyOffData?.weekly_off?.weekly_off_days?.length
      ? weeklyOffData.weekly_off.weekly_off_days
      : weeklyOffData?.weekly_off?.weekly_off_day
        ? [weeklyOffData.weekly_off.weekly_off_day]
        : []);

  const staffName =
    staffNameProp || salaryData?.profile?.name || '';

  const currentCount = assignments.filter((a) => isCurrentForThisMonth(a)).length;
  const scheduledCount = salaryData?.summary?.scheduled_count || 0;
  const historyCount = salaryData?.summary?.history_count || 0;

  const showMenu =
    Boolean(showActionMenu) && Boolean(menuEntry) && Boolean(actionMenuPosition);
  const menuCanEdit = menuEntry && String(menuEntry.status) !== 'expired';

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-bold text-gray-800 m-0">Salary</h2>
          <p className="text-xs text-gray-500 mt-0.5 m-0">
            Fixed or flexible assignments
            {staffName ? ` · ${staffName}` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => username && fetchSalaryHistory(username)}
            disabled={!username || loading}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!readOnly ? (
          <button
            type="button"
            onClick={openCreate}
            disabled={!username}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <FiPlus className="w-3.5 h-3.5" />
            Assign
          </button>
          ) : null}
        </div>
      </div>

      {!username && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Staff username is missing. Open this tab from a staff profile.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-3 md:px-4 py-2.5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h3 className="text-sm font-semibold text-gray-800 m-0 inline-flex items-center gap-1.5">
            <FiLayers className="w-3.5 h-3.5 text-teal-600" />
            Assignments
          </h3>
          <p className="text-xs text-gray-500 m-0 tabular-nums">
            {currentCount} current · {scheduledCount} scheduled · {historyCount} past
          </p>
        </div>

        {loading && assignments.length === 0 ? (
          <TableSkeleton rows={Math.min(limit, 6)} />
        ) : assignments.length === 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-left text-sm font-sans">
                <TableHead />
                <tbody>
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center">
                      <p className="text-sm font-medium text-gray-500 m-0">No salary assigned yet</p>
                      <p className="text-xs text-gray-400 mt-1 m-0">
                        {readOnly
                          ? 'No salary assignments to show.'
                          : 'Assign a fixed or flexible salary to get started.'}
                      </p>
                      {!readOnly ? (
                      <button
                        type="button"
                        onClick={openCreate}
                        disabled={!username}
                        className="mt-3 inline-flex items-center gap-1.5 h-9 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        <FiPlus className="w-3.5 h-3.5" />
                        Assign salary
                      </button>
                      ) : null}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page}
              limit={limit}
              total={0}
              totalPages={1}
              defaultRows={20}
              rowOptions={[5, 10, 20, 50, 100]}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-left text-sm font-sans">
                <TableHead />
                <tbody>
                  {paged.map((row, idx) => {
                    const key = rowKey(row);
                    const isCurrent = isCurrentForThisMonth(row);
                    return (
                      <tr
                        key={key}
                        className={`border-b border-gray-100 transition-colors ${
                          isCurrent
                            ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                            : 'bg-white hover:bg-blue-50/30'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-[11px] font-bold text-gray-800 tabular-nums">
                          {serialBase + idx + 1}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 tabular-nums">
                            {formatCurrency(row.monthly_salary)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <TypeChip type={row.salary_type} />
                        </td>
                        <td className="px-3 py-2.5 text-sm text-gray-700">
                          {row.salary_type === 'flexible' ? (
                            <span className="inline-flex items-center gap-1">
                              <FiClock className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                              {row.monthly_working_minutes != null
                                ? formatDurationMinutes(row.monthly_working_minutes)
                                : row.monthly_working_hours != null
                                  ? `${row.monthly_working_hours} hrs`
                                  : '—'}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-sm font-medium text-gray-700">
                          <span className="inline-flex items-center gap-1.5">
                            <FiCalendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            {formatDate(row.effective_from)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusChip row={row} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => toggleActionMenu(e, row)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                            aria-label="Actions"
                            aria-expanded={showActionMenu === key}
                          >
                            <FiMoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page}
              limit={limit}
              total={assignments.length}
              totalPages={totalPages}
              defaultRows={20}
              rowOptions={[5, 10, 20, 50, 100]}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence
            onExitComplete={() => {
              if (!showActionMenu) {
                setMenuEntry(null);
                setActionMenuPosition(null);
              }
            }}
          >
            {showMenu ? (
              <motion.div
                key="salary-action-menu"
                data-salary-action-menu
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                className="fixed z-[99999] w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                style={{
                  top: actionMenuPosition.top,
                  left: actionMenuPosition.left,
                  height: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span
                  className="absolute h-2.5 w-2.5 rotate-45 border-slate-200 bg-white"
                  style={{
                    left:
                      actionMenuPosition.placement === 'left' ||
                      actionMenuPosition.placement === 'right'
                        ? undefined
                        : `${actionMenuPosition.arrowX - 5}px`,
                    top:
                      actionMenuPosition.placement === 'bottom'
                        ? '-5px'
                        : actionMenuPosition.placement === 'top'
                          ? undefined
                          : `${actionMenuPosition.arrowY - 5}px`,
                    bottom:
                      actionMenuPosition.placement === 'top' ? '-5px' : undefined,
                    right:
                      actionMenuPosition.placement === 'left' ? '-5px' : undefined,
                    borderTopWidth:
                      actionMenuPosition.placement === 'bottom' ? '1px' : '0',
                    borderLeftWidth:
                      actionMenuPosition.placement === 'bottom' ||
                      actionMenuPosition.placement === 'right'
                        ? '1px'
                        : '0',
                    borderBottomWidth:
                      actionMenuPosition.placement === 'top' ? '1px' : '0',
                    borderRightWidth:
                      actionMenuPosition.placement === 'left' ? '1px' : '0',
                  }}
                />
                <button
                  type="button"
                  onClick={() => openView(menuEntry)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50"
                >
                  <FiEye className="h-4 w-4 text-slate-500" />
                  Details
                </button>
                {menuCanEdit && !readOnly ? (
                  <button
                    type="button"
                    onClick={() => openEdit(menuEntry)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50"
                  >
                    <FiEdit2 className="h-4 w-4 text-blue-600" />
                    Edit
                  </button>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body
        )}

      {!readOnly ? (
      <SalaryAssignmentModal
        isOpen={modalOpen}
        mode={modalMode}
        username={username}
        staffName={staffName}
        assignment={selectedAssignment}
        dayOffDays={currentWeeklyOffDays}
        saving={saving}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        onEdit={openEdit}
      />
      ) : null}
    </motion.div>
  );
};

export default SalaryTab;
