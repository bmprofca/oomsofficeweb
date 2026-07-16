import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFile, FiUpload, FiEye, FiDownload, FiFolder, FiSearch,
  FiHardDrive, FiCheckCircle, FiClock, FiFileText, FiImage,
  FiArchive, FiPrinter, FiTrash2, FiPlus, FiX,
  FiChevronDown, FiChevronUp, FiGrid, FiList, FiCalendar,
  FiBriefcase, FiDollarSign, FiUsers, FiHome, FiCheckSquare,
  FiSquare, FiChevronLeft, FiChevronRight, FiMoreVertical,
  FiMail, FiMessageCircle, FiSend, FiPaperclip, FiLoader,
  FiAlertCircle, FiCheck, FiEdit2, FiMenu, FiExternalLink
} from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import axios from 'axios';
import Pagination from '../components/paging-nation-component';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import { uploadOneSaasFile } from '../utils/onesaas-upload';
import { toast, Toaster } from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import { optionByValue } from '../utils/customSelectHelpers';

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
              key !== 'id' && key !== 'firm_id' && key !== 'file_url' && key !== 'mime_type' && key !== 'size' && key !== 'create_date' && key !== 'type_value' && (
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
                label: type.name,
              }))}
              value={optionByValue(
                currentTabTypes.map((type) => ({
                  value: type.value,
                  label: type.name,
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
                        options={getCurrentTabTypes().map((type) => ({ value: type.value, label: type.name }))}
                        value={optionByValue(getCurrentTabTypes().map((type) => ({ value: type.value, label: type.name })), doc.type)}
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
                          options={categories.map((cat) => ({ value: cat.name, label: cat.name }))}
                          value={optionByValue(categories.map((cat) => ({ value: cat.name, label: cat.name })), doc.category)}
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
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState(null);
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showGeneralDropdown, setShowGeneralDropdown] = useState(false);
  const [showGeneralSubTab, setShowGeneralSubTab] = useState('documents'); // 'documents' or 'categories'
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const actionMenuRef = useRef(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  // Documents State
  const [documents, setDocuments] = useState({
    'income-tax': [],
    'gst': [],
    'mca': [],
    'task': [
      { id: 17, firm: 'ABC Enterprises', service: 'Income Tax', name: 'ITR Filing 2024', remark: 'Complete by Jan 30 - This is a long remark that should be truncated to show ellipsis' },
      { id: 18, firm: 'XYZ Pvt Ltd', service: 'GST', name: 'GSTR-1 Filing', remark: 'Monthly return - Another long remark that needs truncation' },
      { id: 19, firm: 'Tech Solutions', service: 'MCA', name: 'Annual Return', remark: 'Due date Feb 15 - This is a very long remark that will be truncated' },
      { id: 20, firm: 'Global Traders', service: 'Income Tax', name: 'Advance Tax Payment', remark: 'Q4 payment - Long remark example for testing truncation' },
    ],
    'general': [
      { id: 21, firm: 'ABC Enterprises', name: 'PAN Card', category: 'Identity', remark: 'Verified document - This is a long remark that should be truncated' },
      { id: 22, firm: 'XYZ Pvt Ltd', name: 'Bank Statement', category: 'Financial', remark: 'December 2023 - Another long remark example' },
      { id: 23, firm: 'Tech Solutions', name: 'GST Certificate', category: 'Registration', remark: 'New registration - Very long remark that needs to be truncated' },
      { id: 24, firm: 'Global Traders', name: 'Partnership Deed', category: 'Legal', remark: 'Original - Long remark for testing purposes' },
    ]
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

  // Tabs configuration
  const tabs = useMemo(() => [
    { id: 'income-tax', label: 'Income Tax', icon: FiBriefcase, color: 'blue' },
    { id: 'gst', label: 'GST', icon: FiDollarSign, color: 'green' },
    { id: 'mca', label: 'MCA', icon: FiUsers, color: 'purple' },
    { id: 'task', label: 'Task', icon: FiCheckCircle, color: 'orange' },
    { id: 'general', label: 'General', icon: FiHome, color: 'gray' },
  ], []);

  // Close action menu when clicking outside
  const handleClickOutside = useCallback((event) => {
    if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
      setActiveActionMenu(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

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

  // Calculate total storage used
  useEffect(() => {
    const calculateStorage = () => {
      let total = 0;
      Object.values(documents).forEach(docArray => {
        docArray.forEach(doc => {
          if (doc.size) {
            total += doc.size;
          }
        });
      });
      setStorageUsed(total);
    };

    calculateStorage();
  }, [documents]);

  // Fetch Documents based on active tab
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!clientUsername) {
        console.error('Client username is required');
        return;
      }

      if (activeTab === 'income-tax' || activeTab === 'gst' || activeTab === 'mca') {
        setLoading(true);

        const headers = getHeaders();
        if (!headers) {
          console.error('Authentication headers not found');
          setLoading(false);
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

          if (result.success && Array.isArray(result.data)) {
            const firmMap = {};
            firms.forEach(firm => {
              const firmId = firm.firm_id || firm.id;
              const firmName = firm.firm_name || firm.name;
              if (firmId) {
                firmMap[firmId] = firmName;
              }
            });

            // First, filter documents to only include those with valid firms in the firmMap
            const validDocuments = result.data.filter(doc => {
              return firmMap[doc.firm_id] !== undefined;
            });

            const transformedData = validDocuments.map((doc, index) => {
              const firmName = firmMap[doc.firm_id]; // No need for fallback since we filtered

              let typeName = doc.type;
              if (documentTypes[endpoint]) {
                const typeObj = documentTypes[endpoint].find(t => t.value === doc.type);
                if (typeObj) {
                  typeName = typeObj.name;
                }
              }

              const baseDoc = {
                id: doc.document_id || index + 1,
                firm_id: doc.firm_id,
                firm: firmName,
                year: doc.f_year,
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
          console.error(`Error fetching ${activeTab} documents:`, error);
          setDocuments(prev => ({
            ...prev,
            [activeTab]: []
          }));
        } finally {
          setLoading(false);
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
    searchTerm,
    clientUsername,
    firms,
    documentTypes,
    refreshTrigger
  ]);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFirm, selectedYear, selectedType, selectedMonth, selectedService, selectedCategory, searchTerm, activeTab]);

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
      else if (activeTab === 'general') {
        showToast.error('General tab upload not implemented yet');
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

  // Handle select all
  const handleSelectAll = () => {
    if (selectedDocuments.length === currentItems.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(currentItems.map(doc => doc.id));
    }
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
      return 'ALL AY';
    } else if (activeTab === 'gst' || activeTab === 'mca') {
      return 'ALL FY';
    }
    return 'All Years';
  }, [activeTab]);

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

  // Filter documents based on selected filters
  const getFilteredDocuments = useCallback(() => {
    let filtered = documents[activeTab] || [];

    if (selectedFirm !== 'all') {
      filtered = filtered.filter(doc => doc.firm_id === selectedFirm);
    }

    if (selectedYear !== 'all') {
      filtered = filtered.filter(doc => doc.year === selectedYear);
    }

    if (selectedType !== 'all' && activeTab !== 'task' && activeTab !== 'general') {
      filtered = filtered.filter(doc => doc.type_value === selectedType);
    }

    if (activeTab === 'gst' && selectedMonth !== 'all') {
      filtered = filtered.filter(doc => doc.month === selectedMonth);
    }

    if (activeTab === 'task' && selectedService !== 'all') {
      filtered = filtered.filter(doc => doc.service === selectedService);
    }

    if (activeTab === 'general' && selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        Object.values(doc).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return filtered;
  }, [activeTab, documents, selectedFirm, selectedYear, selectedType, selectedMonth, selectedService, selectedCategory, searchTerm]);

  const filteredDocuments = getFilteredDocuments();

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-xl"
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
      <div className="border-b border-gray-200 px-6 pt-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              Document Management System
            </h2>
            {/* Storage Usage Indicator */}
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
              <FiHardDrive className="w-5 h-5 text-slate-500" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Storage:</span>
                  <span className="text-sm text-slate-600">{formatStorage(storageUsed)} / 5 GB</span>
                </div>
                <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${storagePercentage > 90 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'general' ? (
              <div className="relative dropdown-container">
                <motion.button
                  onClick={() => setShowGeneralDropdown(!showGeneralDropdown)}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiPlus className="w-5 h-5" />
                  Add New
                  <FiChevronDown className="w-4 h-4" />
                </motion.button>

                {showGeneralDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        setShowUploadModal(true);
                        setShowGeneralDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiUpload className="w-4 h-4" />
                      Upload Document
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateCategoryModal(true);
                        setShowGeneralDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2"
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
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiPlus className="w-5 h-5" />
                  Add Document
                </motion.button>
              )
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedDocuments([]);
                  setActiveActionMenu(null);
                  setSelectedYear('all');
                  setSelectedType('all');
                  setShowGeneralSubTab('documents');
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-medium transition-all relative whitespace-nowrap ${activeTab === tab.id
                    ? `text-${tab.color}-600 bg-white border-t-2 border-l border-r border-gray-200 -mb-px`
                    : 'text-slate-600 hover:text-slate-800 hover:bg-gray-50'
                  }`}
              >
                <Icon className={`w-5 h-5 ${activeTab === tab.id ? `text-${tab.color}-600` : ''}`} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${tab.color}-600`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* General Tab Sub-tabs */}
      {activeTab === 'general' && (
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setShowGeneralSubTab('documents')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${showGeneralSubTab === 'documents'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-gray-100'
                }`}
            >
              Documents
            </button>
            <button
              onClick={() => setShowGeneralSubTab('categories')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${showGeneralSubTab === 'categories'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-gray-100'
                }`}
            >
              Categories
            </button>
          </div>
        </div>
      )}

      {/* Filters Bar - Show only for documents view */}
      {(activeTab !== 'general' || (activeTab === 'general' && showGeneralSubTab === 'documents')) && (
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <div className="flex flex-wrap gap-4 items-center">
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
                    { value: 'all', label: getYearLabel() },
                    ...getYearOptions().map((year) => ({ value: year, label: year })),
                  ]}
                  value={optionByValue([
                    { value: 'all', label: getYearLabel() },
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
                    ...getCurrentTabTypes().map((type) => ({ value: type.value, label: type.name })),
                  ]}
                  value={optionByValue([
                    { value: 'all', label: 'All Types' },
                    ...getCurrentTabTypes().map((type) => ({ value: type.value, label: type.name })),
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
              <>
                <div className="min-w-[220px]">
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'All Categories' },
                      ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
                    ]}
                    value={optionByValue([
                      { value: 'all', label: 'All Categories' },
                      ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
                    ], selectedCategory)}
                    onChange={(opt) => setSelectedCategory(opt?.value || 'all')}
                    searchPlaceholder="Search category..."
                    isDisabled={loadingCategories}
                    isClearable={false}
                  />
                </div>
                <div className="flex-1 relative min-w-[200px]">
                  <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {selectedDocuments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-200"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-700">
                  {selectedDocuments.length} document(s) selected
                </span>
                <button
                  onClick={() => setSelectedDocuments([])}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkSend}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <FiSend className="w-4 h-4" />
                  Send Selected
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Delete Selected
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Table Section - Documents */}
      {(activeTab !== 'general' || (activeTab === 'general' && showGeneralSubTab === 'documents')) && (
        <div className="p-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Table Container */}
            {!loading && (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <th className="w-16 px-6 py-4 text-left">
                        <button
                          onClick={handleSelectAll}
                          className="text-slate-500 hover:text-slate-700"
                          title={selectedDocuments.length === currentItems.length ? "Deselect all" : "Select all"}
                        >
                          {selectedDocuments.length === currentItems.length && currentItems.length > 0 ? (
                            <div className="relative inline-block">
                              <div className="w-10 h-5 bg-blue-600 rounded-full transition-colors"></div>
                              <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform"></div>
                            </div>
                          ) : (
                            <div className="relative inline-block">
                              <div className="w-10 h-5 bg-gray-300 rounded-full transition-colors"></div>
                              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform"></div>
                            </div>
                          )}
                        </button>
                      </th>

                      {/* Dynamic Table Headers based on active tab */}
                      {activeTab === 'income-tax' && (
                        <>
                          <th className="w-1/5 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Firm</th>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Assessment Year</th>
                          <th className="w-1/5 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                          <th className="w-1/3 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remark</th>
                          <th className="w-24 px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">View</th>
                          <th className="w-24 px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                        </>
                      )}

                      {activeTab === 'gst' && (
                        <>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Firm</th>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Financial Year</th>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Month</th>
                          <th className="w-1/4 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remark</th>
                          <th className="w-24 px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">View</th>
                          <th className="w-24 px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                        </>
                      )}

                      {activeTab === 'mca' && (
                        <>
                          <th className="w-1/5 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Firm</th>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Financial Year</th>
                          <th className="w-1/5 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                          <th className="w-1/3 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remark</th>
                          <th className="w-24 px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">View</th>
                          <th className="w-24 px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                        </>
                      )}

                      {activeTab === 'task' && (
                        <>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Firm</th>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Service</th>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                          <th className="w-1/3 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remark</th>
                          <th className="w-24 px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">View</th>
                          <th className="w-24 px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                        </>
                      )}

                      {activeTab === 'general' && (
                        <>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Firm</th>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                          <th className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                          <th className="w-1/3 px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remark</th>
                          <th className="w-24 px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">View</th>
                          <th className="w-24 px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    <AnimatePresence>
                      {currentItems.length > 0 ? (
                        currentItems.map((doc, index) => (
                          <motion.tr
                            key={doc.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.05 }}
                            className={`hover:bg-gray-50 transition-colors ${selectedDocuments.includes(doc.id) ? 'bg-blue-50/50' : ''
                              }`}
                          >
                            <td className="px-6 py-4 align-middle">
                              <button
                                onClick={() => handleSelect(doc.id)}
                                className="text-slate-500 hover:text-slate-700"
                                title={selectedDocuments.includes(doc.id) ? "Deselect" : "Select"}
                              >
                                {selectedDocuments.includes(doc.id) ? (
                                  <div className="relative inline-block">
                                    <div className="w-10 h-5 bg-blue-600 rounded-full transition-colors"></div>
                                    <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform"></div>
                                  </div>
                                ) : (
                                  <div className="relative inline-block">
                                    <div className="w-10 h-5 bg-gray-300 rounded-full transition-colors"></div>
                                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform"></div>
                                  </div>
                                )}
                              </button>
                            </td>

                            {/* Dynamic Table Cells based on active tab */}
                            {activeTab === 'income-tax' && (
                              <>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm font-medium text-slate-800 truncate" title={doc.firm}>{doc.firm}</div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm text-slate-600">{doc.year}</div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium truncate block max-w-[120px]" title={doc.type}>
                                    {doc.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm text-slate-600 truncate" title={doc.remark}>{truncateText(doc.remark, 30)}</div>
                                </td>
                              </>
                            )}

                            {activeTab === 'gst' && (
                              <>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm font-medium text-slate-800 truncate" title={doc.firm}>{doc.firm}</div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm text-slate-600">{doc.year}</div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium truncate block max-w-[120px]" title={doc.type}>
                                    {doc.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm text-slate-600 truncate" title={doc.month}>{doc.month}</div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm text-slate-600 truncate" title={doc.remark}>{truncateText(doc.remark, 30)}</div>
                                </td>
                              </>
                            )}

                            {activeTab === 'mca' && (
                              <>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm font-medium text-slate-800 truncate" title={doc.firm}>{doc.firm}</div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm text-slate-600">{doc.year}</div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium truncate block max-w-[120px]" title={doc.type}>
                                    {doc.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm text-slate-600 truncate" title={doc.remark}>{truncateText(doc.remark, 30)}</div>
                                </td>
                              </>
                            )}

                            {activeTab === 'task' && (
                              <>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm font-medium text-slate-800 truncate" title={doc.firm}>{doc.firm}</div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium truncate block max-w-[120px]" title={doc.service}>
                                    {doc.service}
                                  </span>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm font-medium text-slate-800 truncate" title={doc.name}>{doc.name}</div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm text-slate-600 truncate" title={doc.remark}>{truncateText(doc.remark, 30)}</div>
                                </td>
                              </>
                            )}

                            {activeTab === 'general' && (
                              <>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm font-medium text-slate-800 truncate" title={doc.firm}>{doc.firm}</div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm font-medium text-slate-800 truncate" title={doc.name}>{doc.name}</div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <span className="px-3 py-1 bg-gray-50 text-slate-700 rounded-full text-xs font-medium truncate block max-w-[120px]" title={doc.category}>
                                    {doc.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                  <div className="text-sm text-slate-600 truncate" title={doc.remark}>{truncateText(doc.remark, 30)}</div>
                                </td>
                              </>
                            )}

                            {/* View Column */}
                            <td className="px-6 py-4 text-center align-middle">
                              <button
                                onClick={() => handleView(doc)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View"
                              >
                                <FiEye className="w-5 h-5" />
                              </button>
                            </td>

                            {/* Actions Column with 3-dot menu */}
                            <td className="px-6 py-4 text-center align-middle relative action-menu-container" ref={actionMenuRef}>
                              <button
                                onClick={() => setActiveActionMenu(activeActionMenu === doc.id ? null : doc.id)}
                                className="p-2 text-slate-500 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <FiMenu className="w-3.5 h-3.5" />
                              </button>

                              {/* Action Menu */}
                              {activeActionMenu === doc.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                                  <button
                                    onClick={() => {
                                      handleView(doc);
                                      setActiveActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <FiEye className="w-4 h-4" />
                                    View
                                  </button>
                                  {doc.file_url && (
                                    <a
                                      href={doc.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <FiDownload className="w-4 h-4" />
                                      Download
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleSend(doc)}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <FiSend className="w-4 h-4" />
                                    Send
                                  </button>
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="10" className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <FiFolder className="w-8 h-8 text-slate-400" />
                              </div>
                              <h3 className="text-sm font-semibold text-slate-800 mb-2">No documents found</h3>
                              <p className="text-slate-600">Try adjusting your search or filter criteria</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories Table for General Tab */}
      {activeTab === 'general' && showGeneralSubTab === 'categories' && (
        <div className="p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Categories</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remark</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created By</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Modified By</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Modified Date</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.category_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800">{category.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">{category.remark || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {category.create_by?.name || category.create_by?.username || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {category.create_date ? new Date(category.create_date).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {category.modify_by?.name || category.modify_by?.username || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {category.modify_date ? new Date(category.modify_date).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditCategoryModal(category)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Category"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.category_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Pagination */}
      {filteredDocuments.length > 0 && !loading && (
        <div className="px-6 pb-6">
          <Pagination
            pagination={{
              page: currentPage,
              limit: itemsPerPage,
              total: filteredDocuments.length,
              total_pages: totalPages,
              is_last_page: currentPage === totalPages
            }}
            onPageChange={setCurrentPage}
            onLimitChange={setItemsPerPage}
            onCustomPageChange={setCurrentPage}
            loading={false}
            showPageInfo={true}
            showLimitSelector={true}
            showCustomInput={true}
          />
        </div>
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