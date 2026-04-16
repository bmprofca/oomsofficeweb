import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiEdit, FiTrash, FiArrowLeft, FiMoreVertical, FiCheck, FiSearch, 
  FiEye, FiEyeOff, FiX, FiPhone, FiMail, FiCopy , FiShare2   
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

// Professional Toast Configuration
const toastConfig = {
    duration: 4000,
    position: 'top-right',
    style: {
        borderRadius: '8px',
        background: '#fff',
        color: '#1e293b',
        fontSize: '14px',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e2e8f0',
        maxWidth: '380px',
    },
    success: {
        style: {
            background: '#fff',
            color: '#059669',
            border: '1px solid #d1fae5',
        },
        icon: '✓',
    },
    error: {
        style: {
            background: '#fff',
            color: '#dc2626',
            border: '1px solid #fee2e2',
        },
        icon: '✕',
    },
    loading: {
        style: {
            background: '#fff',
            color: '#3b82f6',
            border: '1px solid #dbeafe',
        },
        icon: '●',
    },
};

// Custom toast functions
const showToast = {
    success: (message, options = {}) => {
        toast.success(message, {
            ...toastConfig,
            ...options,
            icon: '✓',
            style: {
                ...toastConfig.style,
                ...toastConfig.success.style,
                ...options.style,
            },
        });
    },
    error: (message, options = {}) => {
        toast.error(message, {
            ...toastConfig,
            ...options,
            icon: '✕',
            style: {
                ...toastConfig.style,
                ...toastConfig.error.style,
                ...options.style,
            },
        });
    },
    loading: (message, options = {}) => {
        return toast.loading(message, {
            ...toastConfig,
            ...options,
            icon: '●',
            style: {
                ...toastConfig.style,
                ...toastConfig.loading.style,
                ...options.style,
            },
        });
    },
    info: (message, options = {}) => {
        toast(message, {
            ...toastConfig,
            ...options,
            icon: 'ℹ️',
            style: {
                ...toastConfig.style,
                ...options.style,
            },
        });
    },
    dismiss: (toastId) => {
        toast.dismiss(toastId);
    },
    dismissAll: () => {
        toast.dismiss();
    },
};

