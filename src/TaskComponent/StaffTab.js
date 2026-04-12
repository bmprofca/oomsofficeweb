import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiPlus,
    FiTrash2,
    FiUsers,
    FiLoader,
    FiSearch,
    FiEye,
    FiX,
    FiMail,
    FiPhone,
    FiUser,
    FiBriefcase,
    FiClock,
    FiAward,
    FiArrowRight,
    FiArrowLeft,
    FiUserCheck,
    FiUserPlus,
    FiCheck,
    FiMinus,
    FiAlertTriangle,
    FiCalendar,
    FiHash,
} from 'react-icons/fi';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   Animated custom checkbox
───────────────────────────────────────────── */
const AnimatedCheckbox = ({ checked, indeterminate = false, onChange, disabled = false }) => {
    const active = checked || indeterminate;
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={indeterminate ? 'mixed' : checked}
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); if (!disabled) onChange?.(!checked); }}
            className="relative flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 rounded"
        >
            <motion.div
                animate={{
                    backgroundColor: active ? '#4f46e5' : '#ffffff',
                    borderColor: active ? '#4f46e5' : '#d1d5db',
                }}
                transition={{ duration: 0.15 }}
                className="w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center"
            >
                <AnimatePresence mode="wait" initial={false}>
                    {indeterminate && (
                        <motion.span
                            key="minus"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.12 }}
                        >
                            <FiMinus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </motion.span>
                    )}
                    {checked && !indeterminate && (
                        <motion.span
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.12 }}
                        >
                            <FiCheck className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.div>
        </button>
    );
};

