import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import { FiCreditCard, FiPhone, FiMail, FiShield, FiAlertTriangle, FiCheckCircle, FiXCircle } from 'react-icons/fi';

// Reusable Modal Component
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  type = 'default',
  showCloseButton = true,
  className = ''
}) => {
  if (!isOpen) return null;

  const typeClasses = {
    default: 'border-gray-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200'
  };

  const iconClasses = {
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    info: 'text-blue-600',
    success: 'text-green-600',
    default: 'text-gray-600'
  };

  const IconComponent = {
    warning: FiAlertTriangle,
    danger: FiAlertTriangle,
    info: FiAlertTriangle,
    success: FiCheckCircle,
    default: null
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fade overlay */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isOpen ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } ${className}`}
      >
        <div className={`border-b ${typeClasses[type]} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {IconComponent && <IconComponent className={`w-5 h-5 ${iconClasses[type]}`} />}
              <h5 className="text-lg font-semibold text-gray-800">{title}</h5>
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal Component
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "warning",
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} type={type}>
      <div className={`rounded-lg p-4 mb-4 ${
        type === 'warning' ? 'bg-yellow-50' :
        type === 'danger' ? 'bg-red-50' :
        type === 'info' ? 'bg-blue-50' :
        'bg-gray-50'
      }`}>
        <p className="text-gray-700">{message}</p>
      </div>
      
      <div className="flex gap-3">
        <motion.button
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {cancelText}
        </motion.button>
        <motion.button
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
            type === 'danger' 
              ? 'bg-red-600 hover:bg-red-700' 
              : type === 'info'
              ? 'bg-blue-600 hover:bg-blue-700'
              : type === 'success'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-yellow-600 hover:bg-yellow-700'
          } disabled:opacity-50 flex items-center justify-center gap-2`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          {confirmText}
        </motion.button>
      </div>
    </Modal>
  );
};

// Alert Modal Component for Success/Failure
const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'success',
  autoClose = 3000
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  const iconClasses = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
  };

  const IconComponent = type === 'success' ? FiCheckCircle : FiXCircle;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} type={type} showCloseButton={false}>
      <div className="text-center">
        <IconComponent className={`w-16 h-16 mx-auto mb-4 ${iconClasses[type]}`} />
        <p className="text-gray-700 mb-6">{message}</p>
        <motion.button
          onClick={onClose}
          className={`px-6 py-2 text-white rounded-lg transition-colors ${
            type === 'success' 
              ? 'bg-green-600 hover:bg-green-700' 
              : type === 'error'
              ? 'bg-red-600 hover:bg-red-700'
              : type === 'warning'
              ? 'bg-yellow-600 hover:bg-yellow-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          OK
        </motion.button>
      </div>
    </Modal>
  );
};

