import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { emailApi } from "./emailApi";
import { 
  FiX, 
  FiMail, 
  FiServer, 
  FiGlobe, 
  FiUser, 
  FiLock, 
  FiAtSign, 
  FiUserCheck,
  FiSend,
  FiSave,
  FiActivity,
  FiShield
} from "react-icons/fi";

const emptyForm = {
  config_id: "",
  config_name: "",
  host: "",
  port: "",
  secure: false,
  username: "",
  password: "",
  from_email: "",
  from_name: "",
  reply_to: "",
  is_default: false,
  status: "active",
};

const EmailConfigFormModal = ({ show, onHide, onSuccess, editData }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const isEdit = Boolean(editData?.config_id);

  useEffect(() => {
    if (!show) return;
    setForm({
      ...emptyForm,
      ...editData,
      secure: Boolean(editData?.secure),
      is_default: Boolean(editData?.is_default),
      status: editData?.status || "active",
    });
  }, [show, editData]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    if (
      !form.config_name ||
      !form.host ||
      !form.port ||
      !form.username ||
      !form.from_email
    ) {
      toast.error("Please fill required fields");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        config_id: form.config_id,
        config_name: form.config_name,
        host: form.host,
        port: Number(form.port),
        secure: form.secure ? 1 : 0,
        from_email: form.from_email,
        from_name: form.from_name,
        reply_to: form.reply_to,
        is_default: form.is_default ? 1 : 0,
        status: form.status,
      };

      if (isEdit) {
        await emailApi.updateConfig({
          ...payload,
          smtp_username: form.username,
          password: form.password || undefined,
        });
      } else {
        await emailApi.createConfig({
          ...payload,
          username: form.username,
          password: form.password,
        });
      }

      toast.success(isEdit ? "SMTP config updated" : "SMTP config created");
      onSuccess?.();
      onHide?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to save SMTP config",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!validate()) return;
    setTesting(true);
    try {
      await emailApi.testConfig({
        config_id: form.config_id || undefined,
        host: form.host,
        port: Number(form.port),
        secure: form.secure ? 1 : 0,
        username: form.username,
        password: form.password,
        from_email: form.from_email,
        from_name: form.from_name,
      });
      toast.success("SMTP test successful");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || "SMTP test failed",
      );
    } finally {
      setTesting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onHide}></div>

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <FiMail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {isEdit ? "Edit SMTP Configuration" : "Add SMTP Configuration"}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Configure your email server settings for reliable email delivery
                </p>
              </div>
            </div>
            <button
              onClick={onHide}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Config Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Configuration Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="text-gray-400 w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="config_name"
                      value={form.config_name}
                      onChange={onChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="e.g., Primary SMTP Server"
                    />
                  </div>
                </div>

                {/* Host */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Host <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiServer className="text-gray-400 w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="host"
                      value={form.host}
                      onChange={onChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                </div>

                {/* Port */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Port <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiGlobe className="text-gray-400 w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      name="port"
                      value={form.port}
                      onChange={onChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="587"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="text-gray-400 w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={onChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password {!isEdit && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="text-gray-400 w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={onChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* From Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiAtSign className="text-gray-400 w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      name="from_email"
                      value={form.from_email}
                      onChange={onChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="noreply@yourdomain.com"
                    />
                  </div>
                </div>

                {/* From Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUserCheck className="text-gray-400 w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="from_name"
                      value={form.from_name}
                      onChange={onChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Your Company Name"
                    />
                  </div>
                </div>

                {/* Reply To */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reply-To
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiSend className="text-gray-400 w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      name="reply_to"
                      value={form.reply_to}
                      onChange={onChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="support@yourdomain.com"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex gap-6 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="secure"
                      checked={form.secure}
                      onChange={onChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      <FiShield className="w-4 h-4" />
                      Secure Connection (SSL/TLS)
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_default"
                      checked={form.is_default}
                      onChange={onChange}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Set as Default
                    </span>
                  </label>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              onClick={onHide}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center gap-2"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                  Testing...
                </>
              ) : (
                <>
                  <FiSend className="w-4 h-4" />
                  Test SMTP
                </>
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center gap-2 shadow-md"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isEdit ? "Updating..." : "Saving..."}
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  {isEdit ? "Update Configuration" : "Save Configuration"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfigFormModal;