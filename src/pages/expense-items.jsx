import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiAlertTriangle,
    FiEdit2,
    FiEye,
    FiMoreVertical,
    FiPackage,
    FiPlus,
    FiRefreshCw,
    FiSearch,
    FiTrash2,
    FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Header, Sidebar } from '../components/header';
import TablePagination from '../components/TablePagination';
import useDebouncedValue from '../hooks/useDebouncedValue';
import {
    EXPENSE_ITEM_TYPES,
    EXPENSE_ITEM_TYPE_FILTER_OPTIONS,
    createExpenseItem,
    deleteExpenseItem,
    fetchExpenseItemDetails,
    fetchExpenseItemList,
    formatExpenseItemType,
    getExpenseItemTypeBadgeClass,
    updateExpenseItem,
} from '../services/expenseItemService';

const EMPTY_FORM = { name: '', remark: '', type: 'direct' };
const ACTIONS_MENU_WIDTH = 168;
const ACTIONS_MENU_HEIGHT = 132;

const MODAL_BODY_CLASS =
    'px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

const MODAL_FOOTER_CLASS =
    'shrink-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/90 px-5 py-3';

const INPUT_CLASS =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-slate-700';

const HEADER_THEMES = {
    emerald: {
        bar: 'border-b border-emerald-500/25 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 text-white',
        subtitle: 'text-emerald-100/90',
    },
    slate: {
        bar: 'border-b border-slate-600/30 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white',
        subtitle: 'text-slate-300',
    },
    danger: {
        bar: 'border-b border-rose-500/25 bg-gradient-to-r from-rose-600 via-rose-600 to-red-600 text-white',
        subtitle: 'text-rose-100/90',
    },
};

const ExpenseItemModalShell = ({
    isOpen,
    onClose,
    title,
    subtitle,
    icon: Icon,
    theme = 'emerald',
    maxWidth = 'max-w-md',
    zIndex = 'z-[10050]',
    footer,
    children,
    closeDisabled = false,
}) => {
    const headerTheme = HEADER_THEMES[theme] || HEADER_THEMES.emerald;

    return createPortal(
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    key="expense-item-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`fixed inset-0 ${zIndex} flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none`}
                >
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                        onClick={closeDisabled ? undefined : onClose}
                        aria-hidden
                    />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="expense-item-modal-title"
                        className={`relative z-[1] pointer-events-auto flex w-full ${maxWidth} my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 ${headerTheme.bar}`}>
                            <div className="flex min-w-0 items-center gap-3">
                                {Icon ? (
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                                        <Icon className="h-4 w-4" aria-hidden />
                                    </div>
                                ) : null}
                                <div className="min-w-0">
                                    <h2 id="expense-item-modal-title" className="truncate text-sm font-semibold tracking-tight">
                                        {title}
                                    </h2>
                                    {subtitle ? (
                                        <p className={`mt-0.5 truncate text-[11px] ${headerTheme.subtitle}`}>{subtitle}</p>
                                    ) : null}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={closeDisabled}
                                className="shrink-0 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
                                aria-label="Close"
                            >
                                <FiX className="h-4 w-4" />
                            </button>
                        </div>

                        {children}
                        {footer}
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body
    );
};

const ModalSecondaryButton = ({ children, onClick, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
        {children}
    </button>
);

const ModalPrimaryButton = ({ children, onClick, disabled, variant = 'emerald', type = 'button' }) => {
    const variants = {
        emerald: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/30',
        slate: 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-500/30',
        danger: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/30',
    };
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex min-w-[100px] items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.emerald}`}
        >
            {children}
        </button>
    );
};

const formatDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const ExpenseItemFormModal = ({
    isOpen,
    mode = 'create',
    formData,
    onChange,
    onClose,
    onSubmit,
    saving,
}) => {
    const isEdit = mode === 'edit';

    return (
        <ExpenseItemModalShell
            isOpen={isOpen}
            onClose={onClose}
            closeDisabled={saving}
            theme="emerald"
            icon={isEdit ? FiEdit2 : FiPlus}
            title={isEdit ? 'Edit expense item' : 'Add expense item'}
            subtitle={isEdit ? 'Update name, type, or remark' : 'Create a category for expense entries'}
        >
            <form
                onSubmit={onSubmit}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
                <div className={`${MODAL_BODY_CLASS} space-y-4`}>
                    <div>
                        <label className={LABEL_CLASS}>
                            Item name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={onChange}
                            placeholder="e.g. Office rent, Travel"
                            className={INPUT_CLASS}
                            required
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            Type <span className="text-rose-500">*</span>
                        </label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={onChange}
                            className={INPUT_CLASS}
                            required
                        >
                            {EXPENSE_ITEM_TYPES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Remark</label>
                        <textarea
                            name="remark"
                            value={formData.remark}
                            onChange={onChange}
                            placeholder="Optional note for this item"
                            rows={4}
                            className={`${INPUT_CLASS} resize-none`}
                        />
                    </div>
                </div>

                <div className={MODAL_FOOTER_CLASS}>
                    <ModalSecondaryButton onClick={onClose} disabled={saving}>
                        Cancel
                    </ModalSecondaryButton>
                    <ModalPrimaryButton type="submit" disabled={saving}>
                        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create item'}
                    </ModalPrimaryButton>
                </div>
            </form>
        </ExpenseItemModalShell>
    );
};

const DetailRow = ({ label, children }) => (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="min-w-0 text-right text-sm text-slate-800">{children}</span>
    </div>
);

const ExpenseItemDetailsModal = ({ isOpen, item, loading, onClose, onEdit }) => (
    <ExpenseItemModalShell
        isOpen={isOpen}
        onClose={onClose}
        theme="slate"
        maxWidth="max-w-lg"
        icon={FiEye}
        title={item?.name || 'Item details'}
        subtitle="Expense item overview"
        footer={(
            <div className={MODAL_FOOTER_CLASS}>
                <ModalSecondaryButton onClick={onClose}>Close</ModalSecondaryButton>
                {item && onEdit ? (
                    <ModalPrimaryButton onClick={() => onEdit(item)} variant="emerald">
                        <FiEdit2 className="h-3.5 w-3.5" />
                        Edit item
                    </ModalPrimaryButton>
                ) : null}
            </div>
        )}
    >
        <div className={MODAL_BODY_CLASS}>
            {loading ? (
                <div className="space-y-3 py-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                </div>
            ) : item ? (
                <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getExpenseItemTypeBadgeClass(item.type)}`}
                            >
                                {formatExpenseItemType(item.type)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums">
                                {item.expense_entry_count ?? 0} expense
                                {(item.expense_entry_count ?? 0) === 1 ? '' : 's'}
                            </span>
                        </div>
                        <DetailRow label="Name">{item.name || '—'}</DetailRow>
                        <DetailRow label="Remark">
                            <span className="block max-w-[14rem] truncate" title={item.remark || ''}>
                                {item.remark || '—'}
                            </span>
                        </DetailRow>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Audit trail
                        </p>
                        <DetailRow label="Created">
                            <span>
                                {formatDateTime(item.create_date)}
                                {item.create_by?.name ? (
                                    <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                        by {item.create_by.name}
                                    </span>
                                ) : null}
                            </span>
                        </DetailRow>
                        <DetailRow label="Last modified">
                            <span>
                                {formatDateTime(item.modify_date)}
                                {item.modify_by?.name ? (
                                    <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                        by {item.modify_by.name}
                                    </span>
                                ) : null}
                            </span>
                        </DetailRow>
                    </div>

                    {!item.can_delete && (item.expense_entry_count ?? 0) > 0 ? (
                        <div className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-3">
                            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <p className="text-xs leading-relaxed text-amber-900">
                                This item cannot be deleted because{' '}
                                <span className="font-semibold tabular-nums">{item.expense_entry_count}</span>{' '}
                                expense
                                {item.expense_entry_count === 1 ? ' entry has' : ' entries have'} been recorded
                                against it.
                            </p>
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <FiPackage className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Item not found</p>
                    <p className="mt-1 text-xs text-slate-500">It may have been removed or is unavailable.</p>
                </div>
            )}
        </div>
    </ExpenseItemModalShell>
);

const DeleteConfirmModal = ({ isOpen, itemName, deleting, onClose, onConfirm }) => (
    <ExpenseItemModalShell
        isOpen={isOpen}
        onClose={onClose}
        closeDisabled={deleting}
        zIndex="z-[10060]"
        theme="danger"
        maxWidth="max-w-sm"
        icon={FiTrash2}
        title="Delete expense item"
        subtitle="This action cannot be undone"
        footer={(
            <div className={MODAL_FOOTER_CLASS}>
                <ModalSecondaryButton onClick={onClose} disabled={deleting}>
                    Cancel
                </ModalSecondaryButton>
                <ModalPrimaryButton onClick={onConfirm} disabled={deleting} variant="danger">
                    {deleting ? 'Deleting…' : 'Delete item'}
                </ModalPrimaryButton>
            </div>
        )}
    >
        <div className={MODAL_BODY_CLASS}>
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100">
                    <FiAlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                        Remove &ldquo;{itemName || 'this item'}&rdquo;?
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                        The item will be hidden from lists. Deletion is only allowed when no expense entries
                        have been posted against this item.
                    </p>
                </div>
            </div>
        </div>
    </ExpenseItemModalShell>
);

const ExpenseItemsPage = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const debouncedSearch = useDebouncedValue(searchTerm, 350);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 20,
        total: 0,
        is_last_page: false,
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingItemId, setEditingItemId] = useState('');
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsItem, setDetailsItem] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0, openUpward: false });
    const dropdownAnchorRef = useRef(null);

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = await fetchExpenseItemList({
                search: debouncedSearch,
                type: typeFilter,
                page_no: pagination.page_no,
                limit: pagination.limit,
            });
            if (!result?.success) {
                throw new Error(result?.message || 'Failed to fetch expense items');
            }
            setRows(Array.isArray(result.data) ? result.data : []);
            const meta = result.meta || {};
            setPagination((prev) => ({
                ...prev,
                page_no: meta.page_no != null ? Number(meta.page_no) : prev.page_no,
                limit: meta.limit != null ? Number(meta.limit) : prev.limit,
                total: meta.total != null ? Number(meta.total) : 0,
                is_last_page: Boolean(meta.is_last_page),
            }));
        } catch (e) {
            console.error('Expense items list:', e);
            setRows([]);
            setError(e.response?.data?.message || e.message || 'Failed to load expense items');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, typeFilter, pagination.page_no, pagination.limit]);

    useEffect(() => {
        setPagination((prev) => (prev.page_no !== 1 ? { ...prev, page_no: 1 } : prev));
    }, [debouncedSearch, typeFilter]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

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
                !e.target.closest('[data-expense-item-actions-menu]') &&
                !e.target.closest('.expense-item-actions-trigger')
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
        () => rows.find((row) => row.item_id === activeRowDropdown) || null,
        [rows, activeRowDropdown]
    );

    const tableRows = useMemo(
        () =>
            loading
                ? Array.from({ length: 6 }, (_, i) => ({ __skeleton: true, item_id: `sk-${i}` }))
                : rows,
        [loading, rows]
    );

    const toggleRowDropdown = (itemId, e) => {
        if (activeRowDropdown === itemId) {
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
        setActiveRowDropdown(itemId);
    };

    const openCreateModal = () => {
        setModalMode('create');
        setEditingItemId('');
        setFormData(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEditModal = (row) => {
        setActiveRowDropdown(null);
        setModalMode('edit');
        setEditingItemId(row.item_id);
        setFormData({
            name: row.name || '',
            remark: row.remark || '',
            type: row.type || 'direct',
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;
        setModalOpen(false);
        setEditingItemId('');
        setFormData(EMPTY_FORM);
    };

    const openDetailsModal = async (row) => {
        setActiveRowDropdown(null);
        setDetailsOpen(true);
        setDetailsItem(row);
        setDetailsLoading(true);
        try {
            const result = await fetchExpenseItemDetails(row.item_id);
            if (result?.success && result.data) {
                setDetailsItem(result.data);
            }
        } catch (err) {
            console.error('Expense item details:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to load item details');
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetailsModal = () => {
        setDetailsOpen(false);
        setDetailsItem(null);
        setDetailsLoading(false);
    };

    const openDeleteConfirm = (row) => {
        setActiveRowDropdown(null);
        if (!row.can_delete) {
            toast.error('Cannot delete: expense entries exist for this item');
            return;
        }
        setDeleteTarget(row);
        setDeleteOpen(true);
    };

    const closeDeleteConfirm = () => {
        if (deleting) return;
        setDeleteOpen(false);
        setDeleteTarget(null);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget?.item_id) return;
        setDeleting(true);
        try {
            const result = await deleteExpenseItem(deleteTarget.item_id);
            if (!result?.success) {
                throw new Error(result?.message || 'Delete failed');
            }
            toast.success(result.message || 'Item deleted');
            closeDeleteConfirm();
            await loadItems();
        } catch (err) {
            console.error('Delete expense item:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to delete item');
        } finally {
            setDeleting(false);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const name = String(formData.name || '').trim();
        if (!name) {
            toast.error('Please enter item name');
            return;
        }
        if (!formData.type) {
            toast.error('Please select expense type');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name,
                remark: String(formData.remark || '').trim(),
                type: formData.type,
            };
            const result =
                modalMode === 'edit'
                    ? await updateExpenseItem({ item_id: editingItemId, ...payload })
                    : await createExpenseItem(payload);

            if (!result?.success) {
                throw new Error(result?.message || 'Request failed');
            }

            toast.success(result.message || (modalMode === 'edit' ? 'Item updated' : 'Item created'));
            closeModal();
            if (detailsOpen && detailsItem?.item_id === editingItemId) {
                closeDetailsModal();
            }
            await loadItems();
        } catch (err) {
            console.error('Expense item save:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to save expense item');
        } finally {
            setSaving(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit) || 1);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
                <div className="mx-auto max-w-full px-4 py-6 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                    >
                        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-emerald-100 p-1.5">
                                        <FiPackage className="h-4 w-4 text-emerald-700" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold text-slate-800">Expense Items</h1>
                                        <p className="text-xs text-slate-500">
                                            Create and manage categories used when recording expense entries
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={loadItems}
                                        disabled={loading}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openCreateModal}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-emerald-700 hover:to-emerald-800"
                                    >
                                        <FiPlus className="h-4 w-4" />
                                        Add item
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="relative min-w-0 flex-1">
                                    <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search by name, type, or remark…"
                                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    />
                                </div>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="h-[38px] w-full shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 sm:w-44"
                                    aria-label="Filter by type"
                                >
                                    {EXPENSE_ITEM_TYPE_FILTER_OPTIONS.map((opt) => (
                                        <option key={opt.value || 'all'} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {error && !loading ? (
                            <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        ) : null}

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[520px] text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">#</th>
                                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                                        <th className="px-4 py-3 text-left font-semibold">Type</th>
                                        <th className="px-4 py-3 text-left font-semibold">Remark</th>
                                        <th className="px-4 py-3 text-center font-semibold w-14" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tableRows.length === 0 && !loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                                                No expense items found. Click &quot;Add item&quot; to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        tableRows.map((row, index) => {
                                            if (row.__skeleton) {
                                                return (
                                                    <tr key={row.item_id} className="animate-pulse">
                                                        {[...Array(5)].map((_, i) => (
                                                            <td key={i} className="px-4 py-3">
                                                                <div className="h-4 rounded bg-slate-200" />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            }

                                            const rowNum = (pagination.page_no - 1) * pagination.limit + index + 1;
                                            return (
                                                <tr key={row.item_id} className="hover:bg-slate-50/80">
                                                    <td className="px-4 py-3 text-slate-500">{rowNum}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-800">{row.name || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getExpenseItemTypeBadgeClass(row.type)}`}
                                                        >
                                                            {formatExpenseItemType(row.type)}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-[240px] truncate px-4 py-3 text-slate-600" title={row.remark || ''}>
                                                        {row.remark || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => toggleRowDropdown(row.item_id, e)}
                                                            className="expense-item-actions-trigger inline-flex rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                                                            aria-label="Actions"
                                                        >
                                                            <FiMoreVertical className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {pagination.total > 0 && (
                            <TablePagination
                                showRange
                                showRows
                                showJump
                                showFirstLast
                                rowOptions={[10, 20, 50, 100]}
                                defaultRows={20}
                                className="border-t border-slate-200 bg-white"
                                page={pagination.page_no}
                                limit={pagination.limit}
                                total={pagination.total}
                                totalPages={totalPages}
                                isLastPage={pagination.is_last_page}
                                onPageChange={(page) => setPagination((prev) => ({ ...prev, page_no: page }))}
                                onLimitChange={(limit) =>
                                    setPagination((prev) => ({ ...prev, limit, page_no: 1 }))
                                }
                            />
                        )}
                    </motion.div>
                </div>
            </div>

            {activeRowDropdown && activeItem && createPortal(
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    data-expense-item-actions-menu
                    className="fixed z-[10040] w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                    style={{
                        top: dropdownPos.top,
                        bottom: dropdownPos.bottom,
                        right: dropdownPos.right,
                        minWidth: ACTIONS_MENU_WIDTH,
                    }}
                >
                    <button
                        type="button"
                        onClick={() => openDetailsModal(activeItem)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                    >
                        <FiEye className="h-3.5 w-3.5 text-slate-500" />
                        Details
                    </button>
                    <button
                        type="button"
                        onClick={() => openEditModal(activeItem)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                    >
                        <FiEdit2 className="h-3.5 w-3.5 text-blue-500" />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => openDeleteConfirm(activeItem)}
                        disabled={!activeItem.can_delete}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${
                            activeItem.can_delete
                                ? 'text-red-600 hover:bg-red-50'
                                : 'cursor-not-allowed text-slate-400'
                        }`}
                    >
                        <FiTrash2 className="h-3.5 w-3.5" />
                        Delete
                    </button>
                </motion.div>,
                document.body
            )}

            <ExpenseItemFormModal
                isOpen={modalOpen}
                mode={modalMode}
                formData={formData}
                onChange={handleFormChange}
                onClose={closeModal}
                onSubmit={handleFormSubmit}
                saving={saving}
            />

            <ExpenseItemDetailsModal
                isOpen={detailsOpen}
                item={detailsItem}
                loading={detailsLoading}
                onClose={closeDetailsModal}
                onEdit={(item) => {
                    closeDetailsModal();
                    openEditModal(item);
                }}
            />

            <DeleteConfirmModal
                isOpen={deleteOpen}
                itemName={deleteTarget?.name}
                deleting={deleting}
                onClose={closeDeleteConfirm}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    );
};

export default ExpenseItemsPage;
