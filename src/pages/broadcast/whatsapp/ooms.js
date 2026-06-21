import React, { useState, useEffect } from 'react';
import { Sidebar, Header } from '../../../components/header';
import {
    FiSend,
    FiFileText,
    FiSettings,
    FiEdit,
    FiCheck,
    FiX,
    FiCopy,
    FiUsers,
    FiFolder,
    FiList,
    FiDatabase,
    FiLayers,
    FiPhone,
    FiLock
} from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useUserPermissions } from '../../../utils/permission-helper';

const WhatsAppOoms = () => {
    const { check } = useUserPermissions();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    const hasSend = check('broadcast_send');
    const hasConfig = check('broadcast_config_edit');

    // Get active tab from URL or default based on permissions
    const urlTab = searchParams.get('tab');
    const defaultTab = urlTab || (hasSend ? 'send' : 'static-template');
    const [activeTab, setActiveTab] = useState(defaultTab);
    
    // Track loading states for each tab
    const [loadingStates, setLoadingStates] = useState({
        send: false,
        staticTemplate: false,
        dynamicTemplate: false,
        config: false
    });
    
    // Track which tabs have been loaded
    const [loadedTabs, setLoadedTabs] = useState({
        send: false,
        staticTemplate: false,
        dynamicTemplate: false,
        config: false
    });

    // Send WhatsApp States
    const [sendForm, setSendForm] = useState({
        select_type: '',
        username: [],
        group_id: '',
        service_id: '',
        status: '',
        template_name: ''
    });
    const [groups, setGroups] = useState([]);
    const [services, setServices] = useState([]);
    const [taskStatuses, setTaskStatuses] = useState([]);
    const [templates, setTemplates] = useState([]);

    // Templates States
    const [staticTemplates, setStaticTemplates] = useState([]);
    const [dynamicTemplates, setDynamicTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [availableTemplates, setAvailableTemplates] = useState([]);

    // Config States
    const [whatsappStatus, setWhatsappStatus] = useState('');
    const [connectedUser, setConnectedUser] = useState('');
    const [qrCode, setQrCode] = useState('');

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

    // Mock data generators
    const generateMockGroups = () => [
        { group_id: '1', name: 'VIP Clients' },
        { group_id: '2', name: 'Regular Clients' },
        { group_id: '3', name: 'Corporate Clients' }
    ];

    const generateMockServices = () => [
        { service_id: '1', name: 'GST Filing' },
        { service_id: '2', name: 'Income Tax' },
        { service_id: '3', name: 'Company Registration' }
    ];

    const generateMockTaskStatuses = () => [
        { value: 'pending', name: 'Pending' },
        { value: 'in_progress', name: 'In Progress' },
        { value: 'completed', name: 'Completed' }
    ];

    const generateMockTemplates = () => [
        { name: 'welcome', content: 'Welcome to our service! 🎉' },
        { name: 'reminder', content: 'Friendly reminder about your upcoming deadline ⏰' },
        { name: 'payment', content: 'Payment reminder for your outstanding balance 💰' }
    ];

    const generateMockStaticTemplates = () => [
        {
            template_id: 'st1',
            name: 'Welcome Static',
            content: 'Welcome to our company! 🎉 We are glad to have you.',
            status: '1',
            created_at: '2024-01-15',
            message_type: 'text'
        },
        {
            template_id: 'st2',
            name: 'Holiday Greeting',
            content: 'Wishing you a happy holiday season! 🎄',
            status: '1',
            created_at: '2024-01-10',
            message_type: 'text'
        },
        {
            template_id: 'st3',
            name: 'Maintenance Notice',
            content: 'System maintenance scheduled for this weekend. 🔧',
            status: '0',
            created_at: '2024-01-08',
            message_type: 'image'
        }
    ];

    const generateMockDynamicTemplates = () => [
        {
            template_id: 'dt1',
            name: 'Dynamic Welcome',
            content: 'Hello {customer_name}, welcome to {company_name}! 🎉',
            variables: ['customer_name', 'company_name'],
            status: '1',
            created_at: '2024-01-12',
            message_type: 'text'
        },
        {
            template_id: 'dt2',
            name: 'Order Confirmation',
            content: 'Hi {name}, your order #{order_id} for {product} has been confirmed. ✅',
            variables: ['name', 'order_id', 'product'],
            status: '1',
            created_at: '2024-01-11',
            message_type: 'text'
        },
        {
            template_id: 'dt3',
            name: 'Appointment Reminder',
            content: 'Reminder: Your appointment with {doctor} is on {date} at {time}. ⏰',
            variables: ['doctor', 'date', 'time'],
            status: '0',
            created_at: '2024-01-09',
            message_type: 'image'
        }
    ];

    // Update URL when tab changes
    useEffect(() => {
        if (urlTab !== activeTab) {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('tab', activeTab);
            setSearchParams(newParams);
        }
    }, [activeTab]);

    // Set active tab from URL on component mount or when URL changes
    useEffect(() => {
        if (urlTab && urlTab !== activeTab) {
            setActiveTab(urlTab);
        }
    }, [urlTab]);

    // Load data for active tab when it changes
    useEffect(() => {
        if (!loadedTabs[getTabKey(activeTab)]) {
            loadTabData(activeTab);
        }
    }, [activeTab]);

    const getTabKey = (tab) => {
        switch(tab) {
            case 'send': return 'send';
            case 'static-template': return 'staticTemplate';
            case 'dynamic-template': return 'dynamicTemplate';
            case 'configuration': return 'config';
            default: return 'send';
        }
    };

    const loadTabData = async (tab) => {
        const tabKey = getTabKey(tab);
        
        // Set loading state for this tab
        setLoadingStates(prev => ({ ...prev, [tabKey]: true }));
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        switch(tab) {
            case 'send':
                setGroups(generateMockGroups());
                setServices(generateMockServices());
                setTaskStatuses(generateMockTaskStatuses());
                setTemplates(generateMockTemplates());
                break;
                
            case 'static-template':
                setStaticTemplates(generateMockStaticTemplates());
                break;
                
            case 'dynamic-template':
                setDynamicTemplates(generateMockDynamicTemplates());
                break;
                
            case 'configuration':
                setWhatsappStatus('connected');
                setConnectedUser('+91 9876543210');
                break;
        }
        
        // Mark tab as loaded and remove loading state
        setLoadedTabs(prev => ({ ...prev, [tabKey]: true }));
        setLoadingStates(prev => ({ ...prev, [tabKey]: false }));
    };

    // Tab change handler
    const handleTabChange = (tab) => {
        if (tab === 'send' && !hasSend) {
            toast.error("You do not have permission to send broadcasts.");
            return;
        }
        if (['static-template', 'dynamic-template', 'configuration'].includes(tab) && !hasConfig) {
            toast.error("You do not have permission to manage configurations.");
            return;
        }
        setActiveTab(tab);
    };

    // Send WhatsApp Handlers
    const handleSendFormChange = (field, value) => {
        const newForm = { ...sendForm, [field]: value };
        
        if (field === 'select_type') {
            newForm.username = [];
            newForm.group_id = '';
            newForm.service_id = '';
            newForm.status = '';
        }
        
        setSendForm(newForm);
    };

    const handleSendSubmit = async (e) => {
        e.preventDefault();
        setLoadingStates(prev => ({ ...prev, send: true }));
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Sending WhatsApp with data:', sendForm);
        setLoadingStates(prev => ({ ...prev, send: false }));
        alert('WhatsApp message sent successfully!');
    };

    const handleTemplateStatusChange = async (templateName, newStatus) => {
        console.log(`Changing template ${templateName} status to ${newStatus}`);
        
        if (activeTab === 'static-template') {
            setStaticTemplates(prev => prev.map(template => 
                template.name === templateName 
                    ? { ...template, status: newStatus } 
                    : template
            ));
        } else if (activeTab === 'dynamic-template') {
            setDynamicTemplates(prev => prev.map(template => 
                template.name === templateName 
                    ? { ...template, status: newStatus } 
                    : template
            ));
        }
    };

    const handleEditTemplate = (template) => {
        setSelectedTemplate(template);
        setAvailableTemplates([
            { template_id: '1', content: 'Template content version 1' },
            { template_id: '2', content: 'Template content version 2' },
            { template_id: '3', content: 'Template content version 3' }
        ]);
        setShowTemplateModal(true);
    };

    const handleTemplateSelect = async (e) => {
        e.preventDefault();
        console.log('Updating template:', selectedTemplate);
        setShowTemplateModal(false);
        // Reload the current tab data
        loadTabData(activeTab);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    // WhatsApp Config Handlers
    const handleGetQR = async () => {
        setLoadingStates(prev => ({ ...prev, config: true }));
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setQrCode('https://via.placeholder.com/300x300?text=WhatsApp+QR+Code');
        setLoadingStates(prev => ({ ...prev, config: false }));
        alert('QR Code generated! Scan it with your WhatsApp.');
    };

    const handleCheckStatus = async () => {
        setLoadingStates(prev => ({ ...prev, config: true }));
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setWhatsappStatus('connected');
        setConnectedUser('+91 9876543210');
        setLoadingStates(prev => ({ ...prev, config: false }));
        alert('WhatsApp is connected!');
    };

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout from WhatsApp?')) {
            setLoadingStates(prev => ({ ...prev, config: true }));
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setWhatsappStatus('disconnected');
            setConnectedUser('');
            setLoadingStates(prev => ({ ...prev, config: false }));
            alert('Logged out successfully!');
        }
    };

    // Skeleton Components
    const SkeletonSelect = () => (
        <div className="w-full h-10 bg-gray-200 rounded animate-pulse"></div>
    );

    const SkeletonButton = () => (
        <div className="w-24 h-10 bg-gray-200 rounded animate-pulse"></div>
    );

    const SkeletonTableRow = ({ columns = 1 }) => (
        <tr>
            {Array.from({ length: columns }).map((_, index) => (
                <td key={index} className="p-3 border border-gray-200">
                    <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                </td>
            ))}
        </tr>
    );

    const SkeletonTable = ({ rows = 3, columns = 1 }) => (
        <>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <SkeletonTableRow key={rowIndex} columns={columns} />
            ))}
        </>
    );

    const SkeletonStatus = () => (
        <div className="inline-block w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
    );

    const SkeletonQRCode = () => (
        <div className="w-48 h-48 bg-gray-200 rounded-lg animate-pulse mx-auto"></div>
    );

    const SkeletonActionButton = () => (
        <div className="px-4 py-3 bg-gray-200 rounded animate-pulse"></div>
    );

    // Render Send WhatsApp Tab with Skeleton
    const renderSendTab = () => {
        const isLoading = loadingStates.send || !loadedTabs.send;
        
        return (
            <motion.div 
                className="bg-white rounded-lg border border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="border-b border-gray-200 px-6 py-4">
                    <h5 className="text-lg font-semibold text-gray-800">Send WhatsApp OOMS</h5>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSendSubmit}>
                        <div className="space-y-4">
                            {/* Select Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Type
                                </label>
                                {isLoading ? (
                                    <SkeletonSelect />
                                ) : (
                                    <select
                                        value={sendForm.select_type}
                                        onChange={(e) => handleSendFormChange('select_type', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white outline-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="all">All Client</option>
                                        <option value="client">Selected Client</option>
                                        <option value="group">Group</option>
                                        <option value="task">Task</option>
                                    </select>
                                )}
                            </div>

                            {/* Selected Client (Conditional) */}
                            {sendForm.select_type === 'client' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Clients
                                    </label>
                                    {isLoading ? (
                                        <div className="w-full h-32 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        <select
                                            multiple
                                            value={sendForm.username}
                                            onChange={(e) => handleSendFormChange('username', Array.from(e.target.selectedOptions, option => option.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white outline-none h-32"
                                        >
                                            <option value="client001">
                                                Name: ABC Traders | Owner: Rajesh Kumar | Mobile: +91 9876543210 | PAN: ABCDE1234F
                                            </option>
                                            <option value="client002">
                                                Name: XYZ Enterprises | Owner: Priya Sharma | Mobile: +91 9876543211 | PAN: BCDEF2345G
                                            </option>
                                        </select>
                                    )}
                                    <p className="text-sm text-gray-500 mt-1">
                                        Hold Ctrl/Cmd to select multiple clients
                                    </p>
                                </div>
                            )}

                            {/* Group Selection (Conditional) */}
                            {sendForm.select_type === 'group' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Group
                                    </label>
                                    {isLoading ? (
                                        <SkeletonSelect />
                                    ) : (
                                        <select
                                            value={sendForm.group_id}
                                            onChange={(e) => handleSendFormChange('group_id', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white outline-none"
                                        >
                                            <option value="" disabled>Select Group</option>
                                            {groups.map(group => (
                                                <option key={group.group_id} value={group.group_id}>
                                                    {group.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Task Selection (Conditional) */}
                            {sendForm.select_type === 'task' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Service
                                        </label>
                                        {isLoading ? (
                                            <SkeletonSelect />
                                        ) : (
                                            <select
                                                value={sendForm.service_id}
                                                onChange={(e) => handleSendFormChange('service_id', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white outline-none"
                                            >
                                                <option value="" disabled>Select Service</option>
                                                {services.map(service => (
                                                    <option key={service.service_id} value={service.service_id}>
                                                        {service.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Status
                                        </label>
                                        {isLoading ? (
                                            <SkeletonSelect />
                                        ) : (
                                            <select
                                                value={sendForm.status}
                                                onChange={(e) => handleSendFormChange('status', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white outline-none"
                                            >
                                                <option value="">All</option>
                                                {taskStatuses.map(status => (
                                                    <option key={status.value} value={status.value}>
                                                        {status.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Template Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Template
                                </label>
                                {isLoading ? (
                                    <SkeletonSelect />
                                ) : (
                                    <select
                                        value={sendForm.template_name}
                                        onChange={(e) => handleSendFormChange('template_name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white outline-none"
                                    >
                                        <option value="" disabled>Select Template</option>
                                        {templates.map(template => (
                                            <option key={template.name} value={template.name}>
                                                {template.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end">
                                {isLoading ? (
                                    <SkeletonButton />
                                ) : (
                                    <motion.button
                                        type="submit"
                                        disabled={loadingStates.send}
                                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded hover:from-green-700 hover:to-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiSend className="w-4 h-4" />
                                        {loadingStates.send ? 'Sending...' : 'Send WhatsApp'}
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </motion.div>
        );
    };

    // Render Static Templates Tab with Skeleton
    const renderStaticTemplatesTab = () => {
        const isLoading = loadingStates.staticTemplate || !loadedTabs.staticTemplate;
        
        return (
            <motion.div 
                className="bg-white rounded-lg border border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="border-b border-gray-200 px-6 py-4">
                    <h5 className="text-lg font-semibold text-gray-800">Static Templates</h5>
                </div>
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-gray-200">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">#</th>
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Name</th>
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Content</th>
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Type</th>
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Created Date</th>
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Status</th>
                                    <th className="text-center p-3 font-medium text-gray-700 border border-gray-200">
                                        <FiSettings className="w-4 h-4 inline" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <SkeletonTable rows={3} columns={7} />
                                ) : staticTemplates.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4 text-gray-500 border border-gray-200">
                                            No static templates found
                                        </td>
                                    </tr>
                                ) : (
                                    staticTemplates.map((template, index) => (
                                        <motion.tr 
                                            key={template.template_id} 
                                            className="border-b border-gray-200 hover:bg-gray-50"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <td className="p-3 text-gray-600 border border-gray-200">
                                                {index + 1}
                                            </td>
                                            <td className="p-3 text-gray-600 border border-gray-200">
                                                {template.name}
                                            </td>
                                            <td className="p-3 text-gray-600 border border-gray-200">
                                                <div className="flex items-center justify-between">
                                                    <span className="truncate max-w-xs">{template.content}</span>
                                                    <motion.button
                                                        onClick={() => copyToClipboard(template.content)}
                                                        className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                                        title="Copy to clipboard"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <FiCopy className="w-4 h-4" />
                                                    </motion.button>
                                                </div>
                                            </td>
                                            <td className="p-3 text-gray-600 border border-gray-200">
                                                <span className={`px-2 py-1 text-xs rounded ${
                                                    template.message_type === 'image' 
                                                        ? 'bg-purple-100 text-purple-800' 
                                                        : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {template.message_type}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-600 border border-gray-200">
                                                {template.created_at}
                                            </td>
                                            <td className="p-3 border border-gray-200">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={template.status === '1'}
                                                        onChange={() => handleTemplateStatusChange(
                                                            template.name, 
                                                            template.status === '1' ? '0' : '1'
                                                        )}
                                                        className="sr-only peer"
                                                        disabled={isLoading}
                                                    />
                                                    <div className={`w-12 h-6 rounded-full peer ${template.status === '1' ? 'bg-green-600' : 'bg-gray-300'} peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:border after:border-gray-300`}>
                                                        {template.status === '1' ? (
                                                            <FiCheck className="absolute left-1 top-0.5 w-3 h-3 text-white z-10" />
                                                        ) : (
                                                            <FiX className="absolute right-1 top-0.5 w-3 h-3 text-gray-500 z-10" />
                                                        )}
                                                    </div>
                                                </label>
                                            </td>
                                            <td className="p-3 text-center border border-gray-200">
                                                <motion.button
                                                    onClick={() => handleEditTemplate(template)}
                                                    className="p-1 text-green-600 hover:text-green-800 rounded hover:bg-green-50 transition-colors"
                                                    disabled={isLoading}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <FiEdit className="w-4 h-4" />
                                                </motion.button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
        );
    };

    // Render Dynamic Templates Tab with Skeleton
    const renderDynamicTemplatesTab = () => {
        const isLoading = loadingStates.dynamicTemplate || !loadedTabs.dynamicTemplate;
        
        return (
            <motion.div 
                className="bg-white rounded-lg border border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="border-b border-gray-200 px-6 py-4">
                    <h5 className="text-lg font-semibold text-gray-800">Dynamic Templates</h5>
                </div>
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-gray-200">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">#</th>
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Name</th>
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Content</th>
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Variables</th>
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Type</th>
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Created Date</th>
                                    <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Status</th>
                                    <th className="text-center p-3 font-medium text-gray-700 border border-gray-200">
                                        <FiSettings className="w-4 h-4 inline" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <SkeletonTable rows={3} columns={8} />
                                ) : dynamicTemplates.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-4 text-gray-500 border border-gray-200">
                                            No dynamic templates found
                                        </td>
                                    </tr>
                                ) : (
                                    dynamicTemplates.map((template, index) => (
                                        <motion.tr 
                                            key={template.template_id} 
                                            className="border-b border-gray-200 hover:bg-gray-50"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <td className="p-3 text-gray-600 border border-gray-200">
                                                {index + 1}
                                            </td>
                                            <td className="p-3 text-gray-600 border border-gray-200">
                                                {template.name}
                                            </td>
                                            <td className="p-3 text-gray-600 border border-gray-200">
                                                <div className="flex items-center justify-between">
                                                    <span className="truncate max-w-xs">{template.content}</span>
                                                    <motion.button
                                                        onClick={() => copyToClipboard(template.content)}
                                                        className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                                        title="Copy to clipboard"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <FiCopy className="w-4 h-4" />
                                                    </motion.button>
                                                </div>
                                            </td>
                                            <td className="p-3 text-gray-600 border border-gray-200">
                                                <div className="flex flex-wrap gap-1">
                                                    {template.variables.map(variable => (
                                                        <span key={variable} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                                            {variable}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-3 text-gray-600 border border-gray-200">
                                                <span className={`px-2 py-1 text-xs rounded ${
                                                    template.message_type === 'image' 
                                                        ? 'bg-purple-100 text-purple-800' 
                                                        : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {template.message_type}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-600 border border-gray-200">
                                                {template.created_at}
                                            </td>
                                            <td className="p-3 border border-gray-200">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={template.status === '1'}
                                                        onChange={() => handleTemplateStatusChange(
                                                            template.name, 
                                                            template.status === '1' ? '0' : '1'
                                                        )}
                                                        className="sr-only peer"
                                                        disabled={isLoading}
                                                    />
                                                    <div className={`w-12 h-6 rounded-full peer ${template.status === '1' ? 'bg-green-600' : 'bg-gray-300'} peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:border after:border-gray-300`}>
                                                        {template.status === '1' ? (
                                                            <FiCheck className="absolute left-1 top-0.5 w-3 h-3 text-white z-10" />
                                                        ) : (
                                                            <FiX className="absolute right-1 top-0.5 w-3 h-3 text-gray-500 z-10" />
                                                        )}
                                                    </div>
                                                </label>
                                            </td>
                                            <td className="p-3 text-center border border-gray-200">
                                                <motion.button
                                                    onClick={() => handleEditTemplate(template)}
                                                    className="p-1 text-green-600 hover:text-green-800 rounded hover:bg-green-50 transition-colors"
                                                    disabled={isLoading}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <FiEdit className="w-4 h-4" />
                                                </motion.button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
        );
    };

    // Render Config Tab with Skeleton
    const renderConfigTab = () => {
        const isLoading = loadingStates.config || !loadedTabs.config;
        
        return (
            <motion.div 
                className="bg-white rounded-lg border border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="border-b border-gray-200 px-6 py-4">
                    <h5 className="text-lg font-semibold text-gray-800">
                        WhatsApp OOMS Config | Status: 
                        <span className={`ml-2 ${
                            whatsappStatus === 'connected' ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {isLoading ? (
                                <SkeletonStatus />
                            ) : (
                                <>
                                    {whatsappStatus.toUpperCase()}
                                    {connectedUser && ` [${connectedUser}]`}
                                </>
                            )}
                        </span>
                    </h5>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Configuration Actions */}
                        <div className="lg:col-span-2">
                            <div className="bg-gray-50 rounded-lg p-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {isLoading ? (
                                            <>
                                                <SkeletonActionButton />
                                                <SkeletonActionButton />
                                            </>
                                        ) : (
                                            <>
                                                <motion.button
                                                    onClick={handleGetQR}
                                                    disabled={loadingStates.config}
                                                    className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded hover:from-green-700 hover:to-green-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FiPhone className="w-5 h-5" />
                                                    Get QR Code
                                                </motion.button>
                                                <motion.button
                                                    onClick={handleCheckStatus}
                                                    disabled={loadingStates.config}
                                                    className="px-4 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded hover:from-yellow-700 hover:to-yellow-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FiSettings className="w-5 h-5" />
                                                    Check Status
                                                </motion.button>
                                            </>
                                        )}
                                    </div>
                                    {isLoading ? (
                                        <SkeletonActionButton />
                                    ) : (
                                        <motion.button
                                            onClick={handleLogout}
                                            disabled={loadingStates.config}
                                            className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded hover:from-red-700 hover:to-red-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <FiX className="w-5 h-5" />
                                            Logout WhatsApp
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* QR Code Display */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h6 className="text-lg font-semibold text-gray-800 mb-4">How to Scan?</h6>
                            {isLoading ? (
                                <SkeletonQRCode />
                            ) : qrCode ? (
                                <div className="text-center">
                                    <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 mx-auto mb-4 border-2 border-green-500 rounded-lg" />
                                    <p className="text-sm text-gray-600">
                                        Scan this QR code with your WhatsApp to connect
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <FiPhone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-sm text-gray-500">
                                        Click "Get QR Code" to generate a QR code for WhatsApp connection
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Instructions */}
                    {!isLoading && (
                        <motion.div 
                            className="mt-6 bg-blue-50 rounded-lg p-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h6 className="text-lg font-semibold text-gray-800 mb-4">Connection Instructions</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="space-y-2">
                                    <p>1. Open WhatsApp on your phone</p>
                                    <p>2. Tap Menu or Settings</p>
                                    <p>3. Select Linked Devices</p>
                                </div>
                                <div className="space-y-2">
                                    <p>4. Tap on Link a Device</p>
                                    <p>5. Point your phone to the QR code</p>
                                    <p>6. Wait for connection confirmation</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        );
    };

    // Template Selection Modal
    const renderTemplateModal = () => (
        <AnimatePresence>
            {showTemplateModal && (
                <motion.div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                    >
                        <div className="border-b border-gray-200 px-6 py-4">
                            <div className="flex justify-between items-center">
                                <h5 className="text-lg font-semibold text-gray-800">Select Template</h5>
                                <motion.button
                                    onClick={() => setShowTemplateModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    ×
                                </motion.button>
                            </div>
                        </div>
                        <form onSubmit={handleTemplateSelect}>
                            <input type="hidden" name="name" value={selectedTemplate?.name || ''} />
                            <div className="p-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border border-gray-200">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Select</th>
                                                <th className="text-left p-3 font-medium text-gray-700 border border-gray-200">Content</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {availableTemplates.map(template => (
                                                <tr key={template.template_id} className="border-b border-gray-200 hover:bg-gray-50">
                                                    <td className="p-3 border border-gray-200">
                                                        <input
                                                            name="template_id"
                                                            type="radio"
                                                            value={template.template_id}
                                                            className="form-radio h-4 w-4 text-green-600"
                                                            defaultChecked={template.template_id === selectedTemplate?.template_id}
                                                        />
                                                    </td>
                                                    <td className="p-3 text-gray-600 border border-gray-200">
                                                        {template.content}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="border-t border-gray-200 px-6 py-4">
                                <div className="flex justify-end">
                                    <motion.button
                                        type="submit"
                                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded hover:from-green-700 hover:to-green-800 transition-colors"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Add
                                    </motion.button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    if (!hasSend && !hasConfig) {
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
                <div className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                    <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm max-w-sm w-full mx-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiLock className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Access Denied</h3>
                        <p className="text-gray-500 text-sm">You do not have permission to view this section.</p>
                    </div>
                </div>
            </div>
        );
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
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="h-full flex flex-col">
                    <motion.div 
                        className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full mx-4 sm:mx-6 md:mx-8 my-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="border-b border-gray-200 px-6 py-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <h5 className="text-xl font-bold text-gray-800 mb-1">
                                        WhatsApp OOMS Management
                                    </h5>
                                    <p className="text-gray-500 text-xs">
                                        Manage WhatsApp broadcasting with OOMS
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="max-w-7xl mx-auto">
                                {/* Tabs */}
                                <div className="mb-6">
                                    <div className="border-b border-gray-200">
                                        <nav className="-mb-px flex space-x-8 overflow-x-auto">
                                            <motion.button
                                                onClick={() => handleTabChange('send')}
                                                disabled={loadingStates.send}
                                                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                                                    activeTab === 'send'
                                                        ? 'border-green-500 text-green-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } ${loadingStates.send ? 'opacity-50 cursor-not-allowed' : ''} ${!hasSend ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                whileHover={hasSend ? { scale: 1.05 } : {}}
                                                whileTap={hasSend ? { scale: 0.95 } : {}}
                                            >
                                                <FiSend className="w-4 h-4" />
                                                Send WhatsApp
                                                {!hasSend && <FiLock className="w-3 h-3 text-gray-400" />}
                                            </motion.button>
                                            <motion.button
                                                onClick={() => handleTabChange('static-template')}
                                                disabled={loadingStates.staticTemplate}
                                                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                                                    activeTab === 'static-template'
                                                        ? 'border-green-500 text-green-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } ${loadingStates.staticTemplate ? 'opacity-50 cursor-not-allowed' : ''} ${!hasConfig ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                whileHover={hasConfig ? { scale: 1.05 } : {}}
                                                whileTap={hasConfig ? { scale: 0.95 } : {}}
                                            >
                                                <FiFileText className="w-4 h-4" />
                                                Static Templates
                                                {!hasConfig && <FiLock className="w-3 h-3 text-gray-400" />}
                                            </motion.button>
                                            <motion.button
                                                onClick={() => handleTabChange('dynamic-template')}
                                                disabled={loadingStates.dynamicTemplate}
                                                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                                                    activeTab === 'dynamic-template'
                                                        ? 'border-green-500 text-green-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } ${loadingStates.dynamicTemplate ? 'opacity-50 cursor-not-allowed' : ''} ${!hasConfig ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                whileHover={hasConfig ? { scale: 1.05 } : {}}
                                                whileTap={hasConfig ? { scale: 0.95 } : {}}
                                            >
                                                <FiDatabase className="w-4 h-4" />
                                                Dynamic Templates
                                                {!hasConfig && <FiLock className="w-3 h-3 text-gray-400" />}
                                            </motion.button>
                                            <motion.button
                                                onClick={() => handleTabChange('configuration')}
                                                disabled={loadingStates.config}
                                                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                                                    activeTab === 'configuration'
                                                        ? 'border-green-500 text-green-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } ${loadingStates.config ? 'opacity-50 cursor-not-allowed' : ''} ${!hasConfig ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                whileHover={hasConfig ? { scale: 1.05 } : {}}
                                                whileTap={hasConfig ? { scale: 0.95 } : {}}
                                            >
                                                <FiSettings className="w-4 h-4" />
                                                Configuration
                                                {!hasConfig && <FiLock className="w-3 h-3 text-gray-400" />}
                                            </motion.button>
                                        </nav>
                                    </div>
                                </div>

                                {/* Tab Content */}
                                <div className="space-y-4">
                                    {activeTab === 'send' && renderSendTab()}
                                    {activeTab === 'static-template' && renderStaticTemplatesTab()}
                                    {activeTab === 'dynamic-template' && renderDynamicTemplatesTab()}
                                    {activeTab === 'configuration' && renderConfigTab()}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Template Selection Modal */}
            {renderTemplateModal()}
        </div>
    );
};

export default WhatsAppOoms;