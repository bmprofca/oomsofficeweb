import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiPlus, FiEye, FiEdit2, FiClock, FiRefreshCw } from 'react-icons/fi';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import SalaryAssignmentModal from '../components/Modals/SalaryAssignmentModal';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const statusStyles = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
  expired: 'bg-slate-50 text-slate-600 border-slate-200',
};

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('en-IN');
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

const SalaryTab = ({ username: usernameProp, staffName: staffNameProp, variants }) => {
  const username = usernameProp || '';
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [salaryData, setSalaryData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [weeklyOffData, setWeeklyOffData] = useState(null);
  const [loadingWeeklyOff, setLoadingWeeklyOff] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const fetchWeeklyOff = useCallback(async (staffUsername) => {
    try {
      setLoadingWeeklyOff(true);
      const response = await fetch(
        `${API_BASE_URL}/salary/admin/get-weekly-off?username=${encodeURIComponent(staffUsername)}`,
        { method: 'GET', headers: getHeaders() }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to fetch weekly off');
      setWeeklyOffData(data.data);
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoadingWeeklyOff(false);
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
    } catch (err) {
      setError(err.message);
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

  const openCreate = () => {
    setSelectedAssignment(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setSelectedAssignment(row);
    setModalMode('edit');
    setModalOpen(true);
  };

  const openView = (row) => {
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
      // Fixed only: persist day offs. Flexible clears any existing paid leave.
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

  const handleWeeklyOffToggle = async (day) => {
    if (!username) return;
    const currentDays =
      weeklyOffData?.days ||
      weeklyOffData?.weekly_off_days ||
      (weeklyOffData?.weekly_off?.weekly_off_day
        ? [weeklyOffData.weekly_off.weekly_off_day]
        : []);
    const has = currentDays.includes(day);
    const nextDays = has ? currentDays.filter((d) => d !== day) : [...currentDays, day];

    const toggleToast = toast.loading(has ? `Removing ${day}…` : `Adding ${day}…`);
    try {
      const response = await fetch(`${API_BASE_URL}/salary/admin/set-weekly-off`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          username,
          days: nextDays,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update day off');

      toast.success(data.message || 'Day off updated', { id: toggleToast });
      const days = data.data?.days || nextDays;
      setWeeklyOffData({
        ...weeklyOffData,
        days,
        weekly_off_days: days,
        weekly_off: days.length
          ? { weekly_off_day: days[0], weekly_off_days: days, is_active: true }
          : null,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to update day off', { id: toggleToast });
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
  const activeAssignment = assignments.find((a) => a.status === 'active');
  const staffName =
    staffNameProp || salaryData?.profile?.name || activeAssignment?.staff_name || '';

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-5"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Salary</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Fixed monthly or flexible hour-based pay. Only one assignment is active.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => username && fetchSalaryHistory(username)}
            disabled={!username || loading}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            title="Refresh"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={!username}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FiPlus className="w-4 h-4" />
            Assign salary
          </button>
        </div>
      </div>

      {!username && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Staff username is missing. Open this tab from a staff profile.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeAssignment ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Active amount
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
              {formatCurrency(activeAssignment.monthly_salary)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Type</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 capitalize">
              {activeAssignment.salary_type || 'fixed'}
            </p>
            {activeAssignment.salary_type === 'flexible' && (
              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                <FiClock className="w-3.5 h-3.5" />
                {activeAssignment.monthly_working_minutes != null
                  ? formatDurationMinutes(activeAssignment.monthly_working_minutes)
                  : activeAssignment.monthly_working_hours
                    ? `${activeAssignment.monthly_working_hours} hrs`
                    : '—'}{' '}
                / month
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Effective from
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatDate(activeAssignment.effective_from)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openEdit(activeAssignment)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
        </div>
      ) : (
        !loading &&
        username && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-800">No active salary</p>
            <p className="mt-1 text-sm text-slate-500">
              Assign a fixed or flexible salary to get started.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <FiPlus className="w-4 h-4" />
              Assign salary
            </button>
          </div>
        )
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Assignments</h3>
          <span className="text-xs text-slate-500">
            {salaryData?.summary?.scheduled_count || 0} scheduled ·{' '}
            {salaryData?.summary?.history_count || 0} past
          </span>
        </div>
        {loading && assignments.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading…</div>
        ) : assignments.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">No salary assigned yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Hours</th>
                  <th className="px-5 py-3 font-medium">Effective from</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((row) => {
                  const canEdit = row.status !== 'expired';
                  return (
                    <tr
                      key={row.assignment_id || row.salary_id || row.id}
                      className="hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-3 font-medium text-slate-900 tabular-nums">
                        {formatCurrency(row.monthly_salary)}
                      </td>
                      <td className="px-5 py-3 capitalize text-slate-700">
                        {row.salary_type || 'fixed'}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {row.salary_type === 'flexible'
                          ? row.monthly_working_minutes != null
                            ? formatDurationMinutes(row.monthly_working_minutes)
                            : row.monthly_working_hours != null
                              ? `${row.monthly_working_hours} hrs`
                              : '—'
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {formatDate(row.effective_from)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md border text-xs font-medium ${statusStyles[row.status] || statusStyles.expired
                            }`}
                        >
                          {row.status_display || row.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openView(row)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="View"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              title="Edit"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(activeAssignment?.salary_type || 'fixed') === 'fixed' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Day off (paid leave)</h3>
            <span className="text-xs text-slate-500">Multiple allowed</span>
          </div>
          <div className="p-5">
            {loadingWeeklyOff ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {WEEK_DAYS.map((day) => {
                  const selected = currentWeeklyOffDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleWeeklyOffToggle(day)}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${selected
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
    </motion.div>
  );
};

export default SalaryTab;
