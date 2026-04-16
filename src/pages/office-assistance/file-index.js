import React, { useState, useEffect, useCallback } from 'react';
import {
    FiSearch, FiPlus, FiEdit, FiMenu, FiPrinter, FiMail, FiMessageSquare,
    FiUser, FiPhone, FiMail as FiEmailIcon, FiFileText, FiX, FiChevronRight,
    FiChevronDown, FiCheck, FiDollarSign, FiChevronLeft, FiChevronRight as FiChevronRightIcon,
    FiChevronUp, FiExternalLink, FiCalendar, FiEye, FiTrash2
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import DateFilter from '../../components/DateFilter';
import moment from 'moment';
import getHeaders from "../../utils/get-headers";
import axios from 'axios';
import SearchableSelect from '../../components/SearchableSelect';

const ViewFileIndex = () => {
    // Sidebar states
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    // Base Api Url
    const BASE_URL = 'https://api.ooms.in/api/v1';

    // Main states
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState('');
    const [fromToDate, setFromToDate] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [users, setUsers] = useState([]);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState('');
    const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [selectedWhatsapp, setSelectedWhatsapp] = useState('');
    const [meta, setMeta] = useState({ totalpages: 0, currentpage: 1, total: 0 });
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedFileToView, setSelectedFileToView] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [createForm, setCreateForm] = useState({ username: '', selectedUser: null, gst: '', audit: '', income_tax: '', other: '' });
    const [editForm, setEditForm] = useState({ indexid: '', gst: '', audit: '', income_tax: '', other: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showAll, setShowAll] = useState(false);

    // Fixed useEffects
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

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

    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = today;
        const formatDate = (date) =>
            date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/,/g, '');

        const from = formatDate(firstDay);
        const to = formatDate(lastDay);
        setDateRange(`${from} - ${to}`);
        setFromToDate(`From: ${from} to: ${to}`);
        fetchFileData(from, to);
    }, []);

    // Fixed search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                const [from, to] = dateRange.split(' - ');
                fetchFileData(from, to, searchQuery);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Core data fetching - FULLY FIXED
    const fetchFileData = async (from, to, search = '', page = 1, limit = 10) => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });

            if (search) params.append('search', search);
            if (from && to) {
                const fromFormatted = moment(from, 'DD/MM/YYYY').format('YYYY-MM-DD');
                const toFormatted = moment(to, 'DD/MM/YYYY').format('YYYY-MM-DD');
                params.append('from', fromFormatted);
                params.append('to', toFormatted);
            }

            const response = await axios.get(
                `${BASE_URL}/assistance/file-index/list?${params.toString()}`,
                { headers }
            );

            const result = response.data;
            if (result.success) {
                const mapFileIndexToUI = (item) => ({
                    indexid: item.index_id,           // Backend: index_id → Frontend: indexid
                    firmid: item.firm_id,             // Backend: firm_id → Frontend: firmid  
                    firmname: item.firmname || item.firm_name || '',
                    mobile: item.create_by?.mobile || item.createby?.mobile || '',
                    email: item.create_by?.email || item.createby?.email || '',
                    gst: item.gst || '',
                    audit: item.audit || '',
                    income_tax: item.it || '',
                    other: item.others || '',
                    usertype: item.create_by?.usertype || item.createby?.usertype || item.create_by?.user_type || 'user',
                    name: item.create_by?.name || item.createby?.name || '',
                    guardianname: item.create_by?.guardianname || item.createby?.guardianname || item.guardian_name || '',
                    createddate: item.create_date?.split('T')[0] || item.createdate?.split('T')[0] || ''
                });

                setFileData(result.data.map(mapFileIndexToUI));
                setMeta(result.meta || {});
                setCurrentPage(result.meta?.page || 1);
            }
            else {
                console.error('Backend error:', result.message);
                setFileData([]);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setFileData([]);
        } finally {
            setLoading(false);
        }
    };

    // Delete handler - FIXED
    const handleDeleteFile = async (file) => {
        try {
            setLoading(true);
            const headers = getHeaders();

            const response = await fetch(`${BASE_URL}/assistance/file-index/delete`, {
                method: 'DELETE',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    index_id: file.indexid,    // ✅ Frontend → Backend mapping
                    firm_id: file.firmid       // ✅ ADDED: Backend expects firm_id
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const [from, to] = dateRange.split(' - ');
                fetchFileData(from, to, searchQuery);
                setShowDeleteConfirm(false);
                setFileToDelete(null);
            } else {
                alert(`Delete failed: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Delete failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        const [from, to] = dateRange.split(' - ');
        fetchFileData(from, to, searchQuery);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleDateFilterChange = (filter) => {
        if (filter.range) {
            setDateRange(filter.range);
            const [from, to] = filter.range.split(' - ');
            setFromToDate(`From: ${from} to: ${to}`);
            fetchFileData(from, to, searchQuery);
        }
    };

    // Export handler - SIMPLIFIED
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            alert(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    const handleEmailSubmit = (email) => {
        setSelectedEmail(email);
        setIsEmailModalOpen(false);
    };

    const handleWhatsappSubmit = (number) => {
        setSelectedWhatsapp(number);
        setWhatsappModalOpen(false);
    };

    // Edit handlers - FIXED
    const handleEditClick = (file) => {
        setSelectedFile(file);
        setEditForm({
            indexid: file.indexid,
            gst: file.gst || '',
            audit: file.audit || '',
            income_tax: file.income_tax || '',
            other: file.other || ''
        });
        setShowEditModal(true);
    };


    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        const headers = getHeaders();

        if (!headers) {
            alert('Authentication required. Please login again.');
            return;
        }

        // Validate required field
        if (!createForm.selectedUser?.firms?.[0]?.firm_id) {
            alert('Please select a valid user with firm information.');
            return;
        }

        if (loading) return;

        setLoading(true);

        try {
            const payload = {
                firm_id: createForm.selectedUser.firms[0].firm_id,  // Backend expects "firm_id" (not firmid)
                gst: createForm.gst || null,
                audit: createForm.audit || null,  // Backend expects "audit" (not audit)
                it: createForm.income_tax || null,
                others: createForm.other || null
            };


            const response = await fetch(`${BASE_URL}/assistance/file-index/create`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setShowCreateModal(false);
                // Reset form completely
                setCreateForm({
                    username: '',
                    selectedUser: null,
                    gst: '',
                    audit: '',
                    income_tax: '',
                    other: ''
                });
                // Refresh data
                const [from, to] = dateRange.split(' - ');
                fetchFileData(from, to, searchQuery);
            } else {
                alert(`Create failed: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const headers = getHeaders();

        if (!headers || !editForm?.indexid) {
            alert('Cannot update: Missing headers or ID');
            return;
        }

        if (loading) return;

        setLoading(true);

        // ✅ FIXED: Backend field mapping
        const apiPayload = {
            index_id: editForm.indexid,
            firm_id: selectedFile?.firmid,
            gst: editForm.gst || null,
            audit: editForm.audit || null,
            it: editForm.income_tax || null,      // Backend expects "it"
            others: editForm.other || null       // Backend expects "others"
        };


        try {
            const response = await fetch(`${BASE_URL}/assistance/file-index/edit`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setShowEditModal(false);
                setSelectedFile(null);
                setEditForm({ indexid: '', gst: '', audit: '', income_tax: '', other: '' });
                const [from, to] = dateRange.split(' - ');
                fetchFileData(from, to, searchQuery);
            } else {
                alert(`Update failed: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChange = (field, value) => {
        setCreateForm(prev => ({ ...prev, [field]: value }));
    };

    const handleEditChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const getUserProfileLink = (user) => {
        const baseUrls = {
            user: 'view-client-profile',
            ca: 'view-ca-profile',
            agent: 'view-agent-profile',
            employee: 'view-stuff-profile'
        };
        return `/${baseUrls[user.usertype || 'user']}/${user.username}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    const getFileBadgeClass = (fileType) => {
        const baseClasses = 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border shadow-xs';
        switch (fileType) {
            case 'gst': return `${baseClasses} bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-200`;
            case 'audit': return `${baseClasses} bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border-emerald-200`;
            case 'income_tax': return `${baseClasses} bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border-purple-200`;
            case 'other': return `${baseClasses} bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-amber-200`;
            default: return `${baseClasses} bg-gradient-to-r from-slate-50 to-slate-100 text-slate-800 border-slate-200`;
        }
    };

    const toggleRowDropdown = (indexId) => {
        setActiveRowDropdown(activeRowDropdown === indexId ? null : indexId);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setShowAddDropdown(false);
                setActiveRowDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleUserProfileClick = (e, file) => {
        e.preventDefault();
        const profileLink = getUserProfileLink(file);
        console.log('Navigating to profile:', profileLink);
        window.open(profileLink, '_blank');
    };

    // Pagination calculations - FIXED
    const indexOfLastItem = showAll ? fileData.length : currentPage * itemsPerPage;
    const indexOfFirstItem = showAll ? 0 : (currentPage - 1) * itemsPerPage;
    const currentItems = fileData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(fileData.length / itemsPerPage);

    // Skeleton Loader Component
    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div></td>
            <td className="p-3 text-center">
                <div className="flex items-center justify-center">
                    <div className="h-8 w-8 bg-slate-200 rounded-full mr-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                </div>
            </td>
            <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-6 bg-slate-200 rounded w-20 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-6 bg-slate-200 rounded w-20 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-6 bg-slate-200 rounded w-20 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-6 bg-slate-200 rounded w-20 mx-auto"></div></td>
            <td className="p-3 text-center"><div className="h-6 bg-slate-200 rounded w-10 mx-auto"></div></td>
        </tr>
    );

    const SkeletonLoader = () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
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
                                            {Array(8).fill(0).map((_, i) => (
                                                <th key={i} className="text-center p-3">
                                                    <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                </table>
                            </div>
                            <div className="p-4">
                                {Array(6).fill(0).map((_, index) => (
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
    if (loading && fileData.length === 0) {
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

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header Stats Cards - Professional Compact Design */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Records</p>
                                    <h3 className="text-xl font-bold text-slate-800 mt-1">{fileData.length}</h3>
                                </div>
                                <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                                    <FiFileText className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 font-medium">All file index entries</span>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">GST Files</p>
                                    <h3 className="text-xl font-bold text-slate-800 mt-1">{fileData.filter(f => f.gst).length}</h3>
                                </div>
                                <div className="p-2 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-lg">
                                    <FiCheck className="w-5 h-5 text-emerald-600" />
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 font-medium">Active GST registrations</span>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.2 }}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Audit Files</p>
                                    <h3 className="text-xl font-bold text-slate-800 mt-1">{fileData.filter(f => f.audit).length}</h3>
                                </div>
                                <div className="p-2 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg">
                                    <FiDollarSign className="w-5 h-5 text-purple-600" />
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 font-medium">Audit filings completed</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Main Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-xl shadow-lg border border-slate-200"
                    >
                        {/* Card Header */}
                        <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10">
                            <div className="header flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div className="options-parent">
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="p-2 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg">
                                            <FiFileText className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <h5 className="text-lg font-bold text-slate-800 whitespace-nowrap">
                                                File Index Register
                                            </h5>
                                            {fromToDate && (
                                                <div className="flex items-center gap-1 text-slate-600">
                                                    <FiCalendar className="w-3 h-3" />
                                                    <p className="text-xs font-medium whitespace-nowrap">
                                                        {fromToDate}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-3 w-full justify-end">
                                    {/* Search Input */}
                                    <div className="relative flex justify-center items-center ">
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Search file index..."
                                            className="pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full lg:w-64"
                                        />
                                    </div>
                                    <div className="flex gap-2">

                                        {/* Date Filter Component */}
                                        <div className="w-full lg:w-auto whitespace-nowrap">
                                            <DateFilter onChange={handleDateFilterChange} />
                                        </div>

                                        {/* Export Dropdown */}
                                        <div className="dropdown-container relative">
                                            <motion.button
                                                onClick={() => setShowAddDropdown(!showAddDropdown)}
                                                className="px-4 h-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <PiExportBold className="w-4 h-4" />
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
                                            onClick={() => setShowCreateModal(true)}
                                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiPlus className="w-4 h-4" />

                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table Container */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[60px]">
                                            #
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[180px]">
                                            User Details
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">
                                            Contact Info
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">
                                            Files
                                        </th>

                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {fileData.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiFileText className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No file index records found</p>
                                                    <p className="text-slate-500 text-xs mb-4">Start by creating your first file index entry</p>
                                                    <motion.button
                                                        onClick={() => setShowCreateModal(true)}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow transition-all duration-200"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Create Your First File Index
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((file, index) => {
                                            const isDropdownOpen = activeRowDropdown === file.indexid;
                                            const actualIndex = showAll ? index : (currentPage - 1) * itemsPerPage + index;
                                            const profileLink = getUserProfileLink(file);

                                            return (
                                                <motion.tr key={file.indexid} /* ✅ Fixed: index_id → indexid */>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-700 font-medium text-xs">
                                                            {actualIndex + 1}
                                                        </div>
                                                    </td>

                                                    {/* User Details - Fixed field names */}
                                                    <td className="text-center p-3 align-middle">
                                                        <motion.a href={profileLink} onClick={(e) => handleUserProfileClick(e, file)}
                                                            className="inline-flex items-center justify-center gap-2 group cursor-pointer no-underline"
                                                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>

                                                            <div className="relative">
                                                                <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-purple-200 rounded-full flex items-center justify-center flex-shrink-0 group-hover:from-purple-200 group-hover:to-purple-300 transition-colors">
                                                                    <FiUser className="w-4 h-4 text-purple-600" />
                                                                </div>
                                                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                                                                    <FiExternalLink className="w-2.5 h-2.5 text-purple-500" />
                                                                </div>
                                                            </div>

                                                            <div className="text-left">
                                                                <div className="text-slate-800 font-semibold text-xs group-hover:text-purple-600 transition-colors">
                                                                    {file.name || 'N/A'}
                                                                </div>
                                                                <div className="text-slate-600 text-[10px] mt-0.5">
                                                                    C/O: {file.guardianname || 'N/A'}
                                                                </div>
                                                                <div className="mt-1">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${file.usertype === 'user' ? 'bg-blue-100 text-blue-700 group-hover:bg-blue-200' :
                                                                        file.usertype === 'ca' ? 'bg-purple-100 text-purple-700 group-hover:bg-purple-200' :
                                                                            file.usertype === 'agent' ? 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200' :
                                                                                'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                                                                        } transition-colors`}>
                                                                        {file.usertype}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </motion.a>
                                                    </td>

                                                    {/* Contact Info */}
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-center gap-1 text-slate-700 text-xs">
                                                                <FiPhone className="w-3 h-3 text-slate-500" />
                                                                {file.mobile || 'N/A'}
                                                            </div>
                                                            <div className="flex items-center justify-center gap-1 text-slate-600 text-[10px]">
                                                                <FiEmailIcon className="w-3 h-3 text-slate-500" />
                                                                {file.email || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Files - FIXED COUNTER */}
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 shadow-sm mx-auto">
                                                            {[
                                                                file.gst && 'GST',
                                                                file.audit && 'Audit',        // ✅ Matches mapped field
                                                                file.income_tax && 'ITR',      // ✅ Matches mapped field  
                                                                file.other && 'Other'         // ✅ Matches mapped field
                                                            ].filter(Boolean).length}
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="flex gap-2 justify-center">
                                                            {/* Menu Dropdown */}
                                                            <div className="dropdown-container relative flex justify-center">
                                                                <motion.button
                                                                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                    onClick={() => toggleRowDropdown(file.indexid)}  // ✅ Fixed: index_id → indexid
                                                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                                    <FiMenu className="w-3.5 h-3.5" />
                                                                </motion.button>

                                                                {/* Dropdown Menu Items */}
                                                                <AnimatePresence>
                                                                    {isDropdownOpen && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: 5 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            exit={{ opacity: 0, y: 5 }}
                                                                            className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">

                                                                            <div className="py-1">
                                                                                {/* Edit */}
                                                                                <button onClick={() => {
                                                                                    setActiveRowDropdown(null);
                                                                                    handleEditClick(file);
                                                                                }} className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150">
                                                                                    <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                        <FiEdit className="w-3 h-3 text-blue-500" />
                                                                                    </div>
                                                                                    <div className="font-medium">Edit File Index</div>
                                                                                </button>

                                                                                {/* Delete */}
                                                                                <button onClick={() => {
                                                                                    setActiveRowDropdown(null);
                                                                                    setFileToDelete(file);
                                                                                    setShowDeleteConfirm(true);
                                                                                }} className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-red-50 border-t border-slate-100 transition-colors duration-150">
                                                                                    <div className="p-1 bg-red-50 rounded mr-2">
                                                                                        <FiTrash2 className="w-3 h-3 text-red-500" />
                                                                                    </div>
                                                                                    <div className="font-medium">Delete File Index</div>
                                                                                </button>

                                                                                {/* Profile Link */}
                                                                                <a href={profileLink} onClick={(e) => {
                                                                                    setActiveRowDropdown(null);
                                                                                    handleUserProfileClick(e, file);
                                                                                }} className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150">
                                                                                    <div className="p-1 bg-emerald-50 rounded mr-2">
                                                                                        <FiUser className="w-3 h-3 text-emerald-500" />
                                                                                    </div>
                                                                                    <div className="font-medium">View Profile</div>
                                                                                </a>

                                                                                {/* Export Options */}
                                                                                <div className="border-t border-slate-100 mt-1 pt-1">
                                                                                    <button onClick={() => handleExport('print', file)} className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150">
                                                                                        <div className="p-1 bg-slate-50 rounded mr-2"><FiPrinter className="w-3 h-3 text-slate-600" /></div>
                                                                                        <div className="font-medium">Print</div>
                                                                                    </button>
                                                                                    <button onClick={() => handleExport('whatsapp', file)} className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150">
                                                                                        <div className="p-1 bg-green-50 rounded mr-2"><FiMessageSquare className="w-3 h-3 text-green-500" /></div>
                                                                                        <div className="font-medium">WhatsApp</div>
                                                                                    </button>
                                                                                    <button onClick={() => handleExport('email', file)} className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150">
                                                                                        <div className="p-1 bg-blue-50 rounded mr-2"><FiMail className="w-3 h-3 text-blue-500" /></div>
                                                                                        <div className="font-medium">Email</div>
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>

                                                            {/* View Button */}
                                                            <motion.button
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                onClick={() => {
                                                                    setSelectedFileToView(file);
                                                                    setShowViewModal(true);
                                                                    setActiveRowDropdown(null);
                                                                }}
                                                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                                                title="View Details">
                                                                <FiEye className="w-3.5 h-3.5" />
                                                            </motion.button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {fileData.length > itemsPerPage && !showAll && (
                                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                                    <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 gap-3">
                                        <div className="text-xs text-slate-600">
                                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, fileData.length)} of {fileData.length} entries
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                            >
                                                <FiChevronLeft className="w-3 h-3" />
                                                Previous
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNumber;
                                                    if (totalPages <= 5) {
                                                        pageNumber = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNumber = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNumber = totalPages - 4 + i;
                                                    } else {
                                                        pageNumber = currentPage - 2 + i;
                                                    }

                                                    return (
                                                        <button
                                                            key={pageNumber}
                                                            onClick={() => setCurrentPage(pageNumber)}
                                                            className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${currentPage === pageNumber
                                                                ? 'bg-blue-600 text-white'
                                                                : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                                                                }`}
                                                        >
                                                            {pageNumber}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                            >
                                                Next
                                                <FiChevronRightIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setShowAll(true)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors"
                                        >
                                            Show All
                                            <FiChevronDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Show Less Button when showing all */}
                            {showAll && fileData.length > itemsPerPage && (
                                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                                    <div className="flex justify-center px-4 py-3">
                                        <button
                                            onClick={() => {
                                                setShowAll(false);
                                                setCurrentPage(1);
                                            }}
                                            className="flex items-center gap-1 px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                                        >
                                            Show Less
                                            <FiChevronUp className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Footer Summary */}
                            <div className="border-t border-slate-200">
                                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white">
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                        <div className="text-xs text-slate-600">
                                            <span className="font-semibold text-slate-800">Summary:</span> Total {fileData.length} file index records •
                                            <span className="text-blue-600 font-medium ml-2">GST: {fileData.filter(f => f.gst).length}</span> •
                                            <span className="text-emerald-600 font-medium ml-2">Audit: {fileData.filter(f => f.audit).length}</span> •
                                            <span className="text-purple-600 font-medium ml-2">Income Tax: {fileData.filter(f => f.income_tax).length}</span>
                                        </div>
                                        <div className="text-xs text-slate-600">
                                            Data updated: {moment().format('DD/MM/YYYY HH:mm')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Create File Index Modal */}
            <AnimatePresence>
                {showCreateModal && (
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
                            className="bg-white rounded-xl p-6 max-w-2xl w-full mx-auto shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 sticky top-0 bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-lg">
                                        <FiPlus className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Create File Index</h3>
                                        <p className="text-slate-600 text-xs mt-1">Add new file index entry for a user</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setCreateForm({
                                            username: '',
                                            gst: '',
                                            audit: '',
                                            income_tax: '',
                                            other: ''
                                        });
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-150 text-slate-500 hover:text-slate-700"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit}>
                                <div className="space-y-5">
                                    {/* User Selection */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Select User <span className="text-rose-500">*</span>
                                        </label>
                                        <SearchableSelect
                                            endpoint="/client/search"
                                            searchParam="search"
                                            valueKey="username"
                                            labelMapping={{
                                                primary: 'name',
                                                secondary: (item) => `${item.user_type || ''} • ${item.mobile || ''} • ${item.email || ''}`
                                            }}
                                            onSelect={(item, value) => {
                                                handleCreateChange('username', value);
                                                handleCreateChange('selectedUser', item);
                                            }}
                                            placeholder="Search user by name, type or mobile..."
                                            dataExtractor={(response) => {
                                                // Your API returns { success: true, data: [...] }
                                                return response?.data || [];
                                            }}
                                        />

                                        {/* Show selected user info */}
                                        {createForm.selectedUser && (
                                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <FiUser className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-medium text-sm">
                                                                    {createForm.selectedUser.name}
                                                                </span>
                                                                <span className="text-gray-400">•</span>
                                                                <span className="text-sm text-gray-600">
                                                                    {createForm.selectedUser.mobile}
                                                                </span>
                                                                <span className="text-gray-400">•</span>
                                                                <span className="text-xs text-gray-500">
                                                                    {createForm.selectedUser.email}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                                    {createForm.selectedUser.user_type}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleCreateChange('username', '');
                                                            handleCreateChange('selectedUser', null);
                                                        }}
                                                        className="p-1 hover:bg-blue-100 rounded-full"
                                                    >
                                                        <FiX className="w-4 h-4 text-gray-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* GST */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                GST File Number
                                            </label>
                                            <input
                                                type="text"
                                                value={createForm.gst}
                                                onChange={(e) => handleCreateChange('gst', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                                placeholder="Enter GST file number"
                                            />
                                        </div>

                                        {/* Audit */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Audit File Number
                                            </label>
                                            <input
                                                type="text"
                                                value={createForm.audit}
                                                onChange={(e) => handleCreateChange('audit', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                                placeholder="Enter audit file number"
                                            />
                                        </div>

                                        {/* Income Tax */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Income Tax File
                                            </label>
                                            <input
                                                type="text"
                                                value={createForm.income_tax}
                                                onChange={(e) => handleCreateChange('income_tax', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                                placeholder="Enter income tax file number"
                                            />
                                        </div>

                                        {/* Other */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Other File
                                            </label>
                                            <input
                                                type="text"
                                                value={createForm.other}
                                                onChange={(e) => handleCreateChange('other', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                                placeholder="Enter other file number"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200 sticky bottom-0 bg-white">
                                    <motion.button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setCreateForm({
                                                username: '',
                                                gst: '',
                                                audit: '',
                                                income_tax: '',
                                                other: ''
                                            });
                                        }}
                                        className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        type="submit"
                                        onClick={handleCreateSubmit}
                                        className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg hover:shadow transition-all duration-200"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Create File Index
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit File Index Modal */}
            <AnimatePresence>
                {showEditModal && (
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
                            className="bg-white rounded-xl p-6 max-w-2xl w-full mx-auto shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 sticky top-0 bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                                        <FiEdit className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Update File Index</h3>
                                        <p className="text-slate-600 text-xs mt-1">Modify file index details</p>
                                        {selectedFile && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Index ID: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{selectedFile.indexid}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedFile(null);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-150 text-slate-500 hover:text-slate-700"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit}>
                                <div className="space-y-5">
                                    {/* User Info Display */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">User Information</label>
                                        <div className="px-4 py-3 border border-slate-300 rounded-lg bg-slate-50">
                                            {selectedFile ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <FiUser className="w-5 h-5 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 text-sm">{selectedFile.name}</div>
                                                        <div className="text-slate-600 text-xs">C/O: {selectedFile.guardianname || 'N/A'}</div>
                                                        <div className="text-slate-600 text-xs">Mobile: {selectedFile.mobile || 'N/A'}</div>
                                                        <div className="text-slate-600 text-xs">Type: {selectedFile.usertype || 'user'}</div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* File Fields - FIXED FIELD NAMES */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">GST File Number</label>
                                            <input
                                                type="text"
                                                value={editForm.gst || ''}
                                                onChange={(e) => handleEditChange('gst', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                                placeholder="Enter GST file number"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">Audit File Number</label>
                                            <input
                                                type="text"
                                                value={editForm.audit || ''}
                                                onChange={(e) => handleEditChange('audit', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                                placeholder="Enter audit file number"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">Income Tax File</label>
                                            <input
                                                type="text"
                                                value={editForm.income_tax || ''}
                                                onChange={(e) => handleEditChange('income_tax', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                                placeholder="Enter income tax file number"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">Other File</label>
                                            <input
                                                type="text"
                                                value={editForm.other || ''}
                                                onChange={(e) => handleEditChange('other', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                                placeholder="Enter other file number"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200 sticky bottom-0 bg-white">
                                    <motion.button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setSelectedFile(null);
                                        }}
                                        className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        type="submit"
                                        disabled={loading}
                                        className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {loading ? 'Updating...' : 'Update File Index'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Compact File Index details Modal */}
            <AnimatePresence>
                {showViewModal && selectedFileToView && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2"
                        onClick={() => {
                            setShowViewModal(false);
                            setSelectedFileToView(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-4xl max-h-[75vh] w-full shadow-2xl border border-slate-200 p-4 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Compact Header */}
                            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 rounded-t-2xl z-10">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <FiEye className="w-5 h-5 text-blue-600" />
                                        File Index Details
                                    </h3>
                                    <motion.button
                                        onClick={() => {
                                            setShowViewModal(false);
                                            setSelectedFileToView(null);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiX className="w-4 h-4" />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Ultra Compact Content */}
                            <div className="p-6 space-y-6">
                                {/* Compact Header Card */}
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FiFileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-slate-900 text-base truncate">{selectedFileToView.name}</div>
                                        <div className="text-xs text-slate-600 truncate">
                                            ID: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{selectedFileToView.indexid}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Username */}
                                <div>
                                    <span className="text-slate-500 block text-xs uppercase tracking-wide font-medium mb-1">Username</span>
                                    <div className="font-mono bg-slate-100 px-2 py-1.5 rounded-md text-xs text-slate-900 border border-slate-200 truncate min-h-[32px] flex items-center">
                                        {selectedFileToView.firmname || 'N/A'}
                                    </div>
                                </div>

                                {/* Compact Single Row */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4 mb-4 text-xs">
                                    {/* Created */}
                                    <div>
                                        <span className="text-slate-500 block text-xs uppercase tracking-wide font-medium mb-1">Created</span>
                                        <div className="font-medium text-slate-900 min-h-[32px] flex items-center">
                                            {selectedFileToView.createddate || 'N/A'}
                                        </div>
                                    </div>

                                    {/* Contact - Compact */}
                                    <div className="md:col-span-2">
                                        <span className="text-slate-500 block text-xs uppercase tracking-wide font-medium mb-1">Contact</span>
                                        <div className="space-y-0.5 text-xs min-h-[32px] leading-tight">
                                            <div className="truncate">{selectedFileToView.mobile || 'N/A'}</div>
                                            <div className="text-blue-600 font-medium truncate">{selectedFileToView.email || 'N/A'}</div>
                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs inline-block">
                                                {selectedFileToView.usertype || 'user'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Guardian */}
                                    <div>
                                        <span className="text-slate-500 block text-xs uppercase tracking-wide font-medium mb-1">Guardian</span>
                                        <div className="font-medium text-slate-900 min-h-[32px] flex items-center">
                                            {selectedFileToView.guardianname || 'N/A'}
                                        </div>
                                    </div>

                                    {/* Files Count */}
                                    <div>
                                        <span className="text-slate-500 block text-xs uppercase tracking-wide font-medium mb-1">Files</span>
                                        <div className="font-medium text-slate-900 min-h-[32px] flex items-center">
                                            {[
                                                selectedFileToView.gst && 'GST',
                                                selectedFileToView.audit && 'Audit',
                                                selectedFileToView.income_tax && 'ITR',
                                                selectedFileToView.other && 'Other'
                                            ].filter(Boolean).length}
                                        </div>
                                    </div>
                                </div>

                                {/* Compact File Cards */}
                                <div className="border-t border-slate-200 pt-4">
                                    <h4 className="font-semibold text-slate-900 mb-3 text-sm flex items-center gap-1">
                                        <FiFileText className="w-4 h-4" />
                                        File References
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                        {selectedFileToView.gst && (
                                            <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <div className="w-6 h-6 bg-blue-200 rounded-md flex items-center justify-center flex-shrink-0">
                                                        <FiCheck className="w-3 h-3 text-blue-600" />
                                                    </div>
                                                    <span className="font-medium text-blue-900 text-xs whitespace-nowrap">GST</span>
                                                </div>
                                                <div className="font-mono bg-white px-2 py-1 rounded-md text-xs text-blue-900 border border-blue-200 truncate">
                                                    {selectedFileToView.gst}
                                                </div>
                                            </div>
                                        )}

                                        {selectedFileToView.audit && (
                                            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <div className="w-6 h-6 bg-emerald-200 rounded-md flex items-center justify-center flex-shrink-0">
                                                        <FiCheck className="w-3 h-3 text-emerald-600" />
                                                    </div>
                                                    <span className="font-medium text-emerald-900 text-xs whitespace-nowrap">Audit</span>
                                                </div>
                                                <div className="font-mono bg-white px-2 py-1 rounded-md text-xs text-emerald-900 border border-emerald-200 truncate">
                                                    {selectedFileToView.audit}
                                                </div>
                                            </div>
                                        )}

                                        {selectedFileToView.income_tax && (
                                            <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <div className="w-6 h-6 bg-purple-200 rounded-md flex items-center justify-center flex-shrink-0">
                                                        <FiDollarSign className="w-3 h-3 text-purple-600" />
                                                    </div>
                                                    <span className="font-medium text-purple-900 text-xs whitespace-nowrap">Income Tax</span>
                                                </div>
                                                <div className="font-mono bg-white px-2 py-1 rounded-md text-xs text-purple-900 border border-purple-200 truncate">
                                                    {selectedFileToView.income_tax}
                                                </div>
                                            </div>
                                        )}

                                        {selectedFileToView.other && (
                                            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <div className="w-6 h-6 bg-amber-200 rounded-md flex items-center justify-center flex-shrink-0">
                                                        <FiFileText className="w-3 h-3 text-amber-600" />
                                                    </div>
                                                    <span className="font-medium text-amber-900 text-xs whitespace-nowrap">Other</span>
                                                </div>
                                                <div className="font-mono bg-white px-2 py-1 rounded-md text-xs text-amber-900 border border-amber-200 truncate">
                                                    {selectedFileToView.other}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
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

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && fileToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FiTrash2 className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Delete File Index</h3>
                                        <p className="text-sm text-slate-600">File Index ID: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{fileToDelete.index_id}</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <p className="text-slate-700 mb-6 text-sm leading-relaxed">
                                    Are you sure you want to delete <strong className="font-semibold text-slate-900">{fileToDelete.name}</strong>?
                                </p>
                                <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 mb-6">
                                    This action cannot be undone. All file references will be permanently deleted.
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex gap-3 justify-end">
                                <motion.button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    onClick={async () => {
                                        setShowDeleteConfirm(false);
                                        await handleDeleteFile(fileToDelete);
                                    }}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Delete Permanently
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default ViewFileIndex;