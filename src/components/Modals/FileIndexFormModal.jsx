import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiPlus, FiEdit2, FiUser, FiX, FiLoader } from "react-icons/fi";
import CustomSelect from "../CustomSelect";
import {
  CLIENT_LIST_QUERY_PARAMS,
  createClientListLoadOptions,
  getClientOptionLabel,
  getClientOptionValue,
  renderClientListOption,
} from "../../utils/customSelectHelpers";

const FIELD_LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";
const FIELD_INPUT =
  "w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60 bg-white";
const MODAL_BODY =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const emptyForm = {
  username: "",
  selectedUser: null,
  gst: "",
  audit: "",
  income_tax: "",
  other: "",
};

const loadClientOptions = createClientListLoadOptions({
  ...CLIENT_LIST_QUERY_PARAMS,
  limit: 20,
});

export default function FileIndexFormModal({
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
        username: initial.username || "",
        selectedUser: null,
        gst: initial.gst || "",
        audit: initial.audit || "",
        income_tax: initial.income_tax || "",
        other: initial.other || "",
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
    if (!isEdit) {
      const firmId = form.selectedUser?.firms?.[0]?.firm_id;
      if (!firmId) nextErrors.username = "Select a client with a firm";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({
      firm_id: isEdit ? initial?.firmid : form.selectedUser?.firms?.[0]?.firm_id,
      index_id: initial?.indexid,
      gst: form.gst.trim() || null,
      audit: form.audit.trim() || null,
      it: form.income_tax.trim() || null,
      others: form.other.trim() || null,
    });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="file-index-form-overlay"
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
                    {isEdit ? "Update file index" : "Create file index"}
                  </h3>
                  <p className="text-xs text-gray-500 m-0">
                    {isEdit ? "Modify GST, audit, ITR and other file numbers" : "Add file numbers for a client firm"}
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
                  {isEdit ? (
                    <div>
                      <p className={FIELD_LABEL}>Firm / client</p>
                      <div className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                          <FiUser className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 m-0 truncate">
                            {initial?.firmname || initial?.name || "—"}
                          </p>
                          <p className="text-xs text-gray-500 m-0 truncate">
                            {initial?.name ? `Created by ${initial.name}` : initial?.mobile || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className={FIELD_LABEL}>
                        Client <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        loadOptions={loadClientOptions}
                        defaultOptions
                        debounceMs={350}
                        value={form.selectedUser}
                        onChange={(item) => {
                          setForm((prev) => ({
                            ...prev,
                            selectedUser: item || null,
                            username: item?.username || "",
                          }));
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.username;
                            return next;
                          });
                        }}
                        getOptionLabel={getClientOptionLabel}
                        getOptionValue={getClientOptionValue}
                        renderOption={renderClientListOption}
                        placeholder="Search client by name or mobile…"
                        searchPlaceholder="Search clients…"
                        isDisabled={saving}
                      />
                      {errors.username ? (
                        <p className="mt-1 text-xs font-medium text-red-600 m-0">{errors.username}</p>
                      ) : null}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={FIELD_LABEL}>GST file number</label>
                      <input
                        type="text"
                        value={form.gst}
                        onChange={(e) => setField("gst", e.target.value)}
                        placeholder="GST file number"
                        disabled={saving}
                        className={FIELD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Audit file number</label>
                      <input
                        type="text"
                        value={form.audit}
                        onChange={(e) => setField("audit", e.target.value)}
                        placeholder="Audit file number"
                        disabled={saving}
                        className={FIELD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Income tax file</label>
                      <input
                        type="text"
                        value={form.income_tax}
                        onChange={(e) => setField("income_tax", e.target.value)}
                        placeholder="ITR file number"
                        disabled={saving}
                        className={FIELD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Other file</label>
                      <input
                        type="text"
                        value={form.other}
                        onChange={(e) => setField("other", e.target.value)}
                        placeholder="Other file number"
                        disabled={saving}
                        className={FIELD_INPUT}
                      />
                    </div>
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
