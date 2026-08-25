import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiArrowLeft,
  FiLoader,
  FiLock,
  FiSend,
  FiUsers,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import CustomSelect from "../../../components/CustomSelect";
import { useUserPermissions } from "../../../utils/permission-helper";
import {
  createClientListLoadOptions,
  getClientOptionLabel,
  getClientOptionValue,
} from "../../../utils/customSelectHelpers";
import { smsApi, normalizeList } from "../../../services/smsApi";

const FIELD_INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const FIELD_LABEL = "block text-xs font-semibold text-gray-600 mb-1";

const Fast2SmsCampaignCreate = () => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [name, setName] = useState("");
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variableInputs, setVariableInputs] = useState({});
  const [selectAllClients, setSelectAllClients] = useState(true);
  const [selectedClients, setSelectedClients] = useState([]);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolvedCount, setResolvedCount] = useState(null);
  const [saving, setSaving] = useState(false);

  const clientLoadOptions = useMemo(() => createClientListLoadOptions(), []);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await smsApi.listTemplates({
        page_no: 1,
        limit: 100,
        status: "active",
      });
      setTemplates(normalizeList(res?.data));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load templates");
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
        label: `${t.name}${t.dlt_message_id ? ` · ${t.dlt_message_id}` : ""}`,
        raw: t,
      })),
    [templates],
  );

  const selectedRaw = selectedTemplate?.raw || null;
  const variableKeys = Array.isArray(selectedRaw?.variable_keys)
    ? selectedRaw.variable_keys
    : [];

  useEffect(() => {
    const next = {};
    variableKeys.forEach((key) => {
      next[key] = variableInputs[key] || "";
    });
    setVariableInputs(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.value]);

  const buildAudience = () => ({
    audience_type: "client",
    select_all_clients: selectAllClients,
    usernames: selectAllClients
      ? []
      : selectedClients.map((c) => getClientOptionValue(c)).filter(Boolean),
  });

  const previewRecipients = async () => {
    setResolveLoading(true);
    setResolvedCount(null);
    try {
      const res = await smsApi.resolveCampaignRecipients(buildAudience());
      setResolvedCount(Number(res?.count) || 0);
      toast.success(`${Number(res?.count) || 0} recipients resolved`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to resolve recipients");
    } finally {
      setResolveLoading(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!selectedTemplate?.value) {
      toast.error("Select a template");
      return;
    }
    if (!selectAllClients && !selectedClients.length) {
      toast.error("Select clients or enable select all");
      return;
    }

    const variables_values = variableKeys
      .map((key) => String(variableInputs[key] || "").trim())
      .join("|");

    setSaving(true);
    try {
      const res = await smsApi.createCampaign({
        name: name.trim(),
        template_id: selectedTemplate.value,
        variables_values,
        audience: buildAudience(),
      });
      toast.success(res?.message || "Campaign created");
      const id = res?.data?.campaign_id;
      navigate(
        id
          ? `/broadcast/sms/fast2sms/campaigns/${id}`
          : "/broadcast/sms/fast2sms/campaigns",
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create campaign");
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
          className={`flex h-[calc(100vh-4rem)] items-center justify-center pt-16 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
        >
          <div className="mx-4 max-w-sm rounded-lg border bg-white p-8 text-center">
            <FiLock className="mx-auto mb-3 h-8 w-8 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-500">Access Denied</h3>
          </div>
        </div>
      </div>
    );
  }

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";

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
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
      >
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <button
            type="button"
            onClick={() => navigate("/broadcast/sms/fast2sms/campaigns")}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft className="h-4 w-4" />
            Back to campaigns
          </button>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 py-3">
              <h1 className="m-0 text-lg font-bold text-gray-800">
                Create Fast2SMS Campaign
              </h1>
              <p className="m-0 mt-0.5 text-xs text-gray-400">
                Pick a template and client audience, then send via Fast2SMS.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-5 p-4 md:p-5">
              <div>
                <label className={FIELD_LABEL}>Campaign name</label>
                <input
                  className={FIELD_INPUT}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. March payment reminder"
                  required
                />
              </div>

              <div>
                <label className={FIELD_LABEL}>Template</label>
                <CustomSelect
                  value={selectedTemplate}
                  onChange={setSelectedTemplate}
                  options={templateOptions}
                  isLoading={templatesLoading}
                  placeholder="Select Fast2SMS template"
                />
                {selectedRaw?.message_body ? (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 whitespace-pre-wrap">
                    {selectedRaw.message_body}
                  </p>
                ) : null}
              </div>

              {variableKeys.length > 0 ? (
                <div>
                  <label className={FIELD_LABEL}>
                    DLT variables (same values for all recipients)
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {variableKeys.map((key) => (
                      <div key={key}>
                        <label className="mb-1 block text-[11px] font-medium text-gray-500">
                          {key}
                        </label>
                        <input
                          className={FIELD_INPUT}
                          value={variableInputs[key] || ""}
                          onChange={(e) =>
                            setVariableInputs((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FiUsers className="h-4 w-4 text-blue-600" />
                  <h3 className="m-0 text-sm font-semibold text-gray-800">Audience</h3>
                </div>
                <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectAllClients}
                    onChange={(e) => setSelectAllClients(e.target.checked)}
                  />
                  All clients with mobile numbers
                </label>
                {!selectAllClients ? (
                  <CustomSelect
                    isMulti
                    loadOptions={clientLoadOptions}
                    defaultOptions
                    debounceMs={350}
                    value={selectedClients}
                    onChange={(next) =>
                      setSelectedClients(Array.isArray(next) ? next : [])
                    }
                    getOptionLabel={getClientOptionLabel}
                    getOptionValue={getClientOptionValue}
                    placeholder="Search clients..."
                  />
                ) : null}
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={previewRecipients}
                    disabled={resolveLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {resolveLoading ? (
                      <FiLoader className="h-4 w-4 animate-spin" />
                    ) : (
                      <FiUsers className="h-4 w-4" />
                    )}
                    Preview count
                  </button>
                  {resolvedCount != null ? (
                    <span className="text-sm font-medium text-gray-700">
                      {resolvedCount} recipients
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/broadcast/sms/fast2sms/campaigns")}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <FiLoader className="h-4 w-4 animate-spin" />
                  ) : (
                    <FiSend className="h-4 w-4" />
                  )}
                  {saving ? "Creating…" : "Create & send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fast2SmsCampaignCreate;
