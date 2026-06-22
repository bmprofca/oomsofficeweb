import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiUsers, FiCheckCircle, FiSearch, FiMoreVertical, FiEye, FiXCircle, FiEdit, FiTrash2, FiUpload } from 'react-icons/fi';
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

    // Import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [importError, setImportError] = useState(null);



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

    const downloadSampleCSV = () => {
        const headers = [
            'Client Name', 'Mobile', 'Email', 'PAN', 'Gender', 'DOB', 'State', 'District', 'City', 'Pincode',
            'Care Of', 'Guardian', 'Firm Name', 'Business Type', 'GSTIN', 'Firm PAN',
            'Opening Balance', 'Opening Balance Type', 'Opening Balance Date'
        ];
        
        const row1 = [
            'Alice Smith', '9876543210', 'alice@example.com', 'ABCDE1234F', 'female', '1993-04-12', 
            'West Bengal', 'Cooch Behar', 'Cooch Behar', '736134', 'S/O', 'Robert Smith', 
            'Alice Smith', 'Individual', '19ABCDE1234F1Z5', 'ABCDE1234F', '500', 'credit', '2026-06-02'
        ];
        
        const row2 = [
            'John Doe', '9998887776', 'john.doe@example.com', 'WXYZS9876Q', 'male', '1988-11-23', 
            'Delhi', 'New Delhi', 'New Delhi', '110001', 'S/O', 'Arthur Doe', 
            'Doe Consulting', 'Proprietorship', '07WXYZS9876Q1Z9', 'WXYZS9876Q', '1200', 'debit', '2026-06-02'
        ];

        const csvContent = [
            headers.join(','),
            row1.join(','),
            row2.join(',')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sample_clients_import.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadBlankTemplate = () => {
        const headers = [
            'Client Name', 'Mobile', 'Email', 'PAN', 'Gender', 'DOB', 'State', 'District', 'City', 'Pincode',
            'Care Of', 'Guardian', 'Firm Name', 'Business Type', 'GSTIN', 'Firm PAN',
            'Opening Balance', 'Opening Balance Type', 'Opening Balance Date'
        ];
        
        const csvContent = headers.join(',') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'blank_clients_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImportFile(file);
            setPreviewData(null);
            setImportError(null);
        }
    };

    const handleImportPreview = async () => {
        if (!importFile) return;
        setImporting(true);
        setImportError(null);
        setPreviewData(null);
        
        try {
            const formData = new FormData();
            formData.append('group_id', groupId);
            formData.append('file', importFile);
            
            const response = await axios.post(`${BASE_URL}/group/import?preview=true`, formData, {
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (response.data.success) {
                setPreviewData(response.data.data);
            } else {
                setImportError(response.data.message || 'Validation failed');
            }
        } catch (error) {
            console.error('Preview error:', error);
            if (error.response?.data?.errors) {
                setPreviewData({
                    errors: error.response.data.errors,
                    invalid_count: error.response.data.errors.length,
                    total_rows: error.response.data.errors.length,
                    valid_count: 0
                });
            } else {
                setImportError(error.response?.data?.message || error.message || 'Failed to parse import file');
            }
        } finally {
            setImporting(false);
        }
    };

    const handleImportCommit = async () => {
        if (!importFile) return;
        setImporting(true);
        setImportError(null);
        
        try {
            const formData = new FormData();
            formData.append('group_id', groupId);
            formData.append('file', importFile);
            
            const response = await axios.post(`${BASE_URL}/group/import`, formData, {
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (response.data.success) {
                alert(response.data.message || 'Bulk import completed successfully');
                setShowImportModal(false);
                setImportFile(null);
                setPreviewData(null);
                fetchGroupFirmsData(searchTerm);
            } else {
                setImportError(response.data.message || 'Import failed');
            }
        } catch (error) {
            console.error('Import error:', error);
            if (error.response?.data?.errors) {
                setPreviewData({
                    errors: error.response.data.errors,
                    invalid_count: error.response.data.errors.length,
                    total_rows: error.response.data.errors.length,
                    valid_count: 0
                });
            } else {
                setImportError(error.response?.data?.message || error.message || 'Failed to complete import');
            }
        } finally {
            setImporting(false);
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
                                            onClick={() => {
                                                setShowImportModal(true);
                                                setImportFile(null);
                                                setPreviewData(null);
                                                setImportError(null);
                                            }}
                                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-lg"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Bulk Import
                                        </motion.button>
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

                {showImportModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="border-b border-gray-150 p-6 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Bulk Import Clients & Firms</h3>
                                    <p className="text-xs text-gray-500 mt-1">Import new or map existing clients and firms via spreadsheet</p>
                                </div>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 flex-1 overflow-y-auto space-y-6">
                                {/* Upload Box */}
                                {!previewData && (
                                    <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/30 transition-all flex flex-col items-center justify-center">
                                        <svg className="w-12 h-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-sm font-semibold text-slate-700 mb-1">
                                            Select spreadsheet file (.xlsx, .xls, .csv)
                                        </p>
                                        <p className="text-xs text-slate-400 mb-4">
                                            Ensure column headers map to Name, Mobile, Email, and PAN
                                        </p>
                                        <label className="cursor-pointer px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all">
                                            Choose File
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls,.csv"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                        {importFile && (
                                            <div className="mt-4 flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-semibold text-blue-700">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Import instructions and templates download */}
                                {!previewData && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                                    Import Guidelines & Templates
                                                </h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Use these templates to prepare your file</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={downloadBlankTemplate}
                                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
                                                >
                                                    <FiUpload className="w-3.5 h-3.5 rotate-180" />
                                                    Blank Template
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={downloadSampleCSV}
                                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
                                                >
                                                    <FiUpload className="w-3.5 h-3.5 rotate-180" />
                                                    Demo Template
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                            <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-2xs">
                                                <span className="font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                    Required Headers
                                                </span>
                                                <ul className="list-disc pl-4 text-slate-500 space-y-1">
                                                    <li><strong>Client Name</strong> (aliases: Name, Full Name)</li>
                                                    <li><strong>Mobile</strong> (aliases: Phone, Contact)</li>
                                                    <li><strong>Email</strong> (aliases: Email Address)</li>
                                                    <li><strong>PAN</strong> (aliases: PAN Number, pan_no)</li>
                                                </ul>
                                            </div>
                                            <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-2xs">
                                                <span className="font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                                    Optional Headers
                                                </span>
                                                <ul className="list-disc pl-4 text-slate-500 space-y-1">
                                                    <li><strong>Firm</strong>: Firm Name, Business Type, GSTIN</li>
                                                    <li><strong>Location</strong>: State, District, City, Pincode</li>
                                                    <li><strong>Personal</strong>: DOB, Gender, Care Of, Guardian</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Error Notification */}
                                {importError && (
                                    <div className="p-4 bg-red-50 border border-red-150 rounded-xl flex items-start gap-3">
                                        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div className="text-xs font-medium text-red-700">
                                            {importError}
                                        </div>
                                    </div>
                                )}

                                {/* Preview Data and Summary */}
                                {previewData && (
                                    <div className="space-y-6">
                                        {/* Metrics Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Rows</span>
                                                <span className="text-lg font-extrabold text-slate-700">{previewData.total_rows}</span>
                                            </div>
                                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                                                <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">Valid Rows</span>
                                                <span className="text-lg font-extrabold text-emerald-700">{previewData.valid_count}</span>
                                            </div>
                                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                                                <span className="text-[10px] uppercase font-bold text-red-600 block mb-0.5">Invalid Rows</span>
                                                <span className="text-lg font-extrabold text-red-700">{previewData.invalid_count}</span>
                                            </div>
                                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                                                <span className="text-[10px] uppercase font-bold text-blue-600 block mb-0.5">New Clients</span>
                                                <span className="text-lg font-extrabold text-blue-700">{previewData.new_clients_count}</span>
                                            </div>
                                            <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-center">
                                                <span className="text-[10px] uppercase font-bold text-purple-600 block mb-0.5">Matched</span>
                                                <span className="text-lg font-extrabold text-purple-700">{previewData.matched_clients_count}</span>
                                            </div>
                                        </div>

                                        {/* Validation Errors section */}
                                        {previewData.errors && previewData.errors.length > 0 && (
                                            <div className="border border-red-150 rounded-2xl overflow-hidden bg-red-50/20">
                                                <div className="bg-red-50 border-b border-red-150 px-4 py-3 flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                    <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide">Validation Failures</h4>
                                                </div>
                                                <div className="p-4 max-h-44 overflow-y-auto divide-y divide-red-100">
                                                    {previewData.errors.map((err, eIdx) => (
                                                        <div key={eIdx} className="py-2.5 first:pt-0 last:pb-0 text-xs flex items-start gap-3">
                                                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold">
                                                                Row {err.row}
                                                            </span>
                                                            <div className="flex-1">
                                                                {err.name && <div className="font-semibold text-slate-800 mb-0.5">{err.name}</div>}
                                                                <ul className="list-disc pl-4 text-red-700 space-y-0.5">
                                                                    {err.errors.map((msg, mIdx) => (
                                                                        <li key={mIdx}>{msg}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Matches section */}
                                        {previewData.matches && previewData.matches.length > 0 && (
                                            <div className="border border-purple-200 rounded-2xl overflow-hidden bg-purple-50/10">
                                                <div className="bg-purple-50 border-b border-purple-100 px-4 py-3 flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wide">Matched Existing Records</h4>
                                                </div>
                                                <div className="p-4 max-h-44 overflow-y-auto divide-y divide-purple-100/50">
                                                    {previewData.matches.map((m, mIdx) => (
                                                        <div key={mIdx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs gap-4">
                                                            <div>
                                                                <div className="font-bold text-slate-800">{m.name}</div>
                                                                <div className="text-[10px] text-slate-450 mt-0.5">PAN: {m.pan_number} · Row {m.row}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${m.already_in_group 
                                                                    ? 'bg-slate-50 border-slate-200 text-slate-400' 
                                                                    : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                                                                    {m.already_in_group ? 'Already in Group' : 'Mapping to Group'}
                                                                </span>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">{m.firm_name || 'Individual'}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Preview list */}
                                        {previewData.preview && previewData.preview.length > 0 && (
                                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">New Imports Preview</h4>
                                                </div>
                                                <div className="p-4 max-h-44 overflow-y-auto divide-y divide-slate-100">
                                                    {previewData.preview.map((p, pIdx) => (
                                                        <div key={pIdx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs gap-4">
                                                            <div>
                                                                <div className="font-bold text-slate-800">{p.name}</div>
                                                                <div className="text-[10px] text-slate-450 mt-0.5">PAN: {p.pan_number} · Mobile: {p.mobile}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold uppercase text-[9px]">
                                                                    New Client
                                                                </span>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">{p.firm?.firm_name || 'Individual'}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="border-t border-gray-150 p-6 bg-slate-50/50 flex justify-end gap-3 rounded-b-2xl">
                                <button
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportFile(null);
                                        setPreviewData(null);
                                        setImportError(null);
                                    }}
                                    disabled={importing}
                                    className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                {previewData ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                setPreviewData(null);
                                                setImportFile(null);
                                                setImportError(null);
                                            }}
                                            disabled={importing}
                                            className="px-5 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
                                        >
                                            Choose Another File
                                        </button>
                                        <button
                                            onClick={handleImportCommit}
                                            disabled={importing || (previewData.invalid_count > 0)}
                                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {importing ? (
                                                <>
                                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                    Importing...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Confirm & Commit Import
                                                </>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleImportPreview}
                                        disabled={importing || !importFile}
                                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {importing ? (
                                            <>
                                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                Validating...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Validate & Preview File
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

            </AnimatePresence>

        </div>
    );
};

export default GroupFirms;
