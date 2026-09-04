import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiFile,
  FiPaperclip,
  FiLoader,
  FiUpload,
  FiTrash2,
  FiPlus,
  FiCheck,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import CustomSelect from '../CustomSelect';
import { optionByValue } from '../../utils/customSelectHelpers';
import { uploadOneSaasFile } from '../../utils/onesaas-upload';

const formatUnderscoreLabel = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const PANEL_MAX_H =
  'max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[min(calc(100vh-2rem),100dvh)]';

const BODY_SCROLL =
  'flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

const INPUT_CLASS =
  'w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:bg-slate-50';

const LABEL_CLASS = 'block text-xs font-semibold text-slate-600 mb-1.5';

/** Viewport-safe modal shell — see CLIENT/context/modal.md */
function ModalShell({
  isOpen,
  onClose,
  title,
  maxWidthClass = 'max-w-md',
  children,
  footer,
  disableClose = false,
  closeOnBackdrop = true,
  headerExtra = null,
  shellKey = 'document-modal-root',
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !disableClose) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, disableClose, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key={shellKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-hidden="true"
            onClick={
              !disableClose && closeOnBackdrop ? onClose : undefined
            }
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-modal-title"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`relative z-[1] pointer-events-auto flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl w-full ${PANEL_MAX_H} ${maxWidthClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="shrink-0 border-b border-gray-200 px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <h3
                  id="document-modal-title"
                  className="text-base font-bold text-slate-800 truncate"
                >
                  {title}
                </h3>
                {headerExtra}
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={disableClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <FiX className="w-5 h-5 text-slate-500" />
              </button>
            </header>

            <div
              className={BODY_SCROLL}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {children}
            </div>

            {footer ? (
              <footer className="shrink-0 border-t border-gray-200 px-5 py-3 bg-white">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

const VIEW_SKIP_KEYS = new Set([
  'id',
  'firm_id',
  'firm_name',
  'firm_type',
  'file_url',
  'mime_type',
  'size',
  'create_date',
  'type_value',
]);

export function DocumentViewModal({ isOpen, document: doc, onClose }) {
  const handleDownload = async () => {
    if (!doc?.file_url) return;

    try {
      const response = await fetch(doc.file_url, { method: 'GET' });
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.file_url.split('/').pop() || 'download';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  };

  const handleViewInNewTab = () => {
    if (doc?.file_url) {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      shellKey="document-view-modal"
      title="Document Details"
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          {doc?.file_url ? (
            <>
              <button
                type="button"
                onClick={handleViewInNewTab}
                className="px-5 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium flex items-center gap-2 text-sm"
              >
                <FiExternalLink className="w-4 h-4" />
                View
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm"
              >
                <FiDownload className="w-4 h-4" />
                Download
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-slate-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {doc?.file_url ? (
          <div className="flex justify-center mb-2">
            {doc.mime_type?.startsWith('image/') ? (
              <img
                src={doc.file_url}
                alt="Document"
                className="max-w-full max-h-64 rounded-lg border border-gray-200 cursor-pointer"
                onClick={handleViewInNewTab}
              />
            ) : (
              <div className="w-full p-8 bg-gray-50 rounded-lg text-center">
                <FiFileText className="w-16 h-16 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-4">Preview not available</p>
                <button
                  type="button"
                  onClick={handleViewInNewTab}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <FiExternalLink className="w-4 h-4" />
                  View in New Tab
                </button>
              </div>
            )}
          </div>
        ) : null}

        {doc
          ? Object.entries(doc).map(([key, value]) =>
              !VIEW_SKIP_KEYS.has(key) ? (
                <div key={key} className="flex border-b border-slate-100 pb-3">
                  <span className="w-1/3 text-xs font-semibold text-slate-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="w-2/3 text-sm text-slate-800 break-words">
                    {value || '-'}
                  </span>
                </div>
              ) : null
            )
          : null}

        {doc?.size ? (
          <div className="flex border-b border-slate-100 pb-3">
            <span className="w-1/3 text-xs font-semibold text-slate-600">File Size:</span>
            <span className="w-2/3 text-sm text-slate-800">
              {(doc.size / 1024).toFixed(2)} KB
            </span>
          </div>
        ) : null}

        {doc?.create_date ? (
          <div className="flex border-b border-slate-100 pb-3">
            <span className="w-1/3 text-xs font-semibold text-slate-600">Uploaded On:</span>
            <span className="w-2/3 text-sm text-slate-800">
              {new Date(doc.create_date).toLocaleString()}
            </span>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

export function DocumentCreateCategoryModal({ isOpen, onClose, onCreate, loading }) {
  const [name, setName] = useState('');
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setRemark('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (name.trim()) {
      onCreate({ name: name.trim(), remark: remark.trim() });
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      shellKey="document-create-category-modal"
      title="Create Category"
      maxWidthClass="max-w-md"
      disableClose={loading}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-2.5 border border-gray-300 text-slate-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex-1 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Category'
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>Name *</label>
          <input
            type="text"
            placeholder="Enter category name"
            className={INPUT_CLASS}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Remark</label>
          <textarea
            rows="3"
            placeholder="Enter remark (optional)"
            className={INPUT_CLASS}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
    </ModalShell>
  );
}

export function DocumentEditCategoryModal({
  isOpen,
  onClose,
  onEdit,
  loading,
  category,
}) {
  const [name, setName] = useState(category?.name || '');
  const [remark, setRemark] = useState(category?.remark || '');

  useEffect(() => {
    if (isOpen && category) {
      setName(category.name || '');
      setRemark(category.remark || '');
    }
  }, [isOpen, category]);

  const handleSubmit = () => {
    if (name.trim()) {
      onEdit({ name: name.trim(), remark: remark.trim() });
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      shellKey="document-edit-category-modal"
      title="Edit Category"
      maxWidthClass="max-w-md"
      disableClose={loading}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-2.5 border border-gray-300 text-slate-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex-1 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Category'
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>Name *</label>
          <input
            type="text"
            placeholder="Enter category name"
            className={INPUT_CLASS}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Remark</label>
          <textarea
            rows="3"
            placeholder="Enter remark (optional)"
            className={INPUT_CLASS}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
    </ModalShell>
  );
}

const createUploadDocId = () =>
  `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyUploadDoc = () => ({
  id: createUploadDocId(),
  file: null,
  file_url: '',
  uploadStatus: 'idle', // idle | uploading | done | error
  uploadProgress: 0,
  uploadError: '',
  year: '',
  month: '',
  type: '',
  name: '',
  category: '',
  remark: '',
});

export function DocumentUploadModal({
  isOpen,
  onClose,
  tab,
  firms,
  loadingFirms,
  assessmentYears,
  financialYears,
  loadingYears,
  documentTypes,
  loadingTypes,
  categories,
  loadingCategories,
  months,
  onSubmit,
  uploadLoading,
  uploadProgress,
}) {
  const [documents, setDocuments] = useState([emptyUploadDoc()]);
  const [selectedFirm, setSelectedFirm] = useState('');
  const fileInputRefs = useRef({});

  useEffect(() => {
    if (isOpen) {
      setDocuments([emptyUploadDoc()]);
      setSelectedFirm('');
      fileInputRefs.current = {};
    }
  }, [isOpen, tab]);

  const firmOptions = (firms || []).map((firm) => {
    const name = firm.firm_name || firm.name || '-';
    const pan = String(firm.pan_no || '')
      .trim()
      .toUpperCase() || '—';
    const type = String(firm.firm_type || firm.type || '')
      .replace(/_/g, ' ')
      .trim()
      .toUpperCase() || '—';
    return {
      value: firm.firm_id || firm.id,
      label: `${name} | ${pan} | ${type}`,
      searchText: `${name} ${pan} ${type}`,
    };
  });

  const getYearOptions = () => {
    if (tab === 'income-tax') return assessmentYears || [];
    if (tab === 'gst' || tab === 'mca') return financialYears || [];
    return [];
  };

  const getYearLabel = () => {
    if (tab === 'income-tax') return 'Assessment Year';
    if (tab === 'gst' || tab === 'mca') return 'Financial Year';
    return 'Year';
  };

  const getCurrentTabTypes = () => {
    if (tab === 'income-tax') return documentTypes?.it || [];
    if (tab === 'gst') return documentTypes?.gst || [];
    if (tab === 'mca') return documentTypes?.mca || [];
    return [];
  };

  const typeOptions = getCurrentTabTypes().map((type) => ({
    value: type.value,
    label: formatUnderscoreLabel(type.name || type.value),
  }));

  const yearOptions = getYearOptions().map((year) => ({ value: year, label: year }));

  const monthOptions = (months || []).map((month) => ({
    value: month.split(' ')[0].toLowerCase(),
    label: month,
  }));

  const categoryOptions = (categories || []).map((cat) => ({
    value: cat.category_id || cat.id,
    label: cat.name,
  }));

  const patchDocument = (docId, patch) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, ...patch } : doc))
    );
  };

  const addDocumentEntry = () => {
    setDocuments((prev) => [emptyUploadDoc(), ...prev]);
  };

  const removeDocumentEntry = (docId) => {
    setDocuments((prev) => {
      if (prev.length <= 1) {
        return [emptyUploadDoc()];
      }
      return prev.filter((doc) => doc.id !== docId);
    });
    delete fileInputRefs.current[docId];
  };

  const uploadFileForDoc = async (docId, file) => {
    patchDocument(docId, {
      file,
      file_url: '',
      uploadStatus: 'uploading',
      uploadProgress: 0,
      uploadError: '',
    });

    try {
      const { url } = await uploadOneSaasFile(file, (progress) => {
        patchDocument(docId, { uploadProgress: progress });
      });
      patchDocument(docId, {
        file_url: url,
        uploadStatus: 'done',
        uploadProgress: 100,
        uploadError: '',
      });
    } catch (error) {
      console.error('OneSaaS upload failed:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Upload failed';
      patchDocument(docId, {
        file_url: '',
        uploadStatus: 'error',
        uploadProgress: 0,
        uploadError: message,
      });
      toast.error(message);
    }
  };

  const handleFileSelect = (docId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds 50MB limit');
      e.target.value = '';
      return;
    }

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;
        const next = { ...doc, file };
        if (tab === 'general' && !doc.name) {
          next.name = file.name.split('.').slice(0, -1).join('.');
        }
        return next;
      })
    );

    uploadFileForDoc(docId, file);
  };

  const removeFile = (docId) => {
    patchDocument(docId, {
      file: null,
      file_url: '',
      uploadStatus: 'idle',
      uploadProgress: 0,
      uploadError: '',
    });
    if (fileInputRefs.current[docId]) {
      fileInputRefs.current[docId].value = '';
    }
  };

  const anyFileUploading = documents.some((d) => d.uploadStatus === 'uploading');

  const handleSubmit = () => {
    if (!selectedFirm) {
      toast.error('Please select a firm');
      return;
    }

    if (anyFileUploading) {
      toast.error('Please wait for file uploads to finish');
      return;
    }

    const invalidDocs = documents.filter((doc) => {
      if (!doc.file_url || doc.uploadStatus !== 'done') return true;
      if (tab === 'general') return !doc.name || !doc.category;
      if (!doc.type) return true;
      if (!doc.year) return true;
      if (tab === 'gst' && !doc.month) return true;
      return false;
    });

    if (invalidDocs.length > 0) {
      toast.error('Please complete all required fields and finish uploads');
      return;
    }

    onSubmit(selectedFirm, documents);
  };

  const getTabTitle = () => {
    switch (tab) {
      case 'income-tax':
        return 'Income Tax Documents';
      case 'gst':
        return 'GST Documents';
      case 'mca':
        return 'MCA Documents';
      case 'general':
        return 'General Documents';
      default:
        return 'Documents';
    }
  };

  const readyCount = documents.filter((d) => d.uploadStatus === 'done' && d.file_url).length;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      shellKey="document-upload-modal"
      title={`Upload ${getTabTitle()}`}
      maxWidthClass="max-w-6xl"
      disableClose={uploadLoading || anyFileUploading}
      closeOnBackdrop={false}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            <span className="text-slate-700 font-medium">{readyCount}</span> of{' '}
            <span className="text-slate-700 font-medium">{documents.length}</span>{' '}
            document(s) ready
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploadLoading || anyFileUploading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-slate-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                !selectedFirm ||
                readyCount === 0 ||
                anyFileUploading ||
                uploadLoading ||
                documents.some((d) => d.uploadStatus !== 'done' || !d.file_url)
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploadLoading ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiUpload className="w-4 h-4" />
                  <span>
                    Save {readyCount} Document{readyCount !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Compact firm row + add card */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <CustomSelect
              options={firmOptions}
              value={optionByValue(firmOptions, selectedFirm)}
              onChange={(opt) => setSelectedFirm(opt?.value || '')}
              placeholder={loadingFirms ? 'Loading firms...' : 'Select firm *'}
              searchPlaceholder="Search firm..."
              isDisabled={uploadLoading || loadingFirms}
              isClearable={false}
            />
          </div>
          <button
            type="button"
            onClick={addDocumentEntry}
            disabled={uploadLoading}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
            aria-label="Add document card"
          >
            <FiPlus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Card grid — 3 on large screens; newest cards first */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {documents.map((doc, index) => (
            <div
              key={doc.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                    {index + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    Document
                  </span>
                  {doc.uploadStatus === 'uploading' ? (
                    <span className="text-[10px] font-medium text-blue-600">Uploading…</span>
                  ) : null}
                  {doc.uploadStatus === 'done' ? (
                    <span className="text-[10px] font-medium text-emerald-600">Uploaded</span>
                  ) : null}
                  {doc.uploadStatus === 'error' ? (
                    <span className="text-[10px] font-medium text-red-600">Failed</span>
                  ) : null}
                </div>
                {documents.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeDocumentEntry(doc.id)}
                    disabled={uploadLoading || doc.uploadStatus === 'uploading'}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    aria-label="Remove document card"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>

              {/* File picker / status */}
              <div>
                {!doc.file ? (
                  <div
                    onClick={() =>
                      !uploadLoading && fileInputRefs.current[doc.id]?.click()
                    }
                    className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="file"
                      ref={(el) => {
                        fileInputRefs.current[doc.id] = el;
                      }}
                      onChange={(e) => handleFileSelect(doc.id, e)}
                      className="hidden"
                      disabled={uploadLoading}
                    />
                    <FiPaperclip className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="text-[11px] font-medium text-slate-600">
                      Choose file
                    </span>
                    <span className="text-[10px] text-slate-400">max 50MB</span>
                  </div>
                ) : (
                  <div
                    className={`relative overflow-hidden rounded-lg border px-2 py-1.5 transition-colors ${
                      doc.uploadStatus === 'done'
                        ? 'border-emerald-300/80 bg-gradient-to-r from-emerald-50 via-white to-teal-50'
                        : doc.uploadStatus === 'error'
                          ? 'border-red-200 bg-red-50/80'
                          : doc.uploadStatus === 'uploading'
                            ? 'border-indigo-200 bg-indigo-50/70'
                            : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <AnimatePresence>
                      {doc.uploadStatus === 'done' ? (
                        <motion.span
                          key={`glow-${doc.id}`}
                          initial={{ opacity: 0.7, scale: 0.6 }}
                          animate={{ opacity: 0, scale: 1.8 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                          className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-emerald-400/40"
                          aria-hidden
                        />
                      ) : null}
                    </AnimatePresence>

                    <div className="relative flex items-center gap-2">
                      <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                        {doc.uploadStatus === 'done' ? (
                          <motion.div
                            key={`ok-${doc.id}`}
                            initial={{ scale: 0.2, opacity: 0, rotate: -20 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 480, damping: 16 }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-200/80"
                          >
                            <FiCheck className="h-3.5 w-3.5" strokeWidth={3} />
                          </motion.div>
                        ) : doc.uploadStatus === 'uploading' ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 ring-2 ring-indigo-200/60">
                            <FiLoader className="h-3.5 w-3.5 animate-spin" />
                          </div>
                        ) : doc.uploadStatus === 'error' ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <FiX className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600">
                            <FiFile className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">
                          {doc.file.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] leading-none">
                          <span className="text-slate-500 tabular-nums">
                            {doc.file.size >= 1024 * 1024
                              ? `${(doc.file.size / (1024 * 1024)).toFixed(1)} MB`
                              : `${(doc.file.size / 1024).toFixed(1)} KB`}
                          </span>
                          {doc.uploadStatus === 'uploading' ? (
                            <span className="font-semibold text-indigo-600 tabular-nums">
                              {doc.uploadProgress || 0}%
                            </span>
                          ) : null}
                          {doc.uploadStatus === 'done' ? (
                            <motion.span
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.12, type: 'spring', stiffness: 320, damping: 20 }}
                              className="font-semibold text-emerald-600"
                            >
                              Ready
                            </motion.span>
                          ) : null}
                          {doc.uploadStatus === 'error' ? (
                            <span className="font-medium text-red-600 truncate">
                              {doc.uploadError || 'Failed'}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(doc.id)}
                        disabled={uploadLoading || doc.uploadStatus === 'uploading'}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-white/80 rounded disabled:opacity-50 shrink-0"
                        aria-label="Remove file"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {doc.uploadStatus === 'uploading' ? (
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-indigo-100">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${doc.uploadProgress || 0}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                    ) : null}

                    {doc.uploadStatus === 'done' ? (
                      <motion.div
                        initial={{ scaleX: 0, opacity: 0.4 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400"
                      />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Fields */}
              <div className="space-y-2">
                {(tab === 'income-tax' || tab === 'gst' || tab === 'mca') && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">
                      Type *
                    </label>
                    <CustomSelect
                      options={typeOptions}
                      value={optionByValue(typeOptions, doc.type)}
                      onChange={(opt) =>
                        patchDocument(doc.id, { type: opt?.value || '' })
                      }
                      placeholder={loadingTypes ? 'Loading...' : 'Select type'}
                      searchPlaceholder="Search type..."
                      isDisabled={uploadLoading || loadingTypes}
                      isClearable={false}
                    />
                  </div>
                )}

                {(tab === 'income-tax' || tab === 'gst' || tab === 'mca') && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">
                      {getYearLabel()} *
                    </label>
                    <CustomSelect
                      options={yearOptions}
                      value={optionByValue(yearOptions, doc.year)}
                      onChange={(opt) =>
                        patchDocument(doc.id, { year: opt?.value || '' })
                      }
                      placeholder={loadingYears ? 'Loading...' : 'Select year'}
                      searchPlaceholder="Search year..."
                      isDisabled={uploadLoading || loadingYears}
                      isClearable={false}
                    />
                  </div>
                )}

                {tab === 'gst' && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">
                      Month *
                    </label>
                    <CustomSelect
                      options={monthOptions}
                      value={optionByValue(monthOptions, doc.month)}
                      onChange={(opt) =>
                        patchDocument(doc.id, { month: opt?.value || '' })
                      }
                      placeholder="Select month"
                      searchPlaceholder="Search month..."
                      isDisabled={uploadLoading}
                      isClearable={false}
                    />
                  </div>
                )}

                {tab === 'general' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        value={doc.name || ''}
                        onChange={(e) =>
                          patchDocument(doc.id, { name: e.target.value })
                        }
                        placeholder="Document name"
                        disabled={uploadLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Category *
                      </label>
                      <CustomSelect
                        options={categoryOptions}
                        value={optionByValue(categoryOptions, doc.category)}
                        onChange={(opt) =>
                          patchDocument(doc.id, { category: opt?.value || '' })
                        }
                        placeholder={
                          loadingCategories ? 'Loading...' : 'Select category'
                        }
                        searchPlaceholder="Search category..."
                        isDisabled={uploadLoading || loadingCategories}
                        isClearable={false}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">
                    Remark
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[4.5rem]"
                    value={doc.remark || ''}
                    onChange={(e) =>
                      patchDocument(doc.id, { remark: e.target.value })
                    }
                    placeholder="Optional remark"
                    disabled={uploadLoading}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {uploadProgress > 0 && uploadProgress < 100 ? (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between text-xs text-blue-700 mb-1">
              <span>Saving documents...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

export default {
  DocumentViewModal,
  DocumentCreateCategoryModal,
  DocumentEditCategoryModal,
  DocumentUploadModal,
};