/* ─────────────────────────────────────────────
   Detail row used in View modal
───────────────────────────────────────────── */
const DetailRow = ({ icon: Icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm text-gray-800 font-medium break-words">{value}</p>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════
   StaffTab
═══════════════════════════════════════════ */
const StaffTab = ({ taskId, staff = [], onAddStaff, onRemoveStaff }) => {
    // ── core list ──────────────────────────────
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);

    // ── table row multi-select ──────────────────
    const [tableSelectedRows, setTableSelectedRows] = useState([]); // usernames

    // ── assign modal ────────────────────────────
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [allBranchStaff, setAllBranchStaff] = useState([]);
    const [branchStaffLoading, setBranchStaffLoading] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [showRemoveAllConfirm, setShowRemoveAllConfirm] = useState(false);

    // ── delete confirmation ─────────────────────
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    // deleteConfirm = { usernamesToRemove: string[], label: string }

    // ── view modal ──────────────────────────────
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedStaffMember, setSelectedStaffMember] = useState(null);

    const submittingRef = useRef(false);

    // ── reset row selection when list changes ───
    useEffect(() => {
        setTableSelectedRows([]);
    }, [staffList]);

    // ── header checkbox state ───────────────────
    const allRowsSelected = staffList.length > 0 && tableSelectedRows.length === staffList.length;
    const someRowsSelected = tableSelectedRows.length > 0 && tableSelectedRows.length < staffList.length;

    const toggleAllRows = () => {
        if (allRowsSelected) {
            setTableSelectedRows([]);
        } else {
            setTableSelectedRows(staffList.map((m) => m.username));
        }
    };

    const toggleRow = (username) => {
        setTableSelectedRows((prev) =>
            prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
        );
    };

    /* ── fetch assigned staff ── */
    const mapBranchStaffItem = useCallback((item) => ({
        map_id: item.map_id,
        username: item.username,
        name: item.profile?.name || item.username,
        email: item.profile?.email || '',
        mobile: item.profile?.mobile ?? '',
        country_code: item.profile?.country_code ?? '',
        designation: item.designation || 'Staff',
        is_accepted: item.is_accepted,
        status: item.status,
        profile: item.profile,
    }), []);

    const STAFF_PAGE_LIMIT = 100;
    const MAX_STAFF_PAGES = 500;

    const fetchStaffList = useCallback(async () => {
        if (!taskId) return;
        setLoading(true);
        try {
            const headers = getHeaders();
            if (!headers) { toast.error('Authentication required'); return; }
            const response = await fetch(`${API_BASE_URL}/task/details/staff/list?task_id=${taskId}`, { headers });
            const data = await response.json();
            if (data.success) {
                const rows = Array.isArray(data.data) ? data.data : [];
                setStaffList(rows.map((item) => ({
                    id: item.assign_id,
                    assign_id: item.assign_id,
                    username: item.staff.username,
                    name: item.staff.profile?.name || item.staff.username,
                    email: item.staff.profile?.email || '',
                    mobile: item.staff.profile?.mobile || '',
                    country_code: item.staff.profile?.country_code || '',
                    designation: item.staff.designation || 'Staff',
                    task_id: item.task_id,
                    create_date: item.create_date,
                    create_by: item.create_by,
                    modify_date: item.modify_date,
                    modify_by: item.modify_by,
                })));
            }
        } catch (error) {
            console.error('Error fetching staff list:', error);
            toast.error('Failed to fetch staff list');
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    const fetchAllBranchStaff = useCallback(async () => {
        setBranchStaffLoading(true);
        const headers = getHeaders();
        if (!headers) { setBranchStaffLoading(false); toast.error('Authentication required'); return; }
        const accumulated = [];
        let page = 1;
        try {
            const base = API_BASE_URL.replace(/\/$/, '');
            while (page <= MAX_STAFF_PAGES) {
                const params = new URLSearchParams({ search: '', page: String(page), limit: String(STAFF_PAGE_LIMIT) });
                const response = await fetch(`${base}/settings/staff/list?${params}`, { headers });
                const data = await response.json();
                if (!data?.success) { toast.error(data?.message || 'Failed to load staff directory'); break; }
                const list = Array.isArray(data.data) ? data.data : [];
                accumulated.push(...list.map(mapBranchStaffItem));
                const meta = data.meta || {};
                if (meta.is_last_page || list.length === 0 || list.length < STAFF_PAGE_LIMIT) break;
                page += 1;
            }
            setAllBranchStaff(accumulated);
        } catch (error) {
            console.error('Error loading branch staff:', error);
            toast.error('Failed to load staff directory');
            setAllBranchStaff([]);
        } finally {
            setBranchStaffLoading(false);
        }
    }, [mapBranchStaffItem]);

    useEffect(() => {
        if (!taskId) return;
        fetchStaffList();
        fetchAllBranchStaff();
    }, [taskId, fetchStaffList, fetchAllBranchStaff]);

    useEffect(() => {
        if (staff && staff.length > 0) setStaffList(staff);
    }, [staff]);

    /* ── assign modal helpers ── */
    const filteredAvailableStaff = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const pool = allBranchStaff.filter((s) => !selectedStaff.includes(s.username));
        if (!q) return pool;
        return pool.filter((s) => {
            const hay = [s.name, s.username, s.email, s.mobile, s.designation].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(q);
        });
    }, [allBranchStaff, selectedStaff, searchQuery]);

    const selectedStaffObjects = useMemo(() =>
        selectedStaff
            .map((u) => allBranchStaff.find((s) => s.username === u) || staffList.find((m) => m.username === u))
            .filter(Boolean),
    [selectedStaff, allBranchStaff, staffList]);

    const openAssignModal = () => {
        setSelectedStaff(staffList.map((m) => m.username).filter(Boolean));
        setSearchQuery('');
        setShowAddModal(true);
    };

    const closeAssignModal = () => {
        setShowAddModal(false);
        setSelectedStaff([]);
        setSearchQuery('');
    };

    const addEmployee = (s) => setSelectedStaff((prev) => [...prev, s.username]);
    const removeEmployee = (username) => setSelectedStaff((prev) => prev.filter((u) => u !== username));
    const addAllEmployees = () => setSelectedStaff((prev) => [...prev, ...filteredAvailableStaff.map((s) => s.username)]);
    const removeAllEmployees = () => setSelectedStaff([]);

    /* ── save assignments ── */
    const executeAssignStaff = async (staffIds) => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        const isRemoval = staffIds.length === 0;
        const toastId = toast.loading(isRemoval ? 'Removing all staff…' : 'Saving assignments…');
        try {
            const response = await fetch(`${API_BASE_URL}/task/details/staff/update`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ task_id: taskId, staff_ids: staffIds }),
            });
            const data = await response.json();
            if (data.success) {
                toast.success(
                    isRemoval
                        ? 'All staff removed from this task.'
                        : `${staffIds.length} staff member${staffIds.length !== 1 ? 's' : ''} assigned successfully`,
                    { id: toastId }
                );
                await fetchStaffList();
                setShowAddModal(false);
                setSelectedStaff([]);
                setSearchQuery('');
                if (onAddStaff) onAddStaff(data.data);
            } else {
                toast.error(data.message || 'Failed to assign staff', { id: toastId });
            }
        } catch (error) {
            console.error('Error assigning staff:', error);
            toast.error('Error saving assignments. Please try again.', { id: toastId });
        } finally {
            setSubmitting(false);
            submittingRef.current = false;
        }
    };

    const handleAssignStaff = () => {
        if (selectedStaff.length === 0) {
            setShowRemoveAllConfirm(true);
        } else {
            executeAssignStaff(selectedStaff);
        }
    };

    /* ── reusable delete via update API ── */
    const performDelete = useCallback(async (usernamesToRemove) => {
        if (submittingRef.current) return;
        const remaining = staffList
            .map((m) => m.username)
            .filter((u) => !usernamesToRemove.includes(u));
        await executeAssignStaff(remaining);
        setTableSelectedRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staffList, taskId]);

    const requestDelete = (usernamesToRemove) => {
        const isBulk = usernamesToRemove.length > 1;
        const label = isBulk
            ? `Remove ${usernamesToRemove.length} selected staff members from this task?`
            : `Remove "${staffList.find((m) => m.username === usernamesToRemove[0])?.name || usernamesToRemove[0]}" from this task?`;
        setDeleteConfirm({ usernamesToRemove, label });
    };

    /* ── helpers ── */
    const formatDate = (dateString) => {
        if (!dateString) return null;
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch { return null; }
    };

    /* ═══════════════════════════════════════════
       Render
    ═══════════════════════════════════════════ */
    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* ── Tab Header ── */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <FiUsers className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Assigned Staff</h3>
                                <p className="text-sm text-gray-500">
                                    {staffList.length} staff member{staffList.length !== 1 ? 's' : ''} assigned
                                </p>
                            </div>
                        </div>
                        <motion.button
                            onClick={openAssignModal}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={loading}
                        >
                            <FiPlus className="w-4 h-4" />
                            Assign Staff
                        </motion.button>
                    </div>
                </div>

                {/* ── Bulk action bar (appears when rows selected) ── */}
                <AnimatePresence>
                    {tableSelectedRows.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-6 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                                <span className="text-sm font-medium text-indigo-700">
                                    {tableSelectedRows.length} row{tableSelectedRows.length !== 1 ? 's' : ''} selected
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTableSelectedRows([])}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
                                    >
                                        Clear
                                    </button>
                                    <motion.button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => requestDelete(tableSelectedRows)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {submitting
                                            ? <FiLoader className="w-3.5 h-3.5 animate-spin" />
                                            : <FiTrash2 className="w-3.5 h-3.5" />
                                        }
                                        Delete Selected ({tableSelectedRows.length})
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Table ── */}
                {loading ? (
                    <div className="flex justify-center items-center py-16">
                        <div className="text-center">
                            <FiLoader className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                            <p className="text-gray-500">Loading staff list...</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {staffList.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {/* Checkbox header */}
                                        <th className="pl-6 pr-3 py-3 w-10">
                                            <AnimatedCheckbox
                                                checked={allRowsSelected}
                                                indeterminate={someRowsSelected}
                                                onChange={toggleAllRows}
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff Member</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Designation</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned On</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    <AnimatePresence initial={false}>
                                        {staffList.map((member, index) => {
                                            const isRowSelected = tableSelectedRows.includes(member.username);
                                            return (
                                                <motion.tr
                                                    key={member.id}
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    onClick={() => toggleRow(member.username)}
                                                    className={`cursor-pointer transition-colors ${
                                                        isRowSelected
                                                            ? 'bg-indigo-50 hover:bg-indigo-100'
                                                            : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {/* Checkbox cell */}
                                                    <td className="pl-6 pr-3 py-3.5 w-10">
                                                        <AnimatedCheckbox
                                                            checked={isRowSelected}
                                                            onChange={() => toggleRow(member.username)}
                                                        />
                                                    </td>
                                                    {/* Staff member */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isRowSelected ? 'bg-indigo-200' : 'bg-indigo-100'}`}>
                                                                <FiUser className="w-4 h-4 text-indigo-600" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">{member.name}</span>
                                                        </div>
                                                    </td>
                                                    {/* Designation */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                                                            <FiAward className="w-3 h-3" />
                                                            {member.designation}
                                                        </span>
                                                    </td>
                                                    {/* Contact */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                            <FiMail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                            <span className="truncate max-w-[160px]">{member.email || '—'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                                            <FiPhone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                            <span>{[member.country_code, member.mobile].filter(Boolean).join(' ') || '—'}</span>
                                                        </div>
                                                    </td>
                                                    {/* Assigned On */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="text-xs text-gray-700 font-medium">{formatDate(member.create_date) || '—'}</div>
                                                        {member.create_by?.name && (
                                                            <div className="text-xs text-gray-400 mt-0.5">by {member.create_by.name}</div>
                                                        )}
                                                    </td>
                                                    {/* Actions */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <motion.button
                                                                type="button"
                                                                onClick={() => { setSelectedStaffMember(member); setShowViewModal(true); }}
                                                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                title="View details"
                                                            >
                                                                <FiEye className="w-4 h-4" />
                                                            </motion.button>
                                                            <motion.button
                                                                type="button"
                                                                disabled={submitting}
                                                                onClick={() => requestDelete([member.username])}
                                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                title="Remove"
                                                            >
                                                                <FiTrash2 className="w-4 h-4" />
                                                            </motion.button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-16">
                                <FiUsers className="w-14 h-14 mx-auto mb-3 text-gray-200" />
                                <p className="text-base font-medium text-gray-600 mb-1">No staff assigned</p>
                                <p className="text-sm text-gray-400 mb-5">Click the button above to assign staff members to this task.</p>
                                <motion.button
                                    onClick={openAssignModal}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiPlus className="w-4 h-4" />
                                    Assign Staff
                                </motion.button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════
                Assign Staff Modal
            ══════════════════════════════════════════ */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        key="assign-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={(e) => e.target === e.currentTarget && !submitting && closeAssignModal()}
                    >
                        <motion.div
                            key="assign-modal"
                            initial={{ opacity: 0, scale: 0.96, y: 14 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 14 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
                            style={{ height: 'calc(100vh - 4rem)', maxHeight: '88vh' }}
                        >
                            {/* Header */}
                            <div className="flex-shrink-0 px-5 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <FiUserPlus className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900">Assign Staff to Task</h3>
                                    {branchStaffLoading && <FiLoader className="w-3.5 h-3.5 animate-spin text-indigo-500 ml-1" />}
                                </div>
                                <button
                                    type="button"
                                    onClick={closeAssignModal}
                                    disabled={submitting}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 min-h-0 p-4 flex flex-col">
                                {branchStaffLoading && (
                                    <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 py-6">
                                        <FiLoader className="w-4 h-4 animate-spin" />
                                        Loading staff directory…
                                    </div>
                                )}
                                {!branchStaffLoading && allBranchStaff.length === 0 && (
                                    <div className="flex items-center justify-center flex-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-6 py-10 text-center">
                                        No staff found for this branch. Add staff members first.
                                    </div>
                                )}
                                {!branchStaffLoading && allBranchStaff.length > 0 && (
                                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_48px_1fr] gap-3">

                                        {/* Left: Available */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col min-h-0">
                                            <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
                                                <div className="flex items-center gap-1.5">
                                                    <FiUsers className="w-3.5 h-3.5 text-gray-500" />
                                                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Available</h4>
                                                </div>
                                                <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full tabular-nums">
                                                    {filteredAvailableStaff.length}
                                                    {searchQuery.trim() ? ` / ${allBranchStaff.length - selectedStaff.length}` : ''}
                                                </span>
                                            </div>
                                            <div className="relative mb-2.5 flex-shrink-0">
                                                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Name, designation, mobile…"
                                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                                                />
                                            </div>
                                            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
                                                {filteredAvailableStaff.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400 text-sm gap-2">
                                                        <FiUsers className="w-7 h-7" />
                                                        {searchQuery.trim() ? 'No match' : 'All selected'}
                                                    </div>
                                                ) : (
                                                    <AnimatePresence initial={false}>
                                                        {filteredAvailableStaff.map((s) => (
                                                            <motion.div
                                                                key={s.username}
                                                                layout
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: -10 }}
                                                                transition={{ duration: 0.15 }}
                                                                onClick={() => addEmployee(s)}
                                                                className="p-2.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-colors group"
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                                        <FiUser className="w-3.5 h-3.5 text-indigo-600" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                                                                        <div className="text-xs text-gray-400 truncate">{[s.designation, s.mobile].filter(Boolean).join(' · ') || s.email || '—'}</div>
                                                                    </div>
                                                                    <FiArrowRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </AnimatePresence>
                                                )}
                                            </div>
                                        </div>

                                        {/* Middle: Transfer buttons */}
                                        <div className="flex lg:flex-col items-center justify-center gap-2">
                                            <motion.button type="button" onClick={addAllEmployees} disabled={filteredAvailableStaff.length === 0} title="Add all visible" className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                                <FiArrowRight className="w-4 h-4" />
                                            </motion.button>
                                            <motion.button type="button" onClick={removeAllEmployees} disabled={selectedStaff.length === 0} title="Remove all" className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                                <FiArrowLeft className="w-4 h-4" />
                                            </motion.button>
                                        </div>

                                        {/* Right: Selected */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col min-h-0">
                                            <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
                                                <div className="flex items-center gap-1.5">
                                                    <FiUserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Selected</h4>
                                                </div>
                                                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full tabular-nums">{selectedStaff.length}</span>
                                            </div>
                                            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
                                                {selectedStaffObjects.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400 text-sm gap-2">
                                                        <FiUserCheck className="w-7 h-7" />
                                                        None selected
                                                    </div>
                                                ) : (
                                                    <AnimatePresence initial={false}>
                                                        {selectedStaffObjects.map((s) => (
                                                            <motion.div
                                                                key={s.username}
                                                                layout
                                                                initial={{ opacity: 0, x: 10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: 10 }}
                                                                transition={{ duration: 0.15 }}
                                                                onClick={() => removeEmployee(s.username)}
                                                                className="p-2.5 bg-white border border-indigo-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors group"
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
                                                                        <FiUser className="w-3.5 h-3.5 text-indigo-600 group-hover:text-red-500 transition-colors" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                                                                        <div className="text-xs text-gray-400 truncate">{[s.designation, s.mobile].filter(Boolean).join(' · ') || s.email || '—'}</div>
                                                                    </div>
                                                                    <FiArrowLeft className="w-3.5 h-3.5 text-red-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </AnimatePresence>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
                                <button type="button" onClick={closeAssignModal} disabled={submitting} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50">
                                    Cancel
                                </button>
                                <motion.button
                                    type="button"
                                    onClick={handleAssignStaff}
                                    disabled={submitting}
                                    className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[130px] justify-center shadow-sm"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {submitting ? (
                                        <><FiLoader className="w-4 h-4 animate-spin" /> Saving…</>
                                    ) : (
                                        <>
                                            <FiUserCheck className="w-4 h-4" />
                                            Save Assignments
                                            {selectedStaff.length > 0 && (
                                                <span className="bg-indigo-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none tabular-nums">
                                                    {selectedStaff.length}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════
                View Staff Details Modal (redesigned)
            ══════════════════════════════════════════ */}
            <AnimatePresence>
                {showViewModal && selectedStaffMember && (
                    <motion.div
                        key="view-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowViewModal(false)}
                    >
                        <motion.div
                            key="view-modal"
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
                            style={{ maxHeight: '90vh' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* ── Fixed header ── */}
                            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <FiUser className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900">Assigned Staff Details</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowViewModal(false)}
                                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>

                            {/* ── Scrollable body: two-column grid ── */}
                            <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {/* Staff identity block */}
                                <div className="px-5 pt-5 pb-3 flex items-center gap-4 border-b border-gray-100">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <FiUser className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-gray-900 leading-tight">{selectedStaffMember.name}</p>
                                        <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                            <FiAward className="w-3 h-3" />
                                            {selectedStaffMember.designation || 'Staff'}
                                        </span>
                                    </div>
                                </div>
                                {/* Detail grid */}
                                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                    <DetailRow icon={FiMail} label="Email" value={selectedStaffMember.email || null} />
                                    <DetailRow
                                        icon={FiPhone}
                                        label="Mobile"
                                        value={[selectedStaffMember.country_code, selectedStaffMember.mobile].filter(Boolean).join(' ') || null}
                                    />
                                    <DetailRow icon={FiBriefcase} label="Designation" value={selectedStaffMember.designation || null} />
                                    <DetailRow icon={FiCalendar} label="Assigned On" value={formatDate(selectedStaffMember.create_date)} />
                                    <DetailRow
                                        icon={FiUser}
                                        label="Assigned By"
                                        value={selectedStaffMember.create_by?.name || null}
                                    />
                                    {selectedStaffMember.modify_date && formatDate(selectedStaffMember.modify_date) !== formatDate(selectedStaffMember.create_date) && (
                                        <DetailRow icon={FiClock} label="Last Modified" value={formatDate(selectedStaffMember.modify_date)} />
                                    )}
                                </div>
                            </div>

                            {/* ── Fixed footer ── */}
                            <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                                <motion.button
                                    type="button"
                                    onClick={() => setShowViewModal(false)}
                                    className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Close
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════
                Delete confirmation modal
            ══════════════════════════════════════════ */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        key="delete-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
                        onClick={(e) => !submitting && e.target === e.currentTarget && setDeleteConfirm(null)}
                    >
                        <motion.div
                            key="delete-modal"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <FiAlertTriangle className="w-4 h-4 text-red-600" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-900">
                                    {deleteConfirm.usernamesToRemove.length > 1 ? 'Remove staff members?' : 'Remove staff member?'}
                                </h3>
                            </div>
                            <div className="px-6 py-4">
                                <p className="text-sm text-gray-600">{deleteConfirm.label}</p>
                                <p className="text-xs text-gray-400 mt-2">This action cannot be undone.</p>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    type="button"
                                    disabled={submitting}
                                    onClick={async () => {
                                        const toRemove = deleteConfirm.usernamesToRemove;
                                        setDeleteConfirm(null);
                                        await performDelete(toRemove);
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {submitting ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiTrash2 className="w-4 h-4" />}
                                    {deleteConfirm.usernamesToRemove.length > 1
                                        ? `Remove ${deleteConfirm.usernamesToRemove.length} staff`
                                        : 'Remove'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════
                Remove-all (empty selection) confirmation
            ══════════════════════════════════════════ */}
            <AnimatePresence>
                {showRemoveAllConfirm && (
                    <motion.div
                        key="remove-all-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowRemoveAllConfirm(false)}
                    >
                        <motion.div
                            key="remove-all-modal"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <FiAlertTriangle className="w-4 h-4 text-red-600" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-900">Remove all staff?</h3>
                            </div>
                            <div className="px-6 py-4">
                                <p className="text-sm text-gray-600">
                                    You haven't selected any staff. Saving now will{' '}
                                    <span className="font-semibold text-red-600">remove all currently assigned staff</span> from this task.
                                </p>
                                <p className="text-xs text-gray-400 mt-2">Are you sure you want to continue?</p>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowRemoveAllConfirm(false)}
                                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    type="button"
                                    onClick={() => {
                                        setShowRemoveAllConfirm(false);
                                        executeAssignStaff([]);
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiTrash2 className="w-4 h-4" />
                                    Yes, remove all
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default StaffTab;
