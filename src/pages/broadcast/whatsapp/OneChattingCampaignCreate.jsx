import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { FiArrowLeft, FiLoader, FiLock, FiSend, FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import CustomSelect from "../../../components/CustomSelect";
import OneChattingTemplatePreview from "../../../components/WhatsApp/OneChattingTemplatePreview";
import { useUserPermissions } from "../../../utils/permission-helper";
import {
  buildTemplateComponents,
  buildTemplatePreviewContent,
  extractApiError,
  getTemplatePlaceholders,
  normalizeRecipientNumber,
} from "../../../utils/oneChattingSendUtils";
import { normalizeList, whatsappApi } from "../../../services/whatsappApi";

const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const TOOLBAR_BTN = "px-3 py-2 text-sm font-medium rounded-lg";
const FIELD_INPUT =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60";
const CELL_TITLE = "font-semibold text-gray-800 text-sm";
const CELL_BODY = "text-sm font-medium text-gray-700";
const CELL_SUB = "text-xs text-gray-400";
const SECTION_LABEL =
  "text-[11px] font-bold text-gray-700 uppercase tracking-wide";

const parseNumbersText = (text) => {
  const parts = String(text || "")
    .split(/[\s,;]+/)
    .map((n) => normalizeRecipientNumber(n))
    .filter(Boolean);
  return [...new Set(parts)];
};

const formatScheduleDate = (localDatetime) => {
  if (!localDatetime) return "";
  // datetime-local → YYYY-MM-DD HH:mm:ss
  const [date, time] = String(localDatetime).split("T");
  if (!date || !time) return "";
  const hhmmss = time.length === 5 ? `${time}:00` : time.slice(0, 8);
  return `${date} ${hhmmss}`;
};

const OneChattingCampaignCreate = () => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [name, setName] = useState("");
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [numbersText, setNumbersText] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variableValues, setVariableValues] = useState({});

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await whatsappApi.getTemplateList({
        status: "APPROVED",
        page_no: 1,
        limit: 100,
      });
      setTemplates(normalizeList(res?.data));
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load templates"));
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const templateOptions = useMemo(
    () =>
      templates.map((t) => ({
        value: t.template_id,
        label: t.template_name,
        template: t,
      })),
    [templates],
  );

  const selectedTemplateOption = useMemo(
    () =>
      templateOptions.find((o) => o.value === selectedTemplate?.template_id) ||
      null,
    [templateOptions, selectedTemplate],
  );

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

  const parsedNumbers = useMemo(
    () => parseNumbersText(numbersText),
    [numbersText],
  );

  const selectTemplate = (option) => {
    const template = option?.template || null;
    setSelectedTemplate(template);
    const next = {};
    if (template?.template) {
      getTemplatePlaceholders(template.template).forEach((field) => {
        if (field.example) next[field.key] = field.example;
      });
    }
    setVariableValues(next);
  };

  const loadClientNumbers = async () => {
    setLoadingClients(true);
    try {
      const res = await whatsappApi.getCampaignClientNumbers();
      const numbers = normalizeList(res?.data);
      if (!numbers.length) {
        toast.error("No branch clients with valid mobile numbers");
        return;
      }
      setNumbersText(numbers.join("\n"));
      toast.success(`Loaded ${numbers.length} client number(s)`);
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load client numbers"));
    } finally {
      setLoadingClients(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Campaign name is required");
      return;
    }
    if (!selectedTemplate?.template_id) {
      toast.error("Please select an approved template");
      return;
    }
    if (!parsedNumbers.length) {
      toast.error("Add at least one recipient number");
      return;
    }
    if (parsedNumbers.length > 10000) {
      toast.error("Maximum 10,000 numbers allowed");
      return;
    }

    const missing = placeholders.find(
      (field) => field.required && !variableValues[field.key]?.trim(),
    );
    if (missing) {
      toast.error(`Please fill in ${missing.label}`);
      return;
    }

    const component = buildTemplateComponents(
      selectedTemplate.template,
      variableValues,
    );
    const schedule_date = formatScheduleDate(scheduleLocal);

    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        template_id: String(selectedTemplate.template_id),
        numbers: parsedNumbers,
        component,
      };
      if (schedule_date) payload.schedule_date = schedule_date;

      const res = await whatsappApi.createCampaign(payload);
      const campaignId = res?.campaign_id;
      toast.success(res?.msg || res?.message || "Campaign created");
      if (campaignId) {
        navigate(`/broadcast/whatsapp/onechatting/campaigns/${campaignId}`);
      } else {
        navigate("/broadcast/whatsapp/onechatting/campaigns");
      }
    } catch (error) {
      toast.error(extractApiError(error, "Failed to create campaign"));
    } finally {
      setSaving(false);
    }
  };

  if (!check("broadcast_send")) {
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
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
        >
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiLock className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Access Denied
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              You do not have permission to create campaigns.
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
        className={`pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/broadcast/whatsapp/onechatting/campaigns")
                  }
                  className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 shrink-0"
                  title="Back"
                >
                  <FiArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <FiSend className="w-4 h-4 text-green-600" />
                </div>
                <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight truncate">
                  Create Campaign
                </h1>
              </div>
              <button
                type="submit"
                disabled={saving}
                className={`${TOOLBAR_BTN} inline-flex items-center gap-1.5 text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 ml-auto shrink-0`}
              >
                {saving ? (
                  <FiLoader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FiSend className="w-3.5 h-3.5" />
                )}
                {saving ? "Creating…" : "Create campaign"}
              </button>
            </div>

            <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
              <div className="space-y-5 min-w-0">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="March promo"
                    disabled={saving}
                    className={FIELD_INPUT}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    options={templateOptions}
                    value={selectedTemplateOption}
                    onChange={selectTemplate}
                    placeholder={
                      templatesLoading
                        ? "Loading templates…"
                        : "Select approved template"
                    }
                    searchPlaceholder="Search templates…"
                    noOptionsMessage="No approved templates"
                    isClearable={false}
                    isDisabled={saving || templatesLoading}
                  />
                </div>

                {placeholders.length > 0 ? (
                  <div className="space-y-3">
                    <p className={`${SECTION_LABEL} m-0`}>Template variables</p>
                    {placeholders.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required ? (
                            <span className="text-red-500"> *</span>
                          ) : null}
                        </label>
                        <input
                          type="text"
                          value={variableValues[field.key] || ""}
                          onChange={(e) =>
                            setVariableValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={field.example || field.label}
                          disabled={saving}
                          className={FIELD_INPUT}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Recipients <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={loadClientNumbers}
                      disabled={saving || loadingClients}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      {loadingClients ? (
                        <FiLoader className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FiUsers className="w-3.5 h-3.5" />
                      )}
                      Load branch clients
                    </button>
                  </div>
                  <textarea
                    value={numbersText}
                    onChange={(e) => setNumbersText(e.target.value)}
                    rows={8}
                    placeholder={"919876543210\n919811122233"}
                    disabled={saving}
                    className={`${FIELD_INPUT} font-mono resize-y`}
                  />
                  <p className={`${CELL_SUB} mt-1`}>
                    {parsedNumbers.length} unique number
                    {parsedNumbers.length === 1 ? "" : "s"} (max 10,000). Paste
                    numbers with country code, separated by new lines or commas.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule (optional, IST)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleLocal}
                    onChange={(e) => setScheduleLocal(e.target.value)}
                    disabled={saving}
                    className={FIELD_INPUT}
                  />
                  <p className={`${CELL_SUB} mt-1`}>
                    Leave empty to send as soon as recipients are prepared.
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <p className={`${SECTION_LABEL} mb-3 m-0`}>Preview</p>
                <div className="rounded-xl bg-[#e5ddd5] p-3 flex justify-center lg:sticky lg:top-4">
                  {previewContent ? (
                    <OneChattingTemplatePreview
                      content={previewContent}
                      className="w-[280px] max-w-[280px]"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-500 m-0 px-2 py-8 text-center">
                      Select a template to preview
                    </p>
                  )}
                </div>
                {selectedTemplate ? (
                  <div className="mt-3">
                    <p className={CELL_TITLE}>
                      {selectedTemplate.template_name}
                    </p>
                    <p className={`${CELL_BODY} mt-0.5`}>
                      {selectedTemplate.category || "—"} ·{" "}
                      {(
                        selectedTemplate.template?.language || "en"
                      ).toUpperCase()}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OneChattingCampaignCreate;
