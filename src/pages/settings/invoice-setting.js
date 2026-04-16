import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import {
    FiPlus,
    FiTrash2,
    FiFileText,
    FiSearch,
    FiX,
    FiCalendar,
    FiCheckCircle,
    FiXCircle,
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';

const InvoiceSettings = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [listError, setListError] = useState(null);
    const [invoicePrefixData, setInvoicePrefixData] = useState([]);
    const fetchAbortRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [formData, setFormData] = useState({
        type: '',
        prefix: '',
        issue_date: '',
        expire_date: '',
        current: '1',
    });


    // Invoice type options — must match backend values exactly
    const invoiceTypes = [
        { value: 'opening balance', label: 'Opening Balance' },
        { value: 'receive', label: 'Receive' },
        { value: 'payment', label: 'Payment' },
        { value: 'journal', label: 'Journal' },
        { value: 'contra', label: 'Contra' },
        { value: 'sale', label: 'Sale' },
        { value: 'purchase', label: 'Purchase' },
        { value: 'discount', label: 'Discount' },
        { value: 'expense', label: 'Expense' },
        { value: 'loan create', label: 'Loan Create' },
        { value: 'loan repayment', label: 'Loan Repayment' },
        { value: 'loan opening balance', label: 'Loan Opening Balance' },
        { value: 'asset depreciation', label: 'Asset Depreciation' },
        { value: 'asset sale', label: 'Asset Sale' },
        { value: 'asset purchase', label: 'Asset Purchase' },
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

    // Load initial data
    useEffect(() => {
        fetchInvoicePrefixData();
    }, []);

    const fetchInvoicePrefixData = async () => {
        const headers = getHeaders();
        if (!headers) {
            setListError('Missing authentication. Please sign in again.');
            return;
        }

        fetchAbortRef.current?.abort();
        const ac = new AbortController();
        fetchAbortRef.current = ac;

        setLoading(true);
        setListError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/invoice/prefix/list`, {
                method: 'GET',
                headers,
                signal: ac.signal,
            });
            const json = await response.json();

            if (!response.ok) {
                throw new Error(json?.message || `Request failed (${response.status})`);
            }

            if (json.success && Array.isArray(json.data)) {
                setInvoicePrefixData(json.data);
            } else {
                setInvoicePrefixData([]);
                setListError(json?.message || 'Unexpected response from server');
            }
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error('Prefix list fetch:', e);
            setInvoicePrefixData([]);
            setListError(e.message || 'Failed to load invoice prefix list');
        } finally {
            setLoading(false);
        }
    };

    // Filter invoices based on search and filters
    const filteredInvoices = invoicePrefixData.filter(invoice => {
        const matchesSearch = searchQuery === '' ||
            invoice.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            invoice.prefix.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = selectedType === '' || invoice.type === selectedType;

        return matchesSearch && matchesType;
    });

    const isActive = (issue_date, expire_date) => {
        const now = new Date();
        const start = new Date(issue_date);
        const end = new Date(expire_date);
        return now >= start && now <= end;
    };

    const resetForm = () => {
        setFormData({
            type: '',
            prefix: '',
            issue_date: '',
            expire_date: '',
            current: '1',
        });
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format for input
    };

    // Handle create invoice prefix
    const handleCreateInvoicePrefix = async (e) => {
        e.preventDefault();

        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication. Please sign in again.');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                type: formData.type,
                prefix: formData.prefix,
                issue_date: formData.issue_date,
                expire_date: formData.expire_date,
                current: formData.current || 1,
            };

            const response = await fetch(`${API_BASE_URL}/invoice/prefix/create`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const json = await response.json();

            if (!response.ok || !json.success) {
                throw new Error(json?.message || `Create failed (${response.status})`);
            }

            // Refresh list so we get the new row with correct fields (including id)
            await fetchInvoicePrefixData();

            resetForm();
            setShowCreateModal(false);
            toast.success(json?.message || 'Invoice prefix created successfully!');
        } catch (error) {
            console.error('Prefix create error:', error);
            toast.error(error.message || 'Failed to create invoice prefix');
        } finally {
            setLoading(false);
        }
    };

    // Handle delete invoice prefix
    const handleDeleteInvoicePrefix = async (invoiceId) => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication. Please sign in again.');
            return;
        }

        setDeleteLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/invoice/prefix/delete`, {
                method: 'DELETE',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: invoiceId }),
            });

            const json = await response.json();
            if (!response.ok || !json.success) {
                throw new Error(json?.message || `Delete failed (${response.status})`);
            }

            setDeleteModal(false);
            setDeleteConfirmText('');
            setSelectedInvoice(null);
            await fetchInvoicePrefixData();
            toast.success(json?.message || 'Invoice prefix deleted successfully');
        } catch (error) {
            console.error('Prefix delete error:', error);
            toast.error(error.message || 'Failed to delete invoice prefix');
        } finally {
            setDeleteLoading(false);
        }
    };

    const openCreateModal = () => {
        resetForm();
        setShowCreateModal(true);
    };

    // Get type color
    const getTypeColor = (type) => {
        const colors = {
            'opening balance': 'from-teal-500 to-teal-600',
            'receive': 'from-purple-500 to-purple-600',
            'payment': 'from-orange-500 to-orange-600',
            'journal': 'from-indigo-500 to-indigo-600',
            'contra': 'from-pink-500 to-pink-600',
            'sale': 'from-green-500 to-green-600',
            'purchase': 'from-blue-500 to-blue-600',
            'discount': 'from-violet-500 to-violet-600',
            'expense': 'from-red-500 to-red-600',
            'loan create': 'from-yellow-500 to-yellow-600',
            'loan repayment': 'from-lime-500 to-lime-600',
            'loan opening balance': 'from-emerald-500 to-emerald-600',
            'asset depreciation': 'from-cyan-500 to-cyan-600',
            'asset sale': 'from-sky-500 to-sky-600',
            'asset purchase': 'from-amber-500 to-amber-600',
        };
        return colors[type] || 'from-gray-500 to-gray-600';
    };

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="animate-pulse">
            <td className="p-4"><div className="h-3 bg-gray-200 rounded w-6"></div></td>
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0"></div>
                    <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                </div>
            </td>
            <td className="p-4"><div className="h-7 bg-gray-200 rounded-lg w-32"></div></td>
            <td className="p-4"><div className="h-6 bg-gray-200 rounded-full w-10 mx-auto"></div></td>
            <td className="p-4"><div className="h-3 bg-gray-200 rounded w-44"></div></td>
            <td className="p-4"><div className="h-6 bg-gray-200 rounded-full w-16 mx-auto"></div></td>
            <td className="p-4">
                <div className="flex justify-center">
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
            </td>
        </tr>
    );

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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="h-full flex flex-col">
                        {/* Main Card - Full height with scrolling */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
                            {/* Card Header */}
                            <div className="border-b border-gray-200 px-6 py-4">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div>
                                        <h5 className="text-xl font-bold text-gray-800 mb-1">
                                            Invoice Prefix Management
                                        </h5>
                                        <p className="text-gray-500 text-xs">
                                            {filteredInvoices.length} of {invoicePrefixData.length} invoice prefixes shown
                                        </p>
                                    </div>

                                    <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                        {/* Search Input */}
                                        <div className="flex-1 relative min-w-[300px]">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Search by type or prefix..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {/* Type Filter */}
                                            <select
                                                value={selectedType}
                                                onChange={(e) => setSelectedType(e.target.value)}
                                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                            >
                                                <option value="">All Types</option>
                                                {invoiceTypes.map(type => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>

                                            <motion.button
                                                onClick={openCreateModal}
                                                className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiPlus className="w-4 h-4" />
                                                Add Prefix
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Table Container */}
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">#</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Type</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Prefix</th>
                                            <th className="text-center p-4 font-semibold text-gray-700 text-sm">Current #</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Valid Period</th>
                                            <th className="text-center p-4 font-semibold text-gray-700 text-sm">Status</th>
                                            <th className="text-center p-4 font-semibold text-gray-700 text-sm">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            // Skeleton Loaders
                                            Array.from({ length: 5 }).map((_, index) => (
                                                <SkeletonRow key={index} />
                                            ))
                                        ) : filteredInvoices.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-8 text-center">
                                                    <div className="flex flex-col items-center justify-center py-8">
                                                        <FiFileText className="w-16 h-16 text-gray-300 mb-4" />
                                                        <p className="text-gray-500 text-lg font-medium mb-2">
                                                            {listError ? 'Failed to load prefixes' : 'No invoice prefixes found'}
                                                        </p>
                                                        <p className="text-gray-400 text-sm mb-6">
                                                            {listError
                                                                ? listError
                                                                : 'Try adjusting your search or add a new prefix'}
                                                        </p>
                                                        {listError ? (
                                                            <button
                                                                onClick={fetchInvoicePrefixData}
                                                                className="px-6 py-3 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-all duration-200 shadow-sm"
                                                            >
                                                                Retry
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={openCreateModal}
                                                                className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all duration-200 shadow-sm"
                                                            >
                                                                <FiPlus className="w-4 h-4 inline mr-2" />
                                                                Add New Prefix
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredInvoices.map((invoice, index) => {
                                                const active = isActive(invoice.issue_date, invoice.expire_date);
                                                return (
                                                    <tr key={invoice.id} className={`transition-colors ${active ? 'hover:bg-gray-50' : 'bg-gray-50/60 hover:bg-gray-100/60 opacity-80'}`}>
                                                        <td className="p-4 text-sm text-gray-600 font-medium">
                                                            {index + 1}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 bg-gradient-to-br ${getTypeColor(invoice.type)} rounded-lg flex items-center justify-center shadow-sm`}>
                                                                    <FiFileText className="w-4 h-4 text-white" />
                                                                </div>
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                                                                    {invoice.type}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <code className="text-sm font-mono text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                                                                {invoice.prefix}
                                                            </code>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                {invoice.current ?? '—'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                                <FiCalendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                                <span>{formatDateForDisplay(invoice.issue_date)}</span>
                                                                <span className="text-gray-400">→</span>
                                                                <FiCalendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                                <span>{formatDateForDisplay(invoice.expire_date)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {active ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                                                    <FiCheckCircle className="w-3 h-3" />
                                                                    Active
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                                                    <FiXCircle className="w-3 h-3" />
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex justify-center">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedInvoice(invoice);
                                                                    setDeleteConfirmText('');
                                                                        setDeleteModal(true);
                                                                    }}
                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <FiTrash2 className="w-4 h-4" />
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

                        </div>
                    </div>
                </div>
            </div>

            {/* Create Invoice Prefix Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all duration-300">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Add Invoice Prefix</h2>
                                <p className="text-indigo-100 text-sm mt-1">Configure new invoice prefix settings</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-white hover:text-indigo-200 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateInvoicePrefix}>
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Invoice Type
                                            </label>
                                            <select
                                                value={formData.type}
                                                onChange={(e) => handleInputChange('type', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                                required
                                            >
                                                <option value="">Select Invoice Type</option>
                                                {invoiceTypes.map(type => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Prefix
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.prefix}
                                                onChange={(e) => handleInputChange('prefix', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                                placeholder="Ex: COMPANY/2025/"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <FiCalendar className="inline w-4 h-4 mr-2 text-gray-400" />
                                                Issue Date
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.issue_date}
                                                onChange={(e) => handleInputChange('issue_date', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                <FiCalendar className="inline w-4 h-4 mr-2 text-gray-400" />
                                                Expire Date
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.expire_date}
                                                onChange={(e) => handleInputChange('expire_date', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Starting Number
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.current}
                                                onChange={(e) => handleInputChange('current', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                                placeholder="1"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">
                                                This will be the next invoice number to be used.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
                                <motion.button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-3 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-200 hover:shadow-sm text-gray-700"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {loading ? 'Adding...' : 'Add Prefix'}
                                </motion.button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300">
                        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
                            <h2 className="text-xl font-bold">Delete Invoice Prefix</h2>
                            <button
                                onClick={() => {
                                    setDeleteModal(false);
                                    setDeleteConfirmText('');
                                }}
                                className="text-white hover:text-red-200 transition-colors duration-200 p-1 rounded-lg hover:bg-red-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="text-center mb-5">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiTrash2 className="w-8 h-8 text-red-600" />
                                </div>
                                <p className="text-slate-700 text-sm">
                                    Type <span className="font-semibold">delete</span> to confirm deleting prefix
                                    <span className="font-semibold"> {selectedInvoice.prefix}</span>.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Confirmation Text
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder='Type "delete"'
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
                            <button
                                onClick={() => {
                                    setDeleteModal(false);
                                    setDeleteConfirmText('');
                                }}
                                className="px-6 py-3 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-200 transition-all duration-200 hover:shadow-sm text-slate-700"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => handleDeleteInvoicePrefix(selectedInvoice.id)}
                                disabled={deleteLoading || deleteConfirmText.trim().toLowerCase() !== 'delete'}
                                className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <FiTrash2 className="w-4 h-4" />
                                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceSettings;