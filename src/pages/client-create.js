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
    FiSearch,
    FiSettings,
    FiHelpCircle,
    FiLock
} from 'react-icons/fi';
import DatePickerComponent from "../components/DatePickerComponent";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from '../utils/api-controller';
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { motion } from 'framer-motion';
import axios from 'axios';
import { useUserPermissions } from '../utils/permission-helper';
import { uploadOneSaasFileUrl } from '../utils/onesaas-upload';


const CreateClient = () => {
    const { check } = useUserPermissions();
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

    // Bulk Import states
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkPreview, setBulkPreview] = useState(null);
    const [bulkError, setBulkError] = useState(null);
    const [bulkSuccessResult, setBulkSuccessResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [fileHeaders, setFileHeaders] = useState([]);
    const [parsedRows, setParsedRows] = useState([]);
    const bulkFileInputRef = useRef(null);

    const defaultMappings = {
        name: '',
        mobile: '',
        email: '',
        pan_number: '',
        gender: '',
        date_of_birth: '',
        state: '',
        district: '',
        city: '',
        pincode: '',
        care_of: '',
        guardian_name: '',
        firm_name: '',
        firm_type: '',
        gst: '',
        firm_pan: '',
        opening_balance: '',
        opening_balance_type: '',
        opening_balance_date: ''
    };

    const [columnMappings, setColumnMappings] = useState({ ...defaultMappings });

    // Load SheetJS CDN script dynamically when modal opens
    useEffect(() => {
        if (showBulkModal && !window.XLSX) {
            const script = document.createElement("script");
            script.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
            script.async = true;
            script.onload = () => {
                console.log("SheetJS loaded successfully");
            };
            document.body.appendChild(script);
            return () => {
                document.body.removeChild(script);
            };
        }
    }, [showBulkModal]);

    const resetBulkState = () => {
        setBulkFile(null);
        setBulkPreview(null);
        setBulkError(null);
        setBulkSuccessResult(null);
        setDragActive(false);
        setFileHeaders([]);
        setParsedRows([]);
        setColumnMappings({ ...defaultMappings });
        if (bulkFileInputRef.current) {
            bulkFileInputRef.current.value = '';
        }
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

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const parseFile = (file) => {
        if (!window.XLSX) {
            setBulkError("Spreadsheet parser library is loading. Please try again in a few seconds.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Get raw rows as array of arrays
                const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (rows.length === 0) {
                    setBulkError("The selected file is empty.");
                    return;
                }

                const headers = rows[0].map(h => String(h || '').trim());
                setFileHeaders(headers);
                
                // Filter out empty rows
                const validRows = rows.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
                setParsedRows(validRows);

                // Auto-detect columns based on aliases
                const newMappings = { ...defaultMappings };
                
                const aliasMap = {
                    name: ['client name', 'name', 'full name', 'fullname'],
                    mobile: ['mobile', 'phone', 'mobile number', 'mobile_no', 'contact'],
                    email: ['email', 'email address', 'e-mail', 'mail'],
                    pan_number: ['pan', 'pan number', 'pan_no', 'client_pan'],
                    gender: ['gender', 'sex'],
                    date_of_birth: ['dob', 'date of birth', 'date_of_birth', 'birth date'],
                    state: ['state'],
                    district: ['district'],
                    city: ['city', 'town', 'village', 'city/town/village'],
                    pincode: ['pincode', 'pin', 'zipcode', 'postal code'],
                    care_of: ['care of', 'care_of', 'c/o'],
                    guardian_name: ['guardian', 'guardian name', 'guardian_name'],
                    firm_name: ['firm', 'firm name', 'company name', 'business name'],
                    firm_type: ['business type', 'firm type', 'company type'],
                    gst: ['gst', 'gstin', 'gst number'],
                    firm_pan: ['firm pan', 'business pan'],
                    opening_balance: ['opening balance', 'balance', 'opening_bal'],
                    opening_balance_type: ['opening balance type', 'type', 'bal_type'],
                    opening_balance_date: ['opening balance date', 'bal_date']
                };

                Object.keys(aliasMap).forEach(key => {
                    const matchedHeader = headers.find(h => {
                        const cleanH = h.toLowerCase().trim();
                        return aliasMap[key].includes(cleanH) || cleanH.includes(key.replace('_', ''));
                    });
                    if (matchedHeader) {
                        newMappings[key] = matchedHeader;
                    }
                });

                setColumnMappings(newMappings);
            } catch (err) {
                console.error("Error parsing file:", err);
                setBulkError("Failed to parse the file. Please ensure it is a valid Excel or CSV file.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const fileExt = file.name.split('.').pop().toLowerCase();
            if (['csv', 'xlsx', 'xls'].includes(fileExt)) {
                setBulkFile(file);
                setBulkPreview(null);
                setBulkError(null);
                setBulkSuccessResult(null);
                parseFile(file);
            } else {
                setBulkError("Invalid file format. Please upload a .csv, .xlsx, or .xls file.");
            }
        }
    };

    const handleBulkFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop().toLowerCase();
            if (['csv', 'xlsx', 'xls'].includes(fileExt)) {
                setBulkFile(file);
                setBulkPreview(null);
                setBulkError(null);
                setBulkSuccessResult(null);
                parseFile(file);
            } else {
                setBulkError("Invalid file format. Please upload a .csv, .xlsx, or .xls file.");
            }
        }
    };

    const generateMappedCSVFile = () => {
        // Required fields
        const required = {
            name: 'Client Name',
            mobile: 'Mobile',
            email: 'Email',
            pan_number: 'PAN',
            gender: 'Gender',
            date_of_birth: 'DOB',
            state: 'State',
            district: 'District',
            city: 'City',
            pincode: 'Pincode'
        };

        // Check if all required fields are mapped
        const missing = [];
        Object.keys(required).forEach(key => {
            if (!columnMappings[key]) {
                missing.push(required[key]);
            }
        });

        if (missing.length > 0) {
            setBulkError(`Please map all required columns before proceeding. Missing: ${missing.join(', ')}`);
            return null;
        }

        // Standard headers to send to the backend
        const standardHeaders = [
            'Client Name', 'Mobile', 'Email', 'PAN', 'Gender', 'DOB', 'State', 'District', 'City', 'Pincode',
            'Care Of', 'Guardian', 'firm', 'business type', 'gst', 'firm pan', 
            'opening balance', 'opening balance type', 'opening balance date'
        ];

        // Map keys to their standard header position
        const keyToHeaderIndex = {
            name: 0,
            mobile: 1,
            email: 2,
            pan_number: 3,
            gender: 4,
            date_of_birth: 5,
            state: 6,
            district: 7,
            city: 8,
            pincode: 9,
            care_of: 10,
            guardian_name: 11,
            firm_name: 12,
            firm_type: 13,
            gst: 14,
            firm_pan: 15,
            opening_balance: 16,
            opening_balance_type: 17,
            opening_balance_date: 18
        };

        // Construct CSV rows
        const csvRows = [standardHeaders.join(',')];

        parsedRows.forEach(row => {
            const mappedRow = Array(standardHeaders.length).fill('');
            
            Object.keys(columnMappings).forEach(key => {
                const fileHeader = columnMappings[key];
                if (fileHeader) {
                    const headerIdx = fileHeaders.indexOf(fileHeader);
                    if (headerIdx !== -1) {
                        let cellValue = row[headerIdx];
                        if (cellValue === undefined || cellValue === null) {
                            cellValue = '';
                        }
                        
                        let cellString = '';
                        if (key === 'date_of_birth' || key === 'opening_balance_date') {
                            if (cellValue instanceof Date) {
                                const yyyy = cellValue.getFullYear();
                                const mm = String(cellValue.getMonth() + 1).padStart(2, '0');
                                const dd = String(cellValue.getDate()).padStart(2, '0');
                                cellString = `${yyyy}-${mm}-${dd}`;
                            } else if (typeof cellValue === 'number' || (!isNaN(cellValue) && cellValue !== '')) {
                                const num = Number(cellValue);
                                if (num > 10000 && num < 100000) { // Excel date serial number range
                                    const dateObj = new Date((num - 25569) * 86400 * 1000);
                                    if (!isNaN(dateObj.getTime())) {
                                        const yyyy = dateObj.getFullYear();
                                        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                                        const dd = String(dateObj.getDate()).padStart(2, '0');
                                        cellString = `${yyyy}-${mm}-${dd}`;
                                    } else {
                                        cellString = String(cellValue).trim();
                                    }
                                } else {
                                    cellString = String(cellValue).trim();
                                }
                            } else {
                                cellString = String(cellValue).trim();
                            }
                        } else if (key === 'mobile') {
                            cellString = String(cellValue).trim().replace(/[^0-9]/g, '');
                        } else {
                            cellString = String(cellValue).trim();
                        }

                        if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
                            cellString = `"${cellString.replace(/"/g, '""')}"`;
                        }
                        
                        const targetIdx = keyToHeaderIndex[key];
                        mappedRow[targetIdx] = cellString;
                    }
                }
            });

            csvRows.push(mappedRow.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        return new File([blob], 'transformed_clients.csv', { type: 'text/csv' });
    };

    const handleBulkPreview = async () => {
        const mappedFile = generateMappedCSVFile();
        if (!mappedFile) return;

        setBulkLoading(true);
        setBulkError(null);
        setBulkPreview(null);

        const formDataPayload = new FormData();
        formDataPayload.append('file', mappedFile);

        try {
            const authHeaders = getHeaders(true);
            if (!authHeaders) {
                setBulkError("Authentication session expired. Please log in again.");
                return;
            }

            const response = await axios.post(`${API_BASE_URL}/client/import?preview=true`, formDataPayload, {
                headers: authHeaders
            });

            if (response.data.success) {
                setBulkPreview(response.data.data);
            } else {
                setBulkError(response.data.message || "Failed to analyze the file.");
            }
        } catch (err) {
            console.error("Bulk Import Preview Error:", err);
            const errMsg = err.response?.data?.message || err.response?.data?.error || "An error occurred while analyzing the file.";
            setBulkError(errMsg);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkImport = async () => {
        const mappedFile = generateMappedCSVFile();
        if (!mappedFile) return;

        setBulkLoading(true);
        setBulkError(null);

        const formDataPayload = new FormData();
        formDataPayload.append('file', mappedFile);

        try {
            const authHeaders = getHeaders(true);
            if (!authHeaders) {
                setBulkError("Authentication session expired. Please log in again.");
                return;
            }

            const response = await axios.post(`${API_BASE_URL}/client/import`, formDataPayload, {
                headers: authHeaders
            });

            if (response.data.success) {
                setBulkSuccessResult(response.data.data);
                setBulkPreview(null);
            } else {
                if (response.data.errors) {
                    setBulkPreview(prev => ({
                        ...prev,
                        invalid_count: response.data.errors.length,
                        errors: response.data.errors
                    }));
                }
                setBulkError(response.data.message || "Failed to import clients.");
            }
        } catch (err) {
            console.error("Bulk Import Commit Error:", err);
            const errs = err.response?.data?.errors;
            if (errs && Array.isArray(errs)) {
                setBulkPreview(prev => ({
                    ...prev,
                    invalid_count: errs.length,
                    errors: errs
                }));
                setBulkError(err.response?.data?.message || "Import blocked due to validation errors.");
            } else {
                const errMsg = err.response?.data?.message || err.response?.data?.error || "Internal server error. Please try again.";
                setBulkError(errMsg);
            }
        } finally {
            setBulkLoading(false);
        }
    };
    
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
                if (!file.type.startsWith('image/')) {
                    setErrors(prev => ({ ...prev, image: 'Please upload an image file' }));
                    return;
                }

                if (file.size > 5 * 1024 * 1024) {
                    setErrors(prev => ({ ...prev, image: 'Image size should be less than 5MB' }));
                    return;
                }

                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreview(reader.result);
                };
                reader.readAsDataURL(file);

                setErrors(prev => ({ ...prev, image: '' }));
                setUploading(true);
                uploadOneSaasFileUrl(file)
                    .then((url) => {
                        setFormData(prev => ({ ...prev, image: url }));
                    })
                    .catch((error) => {
                        console.error('Error uploading image:', error);
                        setErrors(prev => ({
                            ...prev,
                            image: error.message || 'Failed to upload image',
                        }));
                        setImagePreview(null);
                        setFormData(prev => ({ ...prev, image: null }));
                    })
                    .finally(() => {
                        setUploading(false);
                    });
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
            image: formData.image || null
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

    if (!check('client_create')) {
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
                <div className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                    <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full mx-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiLock className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Access Denied</h3>
                        <p className="text-slate-500 text-sm">You do not have permission to create clients.</p>
                    </div>
                </div>
            </div>
        );
    }

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
                                    <div className="flex items-center space-x-2">
                                        <h2 className="text-lg font-semibold text-white">Create New Client</h2>
                                        <div className="relative group">
                                            <FiHelpCircle className="w-5 h-5 text-indigo-200 hover:text-white cursor-pointer transition-colors duration-200" />
                                            <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-72 sm:w-80 p-4 bg-slate-900 text-slate-100 rounded-lg shadow-xl border border-slate-700 text-xs font-normal leading-relaxed z-50">
                                                <div className="absolute -top-1 left-2.5 w-2.5 h-2.5 bg-slate-900 border-t border-l border-slate-700 transform rotate-45"></div>
                                                <div className="font-semibold text-indigo-400 mb-2 flex items-center gap-1.5">
                                                    <FiHelpCircle className="w-4 h-4 text-indigo-400" />
                                                    Guidance: What to do first?
                                                </div>
                                                <div className="space-y-2">
                                                    <p>
                                                        <span className="font-semibold text-white">1. Single Client:</span> Always enter the client's <span className="font-semibold text-indigo-300">PAN Number</span> first. This validates the identity format and prepares the form.
                                                    </p>
                                                    <p>
                                                        <span className="font-semibold text-white">2. Multiple Clients:</span> Click the <span className="font-semibold text-indigo-300">Bulk Import</span> button on the right to upload multiple clients via Excel/CSV templates.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-indigo-100 text-sm mt-1">Fill in the client details below</p>
                                </div>
                                <motion.button 
                                    onClick={() => { setShowBulkModal(true); resetBulkState(); }}
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

            {/* Bulk Import Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <FiUpload className="w-5 h-5 animate-bounce" />
                                    Bulk Client Import
                                </h3>
                                <p className="text-xs text-indigo-100 mt-0.5">Upload a spreadsheet to import clients in bulk</p>
                            </div>
                            <button 
                                onClick={() => setShowBulkModal(false)}
                                className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* General Error Alert */}
                            {bulkError && (
                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                                    <div className="bg-rose-500 text-white p-1 rounded-full shrink-0">
                                        <FiX className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-rose-800">Error Occurred</h4>
                                        <p className="text-xs text-rose-600 mt-0.5">{bulkError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Success State */}
                            {bulkSuccessResult ? (
                                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-lg shadow-emerald-100">
                                        <FiCheck className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900">Import Successful!</h4>
                                        <p className="text-sm text-gray-500 mt-1">Successfully imported <strong>{bulkSuccessResult.imported_count}</strong> clients.</p>
                                        {bulkSuccessResult.opening_balance_applied > 0 && (
                                            <p className="text-xs text-indigo-600 mt-1 font-medium">Opening balance applied to {bulkSuccessResult.opening_balance_applied} client(s).</p>
                                        )}
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            onClick={() => {
                                                setShowBulkModal(false);
                                                window.location.reload();
                                            }}
                                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-100 transition-all duration-200 cursor-pointer"
                                        >
                                            Done & Close
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* File Selection Zone */}
                                    <div 
                                        onDragEnter={handleDrag}
                                        onDragOver={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDrop={handleDrop}
                                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 relative cursor-pointer group ${
                                            dragActive 
                                                ? 'border-indigo-500 bg-indigo-50/50 shadow-inner' 
                                                : bulkFile 
                                                    ? 'border-emerald-500 bg-emerald-50/20' 
                                                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
                                        }`}
                                        onClick={() => bulkFileInputRef.current?.click()}
                                    >
                                        <input 
                                            ref={bulkFileInputRef}
                                            type="file"
                                            accept=".csv,.xlsx,.xls"
                                            className="hidden"
                                            onChange={handleBulkFileChange}
                                        />
                                        
                                        <div className={`p-4 rounded-full mb-3 transition-transform duration-300 group-hover:scale-110 ${
                                            bulkFile ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                        }`}>
                                            <FiFileText className="w-8 h-8" />
                                        </div>

                                        {bulkFile ? (
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{bulkFile.name}</p>
                                                <p className="text-xs text-slate-500 mt-1">{(bulkFile.size / 1024).toFixed(1)} KB • Click or drag to replace</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    Drag and drop your spreadsheet here, or <span className="text-indigo-600 hover:underline">browse</span>
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">Supports Excel (.xlsx, .xls) and CSV (.csv) files</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mappings View */}
                                    {bulkFile && fileHeaders.length > 0 && !bulkPreview && !bulkSuccessResult && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 space-y-4 animate-fade-in">
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                    <FiSettings className="w-4 h-4 text-indigo-600" />
                                                    Define Column Mappings
                                                </h4>
                                                <p className="text-[11px] text-slate-505 mt-1">
                                                    Map the expected client profile details to the headers in your uploaded spreadsheet. Required columns must be selected.
                                                </p>
                                            </div>
                                            
                                            {/* Required fields */}
                                            <div className="space-y-3 pb-2 border-b border-slate-200/60">
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Required Fields</h5>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {[
                                                        { key: 'name', label: 'Client Name *', placeholder: '-- Map Name Column --' },
                                                        { key: 'mobile', label: 'Mobile Number *', placeholder: '-- Map Mobile Column --' },
                                                        { key: 'email', label: 'Email Address *', placeholder: '-- Map Email Column --' },
                                                        { key: 'pan_number', label: 'PAN Number *', placeholder: '-- Map PAN Column --' },
                                                        { key: 'gender', label: 'Gender *', placeholder: '-- Map Gender Column --' },
                                                        { key: 'date_of_birth', label: 'Date of Birth *', placeholder: '-- Map DOB Column --' },
                                                        { key: 'state', label: 'State *', placeholder: '-- Map State Column --' },
                                                        { key: 'district', label: 'District *', placeholder: '-- Map District Column --' },
                                                        { key: 'city', label: 'City/Town/Village *', placeholder: '-- Map City Column --' },
                                                        { key: 'pincode', label: 'Pincode *', placeholder: '-- Map Pincode Column --' }
                                                    ].map(field => (
                                                        <div key={field.key} className="bg-white p-2.5 border border-slate-200 rounded-lg space-y-1 shadow-sm">
                                                            <label className="block text-[11px] font-bold text-slate-700">{field.label}</label>
                                                            <select
                                                                value={columnMappings[field.key] || ''}
                                                                onChange={(e) => setColumnMappings(prev => ({
                                                                    ...prev,
                                                                    [field.key]: e.target.value
                                                                }))}
                                                                className={`w-full px-2 py-1 border rounded text-xs bg-white outline-none focus:ring-1 focus:ring-indigo-500 ${
                                                                    !columnMappings[field.key] ? 'border-amber-350 bg-amber-50/10' : 'border-slate-300'
                                                                }`}
                                                            >
                                                                <option value="">{field.placeholder}</option>
                                                                {fileHeaders.map(h => (
                                                                    <option key={h} value={h}>{h}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Optional fields */}
                                            <div className="space-y-3 pt-1">
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Optional Fields</h5>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                    {[
                                                        { key: 'care_of', label: 'Care Of (C/O)' },
                                                        { key: 'guardian_name', label: 'Guardian Name' },
                                                        { key: 'firm_name', label: 'Firm Name' },
                                                        { key: 'firm_type', label: 'Business Type' },
                                                        { key: 'gst', label: 'GSTIN' },
                                                        { key: 'firm_pan', label: 'Firm PAN' },
                                                        { key: 'opening_balance', label: 'Opening Balance' },
                                                        { key: 'opening_balance_type', label: 'Balance Type' },
                                                        { key: 'opening_balance_date', label: 'Balance Date' }
                                                    ].map(field => (
                                                        <div key={field.key} className="bg-white p-2.5 border border-slate-200 rounded-lg space-y-1 shadow-sm">
                                                            <label className="block text-[10px] font-bold text-slate-600">{field.label}</label>
                                                            <select
                                                                value={columnMappings[field.key] || ''}
                                                                onChange={(e) => setColumnMappings(prev => ({
                                                                    ...prev,
                                                                    [field.key]: e.target.value
                                                                }))}
                                                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                                                            >
                                                                <option value="">-- Skip Column --</option>
                                                                {fileHeaders.map(h => (
                                                                    <option key={h} value={h}>{h}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Quick Guide when no file is uploaded */}
                                    {!bulkFile && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-slate-200/60 pb-2">
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Column Headers Guideline</h4>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Reference headers & templates below</p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            downloadBlankTemplate();
                                                        }}
                                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer bg-white border border-slate-250 px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                                                    >
                                                        <FiUpload className="w-3.5 h-3.5 rotate-180" />
                                                        Blank Template
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            downloadSampleCSV();
                                                        }}
                                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer bg-white border border-slate-250 px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                                                    >
                                                        <FiUpload className="w-3.5 h-3.5 rotate-180" />
                                                        Demo Template
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Table Preview of expected columns */}
                                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse text-[11px]">
                                                        <thead>
                                                            <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                                                                <th className="px-3 py-2">Expected Column Header</th>
                                                                <th className="px-3 py-2">Type</th>
                                                                <th className="px-3 py-2">Aliases Accepted</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                                            <tr className="hover:bg-slate-50/20">
                                                                <td className="px-3 py-2 text-indigo-700 font-semibold">Client Name</td>
                                                                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Required</span></td>
                                                                <td className="px-3 py-2 text-slate-500 font-normal">name, full name, fullname</td>
                                                            </tr>
                                                            <tr className="hover:bg-slate-50/20">
                                                                <td className="px-3 py-2 text-indigo-700 font-semibold">Mobile</td>
                                                                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Required</span></td>
                                                                <td className="px-3 py-2 text-slate-500 font-normal font-mono">phone, mobile number, mobile_no</td>
                                                            </tr>
                                                            <tr className="hover:bg-slate-50/20">
                                                                <td className="px-3 py-2 text-indigo-700 font-semibold">Email</td>
                                                                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Required</span></td>
                                                                <td className="px-3 py-2 text-slate-500 font-normal">email address, e-mail, mail</td>
                                                            </tr>
                                                            <tr className="hover:bg-slate-50/20">
                                                                <td className="px-3 py-2 text-indigo-700 font-semibold">PAN</td>
                                                                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Required</span></td>
                                                                <td className="px-3 py-2 text-slate-500 font-normal font-mono">pan number, pan_no, client_pan</td>
                                                            </tr>
                                                            <tr className="hover:bg-slate-50/20">
                                                                <td className="px-3 py-2 text-indigo-700 font-semibold">Gender</td>
                                                                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Required</span></td>
                                                                <td className="px-3 py-2 text-slate-500 font-normal">sex</td>
                                                            </tr>
                                                            <tr className="hover:bg-slate-50/20">
                                                                <td className="px-3 py-2 text-indigo-700 font-semibold">DOB</td>
                                                                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Required</span></td>
                                                                <td className="px-3 py-2 text-slate-500 font-normal">date of birth, date_of_birth</td>
                                                            </tr>
                                                            <tr className="hover:bg-slate-50/20">
                                                                <td className="px-3 py-2 text-indigo-700 font-semibold">State / District</td>
                                                                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Required</span></td>
                                                                <td className="px-3 py-2 text-slate-500 font-normal">-</td>
                                                            </tr>
                                                            <tr className="hover:bg-slate-50/20">
                                                                <td className="px-3 py-2 text-indigo-700 font-semibold">City</td>
                                                                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Required</span></td>
                                                                <td className="px-3 py-2 text-slate-500 font-normal">town, village, city/town/village</td>
                                                            </tr>
                                                            <tr className="hover:bg-slate-50/20">
                                                                <td className="px-3 py-2 text-indigo-700 font-semibold">Pincode</td>
                                                                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Required</span></td>
                                                                <td className="px-3 py-2 text-slate-500 font-normal">pin, zipcode, postal code</td>
                                                            </tr>
                                                            <tr className="hover:bg-slate-50/20">
                                                                <td className="px-3 py-2 text-slate-600 font-semibold">Other Fields</td>
                                                                <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">Optional</span></td>
                                                                <td className="px-3 py-2 text-slate-500 font-normal text-[10px]">Care Of, Guardian, Firm Name, Business Type, GSTIN, Firm PAN, Opening Balance/Type/Date</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Preview Section */}
                                    {bulkPreview && (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* Stats Row */}
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-center shadow-sm">
                                                    <p className="text-xs text-slate-500 font-medium uppercase">Total Rows</p>
                                                    <p className="text-xl font-extrabold text-slate-800 mt-1">{bulkPreview.total_rows}</p>
                                                </div>
                                                <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl text-center shadow-sm">
                                                    <p className="text-xs text-emerald-600 font-semibold uppercase">Valid Entries</p>
                                                    <p className="text-xl font-extrabold text-emerald-700 mt-1">{bulkPreview.valid_count}</p>
                                                </div>
                                                <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-xl text-center shadow-sm">
                                                    <p className="text-xs text-rose-600 font-semibold uppercase">Invalid Entries</p>
                                                    <p className="text-xl font-extrabold text-rose-700 mt-1">{bulkPreview.invalid_count}</p>
                                                </div>
                                            </div>

                                            {/* Errors List if any */}
                                            {bulkPreview.invalid_count > 0 && bulkPreview.errors && bulkPreview.errors.length > 0 && (
                                                <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-4 shadow-sm">
                                                    <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                                                        <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 animate-ping"></span>
                                                        Validation Errors (Must be resolved to proceed)
                                                    </h4>
                                                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                                        {bulkPreview.errors.map((err, idx) => (
                                                            <div key={idx} className="bg-white border border-rose-100 p-2.5 rounded-lg text-xs flex flex-col gap-1 shadow-sm">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-semibold text-rose-900">Row {err.row}</span>
                                                                    {err.name && <span className="text-slate-500 italic font-medium">{err.name}</span>}
                                                                </div>
                                                                <ul className="list-disc list-inside pl-1 text-slate-700 space-y-0.5">
                                                                    {err.errors.map((subErr, subIdx) => (
                                                                        <li key={subIdx}>{subErr}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Preview Grid Table for Valid Records */}
                                            {bulkPreview.preview && bulkPreview.preview.length > 0 && (
                                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Previewing Valid Entries</h4>
                                                        <span className="text-[10px] text-slate-500 font-medium bg-slate-200/60 px-2 py-0.5 rounded-full">Showing up to 5 rows</span>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse text-xs">
                                                            <thead>
                                                                <tr className="bg-slate-50/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                                                                    <th className="px-4 py-2 font-medium">Name</th>
                                                                    <th className="px-4 py-2 font-medium">Mobile</th>
                                                                    <th className="px-4 py-2 font-medium">Email</th>
                                                                    <th className="px-4 py-2 font-medium">PAN</th>
                                                                    <th className="px-4 py-2 font-medium">Location</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                                                {bulkPreview.preview.slice(0, 5).map((row, idx) => (
                                                                    <tr key={idx} className="hover:bg-slate-50/40">
                                                                        <td className="px-4 py-2.5 font-medium text-slate-900">{row.name}</td>
                                                                        <td className="px-4 py-2.5">{row.mobile}</td>
                                                                        <td className="px-4 py-2.5">{row.email}</td>
                                                                        <td className="px-4 py-2.5 font-mono">{row.pan_number || row.pan}</td>
                                                                        <td className="px-4 py-2.5">{row.city || row.city_town_village || 'N/A'}, {row.state}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        {!bulkSuccessResult && (
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                                <div>
                                    {bulkFile && (
                                        <button 
                                            onClick={resetBulkState}
                                            className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold cursor-pointer"
                                            disabled={bulkLoading}
                                        >
                                            Clear / Reset
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowBulkModal(false)}
                                        className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                                        disabled={bulkLoading}
                                    >
                                        Cancel
                                    </button>
                                    
                                    {!bulkPreview ? (
                                        <button
                                            onClick={handleBulkPreview}
                                            disabled={bulkLoading || !bulkFile}
                                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg flex items-center gap-2 shadow-md shadow-indigo-100 transition-all cursor-pointer"
                                        >
                                            {bulkLoading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Analyzing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FiSearch className="w-4 h-4" />
                                                    <span>Analyze Spreadsheet</span>
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleBulkImport}
                                            disabled={bulkLoading || bulkPreview.invalid_count > 0 || bulkPreview.valid_count === 0}
                                            className={`px-5 py-2 text-white text-sm font-semibold rounded-lg flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                                                bulkPreview.invalid_count > 0 || bulkPreview.valid_count === 0
                                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                                            }`}
                                        >
                                            {bulkLoading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Importing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FiCheck className="w-4 h-4" />
                                                    <span>Import {bulkPreview.valid_count} Clients</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default CreateClient;