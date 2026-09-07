import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    FiPlus, FiEdit, FiTrash, FiArrowLeft, FiMoreVertical, FiSearch,
    FiEye, FiEyeOff, FiX, FiPhone, FiMail, FiCopy,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import TablePagination from '../../components/TablePagination';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import AnimatedCheckbox from '../../components/AnimatedCheckbox';
import PasswordGroupAddCredentialsModal from '../../components/Modals/PasswordGroupAddCredentialsModal';
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
    status === 1 ||
    status === '1' ||
    status === 'true' ||
    String(status || '').toLowerCase() === 'active';

const credentialStatusLabel = (status) =>
    isCredentialActiveStatus(status) ? 'Active' : 'Inactive';

const ACTIONS_MENU_WIDTH = 176;
const MENU_ITEM_HEIGHT = 36;
const MENU_EDGE_GAP = 8;
const MENU_VIEWPORT_MARGIN = 8;
const ACTION_MENU_ITEM_COUNT = 4;
const MODAL_BODY =
    'px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

const computeActionMenuPosition = (anchorEl, options = {}) => {
    if (!anchorEl) return null;

    const itemCount = Math.max(1, Number(options.itemCount) || ACTION_MENU_ITEM_COUNT);
    const rect = anchorEl.getBoundingClientRect();
    const menuWidth = ACTIONS_MENU_WIDTH;
    const menuHeight = 8 + itemCount * MENU_ITEM_HEIGHT;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const space = {
        top: rect.top - MENU_VIEWPORT_MARGIN,
        bottom: vh - rect.bottom - MENU_VIEWPORT_MARGIN,
        right: vw - rect.right - MENU_VIEWPORT_MARGIN,
        left: rect.left - MENU_VIEWPORT_MARGIN,
    };

    const fits = {
        top: space.top >= menuHeight + MENU_EDGE_GAP,
        bottom: space.bottom >= menuHeight + MENU_EDGE_GAP,
        right: space.right >= menuWidth + MENU_EDGE_GAP,
        left: space.left >= menuWidth + MENU_EDGE_GAP,
    };

    const preferred = ['top', 'bottom', 'right', 'left'];
    let placement = preferred.find((side) => fits[side]);

    if (!placement) {
        placement = preferred.reduce(
            (best, side) => (space[side] > space[best] ? side : best),
            'bottom',
        );
    }

    let top = 0;
    let left = 0;

    if (placement === 'top') {
        top = rect.top - menuHeight - MENU_EDGE_GAP;
        left = rect.left + rect.width / 2 - menuWidth / 2;
    } else if (placement === 'bottom') {
        top = rect.bottom + MENU_EDGE_GAP;
        left = rect.left + rect.width / 2 - menuWidth / 2;
    } else if (placement === 'right') {
        top = rect.top + rect.height / 2 - menuHeight / 2;
        left = rect.right + MENU_EDGE_GAP;
    } else {
        top = rect.top + rect.height / 2 - menuHeight / 2;
        left = rect.left - menuWidth - MENU_EDGE_GAP;
    }

    const clampedLeft = Math.max(
        MENU_VIEWPORT_MARGIN,
        Math.min(left, vw - menuWidth - MENU_VIEWPORT_MARGIN),
    );
    const clampedTop = Math.max(
        MENU_VIEWPORT_MARGIN,
        Math.min(top, vh - menuHeight - MENU_VIEWPORT_MARGIN),
    );
    const anchorCenterX = rect.left + rect.width / 2;
    const anchorCenterY = rect.top + rect.height / 2;

    return {
        top: clampedTop,
        left: clampedLeft,
        placement,
        arrowX: Math.max(12, Math.min(menuWidth - 12, anchorCenterX - clampedLeft)),
        arrowY: Math.max(12, Math.min(menuHeight - 12, anchorCenterY - clampedTop)),
    };
};

