import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiCheck,
  FiLoader,
  FiMessageSquare,
  FiX,
} from "react-icons/fi";
import OneChattingTemplatePreview from "../WhatsApp/OneChattingTemplatePreview";
import { extractApiError } from "../../utils/oneChattingSendUtils";
import {
  buildOomsSystemPreviewContent,
  formatActivityType,
  normalizeOomsSystemVariables,
} from "../../utils/oomsSystemTemplateUtils";
import { normalizeList, whatsappApi } from "../../services/whatsappApi";

const OomsSystemTemplatePickerModal = forwardRef(
  function OomsSystemTemplatePickerModal(
    { activityType, onClose, onSaved },
    ref,
  ) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [selectedName, setSelectedName] = useState(null);

  const fetchTemplates = useCallback(async () => {
    if (!activityType) return;

    setLoading(true);
    try {
      const res = await whatsappApi.getWpSystemTemplatesByType(activityType);
      const payload = res?.data ?? null;
      setData(payload);
      const active = payload?.active_template_name || null;
      const list = normalizeList(payload?.templates);
      setSelectedName(active || list[0]?.template_name || null);
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load templates"));
      setData(null);
      setSelectedName(null);
    } finally {
      setLoading(false);
    }
  }, [activityType]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const templates = useMemo(
    () => normalizeList(data?.templates),
    [data?.templates],
  );

  const activeTemplateName = data?.active_template_name || null;

  const selectedTemplate = useMemo(
    () =>
      templates.find((item) => item.template_name === selectedName) || null,
    [templates, selectedName],
  );

  const previewContent = useMemo(
    () => buildOomsSystemPreviewContent(selectedTemplate),
    [selectedTemplate],
  );

  const variables = useMemo(
    () => normalizeOomsSystemVariables(selectedTemplate?.available_variables),
    [selectedTemplate],
  );

  const isAlreadyActive =
    Boolean(selectedName) && selectedName === activeTemplateName;

  const handleConfirm = async () => {
    if (!activityType || !selectedName || isAlreadyActive) return;

    setSaving(true);
    try {
      const res = await whatsappApi.setWpSystemTemplateMap({
        type: activityType,
        template_name: selectedName,
      });
      toast.success(res?.message || "Template mapping saved");
      onSaved?.(res?.data);
      onClose?.();
    } catch (error) {
      toast.error(extractApiError(error, "Failed to save template mapping"));
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = formatActivityType(activityType);

  return (
    <motion.div
      ref={ref}
      className="fixed inset-0 z-[1100] flex items-end justify-center sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => !saving && onClose?.()}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ooms-template-picker-title"
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.16 }}
        className="relative flex h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <FiMessageSquare className="h-4 w-4" />
              </span>
              <h3
                id="ooms-template-picker-title"
                className="m-0 truncate text-lg font-semibold text-slate-900"
              >
                {typeLabel}
              </h3>
            </div>
            <p className="m-0 pl-10 text-sm text-slate-500">
              Select the WhatsApp template used for this notification.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-slate-500">
              <FiLoader className="mr-2 h-5 w-5 animate-spin" />
              Loading templates…
            </div>
          ) : templates.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FiMessageSquare className="h-5 w-5" />
              </div>
              <p className="m-0 text-sm font-medium text-slate-700">
                No templates available
              </p>
              <p className="mt-1 m-0 max-w-sm text-xs text-slate-500">
                Ask an admin to add an active system template for{" "}
                <span className="font-medium">{typeLabel}</span>.
              </p>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden">
              <div className="min-h-0 border-b border-slate-100 lg:overflow-y-auto lg:border-b-0 lg:border-r">
                <div className="space-y-2 p-4 sm:p-5">
                  <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Available templates ({templates.length})
                  </p>
                  {templates.map((template) => {
                    const isSelected = template.template_name === selectedName;
                    const isActive =
                      template.template_name === activeTemplateName;
                    const chips = normalizeOomsSystemVariables(
                      template.available_variables,
                    );

                    return (
                      <button
                        key={template.template_name}
                        type="button"
                        onClick={() => setSelectedName(template.template_name)}
                        className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-200"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                            aria-hidden
                          >
                            {isSelected ? (
                              <FiCheck className="h-3 w-3" strokeWidth={3} />
                            ) : null}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-900">
                                {template.template_name}
                              </span>
                              {template.category ? (
                                <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                  {template.category}
                                </span>
                              ) : null}
                              {isActive ? (
                                <span className="inline-flex rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                  In use
                                </span>
                              ) : null}
                            </div>
                            {template.content_preview ? (
                              <p className="mt-1.5 m-0 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                {template.content_preview}
                              </p>
                            ) : null}
                            {chips.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {chips.slice(0, 6).map((variable) => (
                                  <span
                                    key={variable.key || variable.label}
                                    className="inline-flex rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200"
                                    title={variable.key}
                                  >
                                    {variable.label || variable.key}
                                  </span>
                                ))}
                                {chips.length > 6 ? (
                                  <span className="text-[10px] text-slate-400">
                                    +{chips.length - 6} more
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex min-h-[320px] flex-col bg-slate-50/80 lg:min-h-0 lg:overflow-hidden">
                <div className="shrink-0 border-b border-slate-100 px-4 py-3">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Preview
                  </p>
                  {selectedTemplate ? (
                    <p className="m-0 mt-0.5 truncate text-sm font-medium text-slate-800">
                      {selectedTemplate.template_name}
                    </p>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                  {selectedTemplate ? (
                    <div className="mx-auto flex max-w-[330px] flex-col gap-3 pb-4">
                      <OneChattingTemplatePreview content={previewContent} />
                      {variables.length > 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="m-0 mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Variables filled at send time
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {variables.map((variable) => (
                              <span
                                key={variable.key || variable.label}
                                className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                                title={variable.key}
                              >
                                {variable.label || variable.key}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      Select a template to preview
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-xs text-slate-500">
            {isAlreadyActive
              ? "This template is already mapped for your branch."
              : selectedName
                ? `Ready to map “${selectedName}”.`
                : "Choose a template to continue."}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={
                saving ||
                loading ||
                !selectedName ||
                isAlreadyActive ||
                templates.length === 0
              }
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <FiLoader className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : isAlreadyActive ? (
                "Already selected"
              ) : (
                "Use this template"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default OomsSystemTemplatePickerModal;
