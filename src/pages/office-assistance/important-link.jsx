import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FiPlus,
    FiEdit,
    FiTrash,
    FiCopy,
    FiExternalLink,
    FiEye,
    FiEyeOff,
    FiKey,
    FiLink,
    FiX,
    FiMenu,
    FiSearch
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import Pagination from '../../components/paging-nation-component';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import axios from 'axios';

const ImportantLinks = () => {
    // Header/Sidebar states
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    // Main states
    const [loading, setLoading] = useState(false);
    const [links, setLinks] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedLink, setSelectedLink] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({ from: null, to: null });
    const [showPassword, setShowPassword] = useState({});
    const [apiError, setApiError] = useState(null);
    const [apiSuccess, setApiSuccess] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pagination states
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 7,
        total: 0,
        total_pages: 1,
        is_last_page: true
    });

    // Form states
    const initialCreateForm = useMemo(() => ({
        name: '',
        username: '',
        password: '',
        url: '',
        remark: ''
    }), []);

    const initialEditForm = useMemo(() => ({
        link_id: '',
        name: '',
        username: '',
        password: '',
        url: '',
        remark: ''
    }), []);

    const [createForm, setCreateForm] = useState(initialCreateForm);
    const [editForm, setEditForm] = useState(initialEditForm);

    // ========== FUNCTION DEFINITIONS ==========

    const formatDate = useCallback((dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    }, []);

    const formatDateTime = useCallback((dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }, []);

    const extractDomain = useCallback((url) => {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (e) {
            try {
                const urlObj = new URL('https://' + url);
                return urlObj.hostname;
            } catch (e) {
                return url;
            }
        }
    }, []);

    const truncateText = useCallback((text, maxLength = 50) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }, []);

    const togglePasswordVisibility = useCallback((linkId) => {
        setShowPassword(prev => ({
            ...prev,
            [linkId]: !prev[linkId]
        }));
    }, []);

    const toggleDropdown = useCallback((linkId) => {
        setActiveDropdown(prev => prev === linkId ? null : linkId);
    }, []);

    const resetCreateModal = useCallback(() => {
        setShowCreateModal(false);
        setCreateForm(initialCreateForm);
        // Re-enable body scroll
        document.body.style.overflow = 'auto';
    }, [initialCreateForm]);

    const resetEditModal = useCallback(() => {
        setShowEditModal(false);
        setSelectedLink(null);
        setEditForm(initialEditForm);
        // Re-enable body scroll
        document.body.style.overflow = 'auto';
    }, [initialEditForm]);

    const resetViewModal = useCallback(() => {
        setShowViewModal(false);
        setSelectedLink(null);
        // Re-enable body scroll
        document.body.style.overflow = 'auto';
    }, []);

    const resetDeleteModal = useCallback(() => {
        setShowDeleteModal(false);
        setSelectedLink(null);
        // Re-enable body scroll
        document.body.style.overflow = 'auto';
    }, []);

    const handleCopy = useCallback((text, type) => {
        navigator.clipboard.writeText(text).then(() => {
            setApiSuccess(`${type} copied to clipboard!`);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            setApiError(`Failed to copy ${type}`);
        });
    }, []);

    const handleEditClick = useCallback((link) => {
        setSelectedLink(link);
        setEditForm({
            link_id: link.link_id,
            name: link.name,
            username: link.username || '',
            password: '',
            url: link.url,
            remark: link.remark || ''
        });
        setShowEditModal(true);
        setActiveDropdown(null);
        // Disable body scroll
        document.body.style.overflow = 'hidden';
    }, []);

    const handleViewClick = useCallback((link) => {
        setSelectedLink(link);
        setShowViewModal(true);
        setActiveDropdown(null);
        // Disable body scroll
        document.body.style.overflow = 'hidden';
    }, []);

    const handleDeleteClick = useCallback((link) => {
        setSelectedLink(link);
        setShowDeleteModal(true);
        setActiveDropdown(null);
        // Disable body scroll
        document.body.style.overflow = 'hidden';
    }, []);

    const fetchLinksData = useCallback(async (page = 1, limit = 7, search = '') => {
        setLoading(true);
        setApiError(null);

        try {
            const headers = getHeaders();
            const params = { 
                page, 
                limit
            };
            
            if (search) {
                params.search = search;
            }

            if (dateFilter.from) {
                params.from_date = dateFilter.from.toISOString().split('T')[0];
            }
            if (dateFilter.to) {
                params.to_date = dateFilter.to.toISOString().split('T')[0];
            }

            const response = await axios.get(`${API_BASE_URL}/assistance/important-link/list`, {
                headers,
                params
            });

            if (response.data.success) {
                setLinks(response.data.data);
                setPagination(response.data.meta);
            } else {
                setApiError(response.data.message || 'Failed to fetch links');
            }
        } catch (error) {
            console.error('Error fetching links:', error);
            setApiError(error.response?.data?.message || 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [dateFilter]);

    // Debounced search
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchLinksData(1, pagination.limit, searchTerm);
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, pagination.limit, fetchLinksData]);

    const handleCreateChange = useCallback((field, value) => {
        setCreateForm(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const handleEditChange = useCallback((field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const handleDateFilterChange = useCallback((type, date) => {
        setDateFilter(prev => ({
            ...prev,
            [type]: date
        }));
    }, []);

    const applyDateFilters = useCallback(() => {
        fetchLinksData(1, pagination.limit, searchTerm);
    }, [fetchLinksData, pagination.limit, searchTerm]);

    const clearDateFilters = useCallback(() => {
        setDateFilter({ from: null, to: null });
        fetchLinksData(1, pagination.limit, searchTerm);
    }, [fetchLinksData, pagination.limit, searchTerm]);

    const handleCreateSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setApiError(null);
        setApiSuccess(null);

        try {
            const headers = getHeaders();
            const response = await axios.post(
                `${API_BASE_URL}/assistance/important-link/create`,
                {
                    name: createForm.name,
                    url: createForm.url,
                    username: createForm.username,
                    password: createForm.password,
                    remark: createForm.remark
                },
                { headers }
            );

            if (response.data.success) {
                setApiSuccess('Link created successfully!');
                await fetchLinksData(1, pagination.limit, searchTerm);
                resetCreateModal();
            } else {
                setApiError(response.data.message || 'Failed to create link');
            }
        } catch (error) {
            console.error('Error creating link:', error);
            setApiError(error.response?.data?.message || 'Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [createForm, fetchLinksData, pagination.limit, searchTerm, resetCreateModal]);

    const handleEditSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setApiError(null);
        setApiSuccess(null);

        try {
            const headers = getHeaders();

            const editData = {
                link_id: editForm.link_id,
                name: editForm.name,
                url: editForm.url,
                username: editForm.username,
                remark: editForm.remark
            };

            if (editForm.password && editForm.password.trim() !== '') {
                editData.password = editForm.password;
            }

            const response = await axios.put(
                `${API_BASE_URL}/assistance/important-link/edit`,
                editData,
                { headers }
            );

            if (response.data.success) {
                setApiSuccess('Link updated successfully!');
                await fetchLinksData(pagination.page, pagination.limit, searchTerm);
                resetEditModal();
            } else {
                setApiError(response.data.message || 'Failed to update link');
            }
        } catch (error) {
            console.error('Error updating link:', error);
            setApiError(error.response?.data?.message || 'Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [editForm, fetchLinksData, pagination.page, pagination.limit, searchTerm, resetEditModal]);

    const handleDeleteLink = useCallback(async () => {
        if (!selectedLink) return;

        setIsSubmitting(true);
        setApiError(null);
        setApiSuccess(null);

        try {
            const headers = getHeaders();
            const response = await axios.delete(
                `${API_BASE_URL}/assistance/important-link/delete`,
                {
                    headers,
                    data: { link_id: selectedLink.link_id }
                }
            );

            if (response.data.success) {
                setApiSuccess('Link deleted successfully!');
                await fetchLinksData(pagination.page, pagination.limit, searchTerm);
                resetDeleteModal();
            } else {
                setApiError(response.data.message || 'Failed to delete link');
            }
        } catch (error) {
            console.error('Error deleting link:', error);
            setApiError(error.response?.data?.message || 'Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedLink, fetchLinksData, pagination.page, pagination.limit, searchTerm, resetDeleteModal]);

    const handlePageChange = useCallback((newPage) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            fetchLinksData(newPage, pagination.limit, searchTerm);
        }
    }, [pagination.total_pages, pagination.limit, searchTerm, fetchLinksData]);

    const handleLimitChange = useCallback((newLimit) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
        fetchLinksData(1, newLimit, searchTerm);
    }, [searchTerm, fetchLinksData]);

    const handleCustomPageChange = useCallback((pageNum) => {
        if (pageNum >= 1 && pageNum <= pagination.total_pages) {
            fetchLinksData(pageNum, pagination.limit, searchTerm);
        }
    }, [pagination.limit, pagination.total_pages, searchTerm, fetchLinksData]);

    // ========== EFFECTS ==========

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Clean up body scroll on unmount
    useEffect(() => {
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    useEffect(() => {
        fetchLinksData(1, 7);
    }, []);

    useEffect(() => {
        if (apiError || apiSuccess) {
            const timer = setTimeout(() => {
                setApiError(null);
                setApiSuccess(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [apiError, apiSuccess]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // ========== COMPONENTS ==========

    const SkeletonLoader = useCallback(() => (
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
                    <div className="mb-6 animate-pulse">
                        <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-48 mb-2"></div>
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-64"></div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
                        </div>
                        <div className="w-48">
                            <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse overflow-hidden">
                        <div className="border-b border-gray-200">
                            <div className="h-14 bg-gradient-to-r from-gray-100 to-gray-200"></div>
                        </div>
                        <div className="p-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg mb-3"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ), [mobileMenuOpen, isMinimized]);

    const ModalWrapper = useCallback(({ isOpen, onClose, title, children, size = 'max-w-2xl' }) => {
        if (!isOpen) return null;

        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 overflow-y-auto"
                    style={{ overscrollBehavior: 'contain' }}
                >
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm"
                            onClick={onClose}
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25 }}
                            className={`relative w-full ${size} bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden`}
                        >
                            <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <FiLink className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">{title}</h2>
                                        <p className="text-indigo-200 text-sm opacity-90">Manage your important links</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                            {children}
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }, []);

    // Delete Confirmation Modal
    const DeleteConfirmationModal = useCallback(() => {
        if (!showDeleteModal || !selectedLink) return null;

        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 overflow-y-auto"
                    style={{ overscrollBehavior: 'contain' }}
                >
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm"
                            onClick={resetDeleteModal}
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25 }}
                            className="relative w-full max-w-md bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-red-100 rounded-full">
                                        <FiTrash className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Delete Link</h3>
                                        <p className="text-sm text-gray-500">Are you sure you want to delete this link?</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                    <p className="font-medium text-gray-800">{selectedLink.name}</p>
                                    <p className="text-sm text-gray-600 mt-1 truncate">{selectedLink.url}</p>
                                </div>

                                <p className="text-sm text-gray-600 mb-6">
                                    This action cannot be undone. This will permanently delete the link and all associated data.
                                </p>

                                <div className="flex justify-end gap-3">
                                    <motion.button
                                        type="button"
                                        onClick={resetDeleteModal}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors duration-200"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        onClick={handleDeleteLink}
                                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium shadow-sm disabled:opacity-50"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Deleting...' : 'Delete Link'}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }, [showDeleteModal, selectedLink, isSubmitting, handleDeleteLink, resetDeleteModal]);

    if (loading && links.length === 0) {
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    {/* Alert Messages */}
                    <AnimatePresence>
                        {apiError && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {apiError}
                            </motion.div>
                        )}
                        {apiSuccess && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {apiSuccess}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    Important Links
                                </h1>
                                <p className="text-gray-600 mt-2">
                                    Secure management of all your important links and credentials
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Search and Add New Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm"
                    >
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search by name, username, password, remark, or URL..."
                                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all duration-300"
                                    />
                                    <FiSearch className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                            <motion.button
                                onClick={() => {
                                    setShowCreateModal(true);
                                    document.body.style.overflow = 'hidden';
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 whitespace-nowrap"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={isSubmitting}
                            >
                                <FiPlus className="w-4 h-4" />
                                Add New Link
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Main Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
                    >
                        {/* Table Header */}
                        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                            <div className="grid grid-cols-12 gap-4 p-4 text-sm font-semibold text-gray-700">
                                <div className="col-span-1 flex items-center justify-center">#</div>
                                <div className="col-span-4">Link Details</div>
                                <div className="col-span-3">Credentials</div>
                                <div className="col-span-2">Remarks</div>
                                <div className="col-span-1 flex items-center justify-center">View</div>
                                <div className="col-span-1 flex items-center justify-center">Actions</div>
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="p-4 animate-pulse">
                                        <div className="h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg"></div>
                                    </div>
                                ))
                            ) : links.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full mb-4">
                                        <FiLink className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-700 mb-2">No links found</h3>
                                    <p className="text-gray-500 mb-6">
                                        Get started by adding your first important link
                                    </p>
                                    <motion.button
                                        onClick={() => {
                                            setShowCreateModal(true);
                                            document.body.style.overflow = 'hidden';
                                        }}
                                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiPlus className="w-4 h-4 inline mr-2" />
                                        Add New Link
                                    </motion.button>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {links.map((link, index) => (
                                        <motion.div
                                            key={link.link_id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="p-4 hover:bg-gray-50 transition-colors duration-200"
                                        >
                                            <div className="grid grid-cols-12 gap-4 items-center">
                                                {/* Index */}
                                                <div className="col-span-1 flex items-center justify-center">
                                                    <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-semibold rounded-lg">
                                                        {((pagination.page - 1) * pagination.limit) + index + 1}
                                                    </div>
                                                </div>

                                                {/* Link Details */}
                                                <div className="col-span-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="font-semibold text-gray-800">{truncateText(link.name, 30)}</h4>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <p className="text-gray-500 text-sm truncate">
                                                                    {extractDomain(link.url)}
                                                                </p>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleCopy(link.url, 'URL')}
                                                                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                        title="Copy URL"
                                                                    >
                                                                        <FiCopy className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => window.open(link.url, '_blank')}
                                                                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                        title="Open in new tab"
                                                                    >
                                                                        <FiExternalLink className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Credentials */}
                                                <div className="col-span-3">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">
                                                                {truncateText(link.username || 'No username', 20)}
                                                            </span>
                                                            {link.username && (
                                                                <button
                                                                    onClick={() => handleCopy(link.username, 'Username')}
                                                                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                                    title="Copy Username"
                                                                >
                                                                    <FiCopy className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-sm font-medium text-gray-700">
                                                                    {showPassword[link.link_id]
                                                                        ? truncateText(link.password || 'No password', 20)
                                                                        : '••••••••'
                                                                    }
                                                                </span>
                                                                {link.username && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => togglePasswordVisibility(link.link_id)}
                                                                            className="text-gray-400 hover:text-gray-600"
                                                                            title={showPassword[link.link_id] ? "Hide Password" : "Show Password"}
                                                                        >
                                                                            {showPassword[link.link_id] ? (
                                                                                <FiEyeOff className="w-3 h-3" />
                                                                            ) : (
                                                                                <FiEye className="w-3 h-3" />
                                                                            )}
                                                                        </button>
                                                                        {link.password && (
                                                                            <button
                                                                                onClick={() => handleCopy(link.password, 'Password')}
                                                                                className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                                                title="Copy Password"
                                                                            >
                                                                                <FiCopy className="w-3 h-3" />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Remarks */}
                                                <div className="col-span-2">
                                                    <p className="text-gray-600 text-sm line-clamp-2" title={link.remark}>
                                                        {truncateText(link.remark || 'No remarks', 50)}
                                                    </p>
                                                </div>

                                                {/* View Button */}
                                                <div className="col-span-1 flex items-center justify-center">
                                                    <motion.button
                                                        onClick={() => handleViewClick(link)}
                                                        className="p-2 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors duration-200"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        title="View Details"
                                                    >
                                                        <FiEye className="w-4 h-4" />
                                                    </motion.button>
                                                </div>

                                                {/* Actions */}
                                                <div className="col-span-1">
                                                    <div className="dropdown-container relative flex justify-center">
                                                        <motion.button
                                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                                                            onClick={() => toggleDropdown(link.link_id)}
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            disabled={isSubmitting}
                                                        >
                                                            <FiMenu className="w-4 h-4" />
                                                        </motion.button>
                                                        
                                                        {activeDropdown === link.link_id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                                                            >
                                                                <div className="py-1">
                                                                    <button
                                                                        onClick={() => handleEditClick(link)}
                                                                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors duration-200"
                                                                    >
                                                                        <FiEdit className="w-4 h-4 mr-3 text-indigo-600" />
                                                                        Edit Link
                                                                    </button>
                                                                    <button
                                                                        onClick={() => window.open(link.url, '_blank')}
                                                                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors duration-200"
                                                                    >
                                                                        <FiExternalLink className="w-4 h-4 mr-3 text-blue-600" />
                                                                        Visit Link
                                                                    </button>
                                                                    <div className="border-t border-gray-100">
                                                                        <button
                                                                            onClick={() => handleDeleteClick(link)}
                                                                            className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                                                                        >
                                                                            <FiTrash className="w-4 h-4 mr-3" />
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>

                        {/* Footer with Pagination */}
                        {links.length > 0 && (
                            <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                                <Pagination
                                    pagination={pagination}
                                    onPageChange={handlePageChange}
                                    onLimitChange={handleLimitChange}
                                    onCustomPageChange={handleCustomPageChange}
                                    loading={isSubmitting}
                                    showPageInfo={true}
                                    showLimitSelector={true}
                                    showCustomInput={true}
                                    className=""
                                />
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Create Modal */}
            <ModalWrapper
                isOpen={showCreateModal}
                onClose={resetCreateModal}
                title="Create New Link"
                size="max-w-2xl"
            >
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleCreateSubmit} id="create-form">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Link Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) => handleCreateChange('name', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                                        placeholder="e.g., GST Portal"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.username}
                                        onChange={(e) => handleCreateChange('username', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                                        placeholder="Enter username"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={createForm.password}
                                            onChange={(e) => handleCreateChange('password', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                                            placeholder="Enter password"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Link URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="url"
                                    value={createForm.url}
                                    onChange={(e) => handleCreateChange('url', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                                    placeholder="https://example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Remarks
                                </label>
                                <textarea
                                    value={createForm.remark}
                                    onChange={(e) => handleCreateChange('remark', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                                    placeholder="Add any notes or description..."
                                    rows="3"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-6">
                    <div className="flex justify-end gap-3">
                        <motion.button
                            type="button"
                            onClick={resetCreateModal}
                            className="px-5 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors duration-200"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </motion.button>
                        <motion.button
                            type="submit"
                            form="create-form"
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity text-sm font-medium shadow-sm disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Link'}
                        </motion.button>
                    </div>
                </div>
            </ModalWrapper>

            {/* Edit Modal */}
            <ModalWrapper
                isOpen={showEditModal}
                onClose={resetEditModal}
                title="Edit Link"
                size="max-w-2xl"
            >
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleEditSubmit} id="edit-form">
                        <input type="hidden" name="link_id" value={editForm.link_id} />
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Link Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => handleEditChange('name', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                                        placeholder="Enter link name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.username}
                                        onChange={(e) => handleEditChange('username', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                                        placeholder="Enter username"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={editForm.password}
                                            onChange={(e) => handleEditChange('password', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                                            placeholder="Enter new password (leave blank to keep current)"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Link URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="url"
                                    value={editForm.url}
                                    onChange={(e) => handleEditChange('url', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                                    placeholder="https://example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Remarks
                                </label>
                                <textarea
                                    value={editForm.remark}
                                    onChange={(e) => handleEditChange('remark', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                                    placeholder="Enter remark"
                                    rows="3"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-6">
                    <div className="flex justify-end gap-3">
                        <motion.button
                            type="button"
                            onClick={resetEditModal}
                            className="px-5 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors duration-200"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </motion.button>
                        <motion.button
                            type="submit"
                            form="edit-form"
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity text-sm font-medium shadow-sm disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Updating...' : 'Update Link'}
                        </motion.button>
                    </div>
                </div>
            </ModalWrapper>

            {/* View Modal */}
            <ModalWrapper
                isOpen={showViewModal}
                onClose={resetViewModal}
                title="Link Details"
                size="max-w-2xl"
            >
                {selectedLink && (
                    <>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                {/* Link Info */}
                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
                                            <FiLink className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-800">Link Information</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500">Name</label>
                                            <p className="text-sm font-medium text-gray-800 mt-1">{selectedLink.name}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs text-gray-500">URL</label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleCopy(selectedLink.url, 'URL')}
                                                    className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1"
                                                >
                                                    <FiCopy className="w-3 h-3" />
                                                    Copy URL
                                                </button>
                                                <button
                                                    onClick={() => window.open(selectedLink.url, '_blank')}
                                                    className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1"
                                                >
                                                    <FiExternalLink className="w-3 h-3" />
                                                    Open
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <a 
                                                href={selectedLink.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm text-indigo-600 hover:text-indigo-800 break-all flex items-center gap-1"
                                            >
                                                {selectedLink.url}
                                                <FiExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Credentials */}
                                {(selectedLink.username || selectedLink.password) && (
                                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg">
                                                <FiKey className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800">Credentials</h3>
                                        </div>

                                        {selectedLink.username && (
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs text-gray-500">Username</label>
                                                    <button
                                                        onClick={() => handleCopy(selectedLink.username, 'Username')}
                                                        className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1"
                                                    >
                                                        <FiCopy className="w-3 h-3" />
                                                        Copy Username
                                                    </button>
                                                </div>
                                                <p className="text-sm font-medium text-gray-800 mt-1">{selectedLink.username}</p>
                                            </div>
                                        )}

                                        {selectedLink.password && (
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs text-gray-500">Password</label>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => togglePasswordVisibility(selectedLink.link_id)}
                                                            className="text-gray-500 hover:text-gray-700 text-xs flex items-center gap-1"
                                                        >
                                                            {showPassword[selectedLink.link_id] ? (
                                                                <>
                                                                    <FiEyeOff className="w-3 h-3" />
                                                                    Hide
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FiEye className="w-3 h-3" />
                                                                    Show
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleCopy(selectedLink.password, 'Password')}
                                                            className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1"
                                                        >
                                                            <FiCopy className="w-3 h-3" />
                                                            Copy Password
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-medium text-gray-800 mt-1">
                                                    {showPassword[selectedLink.link_id] 
                                                        ? selectedLink.password 
                                                        : '••••••••'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Remarks */}
                                {selectedLink.remark && (
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <label className="text-xs text-gray-500">Remarks</label>
                                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{selectedLink.remark}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-6">
                            <div className="flex justify-end gap-3">
                                <motion.button
                                    type="button"
                                    onClick={() => {
                                        resetViewModal();
                                        handleEditClick(selectedLink);
                                    }}
                                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity text-sm font-medium shadow-sm"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiEdit className="w-4 h-4 inline mr-2" />
                                    Edit Link
                                </motion.button>
                                <motion.button
                                    type="button"
                                    onClick={resetViewModal}
                                    className="px-5 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors duration-200"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Close
                                </motion.button>
                            </div>
                        </div>
                    </>
                )}
            </ModalWrapper>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal />
        </div>
    );
};

export default ImportantLinks;