import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiUsers, FiCheckCircle, FiSearch, FiMoreVertical, FiEye, FiXCircle, FiEdit, FiTrash2 } from 'react-icons/fi';
import { Header, Sidebar } from '../../components/header';
import getHeaders from "../../utils/get-headers";
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const GroupFirms = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    // Main states
    const [loading, setLoading] = useState(false);
    const [firms, setFirms] = useState([]);
    const [filteredFirms, setFilteredFirms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [firmIds, setFirmIds] = useState(['']);

    // Action states - NEW
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeDropdownFirmId, setActiveDropdownFirmId] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedFirm, setSelectedFirm] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [firmToDelete, setFirmToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFirm, setEditFirm] = useState(null);
    const [groupDetails, setGroupDetails] = useState(null);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedFirms, setSelectedFirms] = useState([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);



    const [searchParams] = useSearchParams();
    const groupId = searchParams.get('group_id');
    const BASE_URL = 'https://api.ooms.in/api/v1';

    // Modal helper functions
    const addFirmIdField = () => setFirmIds([...firmIds, '']);
    const removeFirmIdField = (index) => {
        if (firmIds.length > 1) {
            setFirmIds(firmIds.filter((_, i) => i !== index));
        }
    };
    const updateFirmId = (index, value) => {
        const newFirmIds = [...firmIds];
        newFirmIds[index] = value;
        setFirmIds(newFirmIds);
    };

    // Dropdown toggle function - NEW
    const toggleDropdown = (firmId) => {
        if (activeDropdownFirmId === firmId) {
            setActiveDropdownFirmId(null);
            setIsDropdownOpen(false);
        } else {
            setActiveDropdownFirmId(firmId);
            setIsDropdownOpen(true);
        }
    };

    // Close dropdowns on outside click - NEW
    useEffect(() => {
        const handleClickOutside = () => {
            setIsDropdownOpen(false);
            setActiveDropdownFirmId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchGroupFirmsData = async (search = '', page = 1, limit = 20) => {
        if (!groupId) return;

        setLoading(true);
        try {
            const headers = getHeaders();
            console.log("headers=> " + JSON.stringify(headers));
            console.log(groupId)
            const response = await axios.get(`${BASE_URL}/group/group-firms/list`, {
                headers,
                params: {
                    group_id: groupId,
                    page: page.toString(),
                    limit: limit.toString(),
                    ...(search && { search })
                }
            });

            if (response.data.success) {
                const groupData = response.data.data.group;
                setGroupDetails(groupData);
                const mappedFirms = response.data.data.firms.map(firmData => ({
                    firm_id: firmData.firm.firm_id,
                    name: firmData.firm.firm_name,
                    gstin: firmData.firm.gst || '',
                    status: firmData.firm.status === '1' ? 'active' : 'inactive',
                    created_date: firmData.create_date ?
                        new Date(firmData.create_date).toISOString().split('T')[0] : '',
                    unique_id: firmData.unique_id
                }));

                setFirms(mappedFirms);
                setFilteredFirms(mappedFirms);
            } else {
                setFirms([]);
                setFilteredFirms([]);
            }
        } catch (error) {
            console.error('Fetch Firms Error:', error);
            setFirms([]);
            setFilteredFirms([]);
        } finally {
            setLoading(false);
        }
    };

    // Create firms - FIXED working version
    const handleCreateSubmit = async (e) => {
        e.preventDefault();

        const validFirmIds = firmIds.filter(id => id.trim()).map(id => id.trim());

        if (validFirmIds.length === 0) {
            alert('At least one firm ID is required');
            return;
        }

        try {
            setLoading(true);
            const headers = getHeaders();

            const response = await axios.post(`${BASE_URL}/group/add-firm`, {
                group_id: groupId,
                firm_ids: validFirmIds
            }, { headers });

            if (response.data.success) {
                fetchGroupFirmsData(searchTerm);
                setShowCreateModal(false);
                setFirmIds(['']);
            } else {
                alert('Failed: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Create error:', error);
            alert('Failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (firm) => {
        setEditFirm(firm);
        setShowEditModal(true);
        setIsDropdownOpen(false);
        setActiveDropdownFirmId(null);
    };


    // NEW: Open Delete Modal (replace handleDelete)
    const handleDeleteClick = (firm) => {
        setFirmToDelete(firm);
        setShowDeleteModal(true);
        setIsDropdownOpen(false);
        setActiveDropdownFirmId(null);
    };

    // NEW: Confirm Delete
    const handleConfirmDelete = async () => {
        if (!firmToDelete) return;

        setDeleteLoading(true);
        try {
            const headers = getHeaders();
            const response = await axios.delete(`${BASE_URL}/group/group-firms/remove`, {
                headers,
                data: {  // Send body with DELETE request
                    group_id: groupId,
                    firm_ids: [firmToDelete.firm_id]
                }
            });

            if (response.data.success) {
                fetchGroupFirmsData(searchTerm);
                setShowDeleteModal(false);
                setFirmToDelete(null);

                // Optional: Show success message with details from backend
                console.log('Firms removed:', response.data.data?.firms_removed);
            } else {
                window.alert('Failed: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Delete error:', error);
            window.alert('Failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setDeleteLoading(false);
        }
    };



    // NEW: Cancel Delete
    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setFirmToDelete(null);
    };

    // NEW: Handle View firm details
    const handleView = (firm) => {
        setSelectedFirm(firm);
        setShowViewModal(true);
        setIsDropdownOpen(false);
        setActiveDropdownFirmId(null);
    };


    // Toggle header checkbox (Select All)
    const handleSelectAll = () => {
        if (selectedFirms.length === filteredFirms.length) {
            setSelectedFirms([]);
        } else {
            const allIds = filteredFirms.map(f => f.firm_id);
            setSelectedFirms(allIds);
        }
    };

    // Toggle single firm checkbox
    const handleSelectFirm = (firmId) => {
        setSelectedFirms(prev =>
            prev.includes(firmId)
                ? prev.filter(id => id !== firmId)
                : [...prev, firmId]
        );
    };

    const handleBulkDelete = async () => {
        try {
            const headers = getHeaders();

            const response = await fetch(
                `${BASE_URL}/group/group-firms/remove`,
                {
                    method: "DELETE",
                    headers,
                    body: JSON.stringify({
                        group_id: groupDetails?.group_id,
                        firm_ids: selectedFirms
                    })
                }
            );

            const data = await response.json();

            if (data.success) {
                setSelectedFirms([]);
                setIsBulkMode(false);
                setShowBulkDeleteModal(false);
                fetchGroupFirmsData(searchTerm);
            }

        } catch (error) {
            console.error("Bulk delete error:", error);
        }
    };


    // Effects
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
        if (groupId) {
            fetchGroupFirmsData();
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.trim()) {
                fetchGroupFirmsData(searchTerm);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const summary = {
        totalFirms: filteredFirms.length,
        activeFirms: filteredFirms.filter(firm => firm.status === 'active').length,
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-GB');
    };

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

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="h-full flex flex-col">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {/* Group Name Card */}
                            {groupDetails && (
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-indigo-100 text-sm font-medium mb-1">Group Name</p>
                                            <h3 className="text-2xl font-bold">{groupDetails.group_name}</h3>
                                            <p className="text-indigo-200 text-xs mt-1">{groupDetails.group_remark}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                            <FiUsers className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Total Firms */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Total Firms</p>
                                        <h3 className="text-3xl font-bold text-gray-900">{summary.totalFirms}</h3>
                                    </div>
                                    <div className="p-3 bg-indigo-100 rounded-xl">
                                        <FiUsers className="w-7 h-7 text-indigo-600" />
                                    </div>
                                </div>
                            </div>

                            {/* Active Firms */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Active Firms</p>
                                        <h3 className="text-3xl font-bold text-emerald-600">{summary.activeFirms}</h3>
                                    </div>
                                    <div className="p-3 bg-emerald-100 rounded-xl">
                                        <FiCheckCircle className="w-7 h-7 text-emerald-600" />
                                    </div>
                                </div>
                            </div>

                            {/* Group Status */}
                            {groupDetails && (
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Group Status</p>
                                            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${groupDetails.is_active
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {groupDetails.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className={`p-3 rounded-xl ${groupDetails.is_active
                                            ? 'bg-emerald-100'
                                            : 'bg-red-100'
                                            }`}>
                                            {groupDetails.is_active ? (
                                                <FiCheckCircle className="w-7 h-7 text-emerald-600" />
                                            ) : (
                                                <FiXCircle className="w-7 h-7 text-red-600" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Main Table Card */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden">
                            {/* Header with Add Button */}
                            <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div>
                                        <h5 className="text-xl font-bold text-slate-800">
                                            {groupDetails?.group_name || 'Group Firms List'}
                                            <span className="text-sm font-normal text-slate-500 ml-2">
                                                ({groupDetails?.group_remark || 'GST Group'})
                                            </span>
                                        </h5>

                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Search firms..."
                                                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                                            />
                                        </div>
                                        <motion.button
                                            onClick={() => setShowCreateModal(true)}
                                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-lg"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Add Firms
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            {/* Table Content */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-gray-200">

                                    {/* Header Checkbox */}
                                    <div className="col-span-1 flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedFirms.length === filteredFirms.length && filteredFirms.length > 0}
                                            onChange={() => {
                                                setIsBulkMode(true);
                                                handleSelectAll();
                                            }}
                                            className="w-4 h-4"
                                        />
                                    </div>

                                    <div className="col-span-4 text-xs font-semibold text-gray-700 uppercase text-center">
                                        Firm Name
                                    </div>
                                    <div className="col-span-2 text-xs font-semibold text-gray-700 uppercase text-center">
                                        Status
                                    </div>
                                    <div className="col-span-3 text-xs font-semibold text-gray-700 uppercase text-center">
                                        GSTIN
                                    </div>
                                    <div className="col-span-2 text-xs font-semibold text-gray-700 uppercase text-center">
                                        Actions
                                    </div>
                                </div>


                                {/* Table Body */}
                                <div className="flex-1 overflow-y-auto">
                                    {loading ? (
                                        <div className="p-12 text-center">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                                            <p className="text-gray-500">Loading firms...</p>
                                        </div>
                                    ) : filteredFirms.length === 0 ? (
                                        <div className="text-center py-12">
                                            <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-500 text-lg font-medium mb-2">
                                                {firms.length === 0 ? 'No firms in this group' : 'No matching firms found'}
                                            </p>
                                            <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {filteredFirms.map((firm, index) => (
                                                <motion.div
                                                    key={firm.firm_id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="grid grid-cols-12 gap-2 px-5 py-4 hover:bg-gray-50 transition-colors group"
                                                >
                                                    <div className="col-span-1 flex items-center justify-center gap-2">

                                                        {isBulkMode && (
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedFirms.includes(firm.firm_id)}
                                                                onChange={() => handleSelectFirm(firm.firm_id)}
                                                                className="w-4 h-4"
                                                            />
                                                        )}

                                                        <span className="w-8 h-8 bg-gray-100 text-gray-700 font-semibold rounded-lg flex items-center justify-center text-xs">
                                                            {index + 1}
                                                        </span>

                                                    </div>

                                                    <div className="col-span-4 flex items-center">
                                                        <div className="font-semibold text-sm text-gray-800 truncate">
                                                            {firm.name}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-center">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${firm.status === 'active'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {firm.status === 'active' ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-3 flex items-center justify-center">
                                                        <span className="text-xs text-gray-600 truncate max-w-[120px]">
                                                            {firm.gstin || '—'}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-center">
                                                        <div className="dropdown-container relative">
                                                            <motion.button
                                                                className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 group-hover:bg-indigo-100/50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleDropdown(firm.firm_id);
                                                                }}
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                            >
                                                                <FiMoreVertical className="w-5 h-5" />
                                                            </motion.button>
                                                            <AnimatePresence>
                                                                {isDropdownOpen && activeDropdownFirmId === firm.firm_id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                        transition={{ duration: 0.15 }}
                                                                        className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                                                                    >
                                                                        <div className="py-1">
                                                                            {/* Edit Button */}
                                                                            <button
                                                                                onClick={() => handleEdit(firm)}
                                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200"
                                                                            >
                                                                                <FiEdit className="w-4 h-4 mr-3 text-indigo-500" />
                                                                                Edit Group
                                                                            </button>

                                                                            {/* Divider */}
                                                                            <div className="w-full h-px bg-gray-200 my-1"></div>

                                                                            {/* Delete Button */}
                                                                            <button
                                                                                onClick={() => handleDeleteClick(firm)}  // CHANGED: handleDeleteClick instead of handleDelete
                                                                                className="flex items-center w-full px-4 py-3 text-sm text-red-700 hover:bg-red-50 hover:text-red-800 transition-all duration-200"
                                                                            >
                                                                                <FiXCircle className="w-4 h-4 mr-3" />
                                                                                Delete
                                                                            </button>

                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                        {/* View Button */}
                                                        <button
                                                            onClick={() => handleView(firm)}
                                                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
                                                        >
                                                            <FiEye className="w-4 h-4 mr-3 text-blue-500" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="border-t border-gray-200 bg-gray-50 px-5 py-3">
                                        {isBulkMode && selectedFirms.length > 0 ? (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {selectedFirms.length} firm(s) selected
                                                </span>

                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setIsBulkMode(false);
                                                            setSelectedFirms([]);
                                                        }}
                                                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                                                    >
                                                        Cancel
                                                    </button>

                                                    <button
                                                        onClick={() => setShowBulkDeleteModal(true)}
                                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                                                    >
                                                        Delete Selected
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-600">
                                                Showing <span className="font-semibold">{filteredFirms.length}</span> of{" "}
                                                <span className="font-semibold">{firms.length}</span> firms
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-gray-800 mb-6">Add Firms to Group</h3>

                            <form onSubmit={handleCreateSubmit}>
                                <div className="mb-8">
                                    <label className="block text-sm font-semibold text-gray-700 mb-4">
                                        Firm IDs * (one per line)
                                    </label>
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {firmIds.map((firmId, index) => (
                                            <div key={index} className="flex items-end gap-2">
                                                <input
                                                    type="text"
                                                    value={firmId}
                                                    onChange={(e) => updateFirmId(index, e.target.value)}
                                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white outline-none transition-all"
                                                    placeholder="e.g., kxclx47hi9c6h362w4r1ml837u2qjxxij566y16g2v8"
                                                />
                                                {firmIds.length > 1 && (
                                                    <motion.button
                                                        type="button"
                                                        onClick={() => removeFirmIdField(index)}
                                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </motion.button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <motion.button
                                        type="button"
                                        onClick={addFirmIdField}
                                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border-2 border-dashed border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-all"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Add Another Firm ID
                                    </motion.button>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Enter existing firm IDs to add to this group
                                    </p>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                                    <motion.button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setFirmIds(['']);
                                        }}
                                        className="px-6 py-2.5 text-gray-700 hover:text-gray-900 rounded-xl text-sm font-medium transition-all border border-gray-300 hover:bg-gray-100"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Adding...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Add Firms
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {showEditModal && editFirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-gray-800 mb-6">Edit Firm in Group</h3>
                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Firm Name</label>
                                    <p className="text-lg font-semibold text-gray-900">{editFirm.name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Current Status</label>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${editFirm.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {editFirm.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                                <motion.button
                                    onClick={() => setShowEditModal(false)}
                                    className="px-6 py-2.5 text-gray-700 hover:text-gray-900 rounded-xl text-sm font-medium transition-all border border-gray-300 hover:bg-gray-100"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    Save Changes
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Modal - NEW */}
            <AnimatePresence>
                {showViewModal && selectedFirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-purple-200 max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-t-3xl p-6 pb-4 text-white relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20"></div>
                                <div className="relative z-10 flex items-start justify-between">
                                    <div>
                                        <h3 className="text-2xl font-bold">Group Details</h3>
                                        <p className="text-purple-100 text-sm mt-1">Firm Information</p>
                                    </div>
                                    <motion.button
                                        onClick={() => setShowViewModal(false)}
                                        className="p-2 hover:bg-white/20 rounded-2xl transition-all"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </motion.button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Group Name Row */}
                                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100">
                                    <div className="w-12 h-12 bg-white/50 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Firm Name</label>
                                        <p className="text-lg font-bold text-gray-900 truncate">{selectedFirm.name}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                                        <span className="text-xs font-semibold text-gray-700">CA</span>
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Firms Count</label>
                                        <p className="text-2xl font-bold text-gray-900">1</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Status</label>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">
                                            Active
                                        </span>
                                    </div>
                                </div>

                                {/* Remarks */}
                                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border-2 border-dashed border-yellow-200">
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Remark</label>
                                    <p className="text-sm text-gray-800 bg-white px-4 py-3 rounded-xl border border-gray-200 font-medium">
                                        {selectedFirm.gstin || 'CA Group'}
                                    </p>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Created</label>
                                        <p className="text-sm font-medium text-gray-900">{formatDate(selectedFirm.created_date) || '21/02/2026'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Updated</label>
                                        <p className="text-sm font-medium text-gray-900">{formatDate(selectedFirm.created_date) || '21/02/2026'}</p>
                                    </div>
                                </div>

                                {/* Firm ID */}
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Firm ID</label>
                                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                                        <p className="text-sm font-mono text-gray-800 break-all">{selectedFirm.firm_id}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-6 pt-4 border-t border-gray-200 bg-gray-50/50 rounded-b-3xl">
                                <motion.button
                                    onClick={() => setShowViewModal(false)}
                                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all text-sm"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Close
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && firmToDelete && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <FiXCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Remove Firm?</h3>
                                <p className="text-gray-600">
                                    Are you sure you want to remove <strong>"{firmToDelete.name}"</strong> from this group?
                                </p>
                            </div>

                            <div className="flex justify-between gap-3 pt-6 border-t border-gray-200">
                                <motion.button
                                    onClick={handleCancelDelete}
                                    disabled={deleteLoading}
                                    className="px-6 py-2.5 text-gray-700 hover:text-gray-900 rounded-xl text-sm font-medium transition-all border border-gray-300 hover:bg-gray-100"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    onClick={handleConfirmDelete}
                                    disabled={deleteLoading}
                                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    {deleteLoading ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Removing...
                                        </>
                                    ) : (
                                        <>
                                            <FiTrash2 className="w-4 h-4" />
                                            Remove Firm
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete bulk Confirmation Modal */}
            <AnimatePresence>
                {showBulkDeleteModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">
                                Confirm Bulk Delete
                            </h3>

                            <p className="text-sm text-gray-600 mb-6">
                                Are you sure you want to remove{" "}
                                <span className="font-semibold">
                                    {selectedFirms.length}
                                </span>{" "}
                                firm(s) from this group?
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowBulkDeleteModal(false)}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </AnimatePresence>

        </div>
    );
};

export default GroupFirms;
