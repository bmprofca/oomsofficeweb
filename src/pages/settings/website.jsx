import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header, Sidebar } from '../../components/header';
import { 
    FiSettings, 
    FiInfo, 
    FiPhone, 
    FiMail, 
    FiMapPin, 
    FiLayout,
    FiPlus, 
    FiTrash2,
    FiEye,
    FiEyeOff,
    FiUpload,
    FiDownload,
    FiSave,
    FiRefreshCw
} from 'react-icons/fi';

const WebsiteSettings = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [settings, setSettings] = useState({});

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

    // Mock initial settings data
    const initialSettings = {
        basic: {
            websiteName: 'Your Company Name',
            websiteTagline: 'Your compelling tagline here',
            websiteDescription: 'Brief description of your company and services',
            logo: null,
            favicon: null,
            language: 'en',
            timezone: 'UTC+5:30',
            currency: 'INR',
            dateFormat: 'DD/MM/YYYY'
        },
        contact: {
            primaryEmail: 'contact@company.com',
            supportEmail: 'support@company.com',
            salesEmail: 'sales@company.com',
            primaryPhone: '+91 9876543210',
            secondaryPhone: '+91 9876543211',
            telephone: '080-1234567',
            fax: '080-1234568',
            addresses: [
                {
                    id: 1,
                    type: 'headquarters',
                    name: 'Head Office',
                    address: '123 Main Street, Bangalore',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    country: 'India',
                    pincode: '560001',
                    isPrimary: true
                },
                {
                    id: 2,
                    type: 'branch',
                    name: 'Delhi Branch',
                    address: '456 Connaught Place',
                    city: 'New Delhi',
                    state: 'Delhi',
                    country: 'India',
                    pincode: '110001',
                    isPrimary: false
                }
            ]
        },
        colors: {
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF',
            accentColor: '#10B981',
            backgroundColor: '#FFFFFF',
            textColor: '#1F2937',
            linkColor: '#2563EB',
            gradientType: 'solid',
            gradientStart: '#3B82F6',
            gradientEnd: '#1E40AF',
            customCSS: ''
        },
        themes: {
            selectedTheme: 'modern',
            availableThemes: [
                { id: 'modern', name: 'Modern', description: 'Clean and contemporary design' },
                { id: 'classic', name: 'Classic', description: 'Traditional business look' },
                { id: 'minimal', name: 'Minimal', description: 'Simple and focused design' },
                { id: 'dark', name: 'Dark', description: 'Dark mode theme' },
                { id: 'professional', name: 'Professional', description: 'Corporate business theme' }
            ]
        },
        components: {
            enabledComponents: [
                { id: 'services', name: 'Services', enabled: true, order: 1 },
                { id: 'mission', name: 'Mission', enabled: true, order: 2 },
                { id: 'vision', name: 'Vision', enabled: true, order: 3 },
                { id: 'team', name: 'Team', enabled: false, order: 4 },
                { id: 'testimonials', name: 'Testimonials', enabled: true, order: 5 },
                { id: 'blog', name: 'Blog', enabled: false, order: 6 },
                { id: 'portfolio', name: 'Portfolio', enabled: true, order: 7 },
                { id: 'careers', name: 'Careers', enabled: false, order: 8 },
                { id: 'faq', name: 'FAQ', enabled: true, order: 9 },
                { id: 'partners', name: 'Partners', enabled: false, order: 10 }
            ],
            customComponents: [
                { id: 'custom1', name: 'Special Offers', enabled: true, custom: true }
            ]
        },
        seo: {
            metaTitle: 'Your Company - Best Services',
            metaDescription: 'Discover our premium services and solutions',
            metaKeywords: 'service, solution, company',
            googleAnalytics: '',
            facebookPixel: '',
            ogImage: null,
            robotsTxt: 'User-agent: *\nAllow: /',
            sitemapEnabled: true
        },
        social: {
            facebook: 'https://facebook.com/company',
            twitter: 'https://twitter.com/company',
            linkedin: 'https://linkedin.com/company',
            instagram: 'https://instagram.com/company',
            youtube: 'https://youtube.com/company',
            github: ''
        },
        advanced: {
            maintenanceMode: false,
            registrationEnabled: true,
            commentsEnabled: true,
            cacheEnabled: true,
            cdnEnabled: false,
            backupFrequency: 'daily',
            securityLevel: 'medium'
        }
    };

    // Load settings
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setSettings(initialSettings);
            setLoading(false);
        }, 1500);
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        // Simulate API save
        setTimeout(() => {
            setSaving(false);
            // Show success message
            alert('Settings saved successfully!');
        }, 2000);
    };

    const handleResetSettings = () => {
        if (window.confirm('Are you sure you want to reset all settings to default?')) {
            setSettings(initialSettings);
        }
    };

    const handleInputChange = (section, field, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleNestedChange = (section, subSection, field, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [subSection]: {
                    ...prev[section][subSection],
                    [field]: value
                }
            }
        }));
    };

    const handleArrayChange = (section, arrayField, index, field, value) => {
        setSettings(prev => {
            const newArray = [...prev[section][arrayField]];
            newArray[index] = { ...newArray[index], [field]: value };
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [arrayField]: newArray
                }
            };
        });
    };

    const addAddress = () => {
        const newAddress = {
            id: Date.now(),
            type: 'branch',
            name: '',
            address: '',
            city: '',
            state: '',
            country: '',
            pincode: '',
            isPrimary: false
        };
        setSettings(prev => ({
            ...prev,
            contact: {
                ...prev.contact,
                addresses: [...prev.contact.addresses, newAddress]
            }
        }));
    };

    const removeAddress = (index) => {
        setSettings(prev => ({
            ...prev,
            contact: {
                ...prev.contact,
                addresses: prev.contact.addresses.filter((_, i) => i !== index)
            }
        }));
    };

    const toggleComponent = (componentId) => {
        setSettings(prev => ({
            ...prev,
            components: {
                ...prev.components,
                enabledComponents: prev.components.enabledComponents.map(comp =>
                    comp.id === componentId ? { ...comp, enabled: !comp.enabled } : comp
                )
            }
        }));
    };

    const moveComponent = (componentId, direction) => {
        setSettings(prev => {
            const components = [...prev.components.enabledComponents];
            const index = components.findIndex(comp => comp.id === componentId);
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            
            if (newIndex >= 0 && newIndex < components.length) {
                [components[index], components[newIndex]] = [components[newIndex], components[index]];
                // Update order
                components.forEach((comp, idx) => {
                    comp.order = idx + 1;
                });
            }
            
            return {
                ...prev,
                components: {
                    ...prev.components,
                    enabledComponents: components
                }
            };
        });
    };

    const handleFileUpload = (field, file) => {
        // Simulate file upload
        const reader = new FileReader();
        reader.onload = (e) => {
            handleInputChange('basic', field, e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const tabs = [
        { id: 'basic', name: 'Basic Details', icon: FiInfo },
        { id: 'contact', name: 'Contact Info', icon: FiPhone },
        { id: 'colors', name: 'Colors & Styling', icon: FiLayout },
        { id: 'themes', name: 'Themes', icon: FiLayout },
        { id: 'components', name: 'Components', icon: FiSettings },
        { id: 'seo', name: 'SEO', icon: FiEye },
        { id: 'social', name: 'Social Media', icon: FiMail },
        { id: 'advanced', name: 'Advanced', icon: FiSettings }
    ];

    const renderTabContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            );
        }

        switch (activeTab) {
            case 'basic':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Website Name *
                                </label>
                                <input
                                    type="text"
                                    value={settings.basic?.websiteName || ''}
                                    onChange={(e) => handleInputChange('basic', 'websiteName', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    placeholder="Enter website name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Website Tagline
                                </label>
                                <input
                                    type="text"
                                    value={settings.basic?.websiteTagline || ''}
                                    onChange={(e) => handleInputChange('basic', 'websiteTagline', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    placeholder="Enter tagline"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Website Description
                            </label>
                            <textarea
                                value={settings.basic?.websiteDescription || ''}
                                onChange={(e) => handleInputChange('basic', 'websiteDescription', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                placeholder="Brief description of your website"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Logo Upload
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    {settings.basic?.logo ? (
                                        <div className="flex flex-col items-center">
                                            <img src={settings.basic.logo} alt="Logo" className="h-20 mb-2" />
                                            <button
                                                onClick={() => handleInputChange('basic', 'logo', null)}
                                                className="text-red-600 text-sm hover:text-red-800 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm text-gray-600 mb-2">
                                                Drag and drop your logo or click to browse
                                            </p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileUpload('logo', e.target.files[0])}
                                                className="hidden"
                                                id="logo-upload"
                                            />
                                            <label
                                                htmlFor="logo-upload"
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors inline-block"
                                            >
                                                Choose File
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Favicon Upload
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    {settings.basic?.favicon ? (
                                        <div className="flex flex-col items-center">
                                            <img src={settings.basic.favicon} alt="Favicon" className="h-8 mb-2" />
                                            <button
                                                onClick={() => handleInputChange('basic', 'favicon', null)}
                                                className="text-red-600 text-sm hover:text-red-800 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm text-gray-600 mb-2">
                                                Upload favicon (16x16 or 32x32 PNG)
                                            </p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileUpload('favicon', e.target.files[0])}
                                                className="hidden"
                                                id="favicon-upload"
                                            />
                                            <label
                                                htmlFor="favicon-upload"
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors inline-block"
                                            >
                                                Choose File
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Language
                                </label>
                                <select
                                    value={settings.basic?.language || 'en'}
                                    onChange={(e) => handleInputChange('basic', 'language', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                >
                                    <option value="en">English</option>
                                    <option value="hi">Hindi</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Timezone
                                </label>
                                <select
                                    value={settings.basic?.timezone || 'UTC+5:30'}
                                    onChange={(e) => handleInputChange('basic', 'timezone', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                >
                                    <option value="UTC+5:30">IST (UTC+5:30)</option>
                                    <option value="UTC">UTC</option>
                                    <option value="UTC-5">EST (UTC-5)</option>
                                    <option value="UTC-8">PST (UTC-8)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date Format
                                </label>
                                <select
                                    value={settings.basic?.dateFormat || 'DD/MM/YYYY'}
                                    onChange={(e) => handleInputChange('basic', 'dateFormat', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                >
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );

            case 'contact':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Primary Email *
                                </label>
                                <input
                                    type="email"
                                    value={settings.contact?.primaryEmail || ''}
                                    onChange={(e) => handleInputChange('contact', 'primaryEmail', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Support Email
                                </label>
                                <input
                                    type="email"
                                    value={settings.contact?.supportEmail || ''}
                                    onChange={(e) => handleInputChange('contact', 'supportEmail', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sales Email
                                </label>
                                <input
                                    type="email"
                                    value={settings.contact?.salesEmail || ''}
                                    onChange={(e) => handleInputChange('contact', 'salesEmail', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Primary Phone *
                                </label>
                                <input
                                    type="tel"
                                    value={settings.contact?.primaryPhone || ''}
                                    onChange={(e) => handleInputChange('contact', 'primaryPhone', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Secondary Phone
                                </label>
                                <input
                                    type="tel"
                                    value={settings.contact?.secondaryPhone || ''}
                                    onChange={(e) => handleInputChange('contact', 'secondaryPhone', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Telephone
                                </label>
                                <input
                                    type="tel"
                                    value={settings.contact?.telephone || ''}
                                    onChange={(e) => handleInputChange('contact', 'telephone', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-lg font-semibold text-gray-800">Office Addresses</h4>
                                <motion.button
                                    onClick={addAddress}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiPlus className="w-4 h-4" />
                                    Add Address
                                </motion.button>
                            </div>

                            <div className="space-y-4">
                                {settings.contact?.addresses?.map((address, index) => (
                                    <div key={address.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-4">
                                            <h5 className="font-medium text-gray-800">
                                                {address.name || `Address ${index + 1}`}
                                            </h5>
                                            <div className="flex items-center gap-2">
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={address.isPrimary}
                                                        onChange={(e) => handleArrayChange('contact', 'addresses', index, 'isPrimary', e.target.checked)}
                                                        className="rounded"
                                                    />
                                                    Primary
                                                </label>
                                                <button
                                                    onClick={() => removeAddress(index)}
                                                    className="text-red-600 hover:text-red-800 transition-colors"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Address Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={address.name}
                                                    onChange={(e) => handleArrayChange('contact', 'addresses', index, 'name', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-all duration-200"
                                                    placeholder="e.g., Head Office"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Type
                                                </label>
                                                <select
                                                    value={address.type}
                                                    onChange={(e) => handleArrayChange('contact', 'addresses', index, 'type', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-all duration-200"
                                                >
                                                    <option value="headquarters">Headquarters</option>
                                                    <option value="branch">Branch</option>
                                                    <option value="warehouse">Warehouse</option>
                                                    <option value="store">Store</option>
                                                </select>
                                            </div>
                                            <div className="lg:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Street Address
                                                </label>
                                                <input
                                                    type="text"
                                                    value={address.address}
                                                    onChange={(e) => handleArrayChange('contact', 'addresses', index, 'address', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-all duration-200"
                                                    placeholder="Full street address"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    City
                                                </label>
                                                <input
                                                    type="text"
                                                    value={address.city}
                                                    onChange={(e) => handleArrayChange('contact', 'addresses', index, 'city', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-all duration-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    State
                                                </label>
                                                <input
                                                    type="text"
                                                    value={address.state}
                                                    onChange={(e) => handleArrayChange('contact', 'addresses', index, 'state', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-all duration-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Country
                                                </label>
                                                <input
                                                    type="text"
                                                    value={address.country}
                                                    onChange={(e) => handleArrayChange('contact', 'addresses', index, 'country', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-all duration-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Pincode
                                                </label>
                                                <input
                                                    type="text"
                                                    value={address.pincode}
                                                    onChange={(e) => handleArrayChange('contact', 'addresses', index, 'pincode', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-all duration-200"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'colors':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Primary Color
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        value={settings.colors?.primaryColor || '#3B82F6'}
                                        onChange={(e) => handleInputChange('colors', 'primaryColor', e.target.value)}
                                        className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.colors?.primaryColor || '#3B82F6'}
                                        onChange={(e) => handleInputChange('colors', 'primaryColor', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Secondary Color
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        value={settings.colors?.secondaryColor || '#1E40AF'}
                                        onChange={(e) => handleInputChange('colors', 'secondaryColor', e.target.value)}
                                        className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.colors?.secondaryColor || '#1E40AF'}
                                        onChange={(e) => handleInputChange('colors', 'secondaryColor', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Accent Color
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        value={settings.colors?.accentColor || '#10B981'}
                                        onChange={(e) => handleInputChange('colors', 'accentColor', e.target.value)}
                                        className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.colors?.accentColor || '#10B981'}
                                        onChange={(e) => handleInputChange('colors', 'accentColor', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Background Color
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        value={settings.colors?.backgroundColor || '#FFFFFF'}
                                        onChange={(e) => handleInputChange('colors', 'backgroundColor', e.target.value)}
                                        className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.colors?.backgroundColor || '#FFFFFF'}
                                        onChange={(e) => handleInputChange('colors', 'backgroundColor', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Color Scheme Type
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                                <motion.button
                                    onClick={() => handleInputChange('colors', 'gradientType', 'solid')}
                                    className={`p-4 border-2 rounded-lg text-center ${
                                        settings.colors?.gradientType === 'solid' 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="h-8 bg-blue-500 rounded mb-2"></div>
                                    <span className="text-sm font-medium">Solid</span>
                                </motion.button>
                                <motion.button
                                    onClick={() => handleInputChange('colors', 'gradientType', 'gradient')}
                                    className={`p-4 border-2 rounded-lg text-center ${
                                        settings.colors?.gradientType === 'gradient' 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div 
                                        className="h-8 rounded mb-2"
                                        style={{
                                            background: `linear-gradient(90deg, ${settings.colors?.gradientStart || '#3B82F6'} 0%, ${settings.colors?.gradientEnd || '#1E40AF'} 100%)`
                                        }}
                                    ></div>
                                    <span className="text-sm font-medium">Gradient</span>
                                </motion.button>
                                <motion.button
                                    onClick={() => handleInputChange('colors', 'gradientType', 'custom')}
                                    className={`p-4 border-2 rounded-lg text-center ${
                                        settings.colors?.gradientType === 'custom' 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded mb-2"></div>
                                    <span className="text-sm font-medium">Custom</span>
                                </motion.button>
                            </div>
                        </div>

                        {settings.colors?.gradientType === 'gradient' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Gradient Start
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="color"
                                            value={settings.colors?.gradientStart || '#3B82F6'}
                                            onChange={(e) => handleInputChange('colors', 'gradientStart', e.target.value)}
                                            className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={settings.colors?.gradientStart || '#3B82F6'}
                                            onChange={(e) => handleInputChange('colors', 'gradientStart', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Gradient End
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="color"
                                            value={settings.colors?.gradientEnd || '#1E40AF'}
                                            onChange={(e) => handleInputChange('colors', 'gradientEnd', e.target.value)}
                                            className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={settings.colors?.gradientEnd || '#1E40AF'}
                                            onChange={(e) => handleInputChange('colors', 'gradientEnd', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Custom CSS
                            </label>
                            <textarea
                                value={settings.colors?.customCSS || ''}
                                onChange={(e) => handleInputChange('colors', 'customCSS', e.target.value)}
                                rows={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                placeholder="Add your custom CSS here..."
                            />
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <h5 className="font-medium text-gray-800 mb-2">Preview</h5>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <div 
                                        className="h-12 rounded mb-1 border"
                                        style={{ backgroundColor: settings.colors?.primaryColor }}
                                    ></div>
                                    <div className="text-center">Primary</div>
                                </div>
                                <div>
                                    <div 
                                        className="h-12 rounded mb-1 border"
                                        style={{ backgroundColor: settings.colors?.secondaryColor }}
                                    ></div>
                                    <div className="text-center">Secondary</div>
                                </div>
                                <div>
                                    <div 
                                        className="h-12 rounded mb-1 border"
                                        style={{ backgroundColor: settings.colors?.accentColor }}
                                    ></div>
                                    <div className="text-center">Accent</div>
                                </div>
                                <div>
                                    <div 
                                        className="h-12 rounded mb-1 border"
                                        style={{ backgroundColor: settings.colors?.backgroundColor }}
                                    ></div>
                                    <div className="text-center">Background</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'themes':
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-4">
                                Select Theme
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {settings.themes?.availableThemes?.map((theme) => (
                                    <motion.div
                                        key={theme.id}
                                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                            settings.themes?.selectedTheme === theme.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => handleInputChange('themes', 'selectedTheme', theme.id)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="bg-gray-100 rounded-lg h-32 mb-3 flex items-center justify-center">
                                            <div className="text-gray-400 text-sm">Theme Preview</div>
                                        </div>
                                        <h5 className="font-semibold text-gray-800">{theme.name}</h5>
                                        <p className="text-sm text-gray-600 mt-1">{theme.description}</p>
                                        <div className="flex justify-between items-center mt-3">
                                            <span className="text-xs text-gray-500">
                                                {settings.themes?.selectedTheme === theme.id ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className={`px-3 py-1 rounded text-xs ${
                                                settings.themes?.selectedTheme === theme.id
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {settings.themes?.selectedTheme === theme.id ? 'Active' : 'Select'}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-6">
                            <h5 className="font-semibold text-gray-800 mb-3">Theme Customization</h5>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Layout Type
                                    </label>
                                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200">
                                        <option>Boxed</option>
                                        <option>Full Width</option>
                                        <option>Fluid</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Header Style
                                    </label>
                                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200">
                                        <option>Standard</option>
                                        <option>Fixed</option>
                                        <option>Transparent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Navigation Style
                                    </label>
                                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200">
                                        <option>Horizontal</option>
                                        <option>Vertical</option>
                                        <option>Mega Menu</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Footer Style
                                    </label>
                                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200">
                                        <option>Simple</option>
                                        <option>Detailed</option>
                                        <option>Minimal</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'components':
                return (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200">
                            <div className="border-b border-gray-200 px-6 py-4">
                                <h5 className="text-lg font-semibold text-gray-800">Website Components</h5>
                                <p className="text-sm text-gray-600 mt-1">
                                    Enable or disable components and rearrange their order
                                </p>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {settings.components?.enabledComponents?.map((component) => (
                                        <div
                                            key={component.id}
                                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => moveComponent(component.id, 'up')}
                                                        disabled={component.order === 1}
                                                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        ↑
                                                    </button>
                                                    <button
                                                        onClick={() => moveComponent(component.id, 'down')}
                                                        disabled={component.order === settings.components.enabledComponents.length}
                                                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        ↓
                                                    </button>
                                                </div>
                                                <div>
                                                    <h6 className="font-medium text-gray-800">{component.name}</h6>
                                                    <div className="text-xs text-gray-500">
                                                        Order: {component.order} | {component.enabled ? 'Enabled' : 'Disabled'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => toggleComponent(component.id)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                        component.enabled ? 'bg-blue-600' : 'bg-gray-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                            component.enabled ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                                    <FiSettings className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8">
                                    <h6 className="font-semibold text-gray-800 mb-4">Custom Components</h6>
                                    <div className="space-y-4">
                                        {settings.components?.customComponents?.map((component) => (
                                            <div
                                                key={component.id}
                                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                                            >
                                                <div>
                                                    <h6 className="font-medium text-gray-800">{component.name}</h6>
                                                    <div className="text-xs text-gray-500">
                                                        Custom Component | {component.enabled ? 'Enabled' : 'Disabled'}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => {/* Handle custom component toggle */}}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                            component.enabled ? 'bg-blue-600' : 'bg-gray-200'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                                component.enabled ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                        />
                                                    </button>
                                                    <button className="text-red-400 hover:text-red-600 transition-colors">
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <motion.button
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiPlus className="w-4 h-4" />
                                        Add Custom Component
                                    </motion.button>
                                    <motion.button
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiDownload className="w-4 h-4" />
                                        Export Configuration
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="text-center py-12">
                        <FiSettings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600">Settings content for {activeTab} tab</h3>
                        <p className="text-gray-500 mt-2">This section is under development</p>
                    </div>
                );
        }
    };

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
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="h-full flex flex-col">
                        {/* Main Card - Full height with scrolling */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
                            {/* Card Header */}
                            <div className="border-b border-gray-200 px-6 py-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h5 className="text-xl font-bold text-gray-800 mb-1">
                                            Website Settings
                                        </h5>
                                        <p className="text-gray-500 text-xs">
                                            Customize your website appearance and functionality
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="border-b border-gray-200">
                                <nav className="flex overflow-x-auto">
                                    {tabs.map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center gap-2 px-6 py-4 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                                                    activeTab === tab.id
                                                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {tab.name}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>

                            {/* Tab Content */}
                            <div className="p-6 flex-1 overflow-y-auto">
                                {renderTabContent()}
                            </div>

                            {/* Action Buttons */}
                            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                                <div className="flex justify-between items-center">
                                    <motion.button
                                        onClick={handleResetSettings}
                                        className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiRefreshCw className="w-4 h-4" />
                                        Reset to Default
                                    </motion.button>
                                    <div className="flex gap-3">
                                        <motion.button
                                            onClick={() => {/* Handle preview */}}
                                            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiEye className="w-4 h-4" />
                                            Preview Changes
                                        </motion.button>
                                        <motion.button
                                            onClick={handleSaveSettings}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiSave className="w-4 h-4" />
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebsiteSettings;