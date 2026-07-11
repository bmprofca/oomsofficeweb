import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Header, Sidebar } from '../components/header';
import {
    FiPlus,
    FiEdit,
    FiMenu,
    FiChevronRight,
    FiPrinter,
    FiSearch,
    FiEye,
    FiTrash2,
    FiTrendingUp,
} from 'react-icons/fi';
import { PiExportBold, PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { TbCurrencyRupee } from 'react-icons/tb';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import TablePagination from '../components/TablePagination';
import CapitalAccountFormModal from '../components/Modals/CapitalAccountFormModal';
import CapitalAccountDetailsModal from '../components/Modals/CapitalAccountDetailsModal';
import CapitalExportModal from '../components/Modals/CapitalExportModal';
import toast from 'react-hot-toast';

const CAPITAL_API_BASE = `${API_BASE_URL}/capital`;
const ACTIONS_MENU_WIDTH = 192;
const ACTIONS_MENU_HEIGHT = 160;

const EMPTY_STATS = {
    total_accounts: 0,
    total_balance: 0,
    total_credit: 0,
    total_debit: 0,
};

const CapitalAccounts = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [stats, setStats] = useState(EMPTY_STATS);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0, openUpward: false });
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const viewDetailsRequestRef = useRef(0);

    // Export Modal State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportData, setExportData] = useState([]);
    const [exportColumns, setExportColumns] = useState([]);

    // Pagination state
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        total_pages: 0,
        is_last_page: false
    });

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        remark: '',
        opening_balance: {
            amount: '',
            date: new Date().toISOString().split('T')[0],
            type: 'credit'
        }
    });

    const [editFormData, setEditFormData] = useState({
        capital_id: '',
        name: '',
        remark: '',
        opening_balance: {
            amount: '',
            date: new Date().toISOString().split('T')[0],
            type: 'credit'
        }
    });

    // Prepare data for export
    const prepareExportData = () => {
        const exportDataList = [];
        const exportColumnsConfig = [];

        const columns = [
            { header: 'S.No', key: 'sl_no', width: 10 },
            { header: 'Account Name', key: 'account_name', width: 30 },
            { header: 'Remark', key: 'remark', width: 35 },
            { header: 'Balance (₹)', key: 'balance', width: 20 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        exportColumnsConfig.push(...columns);

        accounts.forEach((account, index) => {
            const isNegativeBalance = Number(account.balance) < 0;
            const displayBalance = isNegativeBalance ? -account.balance : account.balance;

            const row = {
                sl_no: ((pagination.page - 1) * pagination.limit) + index + 1,
                account_name: account.name || 'N/A',
                remark: account.remark || '-',
                balance: (isNegativeBalance ? '-' : '') + displayBalance,
                status: account.status ? 'Active' : 'Inactive'
            };
            exportDataList.push(row);
        });

        return { data: exportDataList, columns: exportColumnsConfig };
    };

    // Handle export click for modal
    const handleExportClick = () => {
        const { data, columns } = prepareExportData();

        if (data.length === 0) {
            toast.error('No data to export');
            return;
        }

        setExportData(data);
        setExportColumns(columns);
        setExportModalOpen(true);
    };

    // Handle other exports (print)
    const handleOtherExport = (type, data = null) => {
        setExportModal({ open: true, type, data });

        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            toast.success(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch accounts when page, limit, or search changes
    useEffect(() => {
        fetchAccountList();
    }, [pagination.page, pagination.limit, debouncedSearchTerm]);

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    // Fetch accounts from API
    const fetchAccountList = async () => {
        setListLoading(true);
        try {
            const headers = getHeaders();
            const url = `${CAPITAL_API_BASE}/list?page_no=${pagination.page}&limit=${pagination.limit}&search=${encodeURIComponent(debouncedSearchTerm)}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            const result = await response.json();

            if (result.success) {
                setAccounts(result.data);
                if (result.stats) {
                    setStats({
                        total_accounts: Number(result.stats.total_accounts) || 0,
                        total_balance: Number(result.stats.total_balance) || 0,
                        total_credit: Number(result.stats.total_credit) || 0,
                        total_debit: Number(result.stats.total_debit) || 0,
                    });
                }
                setPagination({
                    page: result.meta.page_no,
                    limit: result.meta.limit,
                    total: result.meta.total,
                    total_pages: Math.ceil(result.meta.total / result.meta.limit),
                    is_last_page: result.meta.is_last_page
                });
            } else {
                console.error('Failed to fetch accounts:', result);
                toast.error(result.message || 'Failed to fetch capital accounts');
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            toast.error('An error occurred while fetching capital accounts');
        } finally {
            setListLoading(false);
        }
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        const maxPage = pagination.total_pages || 1;
        if (newPage >= 1 && newPage <= maxPage) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    // Handle limit change
    const handleLimitChange = (newLimit) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Math.abs(amount));
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Calculate total capital — use API stats (all filtered accounts, not just current page)

    // Handle form input changes for create
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'name') {
            setFormData(prev => ({ ...prev, name: value }));
        } else if (name === 'remark') {
            setFormData(prev => ({ ...prev, remark: value }));
        } else if (name === 'opening_balance_amount') {
            setFormData(prev => ({
                ...prev,
                opening_balance: {
                    ...prev.opening_balance,
                    amount: value
                }
            }));
        } else if (name === 'opening_balance_type') {
            setFormData(prev => ({
                ...prev,
                opening_balance: {
                    ...prev.opening_balance,
                    type: value
                }
            }));
        }
    };

    // Handle date change for create
    const handleDateChange = (date) => {
        setFormData(prev => ({
            ...prev,
            opening_balance: {
                ...prev.opening_balance,
                date: date || ''
            }
        }));
    };

    // Handle form input changes for edit
    const handleEditInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'name') {
            setEditFormData(prev => ({ ...prev, name: value }));
        } else if (name === 'remark') {
            setEditFormData(prev => ({ ...prev, remark: value }));
        } else if (name === 'opening_balance_amount') {
            setEditFormData(prev => ({
                ...prev,
                opening_balance: {
                    ...prev.opening_balance,
                    amount: value
                }
            }));
        } else if (name === 'opening_balance_type') {
            setEditFormData(prev => ({
                ...prev,
                opening_balance: {
                    ...prev.opening_balance,
                    type: value
                }
            }));
        }
    };

    // Handle date change for edit
    const handleEditDateChange = (date) => {
        setEditFormData(prev => ({
            ...prev,
            opening_balance: {
                ...prev.opening_balance,
                date: date || ''
            }
        }));
    };

    // Handle create account
    const handleCreateAccount = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Validation
        if (!formData.name || !formData.name.trim()) {
            alert('Please enter account name');
            return;
        }
        if (!formData.opening_balance.amount || formData.opening_balance.amount === '') {
            alert('Please enter opening balance');
            return;
        }
        if (!formData.opening_balance.date) {
            alert('Please select opening date');
            return;
        }

        // Validate amount is a valid number
        const amount = parseFloat(formData.opening_balance.amount);
        if (isNaN(amount)) {
            alert('Please enter a valid opening balance amount');
            return;
        }

        setSubmitting(true);

        try {
            const headers = getHeaders();
            const payload = {
                name: formData.name.trim(),
                remark: formData.remark ? formData.remark.trim() : '',
                opening_balance: {
                    amount: amount,
                    date: formData.opening_balance.date,
                    type: formData.opening_balance.type
                }
            };

            const response = await fetch(`${CAPITAL_API_BASE}/create`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                setFormData({
                    name: '',
                    remark: '',
                    opening_balance: {
                        amount: '',
                        date: new Date().toISOString().split('T')[0],
                        type: 'credit'
                    }
                });
                setShowAddModal(false);
                await fetchAccountList();
                toast.success('Account created successfully!');
            } else {
                toast.error(result.message || 'Failed to create account');
            }
        } catch (error) {
            console.error('Error creating account:', error);
            toast.error('An error occurred while creating the account');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle edit account
    const handleEditAccount = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Validation
        if (!editFormData.name || !editFormData.name.trim()) {
            alert('Please enter account name');
            return;
        }
        if (!editFormData.opening_balance.amount || editFormData.opening_balance.amount === '') {
            alert('Please enter opening balance');
            return;
        }
        if (!editFormData.opening_balance.date) {
            alert('Please select opening date');
            return;
        }

        // Validate amount is a valid number
        const amount = parseFloat(editFormData.opening_balance.amount);
        if (isNaN(amount)) {
            alert('Please enter a valid opening balance amount');
            return;
        }

        setSubmitting(true);

        try {
            const headers = getHeaders();
            const payload = {
                capital_id: editFormData.capital_id,
                name: editFormData.name.trim(),
                remark: editFormData.remark ? editFormData.remark.trim() : '',
                opening_balance: {
                    amount: amount,
                    date: editFormData.opening_balance.date,
                    type: editFormData.opening_balance.type
                }
            };

            const response = await fetch(`${CAPITAL_API_BASE}/edit`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                setShowEditModal(false);
                await fetchAccountList();
                toast.success('Account updated successfully!');
            } else {
                toast.error(result.message || 'Failed to update account');
            }
        } catch (error) {
            console.error('Error updating account:', error);
            toast.error('An error occurred while updating the account');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenLedger = (account) => {
        if (!account?.capital_id) return;
        navigate(`/finance/capital/ledger/${encodeURIComponent(account.capital_id)}`, {
            state: { accountName: account.name || '' },
        });
    };

    // Handle view details
    const handleViewDetails = async (capitalId) => {
        const requestId = ++viewDetailsRequestRef.current;
        setActiveRowDropdown(null);
        setSelectedAccount(null);
        setShowViewModal(true);
        setDetailsLoading(true);
        try {
            const headers = getHeaders();
            const response = await fetch(`${CAPITAL_API_BASE}/details?capital_id=${encodeURIComponent(capitalId)}`, {
                method: 'GET',
                headers: headers
            });

            const result = await response.json();

            if (requestId !== viewDetailsRequestRef.current) return;

            if (result.success) {
                setSelectedAccount(result.data);
            } else {
                setShowViewModal(false);
                toast.error(result.message || 'Failed to fetch account details');
            }
        } catch (error) {
            if (requestId !== viewDetailsRequestRef.current) return;
            console.error('Error fetching account details:', error);
            setShowViewModal(false);
            toast.error('An error occurred while fetching account details');
        } finally {
            if (requestId === viewDetailsRequestRef.current) {
                setDetailsLoading(false);
            }
        }
    };

    const closeViewModal = () => {
        viewDetailsRequestRef.current += 1;
        setShowViewModal(false);
        setSelectedAccount(null);
        setDetailsLoading(false);
    };

    // Handle edit button click - fetch details first
    const handleEditClick = async (capitalId) => {
        setSubmitting(true);
        try {
            const headers = getHeaders();
            const response = await fetch(`${CAPITAL_API_BASE}/details?capital_id=${encodeURIComponent(capitalId)}`, {
                method: 'GET',
                headers: headers
            });

            const result = await response.json();

            if (result.success) {
                const account = result.data;
                setEditFormData({
                    capital_id: account.capital_id,
                    name: account.name,
                    remark: account.remark || '',
                    opening_balance: {
                        amount: Math.abs(account.balance).toString(),
                        date: new Date().toISOString().split('T')[0],
                        type: account.balance < 0 ? 'debit' : 'credit'
                    }
                });
                setShowEditModal(true);
            } else {
                toast.error(result.message || 'Failed to fetch account details');
            }
        } catch (error) {
            console.error('Error fetching account details:', error);
            toast.error('An error occurred while fetching account details');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAccount = async (capitalId) => {
        if (!capitalId) return;
        const confirmed = window.confirm(
            'Delete this capital account? This is only allowed when no transactions exist for it.'
        );
        if (!confirmed) return;

        setSubmitting(true);
        setActiveRowDropdown(null);
        try {
            const headers = getHeaders();
            const response = await fetch(`${CAPITAL_API_BASE}/delete`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ capital_id: capitalId }),
            });
            const result = await response.json();

            if (result.success) {
                toast.success(result.message || 'Capital account deleted successfully');
                await fetchAccountList();
            } else {
                toast.error(result.message || 'Failed to delete capital account');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            toast.error('An error occurred while deleting the account');
        } finally {
            setSubmitting(false);
        }
    };

    // Toggle row dropdown
    const activeAccount = useMemo(
        () => accounts.find((a) => a.capital_id === activeRowDropdown) || null,
        [accounts, activeRowDropdown]
    );

    const toggleRowDropdown = (accountId, e) => {
        if (activeRowDropdown === accountId) {
            setActiveRowDropdown(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < ACTIONS_MENU_HEIGHT + 8;
        setDropdownPos({
            top: openUpward ? undefined : rect.bottom + 4,
            bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
            right: window.innerWidth - rect.right,
            openUpward,
        });
        setActiveRowDropdown(accountId);
    };

    // Close all dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                !event.target.closest('.dropdown-container') &&
                !event.target.closest('[data-capital-actions-menu]')
            ) {
                setShowAddDropdown(false);
                setActiveRowDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (!activeRowDropdown) return undefined;
        const closeOnScroll = () => setActiveRowDropdown(null);
        window.addEventListener('scroll', closeOnScroll, true);
        return () => window.removeEventListener('scroll', closeOnScroll, true);
    }, [activeRowDropdown]);

    const StatCardSkeleton = () => (
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm animate-pulse">
            <div className="h-3 bg-slate-200 rounded w-24 mb-2" />
            <div className="h-6 bg-slate-200 rounded w-20" />
        </div>
    );

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-32 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-10 mx-auto"></div>
            </td>
        </tr>
    );

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
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                        {listLoading && accounts.length === 0 ? (
                            <>
                                <StatCardSkeleton />
                                <StatCardSkeleton />
                                <StatCardSkeleton />
                                <StatCardSkeleton />
                            </>
                        ) : (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-blue-100 text-xs font-medium">Total Accounts</p>
                                            <h3 className="text-lg font-bold mt-1">{stats.total_accounts}</h3>
                                        </div>
                                        <FiTrendingUp className="w-5 h-5 opacity-80" />
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.05 }}
                                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-4 text-white shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-indigo-100 text-xs font-medium">Total Balance</p>
                                            <h3 className="text-lg font-bold mt-1">₹{formatCurrency(stats.total_balance)}</h3>
                                        </div>
                                        <TbCurrencyRupee className="w-5 h-5 opacity-80" />
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.1 }}
                                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-4 text-white shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-emerald-100 text-xs font-medium">Total Credit</p>
                                            <h3 className="text-lg font-bold mt-1">₹{formatCurrency(stats.total_credit)}</h3>
                                        </div>
                                        <FiTrendingUp className="w-5 h-5 opacity-80" />
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.15 }}
                                    className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-lg p-4 text-white shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-rose-100 text-xs font-medium">Total Debit</p>
                                            <h3 className="text-lg font-bold mt-1">₹{formatCurrency(stats.total_debit)}</h3>
                                        </div>
                                        <TbCurrencyRupee className="w-5 h-5 opacity-80" />
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </div>

                    {/* Main Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
                    >
                        {/* Card Header */}
                        <div className="border-b border-slate-200 px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                                        <FiTrendingUp className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h5 className="text-lg font-bold leading-none text-slate-800">
                                        Capital Accounts
                                    </h5>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    {/* Search Input */}
                                    <div className="relative w-full sm:w-64">
                                        <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search accounts..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Export Dropdown */}
                                    <div className="dropdown-container relative shrink-0">
                                        <motion.button
                                            type="button"
                                            onClick={() => setShowAddDropdown(!showAddDropdown)}
                                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow sm:w-auto"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <PiExportBold className="h-4 w-4 shrink-0" />
                                            <span>Export</span>
                                            <FiChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${showAddDropdown ? 'rotate-90' : ''}`} />
                                        </motion.button>

                                        <AnimatePresence>
                                            {showAddDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden"
                                                >
                                                    <div className="py-1">
                                                        <button
                                                            onClick={handleExportClick}
                                                            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                        >
                                                            <div className="p-1.5 bg-red-50 rounded mr-2 group-hover:bg-red-100 transition-colors">
                                                                <PiFilePdfDuotone className="w-3.5 h-3.5 text-red-500" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="font-medium text-xs">Export as PDF</div>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={handleExportClick}
                                                            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                        >
                                                            <div className="p-1.5 bg-green-50 rounded mr-2 group-hover:bg-green-100 transition-colors">
                                                                <PiMicrosoftExcelLogoDuotone className="w-3.5 h-3.5 text-green-500" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="font-medium text-xs">Export as Excel</div>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={() => handleOtherExport('print')}
                                                            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                        >
                                                            <div className="p-1.5 bg-slate-50 rounded mr-2 group-hover:bg-slate-100 transition-colors">
                                                                <FiPrinter className="w-3.5 h-3.5 text-slate-600" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="font-medium text-xs">Print Report</div>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Add Account Button */}
                                    <motion.button
                                        type="button"
                                        onClick={() => setShowAddModal(true)}
                                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow sm:w-auto"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiPlus className="h-4 w-4 shrink-0" />
                                        <span>Add Account</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Table Container */}
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[5%]">
                                            #
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[30%]">
                                            Account Name
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[30%]">
                                            Remark
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[20%]">
                                            Balance
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[15%]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {listLoading ? (
                                        [...Array(pagination.limit > 5 ? 5 : pagination.limit)].map((_, index) => (
                                            <SkeletonRow key={`sk-${index}`} />
                                        ))
                                    ) : accounts.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiTrendingUp className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No capital accounts found</p>
                                                    <p className="text-slate-500 text-xs mb-4">Start by creating your first capital account</p>
                                                    <motion.button
                                                        onClick={() => setShowAddModal(true)}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow transition-all duration-200"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Create Your First Capital Account
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        accounts.map((account, index) => {
                                            const isNegativeBalance = Number(account.balance) < 0;
                                            const displayBalance = isNegativeBalance ? -account.balance : account.balance;

                                            return (
                                                <motion.tr
                                                    key={account.capital_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="hover:bg-blue-50/20 transition-colors duration-150"
                                                >
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-700 font-medium text-xs">
                                                            {(pagination.page - 1) * pagination.limit + index + 1}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="px-2">
                                                            <div className="text-slate-800 font-semibold text-xs truncate">
                                                                {account.name}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="px-2">
                                                            <div className="text-slate-500 text-[10px] italic overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px] text-center mx-auto">
                                                                {account.remark || '-'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenLedger(account)}
                                                            className={`inline-flex items-center justify-center font-bold px-3 py-1.5 rounded text-xs transition-colors hover:ring-2 hover:ring-blue-200 ${isNegativeBalance ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-800' : 'bg-gradient-to-r from-green-50 to-green-100 text-green-800'}`}
                                                            title="View ledger"
                                                        >
                                                            {isNegativeBalance ? '-' : ''}₹{formatCurrency(displayBalance)}
                                                        </button>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="flex items-center justify-center">
                                                            <div className="dropdown-container relative">
                                                                <motion.button
                                                                    type="button"
                                                                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                    onClick={(e) => toggleRowDropdown(account.capital_id, e)}
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    title="Actions"
                                                                    aria-label="Row actions"
                                                                >
                                                                    <FiMenu className="w-3.5 h-3.5" />
                                                                </motion.button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {!listLoading && accounts.length > 0 && (
                            <TablePagination
                                page={pagination.page}
                                limit={pagination.limit}
                                total={pagination.total}
                                totalPages={pagination.total_pages}
                                isLastPage={pagination.is_last_page}
                                rowOptions={[5, 10, 20, 50, 100]}
                                defaultRows={10}
                                onPageChange={handlePageChange}
                                onLimitChange={handleLimitChange}
                            />
                        )}
                    </motion.div>
                </div>
            </div>

            {activeRowDropdown && activeAccount && createPortal(
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    data-capital-actions-menu
                    className="fixed z-[10040] w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                    style={{
                        top: dropdownPos.top,
                        bottom: dropdownPos.bottom,
                        right: dropdownPos.right,
                        minWidth: ACTIONS_MENU_WIDTH,
                    }}
                >
                    <button
                        type="button"
                        onClick={() => {
                            handleViewDetails(activeAccount.capital_id);
                            setActiveRowDropdown(null);
                        }}
                        className="flex w-full items-center px-3 py-2 text-xs text-slate-700 transition-colors duration-150 hover:bg-blue-50"
                    >
                        <div className="mr-2 rounded bg-slate-50 p-1">
                            <FiEye className="h-3 w-3 text-slate-600" />
                        </div>
                        <div className="text-left font-medium">View Details</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            handleEditClick(activeAccount.capital_id);
                            setActiveRowDropdown(null);
                        }}
                        className="flex w-full items-center px-3 py-2 text-xs text-slate-700 transition-colors duration-150 hover:bg-blue-50"
                    >
                        <div className="mr-2 rounded bg-blue-50 p-1">
                            <FiEdit className="h-3 w-3 text-blue-500" />
                        </div>
                        <div className="text-left font-medium">Edit Account</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteAccount(activeAccount.capital_id)}
                        className="flex w-full items-center px-3 py-2 text-xs text-red-600 transition-colors duration-150 hover:bg-red-50"
                    >
                        <div className="mr-2 rounded bg-red-50 p-1">
                            <FiTrash2 className="h-3 w-3 text-red-500" />
                        </div>
                        <div className="text-left font-medium">Delete Account</div>
                    </button>
                </motion.div>,
                document.body
            )}

            {/* Add Account Modal */}
            <CapitalAccountFormModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSubmit={handleCreateAccount}
                formData={formData}
                onChange={handleInputChange}
                onDateChange={handleDateChange}
                loading={submitting}
                mode="add"
                title="Add Capital Account"
            />

            {/* Edit Account Modal */}
            <CapitalAccountFormModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSubmit={handleEditAccount}
                formData={editFormData}
                onChange={handleEditInputChange}
                onDateChange={handleEditDateChange}
                loading={submitting}
                mode="edit"
                title="Edit Capital Account"
            />

            {/* View Details Modal */}
            <CapitalAccountDetailsModal
                isOpen={showViewModal}
                onClose={closeViewModal}
                account={selectedAccount}
                loading={detailsLoading}
                formatCurrency={formatCurrency}
            />

            {/* Export Modal */}
            <CapitalExportModal
                isOpen={exportModalOpen}
                onClose={() => { setExportModalOpen(false); setExportData([]); setExportColumns([]); }}
                exportData={exportData}
                columns={exportColumns}
                jobType="capital_accounts_report"
            />

            {/* Export Confirmation Modal */}
            <AnimatePresence>
                {exportModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-white rounded-xl p-6 max-w-sm w-full mx-auto shadow-xl"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PiExportBold className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">
                                    Exporting {exportModal.type.toUpperCase()}
                                </h3>
                                <p className="text-slate-600 mb-6 text-sm">
                                    Your {exportModal.type} export is being processed...
                                </p>
                                <div className="flex justify-center space-x-2 mb-6">
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    This will only take a moment...
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CapitalAccounts;
