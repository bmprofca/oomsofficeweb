import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFile, FiUpload, FiEye, FiDownload, FiFolder, FiSearch,
  FiHardDrive, FiCheckCircle, FiXCircle, FiClock, FiFileText, FiImage,
  FiArchive, FiPrinter, FiTrash2, FiPlus, FiX,
  FiChevronDown, FiChevronUp, FiGrid, FiList, FiCalendar,
  FiBriefcase, FiUsers, FiHome, FiCheckSquare,
  FiSquare, FiChevronLeft, FiChevronRight, FiMoreVertical,
  FiMail, FiMessageCircle, FiSend, FiPaperclip, FiLoader,
  FiAlertCircle, FiCheck, FiEdit2, FiExternalLink
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import { SiWhatsapp } from 'react-icons/si';
import axios from 'axios';
import TablePagination from '../components/TablePagination';
import DocumentStorageUsageModal from '../components/Modals/DocumentStorageUsageModal';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import { uploadOneSaasFile } from '../utils/onesaas-upload';
import { toast, Toaster } from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import { optionByValue } from '../utils/customSelectHelpers';

const formatUnderscoreLabel = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

// Professional Toast Configuration - No Icons
const toastConfig = {
    duration: 4000,
    position: 'top-right',
    style: {
        borderRadius: '8px',
        background: '#fff',
        fontSize: '14px',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e2e8f0',
        maxWidth: '380px',
    },
    success: {
        duration: 4000,
        style: {
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #86efac',
        },
    },
    error: {
        duration: 5000,
        style: {
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fca5a5',
        },
    },
    warning: {
        duration: 4500,
        style: {
            background: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fcd34d',
        },
    },
    loading: {
        duration: Infinity,
        style: {
            background: '#eff6ff',
            color: '#1e40af',
            border: '1px solid #93c5fd',
        },
    },
    info: {
        duration: 4000,
        style: {
            background: '#eff6ff',
            color: '#1e40af',
            border: '1px solid #93c5fd',
        },
    },
};

// Custom toast functions - No Icons
const showToast = {
    success: (message, options = {}) => {
        toast.success(message, {
            ...toastConfig,
            ...toastConfig.success,
            ...options,
            icon: null,
        });
    },
    error: (message, options = {}) => {
        toast.error(message, {
            ...toastConfig,
            ...toastConfig.error,
            ...options,
            icon: null,
        });
    },
    warning: (message, options = {}) => {
        toast(message, {
            ...toastConfig,
            ...toastConfig.warning,
            ...options,
            icon: null,
        });
    },
    loading: (message, options = {}) => {
        return toast.loading(message, {
            ...toastConfig,
            ...toastConfig.loading,
            ...options,
            icon: null,
        });
    },
    info: (message, options = {}) => {
        toast(message, {
            ...toastConfig,
            ...toastConfig.info,
            ...options,
            icon: null,
        });
    },
    dismiss: (toastId) => {
        toast.dismiss(toastId);
    },
    dismissAll: () => {
        toast.dismiss();
    },
};

// Animated checkbox (match `CLIENT/context/checkbox.md` AnimatedCheckbox)
const AnimatedCheckbox = ({
    checked,
    indeterminate = false,
    onChange,
    ariaLabel,
    disabled = false
}) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.indeterminate = indeterminate;
        }
    }, [indeterminate, checked]);

    const isActive = checked || indeterminate;

    return (
        <label
            className={`relative inline-flex items-center group ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}
        >
            <input
                ref={inputRef}
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={onChange}
                aria-label={ariaLabel}
                disabled={disabled}
            />

            <motion.span
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-2 transition-colors duration-200 ${
                    isActive
                        ? "border-indigo-600 bg-indigo-600 shadow-sm shadow-indigo-200"
                        : "border-gray-300 bg-white group-hover:border-indigo-400"
                }`}
                animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}
                transition={{ duration: 0.18 }}
                whileTap={disabled ? {} : { scale: 0.92 }}
            >
                <AnimatePresence initial={false} mode="wait">
                    {indeterminate ? (
                        <motion.span
                            key="dash"
                            className="block h-0.5 w-2 rounded-full bg-white"
                            initial={{ opacity: 0, scaleX: 0.4 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0, scaleX: 0.4 }}
                            transition={{ duration: 0.12 }}
                        />
                    ) : checked ? (
                        <motion.svg
                            key="check"
                            viewBox="0 0 12 12"
                            className="h-3 w-3 text-white"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.15 }}
                        >
                            <path
                                d="M2.5 6l2.2 2.2 4.8-4.8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </motion.svg>
                    ) : null}
                </AnimatePresence>
            </motion.span>
        </label>
    );
};

