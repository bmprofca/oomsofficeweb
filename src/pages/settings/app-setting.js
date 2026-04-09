import React, { useState, useEffect, useRef } from 'react';
import { FiSettings, FiFileText, FiImage } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Header, Sidebar } from '../../components/header';
import StateDistrictSelect from '../../components/state-district-select';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';

const AppSettings = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(true);

    // App settings state
    const [appSettings, setAppSettings] = useState({
        app_name: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        mobile_1: '',
        mobile_2: '',
        email_1: '',
        email_2: '',
        pan: '',
        gst_number: '',
        gst_rate: ''
    });

    // Invoice settings state
    const [invoiceSettings, setInvoiceSettings] = useState({
        address: '',
    });

    // File upload states
    const [logoFile, setLogoFile] = useState(null);
    const [signFile, setSignFile] = useState(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [signUrl, setSignUrl] = useState('');
    const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
    const [signPreviewUrl, setSignPreviewUrl] = useState('');
    const [panVerified, setPanVerified] = useState(null);
    const [gstVerified, setGstVerified] = useState(null);
    const [isLogoDragging, setIsLogoDragging] = useState(false);
    const [isSignDragging, setIsSignDragging] = useState(false);
    const logoInputRef = useRef(null);
    const signInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState('details');
    const [detailsSaving, setDetailsSaving] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [signUploading, setSignUploading] = useState(false);
    const [logoPublicUrl, setLogoPublicUrl] = useState('');
    const [signPublicUrl, setSignPublicUrl] = useState('');

    useEffect(() => {
        return () => {
            if (logoPreviewUrl) {
                URL.revokeObjectURL(logoPreviewUrl);
            }
            if (signPreviewUrl) {
                URL.revokeObjectURL(signPreviewUrl);
            }
        };
    }, [logoPreviewUrl, signPreviewUrl]);

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

    // Load initial data
    useEffect(() => {
        fetchSettingsData();
    }, []);

    const applyBranchDetailsData = (data = {}) => {
        const basic = data?.basic || {};
        const address = basic?.address || {};
        const mobile = basic?.mobile || {};
        const email = basic?.email || {};
        const gst = basic?.gst || {};
        const image = data?.image || {};
        const invoice = data?.invoice || {};
        const gstRateValue = gst?.gst_rate ? String(Number(gst.gst_rate)) : '0';

        setAppSettings(prev => ({
            ...prev,
            app_name: basic?.name || '',
            address_line_1: address?.address_line_1 || '',
            address_line_2: address?.address_line_2 || '',
            city: address?.city || '',
            state: address?.state || '',
            pincode: address?.pincode ? String(address.pincode) : '',
            country: address?.country || 'India',
            mobile_1: mobile?.mobile_1 ? String(mobile.mobile_1) : '',
            mobile_2: mobile?.mobile_2 ? String(mobile.mobile_2) : '',
            email_1: email?.email_1 || '',
            email_2: email?.email_2 || '',
            pan: basic?.pan?.pan || '',
            gst_number: gst?.gst || '',
            gst_rate: ['0', '5', '18', '40'].includes(gstRateValue) ? gstRateValue : '0',
        }));

        setInvoiceSettings(prev => ({
            ...prev,
            address: invoice?.address || prev.address,
        }));

        setLogoUrl(image?.logo || '');
        setSignUrl(image?.sign || '');
        setLogoPublicUrl('');
        setSignPublicUrl('');
        setPanVerified(Boolean(basic?.pan?.is_pan_verified));
        setGstVerified(Boolean(gst?.is_gst_verified));
    };

    const fetchSettingsData = async () => {
        const headers = getHeaders();
        if (!headers) {
            setLoading(false);
            toast.error('Missing authentication. Please sign in again.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/settings/branch/details`, {
                method: 'GET',
                headers,
            });

            const json = await response.json();
            if (!response.ok || !json?.success) {
                throw new Error(json?.message || `Request failed (${response.status})`);
            }
            applyBranchDetailsData(json?.data || {});
        } catch (error) {
            console.error('Branch details fetch error:', error);
            toast.error(error?.message || 'Failed to load app settings');
        } finally {
            setLoading(false);
        }
    };

    // Skeleton Loading Component
    const SkeletonLoader = () => (
        <div className="min-h-screen bg-gray-50">
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
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column Skeleton */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm animate-pulse">
                                <div className="border-b border-gray-200 px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-gray-200 rounded"></div>
                                        <div className="h-6 bg-gray-200 rounded w-32"></div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        {[...Array(8)].map((_, i) => (
                                            <div key={i}>
                                                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                                <div className="h-10 bg-gray-100 rounded"></div>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                                        </div>
                                        <div className="pt-4">
                                            <div className="h-10 bg-gray-200 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column Skeleton */}
                        <div className="space-y-6">
                            {/* Logo Settings Skeleton */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm animate-pulse">
                                <div className="border-b border-gray-200 px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-gray-200 rounded"></div>
                                        <div className="h-6 bg-gray-200 rounded w-40"></div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="text-center mb-4">
                                        <div className="inline-block p-4 bg-gray-100 rounded-lg">
                                            <div className="w-12 h-12 bg-gray-200 rounded"></div>
                                        </div>
                                        <div className="h-4 bg-gray-200 rounded w-24 mx-auto mt-2"></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                                            <div className="h-10 bg-gray-100 rounded"></div>
                                        </div>
                                        <div className="h-10 bg-gray-200 rounded"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Signature Settings Skeleton */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm animate-pulse">
                                <div className="border-b border-gray-200 px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-gray-200 rounded"></div>
                                        <div className="h-6 bg-gray-200 rounded w-48"></div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="text-center mb-4">
                                        <div className="inline-block p-4 bg-gray-100 rounded-lg">
                                            <div className="w-12 h-12 bg-gray-200 rounded"></div>
                                        </div>
                                        <div className="h-4 bg-gray-200 rounded w-32 mx-auto mt-2"></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="h-4 bg-gray-200 rounded w-36 mb-2"></div>
                                            <div className="h-10 bg-gray-100 rounded"></div>
                                        </div>
                                        <div className="h-10 bg-gray-200 rounded"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Settings Skeleton */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm animate-pulse">
                                <div className="border-b border-gray-200 px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-gray-200 rounded"></div>
                                        <div className="h-6 bg-gray-200 rounded w-40"></div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i}>
                                                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                                                <div className="h-10 bg-gray-100 rounded"></div>
                                            </div>
                                        ))}
                                        <div className="pt-2">
                                            <div className="h-10 bg-gray-200 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const handleAppSettingsChange = (field, value) => {
        if (field === 'state') {
            setAppSettings(prev => ({
                ...prev,
                state: value,
                city: '',
            }));
            return;
        }

        setAppSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleInvoiceSettingsChange = (field, value) => {
        setInvoiceSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleLogoFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processImageSelection(selectedFile, 'logo');
        }
    };

    const handleSignFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processImageSelection(selectedFile, 'sign');
        }
    };

    const clearSelectedFile = (type) => {
        if (type === 'logo') {
            setLogoFile(null);
            setLogoPublicUrl('');
            if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
            setLogoPreviewUrl('');
            if (logoInputRef.current) logoInputRef.current.value = '';
            return;
        }
        setSignFile(null);
        setSignPublicUrl('');
        if (signPreviewUrl) URL.revokeObjectURL(signPreviewUrl);
        setSignPreviewUrl('');
        if (signInputRef.current) signInputRef.current.value = '';
    };

    const handleAppSettingsSubmit = async (e) => {
        e.preventDefault();
        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication. Please sign in again.');
            return;
        }

        setDetailsSaving(true);
        try {
            const payload = {
                name: appSettings.app_name,
                address: {
                    address_line_1: appSettings.address_line_1,
                    address_line_2: appSettings.address_line_2,
                    city: appSettings.city,
                    state: appSettings.state,
                    pincode: appSettings.pincode,
                    country: 'India',
                },
                mobile: {
                    mobile_1: appSettings.mobile_1,
                    mobile_2: appSettings.mobile_2,
                },
                email: {
                    email_1: appSettings.email_1,
                    email_2: appSettings.email_2,
                },
                pan: {
                    pan: appSettings.pan,
                },
                gst: {
                    gst: appSettings.gst_number,
                    gst_rate: Number(appSettings.gst_rate).toFixed(2),
                },
            };

            const response = await fetch(`${API_BASE_URL}/settings/branch/update`, {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const json = await response.json();
            if (!response.ok || !json?.success) {
                throw new Error(json?.message || `Update failed (${response.status})`);
            }

            applyBranchDetailsData(json?.data || {});
            toast.success(json?.message || 'Branch details updated successfully!');
        } catch (error) {
            console.error('Branch details update error:', error);
            toast.error(error?.message || 'Failed to update branch details');
        } finally {
            setDetailsSaving(false);
        }
    };

    const handleInvoiceSettingsSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        setTimeout(() => {
            setLoading(false);
            toast.success('Invoice settings updated successfully!');
        }, 1000);
    };

    const uploadFileToServer = async (file) => {
        const headers = getHeaders();
        if (!headers) {
            throw new Error('Authentication headers not found');
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
            headers: {
                ...headers,
                'Content-Type': 'multipart/form-data',
            },
            timeout: 60000,
        });

        if (!response?.data?.success) {
            throw new Error(response?.data?.message || 'File upload failed');
        }

        return response.data?.data?.url || response.data?.url;
    };

    const processImageSelection = async (file, type) => {
        if (!file.type?.startsWith('image/')) {
            toast.error(`Please select a valid image file for ${type === 'logo' ? 'logo' : 'signature'}.`);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        if (type === 'logo') {
            if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
            setLogoFile(file);
            setLogoPreviewUrl(objectUrl);
            setLogoUploading(true);
            try {
                const uploadedUrl = await uploadFileToServer(file);
                if (!uploadedUrl) throw new Error('Uploaded logo URL not found');
                setLogoPublicUrl(uploadedUrl);
                toast.success('Logo uploaded. Click submit to save.');
            } catch (error) {
                console.error('Logo pre-upload error:', error);
                setLogoPublicUrl('');
                toast.error(error?.message || 'Failed to upload logo file');
            } finally {
                setLogoUploading(false);
            }
            return;
        }

        if (signPreviewUrl) URL.revokeObjectURL(signPreviewUrl);
        setSignFile(file);
        setSignPreviewUrl(objectUrl);
        setSignUploading(true);
        try {
            const uploadedUrl = await uploadFileToServer(file);
            if (!uploadedUrl) throw new Error('Uploaded signature URL not found');
            setSignPublicUrl(uploadedUrl);
            toast.success('Signature uploaded. Click submit to save.');
        } catch (error) {
            console.error('Signature pre-upload error:', error);
            setSignPublicUrl('');
            toast.error(error?.message || 'Failed to upload signature file');
        } finally {
            setSignUploading(false);
        }
    };

    const handleLogoUpload = async (e) => {
        e.preventDefault();
        if (!logoPublicUrl) {
            toast.error('Please select and upload a logo image first.');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication. Please sign in again.');
            return;
        }

        setLogoUploading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/settings/branch/logo`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ logo: logoPublicUrl }),
            });

            const json = await response.json();
            if (!response.ok || !json?.success) {
                throw new Error(json?.message || `Logo update failed (${response.status})`);
            }

            setLogoUrl(json?.data?.logo || logoPublicUrl);
            setLogoPublicUrl('');
            clearSelectedFile('logo');
            toast.success(json?.message || 'Branch logo updated successfully!');
        } catch (error) {
            console.error('Logo upload/update error:', error);
            toast.error(error?.message || 'Failed to upload logo');
        } finally {
            setLogoUploading(false);
        }
    };

    const handleSignUpload = async (e) => {
        e.preventDefault();
        if (!signPublicUrl) {
            toast.error('Please select and upload a signature image first.');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication. Please sign in again.');
            return;
        }

        setSignUploading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/settings/branch/sign`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sign: signPublicUrl }),
            });

            const json = await response.json();
            if (!response.ok || !json?.success) {
                throw new Error(json?.message || `Signature update failed (${response.status})`);
            }

            setSignUrl(json?.data?.sign || signPublicUrl);
            setSignPublicUrl('');
            clearSelectedFile('sign');
            toast.success(json?.message || 'Branch sign updated successfully!');
        } catch (error) {
            console.error('Signature upload/update error:', error);
            toast.error(error?.message || 'Failed to upload signature');
        } finally {
            setSignUploading(false);
        }
    };

    const handleLogoDrop = (e) => {
        e.preventDefault();
        setIsLogoDragging(false);
        const droppedFile = e.dataTransfer?.files?.[0];
        if (droppedFile) {
            processImageSelection(droppedFile, 'logo');
        }
    };

    const handleSignDrop = (e) => {
        e.preventDefault();
        setIsSignDragging(false);
        const droppedFile = e.dataTransfer?.files?.[0];
        if (droppedFile) {
            processImageSelection(droppedFile, 'sign');
        }
    };

    // Show skeleton while loading
    if (loading) {
        return <SkeletonLoader />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
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
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h5 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <FiSettings className="w-5 h-5" />
                                App Settings
                            </h5>
                            <div className="mt-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 p-1.5">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('details')}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${activeTab === 'details' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-700 border-transparent hover:border-indigo-200 hover:text-indigo-700'}`}
                                    >
                                        <FiSettings className="w-4 h-4" />
                                        <span>Details</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('logo')}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${activeTab === 'logo' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-700 border-transparent hover:border-indigo-200 hover:text-indigo-700'}`}
                                    >
                                        <FiImage className="w-4 h-4" />
                                        <span>Logo</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('signature')}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${activeTab === 'signature' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-700 border-transparent hover:border-indigo-200 hover:text-indigo-700'}`}
                                    >
                                        <FiFileText className="w-4 h-4" />
                                        <span>Signature</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('invoice')}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${activeTab === 'invoice' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-700 border-transparent hover:border-indigo-200 hover:text-indigo-700'}`}
                                    >
                                        <FiFileText className="w-4 h-4" />
                                        <span>Invoice</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            {activeTab === 'details' && (
                                <form onSubmit={handleAppSettingsSubmit}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                App Name
                                            </label>
                                            <input
                                                type="text"
                                                value={appSettings.app_name}
                                                onChange={(e) => handleAppSettingsChange('app_name', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                placeholder="App Name"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Address Line 1
                                            </label>
                                            <input
                                                type="text"
                                                value={appSettings.address_line_1}
                                                onChange={(e) => handleAppSettingsChange('address_line_1', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                placeholder="Address line 1"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Address Line 2
                                                </label>
                                                <input
                                                    type="text"
                                                    value={appSettings.address_line_2}
                                                    onChange={(e) => handleAppSettingsChange('address_line_2', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Address line 2"
                                                />
                                            </div>
                                        </div>

                                        <StateDistrictSelect
                                            selectedState={appSettings.state}
                                            selectedDistrict={appSettings.city}
                                            onStateChange={(value) => handleAppSettingsChange('state', value)}
                                            onDistrictChange={(value) => handleAppSettingsChange('city', value)}
                                        />

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Pincode
                                            </label>
                                            <input
                                                type="text"
                                                value={appSettings.pincode}
                                                onChange={(e) => handleAppSettingsChange('pincode', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                placeholder="Pincode"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Mobile 1
                                                </label>
                                                <input
                                                    type="text"
                                                    value={appSettings.mobile_1}
                                                    onChange={(e) => handleAppSettingsChange('mobile_1', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Primary mobile"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Mobile 2
                                                </label>
                                                <input
                                                    type="text"
                                                    value={appSettings.mobile_2}
                                                    onChange={(e) => handleAppSettingsChange('mobile_2', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Secondary mobile"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Email 1
                                                </label>
                                                <input
                                                    type="email"
                                                    value={appSettings.email_1}
                                                    onChange={(e) => handleAppSettingsChange('email_1', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Primary email"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Email 2
                                                </label>
                                                <input
                                                    type="email"
                                                    value={appSettings.email_2}
                                                    onChange={(e) => handleAppSettingsChange('email_2', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Secondary email"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    PAN
                                                </label>
                                                <input
                                                    type="text"
                                                    value={appSettings.pan}
                                                    onChange={(e) => handleAppSettingsChange('pan', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="PAN Number"
                                                    maxLength="10"
                                                />
                                                <p className={`mt-2 text-xs font-medium ${panVerified ? 'text-green-600' : 'text-amber-600'}`}>
                                                    PAN {panVerified ? 'Verified' : 'Not Verified'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    GST Number
                                                </label>
                                                <input
                                                    type="text"
                                                    value={appSettings.gst_number}
                                                    onChange={(e) => handleAppSettingsChange('gst_number', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="GST Number"
                                                />
                                                <p className={`mt-2 text-xs font-medium ${gstVerified ? 'text-green-600' : 'text-amber-600'}`}>
                                                    GST {gstVerified ? 'Verified' : 'Not Verified'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    GST Rate (%)
                                                </label>
                                                <select
                                                    value={appSettings.gst_rate}
                                                    onChange={(e) => handleAppSettingsChange('gst_rate', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                >
                                                    <option value="0">0%</option>
                                                    <option value="5">5%</option>
                                                    <option value="18">18%</option>
                                                    <option value="40">40%</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <motion.button
                                                type="submit"
                                                disabled={detailsSaving}
                                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {detailsSaving ? 'Updating...' : 'Update App Settings'}
                                            </motion.button>
                                        </div>
                                    </div>
                                </form>
                            )}

                            {activeTab === 'logo' && (
                                <div>
                                    <h6 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
                                        <FiImage className="w-5 h-5" />
                                        Logo Settings
                                    </h6>
                                    <div className="text-center mb-4">
                                        <div className="inline-block p-4 bg-gray-100 rounded-lg">
                                            {logoUrl ? (
                                                <img src={logoUrl} alt="Current Logo" className="w-12 h-12 object-contain" />
                                            ) : (
                                                <FiImage className="w-12 h-12 text-gray-400" />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-2">Current Logo</p>
                                    </div>
                                    <form onSubmit={handleLogoUpload}>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Website Logo <span className="text-red-500 text-sm">*1:1 ratio recommended</span>
                                                </label>
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => logoInputRef.current?.click()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') logoInputRef.current?.click();
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        setIsLogoDragging(true);
                                                    }}
                                                    onDragLeave={() => setIsLogoDragging(false)}
                                                    onDrop={handleLogoDrop}
                                                    className={`w-full rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition ${isLogoDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50'}`}
                                                >
                                                    {logoPreviewUrl ? (
                                                        <img src={logoPreviewUrl} alt="Selected Logo Preview" className="mx-auto h-20 w-20 object-contain rounded-md border border-gray-200 bg-white p-1" />
                                                    ) : (
                                                        <FiImage className="mx-auto h-8 w-8 text-gray-400" />
                                                    )}
                                                    <p className="mt-2 text-sm font-medium text-gray-700">{logoPreviewUrl ? 'Selected logo preview' : 'Drag and drop logo here'}</p>
                                                    <p className="text-xs text-gray-500">{logoPreviewUrl ? 'File uploaded, click to replace' : 'or click to browse'}</p>
                                                    {logoFile && <p className="mt-2 text-xs text-indigo-600">{logoFile.name}</p>}
                                                    {logoPublicUrl && <p className="mt-1 text-[11px] text-green-600">Upload complete. Ready to submit.</p>}
                                                </div>
                                                <input
                                                    ref={logoInputRef}
                                                    type="file"
                                                    onChange={handleLogoFileChange}
                                                    className="hidden"
                                                    accept="image/*"
                                                    required={!logoFile}
                                                />
                                                {logoFile && (
                                                    <div className="mt-3 flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => logoInputRef.current?.click()}
                                                            className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
                                                        >
                                                            Change file
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => clearSelectedFile('logo')}
                                                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                                                        >
                                                            Remove file
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <motion.button
                                                type="submit"
                                                disabled={logoUploading || !logoPublicUrl}
                                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {logoUploading ? 'Uploading file...' : 'Save Logo'}
                                            </motion.button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'signature' && (
                                <div>
                                    <h6 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
                                        <FiFileText className="w-5 h-5" />
                                        Upload Invoice Sign
                                    </h6>
                                    <div className="text-center mb-4">
                                        <div className="inline-block p-4 bg-gray-100 rounded-lg">
                                            {signUrl ? (
                                                <img src={signUrl} alt="Current Signature" className="w-12 h-12 object-contain" />
                                            ) : (
                                                <FiFileText className="w-12 h-12 text-gray-400" />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-2">Current Signature</p>
                                    </div>
                                    <form onSubmit={handleSignUpload}>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Upload Signature
                                                </label>
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => signInputRef.current?.click()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') signInputRef.current?.click();
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        setIsSignDragging(true);
                                                    }}
                                                    onDragLeave={() => setIsSignDragging(false)}
                                                    onDrop={handleSignDrop}
                                                    className={`w-full rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition ${isSignDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50'}`}
                                                >
                                                    {signPreviewUrl ? (
                                                        <img src={signPreviewUrl} alt="Selected Signature Preview" className="mx-auto h-20 w-20 object-contain rounded-md border border-gray-200 bg-white p-1" />
                                                    ) : (
                                                        <FiFileText className="mx-auto h-8 w-8 text-gray-400" />
                                                    )}
                                                    <p className="mt-2 text-sm font-medium text-gray-700">{signPreviewUrl ? 'Selected signature preview' : 'Drag and drop signature here'}</p>
                                                    <p className="text-xs text-gray-500">{signPreviewUrl ? 'File uploaded, click to replace' : 'or click to browse'}</p>
                                                    {signFile && <p className="mt-2 text-xs text-indigo-600">{signFile.name}</p>}
                                                    {signPublicUrl && <p className="mt-1 text-[11px] text-green-600">Upload complete. Ready to submit.</p>}
                                                </div>
                                                <input
                                                    ref={signInputRef}
                                                    type="file"
                                                    onChange={handleSignFileChange}
                                                    className="hidden"
                                                    accept="image/*"
                                                    required={!signFile}
                                                />
                                                {signFile && (
                                                    <div className="mt-3 flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => signInputRef.current?.click()}
                                                            className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
                                                        >
                                                            Change file
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => clearSelectedFile('sign')}
                                                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                                                        >
                                                            Remove file
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <motion.button
                                                type="submit"
                                                disabled={signUploading || !signPublicUrl}
                                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {signUploading ? 'Uploading file...' : 'Save Signature'}
                                            </motion.button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'invoice' && (
                                <div>
                                    <h6 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
                                        <FiFileText className="w-5 h-5" />
                                        Invoice Address
                                    </h6>
                                    <form onSubmit={handleInvoiceSettingsSubmit}>
                                        <div className="space-y-4 max-w-2xl">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Invoice Address
                                                </label>
                                                <textarea
                                                    value={invoiceSettings.address}
                                                    onChange={(e) => handleInvoiceSettingsChange('address', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    rows="3"
                                                    placeholder="Invoice address"
                                                    required
                                                />
                                            </div>

                                            <div className="pt-2">
                                                <motion.button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    {loading ? 'Updating...' : 'Update Invoice Settings'}
                                                </motion.button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppSettings;