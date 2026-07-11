import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FiMail,
    FiMoreVertical,
    FiPhone,
    FiPlus,
    FiRefreshCw,
    FiUser,
    FiUserCheck,
    FiUserX,
} from 'react-icons/fi';
import { Header, Sidebar } from '../../components/header';
import TablePagination from '../../components/TablePagination';
import AppDialog from '../../components/AppDialog';
import CaCreateModal from '../../components/Modals/CaCreateModal';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import {
    changeCaStatus,
    fetchCaList,
} from '../../services/caService';

const ACTIONS_MENU_WIDTH = 200;
const ACTIONS_MENU_HEIGHT = 120;

const rowKey = (row) => row?.username || String(row?.id ?? '');

const formatPhone = (row) => {
    if (!row) return '—';
    const code = row.country_code ? `+${String(row.country_code).replace(/^\+/, '')}` : '';
    const mobile = row.mobile || '';
    if (!mobile) return '—';
    return code ? `${code} ${mobile}` : mobile;
};

const formatCurrency = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const SkeletonPulse = ({ className = '' }) => (
    <div className={`animate-pulse rounded-md bg-gray-200/90 ${className}`} />
);

const CAList = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebouncedValue(searchTerm, 400);
    const [caRows, setCaRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: false,
    });

    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0, openUpward: false });
    const dropdownAnchorRef = useRef(null);

    const [showAddModal, setShowAddModal] = useState(false);

    const [dialog, setDialog] = useState({
        open: false,
        variant: 'confirm',
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: null,
        loading: false,
    });

    const listAbortRef = useRef(null);

    const loadCaList = useCallback(async () => {
        listAbortRef.current?.abort();
        const ac = new AbortController();
        listAbortRef.current = ac;

        setLoading(true);
        setError('');
        try {
            const result = await fetchCaList({
                search: debouncedSearch,
                page: pagination.page,
                limit: pagination.limit,
            });
            if (ac.signal.aborted) return;

            if (!result?.success) {
                throw new Error(result?.message || 'Failed to fetch CA list');
            }

            setCaRows(Array.isArray(result.data) ? result.data : []);
            const meta = result.pagination || result.meta || {};
            setPagination((prev) => ({
                ...prev,
                page: meta.page != null ? Number(meta.page) : prev.page,
                limit: meta.limit != null ? Number(meta.limit) : prev.limit,
                total: meta.total != null ? Number(meta.total) : 0,
                total_pages: meta.total_pages != null ? Number(meta.total_pages) : 1,
                is_last_page: Boolean(meta.is_last_page),
            }));
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error('CA list fetch:', e);
            setCaRows([]);
            setError(e.response?.data?.message || e.message || 'Failed to load CA list');
        } finally {
            if (listAbortRef.current === ac) setLoading(false);
        }
    }, [debouncedSearch, pagination.page, pagination.limit]);

    useEffect(() => {
        setPagination((prev) => (prev.page !== 1 ? { ...prev, page: 1 } : prev));
    }, [debouncedSearch]);

    useEffect(() => {
        loadCaList();
    }, [loadCaList]);

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                !e.target.closest('.ca-list-dropdown') &&
                !e.target.closest('[data-ca-list-actions-menu]')
            ) {
                setActiveRowDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const close = () => setActiveRowDropdown(null);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, []);

    const activeItem = useMemo(
        () => caRows.find((row) => rowKey(row) === activeRowDropdown) || null,
        [caRows, activeRowDropdown]
    );

    const rowsForTable = useMemo(
        () =>
            loading
                ? Array.from({ length: 6 }, (_, i) => ({ __skeleton: true, id: `sk-${i}` }))
                : caRows,
        [loading, caRows]
    );

    const showConfirm = ({ variant = 'warning', title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) => {
        setDialog({ open: true, variant, title, message, confirmText, cancelText, onConfirm, loading: false });
    };

    const closeDialog = () => {
        setDialog((prev) => ({ ...prev, open: false, loading: false, onConfirm: null }));
    };

    const handleDialogConfirm = async () => {
        if (!dialog.onConfirm) {
            closeDialog();
            return;
        }
        setDialog((prev) => ({ ...prev, loading: true }));
        const result = await dialog.onConfirm();
        if (result?.variant) {
            setDialog({
                open: true,
                variant: result.variant,
                title: result.title,
                message: result.message,
                confirmText: 'Close',
                cancelText: null,
                onConfirm: null,
                loading: false,
            });
        } else {
            closeDialog();
        }
    };

    const handleToggleStatus = (row) => {
        if (!row?.username) return;
        const nextStatus = row.status ? 'deactive' : 'active';
        const label = nextStatus === 'active' ? 'activate' : 'deactivate';
        setActiveRowDropdown(null);
        showConfirm({
            variant: nextStatus === 'deactive' ? 'warning' : 'confirm',
            title: `${nextStatus === 'active' ? 'Activate' : 'Deactivate'} CA`,
            message: `Are you sure you want to ${label} ${row.name || 'this CA'}?`,
            confirmText: nextStatus === 'active' ? 'Activate' : 'Deactivate',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const result = await changeCaStatus(row.username, nextStatus);
                    if (result?.success) {
                        await loadCaList();
                        return {
                            variant: 'success',
                            title: 'Status Updated',
                            message: result.message || 'CA status updated successfully.',
                        };
                    }
                    return {
                        variant: 'error',
                        title: 'Update Failed',
                        message: result?.message || 'Could not update CA status.',
                    };
                } catch (e) {
                    console.error('CA change-status:', e);
                    return {
                        variant: 'error',
                        title: 'Error',
                        message: e.response?.data?.message || e.message || 'Failed to update CA status.',
                    };
                }
            },
        });
    };

    const toggleRowDropdown = (id, e) => {
        if (activeRowDropdown === id) {
            setActiveRowDropdown(null);
            return;
        }
        dropdownAnchorRef.current = e.currentTarget;
        const rect = e.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < ACTIONS_MENU_HEIGHT + 8;
        setDropdownPos({
            top: openUpward ? undefined : rect.bottom + 4,
            bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
            right: window.innerWidth - rect.right,
            openUpward,
        });
        setActiveRowDropdown(id);
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

            <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="mb-6">
                        <h1 className="text-xl font-bold text-slate-900">Chartered Accountants</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Create and manage chartered accountants for this branch
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name, mobile, email..."
                                className="w-full sm:max-w-sm px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                            />
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={loadCaList}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    Create CA
                                </button>
                            </div>
                        </div>

                        {error && !loading && (
                            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[48rem] text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-12">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">CA</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Balance</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-14">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {!loading && rowsForTable.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-14 text-center">
                                                <FiUser className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                <p className="font-medium text-slate-700">No CAs found</p>
                                                <p className="text-sm text-slate-500 mt-1">Create a new chartered accountant</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        rowsForTable.map((row, index) => {
                                            const key = rowKey(row) || `row-${index}`;
                                            if (row.__skeleton) {
                                                return (
                                                    <tr key={key}>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-4 w-6" /></td>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-10 w-40" /></td>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-8 w-36" /></td>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-4 w-20" /></td>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-6 w-20" /></td>
                                                        <td className="px-4 py-4"><SkeletonPulse className="h-6 w-6 mx-auto" /></td>
                                                    </tr>
                                                );
                                            }

                                            const serialNo = (pagination.page - 1) * pagination.limit + index + 1;

                                            return (
                                                <tr key={key} className="hover:bg-slate-50/80">
                                                    <td className="px-4 py-4 text-slate-600">{serialNo}</td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {row.image ? (
                                                                <img
                                                                    src={row.image}
                                                                    alt=""
                                                                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                                                    <FiUser className="w-5 h-5 text-indigo-600" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                {row.username ? (
                                                                    <Link
                                                                        to={`/staff/office-assistance/ca-profile/${encodeURIComponent(row.username)}/profile`}
                                                                        state={{ caRow: row }}
                                                                        className="font-semibold text-indigo-600 hover:text-indigo-800 no-underline"
                                                                    >
                                                                        {row.name || '—'}
                                                                    </Link>
                                                                ) : (
                                                                    <span className="font-semibold text-slate-800">
                                                                        {row.name || '—'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1 text-slate-600">
                                                            {row.mobile && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <FiPhone className="w-3.5 h-3.5 shrink-0" />
                                                                    {formatPhone(row)}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                <FiMail className="w-3.5 h-3.5 shrink-0" />
                                                                {row.email || '—'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 font-medium text-slate-800">
                                                        {formatCurrency(row.balance)}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                row.status
                                                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                            }`}
                                                        >
                                                            {row.status ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex justify-center">
                                                            <button
                                                                type="button"
                                                                className="ca-list-dropdown p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                                                onClick={(e) => toggleRowDropdown(rowKey(row), e)}
                                                            >
                                                                <FiMoreVertical className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {(loading || caRows.length > 0) && (
                            <TablePagination
                                showRange
                                showRows
                                showJump
                                showFirstLast
                                rowOptions={[10, 20, 50, 100]}
                                defaultRows={20}
                                className="!bg-white !from-white !to-white border-t border-slate-200"
                                page={pagination.page}
                                limit={pagination.limit}
                                total={pagination.total}
                                totalPages={pagination.total_pages}
                                isLastPage={pagination.is_last_page}
                                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                                onLimitChange={(limit) =>
                                    setPagination((prev) => ({ ...prev, limit, page: 1 }))
                                }
                            />
                        )}
                    </div>
                </div>
            </div>

            {activeRowDropdown && activeItem &&
                createPortal(
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: dropdownPos.openUpward ? 6 : -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.12 }}
                        data-ca-list-actions-menu
                        className="ca-list-dropdown fixed bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[9999]"
                        style={{
                            top: dropdownPos.top,
                            bottom: dropdownPos.bottom,
                            right: dropdownPos.right,
                            width: `${ACTIONS_MENU_WIDTH}px`,
                        }}
                    >
                        <div className="py-1">
                            <button
                                type="button"
                                className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                    setActiveRowDropdown(null);
                                    navigate(
                                        `/staff/office-assistance/ca-profile/${encodeURIComponent(activeItem.username)}/profile`,
                                        { state: { caRow: activeItem } }
                                    );
                                }}
                            >
                                <FiUser className="w-4 h-4 mr-3 text-indigo-500" />
                                View Profile
                            </button>
                            <button
                                type="button"
                                className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => handleToggleStatus(activeItem)}
                            >
                                {activeItem.status ? (
                                    <>
                                        <FiUserX className="w-4 h-4 mr-3 text-amber-500" />
                                        Deactivate
                                    </>
                                ) : (
                                    <>
                                        <FiUserCheck className="w-4 h-4 mr-3 text-emerald-500" />
                                        Activate
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>,
                    document.body
                )}

            <CaCreateModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => loadCaList()}
            />

            <AppDialog dialog={dialog} onClose={closeDialog} onConfirm={handleDialogConfirm} />
        </div>
    );
};

export default CAList;
