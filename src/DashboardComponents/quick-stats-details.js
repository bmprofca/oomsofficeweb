import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft,
    FiRefreshCw,
    FiAlertCircle,
    FiUsers,
    FiShoppingBag,
    FiGift,
    FiEye,
    FiDownload,
    FiSearch,
    FiUser,
    FiBriefcase,
    FiPhone,
    FiMail,
    FiMail as FiMailIcon,
    FiCalendar as FiCalendarIcon,
    FiClock,
    FiX,
    FiCheckSquare,
    FiFileText,
    FiMoreVertical,
    FiFilter,
    FiBell,
    FiFile,
    FiArchive,
    FiMessageSquare,
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import { Sidebar, Header } from '../components/header';
import TablePagination from '../components/TablePagination';
import ClientPaymentReminderModal from '../components/Modals/ClientPaymentReminderModal';
import ClientBirthdayReminderModal from '../components/Modals/ClientBirthdayReminderModal';
import FirmsDetailsModal from '../components/Modals/FirmsDetailsModal';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import toast from 'react-hot-toast';

const AnimatedCheckbox = ({
    checked,
    indeterminate = false,
    onChange,
    ariaLabel,
    disabled = false,
}) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.indeterminate = indeterminate;
        }
    }, [indeterminate, checked]);

    const isActive = checked || indeterminate;

    return (
        <label
            className={`relative inline-flex items-center group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
            <input
                ref={inputRef}
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={onChange}
                aria-label={ariaLabel}
                disabled={disabled}
            />
            <motion.span
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-2 transition-colors duration-200 ${isActive
                    ? 'border-indigo-600 bg-indigo-600 shadow-sm shadow-indigo-200'
                    : 'border-gray-300 bg-white group-hover:border-indigo-400'
                    }`}
                animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}
                transition={{ duration: 0.18 }}
                whileTap={disabled ? {} : { scale: 0.92 }}
            >
                <AnimatePresence initial={false} mode="wait">
                    {indeterminate ? (
                        <motion.span
                            key="dash"
                            className="block h-0.5 w-2 rounded-full bg-white"
                            initial={{ opacity: 0, scaleX: 0.4 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0, scaleX: 0.4 }}
                            transition={{ duration: 0.12 }}
                        />
                    ) : checked ? (
                        <motion.svg
                            key="check"
                            viewBox="0 0 12 12"
                            className="h-3 w-3 text-white"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.15 }}
                        >
                            <path
                                d="M2.5 6l2.2 2.2 4.8-4.8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </motion.svg>
                    ) : null}
                </AnimatePresence>
            </motion.span>
        </label>
    );
};

const BirthdayActionMenuItems = ({ client, onClose, navigate, onBirthdayReminder }) => {
    const username = client?.personal_details?.username || client?.username;
    const itemClass =
        'flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50';

    return (
        <div className="py-1">
            <button
                type="button"
                onClick={() => {
                    onClose?.();
                    if (username) navigate(`/client/profile/${encodeURIComponent(username)}`);
                }}
                className={itemClass}
            >
                <FiEye className="mr-3 h-4 w-4 text-blue-600" />
                View Profile
            </button>
            <button
                type="button"
                onClick={() => {
                    onClose?.();
                    onBirthdayReminder?.(client);
                }}
                className={itemClass}
            >
                <FiGift className="mr-3 h-4 w-4 text-rose-600" />
                Birthday Reminder
            </button>
        </div>
    );
};

const DebtorActionMenuItems = ({ client, onClose, navigate }) => {
    const username = client?.username;
    const go = (tab) => {
        onClose?.();
        if (!username) return;
        navigate(
            tab
                ? `/client/profile/${encodeURIComponent(username)}/${tab}`
                : `/client/profile/${encodeURIComponent(username)}`
        );
    };

    const itemClass =
        'flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50';

    return (
        <div className="py-1">
            <button type="button" onClick={() => go()} className={itemClass}>
                <FiEye className="mr-3 h-4 w-4 text-blue-600" />
                View Details
            </button>
            <button type="button" onClick={() => go('task')} className={itemClass}>
                <FiCheckSquare className="mr-3 h-4 w-4 text-indigo-600" />
                Tasks
            </button>
            <button type="button" onClick={() => go('billing')} className={itemClass}>
                <FiFileText className="mr-3 h-4 w-4 text-emerald-600" />
                Billing
            </button>
            <button type="button" onClick={() => go('notes')} className={itemClass}>
                <FiFile className="mr-3 h-4 w-4 text-amber-600" />
                Notes
            </button>
            <button type="button" onClick={() => go('documents')} className={itemClass}>
                <FiArchive className="mr-3 h-4 w-4 text-violet-600" />
                Documents
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
                type="button"
                onClick={() => {
                    onClose?.();
                }}
                className={itemClass}
            >
                <FiMessageSquare className="mr-3 h-4 w-4 text-purple-600" />
                Send Message
            </button>
        </div>
    );
};

