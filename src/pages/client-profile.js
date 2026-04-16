import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import {
    FiUser,
    FiMail,
    FiPhone,
    FiMapPin,
    FiCalendar,
    FiBriefcase,
    FiKey,
    FiClipboard,
    FiFileText,
    FiDollarSign,
    FiFile,
    FiSettings,
    FiEdit,
    FiArchive,
    FiMessageSquare,
    FiRepeat,
    FiCheckSquare,
    FiPlus,
    FiTrash2,
    FiEye,
    FiDownload,
    FiSearch,
    FiCheck,
    FiX,
    FiUpload,
    FiSend,
    FiHome,
    FiUserCheck,
    FiCreditCard,
    FiClock,
    FiChevronLeft,
    FiChevronRight,
    FiChevronsRight,
    FiStar,
    FiTrendingUp,
    FiSave,
    FiGlobe,
    FiNavigation,
    FiGrid,
    FiLoader,
    FiRefreshCw,
    FiInfo,
    FiMinimize2,
    FiMaximize2,
    FiChevronDown
} from 'react-icons/fi';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

// Import other components
import FirmsTab from "../ClientComponents/FirmsTab";
import PasswordTab from "../ClientComponents/PasswordTab";
import QuotationTab from "../ClientComponents/QuotationTab";
import TaskTab from "../ClientComponents/TaskTab";
import BillingTab from "../ClientComponents/BillingTab";
import LedgerTab from "../ClientComponents/LedgerTab";
import NotesTab from "../ClientComponents/NotesTab";
import RecurringTab from "../ClientComponents/RecurringTab";
import DocumentsTab from "../ClientComponents/DocumentsTab";
import ChattingTab from "../ClientComponents/ChattingTab";
import AutomationTab from "../ClientComponents/AutomationTab";

// Enhanced DetailRow Component with inline editing
const DetailRow = ({ 
    label, 
    value, 
    field, 
    isEditing, 
    editedValue, 
    onEdit, 
    onSave, 
    onCancel, 
    onChange,
    type = 'text'
}) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    return (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-200 rounded-lg px-3 -mx-3">
            <div className="flex items-center gap-3 mb-2 sm:mb-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-600 uppercase">
                        {label.charAt(0)}
                    </span>
                </div>
                <span className="font-medium text-gray-700 text-sm min-w-[120px]">{label}</span>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                <span className="text-gray-900 font-medium text-sm sm:text-base truncate">{value}</span>
            </div>
        </div>
    );
};

