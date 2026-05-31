import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { smsApi } from "./smsApi";
import { 
  FiX, 
  FiMessageSquare, 
  FiKey, 
  FiHash, 
  FiActivity, 
  FiUserCheck,
  FiSend,
  FiSave,
  FiShield,
  FiSliders
} from "react-icons/fi";

const emptyForm = {
  config_id: "",
  config_name: "",
  provider: "fast2sms",
  auth_token: "",
  sender_id: "",
  route: "dlt",
  daily_limit: 1000,
  is_default: false,
  status: "active",
};

const SmsConfigFormModal = ({ show, onHide, onSuccess, editData, defaultShowTest }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testTemplateId, setTestTemplateId] = useState("");
  const [testVariablesValues, setTestVariablesValues] = useState("");
  const [testMessage, setTestMessage] = useState("Test SMS config connection successful.");
  const [showTestInput, setShowTestInput] = useState(false);
  const isEdit = Boolean(editData?.config_id);

  useEffect(() => {
    if (!show) {
      setShowTestInput(false);
      setTestNumber("");
      setTestTemplateId("");
      setTestVariablesValues("");
      setTestMessage("Test SMS config connection successful.");
      return;
    }
    setForm({
      ...emptyForm,
      ...editData,
      is_default: Boolean(editData?.is_default),
      daily_limit: editData?.daily_limit ?? 1000,
      status: editData?.status || "active",
      route: editData?.route || "dlt",
      auth_token: editData?.config_id ? "" : "", // Reset password field for security edit
    });
    if (defaultShowTest) {
      setShowTestInput(true);
    }
  }, [show, editData, defaultShowTest]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = (isTest = false) => {
    if (!form.config_name) {
      toast.error("Please enter a configuration name");
      return false;
    }
    if (!form.provider) {
      toast.error("Please select a provider");
      return false;
    }
    // Auth token is required for new configurations or if changing it in edit
    if (!isEdit && !form.auth_token) {
      toast.error("Auth Token is required");
      return false;
    }
    if (isTest) {
      if (!testNumber) {
        toast.error("Please enter a mobile number for testing");
        return false;
      }
      if (form.route === "dlt") {
        if (!testTemplateId) {
          toast.error("DLT Template ID is required for DLT route testing");
          return false;
        }
        if (!testVariablesValues) {
          toast.error("Variables values are required for DLT route testing");
          return false;
        }
      } else {
        if (!testMessage) {
          toast.error("Message content is required for testing");
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate(false)) return;
    setSaving(true);
    try {
      const payload = {
        config_id: form.config_id,
        config_name: form.config_name,
        provider: form.provider,
        sender_id: form.sender_id || undefined,
        route: form.route,
        is_default: form.is_default ? 1 : 0,
        status: form.status,
        daily_limit: Number(form.daily_limit),
      };

      // Only include auth token if provided (optional on edit)
      if (form.auth_token) {
        payload.auth_token = form.auth_token;
      }

      if (isEdit) {
        await smsApi.updateConfig(payload);
      } else {
        await smsApi.createConfig(payload);
      }

      toast.success(isEdit ? "SMS config updated" : "SMS config created");
      onSuccess?.();
      onHide?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to save SMS config"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!validate(true)) return;
    setTesting(true);
    try {
      const payload = {
        provider: form.provider,
        auth_token: form.auth_token || undefined, // Send if entered, backend uses existing if blank on edit
        sender_id: form.sender_id,
        route: form.route,
        test_number: testNumber,
        ...(form.route === "dlt"
          ? { template_id: testTemplateId, variables_values: testVariablesValues }
          : { message: testMessage }),
      };
      await smsApi.testConfig(payload);
      toast.success("Test SMS sent successfully");
      setShowTestInput(false);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || "SMS test failed"
      );
    } finally {
      setTesting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={onHide}></div>

      {/* Modal Panel */}
      <div className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FiMessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {isEdit ? "Edit SMS Configuration" : "Add SMS Configuration"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure Fast2SMS or custom gateways to send out text alerts
              </p>
            </div>
          </div>
          <button onClick={onHide} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Config Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Configuration Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMessageSquare className="text-gray-400 w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="config_name"
                    value={form.config_name}
                    onChange={onChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    placeholder="e.g., Main Branch Fast2SMS"
                    required
                  />
                </div>
              </div>

              {/* Provider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  SMS Provider <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSliders className="text-gray-400 w-4 h-4" />
                  </div>
                  <select
                    name="provider"
                    value={form.provider}
                    onChange={onChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
                  >
                    <option value="fast2sms">Fast2SMS</option>
                    <option value="custom">Custom gateway</option>
                  </select>
                </div>
              </div>

              {/* Sender ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Sender ID (Header)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUserCheck className="text-gray-400 w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="sender_id"
                    value={form.sender_id}
                    onChange={onChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    placeholder="e.g., FSTSMS / OOMSMS"
                  />
                </div>
              </div>

              {/* Route */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Sending Route <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSliders className="text-gray-400 w-4 h-4" />
                  </div>
                  <select
                    name="route"
                    value={form.route}
                    onChange={onChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-sm"
                  >
                    <option value="dlt">DLT Route (Highly Recommended)</option>
                    <option value="q">Quick SMS (q)</option>
                    <option value="v3">Promotional/Transactional (v3)</option>
                  </select>
                </div>
              </div>

              {/* Daily Limit */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Daily SMS Limit
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiHash className="text-gray-400 w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    name="daily_limit"
                    value={form.daily_limit}
                    onChange={onChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    placeholder="1000"
                  />
                </div>
              </div>

              {/* Auth Token / API Key */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Authorization Token / API Key {!isEdit && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiKey className="text-gray-400 w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    name="auth_token"
                    value={form.auth_token}
                    onChange={onChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    placeholder={isEdit ? "•••••••• (Leave blank to keep current key)" : "Enter API authentication credentials"}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Status
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

              {/* Default Toggle Checkbox */}
              <div className="flex items-center pl-2 pt-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={form.is_default}
                    onChange={onChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <FiShield className="w-4 h-4 text-green-500" />
                    Set as Default Gateway
                  </span>
                </label>
              </div>
            </div>

            {/* Connection Tester drawer */}
            {showTestInput && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-4 animate-fadeIn">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Test Configuration Connection</h4>
                <p className="text-xs text-slate-500">
                  Sends a quick test message using your current inputs. Make sure to enter your Auth Token above if you haven't saved this configuration yet.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {form.route === "dlt" ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          DLT Template ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={testTemplateId}
                          onChange={(e) => setTestTemplateId(e.target.value)}
                          placeholder="e.g., 197771"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Variables Values (pipe separated) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={testVariablesValues}
                          onChange={(e) => setTestVariablesValues(e.target.value)}
                          placeholder="e.g., surajit|"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Test Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="Enter test message content..."
                        rows={2}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <input
                    type="tel"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    placeholder="Enter mobile number (e.g., 8910710493)"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {testing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend className="w-3.5 h-3.5" />
                        Send SMS
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex justify-between items-center px-5 py-3 border-t border-gray-200 bg-gray-50">
          <div>
            {!showTestInput && (
              <button
                onClick={() => setShowTestInput(true)}
                className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-semibold text-sm flex items-center gap-2"
              >
                <FiSend className="w-4 h-4" />
                Test Gateway Connection
              </button>
            )}
            {showTestInput && (
              <button
                onClick={() => setShowTestInput(false)}
                className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                Cancel Test
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
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
                  {isEdit ? "Update Gateway" : "Save Gateway"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmsConfigFormModal;
