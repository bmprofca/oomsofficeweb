import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus,
  FiRefreshCw,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiTrash2,
  FiPaperclip,
  FiExternalLink,
  FiX,
  FiUploadCloud,
  FiFileText,
  FiImage,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import CustomSelect from '../components/CustomSelect';
import { optionByValue } from '../utils/customSelectHelpers';
import { DatePickerField, DateRangePickerField, toIsoDate } from '../components/PortalDatePicker';
import TablePagination from '../components/TablePagination';
import EmailActionMenu from '../pages/broadcast/email/EmailActionMenu';
import { fetchExpenseItemList } from '../services/expenseItemService';
import { uploadOneSaasFileUrl } from '../utils/onesaas-upload';

const MODAL_Z = 1100;
const INPUT_CLASS =
  'w-full h-10 text-sm border border-slate-200 rounded-xl bg-white outline-none transition focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 px-3 disabled:bg-slate-50';
const LABEL_CLASS = 'mb-1.5 block text-xs font-semibold text-slate-600';

const STATUS_SELECT_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: '0', label: 'Pending' },
  { value: '1', label: 'Approved' },
  { value: '2', label: 'Rejected' },
];

/** Allow digits and a single decimal point (integer / float typing). */
function sanitizeAmountInput(raw) {
  let next = String(raw ?? '').replace(/[^\d.]/g, '');
  const firstDot = next.indexOf('.');
  if (firstDot === -1) return next;
  return next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, '');
}

function isValidAmount(value) {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) && n > 0;
}

function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function defaultFromDate() {
  const d = new Date();
  d.setDate(1);
  return toIsoDate(d);
}

function DetailRow({ label, children, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 text-sm last:border-b-0">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 text-right font-medium text-slate-900">{children ?? value ?? '—'}</span>
    </div>
  );
}

