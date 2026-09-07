import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiPlus, FiEdit2, FiX, FiLoader } from "react-icons/fi";

const FIELD_LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";
const FIELD_INPUT =
  "w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60 bg-white";
const MODAL_BODY =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const emptyForm = {
  name: "",
  username: "",
  password: "",
  url: "",
  remark: "",
};

export default function ImportantLinkFormModal({
  open,
  mode = "create",
  initial = null,
  saving = false,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (isEdit && initial) {
      setForm({
        name: initial.name || "",
        username: initial.username || "",
        password: "",
        url: initial.url || "",
        remark: initial.remark || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, isEdit, initial]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Link name is required";
    if (!form.url.trim()) nextErrors.url = "URL is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      name: form.name.trim(),
      url: form.url.trim(),
      username: form.username.trim(),
      remark: form.remark.trim(),
    };
    if (isEdit) payload.link_id = initial?.link_id;
    if (form.password.trim()) payload.password = form.password;
    if (!isEdit) payload.password = form.password;

    onSubmit(payload);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="important-link-form-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-label="Close"
            onClick={saving ? undefined : onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg ${isEdit ? "bg-indigo-50" : "bg-emerald-50"}`}>
                  {isEdit ? (
                    <FiEdit2 className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <FiPlus className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-800 m-0">
                    {isEdit ? "Update link" : "Add important link"}
                  </h3>
                  <p className="text-xs text-gray-500 m-0">
                    {isEdit ? "Modify credentials and URL" : "Save a portal URL and credentials"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className={MODAL_BODY}>
                <div className="space-y-4">
                  <div>
                    <label className={FIELD_LABEL}>
                      Link name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      placeholder="e.g. GST Portal"
                      disabled={saving}
                      className={FIELD_INPUT}
                    />
                    {errors.name ? <p className="mt-1 text-xs font-medium text-red-600 m-0">{errors.name}</p> : null}
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>
                      URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={form.url}
                      onChange={(e) => setField("url", e.target.value)}
                      placeholder="https://example.com"
                      disabled={saving}
                      className={FIELD_INPUT}
                    />
                    {errors.url ? <p className="mt-1 text-xs font-medium text-red-600 m-0">{errors.url}</p> : null}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={FIELD_LABEL}>Username</label>
                      <input
                        type="text"
                        value={form.username}
                        onChange={(e) => setField("username", e.target.value)}
                        placeholder="Optional"
                        disabled={saving}
                        className={FIELD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Password</label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setField("password", e.target.value)}
                        placeholder={isEdit ? "Leave blank to keep current" : "Optional"}
                        disabled={saving}
                        className={FIELD_INPUT}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Remarks</label>
                    <textarea
                      value={form.remark}
                      onChange={(e) => setField("remark", e.target.value)}
                      placeholder="Notes…"
                      rows={3}
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60 bg-white resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : null}
                  {isEdit ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
