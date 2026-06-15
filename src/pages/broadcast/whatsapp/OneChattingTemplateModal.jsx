import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiLoader, FiSearch, FiUpload, FiX } from 'react-icons/fi';
import { whatsappApi } from './whatsappApi';
import OneChattingTemplatePreview from './OneChattingTemplatePreview';
import {
  buildTemplateComponents,
  buildTemplatePreviewContent,
  extractApiError,
  getTemplatePlaceholders,
  getTemplatePreviewText,
} from './oneChattingSendUtils';
import { uploadOneSaasFile } from './oneChattingUpload';

const URL_ACCEPT_BY_FORMAT = {
  IMAGE: 'image/jpeg,image/png,image/webp,image/gif',
  VIDEO: 'video/mp4,video/3gpp,video/quicktime',
  DOCUMENT: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar',
};

const TemplateUrlField = ({ field, value, onChange, disabled }) => {
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
      toast.success('File uploaded');
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to upload file'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.example || ''}
        disabled={disabled || uploading}
        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={URL_ACCEPT_BY_FORMAT[field.format] || '*/*'}
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

const OneChattingTemplateModal = ({
  isOpen,
  onClose,
  onSend,
  sending,
  replyPreview,
}) => {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variableValues, setVariableValues] = useState({});

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whatsappApi.getTemplateList({
        status: 'APPROVED',
        page_no: 1,
        limit: 100,
      });
      setTemplates(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load templates'));
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setSelectedTemplate(null);
    setVariableValues({});
    fetchTemplates();
  }, [isOpen, fetchTemplates]);

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter((item) =>
      [item.template_name, item.category, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [templates, search]);

  const placeholders = useMemo(() => {
    if (!selectedTemplate?.template) return [];
    return getTemplatePlaceholders(selectedTemplate.template);
  }, [selectedTemplate]);

  const previewContent = useMemo(() => {
    if (!selectedTemplate?.template) return null;
    return buildTemplatePreviewContent(
      selectedTemplate.template,
      variableValues,
    );
  }, [selectedTemplate, variableValues]);

  const handleSelectTemplate = (item) => {
    setSelectedTemplate(item);
    const nextValues = {};
    getTemplatePlaceholders(item.template).forEach((field) => {
      if (field.example) nextValues[field.key] = field.example;
    });
    setVariableValues(nextValues);
  };

  const handleVariableChange = (key, value) => {
    setVariableValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    const missingField = placeholders.find(
      (field) => field.required && !variableValues[field.key]?.trim(),
    );
    if (missingField) {
      toast.error(`Please fill in ${missingField.label}`);
      return;
    }

    const component = buildTemplateComponents(
      selectedTemplate.template,
      variableValues,
    );

    onSend({
      template_id: selectedTemplate.template_id,
      component,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={sending ? undefined : onClose}
      />
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h3 className="text-base font-semibold text-gray-800 m-0">
            Send template
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-50"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-4 overflow-y-auto min-h-0 flex-1">
            {replyPreview ? (
              <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-100 text-xs text-gray-600 mb-4">
                <span className="font-medium text-green-700">Replying to: </span>
                <span className="line-clamp-2">{replyPreview}</span>
              </div>
            ) : null}

            {!selectedTemplate ? (
              <>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search approved templates..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>

                {loading ? (
                  <div className="flex justify-center py-10">
                    <FiLoader className="w-6 h-6 animate-spin text-green-600" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8 m-0">
                    No approved templates found.
                  </p>
                ) : (
                  <div className="space-y-2 mt-4">
                    {filteredTemplates.map((item) => (
                      <button
                        key={item.template_id}
                        type="button"
                        onClick={() => handleSelectTemplate(item)}
                        className="w-full text-left px-3 py-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-gray-800 truncate">
                            {item.template_name}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-gray-500 shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 m-0">
                          {getTemplatePreviewText(item.template)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-0">
                <div className="space-y-4 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 m-0">
                        {selectedTemplate.template_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 m-0">
                        {selectedTemplate.category} ·{' '}
                        {selectedTemplate.template?.language || 'en'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate(null)}
                      className="text-xs text-green-700 hover:text-green-800 shrink-0"
                    >
                      Change
                    </button>
                  </div>

                  {placeholders.length === 0 ? (
                    <p className="text-sm text-gray-500 m-0">
                      This template has no variables to fill.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {placeholders.map((field) => (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                            {field.required ? (
                              <span className="text-red-500"> *</span>
                            ) : null}
                          </label>
                          {field.inputType === 'url' ? (
                            <TemplateUrlField
                              field={field}
                              value={variableValues[field.key] || ''}
                              onChange={(nextValue) =>
                                handleVariableChange(field.key, nextValue)
                              }
                              disabled={sending}
                            />
                          ) : (
                            <input
                              type="text"
                              value={variableValues[field.key] || ''}
                              onChange={(e) =>
                                handleVariableChange(field.key, e.target.value)
                              }
                              placeholder={field.example || ''}
                              disabled={sending}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 m-0">
                    Preview
                  </p>
                  <div className="rounded-xl bg-[#e5ddd5] p-4 flex justify-center lg:justify-start lg:sticky lg:top-0">
                    {previewContent ? (
                      <OneChattingTemplatePreview content={previewContent} />
                    ) : (
                      <p className="text-sm text-gray-500 m-0">
                        Preview will appear here.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedTemplate ? (
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
              >
                {sending ? <FiLoader className="w-4 h-4 animate-spin" /> : null}
                Send template
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
};

export default OneChattingTemplateModal;
