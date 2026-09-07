import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiPlus, FiEdit2, FiUser, FiX, FiLoader } from "react-icons/fi";
import CustomSelect from "../CustomSelect";
import { DatePickerField } from "../PortalDatePicker";
import {
  CLIENT_LIST_QUERY_PARAMS,
  createClientListLoadOptions,
  getClientOptionLabel,
  getClientOptionValue,
  optionByValue,
  renderClientListOption,
} from "../../utils/customSelectHelpers";

const FIELD_LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";
const FIELD_INPUT =
  "w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60 bg-white";
const PICKER_BTN =
  "w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:border-indigo-400 focus:outline-none";
const MODAL_BODY =
  "px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const DURATION_OPTIONS = [
  { value: "1", label: "1 Year" },
  { value: "2", label: "2 Years" },
  { value: "3", label: "3 Years" },
];

const emptyForm = {
  username: "",
  selectedUser: null,
  company: "",
  type: "",
  duration: "1",
  validity_start: "",
  validity_end: "",
  password: "",
};

const addYearsIso = (iso, years) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1, d);
  date.setFullYear(date.getFullYear() + Number(years || 0));
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

const toIso = (value) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return String(value).slice(0, 10);
  const [day, month, year] = String(value).split(/[/-]/);
  if (!year || !month || !day) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const loadClientOptions = createClientListLoadOptions({
  ...CLIENT_LIST_QUERY_PARAMS,
  limit: 20,
});

export default function DscFormModal({
  open,
  mode = "create",
  initial = null,
  companies = [],
  types = [],
  companyLoading = false,
  typeLoading = false,
  saving = false,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (isEdit && initial) {
      setForm({
        ...emptyForm,
        dsc_id: initial.dsc_id,
        username: initial.username || "",
        selectedUser: null,
        company: initial.company || "",
        type: initial.type || "",
        duration: String(initial.duration || 1),
        validity_start: toIso(initial.validity_start),
        validity_end: toIso(initial.validity_end),
        password: initial.password || "",
        name: initial.name || "",
        guardian_name: initial.guardian_name || "",
        mobile: initial.mobile || "",
        user_type: initial.user_type || "",
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [open, isEdit, initial]);

  const setField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "validity_start" || field === "duration") {
        const start = field === "validity_start" ? value : prev.validity_start;
        const duration = field === "duration" ? value : prev.duration;
        next.validity_end = start ? addYearsIso(start, duration) : "";
      }
      return next;
    });
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const companyOptions = useMemo(
    () =>
      (companies || []).map((c) => ({
        value: c.value ?? c.company_id ?? c.name,
        label: c.name || c.label || c.value,
        ...c,
      })),
    [companies],
  );

  const typeOptions = useMemo(
    () =>
      (types || []).map((t) => ({
        value: t.value ?? t.type ?? t.name,
        label: t.name || t.label || t.value,
        ...t,
      })),
    [types],
  );

  const validate = () => {
    const next = {};
    if (!isEdit && !form.username) next.username = "Select a client";
    if (!form.company) next.company = "Select a company";
    if (!form.type) next.type = "Select a type";
    if (!form.validity_start) next.validity_start = "Issue date is required";
    if (!form.validity_end) next.validity_end = "Expire date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving || !validate()) return;
    onSubmit?.({
      dsc_id: form.dsc_id,
      username: form.username,
      company: form.company,
      type: form.type,
      year: form.duration,
      validity_start: form.validity_start,
      validity_end: form.validity_end,
      password: form.password || null,
    });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="dsc-form-overlay"
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
            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
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
                    {isEdit ? "Update DSC" : "Create DSC"}
                  </h3>
                  <p className="text-xs text-gray-500 m-0">
                    {isEdit ? "Modify the selected DSC register entry" : "Add a new DSC register entry"}
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
                      <p className={FIELD_LABEL}>Client</p>
                      <div className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                          <FiUser className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 m-0 truncate">{form.name || "—"}</p>
                          <p className="text-xs text-gray-500 m-0 truncate">
                            {form.guardian_name ? `C/O ${form.guardian_name}` : form.mobile || form.user_type}
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
                      {errors.username ? <p className="mt-1 text-xs font-medium text-red-600 m-0">{errors.username}</p> : null}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={FIELD_LABEL}>
                        Company <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        options={companyOptions}
                        value={optionByValue(companyOptions, form.company)}
                        onChange={(opt) => setField("company", opt?.value || "")}
                        placeholder={companyLoading ? "Loading…" : "Select company"}
                        isClearable={false}
                        isDisabled={saving || companyLoading}
                      />
                      {errors.company ? <p className="mt-1 text-xs font-medium text-red-600 m-0">{errors.company}</p> : null}
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>
                        Type <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        options={typeOptions}
                        value={optionByValue(typeOptions, form.type)}
                        onChange={(opt) => setField("type", opt?.value || "")}
                        placeholder={typeLoading ? "Loading…" : "Select type"}
                        isClearable={false}
                        isDisabled={saving || typeLoading}
                      />
                      {errors.type ? <p className="mt-1 text-xs font-medium text-red-600 m-0">{errors.type}</p> : null}
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>
                        Duration <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        options={DURATION_OPTIONS}
                        value={optionByValue(DURATION_OPTIONS, form.duration)}
                        onChange={(opt) => setField("duration", opt?.value || "1")}
                        isClearable={false}
                        isSearchable={false}
                        isDisabled={saving}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>
                        Issue date <span className="text-red-500">*</span>
                      </label>
                      <DatePickerField
                        value={form.validity_start}
                        onChange={(val) => setField("validity_start", val || "")}
                        placeholder="Select issue date"
                        mode="single"
                        hideTabs
                        showResetButton={false}
                        wrapperClassName="w-full"
                        buttonClassName={PICKER_BTN}
                      />
                      {errors.validity_start ? <p className="mt-1 text-xs font-medium text-red-600 m-0">{errors.validity_start}</p> : null}
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Expire date</label>
                      <input
                        type="text"
                        value={form.validity_end ? form.validity_end.split("-").reverse().join("/") : ""}
                        readOnly
                        disabled
                        placeholder="Calculated from issue date"
                        className={`${FIELD_INPUT} bg-gray-50 cursor-not-allowed`}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Password</label>
                      <input
                        type="text"
                        value={form.password}
                        onChange={(e) => setField("password", e.target.value)}
                        placeholder="Optional"
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
