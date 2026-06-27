import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiCheck, FiLoader, FiX } from 'react-icons/fi';
import OneChattingTemplatePreview from './OneChattingTemplatePreview';
import { extractApiError } from './oneChattingSendUtils';
import {
  buildOomsSystemPreviewContent,
  formatActivityType,
  normalizeOomsSystemVariables,
} from './oomsSystemTemplateUtils';
import { normalizeList, whatsappApi } from './whatsappApi';

const OomsSystemTemplatePickerModal = ({ activityType, onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(null);
  const [data, setData] = useState(null);

  const fetchTemplates = useCallback(async () => {
    if (!activityType) return;

    setLoading(true);
    try {
      const res = await whatsappApi.getWpSystemTemplatesByType(activityType);
      setData(res?.data ?? null);
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load templates'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activityType]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const templates = useMemo(
    () => normalizeList(data?.templates),
    [data?.templates],
  );

  const activeTemplateName = data?.active_template_name || null;

  const handleSelect = async (templateName) => {
    if (!activityType || !templateName) return;

    setSavingName(templateName);
    try {
      const res = await whatsappApi.setWpSystemTemplateMap({
        type: activityType,
        template_name: templateName,
      });
      toast.success(res?.message || 'Template mapping saved');
      onSaved?.(res?.data);
      onClose?.();
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to save template mapping'));
    } finally {
      setSavingName(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={() => !savingName && onClose?.()} />
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-800 m-0 truncate">
              {formatActivityType(activityType)} templates
            </h3>
            <p className="text-xs text-gray-500 m-0 mt-0.5">
              Choose a template design for this notification type
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(savingName)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-50"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <FiLoader className="w-6 h-6 animate-spin mr-2" />
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              No templates available for this type.
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => {
                const isActive = template.template_name === activeTemplateName;
                const isSaving = savingName === template.template_name;
                const previewContent = buildOomsSystemPreviewContent(template);
                const variables = normalizeOomsSystemVariables(template.available_variables);

                return (
                  <div
                    key={template.template_name}
                    className={`rounded-xl border p-4 transition-colors ${
                      isActive
                        ? 'border-green-400 bg-green-50/60 ring-1 ring-green-200'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`inline-flex h-4 w-4 rounded-full border-2 shrink-0 ${
                              isActive
                                ? 'border-green-600 bg-green-600'
                                : 'border-gray-300 bg-white'
                            }`}
                            aria-hidden
                          >
                            {isActive ? (
                              <FiCheck className="w-3 h-3 text-white m-auto" strokeWidth={3} />
                            ) : null}
                          </span>
                          <h4 className="text-sm font-semibold text-gray-900 m-0 font-mono">
                            {template.template_name}
                          </h4>
                          {isActive ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-green-100 text-green-700">
                              Active
                            </span>
                          ) : null}
                        </div>

                        {variables.length > 0 ? (
                          <div className="mb-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 m-0 mb-1.5">
                              Variables
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {variables.map((variable) => (
                                <span
                                  key={variable.key || variable.label}
                                  className="inline-flex px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-700"
                                  title={variable.key}
                                >
                                  {variable.label || variable.key}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleSelect(template.template_name)}
                          disabled={Boolean(savingName) || isActive}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? (
                            <>
                              <FiLoader className="w-3.5 h-3.5 animate-spin" />
                              Saving...
                            </>
                          ) : isActive ? (
                            'Selected'
                          ) : (
                            'Select'
                          )}
                        </button>
                      </div>

                      <div className="shrink-0 flex justify-center lg:justify-end">
                        <OneChattingTemplatePreview content={previewContent} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OomsSystemTemplatePickerModal;
