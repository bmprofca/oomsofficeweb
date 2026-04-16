import React, { useState, useEffect } from 'react';
import {
    FiSearch,
    FiPlus,
    FiMenu,
    FiEdit,
    FiFileText,
    FiTrash2,
    FiDownload,
    FiPrinter,
    FiFilter,
    FiTag,
    FiChevronRight
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import DateFilter from '../components/DateFilter';
import DiscountForm from '../components/discount-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';

const DiscountVoucherDetails = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [dateRange, setDateRange] = useState('');
    const [fromToDate, setFromToDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [vouchers, setVouchers] = useState([]);
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });

    const [newVoucherForm, setNewVoucherForm] = useState({
        invoice_no: '',
        party_id: '',
        party_type: '',
        discount_amount: '',
        discount_date: new Date().toISOString().split('T')[0],
        discount_type: 'percentage',
        discount_percentage: '',
        reason: '',
        status: 'active'
    });

    // Mock data for discount vouchers
    const mockVouchersData = [
        {
            id: '1',
            invoice_no: 'INV-001',
            party_name: 'Customer A',
            party_type: 'customer',
            discount_amount: 1500,
            original_amount: 15000,
            discount_date: '2024-01-15',
            discount_type: 'percentage',
            discount_percentage: 10,
            reason: 'Seasonal Discount',
            status: 'active',
            created_date: '2024-01-15'
        },
        {
            id: '2',
            invoice_no: 'INV-002',
            party_name: 'Vendor B',
            party_type: 'vendor',
            discount_amount: 2000,
            original_amount: 20000,
            discount_date: '2024-01-14',
            discount_type: 'fixed',
            discount_percentage: 0,
            reason: 'Bulk Purchase',
            status: 'active',
            created_date: '2024-01-14'
        },
        {
            id: '3',
            invoice_no: 'INV-003',
            party_name: 'Customer C',
            party_type: 'customer',
            discount_amount: 750,
            original_amount: 7500,
            discount_date: '2024-01-13',
            discount_type: 'percentage',
            discount_percentage: 10,
            reason: 'Loyalty Discount',
            status: 'active',
            created_date: '2024-01-13'
        },
        {
            id: '4',
            invoice_no: 'INV-004',
            party_name: 'Vendor D',
            party_type: 'vendor',
            discount_amount: 3000,
            original_amount: 30000,
            discount_date: '2024-01-12',
            discount_type: 'fixed',
            discount_percentage: 0,
            reason: 'Early Payment',
            status: 'active',
            created_date: '2024-01-12'
        },
        {
            id: '5',
            invoice_no: 'INV-005',
            party_name: 'Customer E',
            party_type: 'customer',
            discount_amount: 1200,
            original_amount: 12000,
            discount_date: '2024-01-11',
            discount_type: 'percentage',
            discount_percentage: 10,
            reason: 'Festival Offer',
            status: 'active',
            created_date: '2024-01-11'
        },
        {
            id: '6',
            invoice_no: 'INV-006',
            party_name: 'Vendor F',
            party_type: 'vendor',
            discount_amount: 2500,
            original_amount: 25000,
            discount_date: '2024-01-10',
            discount_type: 'fixed',
            discount_percentage: 0,
            reason: 'Contract Discount',
            status: 'active',
            created_date: '2024-01-10'
        },
        {
            id: '7',
            invoice_no: 'INV-007',
            party_name: 'Customer G',
            party_type: 'customer',
            discount_amount: 1800,
            original_amount: 18000,
            discount_date: '2024-01-09',
            discount_type: 'percentage',
            discount_percentage: 10,
            reason: 'Promotional Offer',
            status: 'active',
            created_date: '2024-01-09'
        },
        {
            id: '8',
            invoice_no: 'INV-008',
            party_name: 'Vendor H',
            party_type: 'vendor',
            discount_amount: 4000,
            original_amount: 40000,
            discount_date: '2024-01-08',
            discount_type: 'fixed',
            discount_percentage: 0,
            reason: 'Long Term Contract',
            status: 'active',
            created_date: '2024-01-08'
        },
        {
            id: '9',
            invoice_no: 'INV-009',
            party_name: 'Customer I',
            party_type: 'customer',
            discount_amount: 2200,
            original_amount: 22000,
            discount_date: '2024-01-07',
            discount_type: 'percentage',
            discount_percentage: 10,
            reason: 'New Customer Offer',
            status: 'active',
            created_date: '2024-01-07'
        }
    ];

    // Mock parties data
    const mockParties = [
        { id: '1', name: 'Customer A', type: 'customer' },
        { id: '2', name: 'Customer B', type: 'customer' },
        { id: '3', name: 'Vendor C', type: 'vendor' },
        { id: '4', name: 'Vendor D', type: 'vendor' },
        { id: '5', name: 'Customer E', type: 'customer' }
    ];

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

    // Initialize with current month date range
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = today;

        const formatDate = (date) => {
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '/');
        };

        const from = formatDate(firstDay);
        const to = formatDate(lastDay);

        setDateRange(`${from} - ${to}`);
        setFromToDate(`From ${from} to ${to}`);
        fetchVouchersData(from, to);
    }, []);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Simulate API call to fetch vouchers data
    const fetchVouchersData = async (from, to) => {
        setLoading(true);

        setTimeout(() => {
            const vouchersData = mockVouchersData;
            setVouchers(vouchersData);

            const total = vouchersData.reduce((acc, item) => acc + item.discount_amount, 0);
            setTotalDiscount(total);
            setLoading(false);
        }, 1500);
    };

    // Handle search
    const handleSearch = () => {
        const [from, to] = dateRange.split(' - ');
        setFromToDate(`From ${from} to ${to}`);
        fetchVouchersData(from, to);
    };

    // Handle date filter change
    const handleDateFilterChange = (filter) => {
        console.log('Selected filter:', filter);
        if (filter.range) {
            setDateRange(filter.range);
            const [from, to] = filter.range.split(' - ');
            setFromToDate(`From ${from} to ${to}`);
            fetchVouchersData(from, to);
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewVoucherForm(prev => ({
            ...prev,
            [name]: value
        }));

        // Auto-calculate discount amount if percentage and original amount are provided
        if (name === 'discount_percentage' && newVoucherForm.original_amount) {
            const discountAmount = (parseFloat(newVoucherForm.original_amount) * parseFloat(value)) / 100;
            setNewVoucherForm(prev => ({
                ...prev,
                discount_amount: discountAmount.toFixed(2)
            }));
        }
    };

    // Handle new voucher form submission
    const handleCreateVoucher = async (e) => {
        e.preventDefault();
        setLoading(true);

        setTimeout(() => {
            console.log('Creating new discount voucher:', newVoucherForm);
            
            // Add new voucher to the list
            const newVoucher = {
                id: (vouchers.length + 1).toString(),
                invoice_no: newVoucherForm.invoice_no,
                party_name: mockParties.find(p => p.id === newVoucherForm.party_id)?.name || 'Unknown',
                party_type: newVoucherForm.party_type,
                discount_amount: parseFloat(newVoucherForm.discount_amount),
                original_amount: parseFloat(newVoucherForm.original_amount) || 0,
                discount_date: newVoucherForm.discount_date,
                discount_type: newVoucherForm.discount_type,
                discount_percentage: parseFloat(newVoucherForm.discount_percentage) || 0,
                reason: newVoucherForm.reason,
                status: 'active',
                created_date: new Date().toISOString().split('T')[0]
            };

            setVouchers(prev => [...prev, newVoucher]);
            setNewVoucherForm({
                invoice_no: '',
                party_id: '',
                party_type: '',
                discount_amount: '',
                discount_date: new Date().toISOString().split('T')[0],
                discount_type: 'percentage',
                discount_percentage: '',
                reason: '',
                status: 'active'
            });
            setShowAddVoucherModal(false);

            const [from, to] = dateRange.split(' - ');
            fetchVouchersData(from, to);

            alert('Discount voucher created successfully!');
        }, 1000);
    };

    // Handle export
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });
        
        // Simulate export process
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            alert(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    // Handle voucher deletion
    const handleDeleteVoucher = (voucherId) => {
        if (window.confirm('Are you sure you want to delete this discount voucher?')) {
            setVouchers(prev => prev.filter(voucher => voucher.id !== voucherId));
            setActiveRowDropdown(null);
            alert('Discount voucher deleted successfully!');
        }
    };

    // Toggle row dropdown
    const toggleRowDropdown = (voucherId) => {
        setActiveRowDropdown(activeRowDropdown === voucherId ? null : voucherId);
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

    // Get party type color
    const getPartyTypeColor = (type) => {
        switch(type) {
            case 'customer': return 'bg-green-100 text-green-700';
            case 'vendor': return 'bg-blue-100 text-blue-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    // Get discount type color
    const getDiscountTypeColor = (type) => {
        switch(type) {
            case 'percentage': return 'bg-purple-100 text-purple-700';
            case 'fixed': return 'bg-orange-100 text-orange-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

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
                <div className="h-4 bg-slate-200 rounded w-20 mx-auto"></div>
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
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        {/* Skeleton Header */}
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

                        {/* Skeleton Table */}
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

    // Show skeleton while loading
    if (loading) {
        return <SkeletonLoader />;
    }

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

            {/* Main Content Area - Full Page Scroll */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header Stats Card - Smaller */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md mb-4"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-xs font-medium">Total Discount Given</p>
                                <h3 className="text-lg font-bold mt-1">₹{formatCurrency(totalDiscount)}</h3>
                            </div>
                            <FiTag className="w-5 h-5 opacity-80" />
                        </div>
                    </motion.div>

                    {/* Main Card */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-xl shadow-lg border border-slate-200"
                    >
                        {/* Card Header */}
                        <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 bg-blue-100 rounded-lg">
                                            <FiTag className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <h5 className="text-lg font-bold text-slate-800">
                                            Discount Voucher Register
                                        </h5>
                                    </div>
                                    {fromToDate && (
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <FiFilter className="w-3 h-3" />
                                            <p className="text-xs font-medium">
                                                {fromToDate}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                    {/* Date Filter Component */}
                                    <div className="w-full lg:w-auto">
                                        <DateFilter onChange={handleDateFilterChange} />
                                    </div>

                                    <div className="flex gap-2">
                                        {/* Export Dropdown */}
                                        <div className="dropdown-container relative">
                                            <motion.button
                                                onClick={() => setShowAddDropdown(!showAddDropdown)}
                                                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <PiExportBold className="w-4 h-4" />
                                                Export
                                                <FiChevronRight className={`w-3 h-3 transition-transform ${showAddDropdown ? 'rotate-90' : ''}`} />
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
                                                                onClick={() => handleExport('print')}
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

                                        {/* Add Voucher Button */}
                                        <motion.button
                                            onClick={() => setShowAddVoucherModal(true)}
                                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Add Voucher
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table Container */}
                        <div className="w-full">
                            <table className="w-full text-xs table-fixed">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[5%]">
                                            Sl No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[10%]">
                                            Invoice No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[20%]">
                                            Party Details
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[10%]">
                                            Party Type
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[15%]">
                                            Original Amount
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[15%]">
                                            Discount Amount
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[10%]">
                                            Date
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[15%]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {vouchers.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiTag className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No discount vouchers found</p>
                                                    <p className="text-slate-500 text-xs mb-4">Start by creating your first discount voucher</p>
                                                    <motion.button 
                                                        onClick={() => setShowAddVoucherModal(true)}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow transition-all duration-200"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Create Your First Voucher
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        vouchers.map((voucher, index) => {
                                            const isDropdownOpen = activeRowDropdown === voucher.id;

                                            return (
                                                <motion.tr
                                                    key={voucher.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="hover:bg-blue-50/20 transition-colors duration-150"
                                                >
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-700 font-medium text-xs">
                                                            {index + 1}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded text-xs border border-slate-300/50">
                                                            {voucher.invoice_no}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="px-2">
                                                            <div className="text-slate-800 font-semibold text-xs truncate">
                                                                {voucher.party_name}
                                                            </div>
                                                            <div className="text-slate-500 text-[10px] italic truncate mt-1">
                                                                "{voucher.reason}"
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`px-2 py-1.5 rounded-full text-[9px] font-medium capitalize whitespace-nowrap ${getPartyTypeColor(voucher.party_type)}`}>
                                                                {voucher.party_type}
                                                            </span>
                                                            <span className={`px-1.5 py-1 rounded-full text-[8px] font-medium capitalize ${getDiscountTypeColor(voucher.discount_type)}`}>
                                                                {voucher.discount_type}
                                                                {voucher.discount_type === 'percentage' && ` (${voucher.discount_percentage}%)`}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded text-xs">
                                                            ₹{formatCurrency(voucher.original_amount)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-green-50 to-green-100 text-green-800 font-bold px-3 py-1.5 rounded text-xs">
                                                            ₹{formatCurrency(voucher.discount_amount)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="font-medium text-slate-700 text-xs">
                                                            {formatDate(voucher.discount_date)}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="dropdown-container relative flex justify-center">
                                                            <motion.button
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                onClick={() => toggleRowDropdown(voucher.id)}
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
                                                                            <a 
                                                                                href={`/edit-discount-voucher?voucher_id=${voucher.id}`}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                onClick={() => setActiveRowDropdown(null)}
                                                                            >
                                                                                <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                    <FiEdit className="w-3 h-3 text-blue-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">Edit Voucher</div>
                                                                                </div>
                                                                            </a>
                                                                            <a 
                                                                                href={`/view-voucher-details?voucher_id=${voucher.id}`}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                onClick={() => setActiveRowDropdown(null)}
                                                                            >
                                                                                <div className="p-1 bg-green-50 rounded mr-2">
                                                                                    <FiFileText className="w-3 h-3 text-green-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">View Details</div>
                                                                                </div>
                                                                            </a>
                                                                            <div className="border-t border-slate-100 mt-1 pt-1">
                                                                                <button
                                                                                    onClick={() => handleExport('print', voucher)}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                >
                                                                                    <div className="p-1 bg-slate-50 rounded mr-2">
                                                                                        <FiPrinter className="w-3 h-3 text-slate-600" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Print</div>
                                                                                    </div>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteVoucher(voucher.id)}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors duration-150"
                                                                                >
                                                                                    <div className="p-1 bg-red-50 rounded mr-2">
                                                                                        <FiTrash2 className="w-3 h-3 text-red-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Delete Voucher</div>
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
                        </div>

                        {/* Table Footer - Fixed */}
                        {/* <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white shrink-0">
                            <table className="w-full text-sm">
                                <tfoot>
                                    <tr>
                                        <td className="text-right p-4 font-bold text-slate-800 text-xs uppercase tracking-wider" colSpan="5">
                                            Total Discount Given
                                        </td>
                                        <td className="text-center p-4">
                                            <span className="inline-flex items-center justify-center bg-gradient-to-r from-green-100 to-green-200 text-green-800 text-sm font-bold px-4 py-2 rounded-lg min-w-[100px]">
                                                ₹{formatCurrency(totalDiscount)}
                                            </span>
                                        </td>
                                        <td className="p-4"></td>
                                        <td className="p-4"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div> */}
                    </motion.div>
                </div>
            </div>

            {/* Add Voucher Modal */}
            <DiscountForm
                isOpen={showAddVoucherModal}
                onClose={() => setShowAddVoucherModal(false)}
                onSubmit={handleCreateVoucher}
                formData={newVoucherForm}
                onChange={handleInputChange}
                loading={loading}
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

export default DiscountVoucherDetails;