function ExpenseModalFrame({
  isOpen = true,
  title,
  subtitle,
  onClose,
  disableClose = false,
  maxWidthClass = 'max-w-lg',
  footer,
  children,
  titleId = 'expense-modal-title',
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key={titleId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[1100] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
          style={{ zIndex: MODAL_Z }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-hidden="true"
            onClick={disableClose ? undefined : onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-[1] pointer-events-auto flex w-full ${maxWidthClass} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]`}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="shrink-0 border-b border-slate-100 px-5 py-3.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id={titleId} className="m-0 text-sm font-semibold text-slate-900">
                  {title}
                </h2>
                {subtitle ? <p className="m-0 mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={disableClose}
                className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close"
              >
                <FiX className="w-4 h-4" />
              </button>
            </header>
            <div
              className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {children}
            </div>
            {footer ? (
              <footer className="shrink-0 border-t border-slate-100 px-5 py-3 bg-white">{footer}</footer>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

const sk = 'animate-pulse rounded bg-slate-200/80';

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;

/** DD/MM/YYYY */
const formatDate = (value) => {
  if (!value) return '—';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const EXPENSE_COLS = {
  index: '6%',
  item: '28%',
  amount: '14%',
  date: '14%',
  status: '14%',
  actions: '10%',
};

const EXPENSE_TABLE_HEADERS = [
  { key: 'index', label: '#', align: 'left', width: EXPENSE_COLS.index },
  { key: 'item', label: 'Item', align: 'left', width: EXPENSE_COLS.item },
  { key: 'amount', label: 'Amount', align: 'right', width: EXPENSE_COLS.amount },
  { key: 'date', label: 'Date', align: 'left', width: EXPENSE_COLS.date },
  { key: 'status', label: 'Status', align: 'left', width: EXPENSE_COLS.status },
  { key: 'actions', label: 'Actions', align: 'right', width: EXPENSE_COLS.actions },
];

function ExpenseTableHead() {
  return (
    <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
      <tr>
        {EXPENSE_TABLE_HEADERS.map((h) => (
          <th
            key={h.key}
            style={{ width: h.width }}
            className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-700 ${
              h.align === 'right' ? 'text-right' : 'text-left'
            }`}
          >
            {h.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function ExpenseTableSkeleton({ rows = 8 }) {
  return (
    <div className="overflow-x-auto" aria-busy="true">
      <table className="min-w-full table-fixed text-left text-sm font-sans">
        <ExpenseTableHead />
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="px-3 py-2.5">
                <div className={`${sk} h-3.5 w-6`} />
              </td>
              <td className="px-3 py-2.5">
                <div className={`${sk} h-3.5 w-32 max-w-full`} />
              </td>
              <td className="px-3 py-2.5">
                <div className={`${sk} ml-auto h-5 w-16 rounded`} />
              </td>
              <td className="px-3 py-2.5">
                <div className={`${sk} h-3.5 w-20`} />
              </td>
              <td className="px-3 py-2.5">
                <div className={`${sk} h-6 w-16 rounded-full`} />
              </td>
              <td className="px-3 py-2.5">
                <div className={`${sk} ml-auto h-7 w-7 rounded-lg`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpensePageSkeleton({ limit = 20 }) {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={`${sk} h-6 w-28`} />
        <div className="flex gap-2">
          <div className={`${sk} h-9 w-9 rounded-lg`} />
          <div className={`${sk} h-9 w-28 rounded-lg`} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${sk} h-16 rounded-lg`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className={`${sk} h-9 w-full max-w-xs rounded-lg`} />
        <div className={`${sk} h-9 w-40 rounded-lg`} />
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <ExpenseTableSkeleton rows={Math.min(limit, 8)} />
        <div className="border-t border-slate-200 px-4 py-3">
          <div className={`${sk} h-9 w-full max-w-md rounded-lg`} />
        </div>
      </div>
    </div>
  );
}

const STATUS_MAP = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function formatExpenseRow(exp) {
  const statusText = exp.status_text || (exp.status === '1' ? 'approved' : exp.status === '2' ? 'rejected' : 'pending');
  return {
    id: exp.expense_id,
    expense_id: exp.expense_id,
    title: exp.item_name || exp.title,
    item_id: exp.item_id,
    item_name: exp.item_name || exp.title,
    description: exp.description,
    amount: parseFloat(exp.amount),
    date: exp.expense_date?.toString().split('T')[0] || exp.create_date?.toString().split('T')[0],
    expense_date: exp.expense_date,
    attachment: exp.attachment,
    attachment_url: exp.attachment_url,
    attachment_base64: exp.attachment_base64,
    status: STATUS_MAP[statusText] || 'Pending',
    verifiedByAdmin: statusText === 'approved' || statusText === 'rejected',
    status_code: exp.status,
    transaction_id: exp.transaction_id,
    linked_expense_id: exp.linked_expense_id,
    remarks: exp.remarks,
    approved_by: exp.approved_by,
    approved_date: exp.approved_date,
    create_date: exp.create_date,
  };
}

const AddExpenseModal = ({ isOpen, onClose, onAdd, requireStaffSelect = false }) => {
  const [formData, setFormData] = useState({
    item_id: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    staff_username: '',
    attachment: null,
    attachmentPreview: null,
    attachmentUrl: null,
  });
  const [itemOptions, setItemOptions] = useState([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [staffOptions, setStaffOptions] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [amountError, setAmountError] = useState('');
  const fileInputRef = useRef(null);
  const uploadRequestIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      item_id: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      staff_username: '',
      attachment: null,
      attachmentPreview: null,
      attachmentUrl: null,
    });
    setUploadProgress(0);
    setIsUploadingAttachment(false);
    setIsDragOver(false);
    setAmountError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    const loadItems = async () => {
      setItemLoading(true);
      try {
        const res = await fetchExpenseItemList({ type: 'indirect', page_no: 1, limit: 100 });
        if (cancelled) return;
        const rows = res?.data || res?.items || [];
        setItemOptions(
          (Array.isArray(rows) ? rows : []).map((row) => ({
            value: row.item_id,
            label: row.name,
          }))
        );
      } catch (err) {
        console.error(err);
        toast.error('Failed to load expense items');
      } finally {
        if (!cancelled) setItemLoading(false);
      }
    };
    loadItems();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !requireStaffSelect) return undefined;
    let cancelled = false;
    const loadStaff = async () => {
      setStaffLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/settings/staff/list?search=&page=1&limit=100&status=active`,
          { headers: getHeaders() }
        );
        const result = await response.json();
        if (cancelled) return;
        const rows = result?.data || result?.staff || [];
        setStaffOptions(
          (Array.isArray(rows) ? rows : [])
            .filter((row) => row?.username)
            .map((row) => {
              const name = row.profile?.name || row.name || '';
              const mobile = row.profile?.mobile || row.mobile || '';
              const label = [name, mobile].filter(Boolean).join(' · ') || 'Staff';
              return {
                value: row.username,
                label,
              };
            })
        );
      } catch (err) {
        console.error(err);
        toast.error('Failed to load staff list');
      } finally {
        if (!cancelled) setStaffLoading(false);
      }
    };
    loadStaff();
    return () => {
      cancelled = true;
    };
  }, [isOpen, requireStaffSelect]);

  const clearAttachment = () => {
    uploadRequestIdRef.current += 1;
    setFormData((prev) => {
      if (prev.attachmentPreview) URL.revokeObjectURL(prev.attachmentPreview);
      return {
        ...prev,
        attachment: null,
        attachmentPreview: null,
        attachmentUrl: null,
      };
    });
    setIsUploadingAttachment(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = async (file) => {
    if (!file) return;
    const allowed =
      /^(image\/(jpeg|jpg|png|gif|webp)|application\/pdf)$/i.test(file.type) ||
      /\.(jpe?g|png|gif|webp|pdf)$/i.test(file.name);
    if (!allowed) {
      toast.error('Only images or PDF files are allowed');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File must be under 50MB');
      return;
    }

    const preview = URL.createObjectURL(file);
    const requestId = ++uploadRequestIdRef.current;

    setFormData((prev) => {
      if (prev.attachmentPreview) URL.revokeObjectURL(prev.attachmentPreview);
      return {
        ...prev,
        attachment: file,
        attachmentPreview: preview,
        attachmentUrl: null,
      };
    });

    setIsUploadingAttachment(true);
    setUploadProgress(0);
    try {
      const url = await uploadOneSaasFileUrl(file, (progress) => {
        if (requestId === uploadRequestIdRef.current) setUploadProgress(progress);
      });
      if (requestId !== uploadRequestIdRef.current) return;
      setFormData((prev) => ({ ...prev, attachmentUrl: url }));
      setUploadProgress(100);
      toast.success('Attachment uploaded');
    } catch (error) {
      if (requestId !== uploadRequestIdRef.current) return;
      console.error('Error uploading attachment:', error);
      setFormData((prev) => {
        if (prev.attachmentPreview) URL.revokeObjectURL(prev.attachmentPreview);
        return {
          ...prev,
          attachment: null,
          attachmentPreview: null,
          attachmentUrl: null,
        };
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadProgress(0);
      toast.error(error?.message || 'Failed to upload attachment');
    } finally {
      if (requestId === uploadRequestIdRef.current) {
        setIsUploadingAttachment(false);
      }
    }
  };

  const handleFileChange = (e) => {
    processFile(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isUploadingAttachment || isSubmitting) return;
    processFile(e.dataTransfer?.files?.[0]);
  };

  const handleAmountChange = (e) => {
    const next = sanitizeAmountInput(e.target.value);
    setFormData((prev) => ({ ...prev, amount: next }));
    if (!next) {
      setAmountError('');
      return;
    }
    setAmountError(isValidAmount(next) ? '' : 'Enter a valid amount greater than 0');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (requireStaffSelect && !formData.staff_username) {
      toast.error('Select a staff member');
      return;
    }
    if (!formData.item_id || !formData.date) {
      toast.error('Select item and date');
      return;
    }
    if (!isValidAmount(formData.amount)) {
      setAmountError('Enter a valid amount greater than 0');
      toast.error('Enter a valid amount');
      return;
    }
    if (isUploadingAttachment) {
      toast.error('Please wait for the attachment to finish uploading');
      return;
    }
    if (formData.attachment && !formData.attachmentUrl) {
      toast.error('Attachment upload failed. Please choose the file again.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onAdd({
        ...formData,
        amount: Number(formData.amount),
        attachmentUrl: formData.attachmentUrl || null,
      });
      onClose();
    } catch (error) {
      console.error('Error submitting expense:', error);
      toast.error(error?.message || 'Failed to submit expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedItem = itemOptions.find((o) => o.value === formData.item_id) || null;
  const selectedStaff = staffOptions.find((o) => o.value === formData.staff_username) || null;
  const isImageAttachment = Boolean(formData.attachment?.type?.startsWith('image/'));
  const hasFile = Boolean(formData.attachment);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !isSubmitting && !isUploadingAttachment) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, isSubmitting, isUploadingAttachment]);

  return (
    <ExpenseModalFrame
      isOpen={isOpen}
      title={requireStaffSelect ? 'Create expense' : 'Submit expense'}
      subtitle={
        requireStaffSelect
          ? 'Create an expense against any staff member'
          : 'Indirect expense item with optional receipt'
      }
      onClose={onClose}
      disableClose={isSubmitting || isUploadingAttachment}
      titleId="add-expense-title"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploadingAttachment}
            className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-expense-form"
            disabled={isSubmitting || isUploadingAttachment}
            className="flex-1 h-9 rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSubmitting ? (requireStaffSelect ? 'Creating…' : 'Submitting…') : requireStaffSelect ? 'Create' : 'Submit'}
          </button>
        </div>
      }
    >
      <form id="add-expense-form" onSubmit={handleSubmit} className="space-y-3">
        {requireStaffSelect ? (
          <div>
            <span className={LABEL_CLASS}>Staff *</span>
            <CustomSelect
              options={staffOptions}
              value={selectedStaff}
              onChange={(opt) =>
                setFormData((prev) => ({ ...prev, staff_username: opt?.value || '' }))
              }
              placeholder={staffLoading ? 'Loading staff…' : 'Select staff'}
              isClearable
              isDisabled={staffLoading}
            />
          </div>
        ) : null}
        <div>
          <span className={LABEL_CLASS}>Expense item (indirect) *</span>
          <CustomSelect
            options={itemOptions}
            value={selectedItem}
            onChange={(opt) => setFormData((prev) => ({ ...prev, item_id: opt?.value || '' }))}
            placeholder={itemLoading ? 'Loading items…' : 'Select item'}
            isClearable
            isDisabled={itemLoading}
          />
        </div>
        <div>
          <span className={LABEL_CLASS}>Remark</span>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className={`${INPUT_CLASS} h-auto min-h-[4.5rem] py-2 resize-y`}
            placeholder="Optional note"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={LABEL_CLASS}>Amount *</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={formData.amount}
              onChange={handleAmountChange}
              className={`${INPUT_CLASS} tabular-nums ${
                amountError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''
              }`}
              placeholder="0.00"
              aria-invalid={Boolean(amountError)}
            />
            {amountError ? <p className="mt-1 text-[11px] text-rose-600">{amountError}</p> : null}
          </div>
          <div>
            <span className={LABEL_CLASS}>Date *</span>
            <DatePickerField
              value={formData.date}
              onChange={(val) => setFormData({ ...formData, date: val || '' })}
              buttonClassName={`${INPUT_CLASS} flex items-center justify-between`}
              hideTabs
            />
          </div>
        </div>

        <div>
          <span className={LABEL_CLASS}>Attachment</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {!hasFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={handleDrop}
              className={`group w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
                isDragOver
                  ? 'border-teal-400 bg-teal-50/80'
                  : 'border-slate-200 bg-gradient-to-b from-slate-50 to-white hover:border-teal-300 hover:bg-teal-50/40'
              }`}
            >
              <span
                className={`mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full transition ${
                  isDragOver
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-white text-slate-400 shadow-sm group-hover:text-teal-600'
                }`}
              >
                <FiUploadCloud className="h-5 w-5" />
              </span>
              <span className="block text-sm font-semibold text-slate-800">
                {isDragOver ? 'Drop receipt here' : 'Drop receipt or click to upload'}
              </span>
              <span className="mt-1 block text-[11px] text-slate-500">
                PNG, JPG, WEBP or PDF · up to 50MB
              </span>
            </button>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex gap-3 p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                  {isImageAttachment && formData.attachmentPreview ? (
                    <img
                      src={formData.attachmentPreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-slate-400">
                      {formData.attachment?.type === 'application/pdf' ? (
                        <FiFileText className="h-6 w-6 text-rose-400" />
                      ) : (
                        <FiImage className="h-6 w-6" />
                      )}
                    </div>
                  )}
                  {isUploadingAttachment ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {formData.attachment?.name || 'Attachment'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {formatFileSize(formData.attachment?.size)}
                    {formData.attachmentUrl
                      ? ' · Ready'
                      : isUploadingAttachment
                        ? ' · Uploading…'
                        : ''}
                  </p>
                  {isUploadingAttachment ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all duration-200"
                        style={{ width: `${Math.max(8, uploadProgress)}%` }}
                      />
                    </div>
                  ) : formData.attachmentUrl ? (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <FiCheckCircle className="h-3.5 w-3.5" />
                      Uploaded successfully
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={clearAttachment}
                  disabled={isSubmitting}
                  className="shrink-0 self-start inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  aria-label="Remove attachment"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
              {!isUploadingAttachment ? (
                <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-teal-700 hover:underline"
                  >
                    Replace file
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </form>
    </ExpenseModalFrame>
  );
};

const AdminVerifyModal = ({ expense, onClose, onVerify }) => {
  const [action, setAction] = useState('approve');
  const [remarks, setRemarks] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleConfirm = async () => {
    setIsVerifying(true);
    try {
      await onVerify(expense.expense_id || expense.id, action, remarks);
      onClose();
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isVerifying) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, isVerifying]);

  return (
    <ExpenseModalFrame
      title="Verify expense"
      subtitle={expense.item_name || expense.title}
      onClose={onClose}
      disableClose={isVerifying}
      maxWidthClass="max-w-md"
      titleId="verify-expense-title"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isVerifying}
            className="flex-1 h-9 rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isVerifying ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      }
    >
      <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm mb-3">
        <p className="m-0 font-semibold text-slate-900">{formatCurrency(expense.amount)}</p>
        <p className="m-0 mt-0.5 text-xs text-slate-500">{formatDate(expense.expense_date || expense.date)}</p>
      </div>
      {expense.description ? (
        <p className="text-xs text-slate-600 mb-3">{expense.description}</p>
      ) : null}
      <div className="mb-3">
        <span className={LABEL_CLASS}>Verification note</span>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          className={`${INPUT_CLASS} h-auto min-h-[3.5rem] py-2 resize-y`}
          placeholder="Optional remarks"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setAction('approve')}
          className={`h-10 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1 ${
            action === 'approve'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FiCheckCircle className="w-4 h-4" /> Accept
        </button>
        <button
          type="button"
          onClick={() => setAction('reject')}
          className={`h-10 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1 ${
            action === 'reject'
              ? 'border-rose-300 bg-rose-50 text-rose-800'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FiXCircle className="w-4 h-4" /> Reject
        </button>
      </div>
    </ExpenseModalFrame>
  );
};

const PreviewAttachmentModal = ({ url, base64, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileType, setFileType] = useState('unknown');

  useEffect(() => {
    if (base64) {
      setPreviewUrl(base64);
      setFileType(base64.startsWith('data:image/') ? 'image' : base64.startsWith('data:application/pdf') ? 'pdf' : 'unknown');
    } else if (url) {
      setPreviewUrl(url);
      const lower = url.toLowerCase();
      setFileType(lower.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/) ? 'image' : lower.includes('.pdf') ? 'pdf' : 'unknown');
    }
  }, [url, base64]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <ExpenseModalFrame
      title="Attachment"
      subtitle="Receipt or bill"
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      titleId="expense-attachment-title"
    >
      {previewUrl && fileType === 'image' ? (
        <img src={previewUrl} alt="Attachment" className="max-w-full rounded-lg border border-slate-100" />
      ) : previewUrl && fileType === 'pdf' ? (
        <iframe src={previewUrl} title="PDF" className="w-full min-h-[50vh] rounded-lg border border-slate-200" />
      ) : previewUrl ? (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
        >
          Open file <FiExternalLink className="w-3.5 h-3.5" />
        </a>
      ) : (
        <p className="text-sm text-slate-500">No preview available</p>
      )}
    </ExpenseModalFrame>
  );
};

function buildExpenseActionItems(expense, { canSubmit, canVerify, onView, onVerify, onDelete, onPreview }) {
  const items = [];
  if (expense.attachment_url || expense.attachment_base64) {
    items.push({ label: 'Preview attachment', icon: FiPaperclip, onClick: onPreview });
  }
  items.push({ label: 'View details', icon: FiEye, onClick: onView });
  if (canVerify && expense.status === 'Pending') {
    items.push({ label: 'Verify', icon: FiCheckCircle, onClick: onVerify });
  }
  if (canSubmit && expense.status === 'Pending') {
    items.push({ label: 'Delete', icon: FiTrash2, onClick: onDelete, danger: true });
  }
  return items;
}

const ViewExpenseModal = ({ expense, onClose, onOpenAttachment }) => {
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  const expenseId = expense?.expense_id || expense?.id;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!expenseId) {
        setLoadingDetail(false);
        return;
      }
      setLoadingDetail(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/staff-expenses/details/${encodeURIComponent(expenseId)}`,
          { headers: getHeaders() }
        );
        const result = await response.json();
        if (cancelled) return;
        if (result.success && result.data) {
          setDetail(result.data);
        } else {
          setDetail(expense);
        }
      } catch {
        if (!cancelled) setDetail(expense);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [expenseId, expense]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const row = detail || expense;
  const statusText =
    row?.status_text ||
    (row?.status === '1' ? 'approved' : row?.status === '2' ? 'rejected' : 'pending');
  const statusLabel = STATUS_MAP[statusText] || expense?.status || 'Pending';
  const itemName = row?.item_name || row?.title || expense?.item_name || expense?.title;
  const hasAttachment = row?.attachment_url || row?.attachment_base64 || expense?.attachment_url;

  return (
    <ExpenseModalFrame
      title="Expense details"
      subtitle={itemName}
      onClose={onClose}
      titleId="view-expense-title"
      footer={
        hasAttachment && onOpenAttachment ? (
          <button
            type="button"
            onClick={() => {
              onOpenAttachment({
                url: row?.attachment_url || expense?.attachment_url,
                base64: row?.attachment_base64 || expense?.attachment_base64,
              });
            }}
            className="w-full h-9 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
          >
            <FiPaperclip className="w-4 h-4" /> View attachment
          </button>
        ) : null
      }
    >
      {loadingDetail ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${sk} h-8 w-full rounded`} />
          ))}
        </div>
      ) : (
        <>
          <DetailRow label="Item" value={itemName} />
          <DetailRow label="Remark" value={row?.description || '—'} />
          <DetailRow label="Amount" value={formatCurrency(row?.amount ?? expense?.amount)} />
          <DetailRow label="Expense date" value={formatDate(row?.expense_date || expense?.date)} />
          <DetailRow label="Status">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                statusLabel === 'Approved'
                  ? 'bg-emerald-50 text-emerald-700'
                  : statusLabel === 'Rejected'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-amber-50 text-amber-800'
              }`}
            >
              {statusLabel}
            </span>
          </DetailRow>
          {row?.approved_by_name || row?.approved_by ? (
            <DetailRow label="Reviewed by" value={row.approved_by_name || row.approved_by} />
          ) : null}
          {row?.approved_date ? (
            <DetailRow label="Reviewed on" value={formatDate(row.approved_date)} />
          ) : null}
          {row?.remarks ? <DetailRow label="Review note" value={row.remarks} /> : null}
          {row?.create_date ? (
            <DetailRow label="Submitted on" value={formatDate(row.create_date)} />
          ) : null}
        </>
      )}
    </ExpenseModalFrame>
  );
};

const ExpenseTab = ({
  staffUsername,
  expenses: initialExpenses = [],
  setExpenses: setExternalExpenses,
  variants,
  readOnly = false,
  canSubmit: canSubmitProp,
  canVerify: canVerifyProp,
}) => {
  const canSubmit = canSubmitProp ?? !readOnly;
  const canVerify = canVerifyProp ?? !readOnly;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(null);
  const [showViewModal, setShowViewModal] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState({ url: null, base64: null });
  const [expenses, setExpensesState] = useState(initialExpenses);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(() => toIsoDate(new Date()));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);

  const getStaffUsername = () => {
    if (staffUsername) return staffUsername;
    const pathSegments = window.location.pathname.split('/');
    const usernameFromPath = pathSegments[pathSegments.length - 2] === 'profile'
      ? pathSegments[pathSegments.length - 1]
      : null;
    // /staff/view/profile/:username/expense → username is second-to-last when tab present
    if (pathSegments.includes('profile')) {
      const profileIdx = pathSegments.indexOf('profile');
      if (pathSegments[profileIdx + 1]) return pathSegments[profileIdx + 1];
    }
    if (usernameFromPath && usernameFromPath !== 'staff-expenses') return usernameFromPath;
    return (
      localStorage.getItem('user_username') ||
      localStorage.getItem('username') ||
      null
    );
  };

  const currentStaffUsername = getStaffUsername();

  const fetchExpenses = useCallback(async () => {
    if (!currentStaffUsername) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);

      const response = await fetch(
        `${API_BASE_URL}/staff-expenses/list/${encodeURIComponent(currentStaffUsername)}?${params}`,
        {
          method: 'GET',
          headers: getHeaders(),
        }
      );
      const result = await response.json();
      if (result.success) {
        const formattedExpenses = (result.data || []).map(formatExpenseRow);
        setExpensesState(formattedExpenses);
        if (result.summary) setSummary(result.summary);

        const pagination = result.pagination || {};
        const total = Number(pagination.total) || 0;
        const apiLimit = Number(pagination.limit) || limit;
        const apiTotalPages = Math.max(1, Number(pagination.total_pages) || Math.ceil(total / apiLimit) || 1);
        setTotalItems(total);
        setTotalPages(apiTotalPages);
        setIsLastPage(Boolean(pagination.is_last_page ?? page >= apiTotalPages));

        if (setExternalExpenses) setExternalExpenses(formattedExpenses);
      } else {
        setError(result.message || 'Failed to fetch expenses');
        setExpensesState([]);
        setTotalItems(0);
        setTotalPages(1);
        setIsLastPage(true);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Network error. Please try again.');
      setExpensesState([]);
      setTotalItems(0);
      setTotalPages(1);
      setIsLastPage(true);
    } finally {
      setLoading(false);
    }
  }, [currentStaffUsername, page, limit, statusFilter, fromDate, toDate, setExternalExpenses]);

  const handleAddExpense = async (newExpenseData) => {
    if (!canSubmit) return;
    if (!currentStaffUsername) {
      toast.error('Staff username not found');
      return;
    }

    const payload = {
      item_id: newExpenseData.item_id,
      description: newExpenseData.description || '',
      amount: newExpenseData.amount,
      date: newExpenseData.date,
      staff_username: currentStaffUsername,
    };
    if (newExpenseData.attachmentUrl) {
      payload.attachment_url = newExpenseData.attachmentUrl;
    }

    const response = await fetch(`${API_BASE_URL}/staff-expenses/create`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (result.success) {
      await fetchExpenses();
      toast.success(result.message || 'Expense submitted successfully');
    } else {
      throw new Error(result.message || 'Failed to submit expense');
    }
  };

  const handleVerifyExpense = async (expenseId, action, remarks) => {
    if (!canVerify) return;
    const response = await fetch(`${API_BASE_URL}/staff-expenses/verify`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expense_id: expenseId,
        action,
        remarks: remarks || (action === 'approve' ? 'Expense approved' : 'Expense rejected'),
      }),
    });
    const result = await response.json();
    if (result.success) {
      await fetchExpenses();
      toast.success(result.message || `Expense ${action}d successfully`);
    } else {
      toast.error(result.message || `Failed to ${action} expense`);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!canSubmit) return;
    if (!window.confirm('Delete this pending expense?')) return;
    const response = await fetch(`${API_BASE_URL}/staff-expenses/delete`, {
      method: 'DELETE',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expense_id: id }),
    });
    const result = await response.json();
    if (result.success) {
      await fetchExpenses();
      toast.success('Expense deleted successfully');
    } else {
      toast.error(result.message || 'Failed to delete expense');
    }
  };

  const statCards = [
    {
      key: 'all',
      label: 'All',
      count: Number(summary?.total_expenses) || 0,
      amount: parseFloat(summary?.total_amount || 0),
      border: 'border-gray-200',
      bg: 'bg-white',
      labelClass: 'text-gray-500',
      valueClass: 'text-gray-800',
    },
    {
      key: 'pending',
      label: 'Pending',
      count: Number(summary?.pending_count) || 0,
      amount: parseFloat(summary?.total_pending_amount || 0),
      border: 'border-amber-200/80',
      bg: 'bg-amber-50/80',
      labelClass: 'text-amber-700',
      valueClass: 'text-amber-900',
    },
    {
      key: 'approved',
      label: 'Approved',
      count: Number(summary?.approved_count) || 0,
      amount: parseFloat(summary?.total_approved_amount || 0),
      border: 'border-emerald-200/80',
      bg: 'bg-emerald-50/80',
      labelClass: 'text-emerald-700',
      valueClass: 'text-emerald-900',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      count: Number(summary?.rejected_count) || 0,
      amount: parseFloat(summary?.total_rejected_amount || 0),
      border: 'border-rose-200/80',
      bg: 'bg-rose-50/80',
      labelClass: 'text-rose-700',
      valueClass: 'text-rose-900',
    },
  ];

  const serialBase = (page - 1) * limit;

  const handleDateRangeChange = (range) => {
    setFromDate(range?.start || '');
    setToDate(range?.end || '');
    setPage(1);
  };

  const handleStatusFilterChange = (opt) => {
    setStatusFilter(opt?.value || 'all');
    setPage(1);
  };

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  if (loading && expenses.length === 0 && !summary) {
    return (
      <motion.div variants={variants} initial="initial" animate="animate" exit="exit">
        <ExpensePageSkeleton limit={limit} />
      </motion.div>
    );
  }

  return (
    <>
      <motion.div variants={variants} initial="initial" animate="animate" exit="exit" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base md:text-lg font-bold text-gray-800 m-0">Expenses</h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchExpenses}
              disabled={!currentStaffUsername || loading}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              title="Refresh"
              aria-label="Refresh"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {canSubmit ? (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                disabled={!currentStaffUsername}
                className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                <FiPlus className="w-3.5 h-3.5" />
                Add expense
              </button>
            ) : null}
          </div>
        </div>

        {!currentStaffUsername ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Staff username is missing.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchExpenses}
              className="text-xs font-semibold text-red-700 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        ) : null}

        {summary ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.key}
                className={`rounded-lg border px-3 py-2 ${card.border} ${card.bg}`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${card.labelClass}`}>
                  {card.label}
                </p>
                <p className={`mt-0.5 text-sm font-bold tabular-nums ${card.valueClass}`}>
                  {card.count}{' '}
                  <span className="text-[11px] font-semibold opacity-80">· {formatCurrency(card.amount)}</span>
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <span className={LABEL_CLASS}>Date range</span>
            <DateRangePickerField
              value={{ start: fromDate, end: toDate }}
              onChange={handleDateRangeChange}
              placeholder="Select date range"
              mode="range"
              initialTab="quick"
              defaultQuickKey="tm"
              quickOptionKeys={['tw', 'lw', 'lm', 'tm', 'lf', 'fy']}
              showRangeHint={false}
              showResetButton={false}
              buttonClassName={`${INPUT_CLASS} justify-between text-left`}
              wrapperClassName="w-full"
            />
          </div>
          <div className="w-full sm:w-48">
            <span className={LABEL_CLASS}>Status</span>
            <CustomSelect
              options={STATUS_SELECT_OPTIONS}
              value={optionByValue(STATUS_SELECT_OPTIONS, statusFilter)}
              onChange={handleStatusFilterChange}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <ExpenseTableSkeleton rows={Math.min(limit, 8)} />
          ) : expenses.length === 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed text-left text-sm font-sans">
                  <ExpenseTableHead />
                  <tbody>
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-500">
                        {statusFilter === 'all'
                          ? 'No expenses in this date range.'
                          : `No ${STATUS_SELECT_OPTIONS.find((o) => o.value === statusFilter)?.label?.toLowerCase() || ''} expenses.`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={page}
                limit={limit}
                total={totalItems}
                totalPages={totalPages}
                isLastPage={isLastPage}
                defaultRows={20}
                rowOptions={[5, 10, 20, 50, 100]}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            </>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed text-left text-sm font-sans">
                  <ExpenseTableHead />
                  <tbody>
                    {expenses.map((expense, idx) => (
                      <tr
                        key={expense.id}
                        className="border-b border-gray-100 bg-white hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="px-3 py-2.5 text-[11px] font-bold text-gray-800 tabular-nums">
                          {serialBase + idx + 1}
                        </td>
                        <td className="px-3 py-2.5 text-sm font-medium text-gray-800 truncate">
                          {expense.item_name || expense.title}
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-gray-800">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-sm font-medium text-gray-700 tabular-nums">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              expense.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : expense.status === 'Rejected'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {expense.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <EmailActionMenu
                            buttonClassName="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                            items={buildExpenseActionItems(expense, {
                              canSubmit,
                              canVerify,
                              onView: () => setShowViewModal(expense),
                              onVerify: () => setShowVerifyModal(expense),
                              onDelete: () => handleDeleteExpense(expense.id),
                              onPreview: () => {
                                setPreviewData({
                                  url: expense.attachment_url,
                                  base64: expense.attachment_base64,
                                });
                                setShowPreviewModal(true);
                              },
                            })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={page}
                limit={limit}
                total={totalItems}
                totalPages={totalPages}
                isLastPage={isLastPage}
                defaultRows={20}
                rowOptions={[5, 10, 20, 50, 100]}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            </>
          )}
        </div>
      </motion.div>

      {canSubmit ? (
        <AddExpenseModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddExpense}
        />
      ) : null}
      <AnimatePresence>
        {canVerify && showVerifyModal ? (
          <AdminVerifyModal expense={showVerifyModal} onClose={() => setShowVerifyModal(null)} onVerify={handleVerifyExpense} />
        ) : null}
        {showViewModal ? (
          <ViewExpenseModal
            expense={showViewModal}
            onClose={() => setShowViewModal(null)}
            onOpenAttachment={(data) => {
              setPreviewData(data);
              setShowPreviewModal(true);
            }}
          />
        ) : null}
        {showPreviewModal ? (
          <PreviewAttachmentModal
            url={previewData.url}
            base64={previewData.base64}
            onClose={() => setShowPreviewModal(false)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
};

export { AddExpenseModal };
export default ExpenseTab;