// Skeleton Loader Component
const SkeletonLoader = ({ type = 'text', lines = 1, className = '' }) => {
  if (type === 'text') {
    return (
      <div className={`animate-pulse ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 bg-gray-200 rounded mb-2 last:mb-0"
            style={{ width: `${100 - (i * 10)}%` }}
          />
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="space-y-4">
        <div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-1/3 ml-auto"></div>
      </div>
    );
  }

  return null;
};

const GatewayConfig = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState({
        initial: true,
        channel: false,
        config: false
    });
    const [selectedGateway, setSelectedGateway] = useState('');
    const [gatewayConfig, setGatewayConfig] = useState(null);
    const [channelForm, setChannelForm] = useState({
        gateway: '',
        google_2fa_totp: ''
    });
    const [configForm, setConfigForm] = useState({
        gateway: '',
        value_1: '',
        value_2: '',
        value_3: '',
        value_4: '',
        bank_id: '',
        google_2fa_totp: ''
    });

    // Modals state
    const [showConfirmModal, setShowConfirmModal] = useState({
        updateChannel: false,
        updateConfig: false,
        disableGateway: false
    });
    const [showAlertModal, setShowAlertModal] = useState({
        success: false,
        error: false
    });
    const [alertMessage, setAlertMessage] = useState('');
    const [pendingAction, setPendingAction] = useState(null);
    const [actionData, setActionData] = useState({});

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

    // Mock data - replace with actual API calls
    const mockBanks = [
        {
            bank_id: 'bank1',
            bank: 'State Bank of India',
            holder: 'John Doe',
            account: '12345678901',
            balance: 150000.50
        },
        {
            bank_id: 'bank2',
            bank: 'HDFC Bank',
            holder: 'John Doe',
            account: '98765432109',
            balance: 75000.25
        }
    ];

    const mockGatewayConfig = {
        getepay: {
            gateway: 'getepay',
            value_1: 'MID123456',
            value_2: 'TERMINAL001',
            value_3: 'encryption_key_123',
            value_4: 'initial_vector_456',
            bank_id: 'bank1'
        },
        cashfree: {
            gateway: 'cashfree',
            value_1: 'VENDOR789',
            bank_id: 'bank2'
        }
    };

    // Load initial data
    useEffect(() => {
        fetchGatewayData();
    }, []);

    const fetchGatewayData = async () => {
        setLoading(prev => ({ ...prev, initial: true }));
        // Simulate API call
        setTimeout(() => {
            setSelectedGateway('getepay');
            setGatewayConfig(mockGatewayConfig.getepay);
            setChannelForm(prev => ({ ...prev, gateway: 'getepay' }));
            setConfigForm(prev => ({ ...prev, gateway: 'getepay', ...mockGatewayConfig.getepay }));
            setLoading(prev => ({ ...prev, initial: false }));
        }, 1500);
    };

    const handleChannelChange = (field, value) => {
        setChannelForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleConfigChange = (field, value) => {
        setConfigForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleChannelSubmit = async (e) => {
        e.preventDefault();
        
        if (!channelForm.google_2fa_totp) {
            showErrorAlert('Please enter Google 2FA OTP');
            return;
        }

        setPendingAction('updateChannel');
        setActionData({ ...channelForm });
        setShowConfirmModal(prev => ({ ...prev, updateChannel: true }));
    };

    const handleConfigSubmit = async (e) => {
        e.preventDefault();
        
        if (!configForm.google_2fa_totp) {
            showErrorAlert('Please enter Google 2FA OTP');
            return;
        }

        setPendingAction('updateConfig');
        setActionData({ ...configForm });
        setShowConfirmModal(prev => ({ ...prev, updateConfig: true }));
    };

    const handleDisableGateway = () => {
        setPendingAction('disableGateway');
        setShowConfirmModal(prev => ({ ...prev, disableGateway: true }));
    };

    const showSuccessAlert = (message) => {
        setAlertMessage(message);
        setShowAlertModal(prev => ({ ...prev, success: true }));
    };

    const showErrorAlert = (message) => {
        setAlertMessage(message);
        setShowAlertModal(prev => ({ ...prev, error: true }));
    };

    const executePendingAction = () => {
        switch (pendingAction) {
            case 'updateChannel':
                setLoading(prev => ({ ...prev, channel: true }));
                setTimeout(() => {
                    const gateway = actionData.gateway;
                    setSelectedGateway(gateway);
                    setGatewayConfig(mockGatewayConfig[gateway] || null);
                    setConfigForm(prev => ({ 
                        ...prev, 
                        gateway: gateway,
                        ...(mockGatewayConfig[gateway] || {})
                    }));
                    setLoading(prev => ({ ...prev, channel: false }));
                    
                    if (gateway) {
                        showSuccessAlert(`Gateway channel updated to ${getGatewayDisplayName(gateway)} successfully!`);
                    } else {
                        showSuccessAlert('Gateway has been disabled successfully!');
                    }
                    
                    setChannelForm(prev => ({ ...prev, google_2fa_totp: '' }));
                    resetModal('updateChannel');
                }, 1000);
                break;
                
            case 'updateConfig':
                setLoading(prev => ({ ...prev, config: true }));
                setTimeout(() => {
                    setLoading(prev => ({ ...prev, config: false }));
                    showSuccessAlert('Gateway configuration updated successfully!');
                    setConfigForm(prev => ({ ...prev, google_2fa_totp: '' }));
                    // Update local state with new config
                    setGatewayConfig(prev => ({
                        ...prev,
                        value_1: actionData.value_1,
                        value_2: actionData.value_2,
                        value_3: actionData.value_3,
                        value_4: actionData.value_4,
                        bank_id: actionData.bank_id
                    }));
                    resetModal('updateConfig');
                }, 1000);
                break;
                
            case 'disableGateway':
                setLoading(prev => ({ ...prev, channel: true }));
                setTimeout(() => {
                    setSelectedGateway('');
                    setGatewayConfig(null);
                    setChannelForm({ gateway: '', google_2fa_totp: '' });
                    setConfigForm({
                        gateway: '',
                        value_1: '',
                        value_2: '',
                        value_3: '',
                        value_4: '',
                        bank_id: '',
                        google_2fa_totp: ''
                    });
                    setLoading(prev => ({ ...prev, channel: false }));
                    showSuccessAlert('Gateway has been disabled successfully!');
                    resetModal('disableGateway');
                }, 1000);
                break;
                
            default:
                break;
        }
    };

    const getGatewayDisplayName = (gateway) => {
        switch(gateway) {
            case 'getepay': return 'Get E Pay';
            case 'cashfree': return 'Cash Free';
            default: return gateway || 'Disabled';
        }
    };

    const resetModal = (modalName) => {
        setShowConfirmModal(prev => ({ ...prev, [modalName]: false }));
        setPendingAction(null);
        setActionData({});
    };

    const closeModal = (modalName) => {
        setShowConfirmModal(prev => ({ ...prev, [modalName]: false }));
        setPendingAction(null);
        setActionData({});
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const renderGatewayConfigForm = () => {
        if (loading.initial) {
            return <SkeletonLoader type="form" />;
        }

        if (!selectedGateway || !gatewayConfig) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-red-700 text-center">
                        Please activate a gateway for configuration
                    </div>
                </div>
            );
        }

        if (selectedGateway === 'getepay') {
            return (
                <form onSubmit={handleConfigSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Platform
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-blue-600 font-semibold transition-all duration-200"
                                value="Get E Pay"
                                disabled
                            />
                            <input type="hidden" name="gateway" value="getepay" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                MID
                            </label>
                            <input
                                type="text"
                                value={configForm.value_1 || gatewayConfig.value_1}
                                onChange={(e) => handleConfigChange('value_1', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                placeholder="Enter MID"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Terminal ID
                            </label>
                            <input
                                type="text"
                                value={configForm.value_2 || gatewayConfig.value_2}
                                onChange={(e) => handleConfigChange('value_2', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                placeholder="Enter Terminal ID"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Encryption Key
                            </label>
                            <input
                                type="text"
                                value={configForm.value_3 || gatewayConfig.value_3}
                                onChange={(e) => handleConfigChange('value_3', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                placeholder="Enter Encryption Key"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Initial Vector (IV)
                            </label>
                            <input
                                type="text"
                                value={configForm.value_4 || gatewayConfig.value_4}
                                onChange={(e) => handleConfigChange('value_4', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                placeholder="Enter Initial Vector"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bank Account
                            </label>
                            <select
                                value={configForm.bank_id || gatewayConfig.bank_id}
                                onChange={(e) => handleConfigChange('bank_id', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                required
                            >
                                <option value="">Select Bank Account</option>
                                {mockBanks.map(bank => (
                                    <option key={bank.bank_id} value={bank.bank_id}>
                                        {bank.bank} - {bank.holder} - {bank.account} - BAL: {formatCurrency(bank.balance)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Google 2FA OTP
                            </label>
                            <input
                                type="text"
                                value={configForm.google_2fa_totp}
                                onChange={(e) => handleConfigChange('google_2fa_totp', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                placeholder="Enter TOTP"
                                required
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <motion.button
                                type="submit"
                                disabled={loading.config}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {loading.config ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Updating...
                                    </>
                                ) : 'Update Configuration'}
                            </motion.button>
                        </div>
                    </div>
                </form>
            );
        } else if (selectedGateway === 'cashfree') {
            return (
                <form onSubmit={handleConfigSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Platform
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-blue-600 font-semibold transition-all duration-200"
                                value="Cash Free"
                                disabled
                            />
                            <input type="hidden" name="gateway" value="cashfree" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vendor ID
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 transition-all duration-200"
                                value={gatewayConfig.value_1}
                                disabled
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bank Account
                            </label>
                            <select
                                value={configForm.bank_id || gatewayConfig.bank_id}
                                onChange={(e) => handleConfigChange('bank_id', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                required
                            >
                                <option value="">Select Bank Account</option>
                                {mockBanks.map(bank => (
                                    <option key={bank.bank_id} value={bank.bank_id}>
                                        {bank.bank} - {bank.holder} - {bank.account} - BAL: {formatCurrency(bank.balance)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Google 2FA OTP
                            </label>
                            <input
                                type="text"
                                value={configForm.google_2fa_totp}
                                onChange={(e) => handleConfigChange('google_2fa_totp', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                placeholder="Enter TOTP"
                                required
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <motion.button
                                type="submit"
                                disabled={loading.config}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {loading.config ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Updating...
                                    </>
                                ) : 'Update Configuration'}
                            </motion.button>
                        </div>
                    </div>
                </form>
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
                                <h5 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <FiCreditCard className="w-5 h-5" />
                                    Gateway Configuration
                                </h5>
                                <p className="text-gray-500 text-xs mt-1">
                                    Configure payment gateway settings and channels
                                </p>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Gateway Configuration */}
                                    <div className="lg:col-span-2">
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <h6 className="text-lg font-semibold text-gray-800 mb-4">
                                                Gateway Settings
                                            </h6>
                                            {renderGatewayConfigForm()}
                                        </div>
                                    </div>

                                    {/* Channel Selection & Contact */}
                                    <div className="space-y-6">
                                        {/* Channel Selection */}
                                        {loading.initial ? (
                                            <SkeletonLoader type="card" />
                                        ) : (
                                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                                <h6 className="text-lg font-semibold text-gray-800 mb-4">
                                                    Gateway Channel
                                                </h6>
                                                <form onSubmit={handleChannelSubmit}>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Select Gateway
                                                            </label>
                                                            <select
                                                                value={channelForm.gateway}
                                                                onChange={(e) => handleChannelChange('gateway', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                                            >
                                                                <option value="">Disable</option>
                                                                <option value="getepay">Get E Pay</option>
                                                                <option value="cashfree">Cash Free</option>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Google 2FA OTP
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={channelForm.google_2fa_totp}
                                                                onChange={(e) => handleChannelChange('google_2fa_totp', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                                                placeholder="Enter TOTP"
                                                                required
                                                            />
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <motion.button
                                                                type="submit"
                                                                disabled={loading.channel}
                                                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                            >
                                                                {loading.channel ? (
                                                                    <>
                                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                        Updating...
                                                                    </>
                                                                ) : 'Update Channel'}
                                                            </motion.button>
                                                            {selectedGateway && (
                                                                <motion.button
                                                                    type="button"
                                                                    onClick={handleDisableGateway}
                                                                    disabled={loading.channel}
                                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                                                    whileHover={{ scale: 1.02 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                >
                                                                    Disable
                                                                </motion.button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </form>
                                            </div>
                                        )}

                                        {/* Contact Information */}
                                        {loading.initial ? (
                                            <SkeletonLoader type="text" lines={4} className="bg-red-50 p-4 rounded-lg" />
                                        ) : (
                                            <div className="bg-red-50 rounded-lg border border-red-200 p-6">
                                                <div className="text-red-700 mb-4">
                                                    <FiShield className="w-5 h-5 inline mr-2" />
                                                    For gateway solution please contact us.
                                                </div>
                                                <ul className="space-y-2 text-red-700">
                                                    <li className="flex items-center gap-2">
                                                        <FiPhone className="w-4 h-4" />
                                                        <a href="tel:+917002695990" className="hover:text-red-800 transition-colors">
                                                            +91 70026 95990
                                                        </a>
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <FiMail className="w-4 h-4" />
                                                        <a href="mailto:contact@onesaas.in" className="hover:text-red-800 transition-colors">
                                                            contact@onesaas.in
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        )}

                                        {/* Current Status */}
                                        {loading.initial ? (
                                            <SkeletonLoader type="text" lines={3} className="bg-blue-50 p-4 rounded-lg" />
                                        ) : (
                                            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                                                <h6 className="font-semibold text-blue-800 mb-3">Current Status</h6>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-700">Active Gateway:</span>
                                                        <span className={`font-medium ${
                                                            selectedGateway ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                            {getGatewayDisplayName(selectedGateway)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-700">Configuration:</span>
                                                        <span className={`font-medium ${
                                                            gatewayConfig ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                            {gatewayConfig ? 'Complete' : 'Incomplete'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-700">Last Updated:</span>
                                                        <span className="font-medium text-blue-700">
                                                            Just now
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={showConfirmModal.updateChannel}
                onClose={() => closeModal('updateChannel')}
                onConfirm={executePendingAction}
                title="Update Gateway Channel"
                message={`Are you sure you want to ${
                    actionData.gateway === '' 
                        ? 'disable' 
                        : `switch to ${getGatewayDisplayName(actionData.gateway)}`
                } gateway channel? This will require verification.`}
                confirmText={actionData.gateway === '' ? 'Disable Gateway' : 'Update Channel'}
                type={actionData.gateway === '' ? 'danger' : 'warning'}
                isLoading={loading.channel}
            />

            <ConfirmationModal
                isOpen={showConfirmModal.updateConfig}
                onClose={() => closeModal('updateConfig')}
                onConfirm={executePendingAction}
                title="Update Gateway Configuration"
                message="Are you sure you want to update the gateway configuration? This will change payment processing settings and may affect live transactions."
                confirmText="Update Configuration"
                type="warning"
                isLoading={loading.config}
            />

            <ConfirmationModal
                isOpen={showConfirmModal.disableGateway}
                onClose={() => closeModal('disableGateway')}
                onConfirm={executePendingAction}
                title="Disable Gateway"
                message="Are you sure you want to disable the gateway? This will stop all payment processing and may affect your business operations."
                confirmText="Disable Gateway"
                type="danger"
                isLoading={loading.channel}
            />

            {/* Success Alert Modal */}
            <AlertModal
                isOpen={showAlertModal.success}
                onClose={() => setShowAlertModal(prev => ({ ...prev, success: false }))}
                title="Success"
                message={alertMessage}
                type="success"
                autoClose={3000}
            />

            {/* Error Alert Modal */}
            <AlertModal
                isOpen={showAlertModal.error}
                onClose={() => setShowAlertModal(prev => ({ ...prev, error: false }))}
                title="Error"
                message={alertMessage}
                type="error"
            />
        </div>
    );
};

export default GatewayConfig;