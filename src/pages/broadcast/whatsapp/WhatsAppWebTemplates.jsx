import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiEdit2,
  FiEye,
  FiFileText,
  FiLink,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiUpload,
  FiX,
  FiLock,
} from 'react-icons/fi';
import { Header, Sidebar } from '../../../components/header';
import { extractApiError } from '../../../utils/oneChattingSendUtils';
import { uploadOneSaasFile } from '../../../utils/onesaas-upload';
import { normalizeList, normalizePagination, whatsappApi } from '../../../services/whatsappApi';
import { useUserPermissions } from '../../../utils/permission-helper';

/** Task-table typography baseline — see CLIENT/context/typography.md */
const TABLE_HEAD_ROW =
  'bg-gradient-to-r from-gray-50 to-white border-b border-gray-200';
const TABLE_TH =
  'px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap';
const TABLE_ROW =
  'border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors';
const TABLE_TD = 'px-3 py-3 min-w-0 text-left align-middle';
const CELL_TITLE = 'font-semibold text-gray-800 text-sm';
const CELL_BODY = 'text-sm font-medium text-gray-700';
const CELL_META = 'text-xs text-gray-400';
const CELL_EMPTY = 'text-sm text-gray-400';
const SECTION_LABEL =
  'text-[11px] font-bold text-gray-700 uppercase tracking-wide';
const TOOLBAR_ROW =
  'flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white';
const TOOLBAR_BTN = 'px-3 py-2 text-sm font-medium rounded-lg';
const FIELD_INPUT =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60 placeholder:text-gray-400';
const EMPTY_WRAP =
  'flex flex-col items-center justify-center py-12 text-gray-500 px-4';
const EMPTY_TITLE = 'text-sm font-medium text-gray-500';
const EMPTY_SUBTITLE = 'text-xs text-gray-400 mt-1';

const TABS = [
  { id: 'mapping', label: 'Static Templates' },
  { id: 'list', label: 'Template List' },
];

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

const URL_ACCEPT_BY_TYPE = {
  image: 'image/jpeg,image/png,image/webp,image/gif',
  video: 'video/mp4,video/3gpp,video/quicktime',
  document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar',
  audio: 'audio/*',
};

const WEB_TEMPLATE_FIELD_CONFIG = {
  text: [{ key: 'message', label: 'Message', required: true, multiline: true }],
  image: [
    { key: 'url', label: 'Image URL', required: true, inputType: 'url' },
    { key: 'caption', label: 'Caption', required: false, multiline: true },
  ],
  video: [
    { key: 'url', label: 'Video URL', required: true, inputType: 'url' },
    { key: 'caption', label: 'Caption', required: false, multiline: true },
  ],
  document: [
    { key: 'url', label: 'Document URL', required: true, inputType: 'url' },
    { key: 'filename', label: 'Filename', required: true },
    { key: 'caption', label: 'Caption', required: false, multiline: true },
  ],
  audio: [{ key: 'url', label: 'Audio URL', required: true, inputType: 'url' }],
};

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
      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
};

const TemplateTypeBadge = ({ type }) => (
  <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
    {type || 'text'}
  </span>
);

const MappingStatusBadge = ({ isSet }) =>
  isSet ? (
    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Mapped
    </span>
  ) : (
    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Not mapped
    </span>
  );

const formatDate = (value) => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
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

const getWebTemplateFields = (templateType) =>
  WEB_TEMPLATE_FIELD_CONFIG[templateType] || WEB_TEMPLATE_FIELD_CONFIG.text;

