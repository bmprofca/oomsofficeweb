import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, Header } from '../components/header';
import {
    FiUser,
    FiMail,
    FiPhone,
    FiCalendar,
    FiMapPin,
    FiHome,
    FiBriefcase,
    FiDollarSign,
    FiUsers,
    FiFileText,
    FiPlus,
    FiArrowRight,
    FiArrowLeft,
    FiUpload,
    FiCheck,
    FiX,
    FiCamera,
    FiTrash2,
    FiSearch
} from 'react-icons/fi';
import DatePickerComponent from "../components/DatePickerComponent";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from '../utils/api-controller';
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { motion } from 'framer-motion';
import axios from 'axios';


const CreateClient = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [transitionDirection, setTransitionDirection] = useState('next');
    const [errors, setErrors] = useState({});
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);
    
    // Dropdown search states
    const [searchState, setSearchState] = useState('');
    const [searchDistrict, setSearchDistrict] = useState('');
    const [searchBusinessState, setSearchBusinessState] = useState('');
    const [searchBusinessDistrict, setSearchBusinessDistrict] = useState('');
    const [searchGroup, setSearchGroup] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState({
        state: false,
        district: false,
        businessState: false,
        businessDistrict: false,
        groups: false
    });

    // Form data state
    const [formData, setFormData] = useState({
        // Step 1: Basic Details
        pan: '',
        full_name: '',
        care_of: 'S/O',
        guardian_name: '',
        mobile: '',
        country_code: '91',
        email: '',
        date_of_birth: '',
        gender: 'male',
        image: null,

        // Step 2: Contact Details
        state: '',
        district: '',
        town_or_village: '',
        pincode: '',
        address_line_1: '',
        address_line_2: '',

        // Step 3: Business Details
        businesses: [{
            type: 'individual',
            pan: '',
            firm: '',
            gst: '',
            tan: '',
            vat: '',
            cin: '',
            file: '',
            address: {
                state: '',
                district: '',
                town: '',
                pincode: '',
                address_line_1: '',
                address_line_2: ''
            },
            groups: []
        }],

        // Step 4: Opening Balance
        opening_balance: {
            amount: '',
            type: 'credit',
            date: new Date().toISOString().split('T')[0]
        }
    });

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

    // When basic PAN changes, update first business PAN if type is individual
    useEffect(() => {
        if (formData.businesses[0]?.type === 'individual') {
            setFormData(prev => ({
                ...prev,
                businesses: prev.businesses.map((business, index) => 
                    index === 0 ? { ...business, pan: prev.pan } : business
                )
            }));
        }
    }, [formData.pan, formData.businesses[0]?.type]);

    // Dummy data arrays
    const [guardianTypes] = useState([
        { value: 'S/O', name: 'Son Of' },
        { value: 'D/O', name: 'Daughter Of' },
        { value: 'W/O', name: 'Wife Of' },
        { value: 'C/O', name: 'Care Of' }
    ]);

    const [countryCodes] = useState([
        { value: '91', name: 'India (+91)' },
        { value: '1', name: 'USA (+1)' },
        { value: '44', name: 'UK (+44)' },
        { value: '61', name: 'Australia (+61)' }
    ]);

    const [genders] = useState([
        { value: 'male', name: 'Male' },
        { value: 'female', name: 'Female' },
        { value: 'other', name: 'Other' }
    ]);

    const [states] = useState([
        { state: 'Assam', districts: ['Darrang', 'Kamrup', 'Nagaon', 'Dibrugarh'] },
        { state: 'Delhi', districts: ['Central Delhi', 'New Delhi', 'North Delhi', 'South Delhi'] },
        { state: 'Maharashtra', districts: ['Mumbai', 'Pune', 'Nagpur', 'Thane'] },
        { state: 'Karnataka', districts: ['Bangalore', 'Mysore', 'Hubli', 'Mangalore'] },
        { state: 'Tamil Nadu', districts: ['Chennai', 'Coimbatore', 'Madurai', 'Salem'] },
        { state: 'West Bengal', districts: ['Hooghly', 'Kolkata', 'Howrah', 'North 24 Parganas'] }
    ]);

    const [firmTypes] = useState([
        { value: 'individual', name: 'Individual' },
        { value: 'proprietorship', name: 'Proprietorship' },
        { value: 'partnership', name: 'Partnership' },
        { value: 'llp', name: 'LLP' },
        { value: 'pvt_ltd', name: 'Private Limited' },
        { value: 'ltd', name: 'Public Limited' }
    ]);

    const [groupsList, setGroupsList] = useState([
        { group_id: 'GROUP-0001', name: 'Corporate Clients', selected: false },
        { group_id: 'GROUP-0002', name: 'Small Business', selected: false },
        { group_id: 'GROUP-0003', name: 'Startup Portfolio', selected: false },
        { group_id: 'GROUP-0004', name: 'Enterprise Solutions', selected: false },
        { group_id: 'GROUP-0005', name: 'Government Projects', selected: false },
        { group_id: 'GROUP-0006', name: 'VIP Clients', selected: false },
        { group_id: 'GROUP-0007', name: 'International', selected: false },
        { group_id: 'GROUP-0008', name: 'Local Business', selected: false }
    ]);

    // Filtered data for searchable dropdowns
    const filteredStates = states.filter(state => 
        state.state.toLowerCase().includes(searchState.toLowerCase())
    );

    const getCurrentDistricts = () => {
        const selectedState = states.find(state => state.state === formData.state);
        return selectedState ? selectedState.districts : [];
    };

    const filteredDistricts = getCurrentDistricts().filter(district =>
        district.toLowerCase().includes(searchDistrict.toLowerCase())
    );

    const filteredBusinessStates = states.filter(state => 
        state.state.toLowerCase().includes(searchBusinessState.toLowerCase())
    );

    const getBusinessDistricts = () => {
        const selectedState = states.find(state => state.state === formData.businesses[0]?.address?.state);
        return selectedState ? selectedState.districts : [];
    };

    const filteredBusinessDistricts = getBusinessDistricts().filter(district =>
        district.toLowerCase().includes(searchBusinessDistrict.toLowerCase())
    );

    const filteredGroups = groupsList.filter(group =>
        group.name.toLowerCase().includes(searchGroup.toLowerCase())
    );

