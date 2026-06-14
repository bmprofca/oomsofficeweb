import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiEdit2,
  FiEye,
  FiFileText,
  FiHome,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiSend,
  FiX,
} from 'react-icons/fi';
import { Header, Sidebar } from '../../../components/header';
import { extractApiError } from './oneChattingSendUtils';
import { normalizeList, normalizePagination, whatsappApi } from './whatsappApi';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'audio', label: 'Audio' },
];

const TEMPLATE_TYPES = TYPE_OPTIONS.filter((option) => option.value);

const EMPTY_FORM = {
  template_name: '',
  template_type: 'text',
  message: '',
  url: '',
  caption: '',
  filename: '',
  status: 'active',
};

const TemplateStatusBadge = ({ status }) => {
  const isActive = String(status || '').toLowerCase() === 'active';

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
};

const TemplateTypeBadge = ({ type }) => (
  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
    {type || 'text'}
  </span>
);

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const normalizeVariables = (variables) => {
  if (Array.isArray(variables)) return variables.filter(Boolean);
  if (typeof variables === 'string') {
    try {
      const parsed = JSON.parse(variables);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeContent = (template) => {
  const raw = template?.content ?? template?.content_json;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
};

const templateToForm = (template = {}) => {
  const templateType = template.template_type || 'text';
  const content = normalizeContent(template);

  return {
    template_name: template.template_name || '',
    template_type: templateType,
    message: content.message || '',
    url: content.url || '',
    caption: content.caption || '',
    filename: content.filename || '',
    status: template.status || 'active',
  };
};

const detectVariables = (values) => {
  const text = Object.values(values)
    .filter((value) => typeof value === 'string')
    .join(' ');
  const matches = [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
  return [...new Set(matches)];
};

const buildContentPayload = (templateType, form) => {
  switch (templateType) {
    case 'text':
      return { message: form.message.trim() };
    case 'image':
    case 'video': {
      const payload = { url: form.url.trim() };
      if (form.caption.trim()) payload.caption = form.caption.trim();
      return payload;
    }
    case 'document': {
      const payload = {
        url: form.url.trim(),
        filename: form.filename.trim(),
      };
      if (form.caption.trim()) payload.caption = form.caption.trim();
      return payload;
    }
    case 'audio':
      return { url: form.url.trim() };
    default:
      return {};
  }
};

const validateForm = (form) => {
  if (!form.template_name.trim()) {
    return 'Template name is required';
  }

  const content = buildContentPayload(form.template_type, form);

  if (form.template_type === 'text' && !content.message) {
    return 'Message is required for text templates';
  }
  if (['image', 'video', 'audio'].includes(form.template_type) && !content.url) {
    return 'URL is required for this template type';
  }
  if (form.template_type === 'document') {
    if (!content.url) return 'URL is required for document templates';
    if (!content.filename) return 'Filename is required for document templates';
  }

  return null;
};

const getContentPreview = (template) => {
  const type = template.template_type || 'text';
  const content = normalizeContent(template);

  if (type === 'text') return content.message || '—';
  if (content.caption) return content.caption;
  if (content.filename) return content.filename;
  if (content.url) return content.url;
  return '—';
};

const VariableChips = ({ variables }) => {
  if (!variables.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {variables.map((variable) => (
        <span
          key={variable}
          className="inline-flex px-2 py-0.5 rounded text-xs font-mono bg-green-50 text-green-700 border border-green-100"
        >
          {`{{${variable}}}`}
        </span>
      ))}
    </div>
  );
};

const ContentFields = ({ form, setForm, saving }) => {
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60 font-mono';

  if (form.template_type === 'text') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.message}
          onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
          rows={5}
          placeholder="Hi {{name}}, your task {{task_id}} has been created."
          disabled={saving}
          className={`${inputClass} resize-y min-h-[120px]`}
        />
      </div>
    );
  }

  if (form.template_type === 'audio') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Audio URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={form.url}
          onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
          placeholder="https://cdn.example.com/audio.mp3"
          disabled={saving}
          className={inputClass}
        />
      </div>
    );
  }

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Media URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={form.url}
          onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
          placeholder="https://cdn.example.com/file.jpg"
          disabled={saving}
          className={inputClass}
        />
      </div>

      {form.template_type === 'document' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filename <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.filename}
            onChange={(e) => setForm((prev) => ({ ...prev, filename: e.target.value }))}
            placeholder="Invoice_{{invoice_no}}.pdf"
            disabled={saving}
            className={inputClass}
          />
        </div>
      ) : null}

      {form.template_type !== 'audio' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Caption
          </label>
          <textarea
            value={form.caption}
            onChange={(e) => setForm((prev) => ({ ...prev, caption: e.target.value }))}
            rows={3}
            placeholder="Welcome {{name}}!"
            disabled={saving}
            className={`${inputClass} resize-y`}
          />
        </div>
      ) : null}
    </>
  );
};

