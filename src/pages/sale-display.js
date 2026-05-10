import React, { useState, useEffect, useCallback } from 'react';
import {
    FiPlus,
    FiSettings,
    FiEdit,
    FiFileText,
    FiUsers,
    FiUser,
    FiX,
    FiMenu,
    FiPrinter,
    FiMail,
    FiMessageSquare,
    FiChevronDown,
    FiEye,
    FiInfo,
    FiCalendar,
    FiHome,
    FiBriefcase,
    FiPercent,
    FiPlusCircle,
    FiLayers,
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { TbCurrencyRupee } from 'react-icons/tb';
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import EmailSelectionModal from '../components/email-selection';
import MobileSelectionModal from '../components/mobile-selection';
import { SaleForm } from '../components/Modals/CreateTransactions';
import { DateRangePickerField } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import axios from 'axios';

/** Format `sale_party` mobile with `country_code` (numeric → +91 …; non-numeric e.g. India → label + number). */
const formatSalePartyMobile = (party) => {
    if (!party || party.mobile == null || String(party.mobile).trim() === '') return '';
    const mobile = String(party.mobile).trim();
    const raw = party.country_code == null ? '' : String(party.country_code).trim();
    if (!raw) return mobile;
    if (/^\d+$/.test(raw)) return `+${raw} ${mobile}`;
    return `${raw} · ${mobile}`;
};

/** Parse line `remark` e.g. `task:…` for display in sale line items */
const parseLineRemark = (remark) => {
    if (remark == null || String(remark).trim() === '') return null;
    const s = String(remark).trim();
    if (s.startsWith('task:')) {
        const id = s.slice(5).trim();
        return { kind: 'task', id, short: id.length > 12 ? `${id.slice(0, 10)}…` : id };
    }
    return { kind: 'text', text: s };
};

const ViewSales = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(true);
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [sales, setSales] = useState([]);
    const [saleFormModal, setSaleFormModal] = useState(false);
    const [summary, setSummary] = useState({
        count: 0,
        net: 0,
        tax: 0,
        total: 0,
    });

    // View Modal State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // State for dropdown menus
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState('');

    const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [selectedWhatsapp, setSelectedWhatsapp] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLastPage, setIsLastPage] = useState(false);
    // Debounce search term
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => {
            clearTimeout(timerId);
        };
    }, [searchTerm]);

    // Reset to page 1 when search, date range, or page size changes (LedgerTab pattern)
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, fromDate, toDate, itemsPerPage]);

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock page scroll for mobile sidebar only. Sale details modal uses a full-viewport fixed
    // backdrop — BodyScrollLockObserver (index.js) detects it and locks/unlocks html+body.
    // Setting overflow here for viewModalOpen too would race the observer and save 'hidden' as
    // the "restore" value, leaving scroll stuck after the modal closes.
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    /** ISO YYYY-MM-DD → DD/MM/YYYY for export payload (legacy backend shape) */
    const isoToDdMmYyyy = (iso) => {
        if (!iso || typeof iso !== 'string') return '';
        const [y, m, d] = iso.split('T')[0].split('-');
        if (!y || !m || !d) return '';
        return `${d}/${m}/${y}`;
    };

    // Fetch sales data from API
    const fetchSalesData = useCallback(async () => {
        if (!fromDate || !toDate) return;

        setLoading(true);

        try {
            const params = {
                page_no: currentPage,
                limit: itemsPerPage,
                from_date: fromDate,
                to_date: toDate,
                search: debouncedSearchTerm || ''
            };

            // Get headers with authentication
            const headers = await getHeaders();

            const response = await axios.get(`${API_BASE_URL}/sale/list`, {
                params,
                headers
            });

            if (response.data.success) {
                const salesData = response.data.data || [];
                setSales(salesData);

                const meta = response.data.meta || {};
                const total = Number(meta.total) || 0;
                const limit = Number(meta.limit) || itemsPerPage;
                const totalPagesFromMeta =
                    meta.total_pages != null && meta.total_pages !== ''
                        ? Math.max(1, Number(meta.total_pages) || 1)
                        : Math.max(1, Math.ceil(total / (limit || 1)));

                setTotalRecords(total);
                setTotalPages(totalPagesFromMeta);
                setIsLastPage(Boolean(meta.is_last_page));
                setCurrentPage((prev) => Math.min(Math.max(1, prev), totalPagesFromMeta));
                if (response.data.stats) {
                    const st = response.data.stats;
                    if (st.amount && typeof st.amount === 'object') {
                        const amt = st.amount;
                        setSummary({
                            count: Number(st.count) || 0,
                            net: Number(amt.net) || 0,
                            tax: Number(amt.tax) || 0,
                            total: Number(amt.total) || 0,
                        });
                    } else {
                        const legacy = parseFloat(st.amount) || 0;
                        setSummary({
                            count: Number(st.count) || 0,
                            net: legacy,
                            tax: 0,
                            total: legacy,
                        });
                    }
                } else {
                    const summaryData = salesData.reduce(
                        (acc, sale) => {
                            const c = sale.calculation || {};
                            return {
                                count: acc.count + 1,
                                net: acc.net + parseFloat(c.subtotal ?? sale.amount ?? 0),
                                tax: acc.tax + parseFloat(c.gst_value ?? 0),
                                total: acc.total + parseFloat(c.grand_total ?? sale.amount ?? 0),
                            };
                        },
                        { count: 0, net: 0, tax: 0, total: 0 }
                    );
                    setSummary(summaryData);
                }
            } else {
                console.error('API returned success false');
                setSales([]);
                setTotalRecords(0);
                setTotalPages(1);
                setIsLastPage(true);
                setSummary({ count: 0, net: 0, tax: 0, total: 0 });
            }
        } catch (error) {
            console.error('Error fetching sales data:', error);
            setSales([]);
            setTotalRecords(0);
            setTotalPages(1);
            setIsLastPage(true);
            setSummary({ count: 0, net: 0, tax: 0, total: 0 });

            if (error.response) {
                if (error.response.status === 401) {
                    console.error('Unauthorized access - please login again');
                } else if (error.response.status === 404) {
                    console.error('API endpoint not found');
                } else {
                    console.error('Server error:', error.response.status);
                }
            } else if (error.request) {
                console.error('Network error - no response received');
            } else {
                console.error('Error setting up request:', error.message);
            }
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, debouncedSearchTerm, currentPage, itemsPerPage]);

    // Fetch data when dependencies change
    useEffect(() => {
        fetchSalesData();
    }, [fetchSalesData]);

    // Handle view sale details
    const handleViewSale = (sale) => {
        setSelectedSale(sale);
        setViewModalOpen(true);
        setActiveRowDropdown(null);
    };

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handlePageChange = (newPage) => {
        const n = Math.floor(Number(newPage));
        if (!Number.isFinite(n)) return;
        const maxPage = Math.max(1, totalPages);
        setCurrentPage(Math.min(Math.max(1, n), maxPage));
    };

    const handleSaleSuccess = (saleData) => {
        console.log('Sale created successfully:', saleData);
        fetchSalesData();
    };

    const handleEmailSubmit = (email) => {
        setSelectedEmail(email);
        setIsEmailModalOpen(false);
        console.log('Selected email:', email);
    };

    const handleWhatsappSubmit = (number) => {
        setSelectedWhatsapp(number);
        setWhatsappModalOpen(false);
        console.log('Selected number:', number);
    };

    const handleExport = async (type, data = null) => {
        setExportModal({ open: true, type, data });

        try {
            const headers = await getHeaders();

            const exportData = {
                type: type,
                data: data || sales,
                date_range:
                    fromDate && toDate ? `${isoToDdMmYyyy(fromDate)} - ${isoToDdMmYyyy(toDate)}` : '',
                search: searchTerm
            };

            const response = await axios.post(`${API_BASE_URL}/sale/export`, exportData, {
                headers,
                responseType: type === 'pdf' ? 'blob' : 'json'
            });

            if (type === 'pdf') {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `sales_report_${new Date().toISOString()}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            } else if (type === 'excel') {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `sales_report_${new Date().toISOString()}.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            } else {
                alert(`${type.toUpperCase()} export completed successfully!`);
            }
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            alert(`Failed to export ${type}. Please try again.`);
        } finally {
            setTimeout(() => {
                setExportModal({ open: false, type: '', data: null });
            }, 1500);
        }
    };

    // Get edit link and invoice link based on sale_type
    const getActionLinks = (sale) => {
        let editLink = '';
        let invoiceLink = '';

        switch (sale.sale_type) {
            case 'client':
                editLink = `/edit-sale-client?redirect=${window.location.href}&invoice_id=${sale.invoice_id}`;
                invoiceLink = `/preview-invoice-sale?invoice_id=${sale.invoice_id}`;
                break;
            case 'bank':
                editLink = `/edit-sale-bank?redirect=${window.location.href}&invoice_id=${sale.invoice_id}`;
                invoiceLink = `/preview-invoice-sale?invoice_id=${sale.invoice_id}`;
                break;
            default:
                editLink = '#';
                invoiceLink = '#';
        }

        return { editLink, invoiceLink };
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    // Format currency
    const formatCurrency = (amount) => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return '0.00';
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numAmount);
    };

    // Get sale party name
    const getSalePartyName = (sale) => {
        if (sale.sale_type === 'client' && sale.sale_party) {
            return sale.sale_party.name || '';
        }
        if (sale.sale_type === 'bank' && sale.sale_party) {
            return sale.sale_party.holder || sale.sale_party.bank || '';
        }
        return '';
    };

    // Get sale type display name
    const getSaleTypeDisplay = (saleType) => {
        const typeMap = {
            'client': 'Client',
            'bank': 'Bank',
            'cash': 'Cash',
            'savings': 'Savings',
            'current': 'Current',
            'loan': 'Loan',
            'capital': 'Capital'
        };
        return typeMap[saleType] || saleType;
    };

    // Get sale party details for display (matches list API `sale_party` shape)
    const getSalePartyDetails = (sale) => {
        if (sale.sale_type === 'client' && sale.sale_party) {
            const sp = sale.sale_party;
            return {
                name: sp.name,
                email: sp.email,
                mobile: formatSalePartyMobile(sp),
            };
        }
        if (sale.sale_type === 'bank' && sale.sale_party) {
            return {
                name: sale.sale_party.holder,
                bank: sale.sale_party.bank,
                account_no: sale.sale_party.account_no,
                ifsc: sale.sale_party.ifsc,
                branch: sale.sale_party.branch,
                type: sale.sale_party.type
            };
        }
        return null;
    };

    // Toggle row dropdown
    const toggleRowDropdown = (invoiceId) => {
        setActiveRowDropdown(activeRowDropdown === invoiceId ? null : invoiceId);
    };

    // Close all dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setShowAddDropdown(false);
                setActiveRowDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // List rows are server-paginated; `sales` is already the current page from the API
    const currentItems = sales;

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-10 mx-auto"></div>
            </td>
        </tr>
    );

    // Skeleton Loading Component for full page
    const SkeletonLoader = () => (
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="h-[4.25rem] animate-pulse rounded-xl border border-slate-200 bg-slate-100/80 sm:h-[4.5rem]"
                            />
                        ))}
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-200 px-6 py-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="h-10 bg-gray-200 rounded w-40"></div>
                                    <div className="h-10 bg-gray-200 rounded w-32"></div>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-hidden">
                            <div className="border-b border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <tr>
                                            {[...Array(8)].map((_, i) => (
                                                <th key={i} className="text-center p-3">
                                                    <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                </table>
                            </div>
                            <div className="p-4">
                                {[...Array(6)].map((_, index) => (
                                    <div key={index} className="mb-4">
                                        <div className="h-12 bg-gray-100 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // View modal panel (backdrop is a direct motion child of AnimatePresence below — fixes stuck overlay / scroll)
    const ViewSaleModalPanel = () => {
        if (!selectedSale) return null;

        const partyDetails = getSalePartyDetails(selectedSale);
        const calculation = selectedSale.calculation || {};
        const lineItems = Array.isArray(selectedSale.items) ? selectedSale.items : [];
        const firm = selectedSale.firm && typeof selectedSale.firm === 'object' ? selectedSale.firm : null;
        const hasFirmDetails = Boolean(
            firm
            && (
                firm.firm_name
                || firm.firm_type
                || firm.pan_no
                || firm.gst_no
                || firm.file_no
                || firm.cin_no
                || (firm.address && Object.values(firm.address).some((v) => v != null && String(v).trim() !== ''))
            )
        );

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="pointer-events-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold">Sale Details</h2>
                        </div>
                        <button
                            onClick={() => setViewModalOpen(false)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-600 mb-2">
                                <FiCalendar className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Transaction Date</span>
                            </div>
                            <p className="text-slate-800 font-semibold">{formatDate(selectedSale.transaction_date)}</p>
                        </div>
                    </div>

                    {/* Party Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <FiUsers className="w-4 h-4 text-blue-600" />
                            Party Information
                        </h3>
                        <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-4 border border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Sale Type</p>
                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${selectedSale.sale_type === 'client' ? 'bg-blue-100 text-blue-700' :
                                        selectedSale.sale_type === 'bank' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                        {getSaleTypeDisplay(selectedSale.sale_type)}
                                    </span>
                                </div>
                                {partyDetails && (
                                    <>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Name</p>
                                            <p className="text-slate-800 font-medium">{partyDetails.name || 'N/A'}</p>
                                        </div>
                                        {partyDetails.email && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Email</p>
                                                <p className="text-slate-800">{partyDetails.email}</p>
                                            </div>
                                        )}
                                        {partyDetails.mobile && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Mobile</p>
                                                <p className="text-slate-800">{partyDetails.mobile}</p>
                                            </div>
                                        )}
                                        {partyDetails.bank && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Bank</p>
                                                <p className="text-slate-800">{partyDetails.bank}</p>
                                            </div>
                                        )}
                                        {partyDetails.account_no && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Account No</p>
                                                <p className="text-slate-800 font-mono">{partyDetails.account_no}</p>
                                            </div>
                                        )}
                                        {partyDetails.ifsc && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">IFSC Code</p>
                                                <p className="text-slate-800 font-mono">{partyDetails.ifsc}</p>
                                            </div>
                                        )}
                                        {partyDetails.branch && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Branch</p>
                                                <p className="text-slate-800">{partyDetails.branch}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Firm Information (client sales) */}
                    {selectedSale.sale_type === 'client' && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <FiBriefcase className="w-4 h-4 text-violet-600" />
                                Firm Information
                            </h3>
                            {hasFirmDetails ? (
                                <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Firm name</p>
                                            <p className="text-slate-900 font-semibold">{firm.firm_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Firm type</p>
                                            <p className="text-slate-800 capitalize">{String(firm.firm_type || 'N/A').replace(/_/g, ' ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">PAN</p>
                                            <p className="text-slate-800 font-mono">{firm.pan_no || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">File No</p>
                                            <p className="text-slate-800">{firm.file_no || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">GST</p>
                                            <p className="text-slate-800 font-mono">{firm.gst_no || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">CIN</p>
                                            <p className="text-slate-800 font-mono">{firm.cin_no || 'N/A'}</p>
                                        </div>
                                    </div>
                                    {firm.address && Object.values(firm.address).some((v) => v != null && String(v).trim() !== '') && (
                                        <div className="mt-4 rounded-lg border border-violet-100 bg-white px-3 py-2">
                                            <p className="text-xs text-slate-500 mb-1">Address</p>
                                            <p className="text-sm text-slate-700 break-words">
                                                {[
                                                    firm.address.address_line_1,
                                                    firm.address.address_line_2,
                                                    firm.address.city,
                                                    firm.address.district,
                                                    firm.address.state,
                                                    firm.address.country,
                                                    firm.address.pincode,
                                                ].filter((part) => part != null && String(part).trim() !== '').join(', ') || 'N/A'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                    No firm selected for this sale.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Line items (services) */}
                    {lineItems.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <FiLayers className="w-4 h-4 text-indigo-600" />
                                Services &amp; items
                            </h3>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full min-w-[640px] text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                                            <th className="px-3 py-2 font-semibold">Service</th>
                                            <th className="px-3 py-2 font-semibold text-right">Fees</th>
                                            <th className="px-3 py-2 font-semibold text-right">Tax %</th>
                                            <th className="px-3 py-2 font-semibold text-right">Tax</th>
                                            <th className="px-3 py-2 font-semibold text-right">Line total</th>
                                            <th className="px-3 py-2 font-semibold">Note</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {lineItems.map((row) => {
                                            const svc = row.service || {};
                                            const parsed = parseLineRemark(row.remark);
                                            return (
                                                <tr key={`${row.service_id || 'line'}-${row.item_id || row.total || 0}-${row.fees || 0}`} className="text-slate-800">
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium text-slate-900">{svc.name || '—'}</div>
                                                        {svc.sac_code && (
                                                            <div className="text-xs text-slate-500">SAC {svc.sac_code}{svc.type ? ` · ${svc.type}` : ''}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right tabular-nums">₹{formatCurrency(row.fees ?? 0)}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums">{row.tax_perc ?? '—'}%</td>
                                                    <td className="px-3 py-2 text-right tabular-nums">₹{formatCurrency(row.tax_value ?? 0)}</td>
                                                    <td className="px-3 py-2 text-right font-semibold tabular-nums">₹{formatCurrency(row.total ?? 0)}</td>
                                                    <td className="px-3 py-2 text-xs text-slate-600 max-w-[200px]">
                                                        {parsed?.kind === 'task' ? (
                                                            <span>Task linked</span>
                                                        ) : parsed?.kind === 'text' ? (
                                                            <span className="italic">{parsed.text}</span>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Calculation Details */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <TbCurrencyRupee className="h-4 w-4 text-green-600" aria-hidden />
                            Financial Details
                        </h3>
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Subtotal</p>
                                    <p className="text-lg font-bold text-green-700">₹{formatCurrency(calculation.subtotal ?? selectedSale.amount ?? 0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Tax rate</p>
                                    <p className="text-slate-800 font-medium">{calculation.tax_rate != null ? `${String(calculation.tax_rate).replace(/\.00$/, '')}%` : '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">GST value</p>
                                    <p className="text-lg font-bold text-amber-600">₹{formatCurrency(calculation.gst_value ?? 0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Discount type</p>
                                    <p className="text-slate-800 capitalize">{String(calculation.discount_type || 'not applicable').replace(/_/g, ' ')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Discount % / rate</p>
                                    <p className="text-slate-800 tabular-nums">{calculation.discount_perc_rate != null ? `${calculation.discount_perc_rate}%` : '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Discount value</p>
                                    <p className="text-slate-800">₹{formatCurrency(calculation.discount_value ?? 0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Additional charges</p>
                                    <p className="text-slate-800">₹{formatCurrency(calculation.additional_charge ?? 0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Invoice total (pre round-off)</p>
                                    <p className="text-slate-800 font-semibold">₹{formatCurrency(calculation.total ?? selectedSale.amount ?? 0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Round off</p>
                                    <p className="text-slate-800">₹{formatCurrency(calculation.round_off ?? 0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Amount (API)</p>
                                    <p className="text-slate-700 text-sm">₹{formatCurrency(selectedSale.amount ?? 0)}</p>
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <p className="text-xs text-slate-500 mb-1">Grand total</p>
                                    <p className="text-2xl font-bold text-blue-600">₹{formatCurrency(calculation.grand_total ?? selectedSale.amount ?? 0)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice-level remark */}
                    {selectedSale.remark != null && String(selectedSale.remark).trim() !== '' && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <FiMessageSquare className="w-4 h-4 text-purple-600" />
                                Invoice remark
                            </h3>
                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                                <p className="text-slate-700 italic">&ldquo;{String(selectedSale.remark)}&rdquo;</p>
                            </div>
                        </div>
                    )}

                    {/* Created/Modified By */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {selectedSale.create_by && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                    <FiUser className="w-3 h-3" />
                                    Created By
                                </p>
                                <p className="font-medium text-slate-800">{selectedSale.create_by.name}</p>
                                <p className="text-xs text-slate-500">{selectedSale.create_by.email}</p>
                                <p className="text-xs text-slate-500">{formatSalePartyMobile(selectedSale.create_by)}</p>
                            </div>
                        )}
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                <FiEdit className="w-3 h-3" />
                                Last modified by
                            </p>
                            {selectedSale.modify_by ? (
                                <>
                                    <p className="font-medium text-slate-800">{selectedSale.modify_by.name}</p>
                                    <p className="text-xs text-slate-500">{selectedSale.modify_by.email}</p>
                                    <p className="text-xs text-slate-500">{formatSalePartyMobile(selectedSale.modify_by)}</p>
                                </>
                            ) : (
                                <p className="text-xs text-slate-500">N/A</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex justify-end gap-3">
                    <button
                        onClick={() => setViewModalOpen(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => {
                            const { editLink } = getActionLinks(selectedSale);
                            if (editLink && editLink !== '#') {
                                window.location.href = editLink;
                            }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <FiEdit className="w-4 h-4" />
                        Edit Sale
                    </button>
                </div>
            </motion.div>
        );
    };

    // Show skeleton while loading
    if (loading && sales.length === 0) {
        return <SkeletonLoader />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Fixed Header */}
            <Header
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />

            {/* Fixed Sidebar */}
            <Sidebar
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />

            {/* Main Content Area - Full Page Scroll */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Summary stats — matches API stats: count, amount.net, amount.tax, amount.total */}
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                        {[
                            {
                                key: 'count',
                                label: 'No. of sales',
                                value: String(summary.count),
                                icon: FiLayers,
                                cardClass:
                                    'bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30',
                                iconWrap: 'bg-white/20 text-white',
                            },
                            {
                                key: 'net',
                                label: 'Net amount',
                                value: `₹${formatCurrency(summary.net)}`,
                                icon: TbCurrencyRupee,
                                cardClass:
                                    'bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 text-white shadow-md shadow-emerald-500/25',
                                iconWrap: 'bg-white/20 text-white',
                            },
                            {
                                key: 'tax',
                                label: 'Tax amount',
                                value: `₹${formatCurrency(summary.tax)}`,
                                icon: FiPercent,
                                cardClass:
                                    'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-md shadow-amber-500/25',
                                iconWrap: 'bg-white/20 text-white',
                            },
                            {
                                key: 'total',
                                label: 'Total amount',
                                value: `₹${formatCurrency(summary.total)}`,
                                icon: TbCurrencyRupee,
                                cardClass:
                                    'bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 text-white shadow-md shadow-violet-500/30',
                                iconWrap: 'bg-white/20 text-white',
                            },
                        ].map((card, i) => {
                            const Icon = card.icon;
                            return (
                                <motion.div
                                    key={card.key}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: i * 0.04 }}
                                    className={`overflow-hidden rounded-xl border border-white/10 p-3 sm:p-3.5 ${card.cardClass}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80 sm:text-[11px]">
                                                {card.label}
                                            </p>
                                            <p className="mt-0.5 truncate text-sm font-bold tabular-nums sm:text-base">
                                                {card.value}
                                            </p>
                                        </div>
                                        <div className={`shrink-0 rounded-lg p-1.5 ${card.iconWrap}`}>
                                            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Main Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
                    >
                        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white py-2.5 pl-3 pr-0 sm:pl-4 sm:pr-0">
                            <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                                <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2 lg:min-w-0 lg:flex-1 lg:flex-nowrap lg:items-center lg:gap-x-4">
                                    <h5 className="shrink-0 text-sm font-bold tracking-tight text-slate-800 sm:text-base mr-4 sm:mr-6 lg:mr-8">
                                        Sale Register
                                    </h5>
                                    <input
                                        type="text"
                                        placeholder="Search…"
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        className="h-9 w-full min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-w-[18rem] lg:min-w-[22rem] xl:min-w-[28rem]"
                                    />
                                    <div className="w-full min-w-0 max-w-full shrink-0 overflow-x-auto sm:min-w-[10rem] sm:max-w-[14rem] sm:overflow-x-auto lg:max-w-[14rem] xl:max-w-[16rem]">
                                        <DateRangePickerField
                                            value={{ start: fromDate, end: toDate }}
                                            onChange={(range) => {
                                                setFromDate(range?.start || '');
                                                setToDate(range?.end || '');
                                            }}
                                            placeholder="Select date range"
                                            mode="range"
                                            initialTab="quick"
                                            defaultQuickKey="tm"
                                            quickOptionKeys={['tw', 'lw', 'lm', 'tm', 'lf', 'fy']}
                                            showRangeHint={false}
                                            showResetButton={false}
                                            truncateRangeLabel={false}
                                            buttonClassName="w-full min-w-0 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-indigo-400 focus:outline-none transition-all"
                                            wrapperClassName="w-full min-w-0"
                                        />
                                    </div>
                                </div>
                                <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto lg:pl-1">
                                    <div className="dropdown-container relative shrink-0">
                                        <motion.button
                                            type="button"
                                            onClick={() => setShowAddDropdown(!showAddDropdown)}
                                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow sm:h-10 sm:px-3"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <PiExportBold className="h-4 w-4 shrink-0" />
                                            <span className="whitespace-nowrap">Export</span>
                                            <FiChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-90 transition-transform ${showAddDropdown ? 'rotate-180' : ''}`} />
                                        </motion.button>

                                        <AnimatePresence>
                                            {showAddDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                                                >
                                                    <div className="py-1">
                                                        <button
                                                            onClick={() => handleExport('pdf')}
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
                                                            onClick={() => handleExport('excel')}
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
                                                            onClick={() => setWhatsappModalOpen(true)}
                                                            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                        >
                                                            <div className="p-1.5 bg-green-50 rounded mr-2 group-hover:bg-green-100 transition-colors">
                                                                <FaWhatsapp className="w-3.5 h-3.5 text-green-500" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="font-medium text-xs">Share via WhatsApp</div>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={() => setIsEmailModalOpen(true)}
                                                            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                        >
                                                            <div className="p-1.5 bg-blue-50 rounded mr-2 group-hover:bg-blue-100 transition-colors">
                                                                <AiOutlineMail className="w-3.5 h-3.5 text-blue-500" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="font-medium text-xs">Share via Email</div>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <motion.button
                                        type="button"
                                        onClick={() => setSaleFormModal(true)}
                                        className="mr-2 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow sm:mr-3 sm:h-10 sm:px-3"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiPlus className="h-4 w-4 shrink-0" />
                                        <span className="whitespace-nowrap">Create</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Table Container */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[60px]">
                                            Sl No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">
                                            Date
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[200px]">
                                            Particulars
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">
                                            Invoice No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">
                                            Total Value
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">
                                            Tax
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">
                                            Grand Total
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {loading ? (
                                        [...Array(5)].map((_, index) => (
                                            <SkeletonRow key={index} />
                                        ))
                                    ) : currentItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiFileText className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No sales records found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((sale, index) => {
                                            const { editLink, invoiceLink } = getActionLinks(sale);
                                            const rowKey = sale.invoice_id || sale.sale_id || sale.transaction_id || `row-${index}`;
                                            const isDropdownOpen = activeRowDropdown === sale.invoice_id;
                                            const actualIndex = (currentPage - 1) * itemsPerPage + index;
                                            const firstServiceName = sale.items?.[0]?.service?.name;

                                            return (
                                                <motion.tr
                                                    key={rowKey}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="hover:bg-blue-50/20 transition-colors duration-150"
                                                >
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-700 font-medium text-xs">
                                                            {actualIndex + 1}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="font-medium text-slate-700 text-xs">
                                                            {formatDate(sale.transaction_date)}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="mx-auto max-w-[200px]">
                                                            <div className="text-slate-800 font-semibold text-xs">
                                                                {getSalePartyName(sale) || 'N/A'}
                                                            </div>
                                                            <div className="flex flex-col items-center gap-1 mt-1">
                                                                {sale.is_task ? (
                                                                    <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                                                        Task
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                        Direct
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {firstServiceName && (
                                                                <div className="text-slate-500 text-[10px] mt-1 truncate max-w-[200px] mx-auto" title={firstServiceName}>
                                                                    {firstServiceName}
                                                                </div>
                                                            )}
                                                            {sale.remark && (
                                                                <div className="text-slate-500 text-[10px] text-center mt-1 italic truncate">
                                                                    "{sale.remark}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded text-xs border border-slate-300/50 shadow-xs">
                                                            {sale.invoice_no}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-green-50 to-green-100 text-green-800 font-bold px-3 py-1.5 rounded text-xs min-w-[90px] shadow-xs">
                                                            ₹{formatCurrency(sale.calculation?.total || sale.amount || 0)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 font-bold px-3 py-1.5 rounded text-xs min-w-[90px] shadow-xs">
                                                            ₹{formatCurrency(sale.calculation?.gst_value || 0)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 font-bold px-3 py-1.5 rounded text-xs min-w-[90px] shadow-xs">
                                                            ₹{formatCurrency(sale.calculation?.grand_total || sale.amount || 0)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="dropdown-container relative flex justify-center">
                                                            <motion.button
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                onClick={() => toggleRowDropdown(sale.invoice_id)}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                <FiMenu className="w-3.5 h-3.5" />
                                                            </motion.button>
                                                            <AnimatePresence>
                                                                {isDropdownOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 5 }}
                                                                        className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden"
                                                                    >
                                                                        <div className="py-1">
                                                                            <button
                                                                                onClick={() => handleViewSale(sale)}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                            >
                                                                                <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                    <FiEye className="w-3 h-3 text-blue-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">View Details</div>
                                                                                </div>
                                                                            </button>
                                                                            <a
                                                                                href={editLink}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                onClick={() => setActiveRowDropdown(null)}
                                                                            >
                                                                                <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                    <FiEdit className="w-3 h-3 text-blue-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">Edit Sale</div>
                                                                                </div>
                                                                            </a>
                                                                            {invoiceLink && (
                                                                                <a
                                                                                    href={invoiceLink}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => setActiveRowDropdown(null)}
                                                                                >
                                                                                    <div className="p-1 bg-slate-50 rounded mr-2">
                                                                                        <FiFileText className="w-3 h-3 text-slate-600" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">View Invoice</div>
                                                                                    </div>
                                                                                </a>
                                                                            )}
                                                                            <div className="border-t border-slate-100 mt-1 pt-1">
                                                                                <button
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => handleExport('print', sale)}
                                                                                >
                                                                                    <div className="p-1 bg-slate-50 rounded mr-2">
                                                                                        <FiPrinter className="w-3 h-3 text-slate-600" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Print</div>
                                                                                    </div>
                                                                                </button>
                                                                                <button
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => handleExport('whatsapp', sale)}
                                                                                >
                                                                                    <div className="p-1 bg-green-50 rounded mr-2">
                                                                                        <FaWhatsapp className="w-3 h-3 text-green-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">WhatsApp</div>
                                                                                    </div>
                                                                                </button>
                                                                                <button
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => handleExport('email', sale)}
                                                                                >
                                                                                    <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                        <FiMail className="w-3 h-3 text-blue-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Email</div>
                                                                                    </div>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>

                            {!loading && (currentItems.length > 0 || totalRecords > 0) && totalPages > 0 && (
                                <TablePagination
                                    page={currentPage}
                                    limit={itemsPerPage}
                                    total={totalRecords}
                                    totalPages={totalPages}
                                    isLastPage={isLastPage}
                                    rowOptions={[5, 10, 20, 50, 100]}
                                    defaultRows={20}
                                    onPageChange={handlePageChange}
                                    onLimitChange={setItemsPerPage}
                                />
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Modals */}
            <SaleForm
                isOpen={saleFormModal}
                onClose={() => setSaleFormModal(false)}
                onSuccess={handleSaleSuccess}
                mode="modal"
            />

            <EmailSelectionModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                onSubmit={handleEmailSubmit}
            />

            <MobileSelectionModal
                isOpen={isWhatsappModalOpen}
                onClose={() => setWhatsappModalOpen(false)}
                onSubmit={handleWhatsappSubmit}
            />

            {/* View Sale Modal — backdrop must be a motion.* direct child of AnimatePresence so exit removes the full-screen layer */}
            <AnimatePresence>
                {viewModalOpen && selectedSale && (
                    <motion.div
                        key="view-sale-modal"
                        role="dialog"
                        aria-modal="true"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                        onClick={() => setViewModalOpen(false)}
                    >
                        <ViewSaleModalPanel />
                    </motion.div>
                )}
            </AnimatePresence>

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

export default ViewSales;