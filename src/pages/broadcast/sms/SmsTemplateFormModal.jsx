import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { smsApi } from "./smsApi";
import { 
  FiX, 
  FiFileText, 
  FiHash, 
  FiActivity, 
  FiSave,
  FiEye,
  FiCode
} from "react-icons/fi";

const emptyForm = {
  template_id: "",
  template_name: "",
  message: "",
  dlt_template_id: "",
  status: "active",
};

const SmsTemplateFormModal = ({ show, onHide, onSuccess, editData }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detectedVars, setDetectedVars] = useState([]);
  const [testVars, setTestVars] = useState({});
  const [renderedPreview, setRenderedPreview] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const isEdit = Boolean(editData?.template_id);

  // Extract variables using regex on message change
  useEffect(() => {
    const text = form.message || "";
    const regex = /{{([a-zA-Z0-9_]+)}}/g;
    const vars = new Set();
    let match;
    while ((match = regex.exec(text)) !== null) {
      vars.add(match[1]);
    }
    const varList = Array.from(vars);
    setDetectedVars(varList);

    // Initialise test variables
    setTestVars((prev) => {
      const next = {};
      varList.forEach((v) => {
        next[v] = prev[v] || `[${v}]`;
      });
      return next;
    });
  }, [form.message]);

  useEffect(() => {
    if (!show) return;
    setForm({
      ...emptyForm,
      ...editData,
      status: editData?.status || "active",
    });
    setRenderedPreview("");
  }, [show, editData]);

  // Dynamically update preview locally or via API
  useEffect(() => {
    if (!form.message) {
      setRenderedPreview("");
      return;
    }
    
    // Quick client-side preview rendering
    let preview = form.message;
    detectedVars.forEach((v) => {
      const val = testVars[v] || `[${v}]`;
      preview = preview.replaceAll(`{{${v}}}`, val);
    });
    setRenderedPreview(preview);
  }, [form.message, testVars, detectedVars]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTestVarChange = (varName, val) => {
    setTestVars((prev) => ({
      ...prev,
      [varName]: val,
    }));
  };

  const handleFetchServerPreview = async () => {
    if (!form.message) return;
    setLoadingPreview(true);
    try {
      const res = await smsApi.previewTemplate({
        message: form.message,
        variables: testVars,
      });
      if (res?.success && res?.data?.rendered) {
        setRenderedPreview(res.data.rendered);
        toast.success("Server-side preview synced");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to render preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const validate = () => {
    if (!form.template_name) {
      toast.error("Please enter template name");
      return false;
    }
    if (!form.message) {
      toast.error("Please enter message template");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        template_name: form.template_name,
        message: form.message,
        dlt_template_id: form.dlt_template_id || "",
        status: form.status,
        ...(isEdit && { template_id: form.template_id }),
      };

      if (isEdit) {
        await smsApi.updateTemplate(payload);
      } else {
        await smsApi.createTemplate(payload);
      }

      toast.success(isEdit ? "Template updated successfully" : "Template created successfully");
      onSuccess?.();
      onHide?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to save SMS template"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={onHide}></div>

      {/* Modal Panel */}
      <div className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FiFileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {isEdit ? "Edit SMS Template" : "Create SMS Template"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Design text templates with placeholders e.g., Welcome {"{{name}}"}
              </p>
            </div>
          </div>
          <button onClick={onHide} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Input Side */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="template_name"
                  value={form.template_name}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="e.g., OTP Verification SMS"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  DLT Template ID
                </label>
                <input
                  type="text"
                  name="dlt_template_id"
                  value={form.dlt_template_id || ""}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="e.g., 197771 (Required for DLT routes)"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Message Body <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={onChange}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                  placeholder="Enter template message. Use {{variable}} syntax for placeholders. E.g. Hello {{name}}, your balance is {{amount}}."
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Note: For **DLT Routes**, placeholders are automatically converted to {"{#var#}"} when sending to the gateway.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Template Status
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiActivity className="text-gray-400 w-4 h-4" />
                  </div>
                  <select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Preview Side */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FiEye className="text-blue-500" />
                    Live Message Preview
                  </h3>
                  {detectedVars.length > 0 && (
                    <button
                      onClick={handleFetchServerPreview}
                      disabled={loadingPreview}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                      title="Sync with server renderer"
                    >
                      <FiCode />
                      {loadingPreview ? "Rendering..." : "Sync Server"}
                    </button>
                  )}
                </div>

                {/* Rendered Preview Screen */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 min-h-[120px] font-mono text-sm text-slate-800 shadow-inner whitespace-pre-wrap relative">
                  {renderedPreview || (
                    <span className="text-slate-400 italic">Rendered message will appear here...</span>
                  )}
                </div>
              </div>

              {/* Detected variables and inputs */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FiHash />
                  Variables Map ({detectedVars.length})
                </h4>
                {detectedVars.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No placeholders detected in your template. Use {"{{var_name}}"} inside the message body.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1">
                    {detectedVars.map((v) => (
                      <div key={v} className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-slate-500 font-mono">{"{{"}{v}{"}}"}</span>
                        <input
                          type="text"
                          value={testVars[v] || ""}
                          onChange={(e) => handleTestVarChange(v, e.target.value)}
                          placeholder={`Enter mock value`}
                          className="px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onHide}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold text-sm flex items-center gap-2 shadow-md disabled:opacity-55"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                {isEdit ? "Update Template" : "Save Template"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmsTemplateFormModal;
