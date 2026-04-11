import React, { useState, useCallback, useRef, useEffect } from 'react';
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
    FiChevronLeft,
    FiChevronRight,
    FiAlertCircle,
} from 'react-icons/fi';
import TaskDocumentCreate, { getTaskDocumentAuthHeaders } from './TaskDocumentCreate';
import API_BASE_URL from '../utils/api-controller';

const TASK_UPLOAD_FORM_ID = 'task-document-upload-modal-form';
const PAGE_SIZE = 20;

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
    onTaskDocumentsCreateSuccess,
}) => {
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFormBusy, setUploadFormBusy] = useState(false);
    const taskDocCreateRef = useRef(null);

    const [documents, setDocuments] = useState([]);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState('');
    const [pageNo, setPageNo] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: PAGE_SIZE,
        total_pages: null,
        is_last_page: true,
    });
    const [listRefresh, setListRefresh] = useState(0);

    const handleUploadBusyChange = useCallback((busy) => {
        setUploadFormBusy(!!busy);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        setPageNo(1);
    }, [debouncedSearch, taskIdProp]);

    const fetchDocuments = useCallback(async () => {
        if (!taskIdProp) {
            setDocuments([]);
            setListError('');
            setListLoading(false);
            return;
        }

        const { headers, hasToken } = getTaskDocumentAuthHeaders();
        if (!hasToken) {
            setListError('Not signed in. Please log in again.');
            setDocuments([]);
            setListLoading(false);
            return;
        }

        setListLoading(true);
        setListError('');

        const params = new URLSearchParams({
            page_no: String(pageNo),
            limit: String(PAGE_SIZE),
            search: debouncedSearch,
            task_id: taskIdProp,
        });

        try {
            const url = `${API_BASE_URL}/task/details/document/list?${params.toString()}`;
            const response = await axios.get(url, { headers });

            if (response.data?.success && Array.isArray(response.data.data)) {
                setDocuments(response.data.data);
                const p = response.data.pagination || {};
                setPagination({
                    page_no: p.page_no ?? pageNo,
                    limit: p.limit ?? PAGE_SIZE,
                    total_pages: p.total_pages ?? null,
                    is_last_page:
                        typeof p.is_last_page === 'boolean'
                            ? p.is_last_page
                            : response.data.data.length < PAGE_SIZE,
                });
            } else {
                setDocuments([]);
                setListError(response.data?.message || 'Could not load documents.');
            }
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Failed to load documents.';
            setListError(msg);
            setDocuments([]);
        } finally {
            setListLoading(false);
        }
    }, [taskIdProp, pageNo, debouncedSearch, listRefresh]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const bumpListRefresh = useCallback(() => {
        setListRefresh((n) => n + 1);
    }, []);

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
            setSelectedDocs(documents.map((doc) => doc.document_id));
        }
    };

    const handleSelectDoc = (id) => {
        if (selectedDocs.includes(id)) {
            setSelectedDocs(selectedDocs.filter((docId) => docId !== id));
        } else {
            setSelectedDocs([...selectedDocs, id]);
        }
    };

    const handleDeleteSelected = () => {
        setSelectedDocs([]);
    };

    const handleDelete = (id) => {
        setSelectedDocs(selectedDocs.filter((docId) => docId !== id));
    };

    const goPrevPage = () => setPageNo((p) => Math.max(1, p - 1));
    const goNextPage = () => {
        if (!pagination.is_last_page) {
            setPageNo((p) => p + 1);
        }
    };

    const openFile = (fileUrl) => {
        if (fileUrl) window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    const rowNumber = (index) => (pageNo - 1) * PAGE_SIZE + index + 1;

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                            <FiFile className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Documents</h3>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {selectedDocs.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <motion.button
                                    type="button"
                                    onClick={handleDeleteSelected}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiTrash2 className="h-4 w-4" />
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
                    </div>
                </div>

                <div className="relative mt-4 max-w-md">
                    <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search documents…"
                        className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none ring-cyan-500/20 transition focus:border-cyan-500 focus:ring-2"
                        aria-label="Search documents"
                    />
                    {listLoading && (
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                            <FiLoader className="h-4 w-4 animate-spin text-cyan-600" />
                        </div>
                    )}
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
                        <table className="w-full min-w-[720px] text-left text-sm text-slate-700">
                            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-900">
                                <tr>
                                    <th className="w-12 px-3 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedDocs.length === documents.length &&
                                                documents.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                        />
                                    </th>
                                    <th className="px-3 py-3 font-semibold">#</th>
                                    <th className="px-3 py-3 font-semibold">Name</th>
                                    <th className="px-3 py-3 font-semibold">Remark</th>
                                    <th className="px-3 py-3 font-semibold">Type</th>
                                    <th className="px-3 py-3 font-semibold">Size</th>
                                    <th className="px-3 py-3 font-semibold">Added</th>
                                    <th className="px-3 py-3 font-semibold">View</th>
                                    <th className="px-3 py-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
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
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDocs.includes(
                                                        doc.document_id
                                                    )}
                                                    onChange={() =>
                                                        handleSelectDoc(doc.document_id)
                                                    }
                                                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
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
                                            <td className="px-3 py-3">
                                                <motion.button
                                                    type="button"
                                                    onClick={() => openFile(doc.file)}
                                                    className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                                                    whileHover={{ scale: 1.08 }}
                                                    whileTap={{ scale: 0.92 }}
                                                    title="Open"
                                                >
                                                    <FiEye className="h-4 w-4" />
                                                </motion.button>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-1">
                                                    <motion.a
                                                        href={doc.file || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        download
                                                        className={`rounded p-1.5 ${
                                                            doc.file
                                                                ? 'text-green-600 hover:bg-green-50'
                                                                : 'pointer-events-none text-slate-300'
                                                        }`}
                                                        whileHover={{ scale: doc.file ? 1.08 : 1 }}
                                                        whileTap={{ scale: doc.file ? 0.92 : 1 }}
                                                        title="Download"
                                                    >
                                                        <FiDownload className="h-4 w-4" />
                                                    </motion.a>
                                                    <motion.button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDelete(doc.document_id)
                                                        }
                                                        className="rounded p-1.5 text-red-600 hover:bg-red-50"
                                                        whileHover={{ scale: 1.08 }}
                                                        whileTap={{ scale: 0.92 }}
                                                        title="Remove from selection"
                                                    >
                                                        <FiTrash2 className="h-4 w-4" />
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>

                        {!listLoading && documents.length === 0 && !listError && (
                            <div className="py-12 text-center text-slate-500">
                                <FiFile className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                                <p>No documents match your search.</p>
                            </div>
                        )}

                        {documents.length > 0 && (
                            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-3 py-3 sm:flex-row sm:items-center sm:px-4">
                                <p className="text-xs text-slate-600 sm:text-sm">
                                    Page{' '}
                                    <span className="font-semibold text-slate-900">
                                        {pagination.page_no ?? pageNo}
                                    </span>
                                    {pagination.total_pages != null && (
                                        <>
                                            {' '}
                                            of{' '}
                                            <span className="font-semibold text-slate-900">
                                                {pagination.total_pages}
                                            </span>
                                        </>
                                    )}
                                    <span className="hidden sm:inline">
                                        {' '}
                                        · {documents.length} on this page
                                    </span>
                                </p>
                                <div className="flex items-center justify-center gap-2 sm:justify-end">
                                    <motion.button
                                        type="button"
                                        onClick={goPrevPage}
                                        disabled={pageNo <= 1 || listLoading}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        whileTap={{ scale: 0.97 }}
                                    >
                                        <FiChevronLeft className="h-4 w-4" />
                                        Previous
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        onClick={goNextPage}
                                        disabled={
                                            listLoading ||
                                            pagination.is_last_page === true ||
                                            documents.length === 0
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        whileTap={{ scale: 0.97 }}
                                    >
                                        Next
                                        <FiChevronRight className="h-4 w-4" />
                                    </motion.button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

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
        </div>
    );
};

export default DocumentsTab;
