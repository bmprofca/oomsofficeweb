import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiEye, FiCheckCircle, FiXCircle, FiEdit2, FiTrash2, FiPaperclip, FiExternalLink, FiFilter } from 'react-icons/fi';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";

// --- Add Expense Modal Component ---
const AddExpenseModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    attachment: null,
    attachmentPreview: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        attachment: file,
        attachmentPreview: URL.createObjectURL(file)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.amount || !formData.date) return;
    
    setIsSubmitting(true);
    try {
      await onAdd(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting expense:', error);
      alert('Failed to submit expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-gray-900">Add New Expense</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="e.g., Client Dinner, Office Supplies"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Detailed description of the expense..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Receipt/Bill)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm"
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {formData.attachmentPreview && (
                <span className="text-sm text-green-600">✓ File selected</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Upload receipt or invoice (image or PDF)</p>
            {formData.attachmentPreview && (
              <div className="mt-2">
                {formData.attachment.type.startsWith('image/') ? (
                  <img src={formData.attachmentPreview} alt="Preview" className="max-h-32 rounded-lg" />
                ) : (
                  <span className="text-sm text-gray-600">{formData.attachment.name}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Expense'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- Admin Verification Modal (using /verify endpoint) ---
const AdminVerifyModal = ({ expense, onClose, onVerify }) => {
  const [action, setAction] = useState('approve');
  const [remarks, setRemarks] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleConfirm = async () => {
    setIsVerifying(true);
    await onVerify(expense.expense_id || expense.id, action, remarks);
    setIsVerifying(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-900 mb-4">Verify Expense</h3>
        <div className="space-y-3 mb-6">
          <p><span className="font-medium">Title:</span> {expense.title}</p>
          <p><span className="font-medium">Description:</span> {expense.description}</p>
          <p><span className="font-medium">Amount:</span> ₹{expense.amount}</p>
          <p><span className="font-medium">Date:</span> {expense.expense_date || expense.date}</p>
          {expense.attachment && (
            <p>
              <span className="font-medium">Attachment:</span>{' '}
              <a href={expense.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                View File <FiExternalLink size={12} />
              </a>
            </p>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Add verification remarks..."
          />
        </div>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setAction('approve')}
            className={`flex-1 py-2 rounded-xl border transition flex items-center justify-center gap-1 ${action === 'approve' ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-300 text-gray-600'}`}
          >
            <FiCheckCircle size={16} /> Approve
          </button>
          <button
            onClick={() => setAction('reject')}
            className={`flex-1 py-2 rounded-xl border transition flex items-center justify-center gap-1 ${action === 'reject' ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-300 text-gray-600'}`}
          >
            <FiXCircle size={16} /> Reject
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
          <button 
            onClick={handleConfirm} 
            disabled={isVerifying}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {isVerifying ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Preview Attachment Modal (supports base64) ---
const PreviewAttachmentModal = ({ url, base64, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState(url);
  const isImage = (previewUrl) => {
    if (!previewUrl) return false;
    return previewUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) || previewUrl.startsWith('data:image/');
  };
  
  useEffect(() => {
    if (base64 && !url) {
      // Construct data URL from base64
      const dataUrl = base64.startsWith('data:') ? base64 : `data:application/pdf;base64,${base64}`;
      setPreviewUrl(dataUrl);
    }
  }, [base64, url]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Attachment Preview</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4 flex justify-center">
          {isImage(previewUrl) ? (
            <img src={previewUrl} alt="Attachment" className="max-w-full h-auto rounded-lg" />
          ) : previewUrl?.startsWith('data:application/pdf') || previewUrl?.endsWith('.pdf') ? (
            <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg" title="PDF Preview" />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FiPaperclip size={48} className="mx-auto mb-4" />
              <p>Unable to preview this file type</p>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">
                Download File
              </a>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm">
            Open in New Tab
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Action Dropdown Menu ---
const ActionMenu = ({ expense, onView, onVerify, onEdit, onDelete, onPreview }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAvailableActions = () => {
    const actions = [];
    if (expense.attachment_url || expense.attachment_base64) actions.push({ label: 'Preview', icon: FiPaperclip, action: onPreview });
    actions.push({ label: 'View', icon: FiEye, action: onView });
    if (expense.status === 'Pending') actions.push({ label: 'Verify', icon: FiCheckCircle, action: onVerify });
    if (expense.status === 'Pending') actions.push({ label: 'Edit', icon: FiEdit2, action: onEdit });
    if (expense.status !== 'Approved') actions.push({ label: 'Delete', icon: FiTrash2, action: onDelete });
    return actions;
  };

  const actions = getAvailableActions();
  if (actions.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
      >
        <FiMenu size={18} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10"
          >
            {actions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsOpen(false);
                  item.action();
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
              >
                <item.icon size={14} /> {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- View Expense Modal ---
const ViewExpenseModal = ({ expense, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Expense Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="space-y-3">
          <div className="flex">
            <span className="w-28 text-sm font-medium text-gray-500">Title:</span>
            <span className="text-sm text-gray-900">{expense.title}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-sm font-medium text-gray-500">Description:</span>
            <span className="text-sm text-gray-900">{expense.description}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-sm font-medium text-gray-500">Amount:</span>
            <span className="text-sm font-semibold text-gray-900">₹{expense.amount.toLocaleString()}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-sm font-medium text-gray-500">Date:</span>
            <span className="text-sm text-gray-900">{expense.date}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-sm font-medium text-gray-500">Status:</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              expense.status === 'Approved' ? 'bg-green-100 text-green-800' :
              expense.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
            }`}>{expense.status}</span>
          </div>
          {expense.remarks && (
            <div className="flex">
              <span className="w-28 text-sm font-medium text-gray-500">Remarks:</span>
              <span className="text-sm text-gray-600">{expense.remarks}</span>
            </div>
          )}
          {expense.approved_by && (
            <div className="flex">
              <span className="w-28 text-sm font-medium text-gray-500">Approved By:</span>
              <span className="text-sm text-gray-600">{expense.approved_by}</span>
            </div>
          )}
          {expense.approved_date && (
            <div className="flex">
              <span className="w-28 text-sm font-medium text-gray-500">Approved Date:</span>
              <span className="text-sm text-gray-600">{new Date(expense.approved_date).toLocaleString()}</span>
            </div>
          )}
          {(expense.attachment_url || expense.attachment_base64) && (
            <div className="flex">
              <span className="w-28 text-sm font-medium text-gray-500">Attachment:</span>
              <a href={expense.attachment_url || `data:application/pdf;base64,${expense.attachment_base64}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1">
                View File <FiExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Filter Buttons Component ---
const FilterButtons = ({ activeFilter, onFilterChange, counts }) => {
  const filters = [
    { key: 'All', label: 'All', count: counts.all },
    { key: 'Pending', label: 'Pending', count: counts.pending },
    { key: 'Approved', label: 'Approved', count: counts.approved },
    { key: 'Rejected', label: 'Rejected', count: counts.rejected },
  ];

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            activeFilter === filter.key
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {filter.label}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            activeFilter === filter.key ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
          }`}>
            {filter.count}
          </span>
        </button>
      ))}
    </div>
  );
};

// --- Main Component ---
const ExpenseTab = ({ staffUsername, expenses: initialExpenses = [], setExpenses: setExternalExpenses, variants }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(null);
  const [showViewModal, setShowViewModal] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(null);
  const [previewData, setPreviewData] = useState({ url: null, base64: null });
  const [expenses, setExpensesState] = useState(initialExpenses);
  const [ledger, setLedger] = useState({ totalApproved: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  const getStaffUsername = () => {
    if (staffUsername) return staffUsername;
    const pathSegments = window.location.pathname.split('/');
    const usernameFromPath = pathSegments[pathSegments.length - 1];
    if (usernameFromPath && usernameFromPath !== 'staff-expenses') return usernameFromPath;
    const urlParams = new URLSearchParams(window.location.search);
    const usernameFromQuery = urlParams.get('username');
    if (usernameFromQuery) return usernameFromQuery;
    return null;
  };

  const currentStaffUsername = getStaffUsername();

  const fetchExpenses = async () => {
    if (!currentStaffUsername) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/staff-expenses/list/${currentStaffUsername}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      const result = await response.json();
      if (result.success) {
        const formattedExpenses = result.data.map(exp => ({
          id: exp.expense_id,
          expense_id: exp.expense_id,
          title: exp.title,
          description: exp.description,
          amount: parseFloat(exp.amount),
          date: exp.expense_date?.split('T')[0] || exp.create_date?.split('T')[0],
          expense_date: exp.expense_date,
          attachment: exp.attachment,
          attachment_url: exp.attachment_url,
          attachment_base64: exp.attachment_base64,
          status: exp.status_text === 'approved' ? 'Approved' : 
                  exp.status_text === 'rejected' ? 'Rejected' : 'Pending',
          verifiedByAdmin: exp.status_text === 'approved' || exp.status_text === 'rejected',
          status_code: exp.status,
          transaction_id: exp.transaction_id,
          remarks: exp.remarks,
          approved_by: exp.approved_by,
          approved_date: exp.approved_date,
          create_date: exp.create_date,
        }));
        setExpensesState(formattedExpenses);
        if (result.summary) {
          setSummary(result.summary);
          setLedger({
            totalApproved: parseFloat(result.summary.total_approved_amount || 0),
            transactions: result.data
              .filter(exp => exp.status_text === 'approved')
              .map(exp => ({
                id: exp.transaction_id || exp.expense_id,
                expenseId: exp.expense_id,
                amount: parseFloat(exp.amount),
                date: exp.approved_date?.split('T')[0] || exp.expense_date?.split('T')[0],
                note: exp.title,
              }))
          });
        }
        if (setExternalExpenses) setExternalExpenses(formattedExpenses);
      } else {
        setError(result.message || 'Failed to fetch expenses');
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };
const handleAddExpense = async (newExpenseData) => {
  if (!currentStaffUsername) {
    alert('Staff username not found');
    return;
  }
  
  const formData = new FormData();
  formData.append('title', newExpenseData.title);
  formData.append('description', newExpenseData.description);
  formData.append('amount', newExpenseData.amount);
  formData.append('date', newExpenseData.date);
  formData.append('staff_username', currentStaffUsername);
  if (newExpenseData.attachment) {
    formData.append('attachment', newExpenseData.attachment);
  }
  
  try {
    const headers = getHeaders();
    // Remove Content-Type header to allow browser to set correct multipart boundary
    delete headers['Content-Type'];
    delete headers['content-type']; // Also check lowercase variant
    
    const response = await fetch(`${API_BASE_URL}/staff-expenses/create`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    
    const result = await response.json();
    
    if (result.success) {
      await fetchExpenses();
      alert(result.message || 'Expense submitted successfully');
    } else {
      throw new Error(result.message || 'Failed to submit expense');
    }
  } catch (error) {
    console.error('Error submitting expense:', error);
    throw error;
  }
};

  // Admin verification using the new /verify endpoint
  const handleVerifyExpense = async (expenseId, action, remarks) => {
    const response = await fetch(`${API_BASE_URL}/staff-expenses/verify`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expense_id: expenseId,
        action: action,
        remarks: remarks || (action === 'approve' ? 'Expense approved' : 'Expense rejected'),
      }),
    });
    const result = await response.json();
    if (result.success) {
      await fetchExpenses();
      alert(result.message || `Expense ${action}d successfully`);
    } else {
      alert(result.message || `Failed to ${action} expense`);
    }
  };

  const handleDeleteExpense = async (id) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    if (expenseToDelete?.status === 'Approved') {
      if (!window.confirm('This expense is already in ledger. Delete will not reverse ledger entry. Continue?')) return;
    }
    const response = await fetch(`${API_BASE_URL}/staff-expenses/delete/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await response.json();
    if (result.success) {
      await fetchExpenses();
      alert('Expense deleted successfully');
    } else {
      alert(result.message || 'Failed to delete expense');
    }
  };

  const handleEditExpense = async (expense) => {
    const newTitle = prompt('Edit title:', expense.title);
    if (newTitle && newTitle !== expense.title) {
      const response = await fetch(`${API_BASE_URL}/staff-expenses/update/${expense.id}`, {
        method: 'PUT',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchExpenses();
        alert('Expense updated successfully');
      } else {
        alert(result.message || 'Failed to update expense');
      }
    }
  };

  // Get filtered expenses based on active filter
  const getFilteredExpenses = () => {
    if (activeFilter === 'All') return expenses;
    return expenses.filter(expense => expense.status === activeFilter);
  };

  // Get filter counts
  const getFilterCounts = () => {
    return {
      all: expenses.length,
      pending: expenses.filter(e => e.status === 'Pending').length,
      approved: expenses.filter(e => e.status === 'Approved').length,
      rejected: expenses.filter(e => e.status === 'Rejected').length,
    };
  };

  const filteredExpenses = getFilteredExpenses();
  const filterCounts = getFilterCounts();

  useEffect(() => {
    fetchExpenses();
  }, [currentStaffUsername]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && expenses.length === 0) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>{error}</p>
        <button onClick={fetchExpenses} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    );
  }

  return (
    <>
      <motion.div variants={variants} initial="initial" animate="animate" exit="exit" className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Expense Management</h3>
            <p className="text-sm text-gray-500 mt-0.5">{currentStaffUsername ? `Staff: ${currentStaffUsername}` : 'Track, submit, and verify expenses'}</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="bg-green-50 px-4 py-2 rounded-xl">
              <p className="text-xs text-green-600 font-medium">Ledger Balance</p>
              <p className="text-xl font-bold text-green-700">₹{ledger.totalApproved.toLocaleString()}</p>
            </div>
            <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm">
              + Add Expense
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">Total Expenses</p><p className="text-lg font-bold text-gray-800">{summary.total_expenses}</p></div>
            <div className="bg-yellow-50 rounded-xl p-3"><p className="text-xs text-yellow-600">Pending</p><p className="text-lg font-bold text-yellow-700">{summary.pending_count}</p></div>
            <div className="bg-green-50 rounded-xl p-3"><p className="text-xs text-green-600">Approved</p><p className="text-lg font-bold text-green-700">{summary.approved_count}</p></div>
            <div className="bg-red-50 rounded-xl p-3"><p className="text-xs text-red-600">Rejected</p><p className="text-lg font-bold text-red-700">{summary.rejected_count}</p></div>
          </div>
        )}

        {/* Filter Buttons */}
        <FilterButtons 
          activeFilter={activeFilter} 
          onFilterChange={setActiveFilter} 
          counts={filterCounts}
        />

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  {activeFilter === 'All' ? 'No expenses found. Click "Add Expense" to get started.' : `No ${activeFilter.toLowerCase()} expenses found.`}
                </td></tr>
              ) : (
                filteredExpenses.map((expense, idx) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{expense.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <div className="truncate">{expense.description}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">₹{expense.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        expense.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        expense.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{expense.status}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <ActionMenu
                        expense={expense}
                        onView={() => setShowViewModal(expense)}
                        onVerify={() => setShowVerifyModal(expense)}
                        onEdit={() => handleEditExpense(expense)}
                        onDelete={() => handleDeleteExpense(expense.id)}
                        onPreview={() => {
                          setPreviewData({
                            url: expense.attachment_url,
                            base64: expense.attachment_base64
                          });
                          setShowPreviewModal(true);
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Ledger Credits */}
        {ledger.transactions.length > 0 && (
          <div className="mt-8 pt-4 border-t border-gray-100">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Recent Ledger Credits</h4>
            <div className="space-y-2">
              {ledger.transactions.slice(0, 3).map(tx => (
                <div key={tx.id} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-xl">
                  <div><span className="font-medium">{tx.note}</span><span className="text-gray-400 text-xs ml-2">{tx.date}</span></div>
                  <span className="text-green-600 font-semibold">+₹{tx.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && <AddExpenseModal onClose={() => setShowAddModal(false)} onAdd={handleAddExpense} />}
        {showVerifyModal && <AdminVerifyModal expense={showVerifyModal} onClose={() => setShowVerifyModal(null)} onVerify={handleVerifyExpense} />}
        {showViewModal && <ViewExpenseModal expense={showViewModal} onClose={() => setShowViewModal(null)} />}
        {showPreviewModal && <PreviewAttachmentModal url={previewData.url} base64={previewData.base64} onClose={() => setShowPreviewModal(false)} />}
      </AnimatePresence>
    </>
  );
};

export default ExpenseTab;