const TemplateFormModal = ({
  isOpen,
  mode,
  initialValues,
  saving,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const initialTypeRef = React.useRef('text');

  useEffect(() => {
    if (!isOpen) return;
    const nextForm = templateToForm(initialValues);
    initialTypeRef.current = nextForm.template_type;
    setForm(nextForm);
  }, [isOpen, initialValues]);

  const detectedVariables = useMemo(
    () =>
      detectVariables({
        message: form.message,
        url: form.url,
        caption: form.caption,
        filename: form.filename,
      }),
    [form.message, form.url, form.caption, form.filename],
  );

  if (!isOpen) return null;

  const handleTypeChange = (nextType) => {
    setForm((prev) => ({
      ...prev,
      template_type: nextType,
      message: nextType === 'text' ? prev.message : '',
      url: ['image', 'video', 'document', 'audio'].includes(nextType) ? prev.url : '',
      caption: ['image', 'video', 'document'].includes(nextType) ? prev.caption : '',
      filename: nextType === 'document' ? prev.filename : '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const error = validateForm(form);
    if (error) {
      toast.error(error);
      return;
    }
    onSubmit(form, initialTypeRef.current);
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={saving ? undefined : onClose} />
      <div className="relative w-full max-w-lg max-h-[92vh] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h3 className="text-base font-semibold text-gray-800 m-0">
            {mode === 'create' ? 'Create template' : 'Edit template'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-50"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto min-h-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.template_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, template_name: e.target.value }))
              }
              placeholder="Task Created Alert"
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.template_type}
              onChange={(e) => handleTypeChange(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60 capitalize"
            >
              {TEMPLATE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {mode === 'edit' && form.template_type !== initialTypeRef.current ? (
              <p className="text-xs text-amber-600 mt-1 m-0">
                Changing type requires new content fields to be saved.
              </p>
            ) : null}
          </div>

          <ContentFields form={form} setForm={setForm} saving={saving} />

          <p className="text-xs text-gray-500 m-0">
            Use {'{{variable}}'} in message, caption, URL, or filename fields.
          </p>
          <VariableChips variables={detectedVariables} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, status: e.target.value }))
              }
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
            >
              {saving ? <FiLoader className="w-4 h-4 animate-spin" /> : null}
              {mode === 'create' ? 'Create template' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TemplateDetailsModal = ({ template, loading, onClose, onEdit }) => {
  if (!template && !loading) return null;

  const variables = normalizeVariables(template?.variables_json);
  const content = normalizeContent(template);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h3 className="text-base font-semibold text-gray-800 m-0 truncate">
            {template?.template_name || 'Template details'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto min-h-0 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <FiLoader className="w-6 h-6 animate-spin mr-2" />
              Loading...
            </div>
          ) : template ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <TemplateStatusBadge status={template.status} />
                <TemplateTypeBadge type={template.template_type} />
                <span className="text-xs text-gray-500 font-mono">
                  {template.template_id}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 m-0">
                  Content
                </p>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3 m-0 font-mono overflow-x-auto">
                  {JSON.stringify(content, null, 2)}
                </pre>
              </div>

              {variables.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 m-0">
                    Variables
                  </p>
                  <VariableChips variables={variables} />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 m-0">Created by</p>
                  <p className="text-gray-800 m-0 mt-0.5">{template.create_by || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 m-0">Modified by</p>
                  <p className="text-gray-800 m-0 mt-0.5">{template.modify_by || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 m-0">Created</p>
                  <p className="text-gray-800 m-0 mt-0.5">
                    {formatDate(template.create_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 m-0">Modified</p>
                  <p className="text-gray-800 m-0 mt-0.5">
                    {formatDate(template.modify_date)}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {template ? (
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onEdit(template)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
            >
              <FiEdit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const WhatsAppWebTemplates = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'),
  );

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });

  const [formModal, setFormModal] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const [detailsTemplate, setDetailsTemplate] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchTemplates = useCallback(
    async (page = 1, limit = 20, status = '', templateType = '') => {
      setLoading(true);
      try {
        const params = { page_no: page, limit };
        if (status) params.status = status;
        if (templateType) params.template_type = templateType;

        const res = await whatsappApi.getWhatsAppWebTemplateList(params);
        setRows(normalizeList(res?.data));
        setPagination(normalizePagination(res?.pagination));
      } catch (error) {
        toast.error(extractApiError(error, 'Failed to load templates'));
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    fetchTemplates(1, pagination.limit, statusFilter, typeFilter);
  }, [statusFilter, typeFilter, fetchTemplates]);

  const handleLimitChange = (newLimit) => {
    const limit = Number(newLimit);
    setPagination((prev) => ({ ...prev, limit, page_no: 1 }));
    fetchTemplates(1, limit, statusFilter, typeFilter);
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.total_pages) return;
    fetchTemplates(page, pagination.limit, statusFilter, typeFilter);
  };

  const openDetails = async (templateId) => {
    setDetailsTemplate(null);
    setDetailsLoading(true);
    try {
      const res = await whatsappApi.getWhatsAppWebTemplateDetails(templateId);
      setDetailsTemplate(res?.data || null);
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load template details'));
    } finally {
      setDetailsLoading(false);
    }
  };

  const buildCreatePayload = (form) => ({
    template_name: form.template_name.trim(),
    template_type: form.template_type,
    content: buildContentPayload(form.template_type, form),
    status: form.status,
  });

  const buildEditPayload = (form, initialType, templateId) => {
    const payload = { template_id: templateId };

    if (form.template_name.trim()) {
      payload.template_name = form.template_name.trim();
    }
    if (form.status) payload.status = form.status;

    const typeChanged = form.template_type !== initialType;
    if (typeChanged) {
      payload.template_type = form.template_type;
      payload.content = buildContentPayload(form.template_type, form);
    } else {
      payload.content = buildContentPayload(form.template_type, form);
    }

    return payload;
  };

  const handleCreate = async (form) => {
    setFormSaving(true);
    try {
      const res = await whatsappApi.createWhatsAppWebTemplate(buildCreatePayload(form));
      toast.success(res?.message || 'Template created successfully');
      setFormModal(null);
      fetchTemplates(pagination.page_no, pagination.limit, statusFilter, typeFilter);
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to create template'));
    } finally {
      setFormSaving(false);
    }
  };

  const handleEdit = async (form, initialType) => {
    if (!formModal?.template_id) return;

    setFormSaving(true);
    try {
      const res = await whatsappApi.editWhatsAppWebTemplate(
        buildEditPayload(form, initialType, formModal.template_id),
      );
      toast.success(res?.message || 'Template updated successfully');
      setFormModal(null);
      if (detailsTemplate?.template_id === formModal.template_id) {
        setDetailsTemplate(res?.data || detailsTemplate);
      }
      fetchTemplates(pagination.page_no, pagination.limit, statusFilter, typeFilter);
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to update template'));
    } finally {
      setFormSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div
        className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <nav className="flex items-center text-sm text-gray-600 mb-4">
            <Link
              to="/"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <FiHome className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <Link
              to="/broadcast/whatsapp"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <FiSend className="w-4 h-4" />
              <span>Broadcast</span>
            </Link>
            <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium">WhatsApp Web Templates</span>
          </nav>

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">WhatsApp Web Templates</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage text and media templates for WhatsApp Web sends
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormModal({ mode: 'create' })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shrink-0"
            >
              <FiPlus className="w-4 h-4" />
              Create template
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiFileText className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Template list</h2>
                  <p className="text-xs text-gray-500">
                    {pagination.total} template{pagination.total === 1 ? '' : 's'} found
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value || 'all-types'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value || 'all-status'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    fetchTemplates(
                      pagination.page_no,
                      pagination.limit,
                      statusFilter,
                      typeFilter,
                    )
                  }
                  disabled={loading}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Template
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Variables
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Modified
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        {Array.from({ length: 6 }).map((__, cellIndex) => (
                          <td key={cellIndex} className="px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-full max-w-[180px]" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No templates found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((item) => {
                      const variables = normalizeVariables(item.variables_json);

                      return (
                        <tr key={item.template_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900 m-0">
                              {item.template_name}
                            </p>
                            <p className="text-xs text-gray-500 m-0 mt-0.5 line-clamp-2 font-mono">
                              {getContentPreview(item)}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <TemplateTypeBadge type={item.template_type} />
                          </td>
                          <td className="px-6 py-4">
                            {variables.length ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {variables.slice(0, 4).map((variable) => (
                                  <span
                                    key={variable}
                                    className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-600"
                                  >
                                    {`{{${variable}}}`}
                                  </span>
                                ))}
                                {variables.length > 4 ? (
                                  <span className="text-[10px] text-gray-400">
                                    +{variables.length - 4}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <TemplateStatusBadge status={item.status} />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {formatDate(item.modify_date || item.create_date)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openDetails(item.template_id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                              >
                                <FiEye className="w-3.5 h-3.5" />
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormModal({ mode: 'edit', ...item })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg"
                              >
                                <FiEdit2 className="w-3.5 h-3.5" />
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && pagination.total_pages > 1 ? (
              <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Rows per page</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm bg-white outline-none"
                  >
                    {[10, 20, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goToPage(1)}
                    disabled={pagination.page_no <= 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-40"
                  >
                    <FiChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page_no - 1)}
                    disabled={pagination.page_no <= 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-40"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-sm text-gray-600">
                    Page {pagination.page_no} of {pagination.total_pages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page_no + 1)}
                    disabled={pagination.page_no >= pagination.total_pages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-40"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.total_pages)}
                    disabled={pagination.page_no >= pagination.total_pages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-40"
                  >
                    <FiChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <TemplateFormModal
        isOpen={Boolean(formModal)}
        mode={formModal?.mode || 'create'}
        initialValues={formModal?.mode === 'edit' ? formModal : EMPTY_FORM}
        saving={formSaving}
        onClose={() => !formSaving && setFormModal(null)}
        onSubmit={formModal?.mode === 'edit' ? handleEdit : handleCreate}
      />

      {(detailsTemplate || detailsLoading) && (
        <TemplateDetailsModal
          template={detailsTemplate}
          loading={detailsLoading}
          onClose={() => {
            setDetailsTemplate(null);
            setDetailsLoading(false);
          }}
          onEdit={(template) => {
            setDetailsTemplate(null);
            setFormModal({ mode: 'edit', ...template });
          }}
        />
      )}
    </div>
  );
};

export default WhatsAppWebTemplates;