// View Credential Modal
const ViewCredentialModal = ({ credential, onClose }) => {
    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    if (!credential || typeof document === 'undefined') return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
            <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                aria-label="Close"
                onClick={onClose}
            />
            <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-indigo-50">
                            <FiEye className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-gray-800 m-0">Credential details</h3>
                            <p className="text-xs text-gray-500 m-0 truncate">{credential.firm?.firm_name || '—'}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>

                <div className={MODAL_BODY} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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

                <div className="shrink-0 flex items-center justify-end px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-white"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>,
        document.body,
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
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [dropdownCoords, setDropdownCoords] = useState(null);
    const dropdownAnchorRef = useRef(null);
    const [showPassword, setShowPassword] = useState({});
    const [selectedCredentialIds, setSelectedCredentialIds] = useState(() => new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: false
    });
    const [editForm, setEditForm] = useState({
        credential_id: '',
        username: '',
        password: '',
        description: '',
        status: true
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
                status: isCredentialActiveStatus(editForm.status) ? '1' : '0',
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
                    status: true
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
        const deleteAllMatching = mode === 'bulk' && selectAllAcrossPages;
        if (!deleteAllMatching && !ids.length) {
            toast.error('No credentials selected to delete');
            return;
        }

        const loadingToast = toast.loading(
            deleteAllMatching
                ? `Deleting ${pagination.total} credentials...`
                : ids.length > 1
                  ? `Deleting ${ids.length} credentials...`
                  : 'Deleting credential...'
        );
        try {
            const response = deleteAllMatching
                ? await passwordGroupService.deleteFirmCredentials([], {
                    selectAll: true,
                    groupId: group_id,
                    search: debouncedSearch,
                })
                : await passwordGroupService.deleteFirmCredentials(ids);
            const result = response.data;
            toast.dismiss(loadingToast);
            if (result.success) {
                toast.success(result.message || 'Credential deleted successfully');
                fetchGroupFirms();
                setPendingDelete(null);
                setSelectedCredentialIds(new Set());
                setSelectAll(false);
                setSelectAllAcrossPages(false);
                if (mode !== 'bulk') {
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
            status: isCredentialActiveStatus(credential.credential.status),
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
            setDropdownCoords(computeActionMenuPosition(buttonElement, { itemCount: ACTION_MENU_ITEM_COUNT }));
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
        const pageIds = credentials
            .map((item) => item?.credential?.credential_id)
            .filter(Boolean);
        const next = selectAllAcrossPages ? new Set(pageIds) : new Set(selectedCredentialIds);
        if (selectAllAcrossPages) setSelectAllAcrossPages(false);
        if (next.has(credentialId)) {
            next.delete(credentialId);
        } else {
            next.add(credentialId);
        }
        setSelectedCredentialIds(next);
        setSelectAll(pageIds.length > 0 && pageIds.every((id) => next.has(id)));
    };

    const handleSelectAllCredentials = () => {
        const pageIds = credentials
            .map((item) => item?.credential?.credential_id)
            .filter(Boolean);
        if (!pageIds.length) return;
        if (selectAll) {
            setSelectedCredentialIds(new Set());
        } else {
            setSelectedCredentialIds(new Set(pageIds));
        }
        setSelectAllAcrossPages(false);
        setSelectAll(!selectAll);
    };

    useEffect(() => {
        if (selectAllAcrossPages) {
            setSelectAll(true);
            return;
        }
        const pageIds = credentials
            .map((item) => item?.credential?.credential_id)
            .filter(Boolean);
        setSelectAll(pageIds.length > 0 && pageIds.every((id) => selectedCredentialIds.has(id)));
    }, [credentials, selectedCredentialIds, selectAllAcrossPages]);

    useEffect(() => {
        setSelectedCredentialIds(new Set());
        setSelectAll(false);
        setSelectAllAcrossPages(false);
    }, [debouncedSearch, group_id]);

    useEffect(() => {
        if (pendingDelete === 'bulk' && !selectAllAcrossPages && selectedCredentialIds.size === 0) {
            setPendingDelete(null);
        }
    }, [pendingDelete, selectedCredentialIds, selectAllAcrossPages]);

    useEffect(() => {
        if (!activeDropdown || !dropdownAnchorRef.current) return undefined;
        const el = dropdownAnchorRef.current;
        const update = () => setDropdownCoords(computeActionMenuPosition(el, { itemCount: ACTION_MENU_ITEM_COUNT }));
        const handleEscape = (e) => {
            if (e.key === 'Escape') closeActionsMenu();
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        document.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [activeDropdown, closeActionsMenu]);

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

    const credentialIdsOnPage = credentials
        .map((item) => item?.credential?.credential_id)
        .filter(Boolean);
    const effectiveSelectedIds = selectAllAcrossPages
        ? new Set(credentialIdsOnPage)
        : selectedCredentialIds;
    const selectedCount = selectAllAcrossPages ? pagination.total : selectedCredentialIds.size;
    const pageSelectedCount = credentialIdsOnPage.filter((id) => selectedCredentialIds.has(id)).length;
    const headerIndeterminate =
        !selectAllAcrossPages &&
        pageSelectedCount > 0 &&
        pageSelectedCount < credentialIdsOnPage.length;

    const activeActionsItem =
        activeDropdown == null
            ? null
            : credentials.find((c) => c.credential?.credential_id === activeDropdown) ?? null;

    const deleteConfirmOpen =
        Boolean(pendingDelete) &&
        (pendingDelete === 'single'
            ? Boolean(selectedCredential)
            : selectedCount > 0);

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
                            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-5 overflow-x-hidden">
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 overflow-x-hidden sm:flex-nowrap sm:gap-4">
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
                                        {selectedCount > 0 && (
                                            <div className="flex h-10 shrink-0 items-center gap-2 text-sm text-gray-600">
                                                <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-indigo-100 px-1.5 text-xs font-bold text-indigo-700">
                                                    {selectedCount}
                                                </div>
                                                <span className="hidden sm:inline">selected</span>
                                            </div>
                                        )}
                                        {selectedCount > 0 && (
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
                                        <button
                                            type="button"
                                            onClick={() => setShowAddModal(true)}
                                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700"
                                        >
                                            <FiPlus className="h-4 w-4 shrink-0" />
                                            Add Credentials
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {selectAll && pagination.total > credentials.length && (
                                <div className="border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs text-indigo-800">
                                    {selectAllAcrossPages ? (
                                        <>
                                            All {pagination.total.toLocaleString()} credentials are selected.{' '}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCredentialIds(new Set());
                                                    setSelectAll(false);
                                                    setSelectAllAcrossPages(false);
                                                }}
                                                className="font-semibold underline hover:text-indigo-950"
                                            >
                                                Clear selection
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            All {credentials.length.toLocaleString()} credentials on this page are selected.{' '}
                                            <button
                                                type="button"
                                                onClick={() => setSelectAllAcrossPages(true)}
                                                className="font-semibold underline hover:text-indigo-950"
                                            >
                                                Select all {pagination.total.toLocaleString()} credentials
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                                        <tr>
                                            <th className="w-12 p-3 flex-shrink-0">
                                                <div className="flex justify-center">
                                                    {!loading && credentials.length > 0 && (
                                                        <AnimatedCheckbox
                                                            checked={selectAll}
                                                            indeterminate={headerIndeterminate}
                                                            onChange={handleSelectAllCredentials}
                                                            ariaLabel="Select all"
                                                        />
                                                    )}
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-left align-middle">
                                                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider leading-none">
                                                    #
                                                </span>
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
                                                    {Array.from({ length: 7 }).map((_, cellIndex) => (
                                                        <td key={cellIndex} className="px-4 py-4">
                                                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : credentials.length === 0 ? (
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
                                            credentials.map((item, index) => {
                                                const credId = item.credential?.credential_id;
                                                const isRowSelected = Boolean(credId && effectiveSelectedIds.has(credId));
                                                return (
                                                    <motion.tr
                                                        key={credId || index}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className="group border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors"
                                                    >
                                                        <td className="w-12 p-3 flex-shrink-0">
                                                            <div className="flex justify-center">
                                                                <AnimatedCheckbox
                                                                    checked={isRowSelected}
                                                                    onChange={() => handleSelectCredential(credId)}
                                                                    ariaLabel={`Select ${item.firm?.firm_name || 'credential'}`}
                                                                    disabled={!credId}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs font-medium text-gray-700">
                                                                {((pagination.page - 1) * pagination.limit) + index + 1}
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
                                                                    type="button"
                                                                    aria-label="Actions"
                                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors duration-150 border border-slate-200 hover:border-indigo-300"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleDropdown(item.credential?.credential_id, e.currentTarget);
                                                                    }}
                                                                >
                                                                    <FiMoreVertical className="w-4 h-4" />
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

            <PasswordGroupAddCredentialsModal
                open={showAddModal}
                groupId={group_id}
                saving={loading}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => fetchGroupFirms()}
            />

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {showEditModal && selectedCredential ? (
                            <motion.div
                                key="pwg-edit-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
                            >
                                <button
                                    type="button"
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                                    aria-label="Close"
                                    onClick={() => setShowEditModal(false)}
                                />
                                <motion.div
                                    role="dialog"
                                    aria-modal="true"
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                    className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                                    onClick={(e) => e.stopPropagation()}
                                >
                            <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-200">
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-gray-800 m-0">Edit credentials</h3>
                                    <p className="text-xs text-gray-500 m-0 truncate">{selectedCredential.firm?.firm_name || '—'}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleEditCredential} className="flex flex-col flex-1 min-h-0">
                                <div className={`${MODAL_BODY} space-y-4`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                                        <div className="flex items-center gap-2.5">
                                            <AnimatedCheckbox
                                                checked={isCredentialActiveStatus(editForm.status)}
                                                onChange={() =>
                                                    setEditForm((prev) => ({
                                                        ...prev,
                                                        status: !isCredentialActiveStatus(prev.status),
                                                    }))
                                                }
                                                ariaLabel="Active status"
                                            />
                                            <span className="text-sm font-medium text-slate-700">
                                                {isCredentialActiveStatus(editForm.status) ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                        disabled={loading}
                                    >
                                        {loading ? 'Updating…' : 'Update'}
                                    </button>
                                </div>
                            </form>
                                </motion.div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>,
                    document.body,
                )}

            <ConfirmActionModal
                isOpen={deleteConfirmOpen}
                title={pendingDelete === 'bulk' ? 'Delete selected credentials' : 'Delete credential'}
                heading={
                    pendingDelete === 'bulk'
                        ? `Delete ${selectedCount} selected credential${selectedCount === 1 ? '' : 's'}?`
                        : `Delete credentials for ${selectedCredential?.firm?.firm_name || 'this firm'}?`
                }
                message="This permanently removes the selected credential data. You cannot recover it afterwards."
                confirmLabel={pendingDelete === 'bulk' ? 'Delete selected' : 'Delete'}
                cancelLabel="Cancel"
                loading={loading}
                tone="danger"
                onCancel={() => setPendingDelete(null)}
                onConfirm={handleConfirmDelete}
            />


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
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.15 }}
                                className="fixed w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[99999] overflow-hidden"
                                style={{
                                    top: dropdownCoords.top,
                                    left: dropdownCoords.left,
                                    height: 'auto',
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span
                                    className="absolute w-2.5 h-2.5 bg-white border-slate-200 rotate-45"
                                    style={{
                                        left:
                                            dropdownCoords.placement === 'left' ||
                                            dropdownCoords.placement === 'right'
                                                ? undefined
                                                : `${dropdownCoords.arrowX - 5}px`,
                                        top:
                                            dropdownCoords.placement === 'bottom'
                                                ? '-5px'
                                                : dropdownCoords.placement === 'top'
                                                  ? undefined
                                                  : `${dropdownCoords.arrowY - 5}px`,
                                        bottom: dropdownCoords.placement === 'top' ? '-5px' : undefined,
                                        right: dropdownCoords.placement === 'left' ? '-5px' : undefined,
                                        borderTopWidth: dropdownCoords.placement === 'bottom' ? '1px' : '0',
                                        borderLeftWidth: dropdownCoords.placement === 'bottom' ? '1px' : '0',
                                        borderBottomWidth: dropdownCoords.placement === 'top' ? '1px' : '0',
                                        borderRightWidth:
                                            dropdownCoords.placement === 'left'
                                                ? '1px'
                                                : dropdownCoords.placement === 'right'
                                                  ? '1px'
                                                  : '0',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCredential(activeActionsItem);
                                        setShowViewModal(true);
                                        closeActionsMenu();
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                                >
                                    <FiEye className="w-4 h-4 text-indigo-600" />
                                    View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleEditClick(activeActionsItem)}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                >
                                    <FiEdit className="w-4 h-4 text-blue-600" />
                                    Edit
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
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-purple-50 flex items-center gap-2 transition-colors"
                                >
                                    <FiCopy className="w-4 h-4 text-purple-600" />
                                    Copy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteClick(activeActionsItem)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                >
                                    <FiTrash className="w-4 h-4" />
                                    Delete
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    );
};

export default PasswordGroupFirms;