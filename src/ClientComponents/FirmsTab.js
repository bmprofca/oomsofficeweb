import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    FiBriefcase, FiEdit, FiTrash2, FiPlus, FiAlertCircle, FiEye, FiLayers, FiLoader, FiSearch, FiMoreVertical,
} from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import { checkPermissionSync } from '../utils/permission-helper';
import MultiSelectInput from '../components/MultiSelectInput';
import FirmGroupsManageModal from '../components/Modals/FirmGroupsManageModal';
import {
    FirmModalShell,
    FirmFormFields,
    FirmViewDetails,
    ModalFooterActions,
} from '../components/Modals/FirmModalParts';

const DEFAULT_FIRM_TYPES = [
    { value: 'individual', label: 'Individual' },
];

const MENU_Z = 99999;
const MENU_GAP = 8;
const MENU_PAD = 8;

const ActionMenu = ({ items = [] }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);
    const menuRef = useRef(null);

    const calcPos = useCallback(() => {
        const btn = btnRef.current;
        const menu = menuRef.current;
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        const mH = menu?.offsetHeight || 160;
        const mW = menu?.offsetWidth || 180;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const candidates = [
            { top: r.top - mH - MENU_GAP, left: r.right - mW },
            { top: r.bottom + MENU_GAP, left: r.right - mW },
            { top: r.top, left: r.right + MENU_GAP },
            { top: r.top, left: r.left - mW - MENU_GAP },
        ];

        const fits = (p) =>
            p.top >= MENU_PAD &&
            p.left >= MENU_PAD &&
            p.top + mH <= vh - MENU_PAD &&
            p.left + mW <= vw - MENU_PAD;

        const chosen = candidates.find(fits) || candidates[1];
        setPos({
            top: Math.min(Math.max(MENU_PAD, chosen.top), vh - MENU_PAD - mH),
            left: Math.min(Math.max(MENU_PAD, chosen.left), vw - MENU_PAD - mW),
        });
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        const raf = requestAnimationFrame(() => calcPos());
        return () => cancelAnimationFrame(raf);
    }, [open, calcPos]);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
                setOpen(false);
            }
        };
        const onClose = () => setOpen(false);
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        window.addEventListener('scroll', onClose, true);
        window.addEventListener('resize', calcPos);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('scroll', onClose, true);
            window.removeEventListener('resize', calcPos);
            window.removeEventListener('keydown', onKey);
        };
    }, [open, calcPos]);

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Actions"
            >
                <FiMoreVertical className="w-4 h-4" />
            </button>

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {open ? (
                            <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.12 }}
                                style={{
                                    position: 'fixed',
                                    top: pos.top,
                                    left: pos.left,
                                    zIndex: MENU_Z,
                                }}
                                className="w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 overflow-hidden"
                            >
                                {items.map((item) => (
                                    <button
                                        key={item.label}
                                        type="button"
                                        disabled={item.disabled}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.disabled) return;
                                            setOpen(false);
                                            item.onClick?.();
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${item.danger
                                            ? 'text-red-600 hover:bg-red-50'
                                            : 'text-slate-700 hover:bg-slate-50'
                                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </button>
                                ))}
                            </motion.div>
                        ) : null}
                    </AnimatePresence>,
                    document.body,
                )}
        </>
    );
};

const emptyFirmForm = () => ({
    name: '',
    type: 'individual',
    pan: '',
    gst: '',
    file_no: '',
    tan: '',
    vat: '',
    cin: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
    group_ids: [],
});

const getApiErrorMessage = (error, fallback = 'Something went wrong') => {
    if (error?.response?.data?.message) return String(error.response.data.message);
    if (error?.response) {
        const { status, data } = error.response;
        if (status === 400) return data?.message || 'Please check all required fields';
        if (status === 401) return 'Unauthorized. Please sign in again.';
        if (status === 404) return 'Endpoint not found. Please contact support.';
        if (status === 409) return 'A firm with these details already exists.';
        if (status === 500) return 'Server error. Please try again later.';
        return data?.message || `${fallback} (${status})`;
    }
    if (error?.request) return 'No response from server. Please check your connection.';
    return error?.message || fallback;
};

const mapFirmFromApi = (firm) => ({
    ...firm,
    firm_id: firm.firm_id,
    firm_name: firm.firm_name,
    firm_type: firm.firm_type,
    status: firm.status,
    pan: firm.pan_no || '',
    gst: firm.gst_no || '',
    file_no: firm.file_no || '',
    tan: firm.tan_no || '',
    cin: firm.cin_no || '',
    vat: firm.vat_no || '',
    groups: Array.isArray(firm.groups) ? firm.groups : [],
    address: firm.address || {
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        pincode: '',
        country: '',
    },
    create_by: firm.create_by || {},
    modify_by: firm.modify_by || {},
    create_date: firm.create_date,
    modify_date: firm.modify_date,
});

const FirmsTab = ({ clientUsername }) => {
    const [firms, setFirms] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showGroupsModal, setShowGroupsModal] = useState(false);
    const [selectedFirm, setSelectedFirm] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingFirm, setSavingFirm] = useState(false);
    const [savingGroups, setSavingGroups] = useState(false);
    const [meta, setMeta] = useState({ total: 0, active: 0, inactive: 0 });
    const [statesAndDistricts, setStatesAndDistricts] = useState([]);
    const [businessTypeOptions, setBusinessTypeOptions] = useState(DEFAULT_FIRM_TYPES);
    const [statesLoading, setStatesLoading] = useState(true);
    const [branchGroups, setBranchGroups] = useState([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [newFirm, setNewFirm] = useState(emptyFirmForm);
    const [editFirmData, setEditFirmData] = useState(emptyFirmForm);
    const searchTimer = useRef(null);

    const fetchBranchGroups = useCallback(async () => {
        const headers = getHeaders();
        if (!headers) return;
        try {
            setGroupsLoading(true);
            const response = await axios.get(
                `${API_BASE_URL}/group/list?page=1&limit=200`,
                { headers },
            );
            if (response.data?.success) {
                const rows = Array.isArray(response.data.data) ? response.data.data : [];
                setBranchGroups(
                    rows
                        .filter((g) => String(g.status) === '1' || g.is_active === true)
                        .map((g) => ({
                            value: g.group_id,
                            label: g.name || g.group_id,
                            firm_count: g.firm_count,
                        })),
                );
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setGroupsLoading(false);
        }
    }, []);

    const fetchFirms = useCallback(async ({
        search = debouncedSearch,
    } = {}) => {
        if (!clientUsername) return;

        const headers = getHeaders();
        if (!headers) return;

        try {
            setLoading(true);
            const params = new URLSearchParams({
                username: clientUsername,
            });
            if (String(search || '').trim()) params.set('search', String(search).trim());

            const response = await axios.get(
                `${API_BASE_URL}/client/details/firms/list?${params.toString()}`,
                { headers },
            );

            if (response.data?.success) {
                const firmsData = response.data.data.firms || [];
                setFirms(firmsData.map(mapFirmFromApi));
                const nextMeta = response.data.data.meta || {};
                setMeta({
                    total: Number(nextMeta.total) || 0,
                    active: Number(nextMeta.active) || 0,
                    inactive: Number(nextMeta.inactive) || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching firms:', error);
            toast.error(getApiErrorMessage(error, 'Failed to fetch firms'));
        } finally {
            setLoading(false);
        }
    }, [clientUsername, debouncedSearch]);

    useEffect(() => {
        if (clientUsername) fetchFirms();
    }, [clientUsername, fetchFirms]);

    useEffect(() => {
        fetchBranchGroups();
    }, [fetchBranchGroups]);

    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim());
        }, 400);
        return () => clearTimeout(searchTimer.current);
    }, [searchTerm]);

    useEffect(() => {
        let mounted = true;
        const fetchFormMeta = async () => {
            setStatesLoading(true);
            try {
                const headers = getHeaders();
                if (!headers) return;
                const [stateResponse, typeResponse] = await Promise.all([
                    axios.get(`${API_BASE_URL}/utils/states-and-districts`, { headers }),
                    axios.get(`${API_BASE_URL}/utils/firm-types`, { headers }),
                ]);
                if (mounted && stateResponse.data?.success && Array.isArray(stateResponse.data.data)) {
                    setStatesAndDistricts(stateResponse.data.data);
                }
                if (mounted && typeResponse.data?.success && Array.isArray(typeResponse.data.data)) {
                    setBusinessTypeOptions(typeResponse.data.data);
                }
            } catch (error) {
                console.error('Error fetching firm form metadata:', error);
            } finally {
                if (mounted) setStatesLoading(false);
            }
        };
        fetchFormMeta();
        return () => { mounted = false; };
    }, []);

    const buildFirmPayload = (form, firmId = null) => {
        const payload = {
            ...(firmId ? { firm_id: firmId } : {}),
            username: clientUsername,
            type: form.type,
            pan: form.pan,
            firm: form.name,
            gst: form.gst || null,
            tan: form.tan || null,
            vat: form.vat || null,
            cin: form.cin || null,
            file: form.file_no,
            address: {
                state: form.state || '',
                district: form.city || '',
                town: form.city || '',
                pincode: form.pincode || '',
                address_line_1: form.address_line_1 || '',
                address_line_2: form.address_line_2 || '',
            },
        };
        // Groups only on create; edit uses Manage groups / group-firms APIs
        if (!firmId) {
            payload.groups = Array.isArray(form.group_ids) ? form.group_ids.filter(Boolean) : [];
        }
        return payload;
    };

    const handleAddFirm = async () => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Please sign in again.');
            return;
        }

        try {
            setSavingFirm(true);
            const response = await axios.post(
                `${API_BASE_URL}/client/details/firms/create`,
                buildFirmPayload(newFirm),
                { headers },
            );

            if (response.data?.success) {
                fetchFirms();
                setShowAddModal(false);
                setNewFirm(emptyFirmForm());
                toast.success(response.data?.message || 'Firm created successfully');
            } else {
                toast.error(response.data?.message || 'Failed to create firm');
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to create firm'));
        } finally {
            setSavingFirm(false);
        }
    };

    const handleEditFirm = async () => {
        if (!selectedFirm?.firm_id) {
            toast.error('No firm selected for editing');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            toast.error('Please sign in again.');
            return;
        }

        try {
            setSavingFirm(true);
            const response = await axios.post(
                `${API_BASE_URL}/client/details/firms/edit`,
                buildFirmPayload(editFirmData, selectedFirm.firm_id),
                { headers },
            );

            if (response.data?.success) {
                fetchFirms();
                setShowEditModal(false);
                toast.success(response.data?.message || 'Firm updated successfully');
            } else {
                toast.error(response.data?.message || 'Failed to update firm');
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to update firm'));
        } finally {
            setSavingFirm(false);
        }
    };

    const deleteFirm = async () => {
        if (!selectedFirm?.firm_id) {
            toast.error('No firm selected for deletion');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            toast.error('Please sign in again.');
            return;
        }

        try {
            setSavingFirm(true);
            const response = await axios.delete(
                `${API_BASE_URL}/client/details/firms/delete/${selectedFirm.firm_id}`,
                {
                    headers,
                    data: { username: clientUsername },
                },
            );

            if (response.data?.success) {
                setShowDeleteModal(false);
                toast.success(response.data?.message || 'Firm deleted successfully');
                await fetchFirms();
            } else {
                toast.error(response.data?.message || 'Failed to delete firm');
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to delete firm'));
            if (error?.response?.status === 409) {
                setShowDeleteModal(false);
            }
        } finally {
            setSavingFirm(false);
        }
    };

    const openEditModal = (firm) => {
        setSelectedFirm(firm);
        setEditFirmData({
            name: firm.firm_name || '',
            type: firm.firm_type || 'proprietorship',
            pan: firm.pan || '',
            gst: firm.gst || '',
            file_no: firm.file_no || '',
            tan: firm.tan || '',
            vat: firm.vat || '',
            cin: firm.cin || '',
            address_line_1: firm.address?.address_line_1 || '',
            address_line_2: firm.address?.address_line_2 || '',
            city: firm.address?.district || firm.address?.city || '',
            state: firm.address?.state || '',
            pincode: firm.address?.pincode || '',
            country: firm.address?.country || '',
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (firm) => {
        setSelectedFirm(firm);
        setShowDeleteModal(true);
    };

    const openViewModal = (firm) => {
        setSelectedFirm(firm);
        setShowViewModal(true);
    };

    const openGroupsModal = (firm) => {
        setSelectedFirm(firm);
        setShowGroupsModal(true);
        if (branchGroups.length === 0) fetchBranchGroups();
    };

    const saveFirmGroups = async (groupIds = []) => {
        if (!selectedFirm?.firm_id) return;
        const headers = getHeaders();
        if (!headers) {
            toast.error('Please sign in again.');
            return;
        }

        setSavingGroups(true);
        try {
            const response = await axios.post(
                `${API_BASE_URL}/group/group-firms/set-firm-groups`,
                {
                    firm_id: selectedFirm.firm_id,
                    group_ids: Array.isArray(groupIds) ? groupIds.filter(Boolean) : [],
                },
                { headers },
            );
            if (response.data?.success) {
                toast.success(response.data?.message || 'Firm groups updated');
                setShowGroupsModal(false);
                await fetchFirms();
            } else {
                toast.error(response.data?.message || 'Failed to update firm groups');
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to update firm groups'));
        } finally {
            setSavingGroups(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (error) {
            return dateString;
        }
    };

    const renderGroupsField = (groupIds, setGroupIds) => (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-slate-800">Firm groups</p>
                    <p className="text-xs text-slate-500">
                        Assign this firm to one or more office assistance groups
                    </p>
                </div>
                {groupsLoading ? <FiLoader className="h-4 w-4 animate-spin text-slate-400" /> : null}
            </div>
            <MultiSelectInput
                options={branchGroups}
                value={groupIds}
                onChange={setGroupIds}
                placeholder="Select groups..."
                searchPlaceholder="Search groups..."
                emptyMessage={groupsLoading ? 'Loading groups...' : 'No groups found'}
                allSelectedLabel="All groups"
                showSearch
                disabled={groupsLoading}
            />
        </div>
    );

    const canEdit = checkPermissionSync('client_edit');

    const renderGroupChips = (firm) => (
        <div className="flex flex-wrap items-center gap-1.5">
            {(firm.groups || []).length === 0 ? (
                <span className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-500">
                    Not in any group
                </span>
            ) : (
                (firm.groups || []).map((group) => (
                    <span
                        key={group.group_id}
                        className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700"
                    >
                        {group.group_name || group.group_id}
                    </span>
                ))
            )}
        </div>
    );

    const firmActionItems = (firm) => {
        const items = [
            {
                label: 'View',
                icon: <FiEye className="w-3.5 h-3.5 text-emerald-600" />,
                onClick: () => openViewModal(firm),
            },
        ];
        if (canEdit) {
            items.push(
                {
                    label: 'Manage groups',
                    icon: <FiLayers className="w-3.5 h-3.5 text-violet-600" />,
                    onClick: () => openGroupsModal(firm),
                },
                {
                    label: 'Edit',
                    icon: <FiEdit className="w-3.5 h-3.5 text-blue-600" />,
                    onClick: () => openEditModal(firm),
                },
                {
                    label: 'Delete',
                    icon: <FiTrash2 className="w-3.5 h-3.5" />,
                    danger: true,
                    onClick: () => openDeleteModal(firm),
                },
            );
        }
        return items;
    };

    const stateOptions = statesAndDistricts.map((item) => item.name);
    const addDistrictOptions = statesAndDistricts.find((item) => item.name === newFirm.state)?.districts || [];
    const editDistrictOptions = statesAndDistricts.find((item) => item.name === editFirmData.state)?.districts || [];

    const FirmsSkeleton = () => (
        <>
            <div className="space-y-3 md:hidden">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="h-10 w-10 rounded-lg bg-slate-200 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 w-2/3 rounded bg-slate-200" />
                                    <div className="h-3 w-1/3 rounded bg-slate-100" />
                                </div>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-slate-100" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="h-8 rounded-md bg-slate-100" />
                            <div className="h-8 rounded-md bg-slate-100" />
                        </div>
                        <div className="h-5 w-28 rounded-full bg-slate-100" />
                    </div>
                ))}
            </div>
            <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="grid grid-cols-[48px_1.4fr_0.9fr_0.9fr_0.7fr_1.2fr_64px] gap-3">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="h-3 rounded bg-slate-200 animate-pulse" />
                        ))}
                    </div>
                </div>
                {Array.from({ length: 6 }).map((_, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-[48px_1.4fr_0.9fr_0.9fr_0.7fr_1.2fr_64px] gap-3 border-b border-slate-100 px-3 py-3.5 last:border-b-0 animate-pulse"
                    >
                        <div className="h-3 w-4 rounded bg-slate-200" />
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-slate-200 shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                                <div className="h-3 w-1/2 rounded bg-slate-100" />
                            </div>
                        </div>
                        <div className="h-3 w-20 rounded bg-slate-200 self-center" />
                        <div className="h-3 w-16 rounded bg-slate-200 self-center" />
                        <div className="h-5 w-14 rounded-full bg-slate-200 self-center" />
                        <div className="h-5 w-24 rounded-full bg-slate-100 self-center" />
                        <div className="h-7 w-7 rounded-lg bg-slate-100 justify-self-end" />
                    </div>
                ))}
            </div>
        </>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
        >
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-200">
                                <FiBriefcase className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="m-0 text-base font-bold text-slate-800 sm:text-lg">
                                    Business Firms
                                </h3>
                                <p className="m-0 mt-0.5 text-xs text-slate-500">
                                    Manage firms and group memberships
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center lg:w-auto">
                        <div className="flex w-full sm:w-72 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                            <FiSearch className="h-4 w-4 shrink-0 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search name, PAN, file no..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
                            />
                        </div>
                        {canEdit && (
                            <motion.button
                                type="button"
                                onClick={() => {
                                    setNewFirm(emptyFirmForm());
                                    setShowAddModal(true);
                                    if (branchGroups.length === 0) fetchBranchGroups();
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:from-indigo-700 hover:to-blue-700"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <FiPlus className="h-4 w-4" />
                                Add Firm
                            </motion.button>
                        )}
                    </div>
                </div>

                {!loading && meta.total > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                            {meta.total} total
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                            {meta.active} active
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
                            {meta.inactive} inactive
                        </span>
                    </div>
                ) : null}
            </div>

            <div className="p-4 sm:p-5">
                {loading ? (
                    <FirmsSkeleton />
                ) : firms.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-14 text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                            <FiBriefcase className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="m-0 text-sm font-semibold text-slate-800">
                            {debouncedSearch ? 'No matching firms' : 'No firms yet'}
                        </h3>
                        <p className="m-0 mt-1 text-xs text-slate-500">
                            {debouncedSearch
                                ? 'Try a different search term'
                                : 'Add a firm to get started'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-3 md:hidden">
                            {firms.map((firm, index) => (
                                <motion.div
                                    key={firm.firm_id || index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(index * 0.03, 0.25) }}
                                    className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                                >
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                                                <FiBriefcase className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="m-0 truncate text-sm font-semibold text-slate-800">
                                                    {firm.firm_name || 'Unnamed Firm'}
                                                </h4>
                                                <p className="m-0 mt-0.5 truncate text-xs capitalize text-slate-500">
                                                    {firm.firm_type || '—'}
                                                </p>
                                                <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${firm.status ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                                    {firm.status ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                        <ActionMenu items={firmActionItems(firm)} />
                                    </div>
                                    <div className="mb-2.5 grid grid-cols-2 gap-1.5 text-xs">
                                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                                            <span className="font-medium text-slate-500">PAN: </span>
                                            <span className="font-semibold text-slate-800">{firm.pan || '—'}</span>
                                        </div>
                                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                                            <span className="font-medium text-slate-500">File: </span>
                                            <span className="font-semibold text-slate-800">{firm.file_no || '—'}</span>
                                        </div>
                                    </div>
                                    {renderGroupChips(firm)}
                                </motion.div>
                            ))}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
                            <div className="overflow-x-auto">
                                <table className="min-w-full table-fixed">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/90">
                                            <th className="w-[5%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">#</th>
                                            <th className="w-[28%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Firm</th>
                                            <th className="w-[14%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">PAN</th>
                                            <th className="w-[12%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">File No</th>
                                            <th className="w-[10%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Status</th>
                                            <th className="w-[23%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Groups</th>
                                            <th className="w-[8%] px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {firms.map((firm, index) => (
                                            <tr
                                                key={firm.firm_id || index}
                                                className="border-b border-slate-100 last:border-b-0 hover:bg-indigo-50/30 transition-colors"
                                            >
                                                <td className="px-3 py-3 align-middle text-xs font-bold text-slate-600">
                                                    {index + 1}
                                                </td>
                                                <td className="px-3 py-3 align-middle min-w-0">
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                                                            <FiBriefcase className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="m-0 truncate text-sm font-semibold text-slate-800">
                                                                {firm.firm_name || 'Unnamed Firm'}
                                                            </p>
                                                            <p className="m-0 mt-0.5 truncate text-xs capitalize text-slate-500">
                                                                {firm.firm_type || '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 align-middle text-sm font-semibold tabular-nums text-slate-800">
                                                    {firm.pan || '—'}
                                                </td>
                                                <td className="px-3 py-3 align-middle text-sm font-medium tabular-nums text-slate-700">
                                                    {firm.file_no || '—'}
                                                </td>
                                                <td className="px-3 py-3 align-middle">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${firm.status ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                                        {firm.status ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 align-middle">
                                                    {renderGroupChips(firm)}
                                                </td>
                                                <td className="px-3 py-3 align-middle">
                                                    <div className="flex justify-end">
                                                        <ActionMenu items={firmActionItems(firm)} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <FirmModalShell
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                maxWidth="max-w-5xl"
                headerClass="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800"
                icon={FiPlus}
                title="Add new firm"
                subtitle="Register a firm for this client"
                footer={
                    <ModalFooterActions
                        onCancel={() => setShowAddModal(false)}
                        onConfirm={handleAddFirm}
                        confirmLabel="Add firm"
                        loading={savingFirm}
                        disabled={!newFirm.name?.trim() || !newFirm.pan?.trim()}
                    />
                }
            >
                <FirmFormFields
                    formData={newFirm}
                    setFormData={setNewFirm}
                    stateOptions={stateOptions}
                    districtOptions={addDistrictOptions}
                    statesLoading={statesLoading}
                    businessTypeOptions={businessTypeOptions}
                />
                {renderGroupsField(
                    newFirm.group_ids || [],
                    (ids) => setNewFirm((prev) => ({ ...prev, group_ids: ids })),
                )}
            </FirmModalShell>

            <FirmModalShell
                open={showEditModal && !!selectedFirm}
                onClose={() => setShowEditModal(false)}
                maxWidth="max-w-5xl"
                headerClass="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600"
                icon={FiEdit}
                title="Edit firm"
                subtitle={selectedFirm?.firm_name ? `Updating ${selectedFirm.firm_name}` : 'Update firm details'}
                footer={
                    <ModalFooterActions
                        onCancel={() => setShowEditModal(false)}
                        onConfirm={handleEditFirm}
                        confirmLabel="Save changes"
                        confirmClass="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-200"
                        loading={savingFirm}
                        disabled={!editFirmData.name?.trim()}
                    />
                }
            >
                <FirmFormFields
                    formData={editFirmData}
                    setFormData={setEditFirmData}
                    stateOptions={stateOptions}
                    districtOptions={editDistrictOptions}
                    statesLoading={statesLoading}
                    businessTypeOptions={businessTypeOptions}
                />
            </FirmModalShell>

            <FirmGroupsManageModal
                open={showGroupsModal && !!selectedFirm}
                firm={selectedFirm}
                groups={branchGroups}
                groupsLoading={groupsLoading}
                saving={savingGroups}
                onClose={() => !savingGroups && setShowGroupsModal(false)}
                onSave={saveFirmGroups}
            />

            <FirmModalShell
                open={showViewModal && !!selectedFirm}
                onClose={() => setShowViewModal(false)}
                maxWidth="max-w-5xl"
                headerClass="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900"
                icon={FiEye}
                title="Firm details"
                subtitle={selectedFirm?.firm_name || 'View firm information'}
                footer={
                    <ModalFooterActions
                        onCancel={() => setShowViewModal(false)}
                        onConfirm={canEdit ? () => {
                            setShowViewModal(false);
                            if (selectedFirm) openEditModal(selectedFirm);
                        } : null}
                        cancelLabel="Close"
                        confirmLabel={canEdit ? 'Edit firm' : null}
                        confirmClass="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-200"
                    />
                }
            >
                {selectedFirm && (
                    <div className="space-y-4">
                        <FirmViewDetails firm={selectedFirm} formatDate={formatDate} />
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Groups
                            </p>
                            {(selectedFirm.groups || []).length === 0 ? (
                                <p className="text-sm text-slate-500">Not in any group</p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {(selectedFirm.groups || []).map((group) => (
                                        <span
                                            key={group.group_id}
                                            className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700"
                                        >
                                            {group.group_name || group.group_id}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </FirmModalShell>

            <FirmModalShell
                open={showDeleteModal && !!selectedFirm}
                onClose={() => setShowDeleteModal(false)}
                maxWidth="max-w-md"
                headerClass="bg-gradient-to-r from-red-500 to-rose-600"
                icon={FiTrash2}
                title="Delete firm"
                subtitle="This action cannot be undone"
                footer={
                    <ModalFooterActions
                        onCancel={() => setShowDeleteModal(false)}
                        onConfirm={deleteFirm}
                        confirmLabel="Delete firm"
                        confirmClass="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-200"
                        loading={savingFirm}
                    />
                }
            >
                <div className="py-2 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                        <FiAlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <p className="text-sm text-slate-600">
                        You are about to delete{' '}
                        <span className="font-semibold text-slate-900">{selectedFirm?.firm_name}</span>.
                        All associated data will be removed permanently.
                    </p>
                </div>
            </FirmModalShell>
        </motion.div>
    );
};

export default FirmsTab;