// View Credential Modal
const ViewCredentialModal = ({ credential, onClose }) => {
  const [showPassword, setShowPassword] = useState(false);
  
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast.success(`${label} copied to clipboard`);
  };

  if (!credential) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <FiEye className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Credential Details</h3>
                <p className="text-xs text-blue-100 mt-1">View complete credential information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          {/* Firm Details Section */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Firm Information</h4>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Firm Name</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{credential.firm?.firm_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Firm Type</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{credential.firm?.firm_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">PAN Number</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{credential.firm?.pan_no || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">GST Number</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{credential.firm?.gst_no || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Client Details Section */}
          {credential.owner && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Client Information</h4>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Client Name</p>
                    <p className="text-sm font-medium text-slate-800 mt-1">{credential.owner.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Mobile Number</p>
                    <div className="flex items-center gap-2 mt-1">
                      <FiPhone className="w-4 h-4 text-slate-400" />
                      <p className="text-sm font-medium text-slate-800">{credential.owner.mobile || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email Address</p>
                    <div className="flex items-center gap-2 mt-1">
                      <FiMail className="w-4 h-4 text-slate-400" />
                      <p className="text-sm font-medium text-slate-800">{credential.owner.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Credential Details Section */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Credential Information</h4>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="space-y-4">
                {/* Username with Copy */}
                <div>
                  <p className="text-xs text-slate-500">Username</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm font-medium text-slate-800">{credential.credential?.username || 'N/A'}</p>
                    <button
                      onClick={() => copyToClipboard(credential.credential?.username, 'Username')}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Copy username"
                    >
                      <FiCopy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Password with Copy and Toggle */}
                <div>
                  <p className="text-xs text-slate-500">Password</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm font-mono font-medium text-slate-800">
                      {showPassword ? credential.credential?.password : '••••••••'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(credential.credential?.password, 'Password')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Copy password"
                      >
                        <FiCopy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {credential.credential?.description && (
                  <div>
                    <p className="text-xs text-slate-500">Description</p>
                    <p className="text-sm text-slate-700 mt-1">{credential.credential.description}</p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      credential.credential?.status === 'active' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {credential.credential?.status || 'inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Additional Information</h4>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Created Date</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">
                    {credential.credential?.created_at ? new Date(credential.credential.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Created By</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">
                    {credential.credential?.created_by?.name || credential.credential?.created_by || 'N/A'}
                  </p>
                </div>
                {credential.credential?.updated_at && (
                  <>
                    <div>
                      <p className="text-xs text-slate-500">Last Updated</p>
                      <p className="text-sm font-medium text-slate-800 mt-1">
                        {new Date(credential.credential.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Updated By</p>
                      <p className="text-sm font-medium text-slate-800 mt-1">
                        {credential.credential?.updated_by?.name || credential.credential?.updated_by || 'N/A'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white text-sm font-medium rounded-xl shadow-lg shadow-slate-200 hover:shadow-xl transition-all duration-200"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const PasswordGroupFirms = () => {
    const { group_id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const group_name = location.state?.group_name || 'Group';

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [credentials, setCredentials] = useState([]);
    const [filteredCredentials, setFilteredCredentials] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedCredential, setSelectedCredential] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [firms, setFirms] = useState([]);
    const [firmsLoading, setFirmsLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [showPassword, setShowPassword] = useState({});
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: false
    });
    // Search query for firms
    const [firmSearchQuery, setFirmSearchQuery] = useState('');
    const [searchPerformed, setSearchPerformed] = useState(false);

    // Form states
    const [addForm, setAddForm] = useState({
        group_id: group_id,
        firm_id: '',
        username: '',
        password: '',
        description: ''
    });

    const [editForm, setEditForm] = useState({
        credential_id: '',
        username: '',
        password: '',
        description: '',
        status: 'active'
    });

    // Persist sidebar state
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

    // Fetch group firms data
    useEffect(() => {
        fetchGroupFirms();
    }, [group_id, pagination.page]);

    // Debounced firm search
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (showAddModal && firmSearchQuery.length >= 2) {
                searchFirms(firmSearchQuery);
            } else if (firmSearchQuery.length < 2) {
                setFirms([]);
                setSearchPerformed(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [firmSearchQuery, showAddModal]);

    // Filter credentials when search term changes
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchTerm) {
                const filtered = credentials.filter(cred => 
                    cred.firm?.firm_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cred.credential?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cred.credential?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cred.owner?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cred.owner?.mobile?.includes(searchTerm)
                );
                setFilteredCredentials(filtered);
            } else {
                setFilteredCredentials(credentials);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm, credentials]);

    const fetchGroupFirms = async () => {
        setLoading(true);
        try {
            const headers = await getHeaders();
            const response = await fetch(
                `${API_BASE_URL}/assistance/password-group/list/${group_id}?page=${pagination.page}&limit=${pagination.limit}`,
                { headers }
            );
            const result = await response.json();

            if (result.success) {
                setCredentials(result.data.credentials || []);
                setFilteredCredentials(result.data.credentials || []);
                setPagination({
                    page: result.meta.page,
                    limit: result.meta.limit,
                    total: result.meta.total,
                    total_pages: result.meta.total_pages,
                    is_last_page: result.meta.is_last_page
                });
            } else {
                showToast.error(result.message || 'Failed to fetch credentials');
            }
        } catch (error) {
            console.error('Error fetching group firms:', error);
            showToast.error('Network error. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const searchFirms = async (searchQuery) => {
        if (!searchQuery || searchQuery.length < 2) {
            setFirms([]);
            setSearchPerformed(false);
            return;
        }

        setFirmsLoading(true);
        setSearchPerformed(true);
        
        try {
            const headers = await getHeaders();
            const url = `${API_BASE_URL}/firm/search?search=${encodeURIComponent(searchQuery)}`;
            
            const response = await fetch(url, { headers });
            const result = await response.json();

            if (result.success) {
                // Handle different possible response structures
                let firmsData = [];
                
                if (Array.isArray(result.data)) {
                    firmsData = result.data;
                } else if (result.data && typeof result.data === 'object') {
                    if (Array.isArray(result.data.firms)) {
                        firmsData = result.data.firms;
                    } else if (result.data.items && Array.isArray(result.data.items)) {
                        firmsData = result.data.items;
                    } else if (result.data.records && Array.isArray(result.data.records)) {
                        firmsData = result.data.records;
                    } else {
                        const values = Object.values(result.data);
                        if (values.length > 0 && typeof values[0] === 'object') {
                            firmsData = values;
                        }
                    }
                }
                
                setFirms(firmsData);
                
                if (firmsData.length === 0) {
                    showToast.info(`No firms found matching "${searchQuery}"`);
                }
            } else {
                console.error('Failed to search firms:', result.message);
                showToast.error(result.message || 'Failed to search firms');
                setFirms([]);
            }
        } catch (error) {
            console.error('Error searching firms:', error);
            showToast.error('Network error. Please check your connection.');
            setFirms([]);
        } finally {
            setFirmsLoading(false);
        }
    };

    const handleAddCredential = async (e) => {
        e.preventDefault();
        
        if (!addForm.firm_id) {
            showToast.error('Please select a firm');
            return;
        }
        
        if (!addForm.username.trim()) {
            showToast.error('Please enter a username');
            return;
        }
        
        if (!addForm.password.trim()) {
            showToast.error('Please enter a password');
            return;
        }

        const loadingToast = showToast.loading('Adding credential...');

        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/assistance/password-group/add`, {
                method: 'POST',
                headers,
                body: JSON.stringify(addForm)
            });
            const result = await response.json();

            showToast.dismiss(loadingToast);

            if (result.success) {
                showToast.success('Credential added successfully');
                fetchGroupFirms();
                setShowAddModal(false);
                setAddForm({
                    group_id: group_id,
                    firm_id: '',
                    username: '',
                    password: '',
                    description: ''
                });
                setFirmSearchQuery('');
                setFirms([]);
                setSearchPerformed(false);
            } else {
                showToast.error(result.message || 'Failed to add credential');
            }
        } catch (error) {
            console.error('Error adding credential:', error);
            showToast.dismiss(loadingToast);
            showToast.error('Network error. Please check your connection.');
        }
    };

    const handleEditCredential = async (e) => {
        e.preventDefault();
        
        if (!editForm.username.trim()) {
            showToast.error('Please enter a username');
            return;
        }
        
        if (!editForm.password.trim()) {
            showToast.error('Please enter a password');
            return;
        }

        const loadingToast = showToast.loading('Updating credential...');

        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/assistance/password-group/edit/${editForm.credential_id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    username: editForm.username,
                    password: editForm.password,
                    description: editForm.description,
                    status: editForm.status
                })
            });
            const result = await response.json();

            showToast.dismiss(loadingToast);

            if (result.success) {
                showToast.success('Credential updated successfully');
                fetchGroupFirms();
                setShowEditModal(false);
                setSelectedCredential(null);
                setEditForm({
                    credential_id: '',
                    username: '',
                    password: '',
                    description: '',
                    status: 'active'
                });
            } else {
                showToast.error(result.message || 'Failed to update credential');
            }
        } catch (error) {
            console.error('Error editing credential:', error);
            showToast.dismiss(loadingToast);
            showToast.error('Network error. Please check your connection.');
        }
    };

    const handleDeleteCredential = async () => {
        if (!selectedCredential) return;

        const loadingToast = showToast.loading('Deleting credential...');

        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/assistance/password-group/delete/${selectedCredential.credential.credential_id}`, {
                method: 'DELETE',
                headers
            });
            const result = await response.json();

            showToast.dismiss(loadingToast);

            if (result.success) {
                showToast.success('Credential deleted successfully');
                fetchGroupFirms();
                setShowDeleteModal(false);
                setSelectedCredential(null);
            } else {
                showToast.error(result.message || 'Failed to delete credential');
            }
        } catch (error) {
            console.error('Error deleting credential:', error);
            showToast.dismiss(loadingToast);
            showToast.error('Network error. Please check your connection.');
        }
        setActiveDropdown(null);
    };

    const handleEditClick = (credential) => {
        setSelectedCredential(credential);
        setEditForm({
            credential_id: credential.credential.credential_id,
            username: credential.credential.username || '',
            password: credential.credential.password || '',
            description: credential.credential.description || '',
            status: credential.credential.status || 'active'
        });
        setShowEditModal(true);
        setActiveDropdown(null);
    };

    const handleDeleteClick = (credential) => {
        setSelectedCredential(credential);
        setShowDeleteModal(true);
        setActiveDropdown(null);
    };

    const toggleDropdown = (credentialId) => {
        setActiveDropdown(activeDropdown === credentialId ? null : credentialId);
    };

    const togglePasswordVisibility = (credentialId) => {
        setShowPassword(prev => ({
            ...prev,
            [credentialId]: !prev[credentialId]
        }));
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleBack = () => {
        navigate('/staff/office-assistance/password-groups');
    };

    const handlePrevPage = () => {
        if (pagination.page > 1) {
            setPagination(prev => ({ ...prev, page: prev.page - 1 }));
        }
    };

    const handleNextPage = () => {
        if (!pagination.is_last_page) {
            setPagination(prev => ({ ...prev, page: prev.page + 1 }));
        }
    };

    const handleSelectFirm = (firm) => {
        setAddForm({...addForm, firm_id: firm.firm_id || firm.id});
        setFirmSearchQuery(firm.firm_name || firm.name || '');
        setFirms([]);
        setSearchPerformed(false);
    };

    const handleClearSelectedFirm = () => {
        setAddForm({...addForm, firm_id: ''});
        setFirmSearchQuery('');
        setFirms([]);
        setSearchPerformed(false);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            {/* Toaster Component for Toast Notifications */}
            <Toaster
                position="top-right"
                toastOptions={{
                    ...toastConfig,
                    className: '',
                    style: toastConfig.style,
                    success: toastConfig.success,
                    error: toastConfig.error,
                }}
            />

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

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="h-full flex flex-col">
                        {/* Header with Breadcrumb */}
                        <div className="mb-6">
                            <nav className="flex items-center text-sm text-slate-500 mb-4">
                                <span
                                    onClick={() => navigate('/')}
                                    className="hover:text-indigo-600 cursor-pointer transition-colors"
                                >
                                    Dashboard
                                </span>
                                <FiArrowLeft className="w-3 h-3 mx-2 rotate-180" />
                                <span
                                    onClick={() => navigate('/staff/office-assistance/password-groups')}
                                    className="hover:text-indigo-600 cursor-pointer transition-colors"
                                >
                                    Password Groups
                                </span>
                                <FiArrowLeft className="w-3 h-3 mx-2 rotate-180" />
                                <span className="text-indigo-600 font-medium">{group_name}</span>
                            </nav>

                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <button
                                        onClick={handleBack}
                                        className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-slate-600 hover:text-indigo-600"
                                        title="Go back"
                                    >
                                        <FiArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div>
                                        <h1 className="text-3xl font-bold text-slate-800">{group_name}</h1>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Manage firms and credentials in this group
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end">
                                    <motion.button
                                        onClick={() => setShowAddModal(true)}
                                        className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all duration-200"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiPlus className="w-4 h-4 mr-2" />
                                        Add Firm Credentials
                                    </motion.button>
                                </div>
                            </motion.div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 hover:shadow-xl transition-all duration-300"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Total Credentials</p>
                                        <p className="text-3xl font-bold text-slate-800 mt-2">{credentials.length}</p>
                                    </div>
                                    <div className="p-3 bg-indigo-50 rounded-xl">
                                        <FiPlus className="w-5 h-5 text-indigo-600" />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 hover:shadow-xl transition-all duration-300"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Unique Firms</p>
                                        <p className="text-3xl font-bold text-green-600 mt-2">
                                            {new Set(credentials.map(c => c.firm?.firm_id)).size}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-xl">
                                        <FiCheck className="w-5 h-5 text-green-600" />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 hover:shadow-xl transition-all duration-300"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Active Credentials</p>
                                        <p className="text-3xl font-bold text-blue-600 mt-2">
                                            {credentials.filter(c => c.credential?.status === 'active').length}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-xl">
                                        <FiCheck className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 hover:shadow-xl transition-all duration-300"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Inactive</p>
                                        <p className="text-3xl font-bold text-slate-400 mt-2">
                                            {credentials.filter(c => c.credential?.status !== 'active').length}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl">
                                        <FiEyeOff className="w-5 h-5 text-slate-400" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Search Bar */}
                        <div className="mb-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by firm name, username, description, or client details..."
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                                />
                                <FiSearch className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                            </div>
                        </div>

                        {/* Credentials Table */}
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Firm Details</th>
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Client Details</th>
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Credentials</th>
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created By</th>
                                            <th className="px-4 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {loading ? (
                                            // Skeleton Loading
                                            Array.from({ length: 5 }).map((_, index) => (
                                                <tr key={index} className="animate-pulse">
                                                    {Array.from({ length: 7 }).map((_, cellIndex) => (
                                                        <td key={cellIndex} className="px-4 py-4">
                                                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : filteredCredentials.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-4 py-12 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                                                            <FiEyeOff className="w-8 h-8 text-slate-400" />
                                                        </div>
                                                        <p className="text-slate-600 text-lg font-medium mb-2">
                                                            No credentials found
                                                        </p>
                                                        <p className="text-slate-400 text-sm mb-6">
                                                            {searchTerm 
                                                                ? `No results for "${searchTerm}"` 
                                                                : 'Get started by adding credentials to this group'}
                                                        </p>
                                                        <button
                                                            onClick={() => setShowAddModal(true)}
                                                            className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors duration-200"
                                                        >
                                                            <FiPlus className="w-4 h-4 mr-2" />
                                                            Add Credentials
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCredentials.map((item, index) => (
                                                <motion.tr
                                                    key={item.credential?.credential_id || index}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="group hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-blue-50/50 transition-all duration-300"
                                                >
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-600 font-medium rounded-lg text-xs">
                                                            {((pagination.page - 1) * pagination.limit) + index + 1}
                                                        </span>
                                                    </td>
                                                    
                                                    {/* Firm Details */}
                                                    <td className="px-4 py-4">
                                                        <div className="text-sm font-semibold text-slate-800">
                                                            {item.firm?.firm_name || 'N/A'}
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-1">
                                                            PAN: {item.firm?.pan_no || 'N/A'}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            Type: {item.firm?.firm_type || 'N/A'}
                                                        </div>
                                                    </td>

                                                    {/* Client Details with Icons */}
                                                    <td className="px-4 py-4">
                                                        {item.owner ? (
                                                            <div className="space-y-2">
                                                                <div className="text-sm font-medium text-slate-800">
                                                                    {item.owner.name || 'N/A'}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                    <FiPhone className="w-3.5 h-3.5 text-slate-400" />
                                                                    <span>{item.owner.mobile || 'N/A'}</span>
                                                                </div>
                                                                {item.owner.email && (
                                                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                        <FiMail className="w-3.5 h-3.5 text-slate-400" />
                                                                        <span className="truncate max-w-[150px]" title={item.owner.email}>
                                                                            {item.owner.email}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-slate-400">No owner info</span>
                                                        )}
                                                    </td>

                                                    {/* Credentials */}
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-medium text-slate-500 w-16">Username:</span>
                                                                <span className="text-sm text-slate-700">{item.credential?.username || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-medium text-slate-500 w-16">Password:</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm text-slate-700 font-mono">
                                                                        {showPassword[item.credential?.credential_id] 
                                                                            ? item.credential?.password 
                                                                            : '••••••••'}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => togglePasswordVisibility(item.credential?.credential_id)}
                                                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                        title={showPassword[item.credential?.credential_id] ? 'Hide password' : 'Show password'}
                                                                    >
                                                                        {showPassword[item.credential?.credential_id] 
                                                                            ? <FiEyeOff className="w-3.5 h-3.5" />
                                                                            : <FiEye className="w-3.5 h-3.5" />
                                                                        }
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                    item.credential?.status === 'active' 
                                                                        ? 'bg-green-100 text-green-700 border border-green-200' 
                                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                                }`}>
                                                                    {item.credential?.status || 'inactive'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Description */}
                                                    <td className="px-4 py-4">
                                                        <div className="text-sm text-slate-600 max-w-xs">
                                                            {item.credential?.description || '—'}
                                                        </div>
                                                    </td>

                                                   {/* Created By */}
<td className="px-4 py-4 whitespace-nowrap">
    {item.credential?.created_by?.name ? (
        <div>
            <div className="text-sm font-medium text-slate-800">
                {item.credential.created_by.name}
            </div>
            <div className="text-xs text-slate-500 mt-1">
                {formatDate(item.create_date || item.credential?.created_at)}
            </div>
        </div>
    ) : (
        <div className="text-sm text-slate-500">—</div>
    )}
</td>
                                                    {/* Actions */}
                                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                                        <div className="dropdown-container relative">
                                                               <button
            onClick={() => {
                // Share functionality
                if (navigator.share) {
                    navigator.share({
                        title: `${item.firm?.firm_name} Credentials`,
                        text: `Username: ${item.credential?.username}\nPassword: ${item.credential?.password}`,
                        url: window.location.href,
                    }).catch(console.error);
                } else {
                    // Fallback - copy to clipboard or show toast
                    navigator.clipboard.writeText(
                        `Firm: ${item.firm?.firm_name}\nUsername: ${item.credential?.username}\nPassword: ${item.credential?.password}`
                    );
                    showToast.success('Credential details copied to clipboard');
                }
            }}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="Share credentials"
        >
            <FiShare2 className="w-5 h-5" />
        </button>
                                                            <button
                                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                                                                onClick={() => toggleDropdown(item.credential?.credential_id)}
                                                                title="More actions"
                                                            >
                                                                <FiMoreVertical className="w-5 h-5" />
                                                            </button>

                                                            <AnimatePresence>
                                                                {activeDropdown === item.credential?.credential_id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                        transition={{ duration: 0.15 }}
                                                                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                                                                    >
                                                                        <div className="py-1">
                                                                            {/* View Button */}
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedCredential(item);
                                                                                    setShowViewModal(true);
                                                                                    setActiveDropdown(null);
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                                                                            >
                                                                                <div className="p-1.5 bg-blue-100 rounded-lg mr-3">
                                                                                    <FiEye className="w-3.5 h-3.5 text-blue-600" />
                                                                                </div>
                                                                                <span>View Details</span>
                                                                            </button>

                                                                            {/* Edit Button */}
                                                                            <button
                                                                                onClick={() => handleEditClick(item)}
                                                                                className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 transition-all duration-200"
                                                                            >
                                                                                <div className="p-1.5 bg-amber-100 rounded-lg mr-3">
                                                                                    <FiEdit className="w-3.5 h-3.5 text-amber-600" />
                                                                                </div>
                                                                                <span>Edit Credential</span>
                                                                            </button>

                                                                            {/* Copy Username */}
                                                                            <button
                                                                                onClick={() => {
                                                                                    navigator.clipboard.writeText(item.credential?.username || '');
                                                                                    showToast.success('Username copied to clipboard');
                                                                                    setActiveDropdown(null);
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200"
                                                                            >
                                                                                <div className="p-1.5 bg-purple-100 rounded-lg mr-3">
                                                                                    <FiCopy className="w-3.5 h-3.5 text-purple-600" />
                                                                                </div>
                                                                                <span>Copy Username</span>
                                                                            </button>

                                                                            {/* Copy Password */}
                                                                            <button
                                                                                onClick={() => {
                                                                                    navigator.clipboard.writeText(item.credential?.password || '');
                                                                                    showToast.success('Password copied to clipboard');
                                                                                    setActiveDropdown(null);
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-teal-50 hover:to-green-50 transition-all duration-200"
                                                                            >
                                                                                <div className="p-1.5 bg-teal-100 rounded-lg mr-3">
                                                                                    <FiCopy className="w-3.5 h-3.5 text-teal-600" />
                                                                                </div>
                                                                                <span>Copy Password</span>
                                                                            </button>

                                                                            {/* Delete Button */}
                                                                            <button
                                                                                onClick={() => handleDeleteClick(item)}
                                                                                className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 transition-all duration-200"
                                                                            >
                                                                                <div className="p-1.5 bg-red-100 rounded-lg mr-3">
                                                                                    <FiTrash className="w-3.5 h-3.5 text-red-600" />
                                                                                </div>
                                                                                <span>Delete</span>
                                                                            </button>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-500">
                                        Showing <span className="font-medium text-slate-700">{filteredCredentials.length}</span> of{' '}
                                        <span className="font-medium text-slate-700">{pagination.total}</span> credentials
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handlePrevPage}
                                            disabled={pagination.page === 1}
                                            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                pagination.page === 1
                                                    ? 'text-slate-400 cursor-not-allowed'
                                                    : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                            }`}
                                        >
                                            Previous
                                        </button>
                                        <span className="px-3 py-2 text-sm text-slate-700">
                                            Page {pagination.page} of {pagination.total_pages}
                                        </span>
                                        <button
                                            onClick={handleNextPage}
                                            disabled={pagination.is_last_page}
                                            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                pagination.is_last_page
                                                    ? 'text-slate-400 cursor-not-allowed'
                                                    : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                            }`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Credential Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => {
                        setShowAddModal(false);
                        setFirmSearchQuery('');
                        setFirms([]);
                        setSearchPerformed(false);
                        setAddForm({
                            group_id: group_id,
                            firm_id: '',
                            username: '',
                            password: '',
                            description: ''
                        });
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <FiPlus className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Add Firm Credentials</h3>
                                        <p className="text-xs text-indigo-100 mt-1">Search and select a firm to add credentials</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleAddCredential}>
                                <div className="px-6 py-6 space-y-4">
                                    {/* Firm Search */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Search Firm <span className="text-red-500">*</span>
                                        </label>
                                        
                                        {/* Selected Firm Display */}
                                        {addForm.firm_id && (
                                            <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FiCheck className="w-4 h-4 text-indigo-600" />
                                                    <span className="text-sm font-medium text-indigo-700">
                                                        Selected: {firmSearchQuery}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleClearSelectedFirm}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                                >
                                                    Change
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Search Input */}
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={firmSearchQuery}
                                                onChange={(e) => setFirmSearchQuery(e.target.value)}
                                                placeholder={addForm.firm_id ? "Search for a different firm..." : "Type at least 2 characters to search firms..."}
                                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                                                disabled={!!addForm.firm_id}
                                            />
                                            <FiSearch className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                            {firmsLoading && (
                                                <div className="absolute right-3 top-3.5">
                                                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Helper text */}
                                        {!addForm.firm_id && (
                                            <p className="text-xs text-slate-500 mt-2">
                                                {firmSearchQuery.length < 2 
                                                    ? 'Type at least 2 characters to search for firms' 
                                                    : searchPerformed ? `Found ${firms.length} firm${firms.length !== 1 ? 's' : ''}` : ''}
                                            </p>
                                        )}
                                        
                                        {/* Search Results */}
                                        {!addForm.firm_id && firmSearchQuery.length >= 2 && (
                                            <div className="mt-3 max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                                                {firmsLoading ? (
                                                    <div className="p-8 text-center">
                                                        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                                        <p className="text-slate-600">Searching firms...</p>
                                                    </div>
                                                ) : firms.length > 0 ? (
                                                    firms.map((firm) => (
                                                        <div
                                                            key={firm.firm_id || firm.id}
                                                            onClick={() => handleSelectFirm(firm)}
                                                            className="p-4 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-indigo-50 transition-all duration-200"
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="font-semibold text-slate-800">
                                                                        {firm.firm_name || firm.name || 'Unknown'}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-xs px-2 py-1 bg-slate-100 rounded-full text-slate-600">
                                                                            {firm.firm_type || 'N/A'}
                                                                        </span>
                                                                        {firm.pan_no && (
                                                                            <span className="text-xs text-slate-500">
                                                                                PAN: {firm.pan_no}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {firm.client && (
                                                                        <div className="mt-2 text-xs text-slate-600">
                                                                            <div>Owner: {firm.client.name || 'N/A'}</div>
                                                                            <div>Mobile: {firm.client.mobile || 'N/A'}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-8 text-center">
                                                        <div className="p-3 bg-slate-100 rounded-full inline-block mb-3">
                                                            <FiSearch className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                        <p className="text-slate-600 font-medium mb-1">No firms found</p>
                                                        <p className="text-xs text-slate-400">
                                                            Try searching with a different name
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Username */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Username <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={addForm.username}
                                            onChange={(e) => setAddForm({...addForm, username: e.target.value})}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                                            placeholder="Enter username"
                                            required
                                        />
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Password <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={addForm.password}
                                            onChange={(e) => setAddForm({...addForm, password: e.target.value})}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                                            placeholder="Enter password"
                                            required
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={addForm.description}
                                            onChange={(e) => setAddForm({...addForm, description: e.target.value})}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                                            placeholder="Enter description (optional)"
                                            rows="3"
                                        />
                                    </div>
                                </div>

                                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            setFirmSearchQuery('');
                                            setFirms([]);
                                            setSearchPerformed(false);
                                            setAddForm({
                                                group_id: group_id,
                                                firm_id: '',
                                                username: '',
                                                password: '',
                                                description: ''
                                            });
                                        }}
                                        className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:border-slate-300 rounded-xl border border-slate-200 transition-all duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loading || !addForm.firm_id}
                                    >
                                        {loading ? 'Adding...' : 'Add Credentials'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Credential Modal */}
            <AnimatePresence>
                {showEditModal && selectedCredential && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <FiEdit className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Edit Credentials</h3>
                                        <p className="text-xs text-amber-100 mt-1">Update credential information</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleEditCredential}>
                                <div className="px-6 py-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Firm
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedCredential.firm?.firm_name || ''}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600"
                                            disabled
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Username <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.username}
                                            onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm"
                                            placeholder="Enter username"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Password <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.password}
                                            onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm"
                                            placeholder="Enter password"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm"
                                            placeholder="Enter description"
                                            rows="3"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Status
                                        </label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:border-slate-300 rounded-xl border border-slate-200 transition-all duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-sm font-medium rounded-xl shadow-lg shadow-amber-200 hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                                        disabled={loading}
                                    >
                                        {loading ? 'Updating...' : 'Update Credentials'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && selectedCredential && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <FiTrash className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Delete Credential</h3>
                                        <p className="text-xs text-red-100 mt-1">This action cannot be undone</p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-6">
                                <div className="flex items-center justify-center mb-6">
                                    <div className="p-4 bg-red-100 rounded-full">
                                        <FiTrash className="w-8 h-8 text-red-600" />
                                    </div>
                                </div>

                                <p className="text-center text-slate-700 mb-3">
                                    Are you sure you want to delete this credential?
                                </p>

                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <p className="text-sm text-slate-600 text-center">
                                        <span className="font-semibold text-slate-800">{selectedCredential.firm?.firm_name}</span>
                                        <br />
                                        <span className="text-xs text-slate-500">Username: {selectedCredential.credential?.username}</span>
                                    </p>
                                </div>

                                <p className="text-center text-xs text-slate-500 mt-4">
                                    This action is permanent and cannot be reversed.
                                </p>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:border-slate-300 rounded-xl border border-slate-200 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteCredential}
                                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-xl shadow-lg shadow-red-200 hover:shadow-xl transition-all duration-200"
                                >
                                    Delete Credential
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Credential Modal */}
            <AnimatePresence>
                {showViewModal && selectedCredential && (
                    <ViewCredentialModal
                        credential={selectedCredential}
                        onClose={() => {
                            setShowViewModal(false);
                            setSelectedCredential(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default PasswordGroupFirms;