const normalizeMappingComponent = (component) => {
  if (!component) return {};
  if (typeof component === 'string') {
    try {
      const parsed = JSON.parse(component);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof component === 'object' ? component : {};
};

const buildMappingContent = (templateType, values) => {
  const content = {};
  getWebTemplateFields(templateType).forEach((field) => {
    const value = values[field.key]?.trim();
    if (value) content[field.key] = value;
  });
  return content;
};

const parseMappingContentToValues = (content, templateType) => {
  const normalized = normalizeMappingComponent(content);
  const values = {};

  getWebTemplateFields(templateType).forEach((field) => {
    if (normalized[field.key]) {
      values[field.key] = normalized[field.key];
    }
  });

  return values;
};

const loadEditorFromMappingItem = (item) => {
  const templateType = item?.template_type || 'text';
  return {
    templateType,
    values: parseMappingContentToValues(item?.content, templateType),
  };
};

const WebMappingPreview = ({ templateType, componentValues }) => {
  const type = templateType || 'text';

  if (type === 'text') {
    return (
      <div className="bg-white rounded-lg shadow-sm px-3 py-2 text-sm text-gray-800 max-w-[280px]">
        <p className="m-0 whitespace-pre-wrap break-words">
          {componentValues.message || 'Message preview'}
        </p>
      </div>
    );
  }

  if (type === 'image' || type === 'video') {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden max-w-[280px]">
        <div className="h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500 capitalize">
          {type} preview
        </div>
        {componentValues.caption ? (
          <p className="m-0 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap break-words">
            {componentValues.caption}
          </p>
        ) : null}
      </div>
    );
  }

  if (type === 'document') {
    return (
      <div className="bg-white rounded-lg shadow-sm px-3 py-2 max-w-[280px]">
        <p className="m-0 text-sm font-medium text-gray-800 truncate">
          {componentValues.filename || 'Document'}
        </p>
        {componentValues.caption ? (
          <p className="m-0 mt-1 text-sm text-gray-600 whitespace-pre-wrap break-words">
            {componentValues.caption}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm px-3 py-2 text-sm text-gray-800 max-w-[280px]">
      <p className="m-0">Audio message</p>
      {componentValues.url ? (
        <p className="m-0 mt-1 text-xs text-gray-500 truncate">{componentValues.url}</p>
      ) : null}
    </div>
  );
};

const MediaUrlField = ({
  value,
  onChange,
  templateType,
  placeholder,
  disabled,
  onFileUploaded,
  onFocus,
}) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadOneSaasFile(file);
      onChange(url);
      onFileUploaded?.(file);
      toast.success('File uploaded');
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to upload file'));
    } finally {
      setUploading(false);
    }
  };

  const inputClass =
    'flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60 font-mono';

  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        disabled={disabled || uploading}
        className={inputClass}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={URL_ACCEPT_BY_TYPE[templateType] || '*/*'}
        onChange={handleUpload}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 shrink-0"
        title="Upload file"
      >
        {uploading ? (
          <FiLoader className="w-4 h-4 animate-spin" />
        ) : (
          <FiUpload className="w-4 h-4" />
        )}
        Upload
      </button>
    </div>
  );
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
        <MediaUrlField
          value={form.url}
          onChange={(url) => setForm((prev) => ({ ...prev, url }))}
          templateType="audio"
          placeholder="https://cdn.example.com/audio.mp3"
          disabled={saving}
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
        <MediaUrlField
          value={form.url}
          onChange={(url) => setForm((prev) => ({ ...prev, url }))}
          templateType={form.template_type}
          placeholder="https://cdn.example.com/file.jpg"
          disabled={saving}
          onFileUploaded={
            form.template_type === 'document'
              ? (file) => {
                  setForm((prev) => ({
                    ...prev,
                    filename: prev.filename.trim() || file.name,
                  }));
                }
              : undefined
          }
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
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'),
  );

  const [activeTab, setActiveTab] = useState('mapping');

  const [listLoading, setListLoading] = useState(false);
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

  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingRows, setMappingRows] = useState([]);
  const [selectedMappingName, setSelectedMappingName] = useState(null);
  const [mappingEditorType, setMappingEditorType] = useState('text');
  const [mappingEditorValues, setMappingEditorValues] = useState({});
  const [activeEditorField, setActiveEditorField] = useState('message');
  const [mappingSaving, setMappingSaving] = useState(false);
  const editorFieldRefs = useRef({});

  const [formModal, setFormModal] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const [detailsTemplate, setDetailsTemplate] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchTemplates = useCallback(
    async (page = 1, limit = 20, status = '', templateType = '') => {
      setListLoading(true);
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
        setListLoading(false);
      }
    },
    [],
  );

  const fetchTemplateMappings = useCallback(async () => {
    setMappingLoading(true);
    try {
      const res = await whatsappApi.getWhatsAppWebTemplateMapList();
      const rows = normalizeList(res?.data);
      setMappingRows(rows);
      return rows;
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load static templates'));
      setMappingRows([]);
      return [];
    } finally {
      setMappingLoading(false);
    }
  }, []);

  const updateMappingRow = useCallback((name, updates) => {
    setMappingRows((prev) =>
      prev.map((row) => (row.name === name ? { ...row, ...updates } : row)),
    );
  }, []);

  const selectMappingItem = useCallback((item) => {
    if (!item) return;
    const { templateType, values } = loadEditorFromMappingItem(item);
    setSelectedMappingName(item.name);
    setMappingEditorType(templateType);
    setMappingEditorValues(values);
    setActiveEditorField(getWebTemplateFields(templateType)[0]?.key || 'message');
  }, []);

  const handleEditorTypeChange = (nextType) => {
    setMappingEditorType(nextType);
    setMappingEditorValues((prev) => {
      const next = {};
      getWebTemplateFields(nextType).forEach((field) => {
        if (prev[field.key]) next[field.key] = prev[field.key];
      });
      return next;
    });
    setActiveEditorField(getWebTemplateFields(nextType)[0]?.key || 'message');
  };

  const handleEditorFieldChange = (key, value) => {
    setMappingEditorValues((prev) => ({ ...prev, [key]: value }));
  };

  const insertVariableIntoField = (variableKey) => {
    const fieldKey = activeEditorField || 'message';
    const element = editorFieldRefs.current[fieldKey];
    const current = mappingEditorValues[fieldKey] || '';

    if (!element || typeof element.selectionStart !== 'number') {
      handleEditorFieldChange(fieldKey, `${current}${variableKey}`);
      return;
    }

    const start = element.selectionStart;
    const end = element.selectionEnd;
    const nextValue = `${current.slice(0, start)}${variableKey}${current.slice(end)}`;
    handleEditorFieldChange(fieldKey, nextValue);

    requestAnimationFrame(() => {
      element.focus();
      const cursor = start + variableKey.length;
      element.setSelectionRange(cursor, cursor);
    });
  };

  const handleSaveStaticTemplate = async () => {
    if (!selectedMappingItem) return;

    const fields = getWebTemplateFields(mappingEditorType);
    const missingField = fields.find(
      (field) => field.required && !mappingEditorValues[field.key]?.trim(),
    );
    if (missingField) {
      toast.error(`Please fill in ${missingField.label}`);
      return;
    }

    const content = buildMappingContent(mappingEditorType, mappingEditorValues);

    setMappingSaving(true);
    try {
      const res = await whatsappApi.setWhatsAppWebTemplateMap({
        name: selectedMappingItem.name,
        template_type: mappingEditorType,
        content,
      });
      toast.success(res?.message || 'Template saved successfully');
      const saved = res?.data || {};
      updateMappingRow(selectedMappingItem.name, {
        is_set: true,
        template_id: saved.template_id,
        template_type: saved.template_type || mappingEditorType,
        content: saved.content ?? content,
        variables_json: saved.variables_json || [],
        status: saved.status || 'active',
      });
      if (saved.template_type || saved.content) {
        const { templateType, values } = loadEditorFromMappingItem({
          template_type: saved.template_type || mappingEditorType,
          content: saved.content ?? content,
        });
        setMappingEditorType(templateType);
        setMappingEditorValues(values);
      }
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to save template'));
    } finally {
      setMappingSaving(false);
    }
  };

  const handleDisableStaticTemplate = async () => {
    if (!selectedMappingItem?.is_set) return;

    setMappingSaving(true);
    try {
      const res = await whatsappApi.unsetWhatsAppWebTemplateMap({
        name: selectedMappingItem.name,
      });
      toast.success(res?.message || 'Template disabled');
      updateMappingRow(selectedMappingItem.name, {
        is_set: false,
        status: res?.data?.status || 'inactive',
      });
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to disable template'));
    } finally {
      setMappingSaving(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (activeTab !== 'list') return;
    fetchTemplates(1, pagination.limit, statusFilter, typeFilter);
  }, [activeTab, statusFilter, typeFilter, fetchTemplates]);

  useEffect(() => {
    if (activeTab !== 'mapping') return;

    const loadMappings = async () => {
      const rows = await fetchTemplateMappings();
      if (!rows.length) return;

      setSelectedMappingName((current) => {
        const nextItem =
          current && rows.some((row) => row.name === current)
            ? rows.find((row) => row.name === current)
            : rows[0];
        if (nextItem) {
          const { templateType, values } = loadEditorFromMappingItem(nextItem);
          setMappingEditorType(templateType);
          setMappingEditorValues(values);
          setActiveEditorField(getWebTemplateFields(templateType)[0]?.key || 'message');
          return nextItem.name;
        }
        return current;
      });
    };

    loadMappings();
  }, [activeTab, fetchTemplateMappings]);

  const selectedMappingItem = useMemo(
    () => mappingRows.find((row) => row.name === selectedMappingName) || null,
    [mappingRows, selectedMappingName],
  );

  const mappedCount = useMemo(
    () => mappingRows.filter((item) => item.is_set).length,
    [mappingRows],
  );

  const mappingEditorFields = useMemo(
    () => getWebTemplateFields(mappingEditorType),
    [mappingEditorType],
  );

  const mappingAvailableVariables = useMemo(
    () =>
      normalizeList(selectedMappingItem?.available_variables).filter((item) => item?.key),
    [selectedMappingItem],
  );

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

  const renderMappingTab = () => {
    const inputClass = `${FIELD_INPUT} font-mono`;

    return (
      <div className="flex flex-col lg:flex-row min-h-[560px]">
        <div className="lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50">
          <div className="px-3 md:px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
            <div>
              <p className={`${CELL_TITLE} m-0`}>System templates</p>
              <p className={`${CELL_META} m-0 mt-0.5`}>
                {mappedCount} of {mappingRows.length} active
              </p>
            </div>
            <button
              type="button"
              onClick={fetchTemplateMappings}
              disabled={mappingLoading}
              className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50"
              title="Refresh"
            >
              <FiRefreshCw className={`w-4 h-4 ${mappingLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="p-2 space-y-1 max-h-[480px] overflow-y-auto">
            {mappingLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-14 rounded-lg bg-gray-200 animate-pulse" />
              ))
            ) : mappingRows.length === 0 ? (
              <div className={EMPTY_WRAP}>
                <p className={EMPTY_TITLE}>No system templates found</p>
                <p className={EMPTY_SUBTITLE}>Refresh to load mapping slots</p>
              </div>
            ) : (
              mappingRows.map((item) => {
                const isSelected = item.name === selectedMappingName;

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => selectMappingItem(item)}
                    className={`w-full text-left px-3 py-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-green-300 bg-white shadow-sm'
                        : 'border-transparent hover:bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800 capitalize">
                        {item.name}
                      </span>
                      <MappingStatusBadge isSet={Boolean(item.is_set)} />
                    </div>
                    {item.description ? (
                      <p className="text-xs text-gray-500 m-0 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 p-4 sm:p-6">
          {!selectedMappingItem ? (
            <div className="flex items-center justify-center h-full min-h-[320px] text-sm text-gray-500">
              {mappingLoading ? (
                <span className="inline-flex items-center gap-2">
                  <FiLoader className="w-5 h-5 animate-spin text-green-600" />
                  Loading templates...
                </span>
              ) : (
                'Select a system template to configure'
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 m-0 capitalize">
                    {selectedMappingItem.name}
                  </h3>
                  <p className="text-sm text-gray-500 m-0 mt-1">
                    {selectedMappingItem.description || 'Configure the static WhatsApp message for this event.'}
                  </p>
                </div>
                <MappingStatusBadge isSet={Boolean(selectedMappingItem.is_set)} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template type
                    </label>
                    <select
                      value={mappingEditorType}
                      onChange={(e) => handleEditorTypeChange(e.target.value)}
                      disabled={mappingSaving}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60 capitalize"
                    >
                      {TEMPLATE_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {mappingAvailableVariables.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 m-0">
                        Insert variables
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {mappingAvailableVariables.map((variable) => (
                          <button
                            key={variable.key}
                            type="button"
                            onClick={() => insertVariableIntoField(variable.key)}
                            disabled={mappingSaving}
                            className="inline-flex px-2 py-1 rounded text-xs font-mono bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 disabled:opacity-50"
                            title={variable.label}
                          >
                            {variable.key}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {mappingEditorFields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required ? <span className="text-red-500"> *</span> : null}
                        </label>
                        {field.inputType === 'url' ? (
                          <MediaUrlField
                            value={mappingEditorValues[field.key] || ''}
                            onChange={(nextValue) => handleEditorFieldChange(field.key, nextValue)}
                            templateType={mappingEditorType}
                            placeholder="https://cdn.example.com/file.jpg"
                            disabled={mappingSaving}
                            onFocus={() => setActiveEditorField(field.key)}
                            onFileUploaded={
                              field.key === 'url' && mappingEditorType === 'document'
                                ? (file) => {
                                    if (!mappingEditorValues.filename?.trim()) {
                                      handleEditorFieldChange('filename', file.name);
                                    }
                                  }
                                : undefined
                            }
                          />
                        ) : field.multiline ? (
                          <textarea
                            ref={(node) => {
                              editorFieldRefs.current[field.key] = node;
                            }}
                            value={mappingEditorValues[field.key] || ''}
                            onChange={(e) => handleEditorFieldChange(field.key, e.target.value)}
                            onFocus={() => setActiveEditorField(field.key)}
                            rows={6}
                            placeholder="Hello {{name}}, your task {{service_name}} has been created."
                            disabled={mappingSaving}
                            className={`${inputClass} resize-y min-h-[140px]`}
                          />
                        ) : (
                          <input
                            ref={(node) => {
                              editorFieldRefs.current[field.key] = node;
                            }}
                            type="text"
                            value={mappingEditorValues[field.key] || ''}
                            onChange={(e) => handleEditorFieldChange(field.key, e.target.value)}
                            onFocus={() => setActiveEditorField(field.key)}
                            placeholder={
                              field.key === 'filename'
                                ? 'Invoice_{{invoice_no}}.pdf'
                                : 'Enter value'
                            }
                            disabled={mappingSaving}
                            className={inputClass}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveStaticTemplate}
                      disabled={mappingSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                    >
                      {mappingSaving ? <FiLoader className="w-4 h-4 animate-spin" /> : null}
                      Save
                    </button>
                    {selectedMappingItem.is_set ? (
                      <button
                        type="button"
                        onClick={handleDisableStaticTemplate}
                        disabled={mappingSaving}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50"
                      >
                        Disable
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className={`${SECTION_LABEL} mb-3 m-0`}>
                    Preview
                  </p>
                  <div className="rounded-xl bg-[#e5ddd5] p-4 flex justify-center">
                    <WebMappingPreview
                      templateType={mappingEditorType}
                      componentValues={mappingEditorValues}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderListTab = () => (
    <>
      <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
        <div className="min-w-0">
          <h2 className={`${CELL_TITLE} m-0`}>Template library</h2>
          <p className={`${CELL_META} m-0 mt-0.5`}>
            {pagination.total} template{pagination.total === 1 ? '' : 's'} found
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
            disabled={listLoading}
            className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            title="Refresh"
          >
            <FiRefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed min-w-[860px]">
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th className={`${TABLE_TH} w-[28%]`}>Template</th>
              <th className={`${TABLE_TH} w-[12%]`}>Type</th>
              <th className={`${TABLE_TH} w-[22%]`}>Variables</th>
              <th className={`${TABLE_TH} w-[12%]`}>Status</th>
              <th className={`${TABLE_TH} w-[14%]`}>Modified</th>
              <th className={`${TABLE_TH} w-[12%] text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {listLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={index} className="animate-pulse border-b border-gray-100">
                  {Array.from({ length: 6 }).map((__, cellIndex) => (
                    <td key={cellIndex} className={TABLE_TD}>
                      <div
                        className="h-3 bg-gray-200 rounded"
                        style={{ width: `${55 + (cellIndex % 3) * 18}px` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12">
                  <div className={EMPTY_WRAP}>
                    <p className={EMPTY_TITLE}>No templates found</p>
                    <p className={EMPTY_SUBTITLE}>
                      Create a template or adjust filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((item) => {
                const variables = normalizeVariables(item.variables_json);

                return (
                  <tr key={item.template_id} className={TABLE_ROW}>
                    <td className={TABLE_TD}>
                      <p className={`${CELL_TITLE} truncate m-0`}>
                        {item.template_name}
                      </p>
                      <p className={`${CELL_META} m-0 mt-0.5 line-clamp-2 font-mono`}>
                        {getContentPreview(item)}
                      </p>
                    </td>
                    <td className={TABLE_TD}>
                      <TemplateTypeBadge type={item.template_type} />
                    </td>
                    <td className={TABLE_TD}>
                      {variables.length ? (
                        <div className="flex flex-wrap gap-1">
                          {variables.slice(0, 4).map((variable) => (
                            <span
                              key={variable}
                              className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono bg-gray-100 text-gray-600"
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
                        <span className={CELL_EMPTY}>—</span>
                      )}
                    </td>
                    <td className={TABLE_TD}>
                      <TemplateStatusBadge status={item.status} />
                    </td>
                    <td className={TABLE_TD}>
                      <p className={`${CELL_BODY} whitespace-nowrap m-0`}>
                        {formatDate(item.modify_date || item.create_date)}
                      </p>
                    </td>
                    <td className={`${TABLE_TD} text-right`}>
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
                          onClick={() => setFormModal({ mode: 'edit', ...item })}
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

      {!listLoading && pagination.total_pages > 1 ? (
        <div className="px-3 md:px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
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
              className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              <FiChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => goToPage(pagination.page_no - 1)}
              disabled={pagination.page_no <= 1}
              className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-medium text-gray-700">
              Page {pagination.page_no} of {pagination.total_pages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(pagination.page_no + 1)}
              disabled={pagination.page_no >= pagination.total_pages}
              className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => goToPage(pagination.total_pages)}
              disabled={pagination.page_no >= pagination.total_pages}
              className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              <FiChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  if (!check('broadcast_config_edit')) {
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
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}
        >
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiLock className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Access Denied
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              You do not have permission to manage WhatsApp Web templates.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  {activeTab === 'mapping' ? (
                    <FiLink className="w-4 h-4 text-green-600" />
                  ) : (
                    <FiFileText className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight truncate m-0">
                    WhatsApp Web Templates
                  </h1>
                  <p className={`${CELL_META} m-0 mt-0.5`}>
                    Static system templates and broadcast library
                  </p>
                </div>
              </div>

              <nav className="flex items-center gap-1 shrink-0">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`${TOOLBAR_BTN} transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                {activeTab === 'list' ? (
                  <button
                    type="button"
                    onClick={() => setFormModal({ mode: 'create' })}
                    className={`${TOOLBAR_BTN} inline-flex items-center gap-1.5 text-white bg-green-600 hover:bg-green-700`}
                  >
                    <FiPlus className="w-3.5 h-3.5" />
                    Create template
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={
                    activeTab === 'mapping'
                      ? fetchTemplateMappings
                      : () =>
                          fetchTemplates(
                            pagination.page_no,
                            pagination.limit,
                            statusFilter,
                            typeFilter,
                          )
                  }
                  disabled={
                    activeTab === 'mapping' ? mappingLoading : listLoading
                  }
                  className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw
                    className={`w-4 h-4 ${
                      (activeTab === 'mapping' ? mappingLoading : listLoading)
                        ? 'animate-spin'
                        : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {activeTab === 'mapping' ? renderMappingTab() : renderListTab()}
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
