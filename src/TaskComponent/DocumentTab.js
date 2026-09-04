import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    FiFile,
    FiEye,
    FiTrash2,
    FiDownload,
    FiUpload,
    FiX,
    FiFileText,
    FiImage,
    FiSend,
    FiLoader,
    FiPlus,
    FiSearch,
    FiAlertCircle,
    FiMoreVertical,
} from 'react-icons/fi';
import TaskDocumentCreate, { getTaskDocumentAuthHeaders } from './TaskDocumentCreate';
import API_BASE_URL from '../utils/api-controller';
import { toast } from 'react-hot-toast';
import { DocumentTableSkeletonRows } from './taskTabSkeletons';
import TablePagination from '../components/TablePagination';

const TASK_UPLOAD_FORM_ID = 'task-document-upload-modal-form';
const SKELETON_ROW_COUNT = 8;
const DEFAULT_ITEMS_PER_PAGE = 20;
const LIMIT_OPTIONS = [5, 10, 20, 50, 100];

const apiRoot = () => String(API_BASE_URL || '').replace(/\/+$/, '');

const resolveTaskFileUrl = (file) => {
    if (!file || typeof file !== 'string') return '';
    const f = file.trim();
    if (/^https?:\/\//i.test(f)) return f;
    const root = apiRoot();
    const path = f.startsWith('/') ? f : `/${f}`;
    return `${root}${path}`;
};

const pickDownloadFileName = (doc, fileUrl) => {
    const raw = (doc?.name && String(doc.name).trim()) || '';
    const safe = (s) => s.replace(/[/\\?%*:|"<>]/g, '_');
    if (raw && /\.[a-z0-9]{1,8}$/i.test(raw)) return safe(raw);
    try {
        const seg = new URL(fileUrl).pathname.split('/').filter(Boolean).pop();
        if (seg && seg.includes('.')) return safe(decodeURIComponent(seg));
    } catch {
        /* ignore */
    }
    return safe(raw || 'document');
};

const parseBlobErrorMessage = async (blob) => {
    if (!(blob instanceof Blob)) return '';
    try {
        const text = await blob.text();
        const j = JSON.parse(text);
        return j?.message || text || '';
    } catch {
        return '';
    }
};

/**
 * Accessible custom checkbox with spring + checkmark draw animation.
 */
const AnimatedCheckbox = ({ checked, onClick, disabled, title, label }) => (
    <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        title={title}
        disabled={disabled}
        onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onClick?.();
        }}
        className="inline-flex items-center justify-center rounded-md p-1 outline-none ring-cyan-500/30 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40"
    >
        <motion.span
            className="relative flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-2"
            initial={false}
            animate={{
                borderColor: checked ? '#0891b2' : '#cbd5e1',
                backgroundColor: checked ? '#0891b2' : 'rgba(255,255,255,0.95)',
                boxShadow: checked
                    ? '0 0 0 1px rgba(8,145,178,0.25)'
                    : '0 1px 2px rgba(15,23,42,0.06)',
            }}
            transition={{ type: 'spring', stiffness: 520, damping: 32 }}
        >
            <motion.svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="text-white"
                initial={false}
                animate={{ scale: checked ? 1 : 0.65, opacity: checked ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 480, damping: 26 }}
            >
                <motion.path
                    d="M2.5 6.2l2.4 2.5L9.5 3.3"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={false}
                    animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                />
            </motion.svg>
        </motion.span>
    </button>
);

const formatBytes = (bytes) => {
    if (bytes == null || bytes === '') return '—';
    const n = Number(bytes);
    if (Number.isNaN(n) || n < 0) return '—';
    if (n < 1024) return `${n} B`;
    const kb = n / 1024;
    if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
    const mb = kb / 1024;
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
};

const mimeToLabel = (mime) => {
    if (!mime || typeof mime !== 'string') return '—';
    const parts = mime.split('/');
    return (parts[1] || parts[0] || mime).toUpperCase();
};

const DocumentsTab = ({
    task_id: taskIdProp = '',
    has_ca: hasCaProp = false,
    ca_username: caUsernameProp = '',
    onTaskDocumentsCreateSuccess,
}) => {
    const showUploaderTabs = Boolean(hasCaProp && caUsernameProp);
    const [docScope, setDocScope] = useState('office'); // office | ca
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFormBusy, setUploadFormBusy] = useState(false);
    const taskDocCreateRef = useRef(null);

    const [documents, setDocuments] = useState([]);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [listRefresh, setListRefresh] = useState(0);
    const [downloadingId, setDownloadingId] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState(null);
    const [showActionMenu, setShowActionMenu] = useState(null);
    const [actionMenuPosition, setActionMenuPosition] = useState(null);
    const actionAnchorRef = useRef(null);

    const handleUploadBusyChange = useCallback((busy) => {
        setUploadFormBusy(!!busy);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, taskIdProp, itemsPerPage, docScope]);

    useEffect(() => {
        if (!showUploaderTabs && docScope !== 'office') {
            setDocScope('office');
        }
    }, [showUploaderTabs, docScope]);

    const fetchDocuments = useCallback(async () => {
        if (!taskIdProp) {
            setDocuments([]);
            setListError('');
            setListLoading(false);
            setTotalItems(0);
            setTotalPages(1);
            return;
        }

        const { headers, hasToken } = getTaskDocumentAuthHeaders();
        if (!hasToken) {
            setListError('Not signed in. Please log in again.');
            setDocuments([]);
            setListLoading(false);
            setTotalItems(0);
            setTotalPages(1);
            return;
        }

        setListLoading(true);
        setListError('');

        const params = new URLSearchParams({
            page_no: String(currentPage),
            limit: String(itemsPerPage),
            search: debouncedSearch,
            task_id: taskIdProp,
        });
        if (showUploaderTabs) {
            params.set('scope', docScope === 'ca' ? 'ca' : 'office');
        }

        try {
            const url = `${API_BASE_URL}/task/details/document/list?${params.toString()}`;
            const response = await axios.get(url, { headers });

            if (response.data?.success && Array.isArray(response.data.data)) {
                const rows = response.data.data;
                setDocuments(rows);
                const p = response.data.pagination || {};
                const limit =
                    Number(p.limit) > 0 ? Number(p.limit) : itemsPerPage;
                const totalRaw = p.total ?? p.total_count;
                let total;
                if (totalRaw != null && !Number.isNaN(Number(totalRaw))) {
                    total = Number(totalRaw);
                } else if (typeof p.total_pages === 'number' && p.total_pages >= 1) {
                    const isLast =
                        typeof p.is_last_page === 'boolean'
                            ? p.is_last_page
                            : rows.length < limit;
                    total = isLast
                        ? (p.total_pages - 1) * limit + rows.length
                        : p.total_pages * limit;
                } else {
                    total = rows.length;
                }
                const tp = Math.max(1, Math.ceil(total / limit) || 1);
                setTotalItems(total);
                setTotalPages(tp);
                setCurrentPage((prev) =>
                    prev > tp ? tp : Math.max(1, prev)
                );
            } else {
                setDocuments([]);
                setTotalItems(0);
                setTotalPages(1);
                setListError(response.data?.message || 'Could not load documents.');
            }
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Failed to load documents.';
            setListError(msg);
            setDocuments([]);
            setTotalItems(0);
            setTotalPages(1);
        } finally {
            setListLoading(false);
        }
    }, [
        taskIdProp,
        currentPage,
        itemsPerPage,
        debouncedSearch,
        listRefresh,
        showUploaderTabs,
        docScope,
    ]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    useEffect(() => {
        if (!deleteModal) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape' && !deleteLoading) setDeleteModal(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [deleteModal, deleteLoading]);

    const bumpListRefresh = useCallback(() => {
        setListRefresh((n) => n + 1);
    }, []);

    const docKey = (id) => String(id);

    const getFileIcon = (mime) => {
        const t = (mime || '').toLowerCase();
        if (t.includes('pdf')) {
            return <FiFileText className="w-5 h-5 text-red-500" />;
        }
        if (t.includes('image')) {
            return <FiImage className="w-5 h-5 text-green-500" />;
        }
        return <FiFile className="w-5 h-5 text-blue-500" />;
    };

    const handleSelectAll = () => {
        if (selectedDocs.length === documents.length && documents.length > 0) {
            setSelectedDocs([]);
        } else {
            setSelectedDocs(documents.map((doc) => docKey(doc.document_id)));
        }
    };

    const handleSelectDoc = (id) => {
        const key = docKey(id);
        if (selectedDocs.includes(key)) {
            setSelectedDocs(selectedDocs.filter((docId) => docId !== key));
        } else {
            setSelectedDocs([...selectedDocs, key]);
        }
    };

    const deleteTaskDocuments = useCallback(
        async (documentIds) => {
            const ids = (documentIds || []).map((id) => String(id).trim()).filter(Boolean);
            if (ids.length === 0) return false;

            const { headers, hasToken } = getTaskDocumentAuthHeaders();
            if (!hasToken) {
                toast.error('Not signed in. Please log in again.');
                return false;
            }

            setDeleteLoading(true);
            try {
                const url = `${apiRoot()}/task/details/document/delete`;
                const response = await axios.delete(url, {
                    headers,
                    data: { document_ids: ids },
                });

                if (response.data?.success) {
                    toast.success(
                        response.data?.message || 'Documents deleted successfully'
                    );
                    setSelectedDocs((prev) => prev.filter((id) => !ids.includes(String(id))));
                    bumpListRefresh();
                    return true;
                }

                toast.error(response.data?.message || 'Could not delete documents.');
                return false;
            } catch (err) {
                const msg =
                    err?.response?.data?.message ||
                    err?.message ||
                    'Failed to delete documents.';
                toast.error(msg);
                return false;
            } finally {
                setDeleteLoading(false);
            }
        },
        [bumpListRefresh]
    );

    const handleBulkDelete = () => {
        if (selectedDocs.length === 0 || deleteLoading) return;
        setDeleteModal({ ids: [...selectedDocs] });
    };

    const handleDeleteOne = (id) => {
        if (deleteLoading) return;
        const doc = documents.find((d) => docKey(d.document_id) === docKey(id));
        setDeleteModal({
            ids: [String(id)],
            docName: (doc?.name && String(doc.name).trim()) || null,
        });
    };

    const handleConfirmDeleteModal = async () => {
        if (!deleteModal?.ids?.length || deleteLoading) return;
        const ok = await deleteTaskDocuments(deleteModal.ids);
        if (ok) setDeleteModal(null);
    };

    const handlePageChange = (newPage) => {
        const page = Math.max(1, Math.min(totalPages, Math.floor(newPage)));
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const computeActionMenuPosition = useCallback((anchorEl, options = {}) => {
        if (!anchorEl) return null;

        const itemCount = Math.max(1, Number(options.itemCount) || 2);
        const rect = anchorEl.getBoundingClientRect();
        const menuWidth = 168;
        const menuHeight = 8 + itemCount * 36;
        const gap = 8;
        const margin = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const space = {
            top: rect.top - margin,
            bottom: vh - rect.bottom - margin,
            right: vw - rect.right - margin,
            left: rect.left - margin,
        };

        const fits = {
            top: space.top >= menuHeight + gap,
            bottom: space.bottom >= menuHeight + gap,
            right: space.right >= menuWidth + gap,
            left: space.left >= menuWidth + gap,
        };

        const preferred = ['top', 'bottom', 'right', 'left'];
        let placement = preferred.find((p) => fits[p]);
        if (!placement) {
            placement = preferred.reduce((best, p) => (space[p] > space[best] ? p : best), 'bottom');
        }

        let top = 0;
        let left = 0;
        if (placement === 'top') {
            top = rect.top - menuHeight - gap;
            left = rect.left + rect.width / 2 - menuWidth / 2;
        } else if (placement === 'bottom') {
            top = rect.bottom + gap;
            left = rect.left + rect.width / 2 - menuWidth / 2;
        } else if (placement === 'right') {
            top = rect.top + rect.height / 2 - menuHeight / 2;
            left = rect.right + gap;
        } else {
            top = rect.top + rect.height / 2 - menuHeight / 2;
            left = rect.left - menuWidth - gap;
        }

        return {
            top: Math.max(margin, Math.min(top, vh - menuHeight - margin)),
            left: Math.max(margin, Math.min(left, vw - menuWidth - margin)),
            placement,
            height: menuHeight,
        };
    }, []);

    const closeActionMenu = useCallback(() => {
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
    }, []);

    const openActionMenu = useCallback(
        (doc, event) => {
            event.stopPropagation();
            const id = docKey(doc.document_id);
            if (showActionMenu === id) {
                closeActionMenu();
                return;
            }
            actionAnchorRef.current = event.currentTarget;
            const itemCount = 1 + (doc.file ? 2 : 0); // delete always; view+download if file
            setShowActionMenu(id);
            setActionMenuPosition(
                computeActionMenuPosition(event.currentTarget, { itemCount })
            );
        },
        [showActionMenu, closeActionMenu, computeActionMenuPosition]
    );

    useEffect(() => {
        if (!showActionMenu || !actionAnchorRef.current) return undefined;

        const selected = documents.find(
            (d) => docKey(d.document_id) === String(showActionMenu)
        );
        const itemCount = 1 + (selected?.file ? 2 : 0);

        const updatePosition = () => {
            if (!actionAnchorRef.current) return;
            setActionMenuPosition(
                computeActionMenuPosition(actionAnchorRef.current, { itemCount })
            );
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') closeActionMenu();
        };

        const handleOutside = (e) => {
            if (actionAnchorRef.current?.contains(e.target)) return;
            const menu = document.getElementById('task-doc-action-menu');
            if (menu?.contains(e.target)) return;
            closeActionMenu();
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        document.addEventListener('keydown', handleEscape);
        document.addEventListener('mousedown', handleOutside);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleOutside);
        };
    }, [showActionMenu, documents, computeActionMenuPosition, closeActionMenu]);

    const selectedActionDoc = documents.find(
        (d) => docKey(d.document_id) === String(showActionMenu)
    );

    const openFile = (fileUrl) => {
        const url = resolveTaskFileUrl(fileUrl);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    const downloadDocument = useCallback(async (doc) => {
        const fileUrl = resolveTaskFileUrl(doc?.file);
        if (!fileUrl) {
            toast.error('No file URL available.');
            return;
        }

        const { headers, hasToken } = getTaskDocumentAuthHeaders();
        if (!hasToken) {
            toast.error('Not signed in. Please log in again.');
            return;
        }

        const root = apiRoot();
        const samePageOrigin =
            typeof window !== 'undefined' &&
            fileUrl.startsWith(String(window.location.origin));
        const attachAuth = fileUrl.startsWith(root) || samePageOrigin;

        setDownloadingId(doc.document_id);
        try {
            const response = await axios.get(fileUrl, {
                headers: attachAuth ? headers : {},
                responseType: 'blob',
                timeout: 120000,
            });

            const blob = response.data;
            if (!(blob instanceof Blob) || blob.size === 0) {
                toast.error('Empty or invalid file response.');
                return;
            }

            const ct = (response.headers?.['content-type'] || '').toLowerCase();
            if (ct.includes('application/json')) {
                const msg = await parseBlobErrorMessage(blob);
                toast.error(msg || 'Download failed.');
                return;
            }

            const filename = pickDownloadFileName(doc, fileUrl);
            const objectUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(objectUrl);
        } catch (err) {
            const blob = err?.response?.data;
            if (blob instanceof Blob) {
                const inner = await parseBlobErrorMessage(blob);
                if (inner) {
                    toast.error(inner);
                    return;
                }
            }
            toast.error(
                err?.response?.data?.message ||
                err?.message ||
                'Failed to download file.'
            );
        } finally {
            setDownloadingId(null);
        }
    }, []);

    const rowNumber = (index) => (currentPage - 1) * itemsPerPage + index + 1;

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                        <div className="flex shrink-0 items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                                <FiFile className="h-5 w-5 text-cyan-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">Documents</h3>
                        </div>
                        {showUploaderTabs ? (
                            <div className="inline-flex shrink-0 rounded-xl border border-cyan-200 bg-white p-1 shadow-sm">
                                {[
                                    { id: 'office', label: 'Office' },
                                    { id: 'ca', label: 'CA' },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            if (docScope === item.id) return;
                                            setDocScope(item.id);
                                            setSelectedDocs([]);
                                            setListLoading(true);
                                            closeActionMenu();
                                        }}
                                        className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                                            docScope === item.id
                                                ? 'bg-cyan-600 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-cyan-50'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                        <div className="relative w-full min-w-0 max-w-md sm:flex-1">
                            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder={
                                    showUploaderTabs
                                        ? docScope === 'ca'
                                            ? 'Search CA documents…'
                                            : 'Search office documents…'
                                        : 'Search documents…'
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 outline-none ring-cyan-500/20 transition focus:border-cyan-500 focus:ring-2"
                                aria-label="Search documents"
                            />
                            {listLoading && (
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                    <FiLoader className="h-4 w-4 animate-spin text-cyan-600" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {selectedDocs.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <motion.button
                                    type="button"
                                    onClick={handleBulkDelete}
                                    disabled={deleteLoading}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    whileHover={{ scale: deleteLoading ? 1 : 1.02 }}
                                    whileTap={{ scale: deleteLoading ? 1 : 0.98 }}
                                >
                                    {deleteLoading ? (
                                        <FiLoader className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <FiTrash2 className="h-4 w-4" />
                                    )}
                                    Delete ({selectedDocs.length})
                                </motion.button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDocs([])}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                        {(!showUploaderTabs || docScope === 'office') ? (
                            <motion.button
                                type="button"
                                onClick={() => setShowUploadModal(true)}
                                disabled={!taskIdProp}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                                whileHover={{ scale: taskIdProp ? 1.02 : 1 }}
                                whileTap={{ scale: taskIdProp ? 0.98 : 1 }}
                            >
                                <FiUpload className="h-4 w-4" />
                                Upload
                            </motion.button>
                        ) : null}
                    </div>
                </div>
            </div>

            {listError && (
                <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:mx-6">
                    <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{listError}</span>
                </div>
            )}

            <div className="overflow-x-auto px-2 pb-2 sm:px-4">
                {!taskIdProp ? (
                    <div className="py-12 text-center text-slate-500">
                        <FiFile className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                        <p>No task selected.</p>
                    </div>
                ) : (
                    <>
                        <table
                            className="w-full min-w-[720px] text-left text-sm text-slate-700"
                            aria-busy={listLoading}
                        >
                            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-900">
                                <tr>
                                    <th className="w-12 px-3 py-3">
                                        <AnimatedCheckbox
                                            checked={
                                                selectedDocs.length === documents.length &&
                                                documents.length > 0
                                            }
                                            onClick={handleSelectAll}
                                            disabled={listLoading || deleteLoading || documents.length === 0}
                                            label="Select all documents on this page"
                                        />
                                    </th>
                                    <th className="px-3 py-3 font-semibold">#</th>
                                    <th className="px-3 py-3 font-semibold">Name</th>
                                    <th className="px-3 py-3 font-semibold">Remark</th>
                                    <th className="px-3 py-3 font-semibold">Type</th>
                                    <th className="px-3 py-3 font-semibold">Size</th>
                                    <th className="px-3 py-3 font-semibold">Added</th>
                                    <th className="w-16 px-3 py-3 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listLoading ? (
                                    <DocumentTableSkeletonRows
                                        rowCount={Math.min(
                                            Math.max(itemsPerPage, 5),
                                            8
                                        )}
                                    />
                                ) : (
                                    <AnimatePresence initial={false}>
                                        {documents.map((doc, index) => (
                                            <motion.tr
                                                key={doc.document_id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.15 }}
                                                className="border-b border-slate-100 hover:bg-slate-50/80"
                                            >
                                                <td className="px-3 py-3">
                                                    <AnimatedCheckbox
                                                        checked={selectedDocs.includes(
                                                            docKey(doc.document_id)
                                                        )}
                                                        onClick={() =>
                                                            handleSelectDoc(doc.document_id)
                                                        }
                                                        disabled={deleteLoading}
                                                        label={`Select ${doc.name || 'document'}`}
                                                    />
                                                </td>
                                                <td className="px-3 py-3 text-slate-500">
                                                    {rowNumber(index)}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {getFileIcon(doc.mime_type)}
                                                        <span className="font-medium text-slate-900">
                                                            {doc.name || '—'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="max-w-[160px] truncate px-3 py-3 text-slate-600">
                                                    {doc.remark || '—'}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                                                        {mimeToLabel(doc.mime_type)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-slate-600">
                                                    {formatBytes(doc.size)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                                                    {doc.create_date
                                                        ? new Date(
                                                            doc.create_date
                                                        ).toLocaleDateString(undefined, {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })
                                                        : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        aria-label="Actions"
                                                        aria-haspopup="menu"
                                                        aria-expanded={showActionMenu === docKey(doc.document_id)}
                                                        onClick={(e) => openActionMenu(doc, e)}
                                                        disabled={deleteLoading}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <FiMoreVertical className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </tbody>
                        </table>

                        {!listLoading && documents.length === 0 && !listError && (
                            <div className="py-12 text-center text-slate-500">
                                <FiFile className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                                <p>
                                    {showUploaderTabs
                                        ? docScope === 'ca'
                                            ? 'No CA-uploaded documents yet.'
                                            : 'No office documents match your search.'
                                        : 'No documents match your search.'}
                                </p>
                            </div>
                        )}

                        {!listLoading &&
                            !listError &&
                            (documents.length > 0 || totalItems > 0) && (
                                <div className="border-t border-slate-200 bg-white px-2 py-3 sm:px-4">
                                    <TablePagination
                                        page={currentPage}
                                        limit={itemsPerPage}
                                        total={totalItems}
                                        totalPages={totalPages}
                                        rowOptions={LIMIT_OPTIONS}
                                        defaultRows={DEFAULT_ITEMS_PER_PAGE}
                                        onPageChange={handlePageChange}
                                        onLimitChange={(l) => {
                                            setItemsPerPage(l);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </div>
                            )}
                    </>
                )}
            </div>

            {showActionMenu && actionMenuPosition && selectedActionDoc
                ? createPortal(
                    <motion.div
                        id="task-doc-action-menu"
                        role="menu"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.14 }}
                        className="fixed z-[99999] w-[168px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl"
                        style={{
                            top: actionMenuPosition.top,
                            left: actionMenuPosition.left,
                            height: 'auto',
                        }}
                    >
                        {selectedActionDoc.file ? (
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    openFile(selectedActionDoc.file);
                                    closeActionMenu();
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50"
                            >
                                <FiEye className="h-4 w-4 text-blue-600" />
                                View
                            </button>
                        ) : null}
                        {selectedActionDoc.file ? (
                            <button
                                type="button"
                                role="menuitem"
                                disabled={
                                    downloadingId === selectedActionDoc.document_id ||
                                    deleteLoading
                                }
                                onClick={() => {
                                    downloadDocument(selectedActionDoc);
                                    closeActionMenu();
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {downloadingId === selectedActionDoc.document_id ? (
                                    <FiLoader className="h-4 w-4 animate-spin text-green-600" />
                                ) : (
                                    <FiDownload className="h-4 w-4 text-green-600" />
                                )}
                                Download
                            </button>
                        ) : null}
                        <button
                            type="button"
                            role="menuitem"
                            disabled={deleteLoading}
                            onClick={() => {
                                handleDeleteOne(selectedActionDoc.document_id);
                                closeActionMenu();
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <FiTrash2 className="h-4 w-4 text-rose-600" />
                            Delete
                        </button>
                    </motion.div>,
                    document.body
                )
                : null}

            <AnimatePresence>
                {showUploadModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
                    >
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="task-upload-modal-title"
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 24, opacity: 0 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                            className="flex h-[min(92dvh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.35)] sm:rounded-2xl sm:shadow-2xl"
                        >
                            <div className="relative shrink-0 overflow-hidden border-b border-slate-200/80 bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 px-3 py-2.5 sm:px-4 sm:py-3">
                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
                                <div className="relative flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                        <motion.div
                                            initial={{ scale: 0.92 }}
                                            animate={{ scale: 1 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 420,
                                                damping: 22,
                                            }}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-inner ring-1 ring-white/25"
                                        >
                                            <FiUpload className="h-[18px] w-[18px] text-white" />
                                        </motion.div>
                                        <h3
                                            id="task-upload-modal-title"
                                            className="min-w-0 text-base font-bold tracking-tight text-white sm:text-[1.05rem]"
                                        >
                                            Upload documents
                                        </h3>
                                    </div>
                                    <motion.button
                                        type="button"
                                        onClick={() => taskDocCreateRef.current?.addSlot()}
                                        disabled={uploadFormBusy}
                                        whileHover={uploadFormBusy ? {} : { scale: 1.03 }}
                                        whileTap={uploadFormBusy ? {} : { scale: 0.97 }}
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1.5 text-sm font-semibold text-white shadow-inner ring-1 ring-white/30 hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-45 sm:px-3 sm:py-2"
                                        aria-label="Add document slot"
                                    >
                                        <span className="whitespace-nowrap">Add Slot</span>
                                        <FiPlus className="h-5 w-5 shrink-0" />
                                    </motion.button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50 to-white px-3 py-4 sm:px-6 sm:py-5">
                                <TaskDocumentCreate
                                    ref={taskDocCreateRef}
                                    embedded
                                    formId={TASK_UPLOAD_FORM_ID}
                                    hideTaskId
                                    baseUrl={API_BASE_URL}
                                    taskId={taskIdProp}
                                    onBusyChange={handleUploadBusyChange}
                                    onSuccess={(data) => {
                                        onTaskDocumentsCreateSuccess?.(data);
                                        bumpListRefresh();
                                        window.setTimeout(
                                            () => setShowUploadModal(false),
                                            1000
                                        );
                                    }}
                                />
                            </div>

                            <div className="shrink-0 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-4">
                                <div className="mx-auto flex max-w-5xl flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowUploadModal(false)}
                                        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 sm:w-auto"
                                    >
                                        <FiX className="mr-2 h-4 w-4" />
                                        Close
                                    </motion.button>
                                    <motion.button
                                        type="submit"
                                        form={TASK_UPLOAD_FORM_ID}
                                        disabled={uploadFormBusy}
                                        whileHover={
                                            uploadFormBusy ? {} : { scale: 1.02 }
                                        }
                                        whileTap={
                                            uploadFormBusy ? {} : { scale: 0.98 }
                                        }
                                        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                    >
                                        {uploadFormBusy ? (
                                            <>
                                                <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                                                Working…
                                            </>
                                        ) : (
                                            <>
                                                <FiSend className="mr-2 h-4 w-4" />
                                                Submit documents
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
                        role="presentation"
                        onClick={() => !deleteLoading && setDeleteModal(null)}
                    >
                        <motion.div
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="task-doc-delete-title"
                            aria-describedby="task-doc-delete-desc"
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
                            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white px-5 py-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100">
                                        <FiTrash2 className="h-5 w-5 text-rose-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3
                                            id="task-doc-delete-title"
                                            className="text-lg font-semibold text-slate-900"
                                        >
                                            {deleteModal.docName
                                                ? 'Delete document?'
                                                : deleteModal.ids.length > 1
                                                    ? `Delete ${deleteModal.ids.length} documents?`
                                                    : 'Delete document?'}
                                        </h3>
                                        <p
                                            id="task-doc-delete-desc"
                                            className="mt-1 text-sm leading-relaxed text-slate-600"
                                        >
                                            {deleteModal.docName ? (
                                                <>
                                                    <span className="font-medium text-slate-800">
                                                        “{deleteModal.docName}”
                                                    </span>{' '}
                                                    will be removed permanently. This cannot be undone.
                                                </>
                                            ) : (
                                                <>
                                                    {deleteModal.ids.length > 1
                                                        ? `These ${deleteModal.ids.length} selected documents will be removed permanently.`
                                                        : 'This document will be removed permanently.'}{' '}
                                                    This cannot be undone.
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    disabled={deleteLoading}
                                    onClick={() => setDeleteModal(null)}
                                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={deleteLoading}
                                    onClick={handleConfirmDeleteModal}
                                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                    {deleteLoading ? (
                                        <>
                                            <FiLoader className="h-4 w-4 animate-spin" />
                                            Deleting…
                                        </>
                                    ) : (
                                        <>
                                            <FiTrash2 className="h-4 w-4" />
                                            Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DocumentsTab;