//     // Get auth headers from localStorage
//    const getHeaders = () => {
//     try {
//         // Try new keys first, then fallback to old keys
//         const userName = localStorage.getItem('userName') || 
//                          localStorage.getItem('user_username') || '';
//         const token = localStorage.getItem('token') || 
//                       localStorage.getItem('user_token') || '';
//         const branchId = localStorage.getItem('branchId') || 
//                          localStorage.getItem('branch_id') || '';
        
//         // console.log('Retrieved from localStorage:', { userName, token, branchId });
        
//         if (!userName || !token || !branchId) {
//             // console.error('Missing authentication data in localStorage');
//             // console.log('Available localStorage keys:', Object.keys(localStorage));
//             return null;
//         }
        
//         return {
//             'Content-Type': 'application/json',
//             'username': userName,
//             'token': token,
//             'branch': branchId
//         };
//     } catch (error) {
//         console.error('Error getting headers from localStorage:', error);
//         return null;
//     }
// };

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value, type, files } = e.target;

        if (type === 'file') {
            const file = files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    setErrors(prev => ({ ...prev, image: 'Please upload an image file' }));
                    return;
                }
                
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    setErrors(prev => ({ ...prev, image: 'Image size should be less than 5MB' }));
                    return;
                }

                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreview(reader.result);
                };
                reader.readAsDataURL(file);

                setFormData(prev => ({
                    ...prev,
                    image: file
                }));
                setErrors(prev => ({ ...prev, image: '' }));
            }
        } else {
            // PAN validation
            if (name === 'pan') {
                if (value.length > 10) return;
                const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                const isValid = panRegex.test(value.toUpperCase());
                setErrors(prev => ({
                    ...prev,
                    pan: value && !isValid ? 'Invalid PAN format (e.g., ABCDE1234H)' : ''
                }));
            }

            // Email validation
            if (name === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                setErrors(prev => ({
                    ...prev,
                    email: value && !emailRegex.test(value) ? 'Invalid email address' : ''
                }));
            }

            // Mobile validation
            if (name === 'mobile') {
                if (value.length > 10) return;
                const mobileRegex = /^[6-9]\d{9}$/;
                setErrors(prev => ({
                    ...prev,
                    mobile: value && !mobileRegex.test(value) ? 'Invalid mobile number' : ''
                }));
            }

            // GST validation
            if (name === 'gst') {
                const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
                setErrors(prev => ({
                    ...prev,
                    gst: value && !gstRegex.test(value.toUpperCase()) ? 'Invalid GST format' : ''
                }));
            }

            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    // Handle business input changes
    const handleBusinessChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            businesses: prev.businesses.map((business, i) => 
                i === index ? { ...business, [field]: value } : business
            )
        }));
    };

    // Handle business address changes
    const handleBusinessAddressChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            businesses: prev.businesses.map((business, i) => 
                i === index ? { 
                    ...business, 
                    address: { ...business.address, [field]: value } 
                } : business
            )
        }));
    };

    // Add new business
    const addBusiness = () => {
        setFormData(prev => ({
            ...prev,
            businesses: [...prev.businesses, {
                type: 'proprietorship',
                pan: '',
                firm: '',
                gst: '',
                tan: '',
                vat: '',
                cin: '',
                file: '',
                address: {
                    state: '',
                    district: '',
                    town: '',
                    pincode: '',
                    address_line_1: '',
                    address_line_2: ''
                },
                groups: []
            }]
        }));
    };

    // Remove business
    const removeBusiness = (index) => {
        if (formData.businesses.length > 1) {
            setFormData(prev => ({
                ...prev,
                businesses: prev.businesses.filter((_, i) => i !== index)
            }));
        }
    };

    // Handle group selection
    const toggleGroup = (groupId) => {
        setGroupsList(prev => prev.map(group =>
            group.group_id === groupId
                ? { ...group, selected: !group.selected }
                : group
        ));

        setFormData(prev => ({
            ...prev,
            businesses: prev.businesses.map((business, index) => 
                index === 0 ? {
                    ...business,
                    groups: business.groups.includes(groupId)
                        ? business.groups.filter(id => id !== groupId)
                        : [...business.groups, groupId]
                } : business
            )
        }));
    };

    // Select all groups
    const selectAllGroups = () => {
        setGroupsList(prev => prev.map(group => ({ ...group, selected: true })));
        setFormData(prev => ({
            ...prev,
            businesses: prev.businesses.map((business, index) => 
                index === 0 ? {
                    ...business,
                    groups: groupsList.map(group => group.group_id)
                } : business
            )
        }));
    };

    // Deselect all groups
    const deselectAllGroups = () => {
        setGroupsList(prev => prev.map(group => ({ ...group, selected: false })));
        setFormData(prev => ({
            ...prev,
            businesses: prev.businesses.map((business, index) => 
                index === 0 ? {
                    ...business,
                    groups: []
                } : business
            )
        }));
    };

    // Handle opening balance change
    const handleOpeningBalanceChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            opening_balance: {
                ...prev.opening_balance,
                [field]: value
            }
        }));
    };

    // Upload image
    // Upload image
