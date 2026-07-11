import React, { useState, useEffect } from 'react';
import {
    FiEdit,
    FiCalendar,
    FiSettings,
    FiSearch,
    FiMail,
    FiDownload,
    FiPrinter,
    FiX,
    FiRefreshCw,
    FiClock,
    FiCalendar as FiCalendarIcon,
    FiCheckCircle,
    FiAlertCircle
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { motion } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';

const DefaultDaterange = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [daterangeData, setDaterangeData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDaterange, setSelectedDaterange] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedDaterangeItem, setSelectedDaterangeItem] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '',
        value_1: '',
        value_2: ''
    });

    // Mock data
    const [daterangeDataState, setDaterangeDataState] = useState([
        {
            id: '1',
            name: 'financial_year',
            display_name: 'Financial Year',
            value_1: '2024-04-01',
            value_2: '2025-03-31',
            status: 'active',
            description: 'Current financial year for accounting purposes',
            updated_at: '2024-12-01'
        },
        {
            id: '2',
            name: 'current_quarter',
            display_name: 'Current Quarter',
            value_1: '2025-01-01',
            value_2: '2025-03-31',
            status: 'active',
            description: 'Current quarter for reporting',
            updated_at: '2024-12-01'
        },
        {
            id: '3',
            name: 'tax_year',
            display_name: 'Tax Year',
            value_1: '2024-04-01',
            value_2: '2025-03-31',
            status: 'active',
            description: 'Tax assessment year',
            updated_at: '2024-11-15'
        },
        {
            id: '4',
            name: 'academic_year',
            display_name: 'Academic Year',
            value_1: '2024-06-01',
            value_2: '2025-05-31',
            status: 'active',
            description: 'Academic calendar year',
            updated_at: '2024-11-15'
        },
        {
            id: '5',
            name: 'fiscal_year',
            display_name: 'Fiscal Year',
            value_1: '2024-01-01',
            value_2: '2024-12-31',
            status: 'inactive',
            description: 'Previous fiscal year',
            updated_at: '2024-10-01'
        },
        {
            id: '6',
            name: 'assessment_year',
            display_name: 'Assessment Year',
            value_1: '2025-04-01',
            value_2: '2026-03-31',
            status: 'upcoming',
            description: 'Upcoming assessment year',
            updated_at: '2024-11-20'
        }
    ]);

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
                setShowExportDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Load initial data
    useEffect(() => {
        fetchDaterangeData();
    }, []);

    const fetchDaterangeData = async () => {
        setLoading(true);
        setTimeout(() => {
            setDaterangeData(daterangeDataState);
            setLoading(false);
        }, 1000);
    };

    // Filter dateranges based on search
    const filteredDateranges = daterangeData.filter(item => {
        const matchesSearch = searchQuery === '' ||
            item.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSearch;
    });

    // Handle daterange selection
    const handleDaterangeSelect = (daterangeId) => {
        const newSelected = new Set(selectedDaterange);
        if (newSelected.has(daterangeId)) {
            newSelected.delete(daterangeId);
        } else {
            newSelected.add(daterangeId);
        }
        setSelectedDaterange(newSelected);
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedDaterange(new Set());
        } else {
            const allDaterangeIds = new Set(filteredDateranges.map(item => item.id));
            setSelectedDaterange(allDaterangeIds);
        }
        setSelectAll(!selectAll);
    };

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const formatDateTimeForDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Handle export
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            alert(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    // Handle edit submit
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        setTimeout(() => {
            setDaterangeData(prev => prev.map(item => 
                item.id === selectedDaterangeItem.id 
                    ? { 
                        ...item, 
                        value_1: editForm.value_1,
                        value_2: editForm.value_2,
                        updated_at: new Date().toISOString().split('T')[0]
                    }
                    : item
            ));
            
            setShowEditModal(false);
            setLoading(false);
            alert('Daterange updated successfully!');
        }, 1000);
    };

    // Get status badge
    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <FiCheckCircle className="w-3 h-3 mr-1" />
                        Active
                    </span>
                );
            case 'inactive':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        <FiClock className="w-3 h-3 mr-1" />
                        Inactive
                    </span>
                );
            case 'upcoming':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        <FiCalendarIcon className="w-3 h-3 mr-1" />
                        Upcoming
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                        <FiAlertCircle className="w-3 h-3 mr-1" />
                        {status}
                    </span>
                );
        }
    };

    const openEditModal = (daterange) => {
        setSelectedDaterangeItem(daterange);
        setEditForm({
            name: daterange.name,
            value_1: formatDateForInput(daterange.value_1),
            value_2: formatDateForInput(daterange.value_2)
        });
        setShowEditModal(true);
    };

    const handleInputChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="animate-pulse">
            <td className="p-4">
                <div className="h-4 bg-gray-200 rounded w-4"></div>
            </td>
            <td className="p-4">
                <div className="h-3 bg-gray-200 rounded w-8"></div>
            </td>
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                        <div className="h-2 bg-gray-200 rounded w-16"></div>
                    </div>
                </div>
            </td>
            <td className="p-4">
                <div className="h-3 bg-gray-200 rounded w-32"></div>
            </td>
            <td className="p-4">
                <div className="h-3 bg-gray-200 rounded w-32"></div>
            </td>
            <td className="p-4">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
            </td>
            <td className="p-4">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
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
                                            Daterange Settings
                                        </h5>
                                        <p className="text-gray-500 text-xs">
                                            {filteredDateranges.length} of {daterangeData.length} dateranges shown
                                        </p>
                                    </div>

                                    <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                        {/* Search Input */}
                                        <div className="flex-1 relative min-w-[300px]">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Search by name, description, or type..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {/* Export Dropdown */}
                                            <div className="dropdown-container relative">
                                                <motion.button
                                                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <PiExportBold className="w-4 h-4" />
                                                    Export
                                                </motion.button>

                                                {showExportDropdown && (
                                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                                        <div className="py-1">
                                                            <button
                                                                onClick={() => handleExport('pdf')}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                            >
                                                                <PiFilePdfDuotone className="w-4 h-4 mr-3 text-red-500" />
                                                                Export as PDF
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('excel')}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                            >
                                                                <PiMicrosoftExcelLogoDuotone className="w-4 h-4 mr-3 text-green-500" />
                                                                Export as Excel
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('whatsapp')}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                            >
                                                                <FaWhatsapp className="w-4 h-4 mr-3 text-green-500" />
                                                                Share via WhatsApp
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('email')}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                            >
                                                                <AiOutlineMail className="w-4 h-4 mr-3 text-blue-500" />
                                                                Share via Email
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <motion.button
                                                onClick={() => fetchDaterangeData()}
                                                className="px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiRefreshCw className="w-4 h-4" />
                                                Refresh
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
                                            <th className="w-12 p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500"
                                                />
                                            </th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">#</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Name</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">From Date</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">To Date</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Status</th>
                                            <th className="text-center p-4 font-semibold text-gray-700 text-sm">
                                                <FiSettings className="w-4 h-4 inline" />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            // Skeleton Loaders
                                            Array.from({ length: 5 }).map((_, index) => (
                                                <SkeletonRow key={index} />
                                            ))
                                        ) : filteredDateranges.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-8 text-center">
                                                    <div className="flex flex-col items-center justify-center py-8">
                                                        <FiCalendar className="w-16 h-16 text-gray-300 mb-4" />
                                                        <p className="text-gray-500 text-lg font-medium mb-2">No dateranges found</p>
                                                        <p className="text-gray-400 text-sm mb-6">
                                                            {searchQuery ? 'Try adjusting your search' : 'No daterange configurations available'}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredDateranges.map((item, index) => (
                                                <tr 
                                                    key={item.id} 
                                                    className="hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDaterange.has(item.id)}
                                                            onChange={() => handleDaterangeSelect(item.id)}
                                                            className="w-4 h-4 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 font-medium">
                                                        {index + 1}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                                                                <FiCalendar className="w-4 h-4 text-white" />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-gray-800 text-sm">
                                                                    {item.display_name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    {item.description}
                                                                </div>
                                                                <div className="text-xs text-gray-400 font-mono mt-1">
                                                                    {item.name}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <FiCalendar className="w-3 h-3 text-gray-400" />
                                                            {formatDateForDisplay(item.value_1)}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <FiCalendar className="w-3 h-3 text-gray-400" />
                                                            {formatDateForDisplay(item.value_2)}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {getStatusBadge(item.status)}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex justify-center">
                                                            <button
                                                                onClick={() => openEditModal(item)}
                                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                title="Edit Daterange"
                                                            >
                                                                <FiEdit className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Table Footer */}
                            <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                                <div className="p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-800 text-sm">
                                            Showing {filteredDateranges.length} of {daterangeData.length} dateranges
                                        </span>
                                        <div className="flex gap-2 items-center">
                                            <div className="text-sm text-gray-600 mr-4">
                                                {selectedDaterange.size} daterange(s) selected
                                            </div>
                                            <button
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:bg-indigo-700 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={selectedDaterange.size === 0}
                                            >
                                                <FiMail className="w-4 h-4" />
                                                Send Message
                                            </button>
                                            <button
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:bg-green-700 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={selectedDaterange.size === 0}
                                            >
                                                <FiDownload className="w-4 h-4" />
                                                Export Selected
                                            </button>
                                            <button
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:bg-purple-700 flex items-center gap-2 shadow-sm"
                                            >
                                                <FiPrinter className="w-4 h-4" />
                                                Print All
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && selectedDaterangeItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all duration-300">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Update Daterange</h2>
                                <p className="text-indigo-100 text-sm mt-1">Modify default date range settings</p>
                            </div>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-white hover:text-indigo-200 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleEditSubmit}>
                            <div className="p-6">
                                <input type="hidden" name="name" value={editForm.name} />
                                
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Daterange Type
                                    </label>
                                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
                                        <FiCalendar className="w-5 h-5 text-indigo-600" />
                                        <div>
                                            <div className="font-semibold text-gray-800">
                                                {selectedDaterangeItem?.display_name}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                {selectedDaterangeItem?.description}
                                            </div>
                                        </div>
                                        <div className="ml-auto">
                                            {getStatusBadge(selectedDaterangeItem?.status)}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 font-mono">
                                        {selectedDaterangeItem?.name}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiCalendarIcon className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={editForm.value_1}
                                            onChange={(e) => handleInputChange('value_1', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiCalendarIcon className="inline w-4 h-4 mr-2 text-gray-400" />
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={editForm.value_2}
                                            onChange={(e) => handleInputChange('value_2', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Current Values Display */}
                                <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                                    <h6 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <FiClock className="w-4 h-4 text-gray-400" />
                                        Current Values
                                    </h6>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                                            <div className="text-gray-500 text-xs mb-1">Start Date</div>
                                            <div className="font-medium text-gray-700 flex items-center gap-2">
                                                <FiCalendar className="w-3 h-3 text-gray-400" />
                                                {formatDateForDisplay(selectedDaterangeItem?.value_1)}
                                            </div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                                            <div className="text-gray-500 text-xs mb-1">End Date</div>
                                            <div className="font-medium text-gray-700 flex items-center gap-2">
                                                <FiCalendar className="w-3 h-3 text-gray-400" />
                                                {formatDateForDisplay(selectedDaterangeItem?.value_2)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                                        <FiRefreshCw className="w-3 h-3" />
                                        Last updated: {formatDateTimeForDisplay(selectedDaterangeItem?.updated_at)}
                                    </div>
                                </div>
                            </div>
                            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
                                <motion.button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-6 py-3 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-200 hover:shadow-sm text-gray-700"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 flex items-center gap-2"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiEdit className="w-4 h-4" />
                                    {loading ? 'Updating...' : 'Update Daterange'}
                                </motion.button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Export Confirmation Modal */}
            {exportModal.open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-auto transform transition-all duration-300">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PiExportBold className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                Exporting {exportModal.type.toUpperCase()}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Your {exportModal.type} export is being processed...
                            </p>
                            <div className="flex justify-center space-x-3">
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DefaultDaterange;