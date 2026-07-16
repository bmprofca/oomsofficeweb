import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { checkPermissionSync } from '../utils/permission-helper';
import {
    FiTrash2,
    FiTrash,
    FiX,
    FiEdit,
    FiMoreVertical,
    FiSearch,
    FiPlus,
    FiCopy,
    FiEye,
    FiEyeOff,
    FiCheckCircle,
    FiXCircle,
    FiPhone,
    FiMail,
    FiUser as UserFieldIcon,
    FiLock as LockFieldIcon,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import { clientPasswordService } from '../services/clientPasswordService';
import { passwordGroupService } from '../services/passwordGroupService';
import useDebouncedValue from '../hooks/useDebouncedValue';
import TablePagination from '../components/TablePagination';
import { ViewportTooltip } from '../components/ViewportTooltip';
import CustomSelect from '../components/CustomSelect';
import { optionByValue } from '../utils/customSelectHelpers';

const formatTypeLabel = (value) => {
    if (!value) return 'N/A';
    return String(value)
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

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

    return {
        placement: 'up',
        left,
        bottom: window.innerHeight - rect.top + MENU_EDGE_GAP,
    };
};

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
                                <h3 className="text-sm font-semibold text-white">Credential Details</h3>
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
                                        <span
                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                isCredentialActiveStatus(credential.credential?.status)
                                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}
                                        >
                                            {credentialStatusLabel(credential.credential?.status)}
                                        </span>
                        </div>
                    </div>
                </div>
                        </div>
                    </div>

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

                    <div>
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Additional Information</h4>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500">Created Date</p>
                                    <p className="text-sm font-medium text-slate-800 mt-1">
                                        {credential.credential?.create_date
                                            ? new Date(credential.credential.create_date).toLocaleString()
                                            : 'N/A'}
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
                                                {credential.credential?.modified_by?.name ||
                                                    credential.credential?.modified_by ||
                                                    'N/A'}
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

const normalizePasswordGroupList = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.groups)) return raw.groups;
    if (raw && Array.isArray(raw.items)) return raw.items;
    return [];
};