const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        setUploading(true);
        const headers = getHeaders();
        if (!headers) {
            throw new Error('Authentication headers missing');
        }

        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
            headers: {
                ...headers,
                'Content-Type': 'multipart/form-data' // Override for file upload
            }
        });
        
        // console.log('Upload response:', response.data);
        
        // Extract URL from response structure
        if (response.data.success && response.data.data && response.data.data.url) {
            return response.data.data.url;
        } else {
            throw new Error('Invalid response format from upload API');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error(error.response?.data?.message || 'Failed to upload image');
    } finally {
        setUploading(false);
    }
};
    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Step 1 validation
        if (currentStep === 1) {
            if (!formData.pan.trim()) newErrors.pan = 'PAN is required';
            if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
            if (!formData.mobile.trim()) newErrors.mobile = 'Mobile is required';
            if (!formData.email.trim()) newErrors.email = 'Email is required';
            if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
            if (!formData.guardian_name.trim()) newErrors.guardian_name = 'Guardian name is required';
        }

        // Step 2 validation
        if (currentStep === 2) {
            if (!formData.state) newErrors.state = 'State is required';
            if (!formData.district) newErrors.district = 'District is required';
            if (!formData.town_or_village.trim()) newErrors.town_or_village = 'Town/Village is required';
            if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
        }

        // Step 3 validation
        if (currentStep === 3) {
            formData.businesses.forEach((business, index) => {
                if (!business.pan.trim()) newErrors[`business_pan_${index}`] = 'Business PAN is required';
                if (business.type !== 'individual' && !business.firm.trim()) {
                    newErrors[`business_firm_${index}`] = 'Firm name is required';
                }
            });
        }

        // Step 4 validation
        if (currentStep === 4) {
            if (!formData.opening_balance.amount) newErrors.opening_amount = 'Opening balance amount is required';
            if (!formData.opening_balance.date) newErrors.opening_date = 'Date is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            alert('Please fill all required fields correctly');
            return;
        }

        setLoading(true);

        // In the handleSubmit function, replace the API call section with this:

try {
    // Upload image if exists
    let imageUrl = null;
    if (formData.image) {
        try {
            imageUrl = await uploadImage(formData.image);
            // console.log('Image uploaded successfully:', imageUrl);
        } catch (uploadError) {
            console.error('Image upload failed:', uploadError);
            // Continue without image if upload fails
            alert('Image upload failed. Creating client without profile image.');
        }
    }

    // Prepare data for API - Match the exact API structure
    const payload = {
        profile: {
            pan: formData.pan.toUpperCase(),
            full_name: formData.full_name.trim(),
            care_of: formData.care_of,
            guardian_name: formData.guardian_name.trim(),
            mobile: formData.mobile,
            country_code: formData.country_code,
            email: formData.email.trim(),
            date_of_birth: formData.date_of_birth,
            gender: formData.gender,
            image: imageUrl
        },
        address: {
            state: formData.state,
            district: formData.district,
            town_or_village: formData.town_or_village.trim(),
            pincode: formData.pincode,
            address_line_1: formData.address_line_1.trim() || null,
            address_line_2: formData.address_line_2.trim() || null
        },
        business: formData.businesses.map(business => ({
            type: business.type,
            pan: business.pan.toUpperCase(),
            firm: business.firm.trim() || null,
            gst: business.gst ? business.gst.toUpperCase() : null,
            tan: business.tan ? business.tan.toUpperCase() : null,
            vat: business.vat || null,
            cin: business.cin || null,
            file: business.file || null,
            address: {
                state: business.address.state,
                district: business.address.district,
                town: business.address.town.trim(),
                pincode: business.address.pincode,
                address_line_1: business.address.address_line_1.trim() || null,
                address_line_2: business.address.address_line_2.trim() || null
            },
            groups: business.groups
        })),
        opening_balance: {
            amount: parseFloat(formData.opening_balance.amount) || 0,
            type: formData.opening_balance.type,
            date: formData.opening_balance.date
        }
    };

    // console.log('Sending payload to API:', JSON.stringify(payload, null, 2));

    // Get auth headers
    const authHeaders = getHeaders();
    if (!authHeaders) {
        alert('Authentication headers missing. Please login again.');
        return;
    }
    
    // Call the actual API endpoint
    const response = await axios.post(`${API_BASE_URL}/client/create`, payload, {
        headers: authHeaders
    });

    // console.log('API Response:', response.data);

    // Handle API response
    if (response.data.success) {
        alert('Client created successfully!');
        resetForm();
    } else {
        // Handle API error response
        const errorMessage = response.data.message || 'Failed to create client';
        throw new Error(errorMessage);
    }
} catch (error) {
    console.error('Error creating client:', error);
    
    // Display user-friendly error message
    let errorMessage = 'Error creating client. Please try again.';
    
    if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
            case 400:
                errorMessage = data.message || 'Invalid data provided. Please check your inputs.';
                break;
            case 401:
                errorMessage = 'Unauthorized. Please login again.';
                break;
            case 403:
                errorMessage = 'Forbidden. You do not have permission to create clients.';
                break;
            case 409:
                errorMessage = 'Client with this PAN or mobile already exists.';
                break;
            case 422:
                errorMessage = 'Validation error. Please check all required fields.';
                break;
            case 500:
                errorMessage = 'Server error. Please try again later.';
                break;
            default:
                errorMessage = data.message || `Error (${status}): Please try again.`;
        }
    } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check your internet connection.';
    } else {
        // Request setup error
        errorMessage = error.message || 'Error setting up request.';
    }
    
    alert(errorMessage);
} finally {
    setLoading(false);
}
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            pan: '',
            full_name: '',
            care_of: 'S/O',
            guardian_name: '',
            mobile: '',
            country_code: '91',
            email: '',
            date_of_birth: '',
            gender: 'male',
            image: null,
            state: '',
            district: '',
            town_or_village: '',
            pincode: '',
            address_line_1: '',
            address_line_2: '',
            businesses: [{
                type: 'individual',
                pan: '',
                firm: '',
                gst: '',
                tan: '',
                vat: '',
                cin: '',
                file: '',
                address: {
                    state: '',
                    district: '',
                    town: '',
                    pincode: '',
                    address_line_1: '',
                    address_line_2: ''
                },
                groups: []
            }],
            opening_balance: {
                amount: '',
                type: 'credit',
                date: new Date().toISOString().split('T')[0]
            }
        });
        setGroupsList(prev => prev.map(group => ({ ...group, selected: false })));
        setImagePreview(null);
        setErrors({});
        setCurrentStep(1);
        
        // Reset search states
        setSearchState('');
        setSearchDistrict('');
        setSearchBusinessState('');
        setSearchBusinessDistrict('');
        setSearchGroup('');
    };

    // Navigation functions with smooth transitions
    const nextStep = () => {
        if (validateForm() && currentStep < 4) {
            setTransitionDirection('next');
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setTransitionDirection('prev');
            setCurrentStep(currentStep - 1);
        }
    };

    // Toggle dropdown
    const toggleDropdown = (dropdown) => {
        setIsDropdownOpen(prev => ({
            ...prev,
            [dropdown]: !prev[dropdown]
        }));
    };

    // Select state
    const selectState = (state) => {
        setFormData(prev => ({
            ...prev,
            state,
            district: ''
        }));
        setIsDropdownOpen(prev => ({ ...prev, state: false }));
        setSearchState('');
    };

    // Select district
    const selectDistrict = (district) => {
        setFormData(prev => ({ ...prev, district }));
        setIsDropdownOpen(prev => ({ ...prev, district: false }));
        setSearchDistrict('');
    };

    // Select business state
    const selectBusinessState = (state) => {
        handleBusinessAddressChange(0, 'state', state);
        setIsDropdownOpen(prev => ({ ...prev, businessState: false }));
        setSearchBusinessState('');
    };

    // Select business district
    const selectBusinessDistrict = (district) => {
        handleBusinessAddressChange(0, 'district', district);
        setIsDropdownOpen(prev => ({ ...prev, businessDistrict: false }));
        setSearchBusinessDistrict('');
    };

    // Close all dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setIsDropdownOpen({
                    state: false,
                    district: false,
                    businessState: false,
                    businessDistrict: false,
                    groups: false
                });
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Step configurations
    const steps = [
        { number: 1, title: 'Basic Details', subtitle: 'Setup Basic Details' },
        { number: 2, title: 'Contact Details', subtitle: 'Add Contact Details' },
        { number: 3, title: 'Business Details', subtitle: 'Add Business Details' },
        { number: 4, title: 'Opening Balance', subtitle: 'Set Opening Balance' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 overflow-x-hidden">
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
                    {/* Main Card */}
                    <motion.div 
                        className="bg-white rounded-lg shadow-sm border border-gray-200"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white rounded-t-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-semibold">Create New Client</h2>
                                    <p className="text-indigo-100 text-sm mt-1">Fill in the client details below</p>
                                </div>
                                <motion.button 
                                    className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiUpload className="w-4 h-4" />
                                    <span>Bulk Import</span>
                                </motion.button>
                            </div>
                        </div>

                        <div className="p-4">
                            {/* Enhanced Stepper */}
                            <div className="flex justify-center mb-8">
                                <div className="flex items-center space-x-6">
                                    {steps.map((step, index) => (
                                        <div key={step.number} className="flex items-center">
                                            <div className={`flex flex-col items-center transition-all duration-300 ${step.number === currentStep ? 'scale-105' : 'scale-100'
                                                }`}>
                                                <div className={`relative flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold border-2 transition-all duration-300 ${step.number === currentStep
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                    : step.number < currentStep
                                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                                        : 'bg-white border-gray-300 text-gray-500'
                                                    }`}>
                                                    {step.number < currentStep ? <FiCheck className="w-4 h-4" /> : step.number}
                                                    {step.number === currentStep && (
                                                        <div className="absolute -inset-2 bg-indigo-100 rounded-full animate-pulse opacity-50"></div>
                                                    )}
                                                </div>
                                                <div className="mt-3 text-center max-w-32">
                                                    <div className={`text-sm font-semibold transition-colors duration-300 ${step.number === currentStep ? 'text-indigo-600' : step.number < currentStep ? 'text-emerald-600' : 'text-gray-500'
                                                        }`}>
                                                        {step.title}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {step.subtitle}
                                                    </div>
                                                </div>
                                            </div>
                                            {index < steps.length - 1 && (
                                                <div className={`w-16 h-1 mx-4 rounded-full transition-colors duration-300 ${step.number < currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                                                    }`} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* Step Content with Smooth Transitions */}
                                <div className="relative">
                                    {/* Step 1: Basic Details */}
                                    <div className={`transition-all duration-500 ease-in-out ${currentStep === 1
                                        ? 'opacity-100 translate-x-0 block'
                                        : transitionDirection === 'next'
                                            ? 'opacity-0 -translate-x-full absolute inset-0'
                                            : 'opacity-0 translate-x-full absolute inset-0'
                                        }`}>
                                        <div className="space-y-4">
                                            {/* PAN Number & Full Name - Row 1 */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                                        PAN Number <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                        <input
                                                            type="text"
                                                            name="pan"
                                                            value={formData.pan}
                                                            onChange={handleInputChange}
                                                            className={`w-full pl-10 pr-8 py-3 text-sm border ${errors.pan ? 'border-red-500' : formData.pan.length === 10 ? 'border-green-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200 uppercase`}
                                                            placeholder="Enter PAN number (e.g., ABCDE1234H)"
                                                            maxLength="10"
                                                            required
                                                        />
                                                        {formData.pan.length === 10 && !errors.pan && (
                                                            <FaCheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 text-sm" />
                                                        )}
                                                        {errors.pan && (
                                                            <FaTimesCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 text-sm" />
                                                        )}
                                                    </div>
                                                    {errors.pan && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.pan}</p>
                                                    )}
                                                    {formData.pan.length === 10 && !errors.pan && (
                                                        <p className="text-green-500 text-xs mt-1">✓ Valid PAN format</p>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                                        Full Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                        <input
                                                            type="text"
                                                            name="full_name"
                                                            value={formData.full_name}
                                                            onChange={handleInputChange}
                                                            className={`w-full pl-10 pr-3 py-3 text-sm border ${errors.full_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200`}
                                                            placeholder="Enter full name"
                                                            required
                                                        />
                                                    </div>
                                                    {errors.full_name && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Guardian Details - Row 2 */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                                        Care of <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            name="care_of"
                                                            value={formData.care_of}
                                                            onChange={handleInputChange}
                                                            className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200 appearance-none cursor-pointer"
                                                            required
                                                        >
                                                            {guardianTypes.map(type => (
                                                                <option key={type.value} value={type.value}>
                                                                    {type.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                            <div className="w-2 h-2 border-r border-b border-gray-400 transform rotate-45 -translate-y-1/2"></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                                        Guardian Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                        <input
                                                            type="text"
                                                            name="guardian_name"
                                                            value={formData.guardian_name}
                                                            onChange={handleInputChange}
                                                            className={`w-full pl-10 pr-3 py-3 text-sm border ${errors.guardian_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200`}
                                                            placeholder="Enter guardian name"
                                                            required
                                                        />
                                                    </div>
                                                    {errors.guardian_name && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.guardian_name}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Contact Details - Row 3 */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                                        Mobile <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                        <input
                                                            type="tel"
                                                            name="mobile"
                                                            value={formData.mobile}
                                                            onChange={handleInputChange}
                                                            className={`w-full pl-10 pr-3 py-3 text-sm border ${errors.mobile ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200`}
                                                            placeholder="Mobile number"
                                                            maxLength="10"
                                                            required
                                                        />
                                                    </div>
                                                    {errors.mobile && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                                        Email <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            value={formData.email}
                                                            onChange={handleInputChange}
                                                            className={`w-full pl-10 pr-3 py-3 text-sm border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200`}
                                                            placeholder="Enter email address"
                                                            required
                                                        />
                                                    </div>
                                                    {errors.email && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                                                    )}
                                                </div>
                                            </div>

                                          {/* Date of Birth & Gender - Row 4 */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Date of Birth <span className="text-red-500">*</span>
        </label>
        <DatePickerComponent
            selectedDate={formData.date_of_birth ? new Date(formData.date_of_birth) : null}
            onDateChange={(date) => {
                setFormData(prev => ({
                    ...prev,
                    date_of_birth: date ? date.toISOString().split('T')[0] : ''
                }));
            }}
            placeholder="DD/MM/YYYY"
            error={errors.date_of_birth}
        />
    </div>

    <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Gender <span className="text-red-500">*</span>
        </label>
        <div className="relative">
            <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200 appearance-none cursor-pointer"
                required
            >
                {genders.map(gender => (
                    <option key={gender.value} value={gender.value}>
                        {gender.name}
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <div className="w-2 h-2 border-r border-b border-gray-400 transform rotate-45 -translate-y-1/2"></div>
            </div>
        </div>
    </div>
</div>

                                            {/* Profile Image - Centered in available space */}
                                            <div className="pt-2">
                                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                                                    Profile Image <span className="text-gray-500 font-normal normal-case ml-1">(Optional)</span>
                                                </label>
                                                
                                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-6 transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50">
                                                    {/* Image Preview Area */}
                                                    <div className="mb-4">
                                                        <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                                                            {uploading ? (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <div className="relative">
                                                                        <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
                                                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                                    </div>
                                                                </div>
                                                            ) : imagePreview ? (
                                                                <>
                                                                    <img 
                                                                        src={imagePreview} 
                                                                        alt="Preview" 
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setImagePreview(null);
                                                                            setFormData(prev => ({ ...prev, image: null }));
                                                                        }}
                                                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md transition-all duration-200"
                                                                    >
                                                                        <FiTrash2 className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                                                    <FiCamera className="w-12 h-12 mb-2" />
                                                                    <span className="text-sm font-medium">No Image</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Upload Controls */}
                                                    <div className="text-center">
                                                        <div className="mb-3">
                                                            <input
                                                                type="file"
                                                                ref={fileInputRef}
                                                                name="image"
                                                                onChange={handleInputChange}
                                                                className="hidden"
                                                                accept="image/*"
                                                                disabled={uploading}
                                                                id="profile-image-upload"
                                                            />
                                                            
                                                            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                                                                <motion.button
                                                                    type="button"
                                                                    onClick={() => fileInputRef.current?.click()}
                                                                    disabled={uploading}
                                                                    className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm ${
                                                                        uploading 
                                                                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
                                                                    }`}
                                                                    whileHover={uploading ? {} : { scale: 1.05 }}
                                                                    whileTap={uploading ? {} : { scale: 0.95 }}
                                                                >
                                                                    {uploading ? 'Uploading...' : 'Upload Image'}
                                                                </motion.button>
                                                                
                                                                {imagePreview && !uploading && (
                                                                    <motion.button
                                                                        type="button"
                                                                        onClick={() => fileInputRef.current?.click()}
                                                                        className="px-6 py-3 text-sm font-semibold bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all duration-200"
                                                                        whileHover={{ scale: 1.05 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                    >
                                                                        Change Image
                                                                    </motion.button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="text-xs text-gray-500 space-y-1">
                                                            <p>• Supported formats: JPG, PNG, GIF</p>
                                                            <p>• Maximum file size: 5MB</p>
                                                            <p>• Recommended: Square image, 400×400 pixels</p>
                                                        </div>
                                                        
                                                        {errors.image && (
                                                            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                                                                <p className="text-red-600 text-xs font-medium flex items-center justify-center">
                                                                    <FaTimesCircle className="w-3 h-3 mr-2" />
                                                                    {errors.image}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step 2: Contact Details */}
                                    <div className={`transition-all duration-500 ease-in-out ${currentStep === 2
                                        ? 'opacity-100 translate-x-0 block'
                                        : currentStep > 2
                                            ? 'opacity-0 -translate-x-full absolute inset-0'
                                            : 'opacity-0 translate-x-full absolute inset-0'
                                        }`}>
                                        <div className="space-y-4">
                                            {/* State and District with Searchable Dropdowns */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1 dropdown-container">
                                                    <label className="block text-xs font-medium text-gray-700">
                                                        State <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <div 
                                                            className={`w-full px-3 py-3 text-sm border ${errors.state ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200 cursor-pointer flex items-center justify-between ${isDropdownOpen.state ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
                                                            onClick={() => toggleDropdown('state')}
                                                        >
                                                            <span className={formData.state ? 'text-gray-900' : 'text-gray-500'}>
                                                                {formData.state || 'Select State'}
                                                            </span>
                                                            <FiSearch className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        
                                                        {isDropdownOpen.state && (
                                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                                <div className="sticky top-0 bg-white p-2 border-b">
                                                                    <div className="relative">
                                                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                                        <input
                                                                            type="text"
                                                                            value={searchState}
                                                                            onChange={(e) => setSearchState(e.target.value)}
                                                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                            placeholder="Search state..."
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {filteredStates.map(state => (
                                                                    <div
                                                                        key={state.state}
                                                                        className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center justify-between"
                                                                        onClick={() => selectState(state.state)}
                                                                    >
                                                                        <span>{state.state}</span>
                                                                        {formData.state === state.state && (
                                                                            <FiCheck className="w-4 h-4 text-indigo-600" />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {errors.state && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.state}</p>
                                                    )}
                                                </div>

                                                <div className="space-y-1 dropdown-container">
                                                    <label className="block text-xs font-medium text-gray-700">
                                                        District <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <div 
                                                            className={`w-full px-3 py-3 text-sm border ${errors.district ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200 cursor-pointer flex items-center justify-between ${isDropdownOpen.district ? 'ring-2 ring-indigo-500 border-indigo-500' : ''} ${!formData.state ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                            onClick={() => formData.state && toggleDropdown('district')}
                                                        >
                                                            <span className={formData.district ? 'text-gray-900' : 'text-gray-500'}>
                                                                {formData.district || 'Select District'}
                                                            </span>
                                                            <FiSearch className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        
                                                        {isDropdownOpen.district && formData.state && (
                                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                                <div className="sticky top-0 bg-white p-2 border-b">
                                                                    <div className="relative">
                                                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                                        <input
                                                                            type="text"
                                                                            value={searchDistrict}
                                                                            onChange={(e) => setSearchDistrict(e.target.value)}
                                                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                            placeholder="Search district..."
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {filteredDistricts.map(district => (
                                                                    <div
                                                                        key={district}
                                                                        className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center justify-between"
                                                                        onClick={() => selectDistrict(district)}
                                                                    >
                                                                        <span>{district}</span>
                                                                        {formData.district === district && (
                                                                            <FiCheck className="w-4 h-4 text-indigo-600" />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {errors.district && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.district}</p>
                                                    )}
                                                    {!formData.state && (
                                                        <p className="text-gray-500 text-xs mt-1">Select a state first</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Town and Pincode */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-gray-700">
                                                        Town/Village <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <FiHome className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                        <input
                                                            type="text"
                                                            name="town_or_village"
                                                            value={formData.town_or_village}
                                                            onChange={handleInputChange}
                                                            className={`w-full pl-10 pr-3 py-3 text-sm border ${errors.town_or_village ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200`}
                                                            placeholder="Enter town/village name"
                                                            required
                                                        />
                                                    </div>
                                                    {errors.town_or_village && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.town_or_village}</p>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-gray-700">
                                                        Pincode <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                        <input
                                                            type="text"
                                                            name="pincode"
                                                            value={formData.pincode}
                                                            onChange={handleInputChange}
                                                            className={`w-full pl-10 pr-3 py-3 text-sm border ${errors.pincode ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200`}
                                                            placeholder="Enter pincode"
                                                            maxLength="6"
                                                            required
                                                        />
                                                    </div>
                                                    {errors.pincode && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Address Lines */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-gray-700">
                                                        Address Line 1
                                                    </label>
                                                    <div className="relative">
                                                        <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                        <input
                                                            type="text"
                                                            name="address_line_1"
                                                            value={formData.address_line_1}
                                                            onChange={handleInputChange}
                                                            className="w-full pl-10 pr-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                            placeholder="Enter address line 1"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-gray-700">
                                                        Address Line 2
                                                    </label>
                                                    <div className="relative">
                                                        <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                        <input
                                                            type="text"
                                                            name="address_line_2"
                                                            value={formData.address_line_2}
                                                            onChange={handleInputChange}
                                                            className="w-full pl-10 pr-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                            placeholder="Enter address line 2"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step 3: Business Details */}
                                    <div className={`transition-all duration-500 ease-in-out ${currentStep === 3
                                        ? 'opacity-100 translate-x-0 block'
                                        : currentStep > 3
                                            ? 'opacity-0 -translate-x-full absolute inset-0'
                                            : 'opacity-0 translate-x-full absolute inset-0'
                                        }`}>
                                        <div className="space-y-6">
                                            {formData.businesses.map((business, index) => (
                                                <div key={index} className="space-y-4 p-4 border border-gray-200 rounded-lg">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-sm font-semibold text-gray-700">
                                                            Business {index + 1}
                                                        </h3>
                                                        {index > 0 && (
                                                            <motion.button
                                                                type="button"
                                                                onClick={() => removeBusiness(index)}
                                                                className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors duration-200 flex items-center space-x-1"
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                <FiTrash2 className="w-3 h-3" />
                                                                <span>Remove</span>
                                                            </motion.button>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="block text-xs font-medium text-gray-700">
                                                                Business Type <span className="text-red-500">*</span>
                                                            </label>
                                                            <select
                                                                value={business.type}
                                                                onChange={(e) => handleBusinessChange(index, 'type', e.target.value)}
                                                                className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                                required
                                                            >
                                                                {firmTypes.map(type => (
                                                                    <option key={type.value} value={type.value}>
                                                                        {type.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="block text-xs font-medium text-gray-700">
                                                                PAN <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={business.pan}
                                                                onChange={(e) => handleBusinessChange(index, 'pan', e.target.value)}
                                                                className={`w-full p-3 text-sm border ${errors[`business_pan_${index}`] ? 'border-red-500' : business.pan.length === 10 ? 'border-green-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200 uppercase`}
                                                                placeholder={business.type === 'individual' ? 'Auto-filled from basic PAN' : 'Enter business PAN'}
                                                                readOnly={index === 0 && business.type === 'individual'}
                                                                maxLength="10"
                                                                required
                                                            />
                                                            {errors[`business_pan_${index}`] && (
                                                                <p className="text-red-500 text-xs mt-1">{errors[`business_pan_${index}`]}</p>
                                                            )}
                                                            {index === 0 && business.type === 'individual' && (
                                                                <p className="text-gray-500 text-xs mt-1">Auto-filled from basic PAN</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {business.type !== 'individual' && (
                                                        <>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        Firm Name <span className="text-red-500">*</span>
                                                                    </label>
                                                                    <div className="relative">
                                                                        <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                                        <input
                                                                            type="text"
                                                                            value={business.firm}
                                                                            onChange={(e) => handleBusinessChange(index, 'firm', e.target.value)}
                                                                            className={`w-full pl-10 pr-3 py-3 text-sm border ${errors[`business_firm_${index}`] ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200`}
                                                                            placeholder="Enter firm name"
                                                                            required
                                                                        />
                                                                    </div>
                                                                    {errors[`business_firm_${index}`] && (
                                                                        <p className="text-red-500 text-xs mt-1">{errors[`business_firm_${index}`]}</p>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        GST
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={business.gst}
                                                                        onChange={(e) => handleBusinessChange(index, 'gst', e.target.value)}
                                                                        className={`w-full p-3 text-sm border ${errors.gst ? 'border-red-500' : business.gst.length === 15 ? 'border-green-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200 uppercase`}
                                                                        placeholder="Enter GST number"
                                                                    />
                                                                    {errors.gst && (
                                                                        <p className="text-red-500 text-xs mt-1">{errors.gst}</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        TAN
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={business.tan}
                                                                        onChange={(e) => handleBusinessChange(index, 'tan', e.target.value)}
                                                                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                                        placeholder="Enter TAN number"
                                                                    />
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        VAT
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={business.vat}
                                                                        onChange={(e) => handleBusinessChange(index, 'vat', e.target.value)}
                                                                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                                        placeholder="Enter VAT number"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        CIN
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={business.cin}
                                                                        onChange={(e) => handleBusinessChange(index, 'cin', e.target.value)}
                                                                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                                        placeholder="Enter CIN number"
                                                                    />
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        File No
                                                                    </label>
                                                                    <div className="relative">
                                                                        <FiFileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                                        <input
                                                                            type="text"
                                                                            value={business.file}
                                                                            onChange={(e) => handleBusinessChange(index, 'file', e.target.value)}
                                                                            className="w-full pl-10 pr-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                                            placeholder="Enter file number"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Business Address with Searchable Dropdowns */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div className="space-y-1 dropdown-container">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        Business State <span className="text-red-500">*</span>
                                                                    </label>
                                                                    <div className="relative">
                                                                        <div 
                                                                            className={`w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200 cursor-pointer flex items-center justify-between ${isDropdownOpen.businessState ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
                                                                            onClick={() => toggleDropdown('businessState')}
                                                                        >
                                                                            <span className={business.address.state ? 'text-gray-900' : 'text-gray-500'}>
                                                                                {business.address.state || 'Select State'}
                                                                            </span>
                                                                            <FiSearch className="w-4 h-4 text-gray-400" />
                                                                        </div>
                                                                        
                                                                        {isDropdownOpen.businessState && (
                                                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                                                <div className="sticky top-0 bg-white p-2 border-b">
                                                                                    <div className="relative">
                                                                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                                                        <input
                                                                                            type="text"
                                                                                            value={searchBusinessState}
                                                                                            onChange={(e) => setSearchBusinessState(e.target.value)}
                                                                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                            placeholder="Search state..."
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                {filteredBusinessStates.map(state => (
                                                                                    <div
                                                                                        key={state.state}
                                                                                        className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center justify-between"
                                                                                        onClick={() => selectBusinessState(state.state)}
                                                                                    >
                                                                                        <span>{state.state}</span>
                                                                                        {business.address.state === state.state && (
                                                                                            <FiCheck className="w-4 h-4 text-indigo-600" />
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1 dropdown-container">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        Business District <span className="text-red-500">*</span>
                                                                    </label>
                                                                    <div className="relative">
                                                                        <div 
                                                                            className={`w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200 cursor-pointer flex items-center justify-between ${isDropdownOpen.businessDistrict ? 'ring-2 ring-indigo-500 border-indigo-500' : ''} ${!business.address.state ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                                            onClick={() => business.address.state && toggleDropdown('businessDistrict')}
                                                                        >
                                                                            <span className={business.address.district ? 'text-gray-900' : 'text-gray-500'}>
                                                                                {business.address.district || 'Select District'}
                                                                            </span>
                                                                            <FiSearch className="w-4 h-4 text-gray-400" />
                                                                        </div>
                                                                        
                                                                        {isDropdownOpen.businessDistrict && business.address.state && (
                                                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                                                <div className="sticky top-0 bg-white p-2 border-b">
                                                                                    <div className="relative">
                                                                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                                                        <input
                                                                                            type="text"
                                                                                            value={searchBusinessDistrict}
                                                                                            onChange={(e) => setSearchBusinessDistrict(e.target.value)}
                                                                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                            placeholder="Search district..."
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                {filteredBusinessDistricts.map(district => (
                                                                                    <div
                                                                                        key={district}
                                                                                        className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center justify-between"
                                                                                        onClick={() => selectBusinessDistrict(district)}
                                                                                    >
                                                                                        <span>{district}</span>
                                                                                        {business.address.district === district && (
                                                                                            <FiCheck className="w-4 h-4 text-indigo-600" />
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {!business.address.state && (
                                                                        <p className="text-gray-500 text-xs mt-1">Select a state first</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        Business Town <span className="text-red-500">*</span>
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={business.address.town}
                                                                        onChange={(e) => handleBusinessAddressChange(index, 'town', e.target.value)}
                                                                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                                        placeholder="Enter business town"
                                                                        required
                                                                    />
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        Business Pincode <span className="text-red-500">*</span>
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={business.address.pincode}
                                                                        onChange={(e) => handleBusinessAddressChange(index, 'pincode', e.target.value)}
                                                                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                                        placeholder="Enter business pincode"
                                                                        maxLength="6"
                                                                        required
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        Business Address Line 1
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={business.address.address_line_1}
                                                                        onChange={(e) => handleBusinessAddressChange(index, 'address_line_1', e.target.value)}
                                                                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                                        placeholder="Enter business address line 1"
                                                                    />
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <label className="block text-xs font-medium text-gray-700">
                                                                        Business Address Line 2
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={business.address.address_line_2}
                                                                        onChange={(e) => handleBusinessAddressChange(index, 'address_line_2', e.target.value)}
                                                                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                                        placeholder="Enter business address line 2"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Professional Group Selection - Searchable Dropdown */}
                                                    {index === 0 && (
                                                        <div className="space-y-2 dropdown-container">
                                                            <div className="flex justify-between items-center">
                                                                <label className="block text-xs font-medium text-gray-700">
                                                                    Select Groups
                                                                </label>
                                                                <div className="flex space-x-1">
                                                                    <motion.button
                                                                        type="button"
                                                                        onClick={selectAllGroups}
                                                                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors duration-200"
                                                                        whileHover={{ scale: 1.05 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                    >
                                                                        Select All
                                                                    </motion.button>
                                                                    <motion.button
                                                                        type="button"
                                                                        onClick={deselectAllGroups}
                                                                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200"
                                                                        whileHover={{ scale: 1.05 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                    >
                                                                        Deselect All
                                                                    </motion.button>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="relative">
                                                                <div 
                                                                    className={`w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200 cursor-pointer flex items-center justify-between ${isDropdownOpen.groups ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
                                                                    onClick={() => toggleDropdown('groups')}
                                                                >
                                                                    <span className={business.groups.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
                                                                        {business.groups.length > 0 ? `${business.groups.length} group(s) selected` : 'Select groups'}
                                                                    </span>
                                                                    <FiSearch className="w-4 h-4 text-gray-400" />
                                                                </div>
                                                                
                                                                {isDropdownOpen.groups && (
                                                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                                        <div className="sticky top-0 bg-white p-2 border-b">
                                                                            <div className="relative">
                                                                                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                                                <input
                                                                                    type="text"
                                                                                    value={searchGroup}
                                                                                    onChange={(e) => setSearchGroup(e.target.value)}
                                                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                    placeholder="Search groups..."
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        {filteredGroups.map((group) => (
                                                                            <div
                                                                                key={group.group_id}
                                                                                className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center justify-between"
                                                                                onClick={() => toggleGroup(group.group_id)}
                                                                            >
                                                                                <span>{group.name}</span>
                                                                                {group.selected && (
                                                                                    <FiCheck className="w-4 h-4 text-indigo-600" />
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {groupsList
                                                                    .filter(group => group.selected)
                                                                    .map((group) => (
                                                                        <motion.div
                                                                            key={group.group_id}
                                                                            className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded border border-indigo-200 whitespace-nowrap flex items-center space-x-1"
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                        >
                                                                            <span>{group.name}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleGroup(group.group_id)}
                                                                                className="text-indigo-500 hover:text-indigo-700"
                                                                            >
                                                                                <FiX className="w-3 h-3" />
                                                                            </button>
                                                                        </motion.div>
                                                                    ))}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                Selected: {business.groups.length} group(s)
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Add More Business Button */}
                                            <motion.button
                                                type="button"
                                                onClick={addBusiness}
                                                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:border-gray-400 transition-colors duration-200 flex items-center justify-center space-x-2"
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                            >
                                                <FiPlus className="w-4 h-4" />
                                                <span className="text-sm font-medium">Add Another Business</span>
                                            </motion.button>
                                        </div>
                                    </div>

                                    {/* Step 4: Opening Balance */}
                                    <div className={`transition-all duration-500 ease-in-out ${currentStep === 4
                                        ? 'opacity-100 translate-x-0 block'
                                        : 'opacity-0 translate-x-full absolute inset-0'
                                        }`}>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-gray-700">
                                                        Amount <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                                        <input
                                                            type="number"
                                                            value={formData.opening_balance.amount}
                                                            onChange={(e) => handleOpeningBalanceChange('amount', e.target.value)}
                                                            className={`w-full pl-10 pr-3 py-3 text-sm border ${errors.opening_amount ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200`}
                                                            placeholder="Enter opening balance"
                                                            required
                                                        />
                                                    </div>
                                                    {errors.opening_amount && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.opening_amount}</p>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-gray-700">
                                                        Type <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={formData.opening_balance.type}
                                                        onChange={(e) => handleOpeningBalanceChange('type', e.target.value)}
                                                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-colors duration-200"
                                                        required
                                                    >
                                                        <option value="credit">Credit</option>
                                                        <option value="debit">Debit</option>
                                                    </select>
                                                </div>

                                             {/* Date Column */}
<div className="space-y-1">
    <label className="block text-xs font-medium text-gray-700">
        Date <span className="text-red-500">*</span>
    </label>
    <DatePickerComponent
        selectedDate={formData.opening_balance.date ? new Date(formData.opening_balance.date) : null}
        onDateChange={(date) => {
            handleOpeningBalanceChange('date', date ? date.toISOString().split('T')[0] : '');
        }}
        placeholder="DD/MM/YYYY"
        error={errors.opening_date}
    />
</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex justify-between pt-6 border-t border-gray-200 mt-6">
                                    {currentStep > 1 ? (
                                        <motion.button
                                            type="button"
                                            onClick={prevStep}
                                            className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-sm"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <FiArrowLeft className="w-4 h-4" />
                                            <span>Previous</span>
                                        </motion.button>
                                    ) : (
                                        <div></div>
                                    )}

                                    {currentStep < 4 ? (
                                        <motion.button
                                            type="button"
                                            onClick={nextStep}
                                            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-lg shadow-indigo-200"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <span>Next Step</span>
                                            <FiArrowRight className="w-4 h-4" />
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            type="submit"
                                            disabled={loading}
                                            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-lg shadow-emerald-200"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Creating Client...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FiPlus className="w-4 h-4" />
                                                    <span>Create Client</span>
                                                </>
                                            )}
                                        </motion.button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default CreateClient;