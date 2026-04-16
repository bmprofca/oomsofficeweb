// src/pages/ClientDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiUsers,
    FiUser,
    FiPhone,
    FiMail,
    FiBriefcase,
    FiDollarSign,
    FiCheckCircle,
    FiX,
    FiArrowLeft,
    FiRefreshCw,
    FiChevronLeft,
    FiChevronRight,
    FiEye,
    FiEdit,
    FiMessageSquare,
    FiTrash2,
    FiMoreVertical,
    FiCalendar,
    FiClock
} from 'react-icons/fi';
import { Sidebar, Header } from '../components/header';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";

const ClientDetailPage = () => {
    const navigate = useNavigate();
    const { metric } = useParams();
    
    // Sidebar state
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false
    });
    const [search, setSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [firmsModal, setFirmsModal] = useState({ open: false, firms: [], clientName: '' });

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

    // Fetch clients based on metric
    const fetchClients = useCallback(async () => {
        if (!metric) return;
        
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/report/dashboard-summary-detail/${metric}`;
            url += `?page_no=${pagination.page_no}&limit=${pagination.limit}`;
            
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            
            const response = await fetch(url, {
                headers: getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                setClients(data.data.items);
                setSummary(data.data.summary);
                setPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    }, [metric, pagination.page_no, pagination.limit, search]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const toggleRowExpand = (clientId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(clientId)) {
            newExpanded.delete(clientId);
        } else {
            newExpanded.add(clientId);
        }
        setExpandedRows(newExpanded);
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page_no: newPage }));
    };

    const handleRefresh = () => {
        fetchClients();
    };

    const handleClearSearch = () => {
        setSearch('');
        setPagination(prev => ({ ...prev, page_no: 1 }));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const statusNum = parseInt(status);
        if (statusNum === 1) {
            return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Active</span>;
        }
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Inactive</span>;
    };

    const openFirmsModal = (firms, clientName) => {
        setFirmsModal({
            open: true,
            firms: firms || [],
            clientName
        });
    };

    const closeFirmsModal = () => {
        setFirmsModal({
            open: false,
            firms: [],
            clientName: ''
        });
    };

    const getPageTitle = () => {
        switch(metric) {
            case 'total_client':
                return 'Total Clients';
            case 'new_client':
                return 'New Clients (Today)';
            case 'active_client':
                return 'Active Clients';
            default:
                return 'Clients';
        }
    };

    const getPageDescription = () => {
        switch(metric) {
            case 'total_client':
                return 'Complete list of all registered clients';
            case 'new_client':
                return 'Clients registered today';
            case 'active_client':
                return 'Clients with active tasks';
            default:
                return 'Client details';
        }
    };

    // Firms Details Modal Component
    const FirmsDetailsModal = ({ isOpen, onClose, firms, clientName }) => {
        if (!isOpen || !firms || firms.length === 0) return null;

        const formatAddress = (address) => {
            if (!address) return 'N/A';
            const parts = [
                address.address_line_1,
                address.address_line_2,
                address.village_town,
                address.city,
                address.district,
                address.state
            ].filter(Boolean);
            return parts.join(', ') || 'N/A';
        };

        return (
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    >
                        <motion.div
                            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-hidden"
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                            <FiBriefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">Firms Details</h3>
                                            <p className="text-indigo-100 text-sm">{clientName}</p>
                                        </div>
                                    </div>
                                    <motion.button
                                        onClick={onClose}
                                        className="text-white hover:text-indigo-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <FiX className="w-5 h-5" />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Firms List */}
                            <div className="p-6 overflow-y-auto max-h-[70vh]">
                                <div className="space-y-4">
                                    {firms.map((firm, index) => (
                                        <motion.div
                                            key={firm.firm_id || index}
                                            className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl overflow-hidden"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <div className="p-4">
                                                <div className="flex items-start gap-4 mb-3">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                                                        <FiBriefcase className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-gray-900 text-lg mb-1">
                                                            {firm.firm_name || 'Unnamed Firm'}
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {firm.firm_type && (
                                                                <span className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">
                                                                    {firm.firm_type}
                                                                </span>
                                                            )}
                                                            {firm.status && (
                                                                <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                                                                    Active
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                                                    {firm.pan_no && (
                                                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                                                            <p className="text-xs text-gray-500">PAN No</p>
                                                            <p className="font-semibold text-sm">{firm.pan_no}</p>
                                                        </div>
                                                    )}
                                                    {firm.gst_no && (
                                                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                                                            <p className="text-xs text-gray-500">GST No</p>
                                                            <p className="font-semibold text-sm">{firm.gst_no}</p>
                                                        </div>
                                                    )}
                                                    {firm.registration_no && (
                                                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                                                            <p className="text-xs text-gray-500">Registration No</p>
                                                            <p className="font-semibold text-sm">{firm.registration_no}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {firm.address && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <p className="text-xs text-gray-500 mb-1">Address</p>
                                                        <p className="text-sm text-gray-700">{formatAddress(firm.address)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    Total: {firms.length} firm{firms.length !== 1 ? 's' : ''}
                                </div>
                                <motion.button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium text-sm"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Close
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    };

    if (!metric || (metric !== 'total_client' && metric !== 'new_client' && metric !== 'active_client')) {
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
                <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Invalid Metric</h2>
                            <p className="text-gray-500 mb-6">Please select a valid client metric to view details.</p>
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
                            >
                                Go Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
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

            <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="mb-6">
                        <button
                            onClick={() => navigate('/')}
                            className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center gap-2 transition-colors"
                        >
                            <FiArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </button>
                        
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                                            <FiUsers className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                                                {getPageTitle()}
                                            </h1>
                                            <p className="text-gray-500">
                                                {getPageDescription()}
                                            </p>
                                        </div>
                                    </div>
                                    {summary && Object.keys(summary).length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                            {summary.total !== undefined && (
                                                <span className="px-3 py-1 bg-gray-100 rounded-full">
                                                    Total: {summary.total}
                                                </span>
                                            )}
                                            {summary.active !== undefined && (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                                                    Active: {summary.active}
                                                </span>
                                            )}
                                            {summary.inactive !== undefined && (
                                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full">
                                                    Inactive: {summary.inactive}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <motion.button 
                                        onClick={handleRefresh}
                                        disabled={loading}
                                        className="p-3 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiRefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search by client name, email, or mobile..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPagination(prev => ({ ...prev, page_no: 1 }));
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            {search && (
                                <button
                                    onClick={handleClearSearch}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                                >
                                    <FiX className="w-4 h-4" /> Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Clients Table */}
                    {loading ? (
                        <div className="bg-white rounded-2xl shadow-xl p-20 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[800px]">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="w-10 p-4"></th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    SL No
                                                </th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    Client Details
                                                </th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    Contact
                                                </th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    Address
                                                </th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    Status
                                                </th>
                                                {metric === 'total_client' && (
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                        Total Tasks
                                                    </th>
                                                )}
                                                {metric === 'total_client' && (
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                        Total Revenue
                                                    </th>
                                                )}
                                                {metric === 'active_client' && (
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                        Active Tasks
                                                    </th>
                                                )}
                                                {metric === 'active_client' && (
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                        Latest Due Date
                                                    </th>
                                                )}
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                                    Created Date
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {clients.length === 0 ? (
                                                <tr>
                                                    <td colSpan={metric === 'total_client' ? 9 : metric === 'active_client' ? 8 : 7} className="text-center py-12 text-gray-500">
                                                        No clients found
                                                    </td>
                                                </tr>
                                            ) : (
                                                clients.map((client, index) => (
                                                    <React.Fragment key={client.client_id || index}>
                                                        <tr className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="p-4">
                                                                <button
                                                                    onClick={() => toggleRowExpand(client.client_id)}
                                                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                                >
                                                                    {expandedRows.has(client.client_id) ? 
                                                                        <FiChevronRight className="w-4 h-4 transform rotate-90" /> : 
                                                                        <FiChevronRight className="w-4 h-4" />
                                                                    }
                                                                </button>
                                                            </td>
                                                            <td className="p-4 text-gray-600">
                                                                {(pagination.page_no - 1) * pagination.limit + index + 1}
                                                            </td>
                                                            <td className="p-4">
                                                                <div>
                                                                    <p className="font-semibold text-gray-800">{client.client_name}</p>
                                                                    <p className="text-xs text-gray-500">ID: {client.client_id}</p>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div>
                                                                    <p className="text-sm flex items-center gap-1">
                                                                        <FiMail className="w-3 h-3 text-gray-400" />
                                                                        {client.email || 'N/A'}
                                                                    </p>
                                                                    <p className="text-sm flex items-center gap-1 mt-1">
                                                                        <FiPhone className="w-3 h-3 text-gray-400" />
                                                                        {client.country_code ? `+${client.country_code} ` : ''}{client.mobile || 'N/A'}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <p className="text-sm text-gray-600 max-w-xs truncate">
                                                                    {client.address || 'N/A'}
                                                                </p>
                                                            </td>
                                                            <td className="p-4">
                                                                {getStatusBadge(client.status)}
                                                            </td>
                                                            {metric === 'total_client' && (
                                                                <td className="p-4">
                                                                    <span className="text-sm font-semibold text-indigo-600">
                                                                        {client.total_tasks || 0}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {metric === 'total_client' && (
                                                                <td className="p-4">
                                                                    <span className="text-sm font-semibold text-green-600">
                                                                        {formatCurrency(client.total_revenue)}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {metric === 'active_client' && (
                                                                <td className="p-4">
                                                                    <span className="text-sm font-semibold text-orange-600">
                                                                        {client.active_tasks || 0}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {metric === 'active_client' && (
                                                                <td className="p-4">
                                                                    <span className="text-sm">
                                                                        {client.latest_due_date ? formatDate(client.latest_due_date) : 'N/A'}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            <td className="p-4">
                                                                <span className="text-sm">
                                                                    {formatDate(client.create_date)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        
                                                        {/* Expanded Row */}
                                                        <AnimatePresence>
                                                            {expandedRows.has(client.client_id) && (
                                                                <motion.tr
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    className="bg-gray-50"
                                                                >
                                                                    <td colSpan={metric === 'total_client' ? 9 : metric === 'active_client' ? 8 : 7} className="p-6">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                                                                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                                                    <FiBriefcase className="w-4 h-4 text-indigo-600" />
                                                                                    Additional Information
                                                                                </h4>
                                                                                <div className="space-y-2 text-sm">
                                                                                    <p><span className="text-gray-500">Client ID:</span> {client.client_id}</p>
                                                                                    <p><span className="text-gray-500">Username:</span> {client.username || 'N/A'}</p>
                                                                                    <p><span className="text-gray-500">Status:</span> {client.status === '1' ? 'Active' : 'Inactive'}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                                                                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                                                    <FiCalendar className="w-4 h-4 text-indigo-600" />
                                                                                    Timeline
                                                                                </h4>
                                                                                <div className="space-y-2 text-sm">
                                                                                    <p><span className="text-gray-500">Created Date:</span> {formatDate(client.create_date)}</p>
                                                                                    <p><span className="text-gray-500">Last Updated:</span> {formatDate(client.modify_date)}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </motion.tr>
                                                            )}
                                                        </AnimatePresence>
                                                    </React.Fragment>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination */}
                            {pagination.total_pages > 1 && (
                                <div className="mt-6 flex justify-center items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page_no - 1)}
                                        disabled={!pagination.has_prev}
                                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <FiChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>
                                    <span className="px-4 py-2 text-gray-700">
                                        Page {pagination.page_no} of {pagination.total_pages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(pagination.page_no + 1)}
                                        disabled={!pagination.has_next}
                                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        Next
                                        <FiChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <FirmsDetailsModal
                isOpen={firmsModal.open}
                onClose={closeFirmsModal}
                firms={firmsModal.firms}
                clientName={firmsModal.clientName}
            />
        </div>
    );
};

export default ClientDetailPage;