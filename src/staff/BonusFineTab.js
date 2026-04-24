import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import { toast } from 'react-hot-toast';
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiDollarSign,
    FiTrendingUp,
    FiTrendingDown,
    FiCalendar,
    FiInfo,
    FiRefreshCw,
    FiX,
    FiCheck,
    FiAward,
    FiMinusCircle,
    FiPercent,
    FiClock,
    FiRepeat,
    FiUser,
    FiMail,
    FiBriefcase
} from 'react-icons/fi';

const BonusFineTab = ({ bonusFine, setBonusFine, variants }) => {
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [adjustments, setAdjustments] = useState([]);
    const [summary, setSummary] = useState({
        total_allowances: 0,
        total_deductions: 0,
        net_adjustment: 0
    });
    const [profile, setProfile] = useState(null);
    const [filterType, setFilterType] = useState('all'); // 'all', 'allowance', 'deduction'
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingAdjustment, setEditingAdjustment] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        adjustment_type: 'allowance',
        adjustment_name: '',
        calculation_type: 'fixed',
        amount: '',
        applied_on: 'per_day',
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: '',
        is_recurring: false,
        remarks: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Get username from URL
    const getUsernameFromUrl = () => {
        const params = new URLSearchParams(location.search);
        return params.get('username');
    };

    const username = getUsernameFromUrl();

    // Fetch adjustments on component mount and when username/filter changes
    useEffect(() => {
        if (username) {
            fetchAdjustments();
        }
    }, [username, filterType]);

    // Fetch adjustments from API
    const fetchAdjustments = async () => {
        if (!username) return;
        
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/attendance/admin/adjustments?username=${username}`;
            if (filterType !== 'all') {
                url += `&adjustment_type=${filterType}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch adjustments');
            }
            
            const result = await response.json();
            
            if (result.success) {
                setAdjustments(result.data.adjustments || []);
                setSummary(result.data.summary || { total_allowances: 0, total_deductions: 0, net_adjustment: 0 });
                setProfile(result.data.profile);
                
                // Update parent component if needed
                if (setBonusFine) {
                    const formattedData = (result.data.adjustments || []).map(adj => ({
                        id: adj.id,
                        createDate: new Date(adj.created_at).toLocaleDateString(),
                        amount: adj.amount,
                        type: adj.adjustment_type === 'allowance' ? 'Bonus' : 'Fine',
                        description: adj.adjustment_name,
                        status: adj.is_recurring ? 'Recurring' : 'One-time',
                        ...adj
                    }));
                    setBonusFine(formattedData);
                }
            } else {
                toast.error(result.message || 'Failed to fetch adjustments');
            }
        } catch (error) {
            console.error('Error fetching adjustments:', error);
            toast.error('Failed to load adjustments');
        } finally {
            setLoading(false);
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Open modal for adding new adjustment
    const openAddModal = () => {
        setEditingAdjustment(null);
        setFormData({
            username: username,
            adjustment_type: 'allowance',
            adjustment_name: '',
            calculation_type: 'fixed',
            amount: '',
            applied_on: 'per_day',
            effective_from: new Date().toISOString().split('T')[0],
            effective_to: '',
            is_recurring: false,
            remarks: ''
        });
        setShowModal(true);
    };

    // Open modal for editing adjustment
    const openEditModal = (adjustment) => {
        setEditingAdjustment(adjustment);
        setFormData({
            username: adjustment.username || username,
            adjustment_type: adjustment.adjustment_type,
            adjustment_name: adjustment.adjustment_name,
            calculation_type: adjustment.calculation_type,
            amount: adjustment.amount,
            applied_on: adjustment.applied_on || 'per_day',
            effective_from: adjustment.effective_from ? new Date(adjustment.effective_from).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            effective_to: adjustment.effective_to ? new Date(adjustment.effective_to).toISOString().split('T')[0] : '',
            is_recurring: adjustment.is_recurring === 1 || adjustment.is_recurring === true,
            remarks: adjustment.remarks || ''
        });
        setShowModal(true);
    };

    // Submit adjustment (create or update)
    const handleSubmit = async () => {
        if (!formData.adjustment_name || !formData.amount) {
            toast.error('Please fill all required fields');
            return;
        }

        setSubmitting(true);
        
        try {
            const payload = {
                username: formData.username,
                adjustment_type: formData.adjustment_type,
                adjustment_name: formData.adjustment_name,
                calculation_type: formData.calculation_type,
                amount: parseFloat(formData.amount),
                applied_on: formData.applied_on,
                effective_from: formData.effective_from,
                remarks: formData.remarks
            };
            
            if (formData.effective_to) {
                payload.effective_to = formData.effective_to;
            }
            if (formData.is_recurring) {
                payload.is_recurring = formData.is_recurring;
            }
            
            const url = `${API_BASE_URL}/attendance/admin/add-adjustment`;
            const method = 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save adjustment');
            }
            
            const result = await response.json();
            
            if (result.success) {
                toast.success(editingAdjustment ? 'Adjustment updated successfully' : 'Adjustment added successfully');
                setShowModal(false);
                fetchAdjustments();
            } else {
                toast.error(result.message || 'Failed to save adjustment');
            }
        } catch (error) {
            console.error('Error saving adjustment:', error);
            toast.error('Failed to save adjustment');
        } finally {
            setSubmitting(false);
        }
    };

    // Delete adjustment
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this adjustment?')) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/attendance/admin/delete-adjustment/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete adjustment');
            }
            
            const result = await response.json();
            
            if (result.success) {
                toast.success('Adjustment deleted successfully');
                fetchAdjustments();
            } else {
                toast.error(result.message || 'Failed to delete adjustment');
            }
        } catch (error) {
            console.error('Error deleting adjustment:', error);
            toast.error('Failed to delete adjustment');
        }
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '—';
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return '—';
        }
    };

    // Get adjustment type badge
    const getTypeBadge = (type) => {
        if (type === 'allowance') {
            return {
                label: 'Allowance',
                icon: <FiTrendingUp className="w-3 h-3" />,
                color: 'bg-green-100 text-green-800 border-green-200'
            };
        } else {
            return {
                label: 'Deduction',
                icon: <FiTrendingDown className="w-3 h-3" />,
                color: 'bg-red-100 text-red-800 border-red-200'
            };
        }
    };

    // Get calculation type badge
    const getCalculationTypeBadge = (type, amount) => {
        if (type === 'fixed') {
            return {
                label: `Fixed: ${formatCurrency(amount)}`,
                icon: <FiDollarSign className="w-3 h-3" />,
                color: 'bg-blue-100 text-blue-800'
            };
        } else {
            return {
                label: `Percentage: ${amount}%`,
                icon: <FiPercent className="w-3 h-3" />,
                color: 'bg-purple-100 text-purple-800'
            };
        }
    };

    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
        >
            {/* Profile Summary Card */}
            {profile && (
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <FiUser className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">{profile.name}</h3>
                                <div className="flex items-center gap-3 mt-1 text-sm text-blue-100">
                                    <span className="flex items-center gap-1">
                                        <FiBriefcase className="w-3 h-3" />
                                        {profile.designation}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FiMail className="w-3 h-3" />
                                        {profile.email}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-center px-4 py-2 bg-white/10 rounded-lg">
                                <p className="text-xs text-blue-100">Total Allowances</p>
                                <p className="text-2xl font-bold text-green-300">
                                    +{formatCurrency(summary.total_allowances)}
                                </p>
                            </div>
                            <div className="text-center px-4 py-2 bg-white/10 rounded-lg">
                                <p className="text-xs text-blue-100">Total Deductions</p>
                                <p className="text-2xl font-bold text-red-300">
                                    -{formatCurrency(summary.total_deductions)}
                                </p>
                            </div>
                            <div className="text-center px-4 py-2 bg-white/20 rounded-lg">
                                <p className="text-xs text-blue-100">Net Adjustment</p>
                                <p className="text-2xl font-bold">
                                    {summary.net_adjustment >= 0 ? '+' : ''}{formatCurrency(summary.net_adjustment)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Adjustments List</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage allowances (bonus, travel, performance) and deductions (fine, damage, etc.)
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Filter Buttons */}
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    filterType === 'all' 
                                        ? 'bg-white text-gray-900 shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterType('allowance')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                                    filterType === 'allowance' 
                                        ? 'bg-white text-green-700 shadow-sm' 
                                        : 'text-gray-600 hover:text-green-700'
                                }`}
                            >
                                <FiTrendingUp className="w-3 h-3" />
                                Allowances
                            </button>
                            <button
                                onClick={() => setFilterType('deduction')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                                    filterType === 'deduction' 
                                        ? 'bg-white text-red-700 shadow-sm' 
                                        : 'text-gray-600 hover:text-red-700'
                                }`}
                            >
                                <FiTrendingDown className="w-3 h-3" />
                                Deductions
                            </button>
                        </div>
                        
                        <button
                            onClick={openAddModal}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                        >
                            <FiPlus className="w-4 h-4" />
                            Add Adjustment
                        </button>
                        
                        <button
                            onClick={fetchAdjustments}
                            disabled={loading}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Adjustments Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : adjustments.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiDollarSign className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm">No adjustments found</p>
                        <p className="text-gray-400 text-xs mt-1">Click "Add Adjustment" to create one</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Create Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adjustment Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calculation</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied On</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Period</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {adjustments.map((item, index) => {
                                    const typeBadge = getTypeBadge(item.adjustment_type);
                                    const calcBadge = getCalculationTypeBadge(item.calculation_type, item.amount);
                                    
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(item.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {item.adjustment_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-semibold ${
                                                    item.adjustment_type === 'allowance' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                    {item.adjustment_type === 'allowance' ? '+' : '-'}{formatCurrency(item.amount)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${typeBadge.color}`}>
                                                    {typeBadge.icon}
                                                    {typeBadge.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${calcBadge.color}`}>
                                                    {calcBadge.icon}
                                                    {calcBadge.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {item.applied_on === 'per_day' ? 'Per Day' : 
                                                 item.applied_on === 'monthly_salary' ? 'Monthly Salary' : 
                                                 item.applied_on || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                <div className="flex flex-col gap-1">
                                                    <span>From: {formatDate(item.effective_from)}</span>
                                                    {item.effective_to && (
                                                        <span>To: {formatDate(item.effective_to)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {item.is_recurring ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                        <FiRepeat className="w-3 h-3" />
                                                        Recurring
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                                        <FiClock className="w-3 h-3" />
                                                        One-time
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                {item.remarks || '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <FiEdit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-red-600 hover:text-red-800 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold">
                                            {editingAdjustment ? 'Edit Adjustment' : 'Add New Adjustment'}
                                        </h3>
                                        <p className="text-blue-100 text-sm mt-1">
                                            {editingAdjustment ? 'Modify existing adjustment' : 'Create a new allowance or deduction'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Adjustment Type Selection */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        Adjustment Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label
                                            className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                formData.adjustment_type === 'allowance'
                                                    ? 'border-green-500 bg-green-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="adjustment_type"
                                                value="allowance"
                                                checked={formData.adjustment_type === 'allowance'}
                                                onChange={handleInputChange}
                                                className="sr-only"
                                            />
                                            <div className="text-center">
                                                <FiTrendingUp className={`w-6 h-6 mx-auto mb-2 ${formData.adjustment_type === 'allowance' ? 'text-green-600' : 'text-gray-400'}`} />
                                                <span className={`font-medium ${formData.adjustment_type === 'allowance' ? 'text-green-700' : 'text-gray-600'}`}>
                                                    Allowance (Bonus)
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1">Performance, Travel, Festival</p>
                                            </div>
                                        </label>
                                        <label
                                            className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                formData.adjustment_type === 'deduction'
                                                    ? 'border-red-500 bg-red-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="adjustment_type"
                                                value="deduction"
                                                checked={formData.adjustment_type === 'deduction'}
                                                onChange={handleInputChange}
                                                className="sr-only"
                                            />
                                            <div className="text-center">
                                                <FiTrendingDown className={`w-6 h-6 mx-auto mb-2 ${formData.adjustment_type === 'deduction' ? 'text-red-600' : 'text-gray-400'}`} />
                                                <span className={`font-medium ${formData.adjustment_type === 'deduction' ? 'text-red-700' : 'text-gray-600'}`}>
                                                    Deduction (Fine)
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1">Equipment Damage, Penalty</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Adjustment Name */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Adjustment Name *
                                    </label>
                                    <select
                                        name="adjustment_name"
                                        value={formData.adjustment_name}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        <option value="">Select adjustment name</option>
                                        {formData.adjustment_type === 'allowance' ? (
                                            <>
                                                <option value="Performance Bonus">Performance Bonus</option>
                                                <option value="Travel Allowance">Travel Allowance</option>
                                                <option value="Festival Bonus">Festival Bonus (Diwali, Puja, etc.)</option>
                                                <option value="Attendance Bonus">Attendance Bonus</option>
                                                <option value="Overtime Allowance">Overtime Allowance</option>
                                                <option value="Special Allowance">Special Allowance</option>
                                                <option value="Other Allowance">Other Allowance</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="Equipment Damage">Equipment Damage</option>
                                                <option value="Late Penalty">Late Penalty</option>
                                                <option value="Absent Deduction">Absent Deduction</option>
                                                <option value="Break Penalty">Break Penalty</option>
                                                <option value="Other Deduction">Other Deduction</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                {/* Custom Name Input */}
                                {formData.adjustment_name === 'Other Allowance' || formData.adjustment_name === 'Other Deduction' ? (
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            name="custom_name"
                                            placeholder="Enter custom adjustment name"
                                            value={formData.custom_name || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, adjustment_name: e.target.value, custom_name: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                ) : null}

                                {/* Calculation Type */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Calculation Type *
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                formData.calculation_type === 'fixed'
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="calculation_type"
                                                value="fixed"
                                                checked={formData.calculation_type === 'fixed'}
                                                onChange={handleInputChange}
                                                className="w-4 h-4"
                                            />
                                            <div>
                                                <span className="font-medium">Fixed Amount</span>
                                                <p className="text-xs text-gray-500">Set a fixed amount (e.g., ₹500)</p>
                                            </div>
                                        </label>
                                        <label
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                formData.calculation_type === 'percentage'
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="calculation_type"
                                                value="percentage"
                                                checked={formData.calculation_type === 'percentage'}
                                                onChange={handleInputChange}
                                                className="w-4 h-4"
                                            />
                                            <div>
                                                <span className="font-medium">Percentage</span>
                                                <p className="text-xs text-gray-500">Percentage of salary (e.g., 10%)</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {formData.calculation_type === 'fixed' ? 'Amount (₹)' : 'Percentage (%)'} *
                                    </label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        step={formData.calculation_type === 'percentage' ? "1" : "0.01"}
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder={formData.calculation_type === 'fixed' ? "Enter amount" : "Enter percentage"}
                                    />
                                </div>

                                {/* Applied On */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Applied On
                                    </label>
                                    <select
                                        name="applied_on"
                                        value={formData.applied_on}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        <option value="per_day">Per Day (Applied to daily salary)</option>
                                        <option value="monthly_salary">Monthly Salary (Applied to total monthly salary)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formData.applied_on === 'per_day' 
                                            ? 'This adjustment will be applied to each day\'s salary calculation' 
                                            : 'This adjustment will be applied to the total monthly salary'}
                                    </p>
                                </div>

                                {/* Effective Date Range */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Effective From *
                                        </label>
                                        <input
                                            type="date"
                                            name="effective_from"
                                            value={formData.effective_from}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Effective To (Optional)
                                        </label>
                                        <input
                                            type="date"
                                            name="effective_to"
                                            value={formData.effective_to}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Recurring */}
                                <div className="mb-4">
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <FiRepeat className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <span className="font-medium text-gray-700">Recurring Adjustment</span>
                                                <p className="text-xs text-gray-500">Apply this adjustment every month</p>
                                            </div>
                                        </div>
                                        <div
                                            onClick={() => setFormData(prev => ({ ...prev, is_recurring: !prev.is_recurring }))}
                                            className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-all duration-200 ${formData.is_recurring ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gray-300'}`}
                                        >
                                            <div className={`inline-block w-4 h-4 transform bg-white rounded-full transition-all duration-200 ${formData.is_recurring ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </div>
                                    </label>
                                </div>

                                {/* Remarks */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Remarks
                                    </label>
                                    <textarea
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleInputChange}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Enter remarks (e.g., Diwali bonus, equipment damage deduction, etc.)"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FiCheck className="w-4 h-4" />
                                                {editingAdjustment ? 'Update' : 'Create'} Adjustment
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default BonusFineTab;