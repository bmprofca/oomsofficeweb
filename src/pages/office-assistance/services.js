import React, { useState, useEffect } from 'react';
import {
    FiPlus,
    FiEdit,
    FiSettings,
    FiMoreVertical,
    FiSearch,
    FiDollarSign,
    FiPercent,
    FiCheckCircle,
    FiXCircle,
    FiX,
    FiTag,
    FiEye,
    FiCalendar,
    FiUser,
    FiMail,
    FiPhone,
    FiCopy
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import getHeaders from '../../utils/get-headers';

// Scrollbar class for all modals (stable reference, no re-render issues)
const MODAL_SCROLLBAR_CLASS = "flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth [scrollbar-width:thin] [scrollbar-color:#d1d5db_#f3f4f6] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100/80 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 [&::-webkit-scrollbar-thumb]:min-h-[40px]";

// Switch: module-level so modal doesn't remount on form state change
const Switch = ({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between gap-4 py-2">
        <div className="min-w-0">
            {label && <p className="text-sm font-medium text-gray-900">{label}</p>}
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-7 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
            <span
                className={`pointer-events-none absolute top-1/2 left-0.5 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
        </button>
    </div>
);

// Form modal shell: module-level to avoid remount when parent state changes
const FormModalShell = ({ title, subtitle, onClose, children, icon }) => (
    <div className="fixed inset-0 z-[120]">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
        <div className="relative min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative overflow-hidden rounded-t-3xl border-b border-gray-100 shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600" />
                    <div className="absolute -top-16 -right-20 w-64 h-64 rounded-full bg-white/10" />
                    <div className="relative px-6 py-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                                {icon}
                            </div>
                            <div className="min-w-0">
                                <h5 className="text-xl font-bold text-white truncate">{title}</h5>
                                {subtitle ? <p className="text-white/80 text-sm mt-0.5">{subtitle}</p> : null}
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-colors" aria-label="Close">
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className={`${MODAL_SCROLLBAR_CLASS} p-6 bg-gradient-to-b from-white to-gray-50/80`}>
                    {children}
                </div>
            </motion.div>
        </div>
    </div>
);

const Services = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('services');
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filteredServices, setFilteredServices] = useState([]);
    const [filteredCategories, setFilteredCategories] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCategoryCreateModal, setShowCategoryCreateModal] = useState(false);
    const [showCategoryEditModal, setShowCategoryEditModal] = useState(false);
    const [showServiceDetailsModal, setShowServiceDetailsModal] = useState(false);
    const [showCategoryDetailsModal, setShowCategoryDetailsModal] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [categoryActiveDropdown, setCategoryActiveDropdown] = useState(null);
    const [actionMenuPosition, setActionMenuPosition] = useState('below');
    const [searchTerm, setSearchTerm] = useState('');
    const [categorySearchTerm, setCategorySearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState(''); // service list filter by category ('' = All)
    const [apiError, setApiError] = useState('');

    // Form states
    const [createForm, setCreateForm] = useState({
        name: '',
        category_id: '',
        sac_code: '',
        fees: '',
        gst_rate: '',
        gst: '0'
    });

    const [editForm, setEditForm] = useState({
        service_id: '',
        name: '',
        category_id: '',
        sac_code: '',
        fees: '',
        gst_rate: '',
        gst: '0',
        status: '1'
    });

    const [categoryCreateForm, setCategoryCreateForm] = useState({
        name: ''
    });

    const [categoryEditForm, setCategoryEditForm] = useState({
        category_id: '',
        name: ''
    });

    const API_BASE_URL = 'https://api.ooms.in/api/v1';

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

    // Fetch services only when Services tab is active
    useEffect(() => {
        if (activeTab === 'services') {
            fetchServicesData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Fetch categories when Services or Categories tab is active (Services tab needs categories for filter dropdown)
    useEffect(() => {
        if (activeTab === 'categories' || activeTab === 'services') {
            fetchCategoriesData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Filter services when search term, category filter, or services list changes
    useEffect(() => {
        filterServices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, categoryFilter, services]);

    // Filter categories when search term or categories list changes
    useEffect(() => {
        filterCategories();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categorySearchTerm, categories]);

    // Fetch services from API
    const fetchServicesData = async () => {
        setLoading(true);
        setApiError('');
        try {
            const response = await fetch(`${API_BASE_URL}/service/list`, {
                method: 'GET',
                headers: getHeaders(),
                mode: 'cors',
                credentials: 'omit'
            });

            if (response.status === 401) {
                setApiError('Authentication failed. Please check your login credentials and try again.');
                return;
            }

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setServices(data.data);
                setFilteredServices(data.data);
            } else {
                setApiError(data.message || 'Failed to fetch services');
            }
        } catch (error) {
            setApiError(error.message || 'Failed to fetch services');
        } finally {
            setLoading(false);
        }
    };

    // Fetch categories from API
    const fetchCategoriesData = async () => {
        setLoading(true);
        setApiError('');
        try {
            const url = `${API_BASE_URL}/service/category/list`;
            const response = await fetch(url, {
                method: 'GET',
                headers: getHeaders(),
                mode: 'cors',
                credentials: 'omit'
            });

            if (response.status === 401) {
                setApiError('Authentication failed. Please check your login credentials and try again.');
                throw new Error('Unauthorized - Invalid or expired token');
            }

            if (response.status === 0) {
                setApiError('Cannot connect to API server due to CORS restrictions. Please contact the administrator.');
                throw new Error('CORS policy blocked the request');
            }

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                const list = Array.isArray(data.data) ? data.data : [];
                setCategories(list);
                setFilteredCategories(list);
            } else {
                setApiError(data.message || 'Failed to fetch categories');
            }
        } catch (error) {
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                setApiError('CORS Error: Cannot connect to API server. This is a server configuration issue.');
            } else {
                setApiError(error.message || 'Failed to connect to server');
            }
        } finally {
            setLoading(false);
        }
    };

    // Filter services based on search term and category (client-side)
    const filterServices = () => {
        let list = services;
        if (categoryFilter) {
            list = list.filter(service => (service.category_name || '') === categoryFilter);
        }
        if (!searchTerm) {
            setFilteredServices(list);
            return;
        }
        const term = searchTerm.toLowerCase();
        const filtered = list.filter(service =>
            (service.name && service.name.toLowerCase().includes(term)) ||
            (service.sac_code && String(service.sac_code).toLowerCase().includes(term))
        );
        setFilteredServices(filtered);
    };

    // Filter categories based on search term
    const filterCategories = () => {
        if (!categorySearchTerm) {
            setFilteredCategories(categories);
            return;
        }

        const filtered = categories.filter(category =>
            (category.name || '').toLowerCase().includes(categorySearchTerm.toLowerCase())
        );
        setFilteredCategories(filtered);
    };

    // Handle create form submit (calls API when available)
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setApiError('');
        const payload = {
            name: createForm.name,
            category_id: createForm.category_id || undefined,
            sac_code: createForm.sac_code,
            fees: parseFloat(createForm.fees),
            gst_rate: parseFloat(createForm.gst_rate),
            gst_value: parseFloat(createForm.gst) || 0
        };
        try {
            const response = await fetch(`${API_BASE_URL}/service/create`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (response.ok && data.success) {
                fetchServicesData();
                setShowCreateModal(false);
                setCreateForm({ name: '', category_id: '', sac_code: '', fees: '', gst_rate: '', gst: '0' });
                return;
            }
            setApiError(data.message || 'Failed to create service');
        } catch (err) {
            setApiError(err.message || 'Failed to create service');
        }
    };

    // Handle edit form submit (calls API)
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setApiError('');
        const payload = {
            service_id: editForm.service_id,
            name: editForm.name,
            category_id: editForm.category_id || undefined,
            sac_code: editForm.sac_code,
            fees: parseFloat(editForm.fees),
            gst_rate: parseFloat(editForm.gst_rate),
            gst_value: parseFloat(editForm.gst) || 0,
            status: editForm.status === '1'
        };
        try {
            const response = await fetch(`${API_BASE_URL}/service/edit`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (response.ok && data.success) {
                fetchServicesData();
                setShowEditModal(false);
                return;
            }
            setApiError(data.message || 'Failed to update service');
        } catch (err) {
            setApiError(err.message || 'Failed to update service');
        }
    };

    // Handle category create form submit
    const handleCategoryCreateSubmit = async (e) => {
        e.preventDefault();
        setApiError('');

        try {
            const response = await fetch(`${API_BASE_URL}/service/category/create`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    name: categoryCreateForm.name
                })
            });

            if (response.status === 401) {
                setApiError('Authentication failed. Please check your login credentials.');
                throw new Error('Unauthorized');
            }

            const data = await response.json();

            if (data.success) {
                fetchCategoriesData();
                setShowCategoryCreateModal(false);
                setCategoryCreateForm({ name: '' });
            } else {
                setApiError(data.message || 'Failed to create category');
            }
        } catch (error) {
            setApiError(error.message || 'Failed to create category');
        }
    };

    // Handle category edit form submit
    const handleCategoryEditSubmit = async (e) => {
        e.preventDefault();
        setApiError('');

        try {
            const response = await fetch(`${API_BASE_URL}/service/category/edit`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    name: categoryEditForm.name,
                    category_id: categoryEditForm.category_id
                })
            });

            if (response.status === 401) {
                setApiError('Authentication failed. Please check your login credentials.');
                throw new Error('Unauthorized');
            }

            const data = await response.json();

            if (data.success) {
                fetchCategoriesData();
                setShowCategoryEditModal(false);
            } else {
                setApiError(data.message || 'Failed to update category');
            }
        } catch (error) {
            setApiError(error.message || 'Failed to update category');
        }
    };

    // Handle edit button click (API returns status as boolean; form uses '1'/'0')
    const handleEditClick = (service) => {
        setSelectedService(service);
        const isActive = service.status === true || service.status === 1 || service.status === '1';
        const categoryId = service.category_id ?? (service.category_name && categories.find(c => c.name === service.category_name)?.category_id) ?? '';
        setEditForm({
            service_id: service.service_id,
            name: service.name,
            category_id: String(categoryId ?? ''),
            sac_code: service.sac_code,
            fees: String(service.fees ?? ''),
            gst_rate: String(service.gst_rate ?? ''),
            gst: String(service.gst_value ?? service.gst ?? ''),
            status: isActive ? '1' : '0'
        });
        setShowEditModal(true);
        setActiveDropdown(null);
    };

    // Handle category edit button click
    const handleCategoryEditClick = (category) => {
        setSelectedCategory(category);
        setCategoryEditForm({
            category_id: category.category_id,
            name: category.name
        });
        setShowCategoryEditModal(true);
        setCategoryActiveDropdown(null);
    };

    // Calculate GST
    const calculateGST = (fees, gstRate) => {
        if (!fees || !gstRate) return '0';
        const gst = parseFloat(fees) * (parseFloat(gstRate) / 100);
        if (Number.isNaN(gst)) return '0';
        return gst.toFixed(2);
    };

    // Handle form changes with GST calculation
    const handleCreateChange = (field, value) => {
        const newForm = { ...createForm, [field]: value };

        if (field === 'fees' || field === 'gst_rate') {
            newForm.gst = calculateGST(
                field === 'fees' ? value : createForm.fees,
                field === 'gst_rate' ? value : createForm.gst_rate
            );
        }

        setCreateForm(newForm);
    };

    const handleEditChange = (field, value) => {
        const newForm = { ...editForm, [field]: value };

        if (field === 'fees' || field === 'gst_rate') {
            newForm.gst = calculateGST(
                field === 'fees' ? value : editForm.fees,
                field === 'gst_rate' ? value : editForm.gst_rate
            );
        }

        setEditForm(newForm);
    };

    // Handle category form changes
    const handleCategoryCreateChange = (field, value) => {
        setCategoryCreateForm({ ...categoryCreateForm, [field]: value });
    };

    const handleCategoryEditChange = (field, value) => {
        setCategoryEditForm({ ...categoryEditForm, [field]: value });
    };

    // Toggle dropdowns
    const toggleDropdown = (serviceId) => {
        setActiveDropdown(activeDropdown === serviceId ? null : serviceId);
    };

    const toggleCategoryDropdown = (categoryId) => {
        setCategoryActiveDropdown(categoryActiveDropdown === categoryId ? null : categoryId);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setActiveDropdown(null);
                setCategoryActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Format date
    const formatDate = (dateString, withTime = false) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '—';

        if (withTime) {
            return date.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Format currency
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined || amount === '') return '—';
        const num = Number(amount);
        if (Number.isNaN(num)) return '—';
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    const clearSearch = () => {
        if (activeTab === 'services') {
            setSearchTerm('');
            setCategoryFilter('');
        } else {
            setCategorySearchTerm('');
        }
    };

    // ------------------------------
    // Details Modal Helpers (NEW UI)
    // ------------------------------

    const getInitials = (name = '') => {
        const n = String(name || '').trim();
        if (!n) return '—';
        const parts = n.split(/\s+/).filter(Boolean);
        const first = parts[0]?.[0] || '';
        const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
        return (first + last).toUpperCase() || '—';
    };

    const copyToClipboard = async (text) => {
        try {
            if (!text) return;
            await navigator.clipboard.writeText(String(text));
        } catch (_) {
            // ignore
        }
    };

    const Pill = ({ children, tone = 'gray' }) => {
        const map = {
            gray: 'bg-gray-100 text-gray-700 border-gray-200',
            green: 'bg-green-50 text-green-700 border-green-200',
            red: 'bg-red-50 text-red-700 border-red-200',
            indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            amber: 'bg-amber-50 text-amber-700 border-amber-200'
        };
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-semibold ${map[tone] || map.gray}`}>
                {children}
            </span>
        );
    };

    const StatCard = ({ icon, label, value, sub }) => {
        return (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
                        <div className="mt-1 text-lg font-bold text-gray-900">{value}</div>
                        {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                        {icon}
                    </div>
                </div>
            </div>
        );
    };

    const FieldRow = ({ label, value, mono = false }) => (
        <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <div className="text-sm text-gray-500">{label}</div>
            <div className={`text-sm font-medium text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</div>
        </div>
    );

    const PersonCard = ({ title, user }) => {
        const u = user || {};
        return (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-50 to-indigo-50 border border-gray-100 flex items-center justify-center font-bold text-indigo-700">
                            {getInitials(u?.name)}
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{u?.name || '—'}</div>
                            <div className="text-xs text-gray-500 truncate">{u?.username || '—'}</div>
                        </div>
                    </div>
                    <Pill tone="gray">
                        <FiUser className="w-3.5 h-3.5" />
                        {title}
                    </Pill>
                </div>

                <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 min-w-0">
                            <FiMail className="w-4 h-4 text-gray-400" />
                            <a className="truncate hover:underline" href={u?.email ? `mailto:${u.email}` : undefined} onClick={(e) => !u?.email && e.preventDefault()}>
                                {u?.email || '—'}
                            </a>
                        </div>
                        {u?.email ? (
                            <button
                                type="button"
                                onClick={() => copyToClipboard(u.email)}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                                title="Copy email"
                            >
                                <FiCopy className="w-4 h-4" />
                            </button>
                        ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 min-w-0">
                            <FiPhone className="w-4 h-4 text-gray-400" />
                            <a className="truncate hover:underline" href={u?.mobile ? `tel:${u.mobile}` : undefined} onClick={(e) => !u?.mobile && e.preventDefault()}>
                                {u?.mobile || '—'}
                            </a>
                        </div>
                        {u?.mobile ? (
                            <button
                                type="button"
                                onClick={() => copyToClipboard(u.mobile)}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                                title="Copy mobile"
                            >
                                <FiCopy className="w-4 h-4" />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    };

    const DetailsModalShell = ({ title, subtitle, icon, badge, onClose, children }) => {
        return (
            <div className="fixed inset-0 z-[120]">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
                <div className="relative min-h-screen flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header - fixed, no scroll */}
                        <div className="relative overflow-hidden rounded-t-3xl border-b border-gray-100 shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600" />
                            <div className="absolute -top-16 -right-20 w-64 h-64 rounded-full bg-white/10" />
                            <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-white/10" />

                            <div className="relative px-6 py-6 flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                                        {icon}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h5 className="text-xl md:text-2xl font-bold text-white truncate">{title}</h5>
                                            {badge}
                                        </div>
                                        {subtitle ? <p className="text-white/80 text-sm mt-1">{subtitle}</p> : null}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-colors"
                                    aria-label="Close"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body - scrollable with styled scrollbar (WebKit + Firefox) */}
                        <div className={`${MODAL_SCROLLBAR_CLASS} p-6 bg-gradient-to-b from-white to-gray-50/80`}>
                            {children}
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    };

    // Skeleton loader components (left as-is)
    const ServiceSkeletonRow = () => (
        <tr className="border-b border-gray-100 animate-pulse">
            <td className="p-3 text-center">
                <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-6 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="space-y-1.5 mx-auto max-w-xs">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-36 mx-auto"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 mx-auto"></div>
                </div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="space-y-1 mx-auto max-w-xs">
                    <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 mx-auto"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 mx-auto"></div>
                </div>
            </td>
            <td className="p-3 text-center">
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-8 mx-auto"></div>
            </td>
        </tr>
    );

    const CategorySkeletonRow = () => (
        <tr className="border-b border-gray-100 animate-pulse">
            <td className="p-3 text-center">
                <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-6 mx-auto"></div>
            </td>
            <td className="p-3">
                <div className="space-y-1.5">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
                </div>
            </td>
            <td className="p-3">
                <div className="space-y-1.5">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
                </div>
            </td>
            <td className="p-3">
                <div className="space-y-1.5">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
                </div>
            </td>
            <td className="p-3 text-center">
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-8 mx-auto"></div>
            </td>
        </tr>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50">
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
                    {apiError && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <FiXCircle className="w-5 h-5 mr-2" />
                                    {apiError}
                                </div>
                                <button
                                    onClick={() => setApiError('')}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col">
                        {/* Header with Tabs */}
                        <div className="mb-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                                <div>
                                    <h5 className="text-2xl font-bold text-gray-800 mb-2">
                                        Services & Categories Management
                                    </h5>
                                    <p className="text-gray-600 text-sm">
                                        Manage and track all your services and categories in one place
                                    </p>
                                </div>

                                <motion.button
                                    onClick={() => {
                                        if (activeTab === 'services') {
                                            setShowCreateModal(true);
                                        } else {
                                            setShowCategoryCreateModal(true);
                                        }
                                    }}
                                    className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-600/40"
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiPlus className="w-4 h-4" />
                                    {activeTab === 'services' ? 'Add New Service' : 'Add New Category'}
                                </motion.button>
                            </div>

                            {/* Tab Navigation */}
                            <div className="flex space-x-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-6">
                                <button
                                    onClick={() => setActiveTab('services')}
                                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'services' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}
                                >
                                    <FiSettings className="w-4 h-4" />
                                    Services
                                </button>
                                <button
                                    onClick={() => setActiveTab('categories')}
                                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'categories' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}
                                >
                                    <FiTag className="w-4 h-4" />
                                    Categories
                                </button>
                            </div>

                        </div>

                        {/* Main Card */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 relative z-0">
                            {/* Filters Bar - Compact Design */}
                            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full flex-wrap">
                                    {/* Search Input - Compact */}
                                    <div className="relative flex-1 min-w-[200px]">
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={activeTab === 'services' ? searchTerm : categorySearchTerm}
                                            onChange={(e) => activeTab === 'services' ? setSearchTerm(e.target.value) : setCategorySearchTerm(e.target.value)}
                                            placeholder={activeTab === 'services' ? "Search by name or SAC code" : "Search by category name"}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all text-sm"
                                        />
                                    </div>

                                    {/* Category filter (Services tab only) */}
                                    {activeTab === 'services' && (
                                        <div className="w-full sm:w-auto min-w-[180px]">
                                            <select
                                                value={categoryFilter}
                                                onChange={(e) => setCategoryFilter(e.target.value)}
                                                className="w-full sm:min-w-[180px] pl-4 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all text-sm appearance-none bg-no-repeat bg-right"
                                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundSize: '1.25rem', backgroundPosition: 'right 0.5rem center' }}
                                            >
                                                <option value="">All categories</option>
                                                {categories.map((cat) => (
                                                    <option key={cat.category_id} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Active Filters Badge */}
                                    {((activeTab === 'services' && (searchTerm || categoryFilter)) || (activeTab === 'categories' && categorySearchTerm)) && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm flex-wrap">
                                                {activeTab === 'services' && searchTerm && (
                                                    <span className="flex items-center">
                                                        Search: "{searchTerm}"
                                                    </span>
                                                )}
                                                {activeTab === 'services' && categoryFilter && (
                                                    <span className="flex items-center">
                                                        Category: {categoryFilter}
                                                    </span>
                                                )}
                                                {activeTab === 'categories' && categorySearchTerm && (
                                                    <span className="flex items-center">
                                                        Search: "{categorySearchTerm}"
                                                    </span>
                                                )}
                                                <button
                                                    onClick={clearSearch}
                                                    className="ml-2 p-1 hover:bg-indigo-100 rounded-full transition-colors"
                                                >
                                                    <FiX className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Total count after search/filter */}
                                    <div className="text-sm text-gray-600 whitespace-nowrap sm:ml-auto">
                                        Total: <span className="font-semibold">{activeTab === 'services' ? filteredServices.length : filteredCategories.length}</span>
                                        {activeTab === 'services' ? ' services' : ' categories'}
                                    </div>
                                </div>
                            </div>

                            {/* Table Header */}
                            <div className="bg-gradient-to-r from-gray-50 to-indigo-50">
                                {activeTab === 'services' ? (
                                    <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-gray-200">
                                        <div className="col-span-1">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">#</div>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</div>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">Fees</div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">Status</div>
                                        </div>
                                        <div className="col-span-1">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">Actions</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-gray-200">
                                        <div className="col-span-1">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                #
                                            </div>
                                        </div>
                                        <div className="col-span-4">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Category Details
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Created By
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Last Modified
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                Actions
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Table Body */}
                            <div>
                                {loading ? (
                                    <div className="p-5">
                                        {Array.from({ length: 8 }).map((_, index) => (
                                            activeTab === 'services' ? <ServiceSkeletonRow key={index} /> : <CategorySkeletonRow key={index} />
                                        ))}
                                    </div>
                                ) : (activeTab === 'services' ? filteredServices : filteredCategories).length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="p-4 bg-gray-100 rounded-full mb-4">
                                                {activeTab === 'services' ? (
                                                    <FiSettings className="w-12 h-12 text-gray-400" />
                                                ) : (
                                                    <FiTag className="w-12 h-12 text-gray-400" />
                                                )}
                                            </div>
                                            <p className="text-gray-500 text-lg font-medium mb-2">
                                                {activeTab === 'services'
                                                    ? (services.length === 0 ? 'No services available' : 'No matching services found')
                                                    : (categories.length === 0 ? 'No categories available' : 'No matching categories found')
                                                }
                                            </p>
                                            <p className="text-gray-400 text-sm mb-4">
                                                {activeTab === 'services'
                                                    ? (services.length === 0
                                                        ? 'Get started by creating your first service'
                                                        : 'Try adjusting your search or filter criteria')
                                                    : (categories.length === 0
                                                        ? 'Get started by creating your first category'
                                                        : 'Try adjusting your search criteria')
                                                }
                                            </p>
                                            <motion.button
                                                onClick={() => {
                                                    if (activeTab === 'services') {
                                                        setShowCreateModal(true);
                                                    } else {
                                                        setShowCategoryCreateModal(true);
                                                    }
                                                }}
                                                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                {activeTab === 'services' ? 'Create Your First Service' : 'Create Your First Category'}
                                            </motion.button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-5">
                                        {activeTab === 'services' ? (
                                            // Services Table Content
                                            filteredServices.map((service, index) => {
                                                const isDropdownOpen = activeDropdown === service.service_id;
                                                return (
                                                    <motion.div
                                                        key={service.service_id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className={`grid grid-cols-12 gap-2 py-3 border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200 group ${isDropdownOpen ? 'relative z-[100]' : ''}`}
                                                    >
                                                        {/* # Column */}
                                                        <div className="col-span-1 flex items-center justify-center">
                                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 font-semibold rounded-lg">
                                                                {index + 1}
                                                            </span>
                                                        </div>

                                                        {/* Name Column */}
                                                        <div className="col-span-3 flex items-center">
                                                            <div className="text-gray-800 font-semibold text-sm truncate" title={service.name}>
                                                                {service.name}
                                                            </div>
                                                        </div>

                                                        {/* Category Column */}
                                                        <div className="col-span-3 flex items-center">
                                                            <span className="text-gray-600 text-sm truncate" title={service.category_name || '—'}>
                                                                {service.category_name || '—'}
                                                            </span>
                                                        </div>

                                                        {/* Fees Column */}
                                                        <div className="col-span-2 flex items-center justify-center">
                                                            <span className="inline-flex items-center justify-center bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 font-bold text-sm px-3 py-2 rounded-lg border border-green-100 min-w-[90px]">
                                                                <FiDollarSign className="w-3 h-3 mr-1" />
                                                                ₹{formatCurrency(service.fees)}
                                                            </span>
                                                        </div>

                                                        {/* Status Column */}
                                                        <div className="col-span-2 flex items-center justify-center">
                                                            {(service.status === 1 || service.status === true) ? (
                                                                <span className="inline-flex items-center justify-center bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 font-semibold text-sm px-3 py-1.5 rounded-lg border border-green-200 min-w-[80px]">
                                                                    <FiCheckCircle className="w-3 h-3 mr-1" />
                                                                    Active
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center justify-center bg-gradient-to-r from-red-50 to-pink-50 text-red-700 font-semibold text-sm px-3 py-1.5 rounded-lg border border-red-200 min-w-[80px]">
                                                                    <FiXCircle className="w-3 h-3 mr-1" />
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Actions Column */}
                                                        <div className="col-span-1 flex items-center justify-center">
                                                            <div className="dropdown-container relative">
                                                                <motion.button
                                                                    className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 group-hover:bg-indigo-100/50"
                                                                    onClick={(e) => {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        const spaceBelow = window.innerHeight - rect.bottom;
                                                                        setActionMenuPosition(spaceBelow < 220 ? 'above' : 'below');
                                                                        toggleDropdown(service.service_id);
                                                                    }}
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                >
                                                                    <FiMoreVertical className="w-5 h-5" />
                                                                </motion.button>
                                                                <AnimatePresence>
                                                                    {isDropdownOpen && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: actionMenuPosition === 'above' ? 10 : -10, scale: 0.95 }}
                                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                            exit={{ opacity: 0, y: actionMenuPosition === 'above' ? 10 : -10, scale: 0.95 }}
                                                                            transition={{ duration: 0.15 }}
                                                                            className={`absolute right-0 w-44 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden ${actionMenuPosition === 'above' ? 'bottom-full mb-1' : 'mt-1'}`}
                                                                            style={{ zIndex: 9999 }}
                                                                        >
                                                                            <div className="py-1">
                                                                                <button
                                                                                    onClick={() => { setSelectedService(service); setShowServiceDetailsModal(true); setActiveDropdown(null); }}
                                                                                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200"
                                                                                >
                                                                                    <FiEye className="w-4 h-4 mr-3" />
                                                                                    Details
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleEditClick(service)}
                                                                                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200"
                                                                                >
                                                                                    <FiEdit className="w-4 h-4 mr-3" />
                                                                                    Edit Service
                                                                                </button>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        ) : (
                                            // Categories Table Content
                                            filteredCategories.map((category, index) => {
                                                const isDropdownOpen = categoryActiveDropdown === category.category_id;

                                                return (
                                                    <motion.div
                                                        key={category.category_id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className={`grid grid-cols-12 gap-2 py-3 border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50 transition-all duration-200 group ${isDropdownOpen ? 'relative z-[100]' : ''}`}
                                                    >
                                                        {/* # Column */}
                                                        <div className="col-span-1 flex items-center justify-center">
                                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 font-semibold rounded-lg">
                                                                {index + 1}
                                                            </span>
                                                        </div>

                                                        {/* Category Details Column */}
                                                        <div className="col-span-4 flex flex-col">
                                                            <div className="text-gray-800 font-semibold text-sm">
                                                                {category.name}
                                                            </div>
                                                            <div className="text-gray-500 text-xs mt-1">
                                                                Created: {formatDate(category.create_date)}
                                                            </div>
                                                        </div>

                                                        {/* Created By Column */}
                                                        <div className="col-span-3 flex flex-col">
                                                            <div className="text-gray-800 font-medium text-sm">
                                                                {category.create_by?.name || 'N/A'}
                                                            </div>
                                                            <div className="text-gray-500 text-xs">
                                                                {category.create_by?.username || 'N/A'}
                                                            </div>
                                                        </div>

                                                        {/* Last Modified Column */}
                                                        <div className="col-span-3 flex flex-col">
                                                            <div className="text-gray-800 font-medium text-sm">
                                                                {category.modify_by?.name || category.create_by?.name || 'N/A'}
                                                            </div>
                                                            <div className="text-gray-500 text-xs">
                                                                {formatDate(category.modify_date || category.create_date)}
                                                            </div>
                                                        </div>

                                                        {/* Actions Column */}
                                                        <div className="col-span-1 flex items-center justify-center">
                                                            <div className="dropdown-container relative">
                                                                <motion.button
                                                                    className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 group-hover:bg-indigo-100/50"
                                                                    onClick={(e) => {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        const spaceBelow = window.innerHeight - rect.bottom;
                                                                        setActionMenuPosition(spaceBelow < 220 ? 'above' : 'below');
                                                                        toggleCategoryDropdown(category.category_id);
                                                                    }}
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                >
                                                                    <FiMoreVertical className="w-5 h-5" />
                                                                </motion.button>
                                                                <AnimatePresence>
                                                                    {isDropdownOpen && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: actionMenuPosition === 'above' ? 10 : -10, scale: 0.95 }}
                                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                            exit={{ opacity: 0, y: actionMenuPosition === 'above' ? 10 : -10, scale: 0.95 }}
                                                                            transition={{ duration: 0.15 }}
                                                                            className={`absolute right-0 w-44 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden ${actionMenuPosition === 'above' ? 'bottom-full mb-1' : 'mt-1'}`}
                                                                            style={{ zIndex: 9999 }}
                                                                        >
                                                                            <div className="py-1">
                                                                                <button
                                                                                    onClick={() => { setSelectedCategory(category); setShowCategoryDetailsModal(true); setCategoryActiveDropdown(null); }}
                                                                                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200"
                                                                                >
                                                                                    <FiEye className="w-4 h-4 mr-3" />
                                                                                    Details
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleCategoryEditClick(category)}
                                                                                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200"
                                                                                >
                                                                                    <FiEdit className="w-4 h-4 mr-3" />
                                                                                    Edit Category
                                                                                </button>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ---------------------------------- */}
            {/* Details Modals (REDESIGNED)         */}
            {/* ---------------------------------- */}

            <AnimatePresence>
                {showServiceDetailsModal && selectedService && (
                    <DetailsModalShell
                        key="service-details"
                        title={selectedService.name}
                        subtitle="Service details"
                        icon={<FiSettings className="w-6 h-6" />}
                        badge={
                            (selectedService.status === true || selectedService.status === 1) ? (
                                <Pill tone="green"><FiCheckCircle className="w-3.5 h-3.5" /> Active</Pill>
                            ) : (
                                <Pill tone="gray"><FiXCircle className="w-3.5 h-3.5" /> Inactive</Pill>
                            )
                        }
                        onClose={() => setShowServiceDetailsModal(false)}
                    >
                        {/* Top stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard
                                icon={<FiDollarSign className="w-5 h-5" />}
                                label="Fees"
                                value={selectedService.fees != null ? `₹${formatCurrency(selectedService.fees)}` : '—'}
                                sub="Base service fee"
                            />
                            <StatCard
                                icon={<FiPercent className="w-5 h-5" />}
                                label="GST"
                                value={selectedService.gst_value != null || selectedService.gst != null ? `₹${formatCurrency(selectedService.gst_value ?? selectedService.gst)}` : '—'}
                                sub={selectedService.gst_rate != null ? `Rate: ${selectedService.gst_rate}%` : 'Tax value'}
                            />
                            <StatCard
                                icon={<FiCheckCircle className="w-5 h-5" />}
                                label="Total"
                                value={(() => {
                                    const fee = Number(selectedService.fees);
                                    const gst = Number(selectedService.gst_value ?? selectedService.gst);
                                    const total = (Number.isNaN(fee) ? 0 : fee) + (Number.isNaN(gst) ? 0 : gst);
                                    return total ? `₹${formatCurrency(total)}` : '—';
                                })()}
                                sub="Fee + GST"
                            />
                        </div>

                        {/* Content */}
                        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Overview */}
                            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm font-bold text-gray-900">Overview</div>
                                    <Pill tone="indigo">
                                        <FiTag className="w-3.5 h-3.5" />
                                        Service
                                    </Pill>
                                </div>

                                <FieldRow label="Name" value={selectedService.name} />
                                <FieldRow label="SAC Code" value={selectedService.sac_code ?? '—'} mono />

                                {/* Options */}
                                <div className="pt-3">
                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Options</div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill tone={(selectedService.is_recurring === true || selectedService.is_recurring === 1 || selectedService.is_recurring === '1') ? 'amber' : 'gray'}>
                                            {(selectedService.is_recurring === true || selectedService.is_recurring === 1 || selectedService.is_recurring === '1') ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiXCircle className="w-3.5 h-3.5" />}
                                            {((selectedService.is_recurring === true || selectedService.is_recurring === 1 || selectedService.is_recurring === '1') ? 'Recurring' : 'One-time')}
                                        </Pill>
                                    </div>
                                </div>

                                {/* Remark */}
                                {selectedService.remark ? (
                                    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Remark</div>
                                        <div className="text-sm text-gray-700 leading-relaxed">{selectedService.remark}</div>
                                    </div>
                                ) : null}
                            </div>

                            {/* Audit */}
                            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm font-bold text-gray-900">Audit</div>
                                    <Pill tone="gray">
                                        <FiCalendar className="w-3.5 h-3.5" />
                                        Timeline
                                    </Pill>
                                </div>

                                <div className="space-y-2">
                                    <div className="rounded-xl border border-gray-100 bg-gradient-to-r from-white to-gray-50 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</div>
                                            <div className="text-sm font-semibold text-gray-900">{formatDate(selectedService.create_date || selectedService.created_date, true)}</div>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-gray-100 bg-gradient-to-r from-white to-gray-50 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last modified</div>
                                            <div className="text-sm font-semibold text-gray-900">{formatDate(selectedService.modify_date || selectedService.updated_date, true)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-4">
                                    <PersonCard title="Created by" user={selectedService.create_by} />
                                    <PersonCard title="Modified by" user={selectedService.modify_by || selectedService.create_by} />
                                </div>
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <motion.button
                                type="button"
                                onClick={() => setShowServiceDetailsModal(false)}
                                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Close
                            </motion.button>
                            <motion.button
                                type="button"
                                onClick={() => { setShowServiceDetailsModal(false); handleEditClick(selectedService); }}
                                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25"
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Edit Service
                            </motion.button>
                        </div>
                    </DetailsModalShell>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCategoryDetailsModal && selectedCategory && (
                    <DetailsModalShell
                        key="category-details"
                        title={selectedCategory.name}
                        subtitle="Category details"
                        icon={<FiTag className="w-6 h-6" />}
                        badge={<Pill tone="indigo"><FiTag className="w-3.5 h-3.5" /> Category</Pill>}
                        onClose={() => setShowCategoryDetailsModal(false)}
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Overview */}
                            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm font-bold text-gray-900">Overview</div>
                                    <Pill tone="indigo">
                                        <FiTag className="w-3.5 h-3.5" />
                                        Category
                                    </Pill>
                                </div>
                                <FieldRow label="Name" value={selectedCategory.name} />
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StatCard
                                        icon={<FiCalendar className="w-5 h-5" />}
                                        label="Created"
                                        value={formatDate(selectedCategory.create_date)}
                                        sub="Creation date"
                                    />
                                    <StatCard
                                        icon={<FiCalendar className="w-5 h-5" />}
                                        label="Last modified"
                                        value={formatDate(selectedCategory.modify_date || selectedCategory.create_date)}
                                        sub="Latest update"
                                    />
                                </div>
                            </div>

                            {/* People */}
                            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm font-bold text-gray-900">People</div>
                                    <Pill tone="gray"><FiUser className="w-3.5 h-3.5" /> Users</Pill>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <PersonCard title="Created by" user={selectedCategory.create_by} />
                                    <PersonCard title="Modified by" user={selectedCategory.modify_by || selectedCategory.create_by} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <motion.button
                                type="button"
                                onClick={() => setShowCategoryDetailsModal(false)}
                                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Close
                            </motion.button>
                            <motion.button
                                type="button"
                                onClick={() => { setShowCategoryDetailsModal(false); handleCategoryEditClick(selectedCategory); }}
                                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25"
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Edit Category
                            </motion.button>
                        </div>
                    </DetailsModalShell>
                )}
            </AnimatePresence>

            {/* ------------------------------ */}
            {/* Existing Create/Edit Modals     */}
            {/* (UNCHANGED from your original) */}
            {/* ------------------------------ */}

            {/* Create Service Modal */}
            {showCreateModal && (
                <FormModalShell title="Create New Service" subtitle="Add a new service to your catalog" icon={<FiSettings className="w-6 h-6" />} onClose={() => setShowCreateModal(false)}>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service Name *</label>
                                    <input type="text" value={createForm.name} onChange={(e) => handleCreateChange('name', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none" placeholder="e.g., GST Registration" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                                    <select value={createForm.category_id} onChange={(e) => handleCreateChange('category_id', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none appearance-none bg-no-repeat bg-right" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundSize: '1.25rem', backgroundPosition: 'right 0.75rem center' }}>
                                        <option value="">Select category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">SAC Code *</label>
                                    <input type="text" value={createForm.sac_code} onChange={(e) => handleCreateChange('sac_code', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none" placeholder="e.g., 998311" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service Fees (₹) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500">₹</span>
                                        <input type="number" step="0.01" value={createForm.fees} onChange={(e) => handleCreateChange('fees', e.target.value)} className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none" placeholder="0.00" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">GST Rate (%) *</label>
                                    <div className="relative">
                                        <input type="number" step="0.01" value={createForm.gst_rate} onChange={(e) => handleCreateChange('gst_rate', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none" placeholder="18.00" required />
                                        <span className="absolute right-3 top-3 text-gray-500">%</span>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">GST Amount (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500">₹</span>
                                        <input type="text" value={createForm.gst} readOnly className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 font-medium outline-none" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Calculated from fees and GST rate</p>
                                </div>
                            </div>
                            {apiError && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{apiError}</div>}
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                            <motion.button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-gray-600 hover:text-gray-800 rounded-xl text-sm font-medium border border-gray-300 hover:bg-gray-50" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancel</motion.button>
                            <motion.button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md" whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}><FiPlus className="w-4 h-4" />Create Service</motion.button>
                        </div>
                    </form>
                </FormModalShell>
            )}

            {/* Edit Service Modal */}
            {showEditModal && selectedService && (
                <FormModalShell title="Edit Service" subtitle={selectedService.name} icon={<FiEdit className="w-6 h-6" />} onClose={() => setShowEditModal(false)}>
                    <form onSubmit={handleEditSubmit}>
                        <input type="hidden" name="service_id" value={editForm.service_id} />
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service Name *</label>
                                    <input type="text" value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                                    <select value={editForm.category_id} onChange={(e) => handleEditChange('category_id', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none appearance-none bg-no-repeat bg-right" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundSize: '1.25rem', backgroundPosition: 'right 0.75rem center' }}>
                                        <option value="">Select category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">SAC Code *</label>
                                    <input type="text" value={editForm.sac_code} onChange={(e) => handleEditChange('sac_code', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service Fees (₹) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500">₹</span>
                                        <input type="number" step="0.01" value={editForm.fees} onChange={(e) => handleEditChange('fees', e.target.value)} className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">GST Rate (%) *</label>
                                    <div className="relative">
                                        <input type="number" step="0.01" value={editForm.gst_rate} onChange={(e) => handleEditChange('gst_rate', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none" required />
                                        <span className="absolute right-3 top-3 text-gray-500">%</span>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">GST Amount (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500">₹</span>
                                        <input type="text" value={editForm.gst} readOnly className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 font-medium outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                <Switch label="Status" description="Active services are visible and available" checked={editForm.status === '1'} onChange={(v) => handleEditChange('status', v ? '1' : '0')} />
                            </div>
                            {apiError && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{apiError}</div>}
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                            <motion.button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 text-gray-600 hover:text-gray-800 rounded-xl text-sm font-medium border border-gray-300 hover:bg-gray-50" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancel</motion.button>
                            <motion.button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium shadow-md" whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>Update Service</motion.button>
                        </div>
                    </form>
                </FormModalShell>
            )}

            {/* Create Category Modal */}
            {showCategoryCreateModal && (
                <FormModalShell title="Create New Category" subtitle="Add a new service category" icon={<FiTag className="w-6 h-6" />} onClose={() => setShowCategoryCreateModal(false)}>
                    <form onSubmit={handleCategoryCreateSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category Name *</label>
                                <input type="text" value={categoryCreateForm.name} onChange={(e) => handleCategoryCreateChange('name', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none" placeholder="Enter category name" required />
                            </div>
                            {apiError && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{apiError}</div>}
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                            <motion.button type="button" onClick={() => setShowCategoryCreateModal(false)} className="px-5 py-2.5 text-gray-600 hover:text-gray-800 rounded-xl text-sm font-medium border border-gray-300 hover:bg-gray-50" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancel</motion.button>
                            <motion.button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md" whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}><FiPlus className="w-4 h-4" />Create Category</motion.button>
                        </div>
                    </form>
                </FormModalShell>
            )}

            {/* Edit Category Modal */}
            {showCategoryEditModal && selectedCategory && (
                <FormModalShell title="Edit Category" subtitle={selectedCategory.name} icon={<FiTag className="w-6 h-6" />} onClose={() => setShowCategoryEditModal(false)}>
                    <form onSubmit={handleCategoryEditSubmit}>
                        <input type="hidden" name="category_id" value={categoryEditForm.category_id} />
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category Name *</label>
                                <input type="text" value={categoryEditForm.name} onChange={(e) => handleCategoryEditChange('name', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none" required />
                            </div>
                            {apiError && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{apiError}</div>}
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                            <motion.button type="button" onClick={() => setShowCategoryEditModal(false)} className="px-5 py-2.5 text-gray-600 hover:text-gray-800 rounded-xl text-sm font-medium border border-gray-300 hover:bg-gray-50" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancel</motion.button>
                            <motion.button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium shadow-md" whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>Update Category</motion.button>
                        </div>
                    </form>
                </FormModalShell>
            )}
        </div>
    );
};

export default Services;
