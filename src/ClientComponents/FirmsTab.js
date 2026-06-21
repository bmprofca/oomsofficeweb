import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiBriefcase, FiEdit, FiTrash2, FiSearch, FiPlus, FiX, FiCheck, FiAlertCircle, FiEye, FiMapPin } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import { checkPermissionSync } from '../utils/permission-helper';
import {
    FirmModalShell,
    FirmFormFields,
    FirmViewDetails,
    ModalFooterActions,
} from '../components/Modals/FirmModalParts';

const getApiErrorMessage = (error, fallback = 'Something went wrong') => {
    if (error?.response?.data?.message) return String(error.response.data.message);
    if (error?.response) {
        const { status, data } = error.response;
        if (status === 400) return data?.message || 'Please check all required fields';
        if (status === 401) return 'Unauthorized. Please sign in again.';
        if (status === 404) return 'Endpoint not found. Please contact support.';
        if (status === 409) return 'A firm with these details already exists.';
        if (status === 500) return 'Server error. Please try again later.';
        return data?.message || `${fallback} (${status})`;
    }
    if (error?.request) return 'No response from server. Please check your connection.';
    return error?.message || fallback;
};

const FirmsTab = ({ clientUsername }) => {
    const [firms, setFirms] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedFirm, setSelectedFirm] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [loading, setLoading] = useState(false);
    const [savingFirm, setSavingFirm] = useState(false);
    const [statesAndDistricts, setStatesAndDistricts] = useState([]);
    const [statesLoading, setStatesLoading] = useState(true);
    const [newFirm, setNewFirm] = useState({
        name: '',
        type: 'proprietorship',
        pan: '',
        gst: '',
        file_no: '',
        tan: '',
        vat: '',
        cin: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        pincode: '',
        country: ''
    });
    const [editFirmData, setEditFirmData] = useState({
        name: '',
        type: 'proprietorship',
        pan: '',
        gst: '',
        file_no: '',
        tan: '',
        vat: '',
        cin: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        pincode: '',
        country: ''
    });



    // Fetch firms from API - UPDATED with correct field mapping
    const fetchFirms = useCallback(async () => {
        if (!clientUsername) {
            console.error('Client username is required to fetch firms');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            console.error('Cannot fetch firms: Missing authentication headers');
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get(
                `${API_BASE_URL}/client/details/firms/list?username=${clientUsername}`,
                { headers }
            );

            console.log('FULL Firms API Response:', response.data);

            if (response.data && response.data.success) {
                const firmsData = response.data.data.firms || [];

                // Map the API response to our component's expected format
                const mappedFirms = firmsData.map(firm => ({
                    ...firm,
                    // Map API field names to our component's expected field names
                    firm_id: firm.firm_id,
                    firm_name: firm.firm_name,
                    firm_type: firm.firm_type,
                    status: firm.status,
                    pan: firm.pan_no || '',  // Map pan_no to pan
                    gst: firm.gst_no || '',  // Map gst_no to gst
                    file_no: firm.file_no || '',
                    tan: firm.tan_no || '',  // Map tan_no to tan
                    cin: firm.cin_no || '',  // Map cin_no to cin
                    vat: firm.vat_no || '',  // Map vat_no to vat
                    address: firm.address || {
                        address_line_1: '',
                        address_line_2: '',
                        city: '',
                        state: '',
                        pincode: '',
                        country: ''
                    },
                    create_by: firm.create_by || {},
                    modify_by: firm.modify_by || {},
                    create_date: firm.create_date,
                    modify_date: firm.modify_date
                }));

                console.log('Mapped firms:', mappedFirms);
                setFirms(mappedFirms);
            } else {
                console.error('API Error:', response.data?.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Error fetching firms:', error);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
                toast.error(getApiErrorMessage(error, 'Failed to fetch firms'));
            } else if (error.request) {
                console.error('No response received:', error.request);
                toast.error('No response from server. Please check your connection.');
            } else {
                console.error('Request setup error:', error.message);
                toast.error(error.message || 'Failed to fetch firms');
            }
        } finally {
            setLoading(false);
        }
    }, [clientUsername]);

    // Initial fetch
    useEffect(() => {
        if (clientUsername) {
            fetchFirms();
        }
    }, [clientUsername, fetchFirms]);

    // Filter firms based on search + status
    const filteredFirms = firms.filter(firm =>
        firm.firm_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        firm.pan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        firm.gst?.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter((firm) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') return !!firm.status;
        return !firm.status;
    });

    useEffect(() => {
        let mounted = true;
        const fetchStatesAndDistricts = async () => {
            setStatesLoading(true);
            try {
                const headers = getHeaders();
                if (!headers) return;
                const response = await axios.get(`${API_BASE_URL}/utils/states-and-districts`, { headers });
                if (mounted && response.data?.success && Array.isArray(response.data.data)) {
                    setStatesAndDistricts(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching states and districts:', error);
            } finally {
                if (mounted) setStatesLoading(false);
            }
        };
        fetchStatesAndDistricts();
        return () => { mounted = false; };
    }, []);

    // Create new firm
    const handleAddFirm = async () => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Please sign in again.');
            return;
        }

        try {
            setSavingFirm(true);
            const requestBody = {
                username: clientUsername, // Client username is required
                type: newFirm.type,
                pan: newFirm.pan,
                firm: newFirm.name,
                gst: newFirm.gst || null,
                tan: newFirm.tan || null,
                vat: newFirm.vat || null,
                cin: newFirm.cin || null,
                file: newFirm.file_no,
                address: {
                    state: newFirm.state || '',
                    district: newFirm.city || '',
                    town: newFirm.city || '',
                    pincode: newFirm.pincode || '',
                    address_line_1: newFirm.address_line_1 || '',
                    address_line_2: newFirm.address_line_2 || ''
                },
                groups: [] // You can make this configurable if needed
            };

            console.log('Creating firm with data:', requestBody);
            console.log('Using endpoint:', `${API_BASE_URL}/client/details/firms/create`);

            const response = await axios.post(
                `${API_BASE_URL}/client/details/firms/create`,
                requestBody,
                { headers }
            );

            console.log('Create firm response:', response.data);

            if (response.data && response.data.success) {
                // Refresh firms list
                fetchFirms();
                setShowAddModal(false);
                // Reset form
                setNewFirm({
                    name: '',
                    type: 'proprietorship',
                    pan: '',
                    gst: '',
                    file_no: '',
                    tan: '',
                    vat: '',
                    cin: '',
                    address_line_1: '',
                    address_line_2: '',
                    city: '',
                    state: '',
                    pincode: '',
                    country: ''
                });
                toast.success(response.data?.message || 'Firm created successfully');
            } else {
                toast.error(response.data?.message || 'Failed to create firm');
            }
        } catch (error) {
            console.error('Error creating firm:', error);
            toast.error(getApiErrorMessage(error, 'Failed to create firm'));
        } finally {
            setSavingFirm(false);
        }
    };

    // Edit firm
    const handleEditFirm = async () => {
        if (!selectedFirm?.firm_id) {
            toast.error('No firm selected for editing');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            toast.error('Please sign in again.');
            return;
        }

        try {
            setSavingFirm(true);
            const requestBody = {
                firm_id: selectedFirm.firm_id,
                username: clientUsername,
                type: editFirmData.type,
                pan: editFirmData.pan,
                firm: editFirmData.name,
                gst: editFirmData.gst || null,
                tan: editFirmData.tan || null,
                vat: editFirmData.vat || null,
                cin: editFirmData.cin || null,
                file: editFirmData.file_no,
                address: {
                    state: editFirmData.state || '',
                    district: editFirmData.city || '',
                    town: editFirmData.city || '',
                    pincode: editFirmData.pincode || '',
                    address_line_1: editFirmData.address_line_1 || '',
                    address_line_2: editFirmData.address_line_2 || ''
                },
                groups: [] // You can make this configurable if needed
            };

            console.log('Updating firm with data:', requestBody);
            console.log('Using endpoint:', `${API_BASE_URL}/client/details/firms/edit`);

            const response = await axios.post(
                `${API_BASE_URL}/client/details/firms/edit`,
                requestBody,
                { headers }
            );

            console.log('Update firm response:', response.data);

            if (response.data && response.data.success) {
                // Refresh firms list
                fetchFirms();
                setShowEditModal(false);
                toast.success(response.data?.message || 'Firm updated successfully');
            } else {
                toast.error(response.data?.message || 'Failed to update firm');
            }
        } catch (error) {
            console.error('Error updating firm:', error);
            toast.error(getApiErrorMessage(error, 'Failed to update firm'));
        } finally {
            setSavingFirm(false);
        }
    };

    // Delete firm
    const deleteFirm = async () => {
        if (!selectedFirm?.firm_id) {
            toast.error('No firm selected for deletion');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            toast.error('Please sign in again.');
            return;
        }

        try {
            setSavingFirm(true);
            const response = await axios.delete(
                `${API_BASE_URL}/client/details/firms/delete/${selectedFirm.firm_id}`,
                {
                    headers,
                    data: { username: clientUsername }
                }
            );

            if (response.data && response.data.success) {
                // Remove from local state
                setFirms(firms.filter(firm => firm.firm_id !== selectedFirm.firm_id));
                setShowDeleteModal(false);
                toast.success(response.data?.message || 'Firm deleted successfully');
            } else {
                toast.error(response.data?.message || 'Failed to delete firm');
            }
        } catch (error) {
            console.error('Error deleting firm:', error);
            toast.error(getApiErrorMessage(error, 'Failed to delete firm'));
        } finally {
            setSavingFirm(false);
        }
    };

    // Toggle firm status (Active/Inactive)
    const toggleStatus = async (firmId) => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Please sign in again.');
            return;
        }

        try {
            const firmToUpdate = firms.find(f => f.firm_id === firmId);
            if (!firmToUpdate) return;

            const newStatus = !firmToUpdate.status;

            const response = await axios.post(
                `${API_BASE_URL}/client/details/firms/status`,
                {
                    firm_id: firmId,
                    username: clientUsername,
                    status: newStatus
                },
                { headers }
            );

            if (response.data && response.data.success) {
                setFirms(firms.map(firm =>
                    firm.firm_id === firmId ? { ...firm, status: newStatus } : firm
                ));
                toast.success(
                    response.data?.message ||
                    `Firm marked as ${newStatus ? 'active' : 'inactive'}`
                );
            } else {
                toast.error(response.data?.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating firm status:', error);
            toast.error(getApiErrorMessage(error, 'Failed to update firm status'));
        }
    };

    const openEditModal = (firm) => {
        console.log('Opening edit modal with firm data:', firm);

        setSelectedFirm(firm);
        setEditFirmData({
            name: firm.firm_name || '',
            type: firm.firm_type || 'proprietorship',
            pan: firm.pan || '',
            gst: firm.gst || '',
            file_no: firm.file_no || '',
            tan: firm.tan || '',
            vat: firm.vat || '',
            cin: firm.cin || '',
            address_line_1: firm.address?.address_line_1 || '',
            address_line_2: firm.address?.address_line_2 || '',
            city: firm.address?.district || firm.address?.city || '',
            state: firm.address?.state || '',
            pincode: firm.address?.pincode || '',
            country: firm.address?.country || ''
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (firm) => {
        setSelectedFirm(firm);
        setShowDeleteModal(true);
    };

    const openViewModal = (firm) => {
        setSelectedFirm(firm);
        setShowViewModal(true);
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    };

    // Stats calculation
    const totalFirms = firms.length;
    const activeFirms = firms.filter(f => f.status).length;
    const inactiveFirms = totalFirms - activeFirms;
    const stateOptions = statesAndDistricts.map((item) => item.name);
    const addDistrictOptions = statesAndDistricts.find((item) => item.name === newFirm.state)?.districts || [];
    const editDistrictOptions = statesAndDistricts.find((item) => item.name === editFirmData.state)?.districts || [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-xl p-6"
        >
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 gap-4">
                <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                        Business Firms
                    </h3>
                    <p className="text-xs text-slate-600">Manage and organize all client business entities in one place</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-[18rem]">
                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                            <FiSearch className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name or PAN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                        />
                    </div>
                    {checkPermissionSync('client_edit') && (
                        <motion.button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md hover:shadow-md transition-all duration-200 text-sm font-semibold"
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <FiPlus className="w-4 h-4" />
                            Add New Firm
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`w-full text-left bg-white p-4 rounded-xl border shadow-sm transition-all ${statusFilter === 'active' ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-emerald-200'}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Active Firms</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{activeFirms}</p>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                            <FiCheck className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => setStatusFilter('inactive')}
                    className={`w-full text-left bg-white p-4 rounded-xl border shadow-sm transition-all ${statusFilter === 'inactive' ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200 hover:border-rose-200'}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Inactive Firms</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{inactiveFirms}</p>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-r from-gray-100 to-slate-100 rounded-lg flex items-center justify-center">
                            <FiAlertCircle className="w-5 h-5 text-slate-600" />
                        </div>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`w-full text-left bg-white p-4 rounded-xl border shadow-sm transition-all ${statusFilter === 'all' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-200'}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">All Firms</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{totalFirms}</p>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                            <FiBriefcase className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </button>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">Loading firms...</h3>
                    <p className="text-slate-600">Please wait while we fetch your firm data</p>
                </div>
            ) : (
                /* Firms List */
                <div className="space-y-3">
                    {filteredFirms.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                <FiBriefcase className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-800 mb-2">
                                {firms.length === 0 ? 'No firms found' : 'No matching firms'}
                            </h3>
                            <p className="text-slate-600">
                                {firms.length === 0 ? 'Add a new firm to get started' : 'Try adjusting your search'}
                            </p>
                        </div>
                    ) : (
                        filteredFirms.map((firm, index) => (
                            <motion.div
                                key={firm.firm_id || index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                    <div className="min-w-0 flex items-start gap-3">
                                        <div className="w-11 h-11 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                                            <FiBriefcase className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="min-w-0 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-sm font-semibold text-slate-800 truncate">{firm.firm_name || 'Unnamed Firm'}</h4>
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${firm.status ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-slate-700'}`}>
                                                    {firm.status ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                                                <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1">
                                                    <span className="font-medium text-slate-500">Type: </span>
                                                    <span className="text-slate-900 font-semibold capitalize">
                                                        {firm.firm_type || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1">
                                                    <span className="font-medium text-slate-500">PAN: </span>
                                                    <span className="text-slate-900 font-semibold">{firm.pan || 'N/A'}</span>
                                                </div>
                                                <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1">
                                                    <span className="font-medium text-slate-500">GST: </span>
                                                    <span className="text-slate-900 font-semibold">{firm.gst || 'N/A'}</span>
                                                </div>
                                            </div>
                                            {firm.address && (
                                                <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                                                    <FiMapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                                    {[firm.address.address_line_1, firm.address.address_line_2, firm.address.city, firm.address.state, firm.address.pincode]
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* <motion.button
                                            onClick={() => toggleStatus(firm.firm_id)}
                                            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 ${firm.status
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25'
                                                : 'bg-gradient-to-r from-gray-500 to-slate-600 text-white hover:shadow-lg hover:shadow-gray-500/25'
                                            }`}
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            {firm.status ? 'Deactivate' : 'Activate'}
                                        </motion.button> */}
                                        <motion.button
                                            onClick={() => openViewModal(firm)}
                                            className="p-2.5 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 hover:shadow-sm rounded-lg transition-all duration-200"
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <FiEye className="w-4 h-4" />
                                        </motion.button>
                                        {checkPermissionSync('client_edit') && (
                                            <>
                                                <motion.button
                                                    onClick={() => openEditModal(firm)}
                                                    className="p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:shadow-sm rounded-lg transition-all duration-200"
                                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <FiEdit className="w-4 h-4" />
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => openDeleteModal(firm)}
                                                    className="p-2.5 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 hover:shadow-sm rounded-lg transition-all duration-200"
                                                    whileHover={{ scale: 1.1, rotate: -5 }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </motion.button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            )}

            <FirmModalShell
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                maxWidth="max-w-5xl"
                headerClass="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800"
                icon={FiPlus}
                title="Add new firm"
                subtitle="Register a firm for this client"
                footer={
                    <ModalFooterActions
                        onCancel={() => setShowAddModal(false)}
                        onConfirm={handleAddFirm}
                        confirmLabel="Add firm"
                        loading={savingFirm}
                        disabled={!newFirm.name?.trim() || !newFirm.pan?.trim()}
                    />
                }
            >
                <FirmFormFields
                    formData={newFirm}
                    setFormData={setNewFirm}
                    stateOptions={stateOptions}
                    districtOptions={addDistrictOptions}
                    statesLoading={statesLoading}
                />
            </FirmModalShell>

            <FirmModalShell
                open={showEditModal && !!selectedFirm}
                onClose={() => setShowEditModal(false)}
                maxWidth="max-w-5xl"
                headerClass="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600"
                icon={FiEdit}
                title="Edit firm"
                subtitle={selectedFirm?.firm_name ? `Updating ${selectedFirm.firm_name}` : 'Update firm details'}
                footer={
                    <ModalFooterActions
                        onCancel={() => setShowEditModal(false)}
                        onConfirm={handleEditFirm}
                        confirmLabel="Save changes"
                        confirmClass="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-200"
                        loading={savingFirm}
                        disabled={!editFirmData.name?.trim()}
                    />
                }
            >
                <FirmFormFields
                    formData={editFirmData}
                    setFormData={setEditFirmData}
                    stateOptions={stateOptions}
                    districtOptions={editDistrictOptions}
                    statesLoading={statesLoading}
                />
            </FirmModalShell>

            <FirmModalShell
                open={showViewModal && !!selectedFirm}
                onClose={() => setShowViewModal(false)}
                maxWidth="max-w-5xl"
                headerClass="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900"
                icon={FiEye}
                title="Firm details"
                subtitle={selectedFirm?.firm_name || 'View firm information'}
                footer={
                    <ModalFooterActions
                        onCancel={() => setShowViewModal(false)}
                        onConfirm={checkPermissionSync('client_edit') ? () => {
                            setShowViewModal(false);
                            if (selectedFirm) openEditModal(selectedFirm);
                        } : null}
                        cancelLabel="Close"
                        confirmLabel={checkPermissionSync('client_edit') ? "Edit firm" : null}
                        confirmClass="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-200"
                    />
                }
            >
                {selectedFirm && <FirmViewDetails firm={selectedFirm} formatDate={formatDate} />}
            </FirmModalShell>

            <FirmModalShell
                open={showDeleteModal && !!selectedFirm}
                onClose={() => setShowDeleteModal(false)}
                maxWidth="max-w-md"
                headerClass="bg-gradient-to-r from-red-500 to-rose-600"
                icon={FiTrash2}
                title="Delete firm"
                subtitle="This action cannot be undone"
                footer={
                    <ModalFooterActions
                        onCancel={() => setShowDeleteModal(false)}
                        onConfirm={deleteFirm}
                        confirmLabel="Delete firm"
                        confirmClass="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-200"
                        loading={savingFirm}
                    />
                }
            >
                <div className="py-2 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                        <FiAlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <p className="text-sm text-slate-600">
                        You are about to delete{' '}
                        <span className="font-semibold text-slate-900">{selectedFirm?.firm_name}</span>.
                        All associated data will be removed permanently.
                    </p>
                </div>
            </FirmModalShell>

        </motion.div>
    );
};

export default FirmsTab;