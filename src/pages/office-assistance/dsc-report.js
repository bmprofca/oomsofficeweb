import React, { useState, useEffect } from 'react';
import {
    FiSearch,
    FiPlus,
    FiEdit,
    FiMenu,
    FiPrinter,
    FiMail,
    FiMessageSquare,
    FiUser,
    FiMail as FiEmailIcon,
    FiCalendar,
    FiClock,
    FiX,
    FiChevronRight,
    FiChevronDown,
    FiCheck,
    FiCreditCard,
    FiChevronLeft,
    FiChevronRight as FiChevronRightIcon,
    FiChevronUp,
    FiUsers,
    FiExternalLink,
    FiEye,
    FiTrash2
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import DateFilter from '../../components/DateFilter';
import DatePickerComponent from '../../components/DatePickerComponent';
import moment from 'moment';
import SearchableSelect from '../../components/SearchableSelect'
import SearchableSelectOptions from "../../components/SelectSearchableOptionsComponent";
import getHeaders from "../../utils/get-headers";



const ViewDSCRegister = () => {
    // Header/Sidebar states
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const BASE_URL = 'https://api.ooms.in/api/v1';
    // Main states
    const [loading, setLoading] = useState(false);
    const [dscData, setDscData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState('');
    const [fromToDate, setFromToDate] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedDsc, setSelectedDsc] = useState(null);
    const [users, setUsers] = useState([]);
    const [types, setTypes] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [typeLoading, setTypeLoading] = useState(false);
    const [companyLoading, setCompanyLoading] = useState(false);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState('');
    const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [selectedWhatsapp, setSelectedWhatsapp] = useState('');
    const [meta, setMeta] = useState({ total_pages: 0, current_page: 1, total: 0 });
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedDetailDsc, setSelectedDetailDsc] = useState(null);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
    const [dscToDelete, setDscToDelete] = useState(null);
    const [createForm, setCreateForm] = useState({
        username: '',
        company: '',
        duration: '1',
        validity_start: '',
        validity_end: '',
        password: '',
        type: ''
    });

    const [editForm, setEditForm] = useState({
        dsc_id: '',
        company: '',
        duration: '1',
        validity_start: '',
        validity_end: '',
        password: '',
        type: ''
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showAll, setShowAll] = useState(false);

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
        fetchDscData(1, '', from, to);
    }, []);

    const fetchDscType = async () => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const url = `${BASE_URL}/assistance/dsc/types`;

            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setTypes(data.data);
            } else {
                console.error('Invalid API response:', data);
                setTypes([]);
            }

        } catch (error) {
            console.error('Fetch DSC types failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const headers = getHeaders();

            const url = `${BASE_URL}/assistance/dsc/companies`;

            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setCompanies(data.data);
            } else {
                console.error('Invalid API response:', data);
                setCompanies([]);
            }

        } catch (error) {
            console.error('Fetch Companies failed:', error);
            // setError(error.message); // Use your error state
        } finally {
            setLoading(false);
        }
    };

    const fetchDscData = async (page = 1, search = '', expires_from = '', expires_to = '') => {
        setLoading(true);

        try {
            const username = localStorage.getItem("user_username");
            const headers = getHeaders();

            const params = new URLSearchParams({
                search: search || '',
                page: page.toString(),
                limit: '10'
            });

            if (expires_from) params.append('expires_from', expires_from);
            if (expires_to) params.append('expires_to', expires_to);

            const url = `${BASE_URL}/assistance/dsc/list?${params.toString()}`;
            const response = await fetch(url, {
                method: "GET",
                headers: headers

            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error ${response.status}:`, errorText);
                setDscData([]);
                return;
            }

            const result = await response.json();
            if (result.success) {
                setDscData(result.data.map(item => ({
                    dsc_id: item.dsc_id,
                    username: item.client?.username,
                    name: item.client?.name || item.client?.guardian_name,
                    guardian_name: item.client?.guardian_name,
                    mobile: item.client?.mobile,
                    email: item.client?.email,
                    user_type: item.client?.user_type,
                    company: item.company,
                    validity_start: item.validity_start,
                    validity_end: item.validity_end,
                    status: item.status || 1,
                    duration: item.year || 1,
                    password: item.password,
                    modify_by: username,
                    type: item.type
                })));

                setMeta(result.meta || {});
                setCurrentPage(result.meta?.current_page || 1);
            } else {
                console.error("Backend error:", result.message);
                setDscData([]);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setDscData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSubmit = async () => {
        if (!dscToDelete || loading) return;

        setLoading(true);
        try {
            const headers = getHeaders();

            const response = await fetch(`${BASE_URL}/assistance/dsc/delete`, {
                method: 'DELETE',
                headers: headers,
                body: JSON.stringify({ dsc_id: dscToDelete })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                fetchDscData(1, searchQuery);
                setDeleteConfirmModal(false);
                setDscToDelete(null);
            } else {
                console.error('Delete failed:', data.message);
            }
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        const [from, to] = dateRange.split(' - ');
        fetchDscData(1, searchQuery);
    };

    const handleViewDetails = (dsc) => {
        const enrichedDsc = {
            ...dsc,
            companyName: companies.find(comp => comp.value === dsc.company)?.name || dsc.company || 'N/A',
            typeName: types.find(typeItem => typeItem.value === dsc.type)?.name || dsc.type || 'N/A'
        };

        setSelectedDetailDsc(enrichedDsc);
        setShowDetailsModal(true);
    };

    const handleDeleteClick = (dscId) => {
        setDscToDelete(dscId);
        setDeleteConfirmModal(true);
    };

    useEffect(() => {
        setTypeLoading(true);
        fetchDscType();
        setTypeLoading(false);
    }, []);

    useEffect(() => {
        setCompanyLoading(true);
        fetchCompanies();
        setCompanyLoading(false);
    }, []);


    useEffect(() => {
        const timer = setTimeout(() => {
            const [from, to] = dateRange.split(' - ');
            fetchDscData(1, searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleDateFilterChange = (filter) => {
        setDateRange(filter.range || '');
        setFromToDate(filter.range ? `From ${filter.range}` : '');

        const convertToISODate = (dateStr) => {
            if (!dateStr) return '';
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        };

        const expires_from = filter.from instanceof Date
            ? convertToISODate(filter.from.toLocaleDateString('en-GB'))
            : '';
        const expires_to = filter.to instanceof Date
            ? convertToISODate(filter.to.toLocaleDateString('en-GB'))
            : '';
        fetchDscData(1, searchQuery, expires_from, expires_to);
    };


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

    const handleEditClick = (dsc) => {
        setSelectedDsc(dsc);

        const formatSafeDate = (dateStr) => {
            if (!dateStr) return '';
            const parsed = moment(dateStr, ['DD/MM/YYYY', 'YYYY-MM-DD']);
            return parsed.isValid() ? parsed.format('DD/MM/YYYY') : '';
        };

        const matchingCompany = companies.find(company =>
            company.label === dsc.company ||
            company.value === dsc.company ||
            company.name === dsc.company
        )?.value || '';

        const matchingType = types.find(typeItem =>
            typeItem.label === dsc.type ||
            typeItem.value === dsc.type ||
            typeItem.name === dsc.type
        )?.value || '';

        const newEditForm = {
            dsc_id: dsc.dsc_id,
            username: dsc.username || '',
            company: matchingCompany,
            duration: (dsc.duration || 1).toString(),
            validity_start: formatSafeDate(dsc.validity_start),
            validity_end: formatSafeDate(dsc.validity_end),
            password: dsc.password || '',
            type: matchingType
        };
        setEditForm(newEditForm);
        setShowEditModal(true);
    };



    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        const headers = getHeaders();

        try {
            const validity_start = moment(createForm.validity_start, "DD/MM/YYYY").format("YYYY-MM-DD");
            const validity_end = moment(createForm.validity_end, "DD/MM/YYYY").format("YYYY-MM-DD");
            const year = moment(validity_start).year();
            const payload = {
                username: createForm.username,
                company: createForm.company,
                password: createForm.password || null,
                validity_start,
                validity_end,
                type: createForm.type,
                year: createForm.duration,
            };

            const response = await fetch(`${BASE_URL}/assistance/dsc/create`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setShowCreateModal(false);

                setCreateForm({
                    username: '',
                    company: '',
                    duration: '1',
                    validity_start: '',
                    validity_end: '',
                    password: ''
                });

                fetchDscData(1, searchQuery);

            } else {
                console.error('Backend error:', data);
            }

        } catch (error) {
            console.error('Network error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();

        if (loading || !selectedDsc?.dsc_id) {
            console.log("DSC ID not found");
            return;
        }

        setLoading(true);
        const headers = getHeaders();

        const transformDate = (dateStr) => {
            if (!dateStr) return '';
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        };

        const apiPayload = {
            dsc_id: editForm.dsc_id,
            company: editForm.company,
            password: editForm.password,
            validity_start: transformDate(editForm.validity_start),
            validity_end: transformDate(editForm.validity_end),
            type: editForm.type,
            year: editForm.duration
        };

        try {
            const response = await fetch(
                `${BASE_URL}/assistance/dsc/edit`,
                {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify(apiPayload),
                }
            );

            const data = await response.json();

            if (response.ok && data.success) {
            } else {
                console.error('❌ Backend error:', data.message || data);
                return;
            }

        } catch (error) {
            console.error('❌ Network error:', error);
            return;
        } finally {
            setLoading(false);
        }

        setShowEditModal(false);
        setSelectedDsc(null);
        const [from, to] = dateRange.split(' - ');
        fetchDscData(1, searchQuery);
    };

    const calculatevalidity_end = (validity_start, duration) => {
        if (!validity_start) return '';
        const issueMoment = moment(validity_start, 'DD/MM/YYYY');
        const expireMoment = issueMoment.add(duration * 365, 'days');
        return expireMoment.format('DD/MM/YYYY');
    };

    const handleCreateChange = (field, value) => {
        setCreateForm((prev) => {
            const next = { ...prev, [field]: value };

            if (field === "validity_start" || field === "duration") {
                const start = field === "validity_start" ? value : prev.validity_start;
                const durationRaw = field === "duration" ? value : prev.duration;
                const duration = Number(durationRaw);

                next.validity_end =
                    start && Number.isFinite(duration)
                        ? calculatevalidity_end(start, duration)
                        : "";
            }
            return next;
        });
    };

    const handleEditChange = (field, value) => {
        const newForm = { ...editForm, [field]: value };

        if (field === 'validity_start' || field === 'duration') {
            if (newForm.validity_start) {
                newForm.validity_end = calculatevalidity_end(newForm.validity_start, parseInt(newForm.duration || 1));
            }
        }

        if (field === 'validity_end' && newForm.validity_start && newForm.validity_end) {
            const issue = moment(newForm.validity_start, 'DD/MM/YYYY');
            const expire = moment(newForm.validity_end, 'DD/MM/YYYY');
            if (issue.isValid() && expire.isValid()) {
                const yearsDiff = expire.diff(issue, 'years');
                newForm.duration = Math.max(1, yearsDiff).toString();
            }
        }

        setEditForm(newForm);
    };


    const getUserProfileLink = (user) => {
        const baseUrls = {
            user: '/view-client-profile',
            ca: '/view-ca-profile',
            agent: '/view-agent-profile',
            employee: '/view-stuff-profile'
        };
        return `${baseUrls[user.user_type]}?username=${user.username}`;
    };

    const getDaysLeft = (validity_end) => {
        const targetDate = moment(validity_end, "YYYY-MM-DD");
        const today = moment();
        return targetDate.diff(today, 'days');
    };

    const getStatusBadgeClass = (status) => {
        return status === 1
            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            : 'bg-rose-100 text-rose-700 border border-rose-200';
    };

    const getUrgencyBadgeClass = (daysLeft) => {
        if (daysLeft < 0) return 'bg-rose-100 text-rose-700 border border-rose-200';
        if (daysLeft <= 30) return 'bg-amber-100 text-amber-700 border border-amber-200';
        if (daysLeft <= 90) return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    const toggleRowDropdown = (dscId) => {
        setActiveRowDropdown(activeRowDropdown === dscId ? null : dscId);
    };

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

    const userOptions = users.map(user => ({
        value: user.username,
        label: `${user.name} • ${user.user_type} • ${user.mobile}`
    }));

    const indexOfLastItem = showAll ? dscData.length : currentPage * itemsPerPage;
    const indexOfFirstItem = showAll ? 0 : (currentPage - 1) * itemsPerPage;
    const currentItems = dscData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(dscData.length / itemsPerPage);

    const handleUserProfileClick = (e, dsc) => {
        e.preventDefault();
        const profileLink = getUserProfileLink(dsc);
        window.open(profileLink, '_blank');
    };

    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="flex items-center justify-center">
                    <div className="h-8 w-8 bg-slate-200 rounded-full mr-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                </div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-32 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-40 mx-auto"></div>
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
                                            {[...Array(7)].map((_, i) => (
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
    if (loading && dscData.length === 0) {
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
                                    <h3 className="text-xl font-bold text-slate-800 mt-1">{dscData.length}</h3>
                                </div>
                                <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                                    <FiUsers className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 font-medium">All DSC certificates</span>
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
                                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Active</p>
                                    <h3 className="text-xl font-bold text-slate-800 mt-1">{dscData.filter(d => d.status === 1).length}</h3>
                                </div>
                                <div className="p-2 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-lg">
                                    <FiCheck className="w-5 h-5 text-emerald-600" />
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 font-medium">Currently valid certificates</span>
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
                                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Expiring Soon</p>
                                    <h3 className="text-xl font-bold text-slate-800 mt-1">
                                        {dscData.filter(d => {
                                            const daysLeft = getDaysLeft(d.validity_end);
                                            return daysLeft <= 30 && daysLeft > 0;
                                        }).length}
                                    </h3>
                                </div>
                                <div className="p-2 bg-gradient-to-r from-amber-100 to-amber-200 rounded-lg">
                                    <FiClock className="w-5 h-5 text-amber-600" />
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 font-medium">Within 30 days expiry</span>
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
                                        <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                                            <FiCreditCard className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h5 className="text-lg font-bold text-slate-800 whitespace-nowrap">
                                                DSC Register
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

                                <div className="flex flex-col gap-3 w-full">
                                    {/* Search Input */}
                                    <div className="flex justify-end gap-2">
                                        <div className="relative flex justify-center items-center">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                placeholder="Search by name, mobile, email..."
                                                className="pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full lg:w-64"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            {/* Date Filter Component */}
                                            <div className="w-full lg:w-auto whitespace-nowrap">
                                                <DateFilter onChange={handleDateFilterChange} />
                                            </div>

                                            <div className="flex gap-2">
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
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[180px]">
                                            User Details
                                        </th>

                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[140px]">
                                            Validity Period
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">
                                            Status
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {dscData.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiUser className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No DSC records found</p>
                                                    <p className="text-slate-500 text-xs mb-4">Start by creating your first DSC entry</p>
                                                    <motion.button
                                                        onClick={() => setShowCreateModal(true)}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow transition-all duration-200"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Create Your First DSC
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((dsc, index) => {
                                            const isDropdownOpen = activeRowDropdown === dsc.dsc_id;
                                            const daysLeft = getDaysLeft(dsc.validity_end);
                                            const actualIndex = showAll ? index : (currentPage - 1) * itemsPerPage + index;
                                            const profileLink = getUserProfileLink(dsc);

                                            return (
                                                <motion.tr
                                                    key={dsc.dsc_id}
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
                                                        <motion.a
                                                            href={profileLink}
                                                            onClick={(e) => handleUserProfileClick(e, dsc)}
                                                            className="inline-flex items-center justify-center gap-2 group cursor-pointer no-underline"
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.99 }}
                                                        >
                                                            <div className="relative">
                                                                <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-blue-300 transition-colors">
                                                                    <FiUser className="w-4 h-4 text-blue-600" />
                                                                </div>
                                                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                                                                    <FiExternalLink className="w-2.5 h-2.5 text-blue-500" />
                                                                </div>
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-slate-800 font-semibold text-xs group-hover:text-blue-600 transition-colors">
                                                                    {dsc.name}
                                                                </div>
                                                                <div className="text-slate-600 text-[10px] mt-0.5">
                                                                    C/O: {dsc.guardian_name}
                                                                </div>
                                                                <div className="mt-1">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${dsc.user_type === 'user' ? 'bg-blue-100 text-blue-700 group-hover:bg-blue-200' :
                                                                        dsc.user_type === 'ca' ? 'bg-purple-100 text-purple-700 group-hover:bg-purple-200' :
                                                                            dsc.user_type === 'agent' ? 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200' :
                                                                                'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                                                                        } transition-colors`}>
                                                                        {dsc.user_type}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </motion.a>
                                                    </td>

                                                    <td className="text-center p-3 align-middle">
                                                        <div className="space-y-2">
                                                            <span className="inline-flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 font-bold px-3 py-1.5 rounded text-xs min-w-[120px] shadow-xs">
                                                                {formatDate(dsc.validity_start)} - {formatDate(dsc.validity_end)}
                                                            </span>
                                                            <div className="text-indigo-600 text-[10px] font-semibold">
                                                                ({dsc.duration} Year{dsc.duration > 1 ? 's' : ''})
                                                            </div>
                                                            {daysLeft <= 90 && (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${getUrgencyBadgeClass(daysLeft)}`}>
                                                                    <FiClock className="w-2.5 h-2.5" />
                                                                    {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(dsc.status)}`}>
                                                            {dsc.status === 1 ? (
                                                                <>
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                                    Active
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                                                    Inactive
                                                                </>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle ">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="dropdown-container relative flex justify-center">
                                                                <motion.button
                                                                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                    onClick={() => toggleRowDropdown(dsc.dsc_id)}
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
                                                                                    onClick={() => {
                                                                                        setActiveRowDropdown(null);
                                                                                        handleEditClick(dsc);
                                                                                    }}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                >
                                                                                    <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                        <FiEdit className="w-3 h-3 text-blue-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Edit DSC</div>
                                                                                    </div>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setActiveRowDropdown(null);
                                                                                        handleDeleteClick(dsc.dsc_id);  // ← Pass dsc_id
                                                                                    }}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-red-50 transition-colors duration-150 group"
                                                                                >
                                                                                    <div className="p-1 bg-red-50 rounded mr-2 group-hover:bg-red-100 transition-colors">
                                                                                        <FiTrash2 className="w-3 h-3 text-red-500" />  {/* Add FiTrash2 to imports */}
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium text-red-700">Delete DSC</div>
                                                                                    </div>
                                                                                </button>

                                                                                <a
                                                                                    href={profileLink}
                                                                                    onClick={(e) => {
                                                                                        setActiveRowDropdown(null);
                                                                                        handleUserProfileClick(e, dsc);
                                                                                    }}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                >
                                                                                    <div className="p-1 bg-emerald-50 rounded mr-2">
                                                                                        <FiUser className="w-3 h-3 text-emerald-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">View Profile</div>
                                                                                    </div>
                                                                                </a>
                                                                                <div className="border-t border-slate-100 mt-1 pt-1">
                                                                                    <button
                                                                                        onClick={() => handleExport('print', dsc)}
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
                                                                                        onClick={() => handleExport('whatsapp', dsc)}
                                                                                        className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    >
                                                                                        <div className="p-1 bg-green-50 rounded mr-2">
                                                                                            <FiMessageSquare className="w-3 h-3 text-green-500" />
                                                                                        </div>
                                                                                        <div className="text-left">
                                                                                            <div className="font-medium">WhatsApp</div>
                                                                                        </div>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleExport('email', dsc)}
                                                                                        className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
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
                                                            <div className="flex justify-center">
                                                                <motion.button
                                                                    onClick={() => handleViewDetails(dsc)}  // ← Pass current row dsc
                                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    title="View Details"
                                                                >
                                                                    <FiEye className="w-4 h-4" />
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

                            {/* view details modal */}
                            <AnimatePresence>
                                {showDetailsModal && selectedDetailDsc && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                        onClick={() => setShowDetailsModal(false)} // Close on backdrop
                                    >
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.9, opacity: 0 }}
                                            className="bg-white rounded-2xl max-w-2xl max-h-[90vh] w-full overflow-y-auto shadow-2xl border border-slate-200"
                                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                                        >
                                            {/* Modal Header */}
                                            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl z-10">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                        <FiEye className="w-6 h-6 text-blue-600" />
                                                        DSC Details
                                                    </h3>
                                                    <motion.button
                                                        onClick={() => setShowDetailsModal(false)}
                                                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FiX className="w-5 h-5" />
                                                    </motion.button>
                                                </div>
                                            </div>

                                            {/* Details Content */}
                                            <div className="p-8 space-y-6">
                                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                        <FiCreditCard className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 text-lg">{selectedDetailDsc.companyName}</div>
                                                        <div className="text-sm text-slate-600">DSC ID: {selectedDetailDsc.dsc_id}</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-3">

                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <span className="text-slate-500 block text-xs uppercase tracking-wide font-medium mb-1">Issue Date</span>
                                                                <span className="font-medium text-slate-900">{selectedDetailDsc.validity_start}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 block text-xs uppercase tracking-wide font-medium mb-1">Expire Date</span>
                                                                <span className="font-medium text-slate-900">{selectedDetailDsc.validity_end}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 block text-xs uppercase tracking-wide font-medium mb-1">Duration</span>
                                                                <span className="font-medium text-slate-900">{selectedDetailDsc.duration} Years</span>
                                                            </div>
                                                            {selectedDetailDsc.password && (
                                                                <div>
                                                                    <span className="text-slate-500 block text-xs uppercase tracking-wide font-medium mb-1">Password</span>
                                                                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-sm text-slate-900">{selectedDetailDsc.password}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <h4 className="font-semibold text-slate-900 mb-2">Client Information</h4>
                                                            <div className="space-y-2 text-sm">
                                                                <div><span className="text-slate-500">Name:</span> {selectedDetailDsc.name}</div>
                                                                {selectedDetailDsc.guardian_name && (
                                                                    <div><span className="text-slate-500">Guardian:</span> {selectedDetailDsc.guardian_name}</div>
                                                                )}
                                                                <div><span className="text-slate-500">Mobile:</span> {selectedDetailDsc.mobile}</div>
                                                                <div><span className="text-slate-500">Email:</span> {selectedDetailDsc.email}</div>
                                                                <div><span className="text-slate-500">Type:</span> <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">{selectedDetailDsc.typeName}</span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>


                            {/* Pagination Controls */}
                            {dscData.length > itemsPerPage && !showAll && (
                                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                                    <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 gap-3">
                                        <div className="text-xs text-slate-600">
                                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, dscData.length)} of {dscData.length} entries
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
                            {showAll && dscData.length > itemsPerPage && (
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
                                            <span className="font-semibold text-slate-800">Summary:</span> Total {dscData.length} DSC records •
                                            <span className="text-emerald-600 font-medium ml-2">Active: {dscData.filter(d => d.status === 1).length}</span> •
                                            <span className="text-rose-600 font-medium ml-2">Inactive: {dscData.filter(d => d.status === 0).length}</span>
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

            {/* Create DSC Modal */}
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
                                        <h3 className="text-lg font-bold text-slate-800">Create New DSC</h3>
                                        <p className="text-slate-600 text-xs mt-1">Fill in the details to create a new DSC register entry</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setCreateForm({
                                            username: '',
                                            company: '',
                                            duration: '1',
                                            validity_start: '',
                                            validity_end: '',
                                            password: ''
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
                                        {/* Company */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Company <span className="text-rose-500">*</span>
                                            </label>
                                            <SearchableSelectOptions
                                                options={companies}
                                                value={createForm.company}
                                                onChange={(val) => handleCreateChange("company", val)}
                                                placeholder={companyLoading ? "Loading..." : "Select a Company"}
                                            />

                                            <input
                                                type="hidden"
                                                value={createForm.company}
                                                required
                                            />

                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Type <span className="text-rose-500">*</span>
                                            </label>

                                            <SearchableSelectOptions
                                                options={types}
                                                value={createForm.type}
                                                onChange={(val) => handleCreateChange("type", val)}
                                                placeholder={typeLoading ? "Loading..." : "Select a Type"}
                                            />

                                            {/* Hidden input for required validation */}
                                            <input
                                                type="hidden"
                                                value={createForm.type}
                                                required
                                            />
                                        </div>



                                        {/* Duration */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Duration <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={createForm.duration}
                                                    onChange={(e) => handleCreateChange('duration', e.target.value)}
                                                    className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors appearance-none bg-white"
                                                    required
                                                >
                                                    <option value="1">1 Year</option>
                                                    <option value="2">2 Years</option>
                                                    <option value="3">3 Years</option>
                                                </select>
                                                <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Issue Date */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Issue Date <span className="text-rose-500">*</span>
                                            </label>
                                            <DatePickerComponent
                                                selectedDate={
                                                    createForm.validity_start
                                                        ? moment(createForm.validity_start, 'DD/MM/YYYY').toDate()
                                                        : null
                                                }
                                                onDateChange={(date) => {
                                                    const formattedDate = date ? moment(date).format('DD/MM/YYYY') : '';
                                                    handleCreateChange('validity_start', formattedDate);
                                                }}
                                                placeholder="DD/MM/YYYY"
                                                error={createForm.errors?.validity_start || ''}
                                            />
                                        </div>



                                        {/* Expire Date */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Expire Date
                                            </label>
                                            <input
                                                type="text"
                                                value={createForm.validity_end}
                                                readOnly
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg bg-slate-50 outline-none cursor-not-allowed"
                                                placeholder="Auto-calculated"
                                            />
                                        </div>

                                        {/* Password */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Password
                                            </label>
                                            <input
                                                type="text"
                                                value={createForm.password}
                                                onChange={(e) => handleCreateChange('password', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                                placeholder="DSC Password"
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
                                                company: '',
                                                duration: '1',
                                                validity_start: '',
                                                validity_end: '',
                                                password: ''
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
                                        Create DSC
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit DSC Modal */}
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
                                        <h3 className="text-lg font-bold text-slate-800">Update DSC Register</h3>
                                        <p className="text-slate-600 text-xs mt-1">Modify the details of the selected DSC</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedDsc(null);
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
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            User Information
                                        </label>
                                        <div className="px-4 py-3 border border-slate-300 rounded-lg bg-slate-50">
                                            {selectedDsc && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <FiUser className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 text-sm">{selectedDsc.name}</div>
                                                        <div className="text-slate-600 text-xs">C/O: {selectedDsc.guardian_name}</div>
                                                        <div className="text-slate-600 text-xs">Mobile: {selectedDsc.mobile}</div>
                                                        <div className="text-slate-600 text-xs">Type: {selectedDsc.user_type}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Company */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Company <span className="text-rose-500">*</span>
                                            </label>
                                            <SearchableSelectOptions
                                                options={companies}
                                                value={editForm.company}
                                                onChange={(val) => handleEditChange("company", val)}
                                                placeholder={companyLoading ? "Loading..." : "Select a Company"}
                                                labelKey="name"
                                                valueKey="value"
                                            />

                                            <input
                                                type="hidden"
                                                value={editForm.company}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Type <span className="text-rose-500">*</span>
                                            </label>

                                            <SearchableSelectOptions
                                                options={types}
                                                value={editForm.type}
                                                onChange={(val) => handleEditChange("type", val)}
                                                placeholder={typeLoading ? "Loading..." : "Select a Type"}
                                                labelKey="name"   // your type API uses {name, value}
                                                valueKey="value"
                                            />

                                            <input
                                                type="hidden"
                                                value={editForm.type}
                                                required
                                            />
                                        </div>

                                        {/* Duration */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Duration <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={editForm.duration}
                                                    onChange={(e) => handleEditChange('duration', e.target.value)}
                                                    className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors appearance-none bg-white"
                                                    required
                                                >
                                                    <option value="1">1 Year</option>
                                                    <option value="2">2 Years</option>
                                                    <option value="3">3 Years</option>
                                                </select>
                                                <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Issue Date */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Issue Date <span className="text-rose-500">*</span>
                                            </label>
                                            <DatePickerComponent
                                                selectedDate={
                                                    editForm.validity_start
                                                        ? moment(editForm.validity_start, 'DD/MM/YYYY').toDate()
                                                        : null
                                                }
                                                onDateChange={(date) => {
                                                    const formattedDate = date ? moment(date).format('DD/MM/YYYY') : '';
                                                    handleEditChange('validity_start', formattedDate);
                                                }}
                                                placeholder="DD/MM/YYYY"
                                                error={editForm.errors?.validity_start || ''}
                                            />
                                        </div>


                                        {/* Expire Date */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Expire Date
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.validity_end}
                                                readOnly
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg bg-slate-50 outline-none cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Password */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                                Password
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.password}
                                                onChange={(e) => handleEditChange('password', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200 sticky bottom-0 bg-white">
                                    <motion.button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setSelectedDsc(null);
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
                                        className={`px-5 py-2.5 text-xs font-semibold text-white rounded-lg transition-all duration-200 ${loading
                                            ? 'bg-slate-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow'
                                            }`}
                                        whileHover={loading ? {} : { scale: 1.02 }}
                                        whileTap={loading ? {} : { scale: 0.98 }}
                                    >
                                        {loading ? 'Updating...' : 'Update DSC'}
                                    </motion.button>
                                </div>
                            </form>
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
                {deleteConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setDeleteConfirmModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                                    <FiTrash2 className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Delete DSC?</h3>
                                <p className="text-slate-600 mb-6">
                                    This action cannot be undone. DSC ID <strong>{dscToDelete}</strong> will be permanently deleted.
                                </p>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <motion.button
                                    onClick={() => setDeleteConfirmModal(false)}
                                    className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    onClick={handleDeleteSubmit}
                                    className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg rounded-lg transition-all"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    Delete
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default ViewDSCRegister;

