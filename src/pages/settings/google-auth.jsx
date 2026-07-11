import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import { FiSmartphone, FiCamera, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "warning"
}) => {
  if (!isOpen) return null;

  const typeClasses = {
    warning: "bg-yellow-50 border-yellow-200",
    danger: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200"
  };

  const iconClasses = {
    warning: "text-yellow-600",
    danger: "text-red-600",
    info: "text-blue-600"
  };

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
        }`}
      >
        <div className={`border-b ${typeClasses[type].split(' ')[1]} px-6 py-4`}>
          <div className="flex items-center gap-3">
            <FiAlertTriangle className={`w-5 h-5 ${iconClasses[type]}`} />
            <h5 className="text-lg font-semibold text-slate-800">{title}</h5>
          </div>
        </div>
        
        <div className="p-6">
          <div className={`rounded-lg p-4 mb-4 ${typeClasses[type]}`}>
            <p className="text-slate-700">{message}</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                type === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : type === 'info'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GoogleAuthentication = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('step1');
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [otp, setOtp] = useState('');
    
    // Confirmation modals state
    const [showConfirmModal, setShowConfirmModal] = useState({
        generateQR: false,
        resetAll: false,
        testOTP: false,
        disable2FA: false
    });
    const [pendingAction, setPendingAction] = useState(null);

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

    const generateQRCode = async () => {
        setPendingAction('generateQR');
        setShowConfirmModal(prev => ({ ...prev, generateQR: true }));
    };

    const testOTP = async (e) => {
        e.preventDefault();
        if (!otp) {
            alert('Please enter OTP');
            return;
        }

        setPendingAction('testOTP');
        setShowConfirmModal(prev => ({ ...prev, testOTP: true }));
    };

    const handleResetAll = () => {
        setPendingAction('resetAll');
        setShowConfirmModal(prev => ({ ...prev, resetAll: true }));
    };

    const handleDisable2FA = () => {
        setPendingAction('disable2FA');
        setShowConfirmModal(prev => ({ ...prev, disable2FA: true }));
    };

    const executePendingAction = () => {
        setLoading(true);
        
        switch (pendingAction) {
            case 'generateQR':
                setTimeout(() => {
                    // Mock QR code - replace with actual API response
                    setQrCode('https://via.placeholder.com/200x200/3B82F6/FFFFFF?text=QR+Code');
                    setShowQrModal(true);
                    setLoading(false);
                    resetModal('generateQR');
                }, 1000);
                break;
                
            case 'testOTP':
                setTimeout(() => {
                    setLoading(false);
                    alert('OTP verified successfully! Google Authentication has been configured.');
                    setOtp('');
                    resetModal('testOTP');
                }, 1000);
                break;
                
            case 'resetAll':
                setTimeout(() => {
                    // Reset all relevant states
                    setQrCode('');
                    setOtp('');
                    setActiveTab('step1');
                    setShowQrModal(false);
                    setLoading(false);
                    alert('All Google Authentication settings have been reset.');
                    resetModal('resetAll');
                }, 1000);
                break;
                
            case 'disable2FA':
                setTimeout(() => {
                    // Reset 2FA configuration
                    setQrCode('');
                    setOtp('');
                    setLoading(false);
                    alert('Two-factor authentication has been disabled.');
                    resetModal('disable2FA');
                }, 1000);
                break;
                
            default:
                setLoading(false);
        }
    };

    const resetModal = (modalName) => {
        setShowConfirmModal(prev => ({ ...prev, [modalName]: false }));
        setPendingAction(null);
    };

    const closeModal = (modalName) => {
        setShowConfirmModal(prev => ({ ...prev, [modalName]: false }));
        setPendingAction(null);
    };

    const steps = [
        {
            id: 'step1',
            title: 'Install the App',
            icon: FiSmartphone,
            content: (
                <div>
                    <p className="text-slate-600 mb-4">
                        Install Google Authenticator on your phone:
                    </p>
                    <ul className="space-y-2 text-slate-700">
                        <li className="flex items-center gap-2">
                            <span className="text-blue-600">📱</span>
                            <span>
                                Android: Play Store –{' '}
                                <a 
                                    href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 underline"
                                >
                                    Google Authenticator
                                </a>
                            </span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-blue-600">🍏</span>
                            <span>
                                iPhone: App Store –{' '}
                                <a 
                                    href="https://apps.apple.com/us/app/google-authenticator/id388497605" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 underline"
                                >
                                    Google Authenticator
                                </a>
                            </span>
                        </li>
                    </ul>
                    <p className="text-slate-600 mt-4">
                        Once installed, open the app.
                    </p>
                </div>
            )
        },
        {
            id: 'step2',
            title: 'Generate QR Code',
            icon: FiSmartphone,
            content: (
                <div>
                    <p className="text-slate-600 mb-4">
                        Click the "Generate QR Code" button on this page.
                    </p>
                    <p className="text-slate-600">
                        A unique QR code will appear for your account.
                    </p>
                </div>
            )
        },
        {
            id: 'step3',
            title: 'Scan the QR Code',
            icon: FiCamera,
            content: (
                <div>
                    <ol className="space-y-3 text-slate-700">
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600">1.</span>
                            <span>Open the Google Authenticator app</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600">2.</span>
                            <span>Tap the "+" icon</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600">3.</span>
                            <span>Select "Scan a QR code"</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600">4.</span>
                            <span>Use your phone's camera to scan the QR code</span>
                        </li>
                    </ol>
                </div>
            )
        },
        {
            id: 'step4',
            title: 'Enter the 6-digit Code',
            icon: FiCheckCircle,
            content: (
                <div>
                    <ol className="space-y-3 text-slate-700">
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600">1.</span>
                            <span>The app will now show a 6-digit code that refreshes every 30 seconds</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600">2.</span>
                            <span>Enter the current code on the test field</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-blue-600">3.</span>
                            <span>Click "Check" to complete the setup</span>
                        </li>
                    </ol>
                </div>
            )
        }
    ];

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
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div>
                                        <h5 className="text-xl font-bold text-gray-800 mb-1">
                                            Google Authentication
                                        </h5>
                                        <p className="text-gray-500 text-xs">
                                            Set up two-factor authentication for enhanced security
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <motion.button
                                            onClick={handleResetAll}
                                            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Reset All
                                        </motion.button>
                                        <motion.button
                                            onClick={handleDisable2FA}
                                            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Disable 2FA
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left Column - Actions */}
                                    <div className="lg:col-span-1">
                                        <div className="space-y-4">
                                            {/* Generate QR Button */}
                                            <motion.button
                                                onClick={generateQRCode}
                                                disabled={loading}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiSmartphone className="w-5 h-5" />
                                                {loading && pendingAction === 'generateQR' ? 'Generating...' : 'Generate QR Code'}
                                            </motion.button>

                                            {/* Test OTP Form */}
                                            <form onSubmit={testOTP} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Enter OTP
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={otp}
                                                            onChange={(e) => setOtp(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                                            placeholder="Enter OTP for testing"
                                                            required
                                                            maxLength={6}
                                                        />
                                                    </div>
                                                    <motion.button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        {loading && pendingAction === 'testOTP' ? 'Checking...' : 'Check OTP'}
                                                    </motion.button>
                                                </div>
                                            </form>

                                            {/* Quick Stats */}
                                            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                                                <h6 className="font-semibold text-blue-800 mb-2">Security Status</h6>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-700">2FA Status:</span>
                                                        <span className="font-medium text-red-600">Not Configured</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-700">Last Updated:</span>
                                                        <span className="font-medium text-blue-700">Never</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column - Instructions */}
                                    <div className="lg:col-span-2">
                                        <div className="bg-gray-50 rounded-lg border border-gray-200">
                                            {/* Step Navigation */}
                                            <div className="border-b border-gray-200">
                                                <div className="grid grid-cols-4">
                                                    {steps.map((step, index) => {
                                                        const IconComponent = step.icon;
                                                        return (
                                                            <motion.button
                                                                key={step.id}
                                                                onClick={() => setActiveTab(step.id)}
                                                                className={`flex flex-col items-center justify-center p-4 text-sm font-medium transition-colors ${
                                                                    activeTab === step.id
                                                                        ? 'bg-blue-600 text-white'
                                                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                                                }`}
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                            >
                                                                <IconComponent className="w-5 h-5 mb-1" />
                                                                <span>Step {index + 1}</span>
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Step Content */}
                                            <div className="p-6">
                                                {steps.map((step) => {
                                                    if (step.id !== activeTab) return null;
                                                    const IconComponent = step.icon;
                                                    return (
                                                        <div key={step.id} className="space-y-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-blue-100 rounded-lg p-2">
                                                                    <IconComponent className="w-6 h-6 text-blue-600" />
                                                                </div>
                                                                <h6 className="text-lg font-semibold text-gray-800">
                                                                    {step.title}
                                                                </h6>
                                                            </div>
                                                            {step.content}
                                                        </div>
                                                    );
                                                })}

                                                {/* Progress Indicator */}
                                                <div className="mt-6 pt-4 border-t border-gray-200">
                                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                                        <span>
                                                            Step {steps.findIndex(s => s.id === activeTab) + 1} of {steps.length}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            {steps.map((step, index) => (
                                                                <div
                                                                    key={step.id}
                                                                    className={`w-2 h-2 rounded-full ${
                                                                        activeTab === step.id
                                                                            ? 'bg-blue-600'
                                                                            : index < steps.findIndex(s => s.id === activeTab)
                                                                            ? 'bg-green-500'
                                                                            : 'bg-gray-300'
                                                                    }`}
                                                                ></div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Code Modal */}
            {showQrModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <div className="flex justify-between items-center">
                                <h5 className="text-lg font-semibold text-gray-800">Scan the QR Code</h5>
                                <button
                                    onClick={() => setShowQrModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="text-center">
                                <img 
                                    src={qrCode} 
                                    alt="Google Authenticator QR Code" 
                                    className="w-64 h-64 mx-auto border border-gray-200 rounded-lg"
                                />
                                <p className="text-sm text-gray-600 mt-4">
                                    Scan this QR code with Google Authenticator app
                                </p>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 px-6 py-4">
                            <motion.button
                                onClick={() => setShowQrModal(false)}
                                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Close
                            </motion.button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={showConfirmModal.generateQR}
                onClose={() => closeModal('generateQR')}
                onConfirm={executePendingAction}
                title="Generate New QR Code"
                message="Are you sure? Your old QR code configuration will be removed and you'll need to reconfigure Google Authenticator on your device."
                confirmText="Generate QR Code"
                type="warning"
            />

            <ConfirmationModal
                isOpen={showConfirmModal.testOTP}
                onClose={() => closeModal('testOTP')}
                onConfirm={executePendingAction}
                title="Verify OTP"
                message="This will verify your OTP and complete the Google Authentication setup. Make sure you've scanned the QR code in the app first."
                confirmText="Verify OTP"
                type="info"
            />

            <ConfirmationModal
                isOpen={showConfirmModal.resetAll}
                onClose={() => closeModal('resetAll')}
                onConfirm={executePendingAction}
                title="Reset All Settings"
                message="This will reset all Google Authentication settings, including QR code and OTP verification. You'll need to start the setup process from the beginning."
                confirmText="Reset All"
                type="danger"
            />

            <ConfirmationModal
                isOpen={showConfirmModal.disable2FA}
                onClose={() => closeModal('disable2FA')}
                onConfirm={executePendingAction}
                title="Disable Two-Factor Authentication"
                message="This will disable 2FA for your account. Your account security will be reduced. Are you sure you want to proceed?"
                confirmText="Disable 2FA"
                type="danger"
            />
        </div>
    );
};

export default GoogleAuthentication;