const QuickStatsDetailsPage = () => {
    const { type } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const locationState = location.state || {};

    // Today payment / receive now open the finance register pages
    useEffect(() => {
        if (type === 'today-received') {
            navigate('/finance/voucher/received?today=true', { replace: true });
            return;
        }
        if (type === 'today-payment') {
            navigate('/finance/voucher/payment?today=true', { replace: true });
        }
    }, [type, navigate]);

    // Sidebar state
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 10,
        total: 0,
        total_pages: 1,
        is_last_page: false
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [balanceAfterInput, setBalanceAfterInput] = useState('');
    const [debouncedBalanceAfter, setDebouncedBalanceAfter] = useState(0);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [meta, setMeta] = useState({ debtor_count: 0, debtor_balance: 0, creditor_count: 0, creditor_balance: 0 });
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({
        top: undefined,
        bottom: undefined,
        right: 0,
        openUpward: false,
    });
    const [firmsModal, setFirmsModal] = useState({ open: false, firms: [], clientName: '' });

    // Multi-Select State
    const [selectedDebtors, setSelectedDebtors] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);
    const selectedDebtorCount = selectAllAcrossPages
        ? pagination.total
        : selectedDebtors.size;

    // Payment Reminder Modal State
    const [clientPaymentReminder, setClientPaymentReminder] = useState({
        open: false,
        clients: [],
        isAll: false,
    });

    // Birthday Reminder Modal State
    const [clientBirthdayReminder, setClientBirthdayReminder] = useState({
        open: false,
        clients: [],
        isAll: false,
    });

    const selectedBirthdayCount = selectAllAcrossPages
        ? pagination.total
        : selectedDebtors.size;

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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setActiveRowDropdown(null);
                setShowFilterDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update selectAll when selectedDebtors changes
    useEffect(() => {
        const debtorsList = data?.list || [];
        const getRowUsername = (item) =>
            item?.username || item?.personal_details?.username || '';
        if (selectAllAcrossPages) {
            setSelectAll(true);
        } else if (
            debtorsList.length > 0 &&
            debtorsList.every((item) => {
                const username = getRowUsername(item);
                return username && selectedDebtors.has(username);
            })
        ) {
            setSelectAll(true);
        } else {
            setSelectAll(false);
        }
    }, [selectedDebtors, selectAllAcrossPages, data]);

    const formatCurrency = (value) => {
        const amount = parseFloat(value) || 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatNumber = (value) => {
        const num = parseInt(value) || 0;
        return new Intl.NumberFormat('en-IN').format(num);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeParam = () => {
        switch (type) {
            case 'pending-billing': return 'pending_billing';
            case 'creditors': return 'creditors';
            case 'debtors': return 'debtors';
            case 'today-birthday': return 'today_birthday';
            default: return type;
        }
    };

    const isClientBalanceList = type === 'debtors' || type === 'creditors';

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim());
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const parsed = Math.max(0, Number(balanceAfterInput) || 0);
            setDebouncedBalanceAfter(parsed);
        }, 400);
        return () => clearTimeout(timer);
    }, [balanceAfterInput]);

    const fetchDetails = async (pageNo = 1, limit = 10) => {
        try {
            setLoading(true);
            setError(null);

            const apiType = getTypeParam();
            const headers = getHeaders();
            const searchQuery = isClientBalanceList && debouncedSearch
                ? `&search=${encodeURIComponent(debouncedSearch)}`
                : '';
            const balanceQuery = type === 'debtors'
                ? `&balance_after=${debouncedBalanceAfter || 0}`
                : '';
            const response = await fetch(
                `${API_BASE_URL}/report/dashboard/details?type=${apiType}&page_no=${pageNo}&limit=${limit}${searchQuery}${balanceQuery}`,
                {
                    method: 'GET',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                setData(result.data);
                if (result.data.pagination) {
                    setPagination(result.data.pagination);
                }
                if (result.data.meta) {
                    setMeta(result.data.meta);
                }
                // Clear selections when data changes
                setSelectedDebtors(new Set());
                setSelectAll(false);
            } else {
                throw new Error(result.message || 'Failed to fetch details');
            }
        } catch (err) {
            console.error('Details API Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setSearchTerm('');
        setDebouncedSearch('');
        setBalanceAfterInput('');
        setDebouncedBalanceAfter(0);
        setMeta({ debtor_count: 0, debtor_balance: 0, creditor_count: 0, creditor_balance: 0 });
        setPagination(prev => ({ ...prev, page_no: 1 }));
        setSelectedDebtors(new Set());
        setSelectAll(false);
        setSelectAllAcrossPages(false);
        setActiveRowDropdown(null);
    }, [type]);

    useEffect(() => {
        if (type === 'today-received' || type === 'today-payment') {
            return;
        }
        fetchDetails(1, pagination.limit);
    }, [type, debouncedSearch, debouncedBalanceAfter]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            fetchDetails(newPage, pagination.limit);
        }
    };

    const handleLimitChange = (newLimit) => {
        const limit = Math.min(100, Math.max(1, Number(newLimit) || 10));
        setPagination((prev) => ({ ...prev, limit, page_no: 1 }));
        fetchDetails(1, limit);
    };

    const renderListPagination = () => (
        pagination.total > 0 ? (
            <TablePagination
                page={pagination.page_no}
                limit={pagination.limit}
                total={pagination.total}
                totalPages={pagination.total_pages}
                isLastPage={pagination.is_last_page}
                rowOptions={[10, 20, 50, 100]}
                defaultRows={10}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
            />
        ) : null
    );

    const handleRefresh = () => {
        fetchDetails();
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setPagination(prev => ({ ...prev, page_no: 1 }));
    };

    const handleClearFilters = () => {
        setBalanceAfterInput('');
        setDebouncedBalanceAfter(0);
        setPagination(prev => ({ ...prev, page_no: 1 }));
    };

    const toggleRowDropdown = (username, e) => {
        if (activeRowDropdown === username) {
            setActiveRowDropdown(null);
            return;
        }

        const rect = e?.currentTarget?.getBoundingClientRect?.();
        if (rect) {
            const estimatedHeight = 260;
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUpward = spaceBelow < estimatedHeight + 8;
            setDropdownPos({
                top: openUpward ? undefined : rect.bottom + 4,
                bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
                right: window.innerWidth - rect.right,
                openUpward,
            });
        }

        setActiveRowDropdown(username);
    };

    const getLastUpdatedFirm = (firms) => {
        if (!firms || firms.length === 0) return null;
        const sortedFirms = [...firms].sort((a, b) => {
            const dateA = a.modify_date || a.create_date;
            const dateB = b.modify_date || b.create_date;
            return new Date(dateB) - new Date(dateA);
        });
        return sortedFirms[0];
    };

    const openFirmsModal = (firms, clientName) => {
        setFirmsModal({ open: true, firms: firms || [], clientName: clientName || '' });
    };

    const closeFirmsModal = () => {
        setFirmsModal({ open: false, firms: [], clientName: '' });
    };

    const renderFirmsCell = (item) => {
        const lastFirm = getLastUpdatedFirm(item.firms);
        const firmCount = item.firms?.length || 0;

        if (firmCount === 0) {
            return <div className="text-sm text-gray-500 italic">No firms</div>;
        }

        return (
            <div
                className="cursor-pointer hover:bg-gray-100 transition-colors text-center p-2 rounded-lg"
                onClick={() => openFirmsModal(item.firms, item.name)}
            >
                <div className="font-medium text-gray-800 text-sm mb-1 truncate">{lastFirm?.firm_name || 'N/A'}</div>
                <div className="space-y-1">
                    <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {firmCount} firm{firmCount !== 1 ? 's' : ''}
                    </div>
                    {firmCount > 1 && (
                        <div className="text-xs text-blue-600 font-medium">
                            +{firmCount - 1} more firm{firmCount - 1 > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Multi-Select Handlers
    const handleSelectDebtor = (username) => {
        const newSelected = selectAllAcrossPages
            ? new Set((data?.list || []).map(item => item.username).filter(Boolean))
            : new Set(selectedDebtors);
        if (selectAllAcrossPages) setSelectAllAcrossPages(false);
        if (newSelected.has(username)) {
            newSelected.delete(username);
        } else {
            newSelected.add(username);
        }
        setSelectedDebtors(newSelected);
    };

    const handleSelectAll = () => {
        const debtorsList = data?.list || [];
        if (selectAll) {
            setSelectedDebtors(new Set());
        } else {
            const allUsernames = debtorsList
                .map((item) => item?.username || item?.personal_details?.username)
                .filter(Boolean);
            setSelectedDebtors(new Set(allUsernames));
        }
        setSelectAllAcrossPages(false);
        setSelectAll(!selectAll);
    };

    const clearSelection = () => {
        setSelectedDebtors(new Set());
        setSelectAll(false);
        setSelectAllAcrossPages(false);
    };

    const openClientPaymentReminderModal = (client) => {
        if (!client || Number(client.balance) <= 0) return;
        setClientPaymentReminder({ open: true, clients: [client], isAll: false });
    };

    const closeClientPaymentReminderModal = () => {
        setClientPaymentReminder({ open: false, clients: [], isAll: false });
    };

    const openBulkReminderModal = () => {
        if (selectAllAcrossPages) {
            setClientPaymentReminder({
                open: true,
                clients: [],
                isAll: true,
            });
            return;
        }

        const debtorsList = data?.list || [];
        const selectedDebtorsList = debtorsList.filter(
            item => selectedDebtors.has(item.username) && Number(item.balance) > 0
        );

        if (selectedDebtorsList.length === 0) {
            toast.error('Select at least one debtor with a positive balance');
            return;
        }

        setClientPaymentReminder({
            open: true,
            clients: selectedDebtorsList,
            isAll: false,
        });
    };

    const toBirthdayClientPayload = (item) => {
        const username = item?.personal_details?.username || item?.username;
        if (!username) return null;
        return {
            username,
            name: item.name || username,
            email: item.contact?.email || item.email || '',
            mobile: item.contact?.mobile || item.mobile || '',
            country_code: item.contact?.country_code || item.country_code || '',
            date_of_birth: item.date_of_birth || null,
            age: item.age || null,
        };
    };

    const openClientBirthdayReminderModal = (item) => {
        const client = toBirthdayClientPayload(item);
        if (!client) return;
        setClientBirthdayReminder({ open: true, clients: [client], isAll: false });
    };

    const closeClientBirthdayReminderModal = () => {
        setClientBirthdayReminder({ open: false, clients: [], isAll: false });
    };

    const openBulkBirthdayReminderModal = () => {
        if (selectAllAcrossPages) {
            setClientBirthdayReminder({
                open: true,
                clients: [],
                isAll: true,
            });
            return;
        }

        const list = data?.list || [];
        const selected = list
            .filter((item) => {
                const username = item?.personal_details?.username || item?.username;
                return username && selectedDebtors.has(username);
            })
            .map(toBirthdayClientPayload)
            .filter(Boolean);

        if (selected.length === 0) {
            toast.error('Select at least one client');
            return;
        }

        setClientBirthdayReminder({
            open: true,
            clients: selected,
            isAll: false,
        });
    };

    const getBirthdayUsername = (item) =>
        item?.personal_details?.username || item?.username || '';

    const getPageTitle = () => {
        switch (type) {
            case 'pending-billing': return 'Pending Billing';
            case 'creditors': return 'Creditors List';
            case 'debtors': return 'Debtors List';
            case 'today-birthday': return "Today's Birthdays";
            default: return locationState.title || 'Details';
        }
    };

    const getPageDescription = () => {
        switch (type) {
            case 'pending-billing': return 'List of all pending billing invoices';
            case 'creditors': return 'List of all creditors with outstanding balances';
            case 'debtors': return 'List of all debtors with receivable balances';
            case 'today-birthday': return 'Clients celebrating birthday today';
            default: return 'Detailed information';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'pending-billing': return <FiShoppingBag className="w-4 h-4" />;
            case 'creditors': return <FiUsers className="w-4 h-4" />;
            case 'debtors': return <TbCurrencyRupee className="w-4 h-4" />;
            case 'today-birthday': return <FiGift className="w-4 h-4" />;
            default: return <FiUsers className="w-4 h-4" />;
        }
    };

    const debtorColumns = [
        { id: 'name', label: 'Client Details', flex: '1.5' },
        { id: 'mobile', label: 'Mobile', flex: '1' },
        { id: 'firms', label: 'Firms', flex: '1.2' },
        { id: 'balance', label: 'Balance', flex: '1' },
        { id: 'last_payment', label: 'Last Payment', flex: '1.2' },
        { id: 'actions', label: 'Actions', flex: '0.8' },
    ];

    const creditorColumns = [
        { id: 'name', label: 'Client Details', flex: '1.5' },
        { id: 'mobile', label: 'Mobile', flex: '1' },
        { id: 'firms', label: 'Firms', flex: '1.2' },
        { id: 'balance', label: 'Balance', flex: '1' },
        { id: 'actions', label: 'Actions', flex: '0.8' },
    ];

    const renderRowActionMenu = (item) => {
        return (
            <div className="relative dropdown-container flex justify-center">
                <motion.button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleRowDropdown(item.username, e);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FiMoreVertical className="w-4 h-4 text-gray-700" />
                </motion.button>
            </div>
        );
    };

    const renderBalanceListTable = (variant = 'debtors') => {
        const isDebtor = variant === 'debtors';
        const columns = isDebtor ? debtorColumns : creditorColumns;
        const listLabel = isDebtor ? 'Debtors' : 'Creditors';
        const emptyMessage = isDebtor ? 'No debtors found' : 'No creditors found';
        const tableMinWidth = isDebtor ? '1100px' : '960px';
        const metaCount = isDebtor ? (meta.debtor_count || pagination.total) : (meta.creditor_count || pagination.total);
        const balanceBadgeClass = isDebtor
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200';
        const list = data?.list || [];

        const SkeletonRow = () => (
            <div className="flex items-center border-b border-gray-100 animate-pulse p-3">
                <div className="w-12 flex-shrink-0"><div className="h-4 bg-gray-200 rounded w-8" /></div>
                <div className="w-12 flex-shrink-0 border-l border-gray-100 p-3"><div className="h-4 bg-gray-200 rounded w-4 mx-auto" /></div>
                {columns.map((col) => (
                    <div key={col.id} className="flex-1 p-3 border-l border-gray-100" style={{ flex: col.flex }}>
                        <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto" />
                    </div>
                ))}
            </div>
        );

        const MobileListCard = ({ item, index }) => {
            const isSelected = selectAllAcrossPages || selectedDebtors.has(item.username);
            return (
                <motion.div
                    className={`bg-white border border-gray-200 rounded-lg p-3 mb-2 md:hidden ${isSelected ? 'ring-2 ring-blue-200' : ''}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <AnimatedCheckbox
                                checked={isSelected}
                                onChange={() => handleSelectDebtor(item.username)}
                                ariaLabel={`Select ${item.name || item.username}`}
                            />
                            <div className="font-bold text-gray-800 text-sm w-4">{index + 1}</div>
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <FiUser className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-semibold text-gray-800 text-sm truncate">{item.name || 'N/A'}</div>
                                <div className="text-xs text-gray-500 truncate leading-tight">{item.guardian_name || 'N/A'}</div>
                                {item.pan_number ? (
                                    <div className="text-xs text-gray-500 font-mono truncate leading-tight">
                                        PAN: {item.pan_number}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                        {renderRowActionMenu(item)}
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                            <FiPhone className="w-3 h-3 text-gray-400" />
                            <span>{item.mobile || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <FiBriefcase className="w-3 h-3 text-gray-400" />
                            <button
                                type="button"
                                className="text-left text-blue-600 hover:underline"
                                onClick={() => openFirmsModal(item.firms, item.name)}
                            >
                                {(item.firms?.length || 0) > 0
                                    ? `${getLastUpdatedFirm(item.firms)?.firm_name || 'Firm'}${item.firms.length > 1 ? ` (+${item.firms.length - 1})` : ''}`
                                    : 'No firms'}
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/client/profile/${encodeURIComponent(item.username)}/ledger`
                                        )
                                    }
                                    className={`font-semibold transition-colors hover:opacity-80 ${isDebtor ? 'text-green-600' : 'text-red-600'}`}
                                    title="View ledger"
                                >
                                    {formatCurrency(isDebtor ? Math.abs(item.balance) : item.balance)}
                                </button>
                                {isDebtor && Number(item.balance) > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => openClientPaymentReminderModal(item)}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm shadow-violet-200 transition hover:brightness-110"
                                        title="Send payment reminder"
                                        aria-label={`Send payment reminder to ${item.name || item.username}`}
                                    >
                                        <FiBell className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            {isDebtor && (
                                <span className="text-xs text-gray-500">{item.last_transaction?.period || 'No payment'}</span>
                            )}
                        </div>
                    </div>
                </motion.div>
            );
        };

        return (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="md:hidden border-b border-gray-200 bg-white px-3 py-2 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AnimatedCheckbox
                                checked={selectAll}
                                indeterminate={
                                    !selectAllAcrossPages &&
                                    selectedDebtors.size > 0 &&
                                    selectedDebtors.size < list.length
                                }
                                onChange={handleSelectAll}
                                ariaLabel={`Select all ${listLabel.toLowerCase()}`}
                            />
                            <span className="font-semibold text-gray-800 text-sm">{listLabel}</span>
                        </div>
                        <span className="text-xs text-gray-600">{formatNumber(metaCount)} {listLabel.toLowerCase()}</span>
                    </div>
                </div>

                {isDebtor && selectAll && pagination.total > list.length && (
                    <div className="border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs text-indigo-800">
                        {selectAllAcrossPages ? (
                            <>
                                All {formatNumber(pagination.total)} debtors are selected.{" "}
                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="font-semibold underline hover:text-indigo-950"
                                >
                                    Clear selection
                                </button>
                            </>
                        ) : (
                            <>
                                All {formatNumber(list.length)} debtors on this page are selected.{" "}
                                <button
                                    type="button"
                                    onClick={() => setSelectAllAcrossPages(true)}
                                    className="font-semibold underline hover:text-indigo-950"
                                >
                                    Select all {formatNumber(pagination.total)} debtors
                                </button>
                            </>
                        )}
                    </div>
                )}

                <div className="flex-1 min-h-0 overflow-auto">
                    {loading ? (
                        <div style={{ minWidth: tableMinWidth }}>
                            {Array.from({ length: 6 }).map((_, index) => <SkeletonRow key={index} />)}
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-12 text-gray-500 px-4">
                            <div className="text-center">
                                <FiAlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                                <p className="text-gray-700 font-medium">{error}</p>
                                <button onClick={() => fetchDetails()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Retry</button>
                            </div>
                        </div>
                    ) : list.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-gray-500 px-4">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FiUser className="w-6 h-6 text-gray-400" />
                                </div>
                                <p className="text-gray-500 font-medium text-sm">{emptyMessage}</p>
                                <p className="text-gray-400 text-xs mt-1">Try adjusting your search{isDebtor ? ' or filters' : ''}</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="md:hidden px-3 py-1">
                                {list.map((item, index) => (
                                    <MobileListCard key={item.username || index} item={item} index={index} />
                                ))}
                            </div>

                            <div className="hidden md:block" style={{ minWidth: tableMinWidth }}>
                                <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
                                    <div className="flex items-center bg-white">
                                        <div className="w-12 p-3 flex-shrink-0 flex justify-center">
                                            <AnimatedCheckbox
                                                checked={selectAll}
                                                indeterminate={
                                                    !selectAllAcrossPages &&
                                                    selectedDebtors.size > 0 &&
                                                    selectedDebtors.size < list.length
                                                }
                                                onChange={handleSelectAll}
                                                ariaLabel={`Select all ${listLabel.toLowerCase()}`}
                                            />
                                        </div>
                                        <div className="w-12 p-3 font-bold text-gray-700 text-xs flex-shrink-0 text-center border-l border-gray-100">#</div>
                                        {columns.map((column) => (
                                            <div
                                                key={column.id}
                                                className="p-3 font-semibold text-gray-700 text-xs flex-shrink-0 text-center border-l border-gray-100"
                                                style={{ flex: column.flex, minWidth: column.id === 'name' ? '180px' : column.id === 'firms' ? '160px' : '120px' }}
                                            >
                                                <div className="truncate">{column.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {list.map((item, index) => {
                                    const isSelected = selectAllAcrossPages || selectedDebtors.has(item.username);
                                    return (
                                        <motion.div
                                            key={item.username || index}
                                            className={`flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors bg-white ${isSelected ? 'bg-blue-50/40' : ''}`}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                        >
                                            <div className="w-12 p-3 flex-shrink-0 flex justify-center">
                                                <AnimatedCheckbox
                                                    checked={isSelected}
                                                    onChange={() => handleSelectDebtor(item.username)}
                                                    ariaLabel={`Select ${item.name || item.username}`}
                                                />
                                            </div>
                                            <div className="w-12 p-3 flex-shrink-0 text-center border-l border-gray-100">
                                                <span className="font-bold text-gray-800 text-xs">{((pagination.page_no - 1) * pagination.limit) + index + 1}</span>
                                            </div>
                                            <div className="p-3 min-w-0 border-l border-gray-100 flex-shrink-0" style={{ flex: '1.5', minWidth: '180px' }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                                        <FiUser className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div className="min-w-0 flex-1 text-left cursor-pointer hover:text-blue-600" onClick={() => navigate(`/client/profile/${item.username}`)}>
                                                        <div className="font-semibold text-gray-800 text-sm truncate">{item.name || 'N/A'}</div>
                                                        <div className="text-xs text-gray-500 truncate leading-tight">{item.guardian_name || 'N/A'}</div>
                                                        {item.pan_number ? (
                                                            <div className="text-xs text-gray-500 font-mono truncate leading-tight">
                                                                PAN: {item.pan_number}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-3 min-w-0 text-center border-l border-gray-100 flex-shrink-0" style={{ flex: '1', minWidth: '120px' }}>
                                                <div className="flex items-center justify-center text-gray-700 font-medium text-sm gap-2">
                                                    <FiPhone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{item.mobile || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="p-3 min-w-0 border-l border-gray-100 flex-shrink-0" style={{ flex: '1.2', minWidth: '160px' }}>
                                                {renderFirmsCell(item)}
                                            </div>
                                            <div className="p-3 min-w-0 text-center border-l border-gray-100 flex-shrink-0" style={{ flex: '1', minWidth: '120px' }}>
                                                <div className="inline-flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/client/profile/${encodeURIComponent(item.username)}/ledger`
                                                            )
                                                        }
                                                        className={`inline-flex items-center px-3 py-1 rounded text-sm font-semibold border transition-colors hover:opacity-90 ${balanceBadgeClass}`}
                                                        title="View ledger"
                                                    >
                                                        {formatCurrency(isDebtor ? Math.abs(item.balance) : item.balance)}
                                                    </button>
                                                    {isDebtor && Number(item.balance) > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openClientPaymentReminderModal(item)}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-md"
                                                            title="Send payment reminder"
                                                            aria-label={`Send payment reminder to ${item.name || item.username}`}
                                                        >
                                                            <FiBell className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {isDebtor && (
                                                <div className="p-3 min-w-0 text-center border-l border-gray-100 flex-shrink-0" style={{ flex: '1.2', minWidth: '140px' }}>
                                                    <div className="text-sm text-gray-700 font-medium">{item.last_transaction?.date ? formatDate(item.last_transaction.date) : 'N/A'}</div>
                                                    <div className="text-xs text-gray-500">{item.last_transaction?.period || 'No payment'}</div>
                                                </div>
                                            )}
                                            <div className="p-3 min-w-0 border-l border-gray-100 flex-shrink-0" style={{ flex: '0.8', minWidth: '72px' }}>
                                                {renderRowActionMenu(item)}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {!loading && !error && pagination.total > 0 && renderListPagination()}
            </div>
        );
    };

    const renderBalanceListPage = (variant) => {
        const isDebtor = variant === 'debtors';
        const pageTitle = isDebtor ? 'Debtors List' : 'Creditors List';
        const pageDescription = isDebtor
            ? 'Clients with outstanding receivable balances'
            : 'Clients with outstanding payable balances';
        const searchPlaceholder = isDebtor ? 'Search debtors...' : 'Search creditors...';
        const countLabel = isDebtor ? 'Debtors' : 'Creditors';
        const countValue = isDebtor ? (meta.debtor_count || 0) : (meta.creditor_count || 0);
        const balanceValue = isDebtor ? (meta.debtor_balance || 0) : (meta.creditor_balance || 0);
        const countBadgeClass = isDebtor ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-cyan-50 text-cyan-700 border-cyan-100';
        const balanceBadgeClass = isDebtor ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100';

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

                <div className={`pt-16 transition-all duration-300 ease-in-out min-w-0 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                    <div className="h-full flex flex-col min-w-0">
                        <motion.div
                            className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-[calc(100vh-5.5rem)] mx-2 sm:mx-4 md:mx-8 my-3 md:my-4 overflow-hidden"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="border-b border-gray-200 px-3 md:px-4 py-3 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 md:gap-3">
                                    <div className="w-full md:w-auto">
                                        <h5 className="text-base md:text-lg font-bold text-gray-800 mb-0.5">{pageTitle}</h5>
                                        <p className="text-gray-500 text-xs">{pageDescription}</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${countBadgeClass}`}>
                                                {countLabel}: {formatNumber(countValue)}
                                            </span>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${balanceBadgeClass}`}>
                                                Total Balance: {formatCurrency(balanceValue)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full lg:w-auto">
                                        <div className="flex-1 md:flex-none md:min-w-[220px] lg:min-w-[260px]">
                                            <div className="relative">
                                                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="text"
                                                    placeholder={searchPlaceholder}
                                                    value={searchTerm}
                                                    onChange={(e) => {
                                                        setSearchTerm(e.target.value);
                                                        setPagination(prev => ({ ...prev, page_no: 1 }));
                                                    }}
                                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isDebtor && (
                                                <div className="dropdown-container relative">
                                                    <motion.button
                                                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-2 shadow-sm text-sm"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FiFilter className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Filter</span>
                                                    </motion.button>
                                                    <AnimatePresence>
                                                        {showFilterDropdown && (
                                                            <motion.div
                                                                className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-[60] p-3"
                                                                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                                            >
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                                    Minimum Balance (â‚¹)
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="1"
                                                                    placeholder="0 = all debtors"
                                                                    value={balanceAfterInput}
                                                                    onChange={(e) => {
                                                                        setBalanceAfterInput(e.target.value);
                                                                        setPagination(prev => ({ ...prev, page_no: 1 }));
                                                                    }}
                                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                                />
                                                                <p className="text-[11px] text-gray-500 mt-1">Show debtors with balance equal to or above this amount.</p>
                                                                <div className="flex justify-between gap-2 mt-3">
                                                                    <button onClick={handleClearFilters} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100">Reset</button>
                                                                    <button onClick={() => setShowFilterDropdown(false)} className="w-full px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}

                                            {isDebtor && selectedDebtorCount > 0 && (
                                                <motion.button
                                                    onClick={openBulkReminderModal}
                                                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FiMailIcon className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Reminder ({selectedDebtorCount})</span>
                                                </motion.button>
                                            )}

                                            <motion.button
                                                onClick={handleRefresh}
                                                disabled={loading}
                                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-300 hover:bg-gray-100 transition shadow-sm disabled:opacity-50"
                                                whileHover={{ scale: 1.08 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiRefreshCw className={`w-4 h-4 text-gray-700 ${loading ? 'animate-spin' : ''}`} />
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
                                {renderBalanceListTable(variant)}
                            </div>
                        </motion.div>
                    </div>
                </div>

                <ClientPaymentReminderModal
                    isOpen={clientPaymentReminder.open}
                    onClose={closeClientPaymentReminderModal}
                    onSuccess={clearSelection}
                    clients={clientPaymentReminder.clients}
                    isAll={clientPaymentReminder.isAll}
                />
                {activeRowDropdown !== null &&
                    createPortal(
                        (() => {
                            const list = data?.list || [];
                            const activeClient = list.find(
                                (item) => item.username === activeRowDropdown
                            );
                            if (!activeClient) return null;
                            return (
                                <motion.div
                                    initial={{
                                        opacity: 0,
                                        scale: 0.95,
                                        y: dropdownPos.openUpward ? 6 : -6,
                                    }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.12 }}
                                    className="dropdown-container fixed bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                                    style={{
                                        top: dropdownPos.top,
                                        bottom: dropdownPos.bottom,
                                        right: dropdownPos.right,
                                        width: '224px',
                                        zIndex: 9999,
                                    }}
                                >
                                    <DebtorActionMenuItems
                                        client={activeClient}
                                        navigate={navigate}
                                        onClose={() => setActiveRowDropdown(null)}
                                    />
                                </motion.div>
                            );
                        })(),
                        document.body
                    )}
                <FirmsDetailsModal
                    isOpen={firmsModal.open}
                    onClose={closeFirmsModal}
                    firms={firmsModal.firms}
                    clientName={firmsModal.clientName}
                />
            </div>
        );
    };

    const formatDob = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatShortDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderBirthdayTable = () => {
        const list = data?.list || [];

        if (loading) {
            return (
                <div className="flex justify-center items-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center justify-center py-12 px-4 text-center">
                    <div>
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-3">
                            <FiAlertCircle className="w-7 h-7 text-red-500" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-800 mb-1">Failed to load data</h3>
                        <p className="text-xs text-gray-500 mb-4">{error}</p>
                        <button
                            type="button"
                            onClick={() => fetchDetails()}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                        >
                            <FiRefreshCw className="w-4 h-4" />
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        if (list.length === 0) {
            return (
                <div className="flex items-center justify-center py-12 px-4 text-center">
                    <div>
                        <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiGift className="w-7 h-7 text-rose-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No birthdays today</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Check back tomorrow for new celebrations
                        </p>
                    </div>
                </div>
            );
        }

        const renderBirthdayActionMenu = (item) => {
            const username = getBirthdayUsername(item);
            if (!username) return <span className="text-sm text-gray-400">—</span>;
            const isOpen = activeRowDropdown === username;
            return (
                <div className="dropdown-container relative flex justify-center">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            if (isOpen) {
                                setActiveRowDropdown(null);
                                return;
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            const menuHeight = 120;
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;
                            setDropdownPos({
                                top: openUpward ? undefined : rect.bottom + 4,
                                bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
                                right: Math.max(8, window.innerWidth - rect.right),
                                openUpward,
                            });
                            setActiveRowDropdown(username);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
                        title="Actions"
                        aria-label={`Actions for ${item.name || username}`}
                    >
                        <FiMoreVertical className="w-4 h-4" />
                    </button>
                </div>
            );
        };

        return (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="md:hidden border-b border-gray-200 bg-white px-3 py-2 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AnimatedCheckbox
                                checked={selectAll}
                                indeterminate={
                                    !selectAllAcrossPages &&
                                    selectedDebtors.size > 0 &&
                                    selectedDebtors.size < list.length
                                }
                                onChange={handleSelectAll}
                                ariaLabel="Select all birthdays"
                            />
                            <span className="font-semibold text-gray-800 text-sm">Birthdays</span>
                        </div>
                        <span className="text-xs text-gray-600">
                            {formatNumber(pagination.total)} clients
                        </span>
                    </div>
                </div>

                {selectAll && pagination.total > list.length && (
                    <div className="border-b border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs text-rose-800">
                        {selectAllAcrossPages ? (
                            <>
                                All {formatNumber(pagination.total)} birthday clients are selected.{' '}
                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="font-semibold underline hover:text-rose-950"
                                >
                                    Clear selection
                                </button>
                            </>
                        ) : (
                            <>
                                All {formatNumber(list.length)} clients on this page are selected.{' '}
                                <button
                                    type="button"
                                    onClick={() => setSelectAllAcrossPages(true)}
                                    className="font-semibold underline hover:text-rose-950"
                                >
                                    Select all {formatNumber(pagination.total)} birthday clients
                                </button>
                            </>
                        )}
                    </div>
                )}

                <div className="md:hidden px-3 py-2 space-y-2">
                    {list.map((item, index) => {
                        const username = getBirthdayUsername(item);
                        const isSelected = selectAllAcrossPages || (username && selectedDebtors.has(username));
                        return (
                            <div
                                key={username || index}
                                className={`bg-white border border-gray-200 rounded-lg p-3 ${isSelected ? 'ring-2 ring-rose-200' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <AnimatedCheckbox
                                            checked={Boolean(isSelected)}
                                            onChange={() => username && handleSelectDebtor(username)}
                                            ariaLabel={`Select ${item.name || username}`}
                                            disabled={!username}
                                        />
                                        <span className="text-[11px] font-bold text-gray-800 w-4 shrink-0">
                                            {((pagination.page_no - 1) * pagination.limit) + index + 1}
                                        </span>
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
                                            <FiGift className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <button
                                                type="button"
                                                onClick={() => username && navigate(`/client/profile/${username}`)}
                                                className="text-xs font-semibold text-gray-800 hover:text-indigo-600 truncate text-left block max-w-full"
                                            >
                                                {item.name || '—'}
                                            </button>
                                            <p className="text-xs text-gray-500 m-0">
                                                {item.age || '—'} · {formatDob(item.date_of_birth)}
                                            </p>
                                        </div>
                                    </div>
                                    {renderBirthdayActionMenu(item)}
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                                        <FiPhone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        <span className="truncate">{item.contact?.mobile || '—'}</span>
                                    </div>
                                    {item.contact?.email ? (
                                        <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                                            <FiMail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span className="truncate text-xs">{item.contact.email}</span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="hidden md:block flex-1 min-h-0 overflow-auto">
                    <div className="min-w-[980px]">
                        <div className="sticky top-0 z-10 grid grid-cols-[48px_48px_minmax(180px,1.4fr)_minmax(100px,0.8fr)_minmax(120px,1fr)_minmax(160px,1.1fr)_minmax(180px,1.2fr)_72px] items-center border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                            <div className="px-3 py-3 flex justify-center">
                                <AnimatedCheckbox
                                    checked={selectAll}
                                    indeterminate={
                                        !selectAllAcrossPages &&
                                        selectedDebtors.size > 0 &&
                                        selectedDebtors.size < list.length
                                    }
                                    onChange={handleSelectAll}
                                    ariaLabel="Select all birthdays"
                                />
                            </div>
                            {['#', 'Client', 'Age', 'Date of birth', 'Mobile', 'Email', ''].map((label) => (
                                <div
                                    key={label || 'actions'}
                                    className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide"
                                >
                                    {label}
                                </div>
                            ))}
                        </div>

                        {list.map((item, index) => {
                            const username = getBirthdayUsername(item);
                            const isSelected = selectAllAcrossPages || (username && selectedDebtors.has(username));
                            return (
                                <div
                                    key={username || index}
                                    className={`grid grid-cols-[48px_48px_minmax(180px,1.4fr)_minmax(100px,0.8fr)_minmax(120px,1fr)_minmax(160px,1.1fr)_minmax(180px,1.2fr)_72px] items-center border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors ${isSelected ? 'bg-rose-50/40' : ''}`}
                                >
                                    <div className="px-3 py-3 flex justify-center">
                                        <AnimatedCheckbox
                                            checked={Boolean(isSelected)}
                                            onChange={() => username && handleSelectDebtor(username)}
                                            ariaLabel={`Select ${item.name || username}`}
                                            disabled={!username}
                                        />
                                    </div>
                                    <div className="px-3 py-3 text-[11px] font-bold text-gray-800">
                                        {((pagination.page_no - 1) * pagination.limit) + index + 1}
                                    </div>
                                    <div className="px-3 py-3 min-w-0">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
                                                <FiGift className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <div className="min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => username && navigate(`/client/profile/${username}`)}
                                                    className="font-semibold text-gray-800 text-sm hover:text-indigo-600 truncate text-left block max-w-full"
                                                >
                                                    {item.name || '—'}
                                                </button>
                                                {item.personal_details?.guardian_name ? (
                                                    <p className="text-xs text-gray-500 m-0 truncate">
                                                        {item.personal_details.guardian_name}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                            {item.age || '—'}
                                        </span>
                                    </div>
                                    <div className="px-3 py-3 text-sm font-medium text-gray-700">
                                        {formatDob(item.date_of_birth)}
                                    </div>
                                    <div className="px-3 py-3">
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 min-w-0">
                                            <FiPhone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span className="truncate">{item.contact?.mobile || '—'}</span>
                                        </div>
                                    </div>
                                    <div className="px-3 py-3 min-w-0">
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 min-w-0">
                                            <FiMail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span className="truncate">{item.contact?.email || '—'}</span>
                                        </div>
                                    </div>
                                    <div className="px-3 py-3 flex justify-center">
                                        {renderBirthdayActionMenu(item)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {!loading && !error && pagination.total > 0 && renderListPagination()}
            </div>
        );
    };

    const renderPendingBillingTable = () => {
        const list = data?.list || [];

        if (loading) {
            return (
                <div className="flex justify-center items-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center justify-center py-12 px-4 text-center">
                    <div>
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-3">
                            <FiAlertCircle className="w-7 h-7 text-red-500" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-800 mb-1">Failed to load data</h3>
                        <p className="text-xs text-gray-500 mb-4">{error}</p>
                        <button
                            type="button"
                            onClick={() => fetchDetails()}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                        >
                            <FiRefreshCw className="w-4 h-4" />
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        if (list.length === 0) {
            return (
                <div className="flex items-center justify-center py-12 px-4 text-center">
                    <div>
                        <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiShoppingBag className="w-7 h-7 text-indigo-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No pending billing</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Completed tasks awaiting billing will appear here
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="md:hidden px-3 py-2 space-y-2">
                    {list.map((item, index) => (
                        <div
                            key={item.task_id || index}
                            className="bg-white border border-gray-200 rounded-lg p-3"
                        >
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 m-0 truncate">
                                        {item.service_name || 'â€”'}
                                    </p>
                                    <p className="text-xs text-gray-500 m-0 truncate">
                                        {item.client_name || item.username || 'â€”'}
                                        {item.firm_name ? ` Â· ${item.firm_name}` : ''}
                                    </p>
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                    {formatCurrency(item.fees ?? item.total)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <FiClock className="w-3 h-3" />
                                    Due {formatShortDate(item.due_date)}
                                </span>
                                {item.task_id ? (
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/task/${item.task_id}`)}
                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        View task
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden md:block flex-1 min-h-0 overflow-auto">
                    <div className="min-w-[960px]">
                        <div className="sticky top-0 z-10 grid grid-cols-[48px_minmax(160px,1.2fr)_minmax(160px,1.2fr)_minmax(140px,1fr)_minmax(110px,0.8fr)_minmax(110px,0.8fr)_minmax(110px,0.8fr)_72px] items-center border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                            {['#', 'Client', 'Service', 'Firm', 'Fees', 'Due date', 'Created', ''].map((label) => (
                                <div
                                    key={label || 'actions'}
                                    className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide"
                                >
                                    {label}
                                </div>
                            ))}
                        </div>

                        {list.map((item, index) => (
                            <div
                                key={item.task_id || index}
                                className="grid grid-cols-[48px_minmax(160px,1.2fr)_minmax(160px,1.2fr)_minmax(140px,1fr)_minmax(110px,0.8fr)_minmax(110px,0.8fr)_minmax(110px,0.8fr)_72px] items-center border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors"
                            >
                                <div className="px-3 py-3 text-[11px] font-bold text-gray-800">
                                    {((pagination.page_no - 1) * pagination.limit) + index + 1}
                                </div>
                                <div className="px-3 py-3 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            item.username &&
                                            navigate(`/client/profile/${item.username}`)
                                        }
                                        className="font-semibold text-gray-800 text-sm hover:text-indigo-600 truncate text-left block max-w-full"
                                    >
                                        {item.client_name || item.username || 'â€”'}
                                    </button>
                                    {item.client_mobile ? (
                                        <p className="text-xs text-gray-500 m-0 truncate">
                                            {item.client_mobile}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="px-3 py-3 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            item.task_id && navigate(`/task/${item.task_id}`)
                                        }
                                        className="font-semibold text-gray-800 text-sm hover:text-indigo-600 truncate text-left block max-w-full"
                                    >
                                        {item.service_name || 'â€”'}
                                    </button>
                                </div>
                                <div className="px-3 py-3 text-sm font-medium text-gray-700 truncate">
                                    {item.firm_name || 'â€”'}
                                </div>
                                <div className="px-3 py-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        {formatCurrency(item.fees ?? item.total)}
                                    </span>
                                </div>
                                <div className="px-3 py-3">
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                        <FiCalendarIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        {formatShortDate(item.due_date)}
                                    </div>
                                </div>
                                <div className="px-3 py-3">
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                        <FiClock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        {formatShortDate(item.create_date)}
                                    </div>
                                </div>
                                <div className="px-3 py-3 flex justify-center">
                                    {item.task_id ? (
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/task/${item.task_id}`)}
                                            className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
                                            title="View task"
                                        >
                                            <FiEye className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <span className="text-sm text-gray-400">â€”</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {!loading && !error && pagination.total > 0 && renderListPagination()}
            </div>
        );
    };

    const renderGenericStatsPage = () => {
        const isBirthday = type === 'today-birthday';
        const accent = isBirthday
            ? {
                  iconWrap: 'bg-rose-100 text-rose-600',
                  countBadge: 'bg-rose-50 text-rose-700 border-rose-100',
              }
            : {
                  iconWrap: 'bg-indigo-100 text-indigo-600',
                  countBadge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
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
                    className={`pt-16 transition-all duration-300 ease-in-out min-w-0 ${
                        isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
                    }`}
                >
                    <div className="h-full flex flex-col min-w-0">
                        <motion.div
                            className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-[calc(100vh-5.5rem)] mx-2 sm:mx-4 md:mx-8 my-3 md:my-4 overflow-hidden"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            <div className="border-b border-gray-200 px-3 md:px-4 py-3 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 md:gap-3">
                                    <div className="flex items-start gap-3 min-w-0 w-full md:w-auto">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/dashboard')}
                                            className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 shrink-0"
                                            title="Back to dashboard"
                                        >
                                            <FiArrowLeft className="w-4 h-4" />
                                        </button>
                                        <div
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent.iconWrap}`}
                                        >
                                            {getIcon()}
                                        </div>
                                        <div className="min-w-0">
                                            <h1 className="text-base md:text-lg font-bold text-gray-800 m-0 leading-tight truncate">
                                                {getPageTitle()}
                                            </h1>
                                            {!isBirthday ? (
                                                <>
                                                    <p className="text-gray-500 text-xs m-0 mt-0.5">
                                                        {getPageDescription()}
                                                    </p>
                                                    {pagination.total > 0 ? (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${accent.countBadge}`}
                                                            >
                                                                Total: {formatNumber(pagination.total)}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                </>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                                        {isBirthday && selectedBirthdayCount > 0 && (
                                            <motion.button
                                                type="button"
                                                onClick={openBulkBirthdayReminderModal}
                                                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiGift className="w-4 h-4" />
                                                <span className="hidden sm:inline">
                                                    Birthday Reminder ({selectedBirthdayCount})
                                                </span>
                                                <span className="sm:hidden">({selectedBirthdayCount})</span>
                                            </motion.button>
                                        )}
                                        <motion.button
                                            type="button"
                                            onClick={handleRefresh}
                                            disabled={loading}
                                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-300 hover:bg-gray-100 transition shadow-sm disabled:opacity-50"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <FiRefreshCw
                                                className={`w-4 h-4 text-gray-700 ${loading ? 'animate-spin' : ''}`}
                                            />
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
                                {isBirthday
                                    ? renderBirthdayTable()
                                    : type === 'pending-billing'
                                      ? renderPendingBillingTable()
                                      : (
                                            <div className="flex items-center justify-center py-12 px-4 text-center">
                                                <div>
                                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <FiUsers className="w-7 h-7 text-gray-400" />
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-500">
                                                        No data available
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {isBirthday && (
                    <>
                        <ClientBirthdayReminderModal
                            isOpen={clientBirthdayReminder.open}
                            onClose={closeClientBirthdayReminderModal}
                            onSuccess={clearSelection}
                            clients={clientBirthdayReminder.clients}
                            isAll={clientBirthdayReminder.isAll}
                        />
                        {activeRowDropdown !== null &&
                            createPortal(
                                (() => {
                                    const list = data?.list || [];
                                    const activeClient = list.find(
                                        (item) => getBirthdayUsername(item) === activeRowDropdown
                                    );
                                    if (!activeClient) return null;
                                    return (
                                        <motion.div
                                            initial={{
                                                opacity: 0,
                                                scale: 0.95,
                                                y: dropdownPos.openUpward ? 6 : -6,
                                            }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ duration: 0.12 }}
                                            className="dropdown-container fixed bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                                            style={{
                                                top: dropdownPos.top,
                                                bottom: dropdownPos.bottom,
                                                right: dropdownPos.right,
                                                width: '224px',
                                                zIndex: 9999,
                                            }}
                                        >
                                            <BirthdayActionMenuItems
                                                client={activeClient}
                                                navigate={navigate}
                                                onClose={() => setActiveRowDropdown(null)}
                                                onBirthdayReminder={openClientBirthdayReminderModal}
                                            />
                                        </motion.div>
                                    );
                                })(),
                                document.body
                            )}
                    </>
                )}
            </div>
        );
    };

    if (type === 'debtors' || type === 'creditors') {
        return renderBalanceListPage(type);
    }

    if (type === 'today-received' || type === 'today-payment') {
        return null;
    }

    return renderGenericStatsPage();
};

export default QuickStatsDetailsPage;
