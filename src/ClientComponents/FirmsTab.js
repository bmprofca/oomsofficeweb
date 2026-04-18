import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiBriefcase, FiEdit, FiTrash2, FiSearch, FiPlus, FiX, FiCheck, FiAlertCircle, FiEye, FiUser, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import axios from 'axios';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";

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
    const [statesAndDistricts, setStatesAndDistricts] = useState([]);
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
                alert(`Error ${error.response.status}: ${error.response.data?.message || 'Failed to fetch firms'}`);
            } else if (error.request) {
                console.error('No response received:', error.request);
                alert('No response from server. Please check your connection.');
            } else {
                console.error('Request setup error:', error.message);
                alert(`Error: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    }, [clientUsername, getHeaders]);

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
            try {
                const headers = getHeaders();
                if (!headers) return;
                const response = await axios.get(`${API_BASE_URL}/utils/states-and-districts`, { headers });
                if (mounted && response.data?.success && Array.isArray(response.data.data)) {
                    setStatesAndDistricts(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching states and districts:', error);
            }
        };
        fetchStatesAndDistricts();
        return () => { mounted = false; };
    }, []);

    // Create new firm
    const handleAddFirm = async () => {
        const headers = getHeaders();
        if (!headers) {
            console.error('Cannot create firm: Missing authentication headers');
            return;
        }

        try {
            // Prepare the request body according to the API specification
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
                alert('Firm created successfully!');
            } else {
                alert(`Failed to create firm: ${response.data?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating firm:', error);

            // Detailed error logging
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
                console.error('Response headers:', error.response.headers);

                if (error.response.status === 400) {
                    alert(`Bad request: ${error.response.data?.message || 'Please check all required fields'}`);
                } else if (error.response.status === 401) {
                    alert('Unauthorized: Please check your authentication');
                } else if (error.response.status === 404) {
                    alert('Endpoint not found. Please check the API URL.');
                } else if (error.response.status === 409) {
                    alert('Firm already exists with these details.');
                } else if (error.response.status === 500) {
                    alert('Server error. Please try again later.');
                } else {
                    alert(`Error ${error.response.status}: ${error.response.data?.message || 'Failed to create firm'}`);
                }
            } else if (error.request) {
                console.error('No response received:', error.request);
                alert('No response from server. Please check your internet connection.');
            } else {
                console.error('Request setup error:', error.message);
                alert(`Error: ${error.message}`);
            }
        }
    };

    // Edit firm
    const handleEditFirm = async () => {
        if (!selectedFirm?.firm_id) {
            alert('No firm selected for editing');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            console.error('Cannot update firm: Missing authentication headers');
            return;
        }

        try {
            // Prepare the request body according to the API specification
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
                alert('Firm updated successfully!');
            } else {
                alert(`Failed to update firm: ${response.data?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating firm:', error);

            // Detailed error logging
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
                console.error('Response headers:', error.response.headers);

                if (error.response.status === 400) {
                    alert(`Bad request: ${error.response.data?.message || 'Please check all required fields'}`);
                } else if (error.response.status === 401) {
                    alert('Unauthorized: Please check your authentication');
                } else if (error.response.status === 404) {
                    alert('Endpoint not found. Please check the API URL.');
                } else if (error.response.status === 409) {
                    alert('Firm already exists with these details.');
                } else if (error.response.status === 500) {
                    alert('Server error. Please try again later.');
                } else {
                    alert(`Error ${error.response.status}: ${error.response.data?.message || 'Failed to update firm'}`);
                }
            } else if (error.request) {
                console.error('No response received:', error.request);
                alert('No response from server. Please check your internet connection.');
            } else {
                console.error('Request setup error:', error.message);
                alert(`Error: ${error.message}`);
            }
        }
    };

    // Delete firm
    const deleteFirm = async () => {
        if (!selectedFirm?.firm_id) {
            alert('No firm selected for deletion');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            console.error('Cannot delete firm: Missing authentication headers');
            return;
        }

        try {
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
                alert('Firm deleted successfully!');
            } else {
                alert(`Failed to delete firm: ${response.data?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error deleting firm:', error);
            if (error.response) {
                alert(`Error ${error.response.status}: ${error.response.data?.message || 'Failed to delete firm'}`);
            } else {
                alert('Error deleting firm. Please try again.');
            }
        }
    };

    // Toggle firm status (Active/Inactive)
    const toggleStatus = async (firmId) => {
        const headers = getHeaders();
        if (!headers) {
            console.error('Cannot update status: Missing authentication headers');
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
                // Update local state
                setFirms(firms.map(firm =>
                    firm.firm_id === firmId ? { ...firm, status: newStatus } : firm
                ));
            } else {
                alert(`Failed to update status: ${response.data?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating firm status:', error);
            alert('Error updating firm status. Please try again.');
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
            city: firm.address?.city || '',
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
                    <h3 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                        Business Firms
                    </h3>
                    <p className="text-xs text-gray-600 font-medium">Manage and organize all client business entities in one place</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-[18rem]">
                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                            <FiSearch className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name or PAN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                        />
                    </div>
                    <motion.button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md hover:shadow-md transition-all duration-200 text-sm font-semibold"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiPlus className="w-4 h-4" />
                        Add New Firm
                    </motion.button>
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
                            <p className="text-xs font-medium text-gray-600">Active Firms</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{activeFirms}</p>
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
                            <p className="text-xs font-medium text-gray-600">Inactive Firms</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{inactiveFirms}</p>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-r from-gray-100 to-slate-100 rounded-lg flex items-center justify-center">
                            <FiAlertCircle className="w-5 h-5 text-gray-600" />
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
                            <p className="text-xs font-medium text-gray-600">All Firms</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{totalFirms}</p>
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading firms...</h3>
                    <p className="text-gray-600">Please wait while we fetch your firm data</p>
                </div>
            ) : (
                /* Firms List */
                <div className="space-y-3">
                    {filteredFirms.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                <FiBriefcase className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {firms.length === 0 ? 'No firms found' : 'No matching firms'}
                            </h3>
                            <p className="text-gray-600">
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
                                                <h4 className="text-sm font-semibold text-gray-900 truncate">{firm.firm_name || 'Unnamed Firm'}</h4>
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${firm.status ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
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
                                                <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
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
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            )}

            {/* Add Firm Modal */}
            {showAddModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 shrink-0">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold">Add New Firm</h2>
                                    <p className="text-blue-100 text-sm mt-1">Enter firm details below</p>
                                </div>
                                <motion.button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                    whileHover={{ rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-6 h-6" />
                                </motion.button>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">Firm Name *</label>
                                    <input
                                        type="text"
                                        value={newFirm.name}
                                        onChange={(e) => setNewFirm({ ...newFirm, name: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                        placeholder="Enter firm name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">Business Type *</label>
                                    <select
                                        value={newFirm.type}
                                        onChange={(e) => setNewFirm({ ...newFirm, type: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                    >
                                        <option value="proprietorship">Proprietorship</option>
                                        <option value="partnership">Partnership</option>
                                        <option value="llp">LLP</option>
                                        <option value="private_limited">Private Limited</option>
                                        <option value="public_limited">Public Limited</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">PAN Number *</label>
                                    <input
                                        type="text"
                                        value={newFirm.pan}
                                        onChange={(e) => setNewFirm({ ...newFirm, pan: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                        placeholder="Enter PAN number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">GST Number</label>
                                    <input
                                        type="text"
                                        value={newFirm.gst}
                                        onChange={(e) => setNewFirm({ ...newFirm, gst: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                        placeholder="Enter GST number"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">File Number</label>
                                    <input
                                        type="text"
                                        value={newFirm.file_no}
                                        onChange={(e) => setNewFirm({ ...newFirm, file_no: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                        placeholder="Enter file number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">TAN Number</label>
                                    <input
                                        type="text"
                                        value={newFirm.tan}
                                        onChange={(e) => setNewFirm({ ...newFirm, tan: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                        placeholder="Enter TAN number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">CIN Number</label>
                                    <input
                                        type="text"
                                        value={newFirm.cin}
                                        onChange={(e) => setNewFirm({ ...newFirm, cin: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                        placeholder="Enter CIN number"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Address Line 1</label>
                                <input
                                    type="text"
                                    value={newFirm.address_line_1}
                                    onChange={(e) => setNewFirm({ ...newFirm, address_line_1: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                    placeholder="Enter address line 1"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Address Line 2</label>
                                <input
                                    type="text"
                                    value={newFirm.address_line_2}
                                    onChange={(e) => setNewFirm({ ...newFirm, address_line_2: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                    placeholder="Enter address line 2"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">State</label>
                                    <select
                                        value={newFirm.state}
                                        onChange={(e) => setNewFirm({ ...newFirm, state: e.target.value, city: '' })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                    >
                                        <option value="">Select state</option>
                                        {stateOptions.map((stateName) => (
                                            <option key={stateName} value={stateName}>{stateName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">District</label>
                                    <select
                                        value={newFirm.city}
                                        onChange={(e) => setNewFirm({ ...newFirm, city: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                        disabled={!newFirm.state}
                                    >
                                        <option value="">{newFirm.state ? 'Select district' : 'Select state first'}</option>
                                        {addDistrictOptions.map((district) => (
                                            <option key={district} value={district}>{district}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">Pincode</label>
                                    <input
                                        type="text"
                                        value={newFirm.pincode}
                                        onChange={(e) => setNewFirm({ ...newFirm, pincode: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                        placeholder="Enter pincode"
                                    />
                                </div>
                            </div>
                        </div>
                        </div>
                        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3 shrink-0">
                            <motion.button
                                onClick={() => setShowAddModal(false)}
                                className="px-6 py-3 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                onClick={handleAddFirm}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Add Firm
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Edit Firm Modal */}
            {showEditModal && selectedFirm && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 shrink-0">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold">Edit Firm Details</h2>
                                    <p className="text-blue-100 text-sm mt-1">Update firm information</p>
                                </div>
                                <motion.button
                                    onClick={() => setShowEditModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                    whileHover={{ rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-6 h-6" />
                                </motion.button>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">Firm Name</label>
                                    <input
                                        type="text"
                                        value={editFirmData.name}
                                        onChange={(e) => setEditFirmData({ ...editFirmData, name: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">Business Type</label>
                                    <select
                                        value={editFirmData.type}
                                        onChange={(e) => setEditFirmData({ ...editFirmData, type: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                    >
                                        <option value="proprietorship">Proprietorship</option>
                                        <option value="partnership">Partnership</option>
                                        <option value="llp">LLP</option>
                                        <option value="private_limited">Private Limited</option>
                                        <option value="public_limited">Public Limited</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">PAN Number</label>
                                    <input
                                        type="text"
                                        value={editFirmData.pan}
                                        onChange={(e) => setEditFirmData({ ...editFirmData, pan: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">GST Number</label>
                                    <input
                                        type="text"
                                        value={editFirmData.gst}
                                        onChange={(e) => setEditFirmData({ ...editFirmData, gst: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">File Number</label>
                                    <input
                                        type="text"
                                        value={editFirmData.file_no}
                                        onChange={(e) => setEditFirmData({ ...editFirmData, file_no: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">TAN Number</label>
                                    <input
                                        type="text"
                                        value={editFirmData.tan}
                                        onChange={(e) => setEditFirmData({ ...editFirmData, tan: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">CIN Number</label>
                                    <input
                                        type="text"
                                        value={editFirmData.cin}
                                        onChange={(e) => setEditFirmData({ ...editFirmData, cin: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Address Line 1</label>
                                <input
                                    type="text"
                                    value={editFirmData.address_line_1}
                                    onChange={(e) => setEditFirmData({ ...editFirmData, address_line_1: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Address Line 2</label>
                                <input
                                    type="text"
                                    value={editFirmData.address_line_2}
                                    onChange={(e) => setEditFirmData({ ...editFirmData, address_line_2: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">State</label>
                                    <select
                                        value={editFirmData.state}
                                        onChange={(e) => setEditFirmData({ ...editFirmData, state: e.target.value, city: '' })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                    >
                                        <option value="">Select state</option>
                                        {stateOptions.map((stateName) => (
                                            <option key={stateName} value={stateName}>{stateName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">District</label>
                                    <select
                                        value={editFirmData.city}
                                        onChange={(e) => setEditFirmData({ ...editFirmData, city: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                        disabled={!editFirmData.state}
                                    >
                                        <option value="">{editFirmData.state ? 'Select district' : 'Select state first'}</option>
                                        {editDistrictOptions.map((district) => (
                                            <option key={district} value={district}>{district}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">Pincode</label>
                                    <input
                                        type="text"
                                        value={editFirmData.pincode}
                                        onChange={(e) => setEditFirmData({ ...editFirmData, pincode: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        </div>
                        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3 shrink-0">
                            <motion.button
                                onClick={() => setShowEditModal(false)}
                                className="px-6 py-3 text-gray-600 hover:bg-gray-200 rounded-xl font-medium"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                onClick={handleEditFirm}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Update Firm
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* View Firm Modal */}
            {showViewModal && selectedFirm && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 shrink-0">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold">Firm Details</h2>
                                    <p className="text-blue-100 text-sm mt-1">Complete information about the firm</p>
                                </div>
                                <motion.button
                                    onClick={() => setShowViewModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                    whileHover={{ rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-6 h-6" />
                                </motion.button>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <div className="p-6 space-y-6">
                            {/* Firm Overview */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Firm Overview</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">Firm Name</label>
                                        <p className="text-gray-900 font-semibold">{selectedFirm.firm_name || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">Business Type</label>
                                        <p className="text-gray-900 font-semibold capitalize">{selectedFirm.firm_type || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">Status</label>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedFirm.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {selectedFirm.status ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">Firm ID</label>
                                        <p className="text-gray-900 font-mono text-sm">{selectedFirm.firm_id || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">Client Username</label>
                                        <p className="text-gray-900 font-mono text-sm">{selectedFirm.username || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Registration Details */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Registration Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">PAN Number</label>
                                        <p className="text-gray-900 font-semibold">{selectedFirm.pan || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">GST Number</label>
                                        <p className="text-gray-900 font-semibold">{selectedFirm.gst || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">TAN Number</label>
                                        <p className="text-gray-900 font-semibold">{selectedFirm.tan || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">CIN Number</label>
                                        <p className="text-gray-900 font-semibold">{selectedFirm.cin || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">File Number</label>
                                        <p className="text-gray-900 font-semibold">{selectedFirm.file_no || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">VAT Number</label>
                                        <p className="text-gray-900 font-semibold">{selectedFirm.vat || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Address Details */}
                            {selectedFirm.address && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Address Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-600">Address Line 1</label>
                                            <p className="text-gray-900">{selectedFirm.address.address_line_1 || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-600">Address Line 2</label>
                                            <p className="text-gray-900">{selectedFirm.address.address_line_2 || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-600">City</label>
                                            <p className="text-gray-900">{selectedFirm.address.city || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-600">State</label>
                                            <p className="text-gray-900">{selectedFirm.address.state || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-600">Pincode</label>
                                            <p className="text-gray-900">{selectedFirm.address.pincode || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-600">Country</label>
                                            <p className="text-gray-900">{selectedFirm.address.country || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Created By Information */}
                            {selectedFirm.create_by && Object.keys(selectedFirm.create_by).length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Created By</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <FiUser className="w-4 h-4 text-gray-400" />
                                                <label className="block text-sm font-medium text-gray-600">Name</label>
                                            </div>
                                            <p className="text-gray-900">{selectedFirm.create_by.name || 'N/A'}</p>
                                        </div>
                                        {/* <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <FiMail className="w-4 h-4 text-gray-400" />
                                                <label className="block text-sm font-medium text-gray-600">Email</label>
                                            </div>
                                            <p className="text-gray-900">{selectedFirm.create_by.email || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <FiPhone className="w-4 h-4 text-gray-400" />
                                                <label className="block text-sm font-medium text-gray-600">Mobile</label>
                                            </div>
                                            <p className="text-gray-900">{selectedFirm.create_by.mobile || 'N/A'}</p>
                                        </div> */}
                                    </div>
                                </div>
                            )}

                            {/* Modified By Information */}
                            {selectedFirm.modify_by && Object.keys(selectedFirm.modify_by).length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Last Modified By</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <FiUser className="w-4 h-4 text-gray-400" />
                                                <label className="block text-sm font-medium text-gray-600">Name</label>
                                            </div>
                                            <p className="text-gray-900">{selectedFirm.modify_by.name || 'N/A'}</p>
                                        </div>
                                        {/* <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <FiMail className="w-4 h-4 text-gray-400" />
                                                <label className="block text-sm font-medium text-gray-600">Email</label>
                                            </div>
                                            <p className="text-gray-900">{selectedFirm.modify_by.email || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <FiPhone className="w-4 h-4 text-gray-400" />
                                                <label className="block text-sm font-medium text-gray-600">Mobile</label>
                                            </div>
                                            <p className="text-gray-900">{selectedFirm.modify_by.mobile || 'N/A'}</p>
                                        </div> */}
                                    </div>
                                </div>
                            )}

                            {/* Timeline Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Timeline</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">Created Date</label>
                                        <p className="text-gray-900">{formatDate(selectedFirm.create_date) || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-600">Last Updated</label>
                                        <p className="text-gray-900">{formatDate(selectedFirm.modify_date) || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3 shrink-0">
                            <motion.button
                                onClick={() => setShowViewModal(false)}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Close
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedFirm && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-8 py-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <FiTrash2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">Delete Firm</h2>
                                    <p className="text-red-100 text-sm mt-1">This action cannot be undone</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center">
                                    <FiAlertCircle className="w-10 h-10 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Are you sure?</h3>
                                    <p className="text-gray-600 mt-2">
                                        You're about to delete <span className="font-semibold text-red-600">{selectedFirm.firm_name}</span>. This will permanently remove all associated data.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="border-t px-8 py-6 bg-gray-50 flex justify-center gap-4">
                            <motion.button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-6 py-3 text-gray-600 hover:bg-gray-200 rounded-xl font-medium"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                onClick={deleteFirm}
                                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/25 transition-all"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Delete Firm
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default FirmsTab;