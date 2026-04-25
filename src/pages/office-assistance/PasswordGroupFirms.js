import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    FiPlus, FiEdit, FiTrash, FiArrowLeft, FiMoreVertical, FiCheck, FiSearch,
    FiEye, FiEyeOff, FiX, FiPhone, FiMail, FiCopy, FiCheckCircle, FiXCircle,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import TablePagination from '../../components/TablePagination';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { passwordGroupService } from '../../services/passwordGroupService';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const formatTypeLabel = (value) => {
    if (!value) return 'N/A';
    return String(value)
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

/** API returns boolean (`true`/`false`); legacy values may be `'active'` / `'inactive'`. */
const isCredentialActiveStatus = (status) =>
    status === true ||
    status === 'true' ||
    String(status || '').toLowerCase() === 'active';

const credentialStatusLabel = (status) =>
    isCredentialActiveStatus(status) ? 'Active' : 'Inactive';

const ACTIONS_MENU_WIDTH = 224;
/** Used only to decide flip above/below; real menu height is content-based. */
const ACTIONS_MENU_HEIGHT = 240;
const MENU_EDGE_GAP = 4;
const FIRM_SEARCH_MIN_CHARS = 3;

const computeActionsMenuCoords = (buttonEl) => {
    const rect = buttonEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;
    const alignRight = spaceRight < ACTIONS_MENU_WIDTH;

    let left = alignRight ? rect.right - ACTIONS_MENU_WIDTH : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - ACTIONS_MENU_WIDTH - 8));

    const topIfDown = rect.bottom + MENU_EDGE_GAP;
    const wouldOverflowBottom = topIfDown + ACTIONS_MENU_HEIGHT > window.innerHeight - 8;
    const openUp =
        spaceBelow < ACTIONS_MENU_HEIGHT || (wouldOverflowBottom && spaceBelow < rect.top);

    if (!openUp) {
        return { placement: 'down', left, top: topIfDown };
    }

    // Anchor by bottom so the gap to the trigger stays exact regardless of menu height.
    return {
        placement: 'up',
        left,
        bottom: window.innerHeight - rect.top + MENU_EDGE_GAP,
    };
};

// View Credential Modal
const ViewCredentialModal = ({ credential, onClose }) => {
    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    if (!credential) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3.5 shrink-0">
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

                <div
                    className="px-5 py-4 overflow-y-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* Credential details — first */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Credential Details</h4>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500">Username</p>
                                    <div className="flex items-center justify-between mt-1 gap-2">
                                        <p className="text-sm font-medium text-slate-800 break-all">
                                            {credential.credential?.username || 'N/A'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(credential.credential?.username, 'Username')}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                                            title="Copy username"
                                        >
                                            <FiCopy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">Password</p>
                                    <div className="flex items-center justify-between mt-1 gap-2">
                                        <p className="text-sm font-mono font-medium text-slate-800 break-all">
                                            {credential.credential?.password ?? 'N/A'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(credential.credential?.password, 'Password')}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                                            title="Copy password"
                                        >
                                            <FiCopy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {credential.credential?.description && (
                                    <div>
                                        <p className="text-xs text-slate-500">Description</p>
                                        <p className="text-sm text-slate-700 mt-1">{credential.credential.description}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-xs text-slate-500">Status</p>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isCredentialActiveStatus(credential.credential?.status)
                                            ? 'bg-green-100 text-green-700 border border-green-200'
                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                            {credentialStatusLabel(credential.credential?.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

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
                                    <p className="text-sm font-medium text-slate-800 mt-1">{formatTypeLabel(credential.firm?.firm_type)}</p>
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
                    {credential.client && (
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Client Information</h4>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <p className="text-xs text-slate-500">Client Name</p>
                                        <p className="text-sm font-medium text-slate-800 mt-1">{credential.client.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Mobile Number</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <FiPhone className="w-4 h-4 text-slate-400" />
                                            <p className="text-sm font-medium text-slate-800">{credential.client.mobile || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Email Address</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <FiMail className="w-4 h-4 text-slate-400" />
                                            <p className="text-sm font-medium text-slate-800">{credential.client.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Metadata Section */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Additional Information</h4>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500">Created Date</p>
                                    <p className="text-sm font-medium text-slate-800 mt-1">
                                        {credential.credential?.create_date ? new Date(credential.credential.create_date).toLocaleString() : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Created By</p>
                                    <p className="text-sm font-medium text-slate-800 mt-1">
                                        {credential.credential?.created_by?.name || credential.credential?.created_by || 'N/A'}
                                    </p>
                                </div>
                                {credential.credential?.modify_date && (
                                    <>
                                        <div>
                                            <p className="text-xs text-slate-500">Last Updated</p>
                                            <p className="text-sm font-medium text-slate-800 mt-1">
                                                {new Date(credential.credential.modify_date).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Updated By</p>
                                            <p className="text-sm font-medium text-slate-800 mt-1">
                                                {credential.credential?.modified_by?.name || credential.credential?.modified_by || 'N/A'}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end shrink-0">
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
    const [groupName, setGroupName] = useState(location.state?.group_name || 'Group');

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [credentials, setCredentials] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    /** null | 'single' (row actions) | 'bulk' (toolbar) */
    const [pendingDelete, setPendingDelete] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedCredential, setSelectedCredential] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [firms, setFirms] = useState([]);
    const [firmsLoading, setFirmsLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [dropdownCoords, setDropdownCoords] = useState(null);
    const dropdownAnchorRef = useRef(null);
    const [showPassword, setShowPassword] = useState({});
    const [selectedCredentialIds, setSelectedCredentialIds] = useState([]);
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

    const closeActionsMenu = useCallback(() => {
        setActiveDropdown(null);
        setDropdownCoords(null);
        dropdownAnchorRef.current = null;
    }, []);

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

    const debouncedSearch = useDebouncedValue(searchTerm, 300);

    // Fetch group firms data
    useEffect(() => {
        fetchGroupFirms(group_id, pagination.page, pagination.limit, debouncedSearch);
    }, [group_id, pagination.page, pagination.limit, debouncedSearch]);

    // Debounced firm search
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (showAddModal && firmSearchQuery.length >= FIRM_SEARCH_MIN_CHARS) {
                searchFirms(firmSearchQuery);
            } else if (firmSearchQuery.length < FIRM_SEARCH_MIN_CHARS) {
                setFirms([]);
                setSearchPerformed(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [firmSearchQuery, showAddModal]);

    const fetchGroupFirms = async (currentGroupId = group_id, pageNo = pagination.page, limitValue = pagination.limit, searchValue = searchTerm) => {
        setLoading(true);
        try {
            const response = await passwordGroupService.listFirmCredentials(currentGroupId, {
                page_no: Math.max(1, Number(pageNo) || 1),
                limit: Math.min(100, Math.max(1, Number(limitValue) || 20)),
                search: searchValue || '',
            });
            const result = response.data;

            if (result.success) {
                const rows = Array.isArray(result.data) ? result.data : (result.data?.credentials || []);
                setCredentials(rows);
                if (result.group?.group_name) {
                    setGroupName(result.group.group_name);
                }
                setPagination({
                    page: result.meta?.page || pageNo,
                    limit: result.meta?.limit || limitValue,
                    total: result.meta?.total || 0,
                    total_pages: result.meta?.total_pages || 1,
                    is_last_page: result.meta?.is_last_page || false
                });
            } else {
                toast.error(result.message || 'Failed to fetch credentials');
            }
        } catch (error) {
            console.error('Error fetching group firms:', error);
            toast.error('Network error. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const searchFirms = async (searchQuery) => {
        if (!searchQuery || searchQuery.length < FIRM_SEARCH_MIN_CHARS) {
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
                    toast(`No firms found matching "${searchQuery}"`, { icon: 'ℹ️' });
                }
            } else {
                console.error('Failed to search firms:', result.message);
                toast.error(result.message || 'Failed to search firms');
                setFirms([]);
            }
        } catch (error) {
            console.error('Error searching firms:', error);
            toast.error('Network error. Please check your connection.');
            setFirms([]);
        } finally {
            setFirmsLoading(false);
        }
    };

    const handleAddCredential = async (e) => {
        e.preventDefault();

        if (!addForm.firm_id) {
            toast.error('Please select a firm');
            return;
        }

        if (!addForm.username.trim()) {
            toast.error('Please enter a username');
            return;
        }

        if (!addForm.password.trim()) {
            toast.error('Please enter a password');
            return;
        }

        const loadingToast = toast.loading('Adding credential...');

        try {
            const response = await passwordGroupService.createFirmCredential({
                group_id: addForm.group_id,
                firm_id: addForm.firm_id,
                username: addForm.username?.trim(),
                password: addForm.password,
                description: addForm.description?.trim() || undefined,
            });
            const result = response.data;

            toast.dismiss(loadingToast);

            if (result.success) {
                toast.success('Credential added successfully');
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
                toast.error(result.message || 'Failed to add credential');
            }
        } catch (error) {
            console.error('Error adding credential:', error);
            toast.dismiss(loadingToast);
            toast.error('Network error. Please check your connection.');
        }
    };

    const handleEditCredential = async (e) => {
        e.preventDefault();

        if (!editForm.username.trim()) {
            toast.error('Please enter a username');
            return;
        }

        if (!editForm.password.trim()) {
            toast.error('Please enter a password');
            return;
        }

        const loadingToast = toast.loading('Updating credential...');

        try {
            const response = await passwordGroupService.editFirmCredential(editForm.credential_id, {
                username: editForm.username?.trim(),
                password: editForm.password,
                description: editForm.description?.trim() || null,
                status: editForm.status === 'active',
            });
            const result = response.data;

            toast.dismiss(loadingToast);

            if (result.success) {
                toast.success('Credential updated successfully');
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
                toast.error(result.message || 'Failed to update credential');
            }
        } catch (error) {
            console.error('Error editing credential:', error);
            toast.dismiss(loadingToast);
            toast.error('Network error. Please check your connection.');
        }
    };

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        const mode = pendingDelete;
        const ids =
            mode === 'bulk'
                ? [...selectedCredentialIds]
                : selectedCredential?.credential?.credential_id
                  ? [selectedCredential.credential.credential_id]
                  : [];
        if (!ids.length) {
            toast.error('No credentials selected to delete');
            return;
        }

        const loadingToast = toast.loading(
            ids.length > 1 ? `Deleting ${ids.length} credentials...` : 'Deleting credential...'
        );
        try {
            const response = await passwordGroupService.deleteFirmCredentials(ids);
            const result = response.data;
            toast.dismiss(loadingToast);
            if (result.success) {
                toast.success(result.message || 'Credential deleted successfully');
                fetchGroupFirms();
                setPendingDelete(null);
                if (mode === 'bulk') {
                    setSelectedCredentialIds([]);
                } else {
                    setSelectedCredential(null);
                }
            } else {
                toast.error(result.message || 'Failed to delete credential(s)');
            }
        } catch (error) {
            console.error('Error deleting credential(s):', error);
            toast.dismiss(loadingToast);
            const msg =
                error.response?.data?.message ||
                'Network error. Please check your connection.';
            toast.error(msg);
        } finally {
            closeActionsMenu();
        }
    };

    const handleEditClick = (credential) => {
        setSelectedCredential(credential);
        setEditForm({
            credential_id: credential.credential.credential_id,
            username: credential.credential.username || '',
            password: credential.credential.password || '',
            description: credential.credential.description || '',
            status: isCredentialActiveStatus(credential.credential.status) ? 'active' : 'inactive',
        });
        setShowEditModal(true);
        closeActionsMenu();
    };

    const handleDeleteClick = (credential) => {
        setSelectedCredential(credential);
        setPendingDelete('single');
        closeActionsMenu();
    };

    const toggleDropdown = (credentialId, buttonElement) => {
        if (activeDropdown === credentialId) {
            closeActionsMenu();
            return;
        }
        dropdownAnchorRef.current = buttonElement || null;
        if (buttonElement) {
            setDropdownCoords(computeActionsMenuCoords(buttonElement));
        } else {
            setDropdownCoords(null);
        }
        setActiveDropdown(credentialId);
    };

    const togglePasswordVisibility = (credentialId) => {
        setShowPassword(prev => ({
            ...prev,
            [credentialId]: !prev[credentialId]
        }));
    };

    const handleSelectCredential = (credentialId) => {
        if (!credentialId) return;
        setSelectedCredentialIds((prev) =>
            prev.includes(credentialId)
                ? prev.filter((id) => id !== credentialId)
                : [...prev, credentialId]
        );
    };

    const handleSelectAllCredentials = () => {
        const allIds = credentials
            .map((item) => item?.credential?.credential_id)
            .filter(Boolean);
        if (!allIds.length) return;
        const allSelected =
            allIds.length > 0 &&
            allIds.every((id) => selectedCredentialIds.includes(id));
        if (allSelected) {
            setSelectedCredentialIds([]);
        } else {
            setSelectedCredentialIds(allIds);
        }
    };

    useEffect(() => {
        const validIds = credentials
            .map((item) => item?.credential?.credential_id)
            .filter(Boolean);
        setSelectedCredentialIds((prev) => prev.filter((id) => validIds.includes(id)));
    }, [credentials]);

    useEffect(() => {
        if (pendingDelete === 'bulk' && selectedCredentialIds.length === 0) {
            setPendingDelete(null);
        }
    }, [pendingDelete, selectedCredentialIds]);

    // Reposition actions menu on scroll/resize (menu is portaled + fixed)
    useEffect(() => {
        if (!activeDropdown || !dropdownAnchorRef.current) return;
        const el = dropdownAnchorRef.current;
        const update = () => setDropdownCoords(computeActionsMenuCoords(el));
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [activeDropdown]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                event.target.closest('.dropdown-container') ||
                event.target.closest('[data-password-group-actions-menu]')
            ) {
                return;
            }
            closeActionsMenu();
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [closeActionsMenu]);

    const handleBack = () => {
        navigate('/staff/office-assistance/password-groups');
    };

    const handleSelectFirm = (firm) => {
        setAddForm({ ...addForm, firm_id: firm.firm_id || firm.id });
        setFirmSearchQuery(firm.firm_name || firm.name || '');
        setFirms([]);
        setSearchPerformed(false);
    };

    const handleClearSelectedFirm = () => {
        setAddForm({ ...addForm, firm_id: '' });
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

    const credentialIdsOnPage = credentials
        .map((item) => item?.credential?.credential_id)
        .filter(Boolean);
    const selectAllOnPage =
        credentialIdsOnPage.length > 0 &&
        credentialIdsOnPage.every((id) => selectedCredentialIds.includes(id));

    const activeActionsItem =
        activeDropdown == null
            ? null
            : credentials.find((c) => c.credential?.credential_id === activeDropdown) ?? null;
    const portalActionsCredId = activeActionsItem?.credential?.credential_id;
    const portalActionsRowSelected = Boolean(
        portalActionsCredId && selectedCredentialIds.includes(portalActionsCredId)
    );

    const deleteConfirmOpen =
        Boolean(pendingDelete) &&
        (pendingDelete === 'single'
            ? Boolean(selectedCredential)
            : selectedCredentialIds.length > 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
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
                        {/* Credentials table (title + toolbar merged above grid) */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-5">
                                <div className="flex min-w-0 flex-nowrap items-center justify-between gap-3 overflow-x-auto py-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:gap-4 md:gap-5">
                                    <div className="flex min-w-0 max-w-[min(100%,16rem)] items-center gap-3 sm:max-w-xs md:max-w-sm lg:max-w-md">
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                                            title="Go back"
                                        >
                                            <FiArrowLeft className="h-5 w-5" />
                                        </button>
                                        <h1 className="min-w-0 truncate text-base font-bold leading-tight text-slate-800 sm:text-lg md:text-xl">
                                            {groupName}
                                        </h1>
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2 sm:gap-3 md:min-w-0 md:pl-2">
                                        {selectedCredentialIds.length > 0 && (
                                            <div className="flex h-10 shrink-0 items-center gap-2 text-sm text-gray-600">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700">
                                                    {selectedCredentialIds.length}
                                                </div>
                                                <span className="hidden sm:inline">selected</span>
                                            </div>
                                        )}
                                        {selectedCredentialIds.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setPendingDelete('bulk')}
                                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md transition-all duration-200 hover:from-red-700 hover:to-red-800"
                                                title="Delete selected"
                                            >
                                                <FiTrash className="h-4 w-4" />
                                            </button>
                                        )}
                                        <div className="relative h-10 min-w-[9rem] max-w-md flex-1 sm:min-w-[12rem] md:max-w-lg">
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => {
                                                    setSearchTerm(e.target.value);
                                                    setPagination((prev) => ({ ...prev, page: 1 }));
                                                }}
                                                placeholder="Search by firm name, username, description, or client details..."
                                                className="box-border h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm leading-none text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        </div>
                                        <motion.button
                                            type="button"
                                            onClick={() => setShowAddModal(true)}
                                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 text-sm font-medium text-white shadow-md transition-all duration-200 hover:from-indigo-700 hover:to-indigo-800"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiPlus className="h-4 w-4 shrink-0" />
                                            Add Credentials
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-4 text-left align-middle min-w-[7.5rem]">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider leading-none">
                                                        #
                                                    </span>
                                                    {!loading && credentials.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={handleSelectAllCredentials}
                                                            className="inline-flex items-center justify-center rounded-md p-0.5 text-slate-600 hover:bg-slate-100/90 hover:text-slate-900"
                                                            aria-label={selectAllOnPage ? 'Deselect all on this page' : 'Select all on this page'}
                                                            title={selectAllOnPage ? 'Deselect all on this page' : 'Select all on this page'}
                                                        >
                                                            <div
                                                                className={`relative w-8 h-4 rounded-full transition-colors duration-300 ${selectAllOnPage ? 'bg-indigo-600' : 'bg-gray-300'
                                                                    }`}
                                                            >
                                                                <motion.div
                                                                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow ${selectAllOnPage ? 'left-4' : 'left-0.5'
                                                                        }`}
                                                                    layout
                                                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                                />
                                                                {selectAllOnPage && (
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <FiCheckCircle className="w-1.5 h-1.5 text-white absolute left-1" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-left align-middle text-xs font-semibold text-slate-600 uppercase tracking-wider">Firm Details</th>
                                            <th className="px-4 py-4 text-left align-middle text-xs font-semibold text-slate-600 uppercase tracking-wider">Client Details</th>
                                            <th className="px-4 py-4 text-left align-middle text-xs font-semibold text-slate-600 uppercase tracking-wider">Credentials</th>
                                            <th className="px-4 py-4 text-left align-middle text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-4 text-right align-middle text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {loading ? (
                                            // Skeleton Loading
                                            Array.from({ length: 5 }).map((_, index) => (
                                                <tr key={index} className="animate-pulse">
                                                    {Array.from({ length: 6 }).map((_, cellIndex) => (
                                                        <td key={cellIndex} className="px-4 py-4">
                                                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : credentials.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-4 py-12 text-center">
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
                                            credentials.map((item, index) => {
                                                const credId = item.credential?.credential_id;
                                                const isRowSelected = Boolean(credId && selectedCredentialIds.includes(credId));
                                                return (
                                                    <motion.tr
                                                        key={credId || index}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className={`group transition-all duration-300 ${isRowSelected
                                                                ? 'bg-indigo-50/50'
                                                                : 'hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-blue-50/50'
                                                            }`}
                                                    >
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs font-medium text-gray-700 shrink-0">
                                                                    {((pagination.page - 1) * pagination.limit) + index + 1}
                                                                </div>
                                                                <motion.button
                                                                    type="button"
                                                                    onClick={() => handleSelectCredential(credId)}
                                                                    className={`relative w-7 h-3.5 rounded-full transition-colors duration-300 shrink-0 ${isRowSelected ? 'bg-indigo-600' : 'bg-gray-300'
                                                                        }`}
                                                                    whileTap={{ scale: 0.95 }}
                                                                >
                                                                    <motion.div
                                                                        className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow ${isRowSelected ? 'left-3.5' : 'left-0.5'
                                                                            }`}
                                                                        layout
                                                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                                    />
                                                                    {isRowSelected && (
                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                            <FiCheckCircle className="w-1.5 h-1.5 text-white absolute left-1" />
                                                                        </div>
                                                                    )}
                                                                </motion.button>
                                                            </div>
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
                                                                Type: {formatTypeLabel(item.firm?.firm_type)}
                                                            </div>
                                                        </td>

                                                        {/* Client Details with Icons */}
                                                        <td className="px-4 py-4">
                                                            {item.client ? (
                                                                <div className="space-y-2">
                                                                    <div className="text-sm font-medium text-slate-800">
                                                                        {item.client.name || 'N/A'}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                        <FiPhone className="w-3.5 h-3.5 text-slate-400" />
                                                                        <span>{item.client.mobile || 'N/A'}</span>
                                                                    </div>
                                                                    {item.client.email && (
                                                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                            <FiMail className="w-3.5 h-3.5 text-slate-400" />
                                                                            <span className="truncate max-w-[150px]" title={item.client.email}>
                                                                                {item.client.email}
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
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(item.credential?.username || '');
                                                                            toast.success('Username copied to clipboard');
                                                                        }}
                                                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                        title="Copy username"
                                                                    >
                                                                        <FiCopy className="w-3.5 h-3.5" />
                                                                    </button>
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
                                                                        <button
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(item.credential?.password || '');
                                                                                toast.success('Password copied to clipboard');
                                                                            }}
                                                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                            title="Copy password"
                                                                        >
                                                                            <FiCopy className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isCredentialActiveStatus(item.credential?.status)
                                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                                }`}>
                                                                {credentialStatusLabel(item.credential?.status)}
                                                            </span>
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="px-4 py-4 whitespace-nowrap text-right">
                                                            <div className="dropdown-container relative">
                                                                <button
                                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                                                                    onClick={(e) => toggleDropdown(item.credential?.credential_id, e.currentTarget)}
                                                                    title="More actions"
                                                                >
                                                                    <FiMoreVertical className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <TablePagination
                                showRange
                                showRows
                                rowOptions={[5, 10, 20, 50, 100]}
                                defaultRows={20}
                                showJump
                                showFirstLast
                                page={pagination.page}
                                limit={pagination.limit}
                                total={pagination.total}
                                totalPages={pagination.total_pages}
                                isLastPage={pagination.is_last_page}
                                onPageChange={(nextPage) =>
                                    setPagination((prev) => ({ ...prev, page: nextPage }))
                                }
                                onLimitChange={(nextLimit) => {
                                    const safe = Math.min(100, Math.max(1, Number(nextLimit) || 20));
                                    setPagination((prev) => ({ ...prev, page: 1, limit: safe }));
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Credential Modal — layout per context/modal.md: fixed header/footer, single scrollable body */}
            <AnimatePresence>
                {showAddModal && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
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
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-2 sm:my-4 min-h-0 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-3.5 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <FiPlus className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Add Firm Credentials</h3>
                                        <p className="text-xs text-indigo-100 mt-1">Search a firm, then enter credentials</p>
                                    </div>
                                </div>
                            </div>

                            <form
                                onSubmit={handleAddCredential}
                                className="flex flex-col flex-1 min-h-0 overflow-hidden"
                                autoComplete="off"
                            >
                                {/* Nudge some browsers to skip heuristics for a generic "login" form (non-reliable) */}
                                <div className="h-0 overflow-hidden" aria-hidden="true">
                                    <input type="text" readOnly tabIndex={-1} autoComplete="off" id="a_off_usr" />
                                    <input type="password" readOnly tabIndex={-1} autoComplete="off" id="a_off_pw" />
                                </div>
                                <div
                                    className="px-5 py-4 overflow-y-auto flex-1 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <label
                                                className="block text-sm font-semibold text-slate-700 mb-2"
                                                htmlFor="pwg-firm-search-input"
                                            >
                                                Search firm <span className="text-red-500">*</span>
                                            </label>

                                            {addForm.firm_id && (
                                                <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <FiCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                                                        <span className="text-sm font-medium text-indigo-700 truncate">
                                                            Selected: {firmSearchQuery}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleClearSelectedFirm}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0"
                                                    >
                                                        Change
                                                    </button>
                                                </div>
                                            )}

                                            <div className="relative">
                                                <input
                                                    id="pwg-firm-search-input"
                                                    name="pwg_firm_query"
                                                    type="search"
                                                    value={firmSearchQuery}
                                                    onChange={(e) => setFirmSearchQuery(e.target.value)}
                                                    placeholder={
                                                        addForm.firm_id
                                                            ? 'Search for a different firm…'
                                                            : `Type at least ${FIRM_SEARCH_MIN_CHARS} characters to search…`
                                                    }
                                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                                    disabled={!!addForm.firm_id}
                                                    autoComplete="off"
                                                />
                                                <FiSearch className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                                {firmsLoading && (
                                                    <div className="absolute right-3 top-3.5">
                                                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                )}
                                            </div>

                                            {!addForm.firm_id && (
                                                <p className="text-xs text-slate-500 mt-2">
                                                    {firmSearchQuery.length < FIRM_SEARCH_MIN_CHARS
                                                        ? `Type at least ${FIRM_SEARCH_MIN_CHARS} characters to search for firms`
                                                        : searchPerformed
                                                          ? `Found ${firms.length} firm${firms.length !== 1 ? 's' : ''}`
                                                          : ''}
                                                </p>
                                            )}

                                            {!addForm.firm_id && firmSearchQuery.length >= FIRM_SEARCH_MIN_CHARS && (
                                                <div className="mt-3 max-h-80 sm:max-h-[22rem] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                                    {firmsLoading ? (
                                                        <div className="p-6 text-center">
                                                            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                                            <p className="text-sm text-slate-600">Searching firms…</p>
                                                        </div>
                                                    ) : firms.length > 0 ? (
                                                        firms.map((firm) => (
                                                            <div
                                                                key={firm.firm_id || firm.id}
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => handleSelectFirm(firm)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        handleSelectFirm(firm);
                                                                    }
                                                                }}
                                                                className="px-3 py-2 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-indigo-50/80 transition-colors"
                                                            >
                                                                <div className="flex min-w-0 items-center gap-2">
                                                                    <span
                                                                        className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-slate-800"
                                                                        title={firm.firm_name || firm.name || 'Unknown'}
                                                                    >
                                                                        {firm.firm_name || firm.name || 'Unknown'}
                                                                    </span>
                                                                    <span className="shrink-0 text-[10px] font-medium uppercase leading-none text-slate-500">
                                                                        {formatTypeLabel(firm.firm_type)}
                                                                    </span>
                                                                </div>
                                                                {(firm.pan_no || firm.client?.name || firm.client?.mobile) && (
                                                                    <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-left text-[11px] leading-snug text-slate-600">
                                                                        {firm.pan_no && (
                                                                            <span>
                                                                                <span className="text-slate-400">PAN</span> {firm.pan_no}
                                                                            </span>
                                                                        )}
                                                                        {firm.pan_no && (firm.client?.name || firm.client?.mobile) && (
                                                                            <span className="text-slate-300" aria-hidden>
                                                                                ·
                                                                            </span>
                                                                        )}
                                                                        {firm.client?.name && (
                                                                            <span
                                                                                className="min-w-0 max-w-full truncate"
                                                                                title={firm.client.name}
                                                                            >
                                                                                <span className="text-slate-400">Owner</span>{' '}
                                                                                {firm.client.name}
                                                                            </span>
                                                                        )}
                                                                        {(firm.client?.name || firm.pan_no) && firm.client?.mobile && (
                                                                            <span className="text-slate-300" aria-hidden>
                                                                                ·
                                                                            </span>
                                                                        )}
                                                                        {firm.client?.mobile && (
                                                                            <span className="inline-flex min-w-0 max-w-full items-center gap-0.5 text-slate-600">
                                                                                <FiPhone
                                                                                    className="h-3 w-3 shrink-0 text-slate-400"
                                                                                    aria-hidden
                                                                                />
                                                                                {firm.client.mobile}
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-8 text-center">
                                                            <div className="p-3 bg-slate-100 rounded-full inline-block mb-3">
                                                                <FiSearch className="w-5 h-5 text-slate-400" />
                                                            </div>
                                                            <p className="text-slate-600 font-medium mb-1">No firms found</p>
                                                            <p className="text-xs text-slate-400">
                                                                Try a different search term
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label
                                                className="block text-sm font-semibold text-slate-700 mb-2"
                                                htmlFor="pwg-cred-username"
                                            >
                                                Username <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="pwg-cred-username"
                                                name="pwg_credential_username"
                                                type="text"
                                                value={addForm.username}
                                                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                                placeholder="Enter username for this group"
                                                autoComplete="nope"
                                                data-1p-ignore
                                                data-lpignore="true"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label
                                                className="block text-sm font-semibold text-slate-700 mb-2"
                                                htmlFor="pwg-cred-password"
                                            >
                                                Password <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="pwg-cred-password"
                                                name="pwg_credential_secret"
                                                type="text"
                                                value={addForm.password}
                                                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                                placeholder="Enter password for this group"
                                                autoComplete="new-password"
                                                autoCorrect="off"
                                                autoCapitalize="off"
                                                data-1p-ignore
                                                data-lpignore="true"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={addForm.description}
                                                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white resize-y min-h-[80px]"
                                                placeholder="Optional notes"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3 shrink-0">
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
                                        {loading ? 'Adding…' : 'Add credentials'}
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
                    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto" onClick={() => setShowEditModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-3.5 shrink-0">
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

                            <form onSubmit={handleEditCredential} className="flex flex-col flex-1 min-h-0">
                                <div
                                    className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
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
                                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
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
                                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
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
                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
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
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3 shrink-0">
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

            {/* Delete confirmation (single row or bulk selection) */}
            <AnimatePresence>
                {deleteConfirmOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
                        onClick={() => setPendingDelete(null)}
                    >
                        <motion.div
                            key={pendingDelete}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-3.5 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <FiTrash className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {pendingDelete === 'bulk' ? 'Delete selected credentials' : 'Delete credential'}
                                        </h3>
                                        <p className="text-xs text-red-100 mt-1">This action cannot be undone</p>
                                    </div>
                                </div>
                            </div>

                            <div
                                className="px-5 py-4 overflow-y-auto flex-1 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <div className="flex items-center justify-center mb-5">
                                    <div className="p-4 bg-red-100 rounded-full">
                                        <FiTrash className="w-8 h-8 text-red-600" />
                                    </div>
                                </div>

                                <p className="text-center text-slate-700 text-sm mb-3">
                                    {pendingDelete === 'bulk' ? (
                                        <>
                                            Only the <span className="font-semibold text-slate-900">{selectedCredentialIds.length}</span>{' '}
                                            selected credential{selectedCredentialIds.length !== 1 ? 's' : ''} will be deleted. Other credentials in this group are not affected.
                                        </>
                                    ) : (
                                        <>
                                            Only this credential will be deleted. Other credentials in this group are not affected.
                                        </>
                                    )}
                                </p>

                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                                    <p className="font-medium text-amber-900 mb-1">Please confirm</p>
                                    <p className="text-amber-900/90 leading-snug">
                                        This permanently removes the selected credential data from the server. You cannot recover it afterwards.
                                    </p>
                                </div>

                                {pendingDelete === 'single' && selectedCredential && (
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-4">
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Firm</p>
                                        <p className="text-sm font-semibold text-slate-800 text-center">
                                            {selectedCredential.firm?.firm_name || 'N/A'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setPendingDelete(null)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:border-slate-300 rounded-xl border border-slate-200 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-xl shadow-lg shadow-red-200 hover:shadow-xl transition-all duration-200"
                                >
                                    {pendingDelete === 'bulk' ? 'Delete selected' : 'Delete credential'}
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

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {activeDropdown && dropdownCoords && activeActionsItem && (
                            <motion.div
                                key={activeDropdown}
                                role="menu"
                                data-password-group-actions-menu
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    position: 'fixed',
                                    ...(dropdownCoords.placement === 'up'
                                        ? {
                                              bottom: dropdownCoords.bottom,
                                              left: dropdownCoords.left,
                                          }
                                        : {
                                              top: dropdownCoords.top,
                                              left: dropdownCoords.left,
                                          }),
                                    width: ACTIONS_MENU_WIDTH,
                                    zIndex: 2147483647,
                                }}
                                className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                            >
                                <div className="py-1">
                                    <button
                                        type="button"
                                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                                        onClick={() => {
                                            handleSelectCredential(portalActionsCredId);
                                            closeActionsMenu();
                                        }}
                                    >
                                        {portalActionsRowSelected ? (
                                            <>
                                                <FiXCircle className="w-4 h-4 mr-3 text-red-500" />
                                                Deselect
                                            </>
                                        ) : (
                                            <>
                                                <FiCheckCircle className="w-4 h-4 mr-3 text-emerald-500" />
                                                Select
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCredential(activeActionsItem);
                                            setShowViewModal(true);
                                            closeActionsMenu();
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                                    >
                                        <div className="p-1.5 bg-blue-100 rounded-lg mr-3">
                                            <FiEye className="w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                        <span>View</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleEditClick(activeActionsItem)}
                                        className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 transition-all duration-200"
                                    >
                                        <div className="p-1.5 bg-amber-100 rounded-lg mr-3">
                                            <FiEdit className="w-3.5 h-3.5 text-amber-600" />
                                        </div>
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(
                                                `Username: ${activeActionsItem.credential?.username || ''}\nPassword: ${activeActionsItem.credential?.password || ''}`
                                            );
                                            toast.success('Credential details copied to clipboard');
                                            closeActionsMenu();
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200"
                                    >
                                        <div className="p-1.5 bg-purple-100 rounded-lg mr-3">
                                            <FiCopy className="w-3.5 h-3.5 text-purple-600" />
                                        </div>
                                        <span>Copy</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    );
};

export default PasswordGroupFirms;