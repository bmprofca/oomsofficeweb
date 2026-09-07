import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { emailApi } from "../../pages/broadcast/email/emailApi";
import EmailModalShell, { EMAIL_MODAL_BODY } from "./EmailModalShell";
import CustomSelect from "../CustomSelect";
import { optionByValue } from "../../utils/customSelectHelpers";
import AnimatedCheckbox from "../AnimatedCheckbox";
import { FiX, FiSend, FiSave, FiExternalLink } from "react-icons/fi";

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
  status: "active",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const PROVIDER_GUIDES = [
  {
    id: "gmail",
    name: "Gmail",
    host: "smtp.gmail.com",
    port: "587",
    secure: false,
    hint: "Use an App Password, not your normal Gmail password.",
    href: "https://support.google.com/accounts/answer/185833",
  },
  {
    id: "outlook",
    name: "Outlook / Hotmail",
    host: "smtp.office365.com",
    port: "587",
    secure: false,
    hint: "Sign in with the full email. SMTP AUTH must be enabled.",
    href: "https://support.microsoft.com/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c13de169db4",
  },
  {
    id: "yahoo",
    name: "Yahoo Mail",
    host: "smtp.mail.yahoo.com",
    port: "465",
    secure: true,
    hint: "Generate an app password in Yahoo account security.",
    href: "https://help.yahoo.com/kb/SLN4724.html",
  },
  {
    id: "zoho",
    name: "Zoho Mail",
    host: "smtp.zoho.com",
    port: "587",
    secure: false,
    hint: "Use your Zoho address. Create an app password if 2FA is on.",
    href: "https://www.zoho.com/mail/help/zoho-mail-smtp-configuration.html",
  },
];

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

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
      port: editData?.port != null ? String(editData.port) : "",
      secure: Boolean(editData?.secure),
      status: editData?.status || "inactive",
    });
  }, [show, editData]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onPortChange = (e) => {
    const digits = String(e.target.value || "").replace(/\D/g, "").slice(0, 5);
    setForm((prev) => ({ ...prev, port: digits }));
  };

  const applyProvider = (provider) => {
    setForm((prev) => ({
      ...prev,
      host: provider.host,
      port: provider.port,
      secure: provider.secure,
    }));
    toast.success(`${provider.name} host and port filled. Add your credentials next.`);
  };

  const validate = () => {
    if (!form.config_name.trim() || !form.host.trim() || !form.port || !form.username.trim() || !form.from_email.trim()) {
      toast.error("Please fill required fields");
      return false;
    }
    const port = Number(form.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      toast.error("Port must be a number between 1 and 65535");
      return false;
    }
    if (!isEdit && !form.password) {
      toast.error("Password is required");
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
        config_name: form.config_name.trim(),
        host: form.host.trim(),
        port: Number(form.port),
        secure: form.secure ? 1 : 0,
        from_email: form.from_email.trim(),
        from_name: form.from_name.trim(),
        reply_to: form.reply_to.trim(),
        status: form.status,
      };

      if (isEdit) {
        await emailApi.updateConfig({
          ...payload,
          smtp_username: form.username.trim(),
          password: form.password || undefined,
        });
      } else {
        await emailApi.createConfig({
          ...payload,
          username: form.username.trim(),
          password: form.password,
        });
      }

      toast.success(isEdit ? "SMTP config updated" : "SMTP config created");
      onSuccess?.();
      onHide?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Failed to save SMTP config");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!validate()) return;
    setTesting(true);
    const toastId = toast.loading("Testing SMTP connection…");
    try {
      await emailApi.testConfig({
        config_id: form.config_id || undefined,
        host: form.host.trim(),
        port: Number(form.port),
        secure: form.secure ? 1 : 0,
        username: form.username.trim(),
        password: form.password,
        from_email: form.from_email.trim(),
        from_name: form.from_name.trim(),
      });
      toast.success("SMTP test successful", { id: toastId });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "SMTP test failed", { id: toastId });
    } finally {
      setTesting(false);
    }
  };

  return (
    <EmailModalShell show={show} onHide={onHide} maxWidthClass="max-w-2xl">
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit SMTP Configuration" : "Add SMTP Configuration"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Only one config can be active. That active config sends all branch emails.
          </p>
        </div>
        <button type="button" onClick={onHide} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <FiX className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className={EMAIL_MODAL_BODY} style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 mb-4">
          <p className="text-xs font-semibold text-slate-700 mb-1.5">Popular provider settings</p>
          <p className="text-xs text-slate-500 mb-2">
            Any SMTP provider works. These presets only fill host, port, and SSL. Create an app password from the provider, then paste it here.
          </p>
          <div className="space-y-1.5">
            {PROVIDER_GUIDES.map((provider) => (
              <div key={provider.id} className="flex items-start justify-between gap-2 text-xs">
                <div>
                  <span className="font-medium text-slate-800">{provider.name}</span>
                  <span className="text-slate-500"> — {provider.host}:{provider.port}. {provider.hint}</span>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyProvider(provider)}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Use
                  </button>
                  <a
                    href={provider.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline"
                  >
                    Guide <FiExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Configuration name <span className="text-red-500">*</span>
            </label>
            <input type="text" name="config_name" value={form.config_name} onChange={onChange} className={inputClass} placeholder="e.g. Office Gmail" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Host <span className="text-red-500">*</span>
            </label>
            <input type="text" name="host" value={form.host} onChange={onChange} className={inputClass} placeholder="smtp.gmail.com" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Port <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              name="port"
              value={form.port}
              onChange={onPortChange}
              className={inputClass}
              placeholder="587"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input type="text" name="username" value={form.username} onChange={onChange} className={inputClass} placeholder="you@gmail.com" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Password {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <input type="password" name="password" value={form.password} onChange={onChange} className={inputClass} placeholder={isEdit ? "Leave blank to keep current" : "App password"} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              From email <span className="text-red-500">*</span>
            </label>
            <input type="text" name="from_email" value={form.from_email} onChange={onChange} className={inputClass} placeholder="noreply@yourdomain.com" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">From name</label>
            <input type="text" name="from_name" value={form.from_name} onChange={onChange} className={inputClass} placeholder="Your company name" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reply-to</label>
            <input type="text" name="reply_to" value={form.reply_to} onChange={onChange} className={inputClass} placeholder="support@yourdomain.com" />
          </div>

          <div>
            <CustomSelect
              label="Status"
              options={STATUS_OPTIONS}
              value={optionByValue(STATUS_OPTIONS, form.status)}
              onChange={(opt) => setForm((prev) => ({ ...prev, status: opt?.value || "inactive" }))}
              isClearable={false}
              isSearchable={false}
              placeholder="Select status"
            />
          </div>

          <label className="md:col-span-2 flex items-start gap-2 cursor-pointer pt-1">
            <AnimatedCheckbox
              checked={form.secure}
              onChange={() => setForm((prev) => ({ ...prev, secure: !prev.secure }))}
              ariaLabel="Secure SSL connection"
            />
            <span className="text-xs text-gray-700">
              Secure connection (SSL). Turn this on for port 465. Leave off for 587 (STARTTLS).
            </span>
          </label>
        </div>
      </div>

      <div className="shrink-0 flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
        <button type="button" onClick={onHide} className="px-3.5 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          Close
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || saving}
          className="px-3.5 py-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {testing ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              Testing…
            </>
          ) : (
            <>
              <FiSend className="w-3.5 h-3.5" />
              Test SMTP
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || testing}
          className="px-3.5 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              {isEdit ? "Updating…" : "Saving…"}
            </>
          ) : (
            <>
              <FiSave className="w-3.5 h-3.5" />
              {isEdit ? "Update" : "Save"}
            </>
          )}
        </button>
      </div>
    </EmailModalShell>
  );
};

export default EmailConfigFormModal;