// View Modal Component
const ViewModal = ({ document: doc, onClose }) => {
 const handleDownload = async () => {
  if (!doc?.file_url) return;

  try {
    const response = await fetch(doc.file_url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;

    // filename
    const fileName = doc.file_url.split('/').pop() || 'download';
    a.download = fileName;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    showToast.error('Download failed');
  }
};

  const handleViewInNewTab = () => {
    if (doc?.file_url) {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-slate-800">Document Details</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
          <div className="space-y-4">
            {doc?.file_url && (
              <div className="flex justify-center mb-4">
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
                      onClick={handleViewInNewTab}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FiExternalLink className="w-4 h-4" />
                      View in New Tab
                    </button>
                  </div>
                )}
              </div>
            )}
            {doc && Object.entries(doc).map(([key, value]) =>
              key !== 'id' && key !== 'firm_id' && key !== 'firm_name' && key !== 'firm_type' && key !== 'file_url' && key !== 'mime_type' && key !== 'size' && key !== 'create_date' && key !== 'type_value' && (
                <div key={key} className="flex border-b border-gray-100 pb-3">
                  <span className="w-1/3 text-xs font-semibold text-slate-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="w-2/3 text-sm text-slate-800 break-words">{value || '-'}</span>
                </div>
              )
            )}
            {doc?.size && (
              <div className="flex border-b border-gray-100 pb-3">
                <span className="w-1/3 text-xs font-semibold text-slate-600">File Size:</span>
                <span className="w-2/3 text-sm text-slate-800">{(doc.size / 1024).toFixed(2)} KB</span>
              </div>
            )}
            {doc?.create_date && (
              <div className="flex border-b border-gray-100 pb-3">
                <span className="w-1/3 text-xs font-semibold text-slate-600">Uploaded On:</span>
                <span className="w-2/3 text-sm text-slate-800">{new Date(doc.create_date).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            {doc?.file_url && (
              <>
                <button
                  onClick={handleViewInNewTab}
                  className="px-6 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
                >
                  <FiExternalLink className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                  <FiDownload className="w-4 h-4" />
                  Download
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-slate-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Create Category Modal
const CreateCategoryModal = ({ onClose, onCreate, loading }) => {
  const [name, setName] = useState('');
  const [remark, setRemark] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onCreate({ name: name.trim(), remark: remark.trim() });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-slate-800">Create Category</h3>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">Name *</label>
              <input
                type="text"
                placeholder="Enter category name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">Remark</label>
              <textarea
                rows="3"
                placeholder="Enter remark (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                disabled={loading}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-slate-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !name.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Category'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Edit Category Modal
const EditCategoryModal = ({ onClose, onEdit, loading, category }) => {
  const [name, setName] = useState(category?.name || '');
  const [remark, setRemark] = useState(category?.remark || '');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setRemark(category.remark || '');
    }
  }, [category]);

  const handleSubmit = () => {
    if (name.trim()) {
      onEdit({ name: name.trim(), remark: remark.trim() });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-slate-800">Edit Category</h3>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">Name *</label>
              <input
                type="text"
                placeholder="Enter category name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">Remark</label>
              <textarea
                rows="3"
                placeholder="Enter remark (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                disabled={loading}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-slate-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !name.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Category'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Send Modal Component
const SendModal = ({ document, selectedDocuments, onClose, onSubmit, loading }) => {
  const [sendOption, setSendOption] = useState('whatsapp');
  const [recipient, setRecipient] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [message, setMessage] = useState('');

  const handleFileAttachment = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (recipient.trim()) {
      onSubmit({
        sendOption,
        recipient: recipient.trim(),
        message: message.trim(),
        attachments
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-slate-800">
            Send {document ? 'Document' : 'Documents'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
          <div className="space-y-6">
            {!document && selectedDocuments?.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  Sending {selectedDocuments.length} selected document(s)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">Send via *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSendOption('whatsapp')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${sendOption === 'whatsapp'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                  type="button"
                >
                  <SiWhatsapp className="w-5 h-5" />
                  <span className="text-sm font-medium">WhatsApp</span>
                </button>
                <button
                  onClick={() => setSendOption('email')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${sendOption === 'email'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                  type="button"
                >
                  <FiMail className="w-5 h-5" />
                  <span className="text-sm font-medium">Email</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">
                {sendOption === 'whatsapp' ? 'Phone Number *' : 'Email Address *'}
              </label>
              <input
                type={sendOption === 'whatsapp' ? 'tel' : 'email'}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={sendOption === 'whatsapp' ? 'Enter phone number' : 'Enter email address'}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">Message (Optional)</label>
              <textarea
                rows="3"
                placeholder="Enter your message"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">Attachments</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileAttachment}
                  className="hidden"
                  id="file-upload"
                  disabled={loading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FiPaperclip className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Click to attach files</p>
                  <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG up to 10MB each</p>
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                      <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                        type="button"
                        disabled={loading}
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <FiFile className="w-4 h-4" />
                {document ? 'Selected document will be attached automatically' : 'Selected documents will be attached automatically'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-slate-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !recipient.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <FiSend className="w-4 h-4" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Document Entry Component for Multiple Uploads
const DocumentEntry = ({ index, document, onUpdate, onRemove, showRemove, tab, documentTypes, loadingTypes, months, uploadLoading }) => {
  const currentTabTypes = (() => {
    if (tab === 'income-tax') return documentTypes.it || [];
    if (tab === 'gst') return documentTypes.gst || [];
    if (tab === 'mca') return documentTypes.mca || [];
    return [];
  })();

  const handleChange = (field, value) => {
    onUpdate(index, { ...document, [field]: value });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      showToast.error(`File exceeds the 10MB limit. Please upload a smaller file.`);
      return;
    }

    handleChange('file', file);

    if (tab === 'general' && !document.name) {
      const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
      handleChange('name', fileNameWithoutExt);
    }
  };

  const removeFile = () => {
    handleChange('file', null);
    if (document.fileInputRef?.current) {
      document.fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-slate-700">Document #{index + 1}</h4>
        {showRemove && (
          <button
            onClick={() => onRemove(index)}
            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            disabled={uploadLoading}
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* File Upload */}
        <div className="col-span-2">
          {!document.file ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-3 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => document.fileInputRef?.current?.click()}
            >
              <input
                type="file"
                ref={document.fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploadLoading}
              />
              <FiPaperclip className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-600">Click to upload file</p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FiFile className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-800 truncate max-w-[150px]">{document.file.name}</p>
                    <p className="text-xs text-slate-500">{(document.file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  disabled={uploadLoading}
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Name Field (for General tab) */}
        {tab === 'general' && (
          <div className="col-span-2">
            <input
              type="text"
              placeholder="Document Name *"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={document.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={uploadLoading}
            />
          </div>
        )}

        {/* Year Field */}
        {(tab === 'income-tax' || tab === 'gst' || tab === 'mca') && (
          <div>
            <input
              type="text"
              placeholder={tab === 'income-tax' ? 'AY (e.g., 2025-26)' : 'FY (e.g., 2025-26)'}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={document.year || ''}
              onChange={(e) => handleChange('year', e.target.value)}
              disabled={uploadLoading}
            />
          </div>
        )}

        {/* Month Field (for GST) */}
        {tab === 'gst' && (
          <div>
            <CustomSelect
              options={months.map((month) => ({
                value: month.split(' ')[0].toLowerCase(),
                label: month,
              }))}
              value={optionByValue(
                months.map((month) => ({
                  value: month.split(' ')[0].toLowerCase(),
                  label: month,
                })),
                document.month || '',
              )}
              onChange={(opt) => handleChange('month', opt?.value || '')}
              placeholder="Select Month"
              searchPlaceholder="Search month..."
              isDisabled={uploadLoading}
              isClearable={false}
            />
          </div>
        )}

        {/* Type Field */}
        {(tab === 'income-tax' || tab === 'gst' || tab === 'mca') && (
          <div>
            <CustomSelect
              options={currentTabTypes.map((type) => ({
                value: type.value,
                label: formatUnderscoreLabel(type.name || type.value),
              }))}
              value={optionByValue(
                currentTabTypes.map((type) => ({
                  value: type.value,
                  label: formatUnderscoreLabel(type.name || type.value),
                })),
                document.type || '',
              )}
              onChange={(opt) => handleChange('type', opt?.value || '')}
              placeholder={loadingTypes ? 'Loading...' : 'Select Type'}
              searchPlaceholder="Search type..."
              isDisabled={uploadLoading || loadingTypes}
              isClearable={false}
            />
          </div>
        )}

        {/* Category Field (for General) */}
        {tab === 'general' && (
          <div>
            <input
              type="text"
              placeholder="Category *"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={document.category || ''}
              onChange={(e) => handleChange('category', e.target.value)}
              disabled={uploadLoading}
            />
          </div>
        )}

        {/* Remark Field */}
        <div className={tab === 'gst' ? 'col-span-2' : 'col-span-1'}>
          <input
            type="text"
            placeholder="Remark"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={document.remark || ''}
            onChange={(e) => handleChange('remark', e.target.value)}
            disabled={uploadLoading}
          />
        </div>
      </div>
    </div>
  );
};

// Upload Modal Component
const UploadModal = ({ onClose, tab, firms, loadingFirms, assessmentYears, financialYears, loadingYears, documentTypes, loadingTypes, categories, loadingCategories, months, onSubmit, uploadLoading, uploadProgress }) => {
  const [documents, setDocuments] = useState([]);
  const [selectedFirm, setSelectedFirm] = useState('');
  const fileInputRefs = useRef([]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Get current tab's years
  const getYearOptions = () => {
    if (tab === 'income-tax') return assessmentYears;
    if (tab === 'gst' || tab === 'mca') return financialYears;
    return [];
  };

  const getYearLabel = () => {
    if (tab === 'income-tax') return 'Assessment Year';
    if (tab === 'gst' || tab === 'mca') return 'Financial Year';
    return 'Year';
  };

  // Get current tab's document types
  const getCurrentTabTypes = () => {
    if (tab === 'income-tax') return documentTypes.it || [];
    if (tab === 'gst') return documentTypes.gst || [];
    if (tab === 'mca') return documentTypes.mca || [];
    return [];
  };

  // Add first document entry on mount
  useEffect(() => {
    addDocumentEntry();
  }, []);

  const addDocumentEntry = () => {
    const newDoc = {
      file: null,
      year: '',
      month: '',
      type: '',
      name: '',
      category: '',
      remark: '',
      fileInputRef: React.createRef()
    };
    setDocuments([...documents, newDoc]);
  };

  const removeDocumentEntry = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const updateDocument = (index, updatedDoc) => {
    const newDocs = [...documents];
    newDocs[index] = updatedDoc;
    setDocuments(newDocs);
  };

  const handleFileSelect = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      showToast.error(`File size exceeds 10MB limit`);
      return;
    }

    const updatedDoc = { ...documents[index], file };

    if (tab === 'general' && !documents[index].name) {
      const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
      updatedDoc.name = fileNameWithoutExt;
    }

    updateDocument(index, updatedDoc);
  };

  const removeFile = (index) => {
    const updatedDoc = { ...documents[index], file: null };
    updateDocument(index, updatedDoc);
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = '';
    }
  };

  const handleSubmit = () => {
    if (!selectedFirm) {
      showToast.error('Please select a firm');
      return;
    }

    const invalidDocs = documents.filter(doc => {
      if (!doc.file) return true;
      if (tab === 'general') return !doc.name || !doc.category;
      if (!doc.type) return true;
      if (!doc.year) return true;
      if (tab === 'gst' && !doc.month) return true;
      return false;
    });

    if (invalidDocs.length > 0) {
      showToast.error('Please complete all required fields');
      return;
    }

    onSubmit(selectedFirm, documents);
  };

  const getTabTitle = () => {
    switch (tab) {
      case 'income-tax': return 'Income Tax Documents';
      case 'gst': return 'GST Documents';
      case 'mca': return 'MCA Documents';
      case 'general': return 'General Documents';
      default: return 'Documents';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiUpload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Upload {getTabTitle()}</h2>
              <p className="text-sm text-slate-500">Add multiple documents at once</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Firm Selection */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                Select Firm <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                options={firms.map((firm) => ({
                  value: firm.firm_id || firm.id,
                  label: firm.firm_name || firm.name,
                }))}
                value={optionByValue(
                  firms.map((firm) => ({
                    value: firm.firm_id || firm.id,
                    label: firm.firm_name || firm.name,
                  })),
                  selectedFirm,
                )}
                onChange={(opt) => setSelectedFirm(opt?.value || '')}
                placeholder={loadingFirms ? 'Loading firms...' : 'Choose a firm'}
                searchPlaceholder="Search firm..."
                isDisabled={uploadLoading || loadingFirms}
                isClearable={false}
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <FiHardDrive className="w-4 h-4" />
              <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {documents.map((doc, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              {/* Document Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-700">Document Details</span>
                  {!doc.file && (
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">File Required</span>
                  )}
                </div>
                {documents.length > 1 && (
                  <button
                    onClick={() => removeDocumentEntry(index)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Document Fields - File Upload Now Takes Full Width in Next Row */}
              <div className="space-y-3">
                {/* First Row: Type, Year, Month, etc. */}
                <div className="grid grid-cols-4 gap-3">
                  {/* Document Type - Column 1 */}
                  {(tab === 'income-tax' || tab === 'gst' || tab === 'mca') && (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Document Type *</label>
                      <CustomSelect
                        options={getCurrentTabTypes().map((type) => ({
                          value: type.value,
                          label: formatUnderscoreLabel(type.name || type.value),
                        }))}
                        value={optionByValue(
                          getCurrentTabTypes().map((type) => ({
                            value: type.value,
                            label: formatUnderscoreLabel(type.name || type.value),
                          })),
                          doc.type
                        )}
                        onChange={(opt) => updateDocument(index, { ...doc, type: opt?.value || '' })}
                        placeholder="Select type"
                        searchPlaceholder="Search type..."
                        isClearable={false}
                      />
                    </div>
                  )}

                  {/* Year Field - Column 2 */}
                  {(tab === 'income-tax' || tab === 'gst' || tab === 'mca') && (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">{getYearLabel()} *</label>
                      <CustomSelect
                        options={getYearOptions().map((year) => ({ value: year, label: year }))}
                        value={optionByValue(getYearOptions().map((year) => ({ value: year, label: year })), doc.year)}
                        onChange={(opt) => updateDocument(index, { ...doc, year: opt?.value || '' })}
                        placeholder="Select year"
                        searchPlaceholder="Search year..."
                        isClearable={false}
                      />
                    </div>
                  )}

                  {/* Month Field - For GST only */}
                  {tab === 'gst' && (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Month *</label>
                      <CustomSelect
                        options={months.map((month) => ({ value: month.split(' ')[0].toLowerCase(), label: month }))}
                        value={optionByValue(months.map((month) => ({ value: month.split(' ')[0].toLowerCase(), label: month })), doc.month)}
                        onChange={(opt) => updateDocument(index, { ...doc, month: opt?.value || '' })}
                        placeholder="Select month"
                        searchPlaceholder="Search month..."
                        isClearable={false}
                      />
                    </div>
                  )}

                  {/* General Tab Fields (Name and Category) */}
                  {tab === 'general' && (
                    <>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Document Name *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          value={doc.name || ''}
                          onChange={(e) => updateDocument(index, { ...doc, name: e.target.value })}
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Category *</label>
                        <CustomSelect
                          options={categories.map((cat) => ({
                            value: cat.category_id || cat.id,
                            label: cat.name,
                          }))}
                          value={optionByValue(
                            categories.map((cat) => ({
                              value: cat.category_id || cat.id,
                              label: cat.name,
                            })),
                            doc.category
                          )}
                          onChange={(opt) => updateDocument(index, { ...doc, category: opt?.value || '' })}
                          placeholder="Select category"
                          searchPlaceholder="Search category..."
                          isClearable={false}
                        />
                      </div>
                    </>
                  )}

                  {/* Remark Field - Takes remaining space */}
                  <div className={`
                    ${tab === 'gst' ? 'col-span-1' : ''}
                    ${tab === 'income-tax' || tab === 'mca' ? 'col-span-2' : ''}
                    ${tab === 'general' ? 'col-span-2' : ''}
                  `}>
                    <label className="block text-xs text-slate-500 mb-1">Remark</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      value={doc.remark || ''}
                      onChange={(e) => updateDocument(index, { ...doc, remark: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* Second Row: File Upload - Full Width */}
                <div className="w-full">
                  <label className="block text-xs text-slate-500 mb-1">Upload File *</label>
                  {!doc.file ? (
                    <div
                      onClick={() => fileInputRefs.current[index]?.click()}
                      className="border-2 border-gray-300 border-dashed rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors w-full"
                    >
                      <input
                        type="file"
                        ref={el => fileInputRefs.current[index] = el}
                        onChange={(e) => handleFileSelect(index, e)}
                        className="hidden"
                      />
                      <FiPaperclip className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                      <span className="text-sm text-slate-600">Click to choose file or drag and drop</span>
                      <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG up to 10MB</p>
                    </div>
                  ) : (
                    <div className="border border-green-200 bg-green-50 rounded-lg p-3 w-full flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <FiFile className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{doc.file.name}</p>
                          <p className="text-xs text-green-600">{(doc.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add More Button */}
          <button
            onClick={addDocumentEntry}
            className="w-full py-3 border border-gray-300 border-dashed rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
          >
            <FiPlus className="w-4 h-4" />
            <span className="text-sm">Add Another Document</span>
          </button>

          {/* Progress Bar */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between text-xs text-blue-700 mb-1">
                <span>Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span className="text-slate-700 font-medium">{documents.length}</span> document(s) ready to upload
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-slate-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedFirm || documents.some(d => !d.file) || uploadLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {uploadLoading ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <FiUpload className="w-4 h-4" />
                  <span>Upload {documents.length} Document{documents.length !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main DocumentsTab Component
const DocumentsTab = ({ clientUsername }) => {
  const [activeTab, setActiveTab] = useState('income-tax');
  const [selectedFirm, setSelectedFirm] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState(null);
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showGeneralDropdown, setShowGeneralDropdown] = useState(false);
  const [showGeneralSubTab, setShowGeneralSubTab] = useState('documents'); // 'documents' or 'categories'
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Action menu portal state
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const actionAnchorRef = useRef(null);
  const firmsRef = useRef([]);
  const documentTypesRef = useRef({ it: [], gst: [], mca: [] });
  const fetchSeqRef = useRef(0);

  // Storage usage state
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal, setStorageTotal] = useState(5 * 1024 * 1024 * 1024); // 5GB in bytes

  // API Data States
  const [assessmentYears, setAssessmentYears] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [firms, setFirms] = useState([]);
  const [loadingFirms, setLoadingFirms] = useState(false);

  // Document Types State
  const [documentTypes, setDocumentTypes] = useState({
    it: [],
    gst: [],
    mca: []
  });
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Categories State for General tab
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    firmsRef.current = firms;
  }, [firms]);

  useEffect(() => {
    documentTypesRef.current = documentTypes;
  }, [documentTypes]);

  // Documents State
  const [documents, setDocuments] = useState({
    'income-tax': [],
    'gst': [],
    'mca': [],
    'task': [],
    'general': []
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
    is_last_page: true
  });

  // Months Data
  const months = useMemo(() => [
    'January 2024', 'February 2024', 'March 2024', 'April 2024',
    'May 2024', 'June 2024', 'July 2024', 'August 2024',
    'September 2024', 'October 2024', 'November 2024', 'December 2024'
  ], []);

  // Service Types for Task tab
  const serviceTypes = useMemo(() => ['Income Tax', 'GST', 'MCA', 'ROC', 'Audit'], []);

  // Tabs configuration (explicit Tailwind classes — avoid dynamic color strings)
  const tabs = useMemo(() => [
    {
      id: 'income-tax',
      label: 'Income Tax',
      shortLabel: 'IT',
      icon: FiBriefcase,
      activeText: 'text-blue-700',
      iconWrap: 'bg-blue-100 text-blue-700',
      indicator: 'bg-blue-600',
    },
    {
      id: 'gst',
      label: 'GST',
      shortLabel: 'GST',
      icon: TbCurrencyRupee,
      activeText: 'text-emerald-700',
      iconWrap: 'bg-emerald-100 text-emerald-700',
      indicator: 'bg-emerald-600',
    },
    {
      id: 'mca',
      label: 'MCA',
      shortLabel: 'MCA',
      icon: FiUsers,
      activeText: 'text-violet-700',
      iconWrap: 'bg-violet-100 text-violet-700',
      indicator: 'bg-violet-600',
    },
    {
      id: 'task',
      label: 'Task',
      shortLabel: 'Task',
      icon: FiCheckCircle,
      activeText: 'text-amber-700',
      iconWrap: 'bg-amber-100 text-amber-700',
      indicator: 'bg-amber-600',
    },
    {
      id: 'general',
      label: 'General',
      shortLabel: 'Gen',
      icon: FiHome,
      activeText: 'text-slate-800',
      iconWrap: 'bg-slate-200 text-slate-700',
      indicator: 'bg-slate-700',
    },
  ], []);

  // Compute floating action menu position (mirrors sale-display.jsx pattern)
  const computeActionMenuPosition = useCallback((anchorEl, options = {}) => {
    if (!anchorEl) return null;

    const itemCount = Math.max(1, Number(options.itemCount) || 4);
    const rect = anchorEl.getBoundingClientRect();
    const menuWidth = 176;
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
      placement = preferred.reduce(
        (best, p) => (space[p] > space[best] ? p : best),
        'bottom'
      );
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

    const clampedLeft = Math.max(margin, Math.min(left, vw - menuWidth - margin));
    const clampedTop = Math.max(margin, Math.min(top, vh - menuHeight - margin));

    return {
      top: clampedTop,
      left: clampedLeft,
      placement,
    };
  }, []);

  const closeActionMenu = useCallback(() => {
    setActiveActionMenu(null);
    actionAnchorRef.current = null;
    setActionMenuPosition(null);
  }, []);

  const handleActionMenuToggle = useCallback((e, docId, itemCount) => {
    e.stopPropagation();
    if (activeActionMenu === docId) {
      closeActionMenu();
      return;
    }
    actionAnchorRef.current = e.currentTarget;
    setActionMenuPosition(computeActionMenuPosition(e.currentTarget, { itemCount }));
    setActiveActionMenu(docId);
  }, [activeActionMenu, closeActionMenu, computeActionMenuPosition]);

  // Close action menu on outside click / Escape / scroll, recalc on resize
  useEffect(() => {
    if (!activeActionMenu) return undefined;

    const handleOutsideClick = () => {
      closeActionMenu();
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeActionMenu();
      }
    };

    const updatePosition = () => {
      if (actionAnchorRef.current) {
        setActionMenuPosition(computeActionMenuPosition(actionAnchorRef.current, { itemCount: 4 }));
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', handleOutsideClick, true);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleOutsideClick, true);
    };
  }, [activeActionMenu, closeActionMenu, computeActionMenuPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleDropdownClose = (event) => {
      if (showGeneralDropdown && !event.target.closest('.dropdown-container')) {
        setShowGeneralDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleDropdownClose);
    return () => document.removeEventListener('mousedown', handleDropdownClose);
  }, [showGeneralDropdown]);

  // Fetch Firms for the current client
  useEffect(() => {
    const fetchFirms = async () => {
      if (!clientUsername) {
        console.error('Client username is required to fetch firms');
        return;
      }

      setLoadingFirms(true);
      const headers = getHeaders();
      if (!headers) {
        console.error('Authentication headers not found');
        setLoadingFirms(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/client/details/firms/list?username=${encodeURIComponent(clientUsername)}`, {
          method: 'GET',
          headers: headers
        });

        const data = await response.json();

        if (data.success && Array.isArray(data.data?.firms)) {
          setFirms(data.data.firms);
        } else {
          console.error('Failed to fetch firms:', data.message);
          setFirms([]);
        }
      } catch (error) {
        console.error('Error fetching firms:', error);
        setFirms([]);
      } finally {
        setLoadingFirms(false);
      }
    };

    if (clientUsername) {
      fetchFirms();
    }
  }, [clientUsername]);

  // Fetch Document Types
  useEffect(() => {
    const fetchDocumentTypes = async () => {
      setLoadingTypes(true);
      const headers = getHeaders();
      if (!headers) {
        console.error('Authentication headers not found');
        setLoadingTypes(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/client/details/documents/types`, {
          method: 'GET',
          headers: headers
        });

        const data = await response.json();

        if (data.success && data.data) {
          setDocumentTypes(data.data);
        } else {
          console.error('Failed to fetch document types:', data.message);
        }
      } catch (error) {
        console.error('Error fetching document types:', error);
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchDocumentTypes();
  }, []);

  // Fetch Assessment Years for Income Tax
  useEffect(() => {
    const fetchAssessmentYears = async () => {
      if (activeTab === 'income-tax') {
        setLoadingYears(true);

        const headers = getHeaders();
        if (!headers) {
          console.error('Authentication headers not found');
          setLoadingYears(false);
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/utils/assisment-years`, {
            method: 'GET',
            headers: headers
          });

          const data = await response.json();

          if (data.success && Array.isArray(data.data)) {
            setAssessmentYears(data.data);
          } else {
            console.error('Failed to fetch assessment years:', data.message);
            setAssessmentYears([]);
          }
        } catch (error) {
          console.error('Error fetching assessment years:', error);
          setAssessmentYears([]);
        } finally {
          setLoadingYears(false);
        }
      }
    };

    fetchAssessmentYears();
  }, [activeTab]);

  // Fetch Financial Years for GST and MCA
  useEffect(() => {
    const fetchFinancialYears = async () => {
      if (activeTab === 'gst' || activeTab === 'mca') {
        setLoadingYears(true);

        const headers = getHeaders();
        if (!headers) {
          console.error('Authentication headers not found');
          setLoadingYears(false);
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/utils/financial-years`, {
            method: 'GET',
            headers: headers
          });

          const data = await response.json();

          if (data.success && Array.isArray(data.data)) {
            setFinancialYears(data.data);
          } else {
            console.error('Failed to fetch financial years:', data.message);
            setFinancialYears([]);
          }
        } catch (error) {
          console.error('Error fetching financial years:', error);
          setFinancialYears([]);
        } finally {
          setLoadingYears(false);
        }
      }
    };

    fetchFinancialYears();
  }, [activeTab]);

  // Fetch Categories for General tab
  useEffect(() => {
    const fetchCategories = async () => {
      if (activeTab === 'general') {
        setLoadingCategories(true);
        const headers = getHeaders();
        if (!headers) {
          console.error('Authentication headers not found');
          setLoadingCategories(false);
          return;
        }

        try {
          const searchParam = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
          const response = await fetch(`${API_BASE_URL}/client/details/documents/category-list${searchParam}`, {
            method: 'GET',
            headers: headers
          });

          const data = await response.json();

          if (data.success && Array.isArray(data.data)) {
            setCategories(data.data);
          } else {
            console.error('Failed to fetch categories:', data.message);
            setCategories([]);
          }
        } catch (error) {
          console.error('Error fetching categories:', error);
          setCategories([]);
        } finally {
          setLoadingCategories(false);
        }
      }
    };

    fetchCategories();
  }, [activeTab, searchTerm]);

  // Fetch total storage used (all documents for this client)
  useEffect(() => {
    const fetchStorageUsage = async () => {
      if (!clientUsername) return;

      const headers = getHeaders();
      if (!headers) return;

      try {
        const response = await fetch(
          `${API_BASE_URL}/client/details/documents/storage-usage?username=${encodeURIComponent(clientUsername)}`,
          { method: 'GET', headers }
        );
        const result = await response.json();
        if (result.success && result.data) {
          setStorageUsed(Number(result.data.used_bytes) || 0);
          if (result.data.limit_bytes) {
            setStorageTotal(Number(result.data.limit_bytes));
          }
        }
      } catch (error) {
        console.error('Error fetching storage usage:', error);
      }
    };

    fetchStorageUsage();
  }, [clientUsername, refreshTrigger]);

  // Fetch Documents based on active tab
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!clientUsername) {
        console.error('Client username is required');
        return;
      }

      const seq = ++fetchSeqRef.current;
      const isCurrent = () => seq === fetchSeqRef.current;
      const firmMap = {};
      (firmsRef.current || []).forEach((firm) => {
        const firmId = firm.firm_id || firm.id;
        if (!firmId) return;
        firmMap[firmId] = {
          name: firm.firm_name || firm.name || '',
          type: firm.firm_type || firm.type || '',
        };
      });
      const resolveFirmFields = (doc) => {
        const mapped = firmMap[doc.firm_id];
        const firmName =
          doc.firm_name || mapped?.name || doc.firm_id || '-';
        const firmType = formatUnderscoreLabel(doc.firm_type || mapped?.type || '');
        const firm =
          firmType && firmName !== '-'
            ? `${firmName} (${firmType})`
            : firmName || '-';
        return { firmName, firmType, firm };
      };
      const formatYearLabel = (year, prefix) => {
        if (!year) return '-';
        const cleaned = String(year).replace(/^(AY|FY)\s*/i, '').trim();
        if (!cleaned) return '-';
        return `${prefix} ${cleaned}`;
      };
      const types = documentTypesRef.current || {};

      if (activeTab === 'income-tax' || activeTab === 'gst' || activeTab === 'mca') {
        setLoading(true);

        const headers = getHeaders();
        if (!headers) {
          console.error('Authentication headers not found');
          if (isCurrent()) setLoading(false);
          return;
        }

        // Build query parameters
        const params = new URLSearchParams();

        params.append('username', clientUsername);
        params.append('page', currentPage);
        params.append('limit', itemsPerPage);

        if (selectedFirm !== 'all') {
          params.append('firm_id', selectedFirm);
        }

        if (selectedYear !== 'all') {
          params.append('year', selectedYear);
        }

        if (selectedType !== 'all') {
          params.append('type', selectedType);
        }

        if (activeTab === 'gst' && selectedMonth !== 'all') {
          const monthName = selectedMonth.split(' ')[0].toLowerCase();
          params.append('month', monthName);
        }

        if (searchTerm) {
          params.append('search', searchTerm);
        }

        let endpoint = '';
        if (activeTab === 'income-tax') endpoint = 'it';
        else if (activeTab === 'gst') endpoint = 'gst';
        else if (activeTab === 'mca') endpoint = 'mca';

        try {
          const response = await fetch(`${API_BASE_URL}/client/details/documents/list/${endpoint}?${params.toString()}`, {
            method: 'GET',
            headers: headers
          });

          const result = await response.json();
          if (!isCurrent()) return;

          if (result.success && Array.isArray(result.data)) {
            const transformedData = result.data.map((doc, index) => {
              let typeName = doc.type;
              if (types[endpoint]) {
                const typeObj = types[endpoint].find(t => t.value === doc.type);
                if (typeObj) {
                  typeName = typeObj.name;
                }
              }
              typeName = formatUnderscoreLabel(typeName || doc.type);

              const { firmName, firmType, firm } = resolveFirmFields(doc);

              const baseDoc = {
                id: doc.document_id || index + 1,
                firm_id: doc.firm_id,
                firm_name: firmName,
                firm_type: firmType,
                firm,
                year:
                  activeTab === 'income-tax'
                    ? formatYearLabel(doc.f_year, 'AY')
                    : formatYearLabel(doc.f_year, 'FY'),
                type: typeName,
                type_value: doc.type,
                remark: doc.remark,
                file_url: doc.file,
                size: doc.size,
                mime_type: doc.mime_type,
                create_date: doc.create_date
              };

              if (activeTab === 'gst') {
                return {
                  ...baseDoc,
                  month: doc.month ? doc.month.charAt(0).toUpperCase() + doc.month.slice(1) + ' ' + doc.f_year?.split('-')[0] : ''
                };
              }

              return baseDoc;
            });
            setDocuments(prev => ({
              ...prev,
              [activeTab]: transformedData
            }));

            if (result.pagination) {
              setPagination(result.pagination);
            }
          } else {
            console.error(`Failed to fetch ${activeTab} documents:`, result.message);
            setDocuments(prev => ({
              ...prev,
              [activeTab]: []
            }));
          }
        } catch (error) {
          if (!isCurrent()) return;
          console.error(`Error fetching ${activeTab} documents:`, error);
          setDocuments(prev => ({
            ...prev,
            [activeTab]: []
          }));
        } finally {
          if (isCurrent()) setLoading(false);
        }
      } else if (activeTab === 'general') {
        setLoading(true);

        const headers = getHeaders();
        if (!headers) {
          console.error('Authentication headers not found');
          if (isCurrent()) setLoading(false);
          return;
        }

        const params = new URLSearchParams();
        params.append('username', clientUsername);
        params.append('page', currentPage);
        params.append('limit', itemsPerPage);

        if (selectedFirm !== 'all') {
          params.append('firm_id', selectedFirm);
        }

        if (selectedCategory !== 'all') {
          params.append('category_id', selectedCategory);
        }

        if (searchTerm) {
          params.append('search', searchTerm);
        }

        try {
          const response = await fetch(`${API_BASE_URL}/client/details/documents/list/general?${params.toString()}`, {
            method: 'GET',
            headers: headers
          });

          const result = await response.json();
          if (!isCurrent()) return;

          if (result.success && Array.isArray(result.data)) {
            const transformedData = result.data.map((doc, index) => {
              const { firmName, firmType, firm } = resolveFirmFields(doc);
              return {
              id: doc.document_id || index + 1,
              firm_id: doc.firm_id,
              firm_name: firmName,
              firm_type: firmType,
              firm,
              name: doc.name,
              category: doc.category_name,
              remark: doc.remark,
              file_url: doc.file,
              size: doc.size,
              mime_type: doc.mime_type,
              create_date: doc.create_date
            };
            });

            setDocuments(prev => ({
              ...prev,
              general: transformedData
            }));

            if (result.pagination) {
              setPagination(result.pagination);
            }
          } else {
            console.error('Failed to fetch general documents:', result.message);
            setDocuments(prev => ({ ...prev, general: [] }));
          }
        } catch (error) {
          if (!isCurrent()) return;
          console.error('Error fetching general documents:', error);
          setDocuments(prev => ({ ...prev, general: [] }));
        } finally {
          if (isCurrent()) setLoading(false);
        }
      } else if (activeTab === 'task') {
        setLoading(true);

        const headers = getHeaders();
        if (!headers) {
          console.error('Authentication headers not found');
          if (isCurrent()) setLoading(false);
          return;
        }

        const params = new URLSearchParams();
        params.append('username', clientUsername);
        params.append('page', currentPage);
        params.append('limit', itemsPerPage);

        if (selectedFirm !== 'all') {
          params.append('firm_id', selectedFirm);
        }

        if (selectedService !== 'all') {
          params.append('service', selectedService);
        }

        if (searchTerm) {
          params.append('search', searchTerm);
        }

        try {
          const response = await fetch(`${API_BASE_URL}/client/details/documents/list/task?${params.toString()}`, {
            method: 'GET',
            headers: headers
          });

          const result = await response.json();
          if (!isCurrent()) return;

          if (result.success && Array.isArray(result.data)) {
            const transformedData = result.data.map((doc, index) => {
              const { firmName, firmType, firm } = resolveFirmFields(doc);
              return {
              id: doc.document_id || index + 1,
              firm_id: doc.firm_id,
              firm_name: firmName,
              firm_type: firmType,
              firm,
              service: doc.service_name,
              name: doc.name,
              remark: doc.remark,
              file_url: doc.file,
              size: doc.size,
              mime_type: doc.mime_type,
              create_date: doc.create_date
            };
            });

            setDocuments(prev => ({
              ...prev,
              task: transformedData
            }));

            if (result.pagination) {
              setPagination(result.pagination);
            }
          } else {
            console.error('Failed to fetch task documents:', result.message);
            setDocuments(prev => ({ ...prev, task: [] }));
          }
        } catch (error) {
          if (!isCurrent()) return;
          console.error('Error fetching task documents:', error);
          setDocuments(prev => ({ ...prev, task: [] }));
        } finally {
          if (isCurrent()) setLoading(false);
        }
      }
    };

    fetchDocuments();
  }, [
    activeTab,
    currentPage,
    itemsPerPage,
    selectedFirm,
    selectedYear,
    selectedType,
    selectedMonth,
    selectedService,
    selectedCategory,
    searchTerm,
    clientUsername,
    refreshTrigger
  ]);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFirm, selectedYear, selectedType, selectedMonth, selectedService, selectedCategory, searchTerm, activeTab]);

  // Clear selection when page, tab, or filters change
  useEffect(() => {
    setSelectedDocuments([]);
    setSelectAll(false);
  }, [activeTab, currentPage, itemsPerPage, selectedFirm, selectedYear, selectedType, selectedMonth, selectedService, selectedCategory, searchTerm]);

  // File upload function
  const uploadFileToServer = async (file) => {
    try {
      setUploadProgress(0);

      const { url, meta } = await uploadOneSaasFile(file, (progress) => {
        setUploadProgress(progress);
      });

      return {
        success: true,
        url,
        filename: meta?.storedName || meta?.originalName || file.name,
        message: 'File uploaded successfully',
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      if (error.response) {
        const { status, data } = error.response;
        if (status === 400) {
          throw new Error(`Bad request: ${data?.message || 'Invalid file'}`);
        } else if (status === 413) {
          throw new Error('File too large. Maximum size is 10MB.');
        } else if (status === 415) {
          throw new Error('Unsupported file type.');
        } else if (status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(data?.message || `Upload failed with status ${status}`);
        }
      } else if (error.request) {
        throw new Error('No response from server. Check your internet connection.');
      } else {
        throw new Error(error.message || 'Upload failed');
      }
    } finally {
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  // Handle upload submit
  const handleUploadSubmit = async (firmId, documents) => {
    if (!clientUsername) {
      showToast.error('Client username is required');
      return;
    }

    setUploadLoading(true);
    setUploadProgress(0);

    try {
      // Upload all files first
      const uploadedDocs = [];
      let totalProgress = 0;

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const uploadResult = await uploadFileToServer(doc.file);

        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(`Failed to upload file for document #${i + 1}`);
        }

        // Calculate progress based on number of files
        totalProgress = Math.round(((i + 1) / documents.length) * 100);
        setUploadProgress(totalProgress);

        const docData = {
          url: uploadResult.url,
          name: doc.name || doc.file.name.split('.')[0],
          remark: doc.remark || ''
        };

        if (activeTab === 'income-tax' || activeTab === 'gst' || activeTab === 'mca') {
          docData.year = doc.year;
          docData.type = doc.type;

          if (activeTab === 'gst') {
            docData.month = doc.month;
          }
        }

        if (activeTab === 'general') {
          docData.category = doc.category;
        }

        uploadedDocs.push(docData);
      }

      // Prepare request body
      const requestBody = {
        username: clientUsername,
        firm_id: firmId,
        documents: uploadedDocs
      };

      let endpoint = '';
      if (activeTab === 'income-tax') endpoint = 'it';
      else if (activeTab === 'gst') endpoint = 'gst';
      else if (activeTab === 'mca') endpoint = 'mca';
      else if (activeTab === 'general') endpoint = 'general';
      else {
        showToast.error('Upload is not available for this tab');
        setUploadLoading(false);
        return;
      }

      const headers = getHeaders();
      if (!headers) {
        throw new Error('Authentication headers not found');
      }

      const response = await axios.post(
        `${API_BASE_URL}/client/details/documents/create/${endpoint}?username=${encodeURIComponent(clientUsername)}`,
        requestBody,
        { headers }
      );

      if (response.data && response.data.success) {
        showToast.success(`${documents.length} document(s) uploaded successfully`);
        setShowUploadModal(false);

        // Force a refresh of the documents list
        setCurrentPage(1);
        const refreshTimestamp = Date.now();
        setRefreshTrigger(refreshTimestamp);
      } else {
        showToast.error('Failed to upload documents: ' + (response.data?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error in upload flow:', error);
      if (error.response) {
        const { status, data } = error.response;
        if (status === 400) {
          if (data.message === 'Username is required') {
            showToast.error('Username is required. Please check your login session.');
          } else {
            showToast.error(`Bad request: ${data?.message || 'Invalid data'}`);
          }
        } else if (status === 401) {
          showToast.error('Authentication failed. Please login again.');
        } else if (status === 404) {
          showToast.error('API endpoint not found.');
        } else if (status === 500) {
          showToast.error('Server error. Please try again later.');
        } else {
          showToast.error(data?.message || `Error ${status}: Failed to upload documents`);
        }
      } else if (error.request) {
        showToast.error('No response from server. Check your internet connection.');
      } else {
        showToast.error(error.message || 'Error uploading documents. Please try again.');
      }
    } finally {
      setUploadLoading(false);
      setUploadProgress(0);
    }
  };
  
  // Handle create category
  const handleCreateCategory = async (categoryData) => {
    setCategoryLoading(true);
    const headers = getHeaders();
    if (!headers) {
      setCategoryLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/client/details/documents/create-category`,
        categoryData,
        { headers }
      );

      if (response.data && response.data.success) {
        showToast.success('Category created successfully');
        setShowCreateCategoryModal(false);

        const fetchResponse = await fetch(`${API_BASE_URL}/client/details/documents/category-list`, {
          method: 'GET',
          headers: headers
        });
        const data = await fetchResponse.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      } else {
        showToast.error('Failed to create category: ' + (response.data?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating category:', error);
      if (error.response) {
        showToast.error(error.response.data?.message || 'Failed to create category');
      } else {
        showToast.error('Failed to create category. Please try again.');
      }
    } finally {
      setCategoryLoading(false);
    }
  };

  // Handle edit category
  const handleEditCategory = async (categoryData) => {
    if (!selectedCategoryForEdit) return;

    setCategoryLoading(true);
    const headers = getHeaders();
    if (!headers) {
      setCategoryLoading(false);
      return;
    }

    try {
      const response = await axios.put(
        `${API_BASE_URL}/client/details/documents/category-edit`,
        {
          category_id: selectedCategoryForEdit.category_id,
          ...categoryData
        },
        { headers }
      );

      if (response.data && response.data.success) {
        showToast.success('Category updated successfully');
        setShowEditCategoryModal(false);
        setSelectedCategoryForEdit(null);

        const fetchResponse = await fetch(`${API_BASE_URL}/client/details/documents/category-list`, {
          method: 'GET',
          headers: headers
        });
        const data = await fetchResponse.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      } else {
        showToast.error('Failed to update category: ' + (response.data?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating category:', error);
      if (error.response) {
        showToast.error(error.response.data?.message || 'Failed to update category');
      } else {
        showToast.error('Failed to update category. Please try again.');
      }
    } finally {
      setCategoryLoading(false);
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    setCategoryLoading(true);
    const headers = getHeaders();
    if (!headers) {
      setCategoryLoading(false);
      return;
    }

    try {
      const response = await axios({
        method: 'delete',
        url: `${API_BASE_URL}/client/details/documents/category-delete`,
        data: { category_id: categoryId },
        headers: headers
      });

      if (response.data && response.data.success) {
        showToast.success('Category deleted successfully');

        const fetchResponse = await fetch(`${API_BASE_URL}/client/details/documents/category-list`, {
          method: 'GET',
          headers: headers
        });
        const data = await fetchResponse.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      } else {
        showToast.error('Failed to delete category: ' + (response.data?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      if (error.response) {
        showToast.error(error.response.data?.message || 'Failed to delete category');
      } else {
        showToast.error('Failed to delete category. Please try again.');
      }
    } finally {
      setCategoryLoading(false);
    }
  };

  // Handle send submit
  const handleSendSubmit = async (sendData) => {
    if (!clientUsername) {
      console.error('Client username is required');
      return;
    }

    setSendLoading(true);
    const headers = getHeaders();
    if (!headers) {
      setSendLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('username', clientUsername);
    formData.append('sendOption', sendData.sendOption);
    formData.append('recipient', sendData.recipient);
    formData.append('message', sendData.message);

    if (selectedDocument) {
      formData.append('document_id', selectedDocument.id);
    } else {
      selectedDocuments.forEach((docId, index) => {
        formData.append(`document_ids[${index}]`, docId);
      });
    }

    sendData.attachments.forEach((file, index) => {
      formData.append(`attachments[${index}]`, file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          ...headers,
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        showToast.success('Documents sent successfully');
        setShowSendModal(false);
        if (!selectedDocument) {
          setSelectedDocuments([]);
        }
      } else {
        showToast.error('Failed to send documents: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending documents:', error);
      showToast.error('Failed to send documents. Please try again.');
    } finally {
      setSendLoading(false);
    }
  };

  // Handle view document
  const handleView = (doc) => {
    setSelectedDocument(doc);
    setShowViewModal(true);
    setActiveActionMenu(null);
  };

  // Handle send document
  const handleSend = (doc) => {
    setSelectedDocument(doc);
    setShowSendModal(true);
    setActiveActionMenu(null);
  };

  // Handle bulk send
  const handleBulkSend = () => {
    setSelectedDocument(null);
    setShowSendModal(true);
  };

  // Open edit category modal
  const openEditCategoryModal = (category) => {
    setSelectedCategoryForEdit(category);
    setShowEditCategoryModal(true);
    setActiveActionMenu(null);
  };

  // Soft-delete one or more documents (DB only; B2 files kept)
  const handleDeleteDocuments = async (documentIds) => {
    const ids = [...new Set((documentIds || []).map((id) => String(id).trim()).filter(Boolean))];
    if (ids.length === 0) {
      showToast.error('No documents selected');
      return;
    }
    if (!clientUsername) {
      showToast.error('Client username is required');
      return;
    }

    const label = ids.length === 1 ? 'this document' : `${ids.length} documents`;
    if (!window.confirm(`Delete ${label}? This will hide them from the list (soft delete).`)) {
      return;
    }

    try {
      const headers = getHeaders();
      if (!headers) {
        throw new Error('Authentication headers not found');
      }

      const response = await axios.delete(
        `${API_BASE_URL}/client/details/documents/delete`,
        {
          headers,
          data: {
            username: clientUsername,
            document_ids: ids,
          },
        }
      );

      if (response.data?.success) {
        showToast.success(
          ids.length === 1 ? 'Document deleted successfully' : `${ids.length} documents deleted successfully`
        );
        setSelectedDocuments((prev) => prev.filter((id) => !ids.includes(String(id))));
        setSelectAll(false);
        closeActionMenu();
        setRefreshTrigger(Date.now());
      } else {
        showToast.error(response.data?.message || 'Failed to delete documents');
      }
    } catch (error) {
      console.error('Error deleting documents:', error);
      showToast.error(
        error.response?.data?.message || error.message || 'Failed to delete documents'
      );
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(currentItems.map(doc => doc.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle select single
  const handleSelect = (id) => {
    if (selectedDocuments.includes(id)) {
      setSelectedDocuments(selectedDocuments.filter(docId => docId !== id));
    } else {
      setSelectedDocuments([...selectedDocuments, id]);
    }
  };

  // Get current year options based on active tab
  const getYearOptions = useCallback(() => {
    if (activeTab === 'income-tax') {
      return assessmentYears;
    } else if (activeTab === 'gst' || activeTab === 'mca') {
      return financialYears;
    }
    return [];
  }, [activeTab, assessmentYears, financialYears]);

  // Get year label based on active tab
  const getYearLabel = useCallback(() => {
    if (activeTab === 'income-tax') {
      return 'Assessment Year';
    } else if (activeTab === 'gst' || activeTab === 'mca') {
      return 'Financial Year';
    }
    return 'Year';
  }, [activeTab]);

  // "All" option label based on active tab (e.g. "All Assessment Years" / "All Financial Years")
  const getAllYearLabel = useCallback(() => `All ${getYearLabel()}s`, [getYearLabel]);

  // Get document types for current tab
  const getCurrentTabTypes = useCallback(() => {
    if (activeTab === 'income-tax') {
      return documentTypes.it || [];
    } else if (activeTab === 'gst') {
      return documentTypes.gst || [];
    } else if (activeTab === 'mca') {
      return documentTypes.mca || [];
    }
    return [];
  }, [activeTab, documentTypes]);

  // All tabs are API-backed with server-side pagination/filtering (filters are query params),
  // so the current page rows are simply the fetched documents for the active tab.
  const getFilteredDocuments = useCallback(() => {
    return documents[activeTab] || [];
  }, [activeTab, documents]);

  const filteredDocuments = getFilteredDocuments();

  // Server pagination — `pagination` state is populated from the API response.
  const currentItems = filteredDocuments;

  // Keep "Select All" toggle in sync when user toggles rows manually
  useEffect(() => {
    if (selectedDocuments.length === 0) {
      setSelectAll(false);
    } else if (selectedDocuments.length === currentItems.length) {
      setSelectAll(true);
    }
  }, [selectedDocuments, currentItems.length]);

  // Active document for the floating (portal) action menu
  const activeActionDoc = useMemo(
    () => currentItems.find((d) => d.id === activeActionMenu) || null,
    [currentItems, activeActionMenu]
  );

  // Format storage for display
  const formatStorage = (bytes) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const storagePercentage = (storageUsed / storageTotal) * 100;

  // Truncate text function
  const truncateText = (text, maxLength = 30) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getDocumentFirmLabel = useCallback(
    (doc) => {
      if (!doc) return '-';
      const matched = (firms || []).find(
        (firm) => String(firm.firm_id || firm.id) === String(doc.firm_id)
      );
      const name =
        doc.firm_name ||
        matched?.firm_name ||
        matched?.name ||
        (doc.firm && !String(doc.firm).includes(' (') ? doc.firm : null) ||
        '-';
      const type = formatUnderscoreLabel(
        doc.firm_type || matched?.firm_type || matched?.type || ''
      );
      if (type && name !== '-') return `${name} (${type})`;
      return name || '-';
    },
    [firms]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="w-full rounded-xl border border-slate-200 bg-white"
    >
      {/* Toaster Component */}
      <Toaster
        position="top-right"
        toastOptions={{
          ...toastConfig,
          className: '',
          style: toastConfig.style,
          success: {
            ...toastConfig.success,
            icon: null,
          },
          error: {
            ...toastConfig.error,
            icon: null,
          },
          loading: {
            ...toastConfig.loading,
            icon: null,
          },
        }}
      />

      {/* Header with Tabs and Storage Info */}
      <div className="border-b border-slate-200 px-3 md:px-4 pt-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800">
              Documents
            </h2>
            {/* Storage Usage Indicator — click for breakdown */}
            <button
              type="button"
              onClick={() => setShowStorageModal(true)}
              title="View storage by file type"
              className="group flex items-center gap-2.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-white transition-all text-left"
            >
              <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
                <FiHardDrive className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-[6.5rem]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500">Storage</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Details
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-800 tabular-nums">
                  {formatStorage(storageUsed)}
                  <span className="text-slate-400 font-medium"> / 5 GB</span>
                </span>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      storagePercentage > 90
                        ? 'bg-rose-500'
                        : storagePercentage > 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                  />
                </div>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'general' ? (
              <div className="relative dropdown-container">
                <motion.button
                  onClick={() => setShowGeneralDropdown(!showGeneralDropdown)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-medium text-xs shadow-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  Add New
                  <FiChevronDown className="w-3.5 h-3.5" />
                </motion.button>

                {showGeneralDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        setShowUploadModal(true);
                        setShowGeneralDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiUpload className="w-4 h-4" />
                      Upload Document
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateCategoryModal(true);
                        setShowGeneralDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      Create Category
                    </button>
                  </div>
                )}
              </div>
            ) : (
              activeTab !== 'task' && (
                <motion.button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-medium text-xs shadow-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  Add Document
                </motion.button>
              )
            )}
          </div>
        </div>

        {/* Segmented tabs */}
        <div className="pb-3">
          <div
            role="tablist"
            aria-label="Document categories"
            className="inline-flex max-w-full overflow-x-auto p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-0.5 custom-scrollbar"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedDocuments([]);
                    setActiveActionMenu(null);
                    setSelectedYear('all');
                    setSelectedType('all');
                    setShowGeneralSubTab('documents');
                  }}
                  className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? `bg-white shadow-sm border border-slate-200/80 ${tab.activeText}`
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? tab.iconWrap : 'bg-white/70 text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  {isActive && (
                    <motion.span
                      layoutId="documentsActiveTabDot"
                      className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full ${tab.indicator}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* General Tab Sub-tabs */}
      {activeTab === 'general' && (
        <div className="px-3 md:px-4 pt-2.5 pb-1 border-b border-slate-200">
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 gap-0.5">
            <button
              type="button"
              onClick={() => setShowGeneralSubTab('documents')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                showGeneralSubTab === 'documents'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Documents
            </button>
            <button
              type="button"
              onClick={() => setShowGeneralSubTab('categories')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                showGeneralSubTab === 'categories'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Categories
            </button>
          </div>
        </div>
      )}

      {/* Documents: filters + table + pagination (single section) */}
      {(activeTab !== 'general' || (activeTab === 'general' && showGeneralSubTab === 'documents')) && (
        <div className="px-3 md:px-4 py-3">
          <div className="rounded-lg border border-slate-200/80 bg-white/70 overflow-hidden">
            {/* Filters */}
            <div className="p-3 border-b border-slate-200/80">
              <div className="flex flex-wrap gap-2.5 items-center">
                <div className="min-w-[220px]">
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'All Firms' },
                      ...firms.map((firm) => ({
                        value: firm.firm_id || firm.id,
                        label: firm.firm_name || firm.name,
                      })),
                    ]}
                    value={optionByValue([
                      { value: 'all', label: 'All Firms' },
                      ...firms.map((firm) => ({
                        value: firm.firm_id || firm.id,
                        label: firm.firm_name || firm.name,
                      })),
                    ], selectedFirm)}
                    onChange={(opt) => setSelectedFirm(opt?.value || 'all')}
                    searchPlaceholder="Search firm..."
                    isDisabled={loadingFirms}
                    isClearable={false}
                  />
                </div>

                {(activeTab === 'income-tax' || activeTab === 'gst' || activeTab === 'mca') && (
                  <div className="min-w-[190px]">
                    <CustomSelect
                      options={[
                        { value: 'all', label: getAllYearLabel() },
                        ...getYearOptions().map((year) => ({ value: year, label: year })),
                      ]}
                      value={optionByValue([
                        { value: 'all', label: getAllYearLabel() },
                        ...getYearOptions().map((year) => ({ value: year, label: year })),
                      ], selectedYear)}
                      onChange={(opt) => setSelectedYear(opt?.value || 'all')}
                      searchPlaceholder="Search year..."
                      isDisabled={loadingYears}
                      isClearable={false}
                    />
                  </div>
                )}

                {(activeTab === 'income-tax' || activeTab === 'gst' || activeTab === 'mca') && (
                  <div className="min-w-[220px]">
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Types' },
                        ...getCurrentTabTypes().map((type) => ({
                          value: type.value,
                          label: formatUnderscoreLabel(type.name || type.value),
                        })),
                      ]}
                      value={optionByValue([
                        { value: 'all', label: 'All Types' },
                        ...getCurrentTabTypes().map((type) => ({
                          value: type.value,
                          label: formatUnderscoreLabel(type.name || type.value),
                        })),
                      ], selectedType)}
                      onChange={(opt) => setSelectedType(opt?.value || 'all')}
                      searchPlaceholder="Search type..."
                      isDisabled={loadingTypes}
                      isClearable={false}
                    />
                  </div>
                )}

                {activeTab === 'gst' && (
                  <div className="min-w-[180px]">
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Months' },
                        ...months.map((month) => ({ value: month, label: month })),
                      ]}
                      value={optionByValue([
                        { value: 'all', label: 'All Months' },
                        ...months.map((month) => ({ value: month, label: month })),
                      ], selectedMonth)}
                      onChange={(opt) => setSelectedMonth(opt?.value || 'all')}
                      searchPlaceholder="Search month..."
                      isClearable={false}
                    />
                  </div>
                )}

                {activeTab === 'task' && (
                  <div className="min-w-[220px]">
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Services' },
                        ...serviceTypes.map((service) => ({ value: service, label: service })),
                      ]}
                      value={optionByValue([
                        { value: 'all', label: 'All Services' },
                        ...serviceTypes.map((service) => ({ value: service, label: service })),
                      ], selectedService)}
                      onChange={(opt) => setSelectedService(opt?.value || 'all')}
                      searchPlaceholder="Search service..."
                      isClearable={false}
                    />
                  </div>
                )}

                {activeTab === 'general' && showGeneralSubTab === 'documents' && (
                  <div className="min-w-[220px]">
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Categories' },
                        ...categories.map((cat) => ({ value: cat.category_id || cat.id, label: cat.name })),
                      ]}
                      value={optionByValue([
                        { value: 'all', label: 'All Categories' },
                        ...categories.map((cat) => ({ value: cat.category_id || cat.id, label: cat.name })),
                      ], selectedCategory)}
                      onChange={(opt) => setSelectedCategory(opt?.value || 'all')}
                      searchPlaceholder="Search category..."
                      isDisabled={loadingCategories}
                      isClearable={false}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <FiSearch className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 text-sm text-slate-700 outline-none placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-indigo-500 ${
                        searchTerm ? 'pr-9' : 'pr-3'
                      }`}
                    />
                    {searchTerm ? (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Clear search"
                      >
                        <FiX className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {selectedDocuments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold">
                      {selectedDocuments.length}
                    </div>
                    <span className="text-sm text-gray-600">selected</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDocuments([]);
                        setSelectAll(false);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 underline ml-1"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBulkSend}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium"
                    >
                      <FiSend className="w-3.5 h-3.5" />
                      Send Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocuments(selectedDocuments)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                      Delete Selected
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 border-b border-slate-200">
                      <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[44px] w-12">
                        <div className="flex items-center justify-center">
                          <AnimatedCheckbox
                            checked={selectAll}
                            indeterminate={
                              selectedDocuments.length > 0 &&
                              selectedDocuments.length < currentItems.length
                            }
                            onChange={handleSelectAll}
                            ariaLabel="Select all documents"
                          />
                        </div>
                      </th>
                      <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[48px] w-14">
                        #
                      </th>

                      {activeTab === 'income-tax' && (
                        <>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[200px]">Firm</th>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">Assessment Year</th>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[140px]">Type</th>
                          <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[72px]">View</th>
                          <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[72px]">Actions</th>
                        </>
                      )}

                      {activeTab === 'gst' && (
                        <>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[180px]">Firm</th>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">Financial Year</th>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">Type</th>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">Month</th>
                          <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[72px]">View</th>
                          <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[72px]">Actions</th>
                        </>
                      )}

                      {activeTab === 'mca' && (
                        <>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[200px]">Firm</th>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">Financial Year</th>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[140px]">Type</th>
                          <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[72px]">View</th>
                          <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[72px]">Actions</th>
                        </>
                      )}

                      {activeTab === 'task' && (
                        <>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[180px]">Firm</th>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[140px]">Service</th>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[140px]">Name</th>
                          <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[72px]">View</th>
                          <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[72px]">Actions</th>
                        </>
                      )}

                      {activeTab === 'general' && (
                        <>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[180px]">Firm</th>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[140px]">Name</th>
                          <th className="text-left p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[140px]">Category</th>
                          <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[72px]">View</th>
                          <th className="text-center p-3 font-bold text-slate-700 text-[10px] uppercase tracking-wider min-w-[72px]">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      Array.from({ length: 7 }).map((_, i) => (
                        <tr key={`skeleton-${i}`} className={`animate-pulse ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-4 mx-auto"></div></td>
                          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-6 mx-auto"></div></td>
                          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                          {activeTab === 'gst' && (
                            <td className="p-3"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                          )}
                          <td className="p-3"><div className="h-5 bg-gray-200 rounded w-8 mx-auto"></div></td>
                          <td className="p-3"><div className="h-5 bg-gray-200 rounded w-8 mx-auto"></div></td>
                        </tr>
                      ))
                    ) : (
                    <AnimatePresence>
                      {currentItems.length > 0 ? (
                        currentItems.map((doc, index) => {
                          const rowNum = (currentPage - 1) * itemsPerPage + index + 1;
                          const isSelected = selectedDocuments.includes(doc.id);
                          return (
                          <motion.tr
                            key={doc.id}
                            className={`${
                              isSelected
                                ? 'bg-indigo-50/50'
                                : index % 2 === 0
                                  ? 'bg-white'
                                  : 'bg-slate-50/70'
                            } hover:bg-indigo-50/40 transition-colors duration-150`}
                          >
                            <td className="p-3 text-center align-middle">
                              <div className="flex items-center justify-center">
                                <AnimatedCheckbox
                                  checked={isSelected}
                                  onChange={() => handleSelect(doc.id)}
                                  ariaLabel={`Select document ${doc?.name || doc?.file_name || ''}`}
                                />
                              </div>
                            </td>
                            <td className="p-3 text-center align-middle">
                              <div className="text-slate-700 font-medium text-xs">{rowNum}</div>
                            </td>

                            {/* Dynamic Table Cells based on active tab */}
                            {activeTab === 'income-tax' && (
                              <>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-800 truncate" title={getDocumentFirmLabel(doc)}>{getDocumentFirmLabel(doc)}</div>
                                </td>
                                <td className="p-3 align-middle">
                                  <div className="text-xs text-slate-600">{doc.year}</div>
                                </td>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-700 truncate max-w-[160px]" title={doc.type}>
                                    {doc.type}
                                  </div>
                                </td>
                              </>
                            )}

                            {activeTab === 'gst' && (
                              <>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-800 truncate" title={getDocumentFirmLabel(doc)}>{getDocumentFirmLabel(doc)}</div>
                                </td>
                                <td className="p-3 align-middle">
                                  <div className="text-xs text-slate-600">{doc.year}</div>
                                </td>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-700 truncate max-w-[140px]" title={doc.type}>
                                    {doc.type}
                                  </div>
                                </td>
                                <td className="p-3 align-middle">
                                  <div className="text-xs text-slate-600 truncate" title={doc.month}>{doc.month}</div>
                                </td>
                              </>
                            )}

                            {activeTab === 'mca' && (
                              <>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-800 truncate" title={getDocumentFirmLabel(doc)}>{getDocumentFirmLabel(doc)}</div>
                                </td>
                                <td className="p-3 align-middle">
                                  <div className="text-xs text-slate-600">{doc.year}</div>
                                </td>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-700 truncate max-w-[160px]" title={doc.type}>
                                    {doc.type}
                                  </div>
                                </td>
                              </>
                            )}

                            {activeTab === 'task' && (
                              <>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-800 truncate" title={getDocumentFirmLabel(doc)}>{getDocumentFirmLabel(doc)}</div>
                                </td>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-700 truncate max-w-[140px]" title={doc.service}>
                                    {doc.service}
                                  </div>
                                </td>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-800 truncate" title={doc.name}>{doc.name}</div>
                                </td>
                              </>
                            )}

                            {activeTab === 'general' && (
                              <>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-800 truncate" title={getDocumentFirmLabel(doc)}>{getDocumentFirmLabel(doc)}</div>
                                </td>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-800 truncate" title={doc.name}>{doc.name}</div>
                                </td>
                                <td className="p-3 align-middle">
                                  <div className="text-xs font-medium text-slate-700 truncate max-w-[140px]" title={doc.category}>
                                    {doc.category}
                                  </div>
                                </td>
                              </>
                            )}

                            {/* View Column */}
                            <td className="p-3 text-center align-middle">
                              <button
                                onClick={() => handleView(doc)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View"
                              >
                                <FiEye className="w-4 h-4" />
                              </button>
                            </td>

                            {/* Actions Column with 3-dot menu */}
                            <td className="p-3 text-center align-middle">
                              <button
                                type="button"
                                onClick={(e) => handleActionMenuToggle(e, doc.id, doc.file_url ? 4 : 3)}
                                className="p-1.5 text-slate-500 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="Actions"
                              >
                                <FiMoreVertical className="w-4 h-4" />
                              </button>
                            </td>
                          </motion.tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="9" className="px-3 py-10 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                <FiFolder className="w-6 h-6 text-slate-400" />
                              </div>
                              <h3 className="text-sm font-semibold text-slate-800 mb-1">No documents found</h3>
                              <p className="text-xs text-slate-500">Try adjusting your search or filter criteria</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                    )}
                  </tbody>
                </table>
            </div>

            {(!loading || pagination.total > 0) && (
              <TablePagination
                  page={currentPage}
                  limit={itemsPerPage}
                  total={pagination.total || 0}
                  totalPages={pagination.total_pages || 1}
                  isLastPage={pagination.is_last_page}
                  onPageChange={setCurrentPage}
                  onLimitChange={(limit) => {
                    setItemsPerPage(limit);
                    setCurrentPage(1);
                  }}
                />
            )}
          </div>
        </div>
      )}

      {/* Categories Table for General Tab */}
      {activeTab === 'general' && showGeneralSubTab === 'categories' && (
        <div className="px-3 md:px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800 mb-2.5">Categories</h3>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remark</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created By</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created Date</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Modified By</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Modified Date</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((category) => (
                    <tr key={category.category_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="text-sm font-medium text-slate-800">{category.name}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm text-slate-600">{category.remark || '-'}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm text-slate-600">
                          {category.create_by?.name || category.create_by?.username || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm text-slate-600">
                          {category.create_date ? new Date(category.create_date).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm text-slate-600">
                          {category.modify_by?.name || category.modify_by?.username || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-sm text-slate-600">
                          {category.modify_date ? new Date(category.modify_date).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditCategoryModal(category)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Category"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.category_id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Category"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Floating action menu (portal) */}
      {activeActionMenu &&
        activeActionDoc &&
        actionMenuPosition &&
        createPortal(
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-[99999] overflow-hidden"
            style={{
              top: actionMenuPosition.top,
              left: actionMenuPosition.left,
              height: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                handleView(activeActionDoc);
                closeActionMenu();
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <FiEye className="w-4 h-4" />
              View
            </button>
            {activeActionDoc.file_url && (
              <a
                href={activeActionDoc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeActionMenu}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2 no-underline hover:no-underline"
              >
                <FiDownload className="w-4 h-4" />
                Download
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                handleSend(activeActionDoc);
                closeActionMenu();
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <FiSend className="w-4 h-4" />
              Send
            </button>
            <button
              type="button"
              onClick={() => {
                handleDeleteDocuments([activeActionDoc.id]);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <FiTrash2 className="w-4 h-4" />
              Delete
            </button>
          </motion.div>,
          document.body
        )}

      {/* Modals */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            tab={activeTab}
            firms={firms}
            loadingFirms={loadingFirms}
            assessmentYears={assessmentYears}
            financialYears={financialYears}
            loadingYears={loadingYears}
            documentTypes={documentTypes}
            loadingTypes={loadingTypes}
            categories={categories}
            loadingCategories={loadingCategories}
            months={months}
            onSubmit={handleUploadSubmit}
            uploadLoading={uploadLoading}
            uploadProgress={uploadProgress}
          />
        )}
        {showCreateCategoryModal && (
          <CreateCategoryModal
            onClose={() => setShowCreateCategoryModal(false)}
            onCreate={handleCreateCategory}
            loading={categoryLoading}
          />
        )}
        {showEditCategoryModal && (
          <EditCategoryModal
            onClose={() => {
              setShowEditCategoryModal(false);
              setSelectedCategoryForEdit(null);
            }}
            onEdit={handleEditCategory}
            loading={categoryLoading}
            category={selectedCategoryForEdit}
          />
        )}
        {showViewModal && selectedDocument && (
          <ViewModal document={selectedDocument} onClose={() => setShowViewModal(false)} />
        )}
        {showSendModal && (
          <SendModal
            document={selectedDocument}
            selectedDocuments={selectedDocuments}
            onClose={() => {
              setShowSendModal(false);
            }}
            onSubmit={handleSendSubmit}
            loading={sendLoading}
          />
        )}
      </AnimatePresence>

      <DocumentStorageUsageModal
        open={showStorageModal}
        onClose={() => setShowStorageModal(false)}
        clientUsername={clientUsername}
        storageLimitBytes={storageTotal}
      />

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </motion.div>
  );
};

export default DocumentsTab;