const PasswordTab = ({ clientUsername }) => {
    const [credentials, setCredentials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebouncedValue(searchTerm, 300);

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: false,
    });

    const [showPassword, setShowPassword] = useState({});
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [dropdownCoords, setDropdownCoords] = useState(null);
    const dropdownAnchorRef = useRef(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewModalCredential, setViewModalCredential] = useState(null);

    const [selectedCredentialIds, setSelectedCredentialIds] = useState([]);
    /** null | 'single' | 'bulk' */
    const [pendingDelete, setPendingDelete] = useState(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    const [clientFirms, setClientFirms] = useState([]);
    const [groups, setGroups] = useState([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [groupSearchTerm, setGroupSearchTerm] = useState('');
    const [firmSearchTerm, setFirmSearchTerm] = useState('');
    const [groupSelectOpen, setGroupSelectOpen] = useState(false);
    const [firmSelectOpen, setFirmSelectOpen] = useState(false);
    const groupSelectRef = useRef(null);
    const firmSelectRef = useRef(null);
    const groupSearchInputRef = useRef(null);
    const firmSearchInputRef = useRef(null);

    const [addForm, setAddForm] = useState({
        group_id: '',
        firm_id: '',
        username: '',
        password: '',
        description: '',
    });

    const [editForm, setEditForm] = useState({
        credential_id: '',
        username: '',
        password: '',
        description: '',
        status: 'active',
    });

    const fetchCredentials = useCallback(async (page, limit, search) => {
        if (!clientUsername) {
            setCredentials([]);
            return;
        }
        const headers = getHeaders();
        if (!headers) {
            toast.error('Please sign in again.');
            return;
        }

        setLoading(true);
        try {
            const response = await clientPasswordService.list(clientUsername, {
                search: search || '',
                page: Math.max(1, Number(page) || 1),
                limit: Math.min(100, Math.max(1, Number(limit) || 20)),
            });
            const result = response.data;

            if (result.success) {
                const rows = Array.isArray(result.data) ? result.data : [];
                setCredentials(rows);
                setPagination({
                    page: result.meta?.page ?? page,
                    limit: result.meta?.limit ?? limit,
                    total: result.meta?.total ?? rows.length,
                    total_pages: Math.max(1, Number(result.meta?.total_pages) || 1),
                    is_last_page: Boolean(result.meta?.is_last_page),
                });
            } else {
                toast.error(result.message || 'Failed to load passwords');
                setCredentials([]);
            }
        } catch (e) {
            console.error(e);
            toast.error(e.response?.data?.message || 'Network error while loading passwords.');
            setCredentials([]);
        } finally {
            setLoading(false);
        }
    }, [clientUsername]);

    useEffect(() => {
        if (!clientUsername) return;
        setPagination((p) => ({ ...p, page: 1 }));
    }, [debouncedSearch, clientUsername]);

    useEffect(() => {
        if (!clientUsername) return;
        fetchCredentials(pagination.page, pagination.limit, debouncedSearch);
    }, [clientUsername, debouncedSearch, pagination.page, pagination.limit, fetchCredentials]);

    const credentialIdsOnPage = credentials.map((item) => item?.credential?.credential_id).filter(Boolean);
    const selectAllOnPage =
        credentialIdsOnPage.length > 0 && credentialIdsOnPage.every((id) => selectedCredentialIds.includes(id));

    useEffect(() => {
        const validIds = credentials.map((item) => item?.credential?.credential_id).filter(Boolean);
        setSelectedCredentialIds((prev) => prev.filter((id) => validIds.includes(id)));
    }, [credentials]);

    useEffect(() => {
        if (pendingDelete === 'bulk' && selectedCredentialIds.length === 0) {
            setPendingDelete(null);
        }
    }, [pendingDelete, selectedCredentialIds]);

    const handleSelectCredential = (credentialId) => {
        if (!credentialId) return;
        setSelectedCredentialIds((prev) =>
            prev.includes(credentialId) ? prev.filter((id) => id !== credentialId) : [...prev, credentialId]
        );
    };

    const handleSelectAllCredentials = () => {
        if (!credentialIdsOnPage.length) return;
        const allSelected = credentialIdsOnPage.every((id) => selectedCredentialIds.includes(id));
        if (allSelected) {
            setSelectedCredentialIds((prev) => prev.filter((id) => !credentialIdsOnPage.includes(id)));
        } else {
            setSelectedCredentialIds((prev) => [...new Set([...prev, ...credentialIdsOnPage])]);
        }
    };

    const loadClientFirms = useCallback(async () => {
        if (!clientUsername) return;
        const headers = getHeaders();
        if (!headers) return;
        try {
            const response = await axios.get(
                `${API_BASE_URL}/client/details/firms/list?username=${encodeURIComponent(clientUsername)}`,
                { headers }
            );
            if (response.data?.success) {
                const firmsData = response.data.data?.firms || [];
                setClientFirms(
                    firmsData.map((firm) => ({
                        firm_id: firm.firm_id,
                        firm_name: firm.firm_name,
                        firm_type: firm.firm_type,
                        pan_no: firm.pan_no,
                    }))
                );
            }
        } catch (e) {
            console.error('PasswordTab: firms list', e);
        }
    }, [clientUsername]);

    const loadGroupsForModal = useCallback(async () => {
        if (!getHeaders()) {
            setGroups([]);
            return;
        }
        setGroupsLoading(true);
        try {
            const response = await clientPasswordService.groupList();
            const result = response.data;
            if (result.success) {
                setGroups(normalizePasswordGroupList(result.data));
            } else {
                setGroups([]);
            }
        } catch (e) {
            console.error('PasswordTab: branch password group list', e);
            setGroups([]);
            toast.error(e.response?.data?.message || 'Failed to load password groups');
        } finally {
            setGroupsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!showAddModal) return;
        loadClientFirms();
        loadGroupsForModal();
    }, [showAddModal, loadClientFirms, loadGroupsForModal]);

    useEffect(() => {
        if (!showAddModal) return;
        const onDown = (e) => {
            if (!groupSelectRef.current?.contains(e.target)) {
                setGroupSelectOpen(false);
            }
            if (!firmSelectRef.current?.contains(e.target)) {
                setFirmSelectOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [showAddModal]);

    useEffect(() => {
        if (!groupSelectOpen) return;
        groupSearchInputRef.current?.focus();
    }, [groupSelectOpen]);

    useEffect(() => {
        if (!firmSelectOpen) return;
        firmSearchInputRef.current?.focus();
    }, [firmSelectOpen]);

    const closeActionsMenu = useCallback(() => {
        setActiveDropdown(null);
        setDropdownCoords(null);
        dropdownAnchorRef.current = null;
    }, []);

    const copyUsernameToClipboard = (text) => {
        navigator.clipboard.writeText(text || '');
        toast.success('Username copied to clipboard');
    };

    const copyPasswordToClipboard = (text) => {
        navigator.clipboard.writeText(text || '');
        toast.success('Password copied to clipboard');
    };

    const togglePasswordVisibility = (credentialId) => {
        setShowPassword((prev) => ({ ...prev, [credentialId]: !prev[credentialId] }));
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
                event.target.closest('[data-password-tab-actions-menu]')
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

    const resolvedGroupId = addForm.group_id;

    const openAdd = () => {
        setAddForm({
            group_id: '',
            firm_id: '',
            username: '',
            password: '',
            description: '',
        });
        setGroupSearchTerm('');
        setFirmSearchTerm('');
        setShowAddModal(true);
        closeActionsMenu();
    };

    const handleAddCredential = async (e) => {
        e.preventDefault();
        const gid = String(resolvedGroupId || '').trim();
        if (!gid) {
            toast.error('Please select or enter a password group');
            return;
        }
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

        const loadingToast = toast.loading('Adding credential…');
        try {
            const response = await passwordGroupService.createFirmCredential({
                group_id: gid,
                firm_id: addForm.firm_id,
                username: addForm.username.trim(),
                password: addForm.password,
                description: addForm.description.trim() || undefined,
            });
            const result = response.data;
            toast.dismiss(loadingToast);
            if (result.success) {
                toast.success(result.message || 'Credential added');
                setShowAddModal(false);
                setPagination((p) => ({ ...p, page: 1 }));
                await fetchCredentials(1, pagination.limit, debouncedSearch);
            } else {
                toast.error(result.message || 'Failed to add credential');
            }
        } catch (err) {
            console.error(err);
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.message || 'Network error.');
        }
    };

    const openEdit = (row) => {
        const cred = row?.credential;
        if (!cred?.credential_id) return;
        setSelectedRow(row);
        setEditForm({
            credential_id: cred.credential_id,
            username: cred.username || '',
            password: cred.password === '******' ? '' : cred.password || '',
            description: cred.description || '',
            status: isCredentialActiveStatus(cred.status) ? 'active' : 'inactive',
        });
        setShowEditModal(true);
        closeActionsMenu();
    };

    const handleEditCredential = async (e) => {
        e.preventDefault();
        if (!editForm.username.trim()) {
            toast.error('Please enter a username');
            return;
        }
        if (!editForm.password.trim()) {
            toast.error('Please enter a password (enter a new value if the API masked it)');
            return;
        }
        const loadingToast = toast.loading('Updating credential…');
        try {
            const response = await passwordGroupService.editFirmCredential(editForm.credential_id, {
                username: editForm.username.trim(),
                password: editForm.password,
                description: editForm.description.trim() || null,
                status: editForm.status === 'active',
            });
            const result = response.data;
            toast.dismiss(loadingToast);
            if (result.success) {
                toast.success(result.message || 'Credential updated');
                setShowEditModal(false);
                setSelectedRow(null);
                await fetchCredentials(pagination.page, pagination.limit, debouncedSearch);
            } else {
                toast.error(result.message || 'Failed to update credential');
            }
        } catch (err) {
            console.error(err);
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.message || 'Network error.');
        }
    };

    const openDeleteSingle = (row) => {
        setSelectedRow(row);
        setPendingDelete('single');
        closeActionsMenu();
    };

    const openDeleteBulk = () => {
        if (!selectedCredentialIds.length) {
            toast.error('Select at least one credential');
            return;
        }
        setPendingDelete('bulk');
    };

    const closeDeleteModal = () => {
        setPendingDelete(null);
        setSelectedRow(null);
    };

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        const mode = pendingDelete;
        const ids =
            mode === 'bulk'
                ? [...selectedCredentialIds]
                : selectedRow?.credential?.credential_id
                  ? [selectedRow.credential.credential_id]
                  : [];
        if (!ids.length) {
            toast.error('Nothing to delete');
            return;
        }

        const loadingToast = toast.loading(
            ids.length > 1 ? `Deleting ${ids.length} credentials…` : 'Deleting credential…'
        );
        try {
            const response = await passwordGroupService.deleteFirmCredentials(ids);
            const result = response.data;
            toast.dismiss(loadingToast);
            if (result.success) {
                toast.success(result.message || 'Credential(s) deleted');
                setPendingDelete(null);
                setSelectedRow(null);
                if (mode === 'bulk') setSelectedCredentialIds([]);
                await fetchCredentials(pagination.page, pagination.limit, debouncedSearch);
            } else {
                toast.error(result.message || 'Failed to delete');
            }
        } catch (err) {
            console.error(err);
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.message || 'Network error.');
        }
    };

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
        (pendingDelete === 'single' ? Boolean(selectedRow) : selectedCredentialIds.length > 0);
    const filteredGroups = groups.filter((g) => {
        const q = groupSearchTerm.trim().toLowerCase();
        if (!q) return true;
        return (
            String(g.group_name || '').toLowerCase().includes(q) ||
            String(g.group_id || '').toLowerCase().includes(q)
        );
    });
    const filteredFirms = clientFirms.filter((f) => {
        const q = firmSearchTerm.trim().toLowerCase();
        if (!q) return true;
        return (
            String(f.firm_name || '').toLowerCase().includes(q) ||
            String(f.pan_no || '').toLowerCase().includes(q)
        );
    });
    const selectedGroup = groups.find((g) => g.group_id === addForm.group_id) || null;
    const selectedFirm = clientFirms.find((f) => f.firm_id === addForm.firm_id) || null;
    const addFormInvalid =
        loading ||
        !resolvedGroupId ||
        !addForm.firm_id ||
        !String(addForm.username || '').trim() ||
        !String(addForm.password || '').trim();

    if (!clientUsername) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 text-sm">
                Client profile is not loaded.
                                    </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-slate-50 via-white to-slate-50/30 p-4 sm:p-6"
        >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-5">
                    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                        <div className="flex min-w-0 items-start justify-between gap-2 lg:block lg:max-w-sm">
                            <div className="min-w-0 flex-1">
                                <h2 className="min-w-0 truncate text-base font-bold leading-tight text-slate-800 sm:text-lg">
                                    Password Management
                                </h2>
                                <p className="mt-0.5 min-w-0 truncate text-xs text-slate-500">
                                    Credentials for this client
                                </p>
                            </div>
                                    {checkPermissionSync('client_edit') && selectedCredentialIds.length > 0 && (
                                        <div className="flex shrink-0 items-center gap-2 lg:hidden">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700">
                                                {selectedCredentialIds.length}
                                            </div>
                                            <ViewportTooltip label="Delete selected credentials">
                                                <button
                                                    type="button"
                                                    onClick={openDeleteBulk}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md transition-all duration-200 hover:from-red-700 hover:to-red-800"
                                                >
                                                    <FiTrash className="h-4 w-4" />
                                                </button>
                                            </ViewportTooltip>
                                        </div>
                                    )}
                                </div>

                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3 lg:flex-1 lg:flex-row lg:items-center lg:justify-end">
                            {checkPermissionSync('client_edit') && selectedCredentialIds.length > 0 && (
                                <div className="hidden items-center gap-2 lg:flex">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700">
                                        {selectedCredentialIds.length}
                                    </div>
                                    <span className="hidden text-sm text-slate-600 xl:inline">selected</span>
                                    <ViewportTooltip label="Delete selected credentials">
                                        <button
                                            type="button"
                                            onClick={openDeleteBulk}
                                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md transition-all duration-200 hover:from-red-700 hover:to-red-800"
                                        >
                                            <FiTrash className="h-4 w-4" />
                                        </button>
                                    </ViewportTooltip>
                                </div>
                            )}
                            <div className="flex h-10 min-h-[2.5rem] w-full min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 shadow-sm transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500 sm:min-w-[12rem] lg:max-w-lg lg:flex-1">
                                <FiSearch className="pointer-events-none h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                                <input
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPagination((prev) => ({ ...prev, page: 1 }));
                                    }}
                                    placeholder="Search firms, users, clients…"
                                    className="min-h-0 min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400"
                                    autoComplete="off"
                                />
                            </div>
                            {checkPermissionSync('client_edit') && (
                                <motion.button
                                    type="button"
                                    onClick={openAdd}
                                    className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 text-sm font-medium text-white shadow-md transition-all duration-200 hover:from-indigo-700 hover:to-indigo-800 sm:w-auto"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiPlus className="h-4 w-4 shrink-0" />
                                    Add password
                                </motion.button>
                            )}
                        </div>
                    </div>
                                </div>

                <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                    <table className="w-full min-w-[36rem] sm:min-w-0">
                        <thead className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                            <tr>
                                <th className="min-w-[5.5rem] px-2 py-2 text-left align-middle sm:min-w-[7.5rem] sm:px-4 sm:py-4">
                                    <div className="flex items-center gap-1.5 sm:gap-2.5">
                                        <span className="text-[10px] font-semibold uppercase leading-none tracking-wider text-slate-600 sm:text-xs">
                                            #
                                            </span>
                                        {!loading && credentials.length > 0 && (
                                            <ViewportTooltip
                                                label={
                                                    selectAllOnPage
                                                        ? 'Deselect all credentials on this page'
                                                        : 'Select all credentials on this page'
                                                }
                                            >
                                                <button
                                                    type="button"
                                                    onClick={handleSelectAllCredentials}
                                                    className="inline-flex items-center justify-center rounded-md p-0.5 text-slate-600 hover:bg-slate-100/90 hover:text-slate-900"
                                                    aria-label={
                                                        selectAllOnPage
                                                            ? 'Deselect all on this page'
                                                            : 'Select all on this page'
                                                    }
                                                >
                                                    <div
                                                        className={`relative h-4 w-8 rounded-full transition-colors duration-300 ${
                                                            selectAllOnPage ? 'bg-indigo-600' : 'bg-gray-300'
                                                        }`}
                                                    >
                                                        <motion.div
                                                            className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow ${
                                                                selectAllOnPage ? 'left-4' : 'left-0.5'
                                                            }`}
                                                            layout
                                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                        />
                                                        {selectAllOnPage && (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <FiCheckCircle className="absolute left-1 h-1.5 w-1.5 text-white" />
                                        </div>
                                                        )}
                                                    </div>
                                                </button>
                                            </ViewportTooltip>
                                        )}
                                    </div>
                                </th>
                                <th className="px-2 py-2 text-left align-middle text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:px-4 sm:py-4 sm:text-xs">
                                    <span className="sm:hidden">Firm</span>
                                    <span className="hidden sm:inline">Firm Details</span>
                                </th>
                                <th className="px-2 py-2 text-left align-middle text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:px-4 sm:py-4 sm:text-xs">
                                    <span className="sm:hidden">Client</span>
                                    <span className="hidden sm:inline">Client Details</span>
                                </th>
                                <th className="px-2 py-2 text-left align-middle text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:px-4 sm:py-4 sm:text-xs">
                                    <span className="sm:hidden">Login</span>
                                    <span className="hidden sm:inline">Credentials</span>
                                </th>
                                <th className="px-2 py-2 text-left align-middle text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:px-4 sm:py-4 sm:text-xs">
                                    Status
                                </th>
                                <th className="px-2 py-2 text-right align-middle text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:px-4 sm:py-4 sm:text-xs">
                                    <span className="sm:hidden">Menu</span>
                                    <span className="hidden sm:inline">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <tr key={index} className="animate-pulse">
                                        {Array.from({ length: 6 }).map((_, cellIndex) => (
                                            <td key={cellIndex} className="px-2 py-3 sm:px-4 sm:py-4">
                                                <div className="h-4 w-full rounded bg-slate-200" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : credentials.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-10 text-center sm:px-4 sm:py-12">
                                        <div className="flex flex-col items-center">
                                            <div className="mb-4 rounded-full bg-slate-100 p-4">
                                                <FiEyeOff className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <p className="mb-2 text-sm text-slate-600">No credentials found</p>
                                            <p className="mb-6 text-sm text-slate-400">
                                                {searchTerm
                                                    ? `No results for "${searchTerm}"`
                                                    : 'Get started by adding a password for this client'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={openAdd}
                                                className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm text-slate-700 font-medium text-white transition-colors duration-200 hover:bg-indigo-700"
                                            >
                                                <FiPlus className="mr-2 h-4 w-4" />
                                                Add password
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                credentials.map((item, index) => {
                                    const credId = item.credential?.credential_id;
                                    const isRowSelected = Boolean(credId && selectedCredentialIds.includes(credId));
                                    const pwdVisible = !!showPassword[credId];
                                    return (
                                        <motion.tr
                                            key={credId || index}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`group transition-all duration-300 ${
                                                isRowSelected
                                                    ? 'bg-indigo-50/50'
                                                    : 'hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-blue-50/50'
                                            }`}
                                        >
                                            <td className="whitespace-nowrap px-2 py-3 sm:px-4 sm:py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-medium text-slate-700">
                                                        {(pagination.page - 1) * pagination.limit + index + 1}
                                                    </div>
                                                    <ViewportTooltip
                                                        label={isRowSelected ? 'Deselect this credential' : 'Select this credential'}
                                                    >
                                            <motion.button
                                                            type="button"
                                                            onClick={() => handleSelectCredential(credId)}
                                                            className={`relative h-3.5 w-7 shrink-0 rounded-full transition-colors duration-300 ${
                                                                isRowSelected ? 'bg-indigo-600' : 'bg-gray-300'
                                                            }`}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                        <motion.div
                                                            className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow ${
                                                                isRowSelected ? 'left-3.5' : 'left-0.5'
                                                            }`}
                                                            layout
                                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                        />
                                                            {isRowSelected && (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <FiCheckCircle className="absolute left-1 h-1.5 w-1.5 text-white" />
                                                                </div>
                                                            )}
                                            </motion.button>
                                                    </ViewportTooltip>
                                        </div>
                                            </td>
                                            <td className="px-2 py-3 sm:px-4 sm:py-4">
                                                <div className="text-sm font-semibold text-slate-800">
                                                    {item.firm?.firm_name || 'N/A'}
                                    </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    Group: {item.group?.group_name || item.group?.group_id || 'N/A'}
                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    PAN: {item.firm?.pan_no || 'N/A'}
                                    </div>
                                                <div className="text-xs text-slate-500">
                                                    Type: {formatTypeLabel(item.firm?.firm_type)}
                                </div>
                                            </td>
                                            <td className="px-2 py-3 sm:px-4 sm:py-4">
                                                {item.client ? (
                                                    <div className="space-y-2">
                                                        <div className="text-sm font-medium text-slate-800">
                                                            {item.client.name || 'N/A'}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                                            <FiPhone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                            <span>{item.client.mobile || 'N/A'}</span>
                                                        </div>
                                                        {item.client.email ? (
                                                            <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                                                                <FiMail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                                <ViewportTooltip label={item.client.email}>
                                                                    <span className="max-w-[150px] cursor-default truncate">
                                                                        {item.client.email}
                                    </span>
                                                                </ViewportTooltip>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">No owner info</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-3 sm:px-4 sm:py-4">
                                                <div className="space-y-2">
                                                    <div
                                                        className="flex min-w-0 items-center gap-2"
                                                        title={item.credential?.username || undefined}
                                                    >
                                                        <span className="sr-only">Username</span>
                                                        <UserFieldIcon
                                                            className="h-4 w-4 shrink-0 text-slate-400"
                                                            aria-hidden
                                                        />
                                                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                                            {item.credential?.username || 'N/A'}
                                                        </span>
                                                        <ViewportTooltip label="Copy username to clipboard">
                                                            <button
                                                                type="button"
                                                                onClick={() => copyUsernameToClipboard(item.credential?.username)}
                                                                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                                                                aria-label="Copy username"
                                                            >
                                                                <FiCopy className="h-3.5 w-3.5" />
                                                            </button>
                                                        </ViewportTooltip>
                                                    </div>
                                                    <div
                                                        className="flex min-w-0 items-center gap-2"
                                                        title={
                                                            pwdVisible ? item.credential?.password || undefined : undefined
                                                        }
                                                    >
                                                        <span className="sr-only">Password</span>
                                                        <LockFieldIcon
                                                            className="h-4 w-4 shrink-0 text-slate-400"
                                                            aria-hidden
                                                        />
                                                        <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-700">
                                                            {pwdVisible ? item.credential?.password : '••••••••'}
                                                        </span>
                                                        <ViewportTooltip
                                                            label={pwdVisible ? 'Hide password' : 'Show password'}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => togglePasswordVisibility(credId)}
                                                                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                                                                aria-label={pwdVisible ? 'Hide password' : 'Show password'}
                                                            >
                                                                {pwdVisible ? (
                                                                    <FiEyeOff className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <FiEye className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>
                                                        </ViewportTooltip>
                                                        <ViewportTooltip label="Copy password to clipboard">
                                                            <button
                                                                type="button"
                                                                onClick={() => copyPasswordToClipboard(item.credential?.password)}
                                                                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                                                                aria-label="Copy password"
                                                            >
                                                                <FiCopy className="h-3.5 w-3.5" />
                                                            </button>
                                                        </ViewportTooltip>
                                </div>

                                                    {item.credential?.description ? (
                                                        <div className="pt-1 text-xs text-slate-500">
                                                            <span className="font-medium text-slate-500">Note: </span>
                                                            {item.credential.description}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 sm:px-4 sm:py-4">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${
                                                        isCredentialActiveStatus(item.credential?.status)
                                                            ? 'border-green-200 bg-green-100 text-green-700'
                                                            : 'border-slate-200 bg-slate-100 text-slate-600'
                                                    }`}
                                                >
                                                    {credentialStatusLabel(item.credential?.status)}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-3 text-right sm:px-4 sm:py-4">
                                                <div className="dropdown-container relative">
                                                    <button
                                                        type="button"
                                                        className="rounded-lg p-2 text-slate-400 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600"
                                                        title="More actions"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleDropdown(credId, e.currentTarget);
                                                        }}
                                                    >
                                                        <FiMoreVertical className="h-5 w-5" />
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

                {!loading && pagination.total > 0 && (
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
                        onPageChange={(nextPage) => setPagination((prev) => ({ ...prev, page: nextPage }))}
                        onLimitChange={(nextLimit) => {
                            const safe = Math.min(100, Math.max(1, Number(nextLimit) || 20));
                            setPagination((prev) => ({ ...prev, page: 1, limit: safe }));
                        }}
                    />
                )}
            </div>

            {showAddModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowAddModal(false)}
                >
                                        <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3.5 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-slate-800">Add password</h2>
                            </div>
                            <button type="button" onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-white/10">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddCredential} className="flex flex-col flex-1 overflow-hidden">
                            <div
                                className="px-5 py-4 overflow-y-auto flex-1 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Password group *</label>
                                <div ref={groupSelectRef} className="relative">
                                            <button
                                        type="button"
                                                onClick={() => {
                                            setGroupSelectOpen((prev) => !prev);
                                            setFirmSelectOpen(false);
                                        }}
                                        className="w-full h-[42px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-left bg-white flex items-center justify-between"
                                    >
                                        <span className={selectedGroup ? 'text-slate-800' : 'text-slate-400'}>
                                            {selectedGroup
                                                ? selectedGroup.group_name || selectedGroup.group_id
                                                : 'Select group'}
                                        </span>
                                        <span className="text-slate-400">▾</span>
                                            </button>
                                    {groupSelectOpen && (
                                        <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl p-2">
                                            <input
                                                ref={groupSearchInputRef}
                                                type="search"
                                                value={groupSearchTerm}
                                                onChange={(e) => setGroupSearchTerm(e.target.value)}
                                                placeholder="Search group by name"
                                                className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                            />
                                            <div className="max-h-44 overflow-y-auto">
                                                {groupsLoading ? (
                                                    <p className="px-2 py-2 text-xs text-slate-500">Loading groups…</p>
                                                ) : filteredGroups.length > 0 ? (
                                                    filteredGroups.map((g) => (
                                            <button
                                                            key={g.group_id}
                                                            type="button"
                                                            onClick={() => {
                                                                setAddForm({ ...addForm, group_id: g.group_id });
                                                                setGroupSelectOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                addForm.group_id === g.group_id
                                                                    ? 'bg-indigo-50 text-indigo-700'
                                                                    : 'text-slate-700 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <span className="font-medium">{g.group_name || g.group_id}</span>
                                            </button>
                                                    ))
                                                ) : (
                                                    <p className="px-2 py-2 text-xs text-amber-700">No groups found.</p>
                                    )}
                                </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Firm *</label>
                                <div ref={firmSelectRef} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFirmSelectOpen((prev) => !prev);
                                            setGroupSelectOpen(false);
                                        }}
                                        className="w-full h-[42px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-left bg-white flex items-center justify-between"
                                    >
                                        <span className={selectedFirm ? 'text-slate-800' : 'text-slate-400'}>
                                            {selectedFirm
                                                ? `${selectedFirm.firm_name || selectedFirm.firm_id} - ${selectedFirm.pan_no || 'N/A'}`
                                                : 'Select firm'}
                                        </span>
                                        <span className="text-slate-400">▾</span>
                                    </button>
                                    {firmSelectOpen && (
                                        <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl p-2">
                                            <input
                                                ref={firmSearchInputRef}
                                                type="search"
                                                value={firmSearchTerm}
                                                onChange={(e) => setFirmSearchTerm(e.target.value)}
                                                placeholder="Search firm by name or PAN"
                                                className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                            />
                                            <div className="max-h-44 overflow-y-auto">
                                                {filteredFirms.length > 0 ? (
                                                    filteredFirms.map((f) => (
                                                        <button
                                                            key={f.firm_id}
                                                            type="button"
                                                            onClick={() => {
                                                                setAddForm({ ...addForm, firm_id: f.firm_id });
                                                                setFirmSelectOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                addForm.firm_id === f.firm_id
                                                                    ? 'bg-indigo-50 text-indigo-700'
                                                                    : 'text-slate-700 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <span className="font-medium">
                                                                {(f.firm_name || f.firm_id) + ' - ' + (f.pan_no || 'N/A')}
                                                            </span>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <p className="px-2 py-2 text-xs text-amber-700">No firms found.</p>
                    )}
                </div>
            </div>
                                    )}
                                </div>
                                {clientFirms.length === 0 && (
                                    <p className="text-xs text-amber-700 mt-2">Add firms on the Firms tab first.</p>
                                )}
                    </div>
                    <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Username *</label>
                                <input
                                    value={addForm.username}
                                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                                    autoComplete="off"
                                    placeholder="Enter username"
                                    required
                                />
                    </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Password *</label>
                                <input
                                    value={addForm.password}
                                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                                    autoComplete="new-password"
                                    placeholder="Enter password"
                                    required
                                />
                </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                                <textarea
                                    value={addForm.description}
                                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-y"
                                    placeholder="Enter description (optional)"
                                />
            </div>
                            </div>
                            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-slate-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addFormInvalid}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showEditModal && selectedRow && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowEditModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3.5 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-slate-800">Edit password</h2>
                                <p className="text-xs text-blue-100 mt-0.5">{selectedRow.firm?.firm_name || 'Credential'}</p>
                                </div>
                            <button type="button" onClick={() => setShowEditModal(false)} className="p-2 rounded-lg hover:bg-white/10">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditCredential} className="flex flex-col flex-1 overflow-hidden">
                            <div
                                className="px-5 py-4 overflow-y-auto flex-1 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Group</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={selectedRow.group?.group_name || selectedRow.group?.group_id || ''}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-slate-600"
                                />
                                </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Username *</label>
                                <input
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Password *</label>
                                <input
                                    value={editForm.password}
                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                                    placeholder="Required; re-enter if the list showed a masked value"
                                    required
                                />
                        </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-y"
                                />
                                </div>
                                <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                                <CustomSelect
                                    options={[
                                        { value: 'active', label: 'Active' },
                                        { value: 'inactive', label: 'Inactive' },
                                    ]}
                                    value={optionByValue(
                                        [
                                            { value: 'active', label: 'Active' },
                                            { value: 'inactive', label: 'Inactive' },
                                        ],
                                        editForm.status,
                                    )}
                                    onChange={(opt) => setEditForm({ ...editForm, status: opt?.value || 'active' })}
                                    isClearable={false}
                                    searchPlaceholder="Search status..."
                                />
                                </div>
                            </div>
                            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-slate-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                                    Update
                                </button>
                        </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {deleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeDeleteModal}>
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-4 flex items-center gap-3">
                            <FiTrash2 className="w-6 h-6" />
                            <div>
                                <h2 className="text-base font-bold text-slate-800">
                                    {pendingDelete === 'bulk' ? 'Delete selected credentials' : 'Delete password'}
                                </h2>
                                <p className="text-xs text-red-100">This cannot be undone</p>
                            </div>
                        </div>
                        <div className="p-6 text-sm text-slate-600">
                            {pendingDelete === 'bulk' ? (
                                <p>
                                    Only the{' '}
                                    <span className="font-semibold text-slate-800">{selectedCredentialIds.length}</span> selected
                                    credential{selectedCredentialIds.length !== 1 ? 's' : ''} will be deleted.
                                </p>
                            ) : (
                                <p>
                                    Remove credential for{' '}
                                    <span className="font-semibold text-slate-800">
                                        {selectedRow?.firm?.firm_name || 'firm'} — {selectedRow?.credential?.username}
                                    </span>
                                    ?
                                </p>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                            >
                                {pendingDelete === 'bulk' ? 'Delete selected' : 'Delete'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <AnimatePresence>
                {showViewModal && viewModalCredential && (
                    <ViewCredentialModal
                        credential={viewModalCredential}
                        onClose={() => {
                            setShowViewModal(false);
                            setViewModalCredential(null);
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
                                data-password-tab-actions-menu
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
                                        className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-colors duration-150"
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
                                            setViewModalCredential(activeActionsItem);
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
                                    {checkPermissionSync('client_edit') && (
                                        <button
                                            type="button"
                                            onClick={() => openEdit(activeActionsItem)}
                                            className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 transition-all duration-200"
                                        >
                                            <div className="p-1.5 bg-amber-100 rounded-lg mr-3">
                                                <FiEdit className="w-3.5 h-3.5 text-amber-600" />
                                            </div>
                                            <span>Edit</span>
                                        </button>
                                    )}
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
                                    {checkPermissionSync('client_edit') && (
                                        <button
                                            type="button"
                                            onClick={() => openDeleteSingle(activeActionsItem)}
                                            className="flex items-center w-full px-4 py-3 text-sm text-slate-700 text-red-600 hover:bg-red-50 transition-all duration-200"
                                        >
                                            <div className="p-1.5 bg-red-100 rounded-lg mr-3">
                                                <FiTrash2 className="w-3.5 h-3.5 text-red-600" />
                                            </div>
                                            <span>Delete</span>
                                        </button>
                                    )}
                                </div>
                </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
            )}
        </motion.div>
    );
};

export default PasswordTab;