// Enhanced BasicDetailsTab Component with bulk edit mode
// Enhanced BasicDetailsTab Component with bulk edit mode and API integration
const BasicDetailsTab = ({ clientData, onEdit, loading, clientUsername  }) => {
    const [editingField, setEditingField] = useState(null);
    const [editedValue, setEditedValue] = useState('');
    const [isBulkEditMode, setIsBulkEditMode] = useState(false);
    const [bulkEditData, setBulkEditData] = useState({});
    const [saveStatus, setSaveStatus] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleEditClick = (field, value) => {
        setEditingField(field);
        setEditedValue(value);
    };

    // Function to update client profile via API
    const updateClientProfile = async (updatedData) => {
        const headers = getHeaders();
        if (!headers) {
            setSaveStatus({ type: 'error', message: 'Authentication headers missing. Please login again.' });
            return false;
        }

        try {
            setIsSaving(true);
            
            // Prepare the request body according to API specification
            const requestBody = {
                username: clientUsername,
                name: updatedData.name || clientData.name,
                care_of: updatedData.care_of || clientData.care_of,
                guardian_name: updatedData.guardian_name || clientData.guardian_name,
                date_of_birth: updatedData.date_of_birth || clientData.date_of_birth,
                gender: updatedData.gender || clientData.gender,
                mobile: updatedData.mobile || clientData.mobile,
                country_code: updatedData.country_code || clientData.country_code || "91",
                email: updatedData.email || clientData.email,
                pan_number: updatedData.pan_number || clientData.pan_number,
                image: updatedData.image || clientData.image,
                is_active: updatedData.is_active !== undefined ? updatedData.is_active : clientData.is_active,
                address: {
                    state: updatedData.state || clientData.state,
                    district: updatedData.district || clientData.district,
                    city: updatedData.city || clientData.city,
                    village_town: updatedData.village_town || clientData.village_town,
                    pincode: updatedData.pincode || clientData.pincode,
                    address_line_1: updatedData.address_line_1 || clientData.address_line_1,
                    address_line_2: updatedData.address_line_2 || clientData.address_line_2
                }
            };

            // Format date to YYYY-MM-DD if it exists
            if (requestBody.date_of_birth) {
                const date = new Date(requestBody.date_of_birth);
                if (!isNaN(date.getTime())) {
                    requestBody.date_of_birth = date.toISOString().split('T')[0];
                }
            }

            // console.log('Updating client profile:', requestBody);
            
            const response = await axios.post(
                `${API_BASE_URL}/client/details/edit-profile`,
                requestBody,
                { headers }
            );

            // console.log('Update response:', response.data);

            if (response.data.success) {
                // Update local state with the new data
                onEdit('name', requestBody.name);
                onEdit('care_of', requestBody.care_of);
                onEdit('guardian_name', requestBody.guardian_name);
                onEdit('date_of_birth', requestBody.date_of_birth);
                onEdit('gender', requestBody.gender);
                onEdit('mobile', requestBody.mobile);
                onEdit('country_code', requestBody.country_code);
                onEdit('email', requestBody.email);
                onEdit('pan_number', requestBody.pan_number);
                onEdit('image', requestBody.image);
                onEdit('is_active', requestBody.is_active);
                onEdit('state', requestBody.address.state);
                onEdit('district', requestBody.address.district);
                onEdit('city', requestBody.address.city);
                onEdit('village_town', requestBody.address.village_town);
                onEdit('pincode', requestBody.address.pincode);
                onEdit('address_line_1', requestBody.address.address_line_1);
                onEdit('address_line_2', requestBody.address.address_line_2);
                
                return true;
            } else {
                setSaveStatus({ 
                    type: 'error', 
                    message: response.data.message || 'Failed to update profile' 
                });
                return false;
            }
        } catch (err) {
            console.error('Error updating client profile:', err);
            let errorMessage = 'Failed to update profile';
            
            if (err.response) {
                if (err.response.status === 401) {
                    errorMessage = 'Unauthorized. Please login again.';
                } else if (err.response.status === 400) {
                    errorMessage = err.response.data?.message || 'Invalid data provided';
                } else {
                    errorMessage = `Error ${err.response.status}: ${err.response.data?.message || 'Update failed'}`;
                }
            } else if (err.request) {
                errorMessage = 'No response from server. Please check your connection.';
            }
            
            setSaveStatus({ type: 'error', message: errorMessage });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async (field, value) => {
        const updatedData = { [field]: value };
        const success = await updateClientProfile(updatedData);
        
        if (success) {
            setEditingField(null);
            setEditedValue('');
            setSaveStatus({ 
                type: 'success', 
                message: `${field.replace('_', ' ')} updated successfully!` 
            });
            setTimeout(() => setSaveStatus(null), 3000);
        }
    };

    const handleCancel = () => {
        setEditingField(null);
        setEditedValue('');
    };

    const handleBulkEditToggle = () => {
        if (!isBulkEditMode) {
            setBulkEditData({ 
                ...clientData,
                // Ensure all fields exist to prevent undefined errors
                name: clientData.name || '',
                care_of: clientData.care_of || '',
                guardian_name: clientData.guardian_name || '',
                date_of_birth: clientData.date_of_birth || '',
                gender: clientData.gender || '',
                mobile: clientData.mobile || '',
                country_code: clientData.country_code || '91',
                email: clientData.email || '',
                pan_number: clientData.pan_number || '',
                image: clientData.image || '',
                is_active: clientData.is_active || false,
                state: clientData.state || '',
                district: clientData.district || '',
                city: clientData.city || '',
                village_town: clientData.village_town || '',
                pincode: clientData.pincode || '',
                address_line_1: clientData.address_line_1 || '',
                address_line_2: clientData.address_line_2 || ''
            });
        }
        setIsBulkEditMode(!isBulkEditMode);
    };

    const handleBulkSave = async () => {
        // Compare and prepare only changed data
        const changedData = {};
        Object.entries(bulkEditData).forEach(([field, value]) => {
            if (value !== clientData[field]) {
                changedData[field] = value;
            }
        });

        if (Object.keys(changedData).length === 0) {
            setSaveStatus({ type: 'info', message: 'No changes to save' });
            setIsBulkEditMode(false);
            setTimeout(() => setSaveStatus(null), 2000);
            return;
        }

        const success = await updateClientProfile(changedData);
        
        if (success) {
            setIsBulkEditMode(false);
            setBulkEditData({});
            setSaveStatus({ 
                type: 'success', 
                message: 'All changes saved successfully!' 
            });
            setTimeout(() => setSaveStatus(null), 3000);
        }
    };

    const handleBulkCancel = () => {
        setIsBulkEditMode(false);
        setBulkEditData({});
    };

    const handleBulkFieldChange = (field, value) => {
        setBulkEditData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const renderField = (label, field, value, type = 'text') => {
        if (isBulkEditMode) {
            return (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 border-b border-gray-100 hover:bg-blue-50/30 transition-colors duration-200 rounded-lg px-3 -mx-3">
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-blue-700 uppercase">
                                {label.charAt(0)}
                            </span>
                        </div>
                        <span className="font-medium text-gray-700 text-sm min-w-[120px]">{label}</span>
                    </div>
                    
                    <div className="w-full sm:w-48">
                        {type === 'select' ? (
                            <select
                                value={bulkEditData[field] || value || ''}
                                onChange={(e) => handleBulkFieldChange(field, e.target.value)}
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white shadow-sm"
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        ) : type === 'date' ? (
                            <input
                                type="date"
                                value={bulkEditData[field] || value || ''}
                                onChange={(e) => handleBulkFieldChange(field, e.target.value)}
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white shadow-sm"
                            />
                        ) : type === 'checkbox' ? (
                            <div className="flex items-center h-full">
                                <input
                                    type="checkbox"
                                    checked={bulkEditData[field] || value || false}
                                    onChange={(e) => handleBulkFieldChange(field, e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                            </div>
                        ) : (
                            <input
                                type={type}
                                value={bulkEditData[field] || value || ''}
                                onChange={(e) => handleBulkFieldChange(field, e.target.value)}
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white shadow-sm"
                                placeholder={`Enter ${label.toLowerCase()}`}
                            />
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-200 rounded-lg px-3 -mx-3">
                <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-600 uppercase">
                            {label.charAt(0)}
                        </span>
                    </div>
                    <span className="font-medium text-gray-700 text-sm min-w-[120px]">{label}</span>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <span className="text-gray-900 font-medium text-sm sm:text-base truncate">
                        {type === 'checkbox' ? (value ? 'Active' : 'Inactive') : value || 'Not provided'}
                    </span>
                    {type !== 'checkbox' && (
                        <button
                            onClick={() => handleEditClick(field, value)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            {/* <FiEdit className="w-3.5 h-3.5" /> */}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-white to-gray-50/30 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-8 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading client details...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-white to-gray-50/30 rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
            <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                                <FiUserCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Basic Details</h3>
                                <p className="text-sm text-gray-600 mt-1">Manage and update client information</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {saveStatus && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`px-4 py-2 rounded-lg ${saveStatus.type === 'success' 
                                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200' 
                                    : saveStatus.type === 'error'
                                    ? 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200'
                                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200'}`}
                            >
                                <div className="flex items-center gap-2">
                                    {saveStatus.type === 'success' && <FiCheck className="w-4 h-4" />}
                                    {saveStatus.type === 'error' && <FiX className="w-4 h-4" />}
                                    {saveStatus.type === 'info' && <FiInfo className="w-4 h-4" />}
                                    <span className="text-sm font-medium">{saveStatus.message}</span>
                                </div>
                            </motion.div>
                        )}
                        
                        {isSaving && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                                <FiLoader className="w-4 h-4 animate-spin" />
                                <span className="text-sm font-medium">Saving...</span>
                            </div>
                        )}
                        
                        <motion.button
                            onClick={handleBulkEditToggle}
                            className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 ${isBulkEditMode 
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg' 
                                : 'bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 hover:border-blue-300'}`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isSaving}
                        >
                            {isBulkEditMode ? (
                                <>
                                    <FiGrid className="w-4 h-4" />
                                    Exit Edit
                                </>
                            ) : (
                                <>
                                    <FiEdit className="w-4 h-4" />
                                    Edit Profile
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>

            {isBulkEditMode && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b border-blue-200"
                >
                    <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                    <FiEdit className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">Bulk Edit Mode Active</h4>
                                    <p className="text-sm text-gray-600">You can edit multiple fields at once</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <motion.button
                                    onClick={handleBulkCancel}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg font-medium transition-all duration-200 text-sm border border-gray-300"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    onClick={handleBulkSave}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <FiLoader className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FiSave className="w-4 h-4" />
                                    )}
                                    {isSaving ? 'Saving...' : 'Save All Changes'}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div
                        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    >
                        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b border-gray-200 p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                                    <FiUserCheck className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 text-lg">Personal Information</h4>
                                    <p className="text-sm text-gray-600">Client's personal details</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5">
                            <div className="space-y-1">
                                {renderField("Full Name", "name", clientData.name)}
                                {renderField("Care Of", "care_of", clientData.care_of)}
                                {renderField("Guardian Name", "guardian_name", clientData.guardian_name)}
                                {renderField("Date of Birth", "date_of_birth", clientData.date_of_birth, "date")}
                                {renderField("Gender", "gender", clientData.gender, "select")}
                                {renderField("Mobile", "mobile", clientData.mobile, "tel")}
                                {renderField("Country Code", "country_code", clientData.country_code || "91")}
                                {renderField("Email", "email", clientData.email, "email")}
                                {renderField("PAN Number", "pan_number", clientData.pan_number)}
                                {renderField("Active Status", "is_active", clientData.is_active, "checkbox")}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    >
                        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b border-gray-200 p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-lg flex items-center justify-center">
                                    <FiNavigation className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 text-lg">Address Information</h4>
                                    <p className="text-sm text-gray-600">Contact and location details</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5">
                            <div className="space-y-1">
                                {renderField("State", "state", clientData.state)}
                                {renderField("District", "district", clientData.district)}
                                {renderField("City", "city", clientData.city)}
                                {renderField("Town/Village", "village_town", clientData.village_town)}
                                {renderField("Pincode", "pincode", clientData.pincode)}
                                {renderField("Address Line 1", "address_line_1", clientData.address_line_1)}
                                {renderField("Address Line 2", "address_line_2", clientData.address_line_2)}
                            </div>
                            
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <FiGlobe className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700">Location Preview</span>
                                </div>
                                <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border border-gray-300">
                                    <div className="text-center">
                                        <FiMapPin className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">
                                            {clientData.village_town || clientData.city}, {clientData.state}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Individual Field Edit Modal */}
            {editingField && (
                <EditFieldModal
                    field={editingField}
                    value={editedValue}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isOpen={!!editingField}
                />
            )}
        </motion.div>
    );
};

// Individual Field Edit Modal Component
const EditFieldModal = ({ isOpen, onClose, field, value, onSave }) => {
    const [inputValue, setInputValue] = useState(value);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(field, inputValue);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const getFieldLabel = (fieldName) => {
        return fieldName.replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    const getInputType = (fieldName) => {
        if (fieldName.includes('email')) return 'email';
        if (fieldName.includes('date')) return 'date';
        if (fieldName.includes('mobile') || fieldName.includes('phone')) return 'tel';
        if (fieldName.includes('pincode')) return 'number';
        return 'text';
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Edit {getFieldLabel(field)}</h2>
                            <p className="text-blue-100 text-xs mt-1">Update the {field.toLowerCase()} information</p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all disabled:opacity-50"
                            disabled={isSaving}
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                        {getFieldLabel(field)}
                    </label>
                    <input
                        type={getInputType(field)}
                        value={inputValue || ''}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        autoFocus
                    />
                </div>
                <div className="px-5 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end gap-2">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 text-sm disabled:opacity-50"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSaving || !inputValue}
                    >
                        {isSaving ? (
                            <>
                                <FiLoader className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
const EditModal = ({ isOpen, onClose, field, value, onSave, type = 'text' }) => {
    const [inputValue, setInputValue] = useState(value);

    const handleSave = () => {
        onSave(inputValue);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Edit {field}</h2>
                            <p className="text-blue-100 text-xs mt-1">Update the {field.toLowerCase()} information</p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                        {field}
                    </label>
                    {type === 'textarea' ? (
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            rows="4"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all bg-gray-50/50 text-sm"
                        />
                    ) : (
                        <input
                            type={type}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        />
                    )}
                </div>
                <div className="px-5 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end gap-2">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const DeleteModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
                <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">{title}</h2>
                            <p className="text-red-100 text-xs mt-1">This action cannot be undone</p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-5">
                    <div className="flex items-center justify-center mb-3">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                            <FiTrash2 className="w-7 h-7 text-red-600" />
                        </div>
                    </div>
                    <p className="text-gray-700 text-center font-medium">{message}</p>
                </div>
                <div className="px-5 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end gap-2">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-rose-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                        Delete
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const AddFirmModal = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'Proprietorship',
        pan: '',
        gst: ''
    });

    const handleSubmit = () => {
        if (formData.name.trim() && formData.pan.trim()) {
            onAdd(formData);
            setFormData({ name: '', type: 'Proprietorship', pan: '', gst: '' });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Add New Firm</h2>
                            <p className="text-blue-100 text-xs mt-1">Register a new business entity</p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Firm Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                            placeholder="Enter firm name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Business Type</label>
                        <select 
                            value={formData.type}
                            onChange={(e) => setFormData({...formData, type: e.target.value})}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        >
                            <option value="Proprietorship">Proprietorship</option>
                            <option value="Partnership">Partnership</option>
                            <option value="LLP">LLP</option>
                            <option value="Private Limited">Private Limited</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">PAN Number</label>
                        <input
                            type="text"
                            value={formData.pan}
                            onChange={(e) => setFormData({...formData, pan: e.target.value})}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                            placeholder="Enter PAN number"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">GST Number (Optional)</label>
                        <input
                            type="text"
                            value={formData.gst}
                            onChange={(e) => setFormData({...formData, gst: e.target.value})}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                            placeholder="Enter GST number"
                        />
                    </div>
                </div>
                <div className="px-5 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end gap-2">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                        Add Firm
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const EditFirmModal = ({ isOpen, onClose, onSave, firm }) => {
    const [formData, setFormData] = useState({
        name: firm?.name || '',
        type: firm?.type || 'Proprietorship',
        pan: firm?.pan || '',
        gst: firm?.gst || ''
    });

    React.useEffect(() => {
        if (firm) {
            setFormData({
                name: firm.name,
                type: firm.type,
                pan: firm.pan,
                gst: firm.gst
            });
        }
    }, [firm]);

    const handleSubmit = () => {
        if (formData.name.trim() && formData.pan.trim()) {
            onSave(formData);
            onClose();
        }
    };

    if (!isOpen || !firm) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Edit Firm</h2>
                            <p className="text-blue-100 text-xs mt-1">Update firm details</p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Firm Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Business Type</label>
                        <select 
                            value={formData.type}
                            onChange={(e) => setFormData({...formData, type: e.target.value})}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        >
                            <option value="Proprietorship">Proprietorship</option>
                            <option value="Partnership">Partnership</option>
                            <option value="LLP">LLP</option>
                            <option value="Private Limited">Private Limited</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">PAN Number</label>
                        <input
                            type="text"
                            value={formData.pan}
                            onChange={(e) => setFormData({...formData, pan: e.target.value})}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">GST Number</label>
                        <input
                            type="text"
                            value={formData.gst}
                            onChange={(e) => setFormData({...formData, gst: e.target.value})}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        />
                    </div>
                </div>
                <div className="px-5 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end gap-2">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
// TabLink Component - Add this near other components
const TabLink = ({ to, icon: Icon, label, isActive, onClick }) => {
  return (
    <motion.button
      onClick={() => onClick(to)}
      className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
      }`}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        animate={{ 
          rotate: isActive ? [0, 5, 0] : 0,
          scale: isActive ? 1.1 : 1
        }}
        transition={{ duration: 0.2 }}
        className="mb-1"
      >
        <Icon className="w-4 h-4" />
      </motion.div>
      <span className="text-xs font-medium text-center leading-tight">{label}</span>
    </motion.button>
  );
};

// CompactTabIcon Component for minimized view with hover tooltip
// CompactTabIcon Component for minimized view with name under icon - CENTERED
const CompactTabIcon = ({ to, icon: Icon, label, isActive, onClick }) => {
  return (
    <motion.button
      onClick={() => onClick(to)}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[70px] ${
        isActive
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
      }`}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <Icon className="w-4 h-4 mb-1 mx-auto" />
      <span className="text-[10px] font-medium text-center leading-tight w-full">{label}</span>
    </motion.button>
  );
};

// Main Component - ClientProfile
// Main Component - ClientProfile
const ClientProfile = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [tabsMinimized, setTabsMinimized] = useState(() => {
        const saved = localStorage.getItem('tabsMinimized');
        // Default to true (minimized/icons only) if no saved preference
        return saved ? JSON.parse(saved) : true;
    });
    const [editModal, setEditModal] = useState({ isOpen: false, field: '', value: '' });
    const [isMobileView, setIsMobileView] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [previousUsername, setPreviousUsername] = useState(null);

    // Get both username and tab from URL
    const { username, tab = 'basic-details' } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Client data structure matching API response
    const [clientData, setClientData] = useState({
        // Basic info
        name: "",
        care_of: "",
        guardian_name: "",
        date_of_birth: "",
        gender: "",
        mobile: "",
        country_code: "",
        email: "",
        pan_number: "",
        image: null,
        is_active: true,
        
        // Address info
        state: "",
        district: "",
        city: "",
        village_town: "",
        pincode: "",
        address_line_1: "",
        address_line_2: "",
        
        // Transactional info
        balance: 0,
        debit: 0,
        credit: 0
    });

    // Fetch client data from API
    const fetchClientData = useCallback(async (currentUsername) => {
        const usernameToFetch = currentUsername || username;
        
        if (!usernameToFetch) {
            setError('No username provided');
            setLoading(false);
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            setError('Authentication headers missing. Please login again.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(
                `${API_BASE_URL}/client/details/profile?username=${encodeURIComponent(usernameToFetch)}`,
                { headers }
            );

            if (response.data.success && response.data.data) {
                const apiData = response.data.data;
                
                // Transform API data to match our component structure
                setClientData({
                    // Basic info
                    name: apiData.basic?.name || "",
                    care_of: apiData.basic?.care_of || "",
                    guardian_name: apiData.basic?.guardian_name || "",
                    date_of_birth: apiData.basic?.date_of_birth ? 
                        new Date(apiData.basic.date_of_birth).toLocaleDateString('en-GB') : "",
                    gender: apiData.basic?.gender || "",
                    mobile: apiData.basic?.mobile || "",
                    country_code: apiData.basic?.country_code || "91",
                    email: apiData.basic?.email || "",
                    pan_number: apiData.basic?.pan_number || "",
                    image: apiData.basic?.image || null,
                    is_active: apiData.basic?.is_active || false,
                    
                    // Address info
                    state: apiData.basic?.address?.state || "",
                    district: apiData.basic?.address?.district || "",
                    city: apiData.basic?.address?.city || "",
                    village_town: apiData.basic?.address?.village_town || "",
                    pincode: apiData.basic?.address?.pincode || "",
                    address_line_1: apiData.basic?.address?.address_line_1 || "",
                    address_line_2: apiData.basic?.address?.address_line_2 || "",
                    
                    // Transactional info
                    balance: apiData.transactional?.balance || 0,
                    debit: apiData.transactional?.debit || 0,
                    credit: apiData.transactional?.credit || 0
                });
            } else {
                setError(response.data.message || 'Failed to fetch client data');
            }
        } catch (err) {
            console.error('Error fetching client data:', err);
            if (err.response) {
                if (err.response.status === 401) {
                    setError('Unauthorized. Please login again.');
                } else if (err.response.status === 404) {
                    setError(`Client with username "${usernameToFetch}" not found.`);
                } else {
                    setError(`Error ${err.response.status}: ${err.response.data?.message || 'Failed to fetch client data'}`);
                }
            } else if (err.request) {
                setError('No response from server. Please check your connection.');
            } else {
                setError(`Error: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    }, [username]);

    // Watch for URL changes and fetch new data
    useEffect(() => {
        // Only fetch if username has changed
        if (username && username !== previousUsername) {
            // Reset state for new user
            setClientData({
                name: "", care_of: "", guardian_name: "", date_of_birth: "", gender: "",
                mobile: "", country_code: "", email: "", pan_number: "", image: null,
                is_active: false, state: "", district: "", city: "", village_town: "",
                pincode: "", address_line_1: "", address_line_2: "", balance: 0,
                debit: 0, credit: 0
            });
            setError(null);
            setPreviousUsername(username);
            
            // Fetch new data
            fetchClientData(username);
        }
        
        // If no tab specified, redirect to basic-details
        if (username && !tab) {
            navigate(`/client/profile/${username}/basic-details`, { replace: true });
        }
    }, [username, tab, location.pathname, previousUsername, fetchClientData, navigate]);

    // Initial fetch
    useEffect(() => {
        if (username && !previousUsername) {
            setPreviousUsername(username);
            fetchClientData(username);
        }
    }, [username, previousUsername, fetchClientData]);

    // Persist tabs minimized state
    useEffect(() => {
        localStorage.setItem('tabsMinimized', JSON.stringify(tabsMinimized));
    }, [tabsMinimized]);

    // Profile tabs data - updated with URL-friendly IDs
    const profileTabs = [
        { id: 'basic-details', name: 'Basic Details', icon: FiUser },
        { id: 'firms', name: 'Firms', icon: FiBriefcase },
        { id: 'password', name: 'Password', icon: FiKey },
        { id: 'quotation', name: 'Quotation', icon: FiClipboard },
        { id: 'task', name: 'Task', icon: FiCheckSquare },
        { id: 'billing', name: 'Billing', icon: FiFileText },
        { id: 'ledger', name: 'Ledger', icon: FiDollarSign },
        { id: 'notes', name: 'Notes', icon: FiFile },
        { id: 'recurring', name: 'Recurring', icon: FiRepeat },
        { id: 'documents', name: 'Documents', icon: FiArchive },
        { id: 'chatting', name: 'Chatting', icon: FiMessageSquare },
        { id: 'automation', name: 'Automation', icon: FiSettings }
    ];

    // Check mobile view on resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobileView(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    // Handle field editing
    const handleEditField = (field, value) => {
        setClientData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const saveEdit = (newValue) => {
        setClientData(prev => ({
            ...prev,
            [editModal.field]: newValue
        }));
        setEditModal({ isOpen: false, field: '', value: '' });
    };

    // Handle tab navigation
    const handleTabClick = (tabId) => {
        navigate(`/client/profile/${username}/${tabId}`);
    };

    // Toggle tabs minimized state
    const toggleTabsMinimized = () => {
        setTabsMinimized(!tabsMinimized);
    };

    // Render content based on active tab
    const renderTabContent = () => {
        // Map URL-friendly IDs to component keys
        const tabMap = {
            'basic-details': 'basic',
            'firms': 'firms',
            'password': 'password',
            'quotation': 'quotation',
            'task': 'task',
            'billing': 'billing',
            'ledger': 'ledger',
            'notes': 'notes',
            'recurring': 'recurring',
            'documents': 'documents',
            'chatting': 'chatting',
            'automation': 'automation'
        };
        
        const componentKey = tabMap[tab] || 'basic';
        
        const tabComponents = {
            basic: <BasicDetailsTab 
                clientData={clientData} 
                onEdit={handleEditField} 
                loading={loading} 
                clientUsername={username}
            />,
            firms: <FirmsTab clientUsername={username} />,
            password: <PasswordTab clientUsername={username} />,
            quotation: <QuotationTab clientUsername={username} />,
            task: <TaskTab clientUsername={username} />,
            billing: <BillingTab clientUsername={username} />,
            ledger: <LedgerTab clientUsername={username} />,
            notes: <NotesTab clientUsername={username} />,
            recurring: <RecurringTab clientUsername={username} />,
            documents: <DocumentsTab clientUsername={username} />,
            chatting: <ChattingTab clientUsername={username} />,
            automation: <AutomationTab clientUsername={username} />
        };

        return tabComponents[componentKey] || tabComponents['basic'];
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Loading State */}
                        {loading && (
                            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-6 flex flex-col items-center justify-center">
                                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-600 font-medium">Loading client profile...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {error && !loading && (
                            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6 mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                        <FiX className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Error Loading Profile</h3>
                                        <p className="text-gray-600 text-sm mt-1">{error}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => fetchClientData(username)}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-sm flex items-center gap-2"
                                    >
                                        <FiRefreshCw className="w-4 h-4" />
                                        Retry
                                    </button>
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 text-sm"
                                    >
                                        Go Back
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Client Profile Content */}
                        {!loading && !error && (
                            <>
                                {/* Breadcrumb Navigation */}
                                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                                    <button 
                                        onClick={() => navigate('/client/view')}
                                        className="hover:text-blue-600 flex items-center gap-1"
                                    >
                                        <FiHome className="w-4 h-4" />
                                        Clients
                                    </button>
                                    <FiChevronRight className="w-4 h-4" />
                                    <span className="font-medium text-gray-900">{clientData.name}</span>
                                    <FiChevronRight className="w-4 h-4" />
                                    <span className="capitalize">{tab.replace('-', ' ')}</span>
                                </div>

                                {/* Compact Header Card */}
                                <motion.div
                                    className="bg-white rounded-xl shadow-md border border-gray-200 p-5 mb-6 relative overflow-hidden"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="relative">
                                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                                                <motion.div
                                                    className="relative flex-shrink-0"
                                                    whileHover={{ scale: 1.03 }}
                                                    transition={{ type: "spring", stiffness: 300 }}
                                                >
                                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                                                        {clientData.image ? (
                                                            <img 
                                                                src={clientData.image} 
                                                                alt={clientData.name}
                                                                className="w-full h-full rounded-xl object-cover"
                                                            />
                                                        ) : (
                                                            <FiUser className="w-7 h-7 text-white" />
                                                        )}
                                                    </div>
                                                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                                                        clientData.is_active 
                                                            ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                                                            : 'bg-gradient-to-r from-red-400 to-rose-500'
                                                    }`}>
                                                        {clientData.is_active ? (
                                                            <FiStar className="w-3 h-3 text-white" />
                                                        ) : (
                                                            <FiX className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>
                                                </motion.div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                                                        <h1 className="text-xl font-bold text-gray-900 truncate">{clientData.name}</h1>
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                                                            clientData.is_active 
                                                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-emerald-700' 
                                                                : 'bg-gradient-to-r from-red-100 to-rose-100 text-rose-700'
                                                        }`}>
                                                            {clientData.is_active ? (
                                                                <>
                                                                    <FiTrendingUp className="w-3 h-3" />
                                                                    Active
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FiX className="w-3 h-3" />
                                                                    Inactive
                                                                </>
                                                            )}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Mobile - Collapsible Contact Info */}
                                                    <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'} gap-3`}>
                                                        <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">
                                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <FiPhone className="w-4 h-4 text-blue-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-gray-500">Mobile</p>
                                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                                    +{clientData.country_code} {clientData.mobile}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">
                                                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <FiMail className="w-4 h-4 text-purple-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-gray-500">Email</p>
                                                                <p className="text-sm font-semibold text-gray-900 truncate">{clientData.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">
                                                            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <FiCalendar className="w-4 h-4 text-amber-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-gray-500">Date of Birth</p>
                                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                                    {formatDate(clientData.date_of_birth)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">
                                                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <FiMapPin className="w-4 h-4 text-emerald-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-gray-500">Location</p>
                                                                <p className="text-sm font-semibold text-gray-900 truncate">{clientData.state}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <motion.div
                                                className="mt-4 lg:mt-0 flex-shrink-0"
                                                whileHover={{ scale: 1.02 }}
                                                transition={{ type: "spring", stiffness: 400 }}
                                            >
                                                <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-3 rounded-lg font-bold text-lg shadow-sm hover:shadow transform hover:-translate-y-0.5 transition-all duration-200 min-w-[180px]">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <FiDollarSign className="w-5 h-5" />
                                                        <div>
                                                            <p className="text-xs font-medium text-emerald-100">Balance</p>
                                                            <p className="text-xl">₹{clientData.balance.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Enhanced Profile Tabs with Minimize Option */}
                               {/* Enhanced Profile Tabs with Minimize Option */}
{/* Enhanced Profile Tabs with Minimize Option */}
<motion.div
    className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.2 }}
>
    <div className="p-3 flex items-center justify-between">
        {tabsMinimized ? (
            // Minimized view - icons with labels in one line - CENTERED
            <>
                <div className="flex items-center justify-center gap-1 flex-1 flex-wrap">
                    {profileTabs.map((tabItem) => {
                        const Icon = tabItem.icon;
                        const isActive = tab === tabItem.id;
                        return (
                            <CompactTabIcon
                                key={tabItem.id}
                                to={tabItem.id}
                                icon={Icon}
                                label={tabItem.name}
                                isActive={isActive}
                                onClick={handleTabClick}
                            />
                        );
                    })}
                </div>
                <motion.button
                    onClick={toggleTabsMinimized}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 ml-1 flex-shrink-0"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Show full tabs"
                >
                    <FiMaximize2 className="w-4 h-4" />
                </motion.button>
            </>
        ) : (
            // Expanded view - grid layout with minimize button
            <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 flex-1">
                    {profileTabs.map((tabItem) => {
                        const Icon = tabItem.icon;
                        const isActive = tab === tabItem.id;
                        return (
                            <TabLink
                                key={tabItem.id}
                                to={tabItem.id}
                                icon={Icon}
                                label={tabItem.name}
                                isActive={isActive}
                                onClick={handleTabClick}
                            />
                        );
                    })}
                </div>
                <motion.button
                    onClick={toggleTabsMinimized}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 ml-1 flex-shrink-0"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Minimize tabs"
                >
                    <FiMinimize2 className="w-4 h-4" />
                </motion.button>
            </>
        )}
    </div>
</motion.div>

                                {/* Tab Content with AnimatePresence */}
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={tab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
                                    >
                                        {renderTabContent()}
                                    </motion.div>
                                </AnimatePresence>
                            </>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Edit Modal - Keep for other tabs if needed */}
            <EditModal
                isOpen={editModal.isOpen}
                onClose={() => setEditModal({ isOpen: false, field: '', value: '' })}
                field={editModal.field}
                value={editModal.value}
                onSave={saveEdit}
            />
        </div>
    );
};

export default ClientProfile;