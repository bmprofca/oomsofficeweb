// components/EditTaskModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker } from 'rsuite';
import { toast } from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import { optionByValue } from '../utils/customSelectHelpers';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import {
    FiX,
    FiUser,
    FiUsers,
    FiBriefcase,
    FiCalendar,
    FiDollarSign,
    FiUserCheck,
    FiUserPlus,
    FiFileText,
    FiPaperclip,
    FiMic,
    FiStopCircle,
    FiTrash2,
    FiArrowRight,
    FiArrowLeft,
    FiCheck,
    FiEye,
    FiLayers,
    FiLoader,
    FiSave,
    FiRefreshCw,
    FiSearch
} from 'react-icons/fi';
import 'rsuite/dist/rsuite.min.css';

// Add custom styles for DatePicker to fix z-index
const datePickerStyles = `
  .rs-picker-popup {
    z-index: 9999 !important;
  }
  .rs-picker-toolbar {
    z-index: 9999 !important;
  }
  .rs-picker-date-menu {
    z-index: 9999 !important;
  }
`;

const EditTaskModal = ({ isOpen, onClose, taskData, onTaskUpdated }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('services');

    // Form Data State - Only editable fields
    const [formData, setFormData] = useState({
        task_id: '',
        firm_id: '',
        service_id: '',
        fees: '',
        has_ca: false,
        has_agent: false,
        due_date: '',
        target_date: ''
    });

    // UI States
    const [serviceCategories, setServiceCategories] = useState([]);
    const [services, setServices] = useState([]);
    const [filteredServices, setFilteredServices] = useState([]);
    const [firms, setFirms] = useState([]);
    const [firmSearchQuery, setFirmSearchQuery] = useState('');
    const [firmSearchResults, setFirmSearchResults] = useState([]);
    const [firmSearchLoading, setFirmSearchLoading] = useState(false);
    const firmSearchAbortRef = useRef(null);
    
    // Selection States
    const [selectedFirm, setSelectedFirm] = useState(null);

    // Tabs configuration
    const tabs = [
        { id: 'services', label: 'Services', icon: FiBriefcase },
        { id: 'firm', label: 'Firm', icon: FiUsers }
    ];

    // Initialize form with taskData when modal opens
    useEffect(() => {
        if (isOpen && taskData) {
            console.log('Task data received in modal:', taskData);
            initializeFormWithTaskData(taskData);
            
            // Fetch supporting data
            fetchServiceCategories();
            fetchServices();
            fetchFirmDetails(taskData.firm?.firm_id || taskData.firm_id);
        }
    }, [isOpen, taskData]);

    // Filter services when category changes
    useEffect(() => {
        if (formData.service_category) {
            const filtered = services.filter(service => 
                service.category_id === formData.service_category
            );
            setFilteredServices(filtered);
        } else {
            setFilteredServices(services);
        }
    }, [formData.service_category, services]);

    // Firm search
    useEffect(() => {
        const term = (firmSearchQuery || '').trim();
        if (term.length < 3) {
            setFirmSearchResults([]);
            setFirmSearchLoading(false);
            return;
        }
        const t = setTimeout(async () => {
            setFirmSearchLoading(true);
            firmSearchAbortRef.current?.abort();
            const controller = new AbortController();
            firmSearchAbortRef.current = controller;
            try {
                const url = `${API_BASE_URL.replace(/\/$/, '')}/firm/search?search=${encodeURIComponent(term)}`;
                const res = await fetch(url, { headers: await getHeaders(), signal: controller.signal });
                const data = await res.json();
                const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                const options = list.map(f => ({
                    value: f.firm_id,
                    label: f.client ? `${f.firm_name} – ${f.client.name}` : (f.firm_name || ''),
                    firm: f
                }));
                setFirmSearchResults(options);
            } catch (err) {
                if (err?.name !== 'AbortError') setFirmSearchResults([]);
            } finally {
                setFirmSearchLoading(false);
            }
        }, 400);
        return () => {
            clearTimeout(t);
            firmSearchAbortRef.current?.abort();
        };
    }, [firmSearchQuery]);

    // Initialize form with task data from props
    const initializeFormWithTaskData = (task) => {
        console.log('Initializing with task data:', task);
        
        setFormData({
            task_id: task.task_id || '',
            firm_id: task.firm?.firm_id || task.firm_id || '',
            service_id: task.service?.service_id || task.service_id || '',
            service_category: task.service?.category_id || task.service_category || '',
            fees: task.service?.fees || task.charges?.fees || task.fees || '',
            has_ca: task.has_ca || false,
            has_agent: task.has_agent || false,
            due_date: task.dates?.due_date || task.due_date || '',
            target_date: task.dates?.target_date || task.target_date || ''
        });

        // Set selected firm
        if (task.firm) {
            setSelectedFirm({
                value: task.firm.firm_id,
                label: task.firm.firm_name,
                firm: task.firm
            });
        }
    };

    // Fetch service categories
    const fetchServiceCategories = async () => {
        const headers = await getHeaders();
        if (!headers) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/service/category/list`, { headers });
            if (res.data?.success && Array.isArray(res.data.data)) {
                setServiceCategories(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch service categories:', err);
        }
    };

    // Fetch services
    const fetchServices = async () => {
        const headers = await getHeaders();
        if (!headers) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/service/list`, { headers });
            if (res.data?.success && Array.isArray(res.data.data)) {
                setServices(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch services:', err);
        }
    };

    // Fetch firm details
    const fetchFirmDetails = async (firmId) => {
        if (!firmId) return;
        const headers = await getHeaders();
        if (!headers) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/firm/details/${firmId}`, { headers });
            if (res.data?.success && res.data.data) {
                setSelectedFirm({
                    value: res.data.data.firm_id,
                    label: res.data.data.firm_name,
                    firm: res.data.data
                });
            }
        } catch (err) {
            console.error('Failed to fetch firm details:', err);
        }
    };

    // Service category options
    const serviceCategoryOptions = [
        { category_id: '', name: 'All Categories' },
        ...(serviceCategories.map(c => ({ category_id: c.category_id, name: c.name })))
    ];

    // Service options
    const mainServiceOptions = [
        { service_id: '', name: 'Select service...' },
        ...(filteredServices.map(s => ({ 
            service_id: s.service_id, 
            name: `${s.name} - ₹${s.fees || 0}` 
        })))
    ];

    // Handlers
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleServiceCategorySelect = (value) => {
        setFormData(prev => ({
            ...prev,
            service_category: value,
            service_id: ''
        }));
    };

    const handleServiceSelect = (value) => {
        const selectedService = services.find(s => String(s.service_id) === String(value));
        if (selectedService) {
            setFormData(prev => ({
                ...prev,
                service_id: value,
                fees: selectedService.fees || prev.fees,
                service_category: selectedService.category_id || prev.service_category
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                service_id: value
            }));
        }
    };

    const handleFirmSelect = (firm) => {
        if (firm && firm.value) {
            setSelectedFirm(firm);
            setFormData(prev => ({
                ...prev,
                firm_id: firm.value
            }));
            setFirmSearchQuery('');
            setFirmSearchResults([]);
        }
    };

    const removeFirm = () => {
        setSelectedFirm(null);
        setFormData(prev => ({
            ...prev,
            firm_id: ''
        }));
    };

    // Date handlers
    const formatDateForDisplay = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts;
            return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        }
        return null;
    };

    const formatDateForApi = (date) => {
        if (!date) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handleDueDateChange = (date) => {
        setFormData(prev => ({
            ...prev,
            due_date: date ? formatDateForApi(date) : ''
        }));
    };

    const handleTargetDateChange = (date) => {
        setFormData(prev => ({
            ...prev,
            target_date: date ? formatDateForApi(date) : ''
        }));
    };

    // Submit handler
    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const headers = await getHeaders();
            
            // Prepare payload according to API spec
            const payload = {
                firm_id: formData.firm_id,
                service_id: formData.service_id,
                fees: parseFloat(formData.fees) || 0,
                ca: {
                    has_ca: formData.has_ca || false
                },
                agent: {
                    has_agent: formData.has_agent || false
                },
                due_date: formData.due_date,
                target_date: formData.target_date
            };

            console.log('Submitting payload:', payload);

            const response = await fetch(`${API_BASE_URL}/task/edit/${formData.task_id}`, {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();
            
            if (responseData.success) {
                toast.success('Task updated successfully');
                onTaskUpdated?.();
                onClose();
            } else {
                throw new Error(responseData.message || 'Failed to update task');
            }
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error(error.message || 'Failed to update task');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Add styles for DatePicker */}
            <style>{datePickerStyles}</style>
            
            <AnimatePresence>
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    <FiBriefcase className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Edit Task</h2>
                                    <p className="text-indigo-100 text-sm">Task ID: {formData.task_id}</p>
                                </div>
                            </div>
                            <motion.button
                                onClick={onClose}
                                className="text-white hover:text-indigo-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <FiX className="w-6 h-6" />
                            </motion.button>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-gray-200 px-6 bg-gray-50">
                            <div className="flex gap-1 overflow-x-auto">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                                activeTab === tab.id
                                                    ? 'border-indigo-600 text-indigo-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <FiLoader className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                                        <p className="text-gray-600">Loading task details...</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Services Tab */}
                                    {activeTab === 'services' && (
                                        <div className="space-y-6">
                                            {/* Service Selection */}
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Service Category
                                                </label>
                                                <CustomSelect
                                                    options={serviceCategoryOptions}
                                                    value={optionByValue(serviceCategoryOptions, formData.service_category || '', 'category_id')}
                                                    onChange={(opt) => handleServiceCategorySelect(opt ? opt.category_id : '')}
                                                    getOptionLabel={(opt) => opt.name}
                                                    getOptionValue={(opt) => opt.category_id}
                                                    placeholder="All Categories"
                                                    isClearable={false}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Service <span className="text-red-500">*</span>
                                                </label>
                                                <CustomSelect
                                                    options={mainServiceOptions}
                                                    value={optionByValue(mainServiceOptions, formData.service_id || '', 'service_id')}
                                                    onChange={(opt) => handleServiceSelect(opt ? opt.service_id : '')}
                                                    getOptionLabel={(opt) => opt.name}
                                                    getOptionValue={(opt) => opt.service_id}
                                                    placeholder="Select service..."
                                                    isClearable={false}
                                                />
                                            </div>

                                            {/* Fees — GST computed server-side */}
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        Fees (₹) <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-base" />
                                                        <input
                                                            type="number"
                                                            name="fees"
                                                            value={formData.fees}
                                                            onChange={handleInputChange}
                                                            className="w-full pl-12 pr-3 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                                                            placeholder="Enter amount"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-500">GST is applied automatically when applicable for this branch.</p>
                                                </div>
                                            </div>

                                            {/* Dates */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        Due Date
                                                    </label>
                                                    <div className="relative [&_.rs-picker]:w-full">
                                                        <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base z-10 pointer-events-none w-4 h-4" />
                                                        <DatePicker
                                                            value={formatDateForDisplay(formData.due_date)}
                                                            onChange={handleDueDateChange}
                                                            format="dd/MM/yyyy"
                                                            placeholder="Select due date"
                                                            oneTap
                                                            editable={false}
                                                            cleanable
                                                            className="w-full"
                                                            style={{ width: '100%' }}
                                                            placement="autoVertical"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        Target Date
                                                    </label>
                                                    <div className="relative [&_.rs-picker]:w-full">
                                                        <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base z-10 pointer-events-none w-4 h-4" />
                                                        <DatePicker
                                                            value={formatDateForDisplay(formData.target_date)}
                                                            onChange={handleTargetDateChange}
                                                            format="dd/MM/yyyy"
                                                            placeholder="Select target date"
                                                            oneTap
                                                            editable={false}
                                                            cleanable
                                                            className="w-full"
                                                            style={{ width: '100%' }}
                                                            placement="autoVertical"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CA and Agent Toggles */}
                                            <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                                                <p className="text-sm font-semibold text-gray-900 mb-2">Additional Options</p>
                                                <div className="flex flex-wrap gap-6">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={formData.has_ca}
                                                            onClick={() => setFormData(prev => ({ ...prev, has_ca: !prev.has_ca }))}
                                                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                                                formData.has_ca ? 'bg-indigo-600' : 'bg-gray-200'
                                                            }`}
                                                        >
                                                            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${
                                                                formData.has_ca ? 'translate-x-5' : 'translate-x-0.5'
                                                            }`} />
                                                        </button>
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900">Has CA</span>
                                                            <p className="text-xs text-gray-500">Task requires CA approval</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={formData.has_agent}
                                                            onClick={() => setFormData(prev => ({ ...prev, has_agent: !prev.has_agent }))}
                                                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                                                formData.has_agent ? 'bg-indigo-600' : 'bg-gray-200'
                                                            }`}
                                                        >
                                                            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${
                                                                formData.has_agent ? 'translate-x-5' : 'translate-x-0.5'
                                                            }`} />
                                                        </button>
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900">Has Agent</span>
                                                            <p className="text-xs text-gray-500">Task requires agent handling</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Firm Tab */}
                                    {activeTab === 'firm' && (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Firm <span className="text-red-500">*</span>
                                                </label>
                                                
                                                {!selectedFirm ? (
                                                    <div className="relative">
                                                        <div className="relative flex items-center w-full bg-white border border-gray-300 rounded-xl overflow-visible focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                                                            <FiUsers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0 pointer-events-none z-10" />
                                                            <input
                                                                type="text"
                                                                value={firmSearchQuery}
                                                                onChange={(e) => setFirmSearchQuery(e.target.value)}
                                                                placeholder="Search firm (min 3 characters)..."
                                                                className="flex-1 min-w-0 pl-9 pr-3 py-3 text-sm border-0 bg-transparent focus:ring-0 focus:outline-none placeholder-gray-400"
                                                            />
                                                            {firmSearchQuery.trim().length >= 3 && (
                                                                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                                                                    {firmSearchLoading && <div className="p-3 text-sm text-gray-500">Searching...</div>}
                                                                    {!firmSearchLoading && firmSearchResults.length === 0 && <div className="p-3 text-sm text-gray-500">No results</div>}
                                                                    {!firmSearchLoading && firmSearchResults.map((item) => (
                                                                        <button
                                                                            key={item.value}
                                                                            type="button"
                                                                            onClick={() => handleFirmSelect(item)}
                                                                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-indigo-50 flex flex-col border-b border-gray-100 last:border-0"
                                                                        >
                                                                            <span className="font-medium text-gray-900">{item.label}</span>
                                                                            {item.firm?.pan_no && (
                                                                                <span className="text-xs text-gray-500">PAN: {item.firm.pan_no}</span>
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {firmSearchQuery.trim().length > 0 && firmSearchQuery.trim().length < 3 && (
                                                                <p className="absolute left-9 top-full mt-0.5 text-xs text-gray-500">Type at least 3 characters</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{selectedFirm.label}</div>
                                                            {selectedFirm.firm?.pan_no && (
                                                                <div className="text-xs text-gray-500 mt-0.5">PAN: {selectedFirm.firm.pan_no}</div>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={removeFirm}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <FiX className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
                            <motion.button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={submitting}
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                onClick={handleSubmit}
                                disabled={submitting || loading}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {submitting ? (
                                    <>
                                        <FiLoader className="w-4 h-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <FiSave className="w-4 h-4" />
                                        Update Task
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </>
    );
};

export default EditTaskModal;