import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FiAlertCircle,
  FiBell,
  FiCheck,
  FiEdit2,
  FiFileText,
  FiLoader,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUser,
  FiUserCheck,
  FiUserX,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { Header, Sidebar } from "../../components/header";
import TablePagination from "../../components/TablePagination";
import { ClickToCallButton } from "../../components/Call/ClickToCall";
import ConfirmActionModal from "../../components/ConfirmActionModal";
import ClientPaymentReminderModal from "../../components/Modals/ClientPaymentReminderModal";
import CustomSelect from "../../components/CustomSelect";
import {
  DatePickerField,
  DateRangePickerField,
} from "../../components/PortalDatePicker";
import EmailActionMenu from "../broadcast/email/EmailActionMenu";
import { useUserPermissions } from "../../utils/permission-helper";
import API_BASE_URL from "../../utils/api-controller";
import getHeaders from "../../utils/get-headers";
import useDebouncedValue from "../../hooks/useDebouncedValue";

const contentInset = (isMinimized) =>
  isMinimized ? "md:pl-20" : "md:pl-[260px]";

const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const FILTERS_MANAGE = [
  { id: "all", label: "All" },
  { id: "unassigned", label: "Unassigned" },
  { id: "assigned", label: "Assigned" },
  { id: "mine", label: "Mine" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const NOTE_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const DESKTOP_MIN_W = "min-w-[1100px]";
const SELECT_CONTROL = "w-[180px] shrink-0";
const DATE_RANGE_BTN =
  "min-w-[12rem] w-full sm:w-56 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-indigo-400 focus:outline-none";

const formatPhone = (row) => {
  if (!row?.mobile) return "N/A";
  const code = row.country_code
    ? `+${String(row.country_code).replace(/^\+/, "")}`
    : "";
  return code ? `${code} ${row.mobile}` : row.mobile;
};

const formatStaffPhone = (row) => {
  if (!row?.staff_mobile) return "";
  const code = row.staff_country_code
    ? `+${String(row.staff_country_code).replace(/^\+/, "")}`
    : "";
  return code ? `${code} ${row.staff_mobile}` : row.staff_mobile;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatBalance = (balance) => {
  const amount = Number(balance || 0);
  const abs = Math.abs(amount).toLocaleString();
  return amount < 0 ? `-₹${abs}` : `₹${abs}`;
};

const reminderAtPayload = (isoDate) => {
  if (!isoDate) return null;
  const [y, m, d] = String(isoDate).split("-").map(Number);
  if (!y || !m || !d) return null;
  const local = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
};

const AnimatedCheckbox = ({
  checked = false,
  indeterminate = false,
  onChange,
  ariaLabel = "Select",
  disabled = false,
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate, checked]);

  const isActive = checked || indeterminate;

  return (
    <label
      className={`relative inline-flex items-center group ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <input
        ref={inputRef}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        disabled={disabled}
      />
      <motion.span
        className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-2 transition-colors duration-200 ${
          isActive
            ? "border-indigo-600 bg-indigo-600 shadow-sm shadow-indigo-200"
            : "border-gray-300 bg-white group-hover:border-indigo-400"
        }`}
        animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}
        transition={{ duration: 0.18 }}
        whileTap={disabled ? {} : { scale: 0.92 }}
      >
        <AnimatePresence initial={false} mode="wait">
          {indeterminate ? (
            <motion.span
              key="dash"
              className="block h-0.5 w-2 rounded-full bg-white"
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.4 }}
              transition={{ duration: 0.12 }}
            />
          ) : checked ? (
            <motion.svg
              key="check"
              viewBox="0 0 12 12"
              className="h-3 w-3 text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <path
                d="M2.5 6l2.2 2.2 4.8-4.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          ) : null}
        </AnimatePresence>
      </motion.span>
    </label>
  );
};

const PriorityBadge = ({ priority }) => {
  const map = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-gray-100 text-gray-600",
  };
  const key = String(priority || "medium").toLowerCase();
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
        map[key] || map.medium
      }`}
    >
      {key}
    </span>
  );
};

function NotesChip({ row, onClick }) {
  const text = String(row.last_note_text || "").trim();
  const overdue = Number(row.overdue_reminders) > 0;
  const reminderAt = row.last_note_reminder_at || row.next_reminder_at;
  const reminderOverdue =
    overdue ||
    (row.last_note_status === "open" &&
      row.last_note_reminder_at &&
      new Date(row.last_note_reminder_at) < new Date());

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(row);
      }}
      className="min-w-0 w-full rounded-md p-0.5 text-left transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
      title={text || "Open notes"}
    >
      <p className="m-0 truncate text-sm font-medium text-gray-700 line-clamp-1 group-hover:text-indigo-700">
        {text || (row.notes_count ? `${row.notes_count} note(s)` : "Add note…")}
      </p>
      {reminderAt || overdue ? (
        <span
          className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold ${
            reminderOverdue ? "text-red-600" : "text-gray-500"
          }`}
        >
          <FiBell className="h-3 w-3" />
          {reminderOverdue
            ? overdue
              ? `${row.overdue_reminders} overdue`
              : "Overdue"
            : formatDate(reminderAt)}
        </span>
      ) : (
        <span className="mt-0.5 block text-[10px] font-medium text-indigo-500">
          View notes
        </span>
      )}
    </button>
  );
}

function AssignModal({
  open,
  clientCount,
  assignees,
  loadingAssignees,
  saving,
  showUnassign = false,
  unassigning = false,
  onClose,
  onSubmit,
  onUnassign,
  onSearchAssignees,
}) {
  const [staffUsername, setStaffUsername] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const debouncedStaffSearch = useDebouncedValue(staffSearch, 300);
  const busy = saving || unassigning;

  useEffect(() => {
    if (open) {
      setStaffUsername("");
      setStaffSearch("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    onSearchAssignees?.(debouncedStaffSearch);
  }, [open, debouncedStaffSearch, onSearchAssignees]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="followup-assign"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            aria-label="Close"
            onClick={busy ? undefined : onClose}
            disabled={busy}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-[1] pointer-events-auto flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-3.5">
              <h3 className="m-0 truncate text-sm font-bold text-gray-800">
                Assign
                <span className="mx-1.5 font-medium text-gray-400">·</span>
                <span className="font-semibold text-gray-600">
                  {clientCount} client{clientCount === 1 ? "" : "s"}
                </span>
              </h3>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div
              className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 ${SCROLL_HIDE}`}
            >
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-gray-700">
                Search assignee
              </label>
              <div className="relative mb-3">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Name or mobile…"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                {loadingAssignees ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                    <FiLoader className="animate-spin" /> Loading…
                  </div>
                ) : assignees.length === 0 ? (
                  <p className="py-8 text-center text-sm font-medium text-gray-500">
                    No assignees found
                  </p>
                ) : (
                  assignees.map((staff) => {
                    const selected = staff.username === staffUsername;
                    return (
                      <button
                        key={staff.username}
                        type="button"
                        onClick={() => setStaffUsername(staff.username)}
                        className={`flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left last:border-b-0 ${
                          selected ? "bg-indigo-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                            selected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {selected ? <FiCheck size={11} /> : null}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 truncate text-sm font-semibold text-gray-800">
                            {staff.name || "Unnamed"}
                            {staff.type === "admin" ? (
                              <span className="ml-1.5 text-[10px] font-semibold uppercase text-indigo-600">
                                Admin
                              </span>
                            ) : null}
                          </p>
                          <p className="m-0 truncate text-xs text-gray-500">
                            {formatPhone(staff)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-5 py-3">
              {showUnassign ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onUnassign}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {unassigning ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiUserX className="h-4 w-4" />
                  )}
                  Unassign
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !staffUsername}
                  onClick={() => onSubmit({ staff_username: staffUsername })}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? <FiLoader className="animate-spin" /> : null}
                  Assign
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function NotesModal({ open, client, onClose, canEdit, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({
    note: "",
    priority: "medium",
    status: "open",
    reminder_at: "",
  });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    noteId: null,
    loading: false,
  });

  const loadNotes = useCallback(async () => {
    if (!client?.client_username) return;
    const headers = getHeaders();
    if (!headers) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/assistance/followup/notes`, {
        headers,
        params: { client_username: client.client_username },
      });
      setNotes(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load notes");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [client?.client_username]);

  useEffect(() => {
    if (open) {
      setForm({
        note: "",
        priority: "medium",
        status: "open",
        reminder_at: "",
      });
      loadNotes();
    }
  }, [open, loadNotes]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !deleteModal.open) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, deleteModal.open]);

  const notifyChanged = () => {
    onChanged?.();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!String(form.note || "").trim()) {
      toast.error("Enter a note");
      return;
    }
    const headers = getHeaders();
    if (!headers) return;
    setSaving(true);
    try {
      await axios.post(
        `${API_BASE_URL}/assistance/followup/notes`,
        {
          client_username: client.client_username,
          note: form.note,
          priority: form.priority,
          status: form.status,
          reminder_at: reminderAtPayload(form.reminder_at),
        },
        { headers },
      );
      toast.success("Note added");
      setForm({
        note: "",
        priority: "medium",
        status: "open",
        reminder_at: "",
      });
      loadNotes();
      notifyChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  const markDone = async (noteId) => {
    const headers = getHeaders();
    if (!headers) return;
    try {
      await axios.put(
        `${API_BASE_URL}/assistance/followup/notes/${noteId}`,
        { status: "done" },
        { headers },
      );
      loadNotes();
      notifyChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update note");
    }
  };

  const confirmDeleteNote = async () => {
    const noteId = deleteModal.noteId;
    if (!noteId) return;
    const headers = getHeaders();
    if (!headers) return;
    setDeleteModal((m) => ({ ...m, loading: true }));
    try {
      await axios.delete(
        `${API_BASE_URL}/assistance/followup/notes/${noteId}`,
        { headers },
      );
      toast.success("Note deleted");
      setDeleteModal({ open: false, noteId: null, loading: false });
      loadNotes();
      notifyChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete note");
      setDeleteModal((m) => ({ ...m, loading: false }));
    }
  };

  const displayName = client?.client_name || "Client";

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {open && client ? (
            <motion.div
              key="followup-notes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                aria-label="Close"
                onClick={onClose}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="relative z-[1] pointer-events-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-3.5">
                  <h3 className="m-0 min-w-0 truncate text-sm font-bold text-gray-800">
                    Follow-up notes
                    <span className="mx-1.5 font-medium text-gray-400">·</span>
                    <span className="font-semibold text-gray-700">
                      {displayName}
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Close"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <div
                  className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 ${SCROLL_HIDE}`}
                >
                  {canEdit ? (
                    <form
                      onSubmit={handleCreate}
                      className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        Add note / reminder
                      </p>
                      <textarea
                        value={form.note}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, note: e.target.value }))
                        }
                        rows={3}
                        placeholder="Note…"
                        className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <CustomSelect
                          value={
                            PRIORITY_OPTIONS.find(
                              (o) => o.value === form.priority,
                            ) || PRIORITY_OPTIONS[1]
                          }
                          onChange={(opt) =>
                            setForm((f) => ({
                              ...f,
                              priority: opt?.value || "medium",
                            }))
                          }
                          options={PRIORITY_OPTIONS}
                          isSearchable={false}
                          isClearable={false}
                          placeholder="Priority"
                        />
                        <CustomSelect
                          value={
                            NOTE_STATUS_OPTIONS.find(
                              (o) => o.value === form.status,
                            ) || NOTE_STATUS_OPTIONS[0]
                          }
                          onChange={(opt) =>
                            setForm((f) => ({
                              ...f,
                              status: opt?.value || "open",
                            }))
                          }
                          options={NOTE_STATUS_OPTIONS}
                          isSearchable={false}
                          isClearable={false}
                          placeholder="Status"
                        />
                        <DatePickerField
                          value={form.reminder_at}
                          onChange={(iso) =>
                            setForm((f) => ({
                              ...f,
                              reminder_at: iso || "",
                            }))
                          }
                          placeholder="Reminder date"
                          buttonClassName="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          hideTabs
                          quickOptionKeys={["td", "tom", "n7"]}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {saving ? (
                          <FiLoader className="animate-spin" />
                        ) : (
                          <FiPlus />
                        )}
                        Save note
                      </button>
                    </form>
                  ) : null}

                  {loading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                      <FiLoader className="animate-spin" /> Loading…
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="m-0 text-sm font-medium text-gray-500">
                        No notes yet
                      </p>
                      <p className="m-0 mt-1 text-xs text-gray-400">
                        Add a note or reminder for this client.
                      </p>
                    </div>
                  ) : (
                    <ul className="m-0 list-none space-y-2 p-0">
                      {notes.map((item) => {
                        const overdue =
                          item.status === "open" &&
                          item.reminder_at &&
                          new Date(item.reminder_at) < new Date();
                        return (
                          <li
                            key={item.note_id}
                            className="rounded-xl border border-gray-200 bg-white p-3"
                          >
                            <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="m-0 whitespace-pre-wrap text-sm font-semibold text-gray-800">
                                  {item.note || item.subject || "Untitled"}
                                </p>
                                <p className="m-0 mt-0.5 text-xs text-gray-400">
                                  {item.create_by_name || "Staff"} ·{" "}
                                  {formatDateTime(item.create_date)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <PriorityBadge priority={item.priority} />
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                    item.status === "open"
                                      ? "bg-blue-100 text-blue-700"
                                      : item.status === "done"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </div>
                            </div>
                            {item.reminder_at ? (
                              <p
                                className={`mb-0 mt-2 inline-flex items-center gap-1.5 text-xs font-medium ${
                                  overdue ? "text-red-600" : "text-gray-500"
                                }`}
                              >
                                <FiBell className="h-3.5 w-3.5" />
                                {overdue ? "Overdue · " : "Reminder · "}
                                {formatDate(item.reminder_at)}
                              </p>
                            ) : null}
                            {canEdit ? (
                              <div className="mt-2 flex gap-2">
                                {item.status === "open" ? (
                                  <button
                                    type="button"
                                    onClick={() => markDone(item.note_id)}
                                    className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                  >
                                    Mark done
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteModal({
                                      open: true,
                                      noteId: item.note_id,
                                      loading: false,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-md border border-red-100 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  <FiTrash2 className="h-3 w-3" />
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}

      <ConfirmActionModal
        isOpen={deleteModal.open}
        title="Delete note"
        heading="Delete this note?"
        message="This note and its reminder will be removed. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteModal.loading}
        onCancel={() => {
          if (!deleteModal.loading) {
            setDeleteModal({ open: false, noteId: null, loading: false });
          }
        }}
        onConfirm={confirmDeleteNote}
      />
    </>
  );
}

function TableSkeleton({ canManage, showAssigned }) {
  return (
    <>
      <div className="space-y-2 px-3 py-2 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`m-${i}`}
            className="animate-pulse rounded-lg border border-gray-200 bg-white p-3"
          >
            <div className="mb-3 flex items-center gap-2">
              {canManage ? (
                <div className="h-[18px] w-[18px] rounded bg-gray-200" />
              ) : null}
              <div className="h-7 w-7 rounded-lg bg-gray-200" />
              <div className="h-3 flex-1 rounded bg-gray-200" />
            </div>
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <div className={DESKTOP_MIN_W}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`d-${i}`}
              className="flex animate-pulse items-center border-b border-gray-100 bg-white p-3"
            >
              {canManage ? (
                <div className="flex w-12 flex-shrink-0 justify-center">
                  <div className="h-[18px] w-[18px] rounded bg-gray-200" />
                </div>
              ) : null}
              <div className="w-12 flex-shrink-0 px-2">
                <div className="mx-auto h-3 w-4 rounded bg-gray-200" />
              </div>
              <div className="min-w-[180px] flex-[1.4] px-2">
                <div className="h-3 w-3/4 rounded bg-gray-200" />
                <div className="mt-1.5 h-2 w-1/2 rounded bg-gray-100" />
              </div>
              <div className="min-w-[140px] flex-1 px-2">
                <div className="h-3 w-2/3 rounded bg-gray-200" />
              </div>
              <div className="min-w-[140px] flex-[1.1] px-2">
                <div className="h-3 w-16 rounded bg-gray-200" />
                <div className="mt-1.5 h-2 w-20 rounded bg-gray-100" />
              </div>
              {showAssigned ? (
                <div className="min-w-[140px] flex-1 px-2">
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              ) : null}
              <div className="min-w-[160px] flex-[1.2] px-2">
                <div className="h-3 w-4/5 rounded bg-gray-200" />
              </div>
              <div className="w-16 flex-shrink-0 pr-4">
                <div className="mx-auto h-6 w-6 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const ClientFollowUp = () => {
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  const [canManage, setCanManage] = useState(false);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [filter, setFilter] = useState("mine");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    total_clients: 0,
    unassigned: 0,
    assigned: 0,
    mine: 0,
  });
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const defaultFilterApplied = useRef(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [selected, setSelected] = useState(() => new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);
  const [assignees, setAssignees] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [staffFilter, setStaffFilter] = useState(null);
  const [reminderRange, setReminderRange] = useState({ start: "", end: "" });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState("selected");
  const [assignTargets, setAssignTargets] = useState([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [unassignModal, setUnassignModal] = useState({
    open: false,
    loading: false,
    is_all: false,
    client_usernames: [],
    count: 0,
  });
  const [notesClient, setNotesClient] = useState(null);
  const [paymentReminder, setPaymentReminder] = useState({
    open: false,
    clients: [],
    isAll: false,
  });

  const showAssignedCol = filter !== "unassigned" && filter !== "mine";
  const staffFilterUsername = staffFilter?.value || "";
  const reminderFrom = reminderRange?.start || "";
  const reminderTo = reminderRange?.end || "";
  const assigneeOptions = useMemo(
    () => [
      { value: "", label: "All assignees" },
      ...assignees.map((s) => ({
        value: s.username,
        label: `${s.name || "Unnamed"}${s.type === "admin" ? " (Admin)" : ""}`,
      })),
    ],
    [assignees],
  );
  const selectedCount = selectAllAcrossPages
    ? pagination.total
    : selected.size;
  const effectiveSelected = selectAllAcrossPages
    ? new Set(rows.map((r) => r.client_username))
    : selected;

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (selectAllAcrossPages) {
      setSelectAll(true);
      return;
    }
    setSelectAll(
      rows.length > 0 &&
        rows.every((r) => selected.has(r.client_username)),
    );
  }, [rows, selected, selectAllAcrossPages]);

  const loadAccess = useCallback(async () => {
    const headers = getHeaders();
    if (!headers) {
      setAccessLoaded(true);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/assistance/followup/access`, {
        headers,
      });
      const manage = Boolean(res.data?.data?.canManage);
      const isAdmin = Boolean(res.data?.data?.isAdmin);
      setCanManage(manage);
      // Apply default tab once only — never reset after the user picks a tab.
      if (!defaultFilterApplied.current) {
        defaultFilterApplied.current = true;
        setFilter(isAdmin ? "all" : "mine");
      }
    } catch (_) {
      setCanManage(check("client_followup_manage"));
      if (!defaultFilterApplied.current) {
        defaultFilterApplied.current = true;
        setFilter("mine");
      }
    } finally {
      setAccessLoaded(true);
    }
  }, [check]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectAll(false);
    setSelectAllAcrossPages(false);
  }, []);

  const fetchClients = useCallback(
    async (page = 1, limit = pagination.limit) => {
      const headers = getHeaders();
      if (!headers) {
        toast.error("Please log in again");
        setLoading(false);
        setInitialLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE_URL}/assistance/followup/clients`,
          {
            headers,
            params: {
              page,
              limit,
              search: debouncedSearch || undefined,
              filter: canManage ? filter : "mine",
              staff_username:
                canManage && filter === "assigned" && staffFilterUsername
                  ? staffFilterUsername
                  : undefined,
              reminder_from: reminderFrom || undefined,
              reminder_to: reminderTo || undefined,
            },
          },
        );
        if (!res.data?.success) {
          throw new Error(res.data?.message || "Failed to load");
        }
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
        setPagination({
          page: res.data.pagination?.page || page,
          limit: res.data.pagination?.limit || limit,
          total: res.data.pagination?.total || 0,
          total_pages: res.data.pagination?.total_pages || 1,
        });
        if (res.data.meta?.summary) setSummary(res.data.meta.summary);
        if (typeof res.data.meta?.can_manage === "boolean") {
          setCanManage(res.data.meta.can_manage);
        }
        if (!selectAllAcrossPages) {
          setSelected(new Set());
          setSelectAll(false);
        }
      } catch (err) {
        toast.error(
          err.response?.data?.message || err.message || "Failed to load",
        );
        setRows([]);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [
      debouncedSearch,
      filter,
      staffFilterUsername,
      reminderFrom,
      reminderTo,
      canManage,
      pagination.limit,
      selectAllAcrossPages,
    ],
  );

  const refreshTable = useCallback(() => {
    fetchClients(pagination.page, pagination.limit);
  }, [fetchClients, pagination.page, pagination.limit]);

  const loadAssignees = useCallback(async (search = "") => {
    const headers = getHeaders();
    if (!headers) return;
    setLoadingAssignees(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/assistance/followup/assignees`,
        {
          headers,
          params: { search: search || undefined },
        },
      );
      setAssignees(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (_) {
      setAssignees([]);
    } finally {
      setLoadingAssignees(false);
    }
  }, []);

  useEffect(() => {
    loadAccess();
    // Mount once — do not re-run when `check` identity changes (that was resetting the tab).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!accessLoaded) return;
    clearSelection();
    fetchClients(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accessLoaded,
    debouncedSearch,
    filter,
    staffFilterUsername,
    reminderFrom,
    reminderTo,
  ]);

  useEffect(() => {
    if (!accessLoaded || !canManage || filter !== "assigned") return;
    loadAssignees("");
  }, [accessLoaded, canManage, filter, loadAssignees]);

  useEffect(() => {
    if (filter !== "assigned") setStaffFilter(null);
  }, [filter]);

  const pageSelectAll =
    selectAllAcrossPages ||
    (rows.length > 0 &&
      rows.every((r) => effectiveSelected.has(r.client_username)));
  const pageIndeterminate =
    !selectAllAcrossPages &&
    selected.size > 0 &&
    selected.size < rows.length &&
    !pageSelectAll;

  const toggleSelect = (username) => {
    if (selectAllAcrossPages) {
      const next = new Set(rows.map((r) => r.client_username));
      next.delete(username);
      setSelectAllAcrossPages(false);
      setSelected(next);
      setSelectAll(next.size === rows.length && rows.length > 0);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectAllAcrossPages) {
      clearSelection();
      return;
    }
    if (pageSelectAll) {
      clearSelection();
    } else {
      setSelected(new Set(rows.map((r) => r.client_username)));
      setSelectAll(true);
    }
  };

  const openAssign = (usernames, mode = "selected") => {
    setAssignTargets(usernames);
    setAssignMode(mode);
    setAssignOpen(true);
    loadAssignees("");
  };

  const openBulkAssign = () => {
    if (selectAllAcrossPages) {
      openAssign([], "all");
    } else {
      openAssign([...selected], "selected");
    }
  };

  const handleAssign = async ({ staff_username }) => {
    const headers = getHeaders();
    if (!headers) return;
    setAssignSaving(true);
    try {
      const body =
        assignMode === "all"
          ? {
              is_all: true,
              filter: canManage ? filter : "mine",
              search: debouncedSearch || "",
              scope_staff_username:
                canManage && filter === "assigned" && staffFilterUsername
                  ? staffFilterUsername
                  : undefined,
              reminder_from: reminderFrom || undefined,
              reminder_to: reminderTo || undefined,
              staff_username,
            }
          : {
              client_usernames: assignTargets,
              staff_username,
            };
      const res = await axios.post(
        `${API_BASE_URL}/assistance/followup/assign`,
        body,
        { headers },
      );
      toast.success(res.data?.message || "Assigned");
      setAssignOpen(false);
      setAssignTargets([]);
      clearSelection();
      fetchClients(pagination.page, pagination.limit);
    } catch (err) {
      toast.error(err.response?.data?.message || "Assign failed");
    } finally {
      setAssignSaving(false);
    }
  };

  const openUnassignConfirm = ({
    is_all = false,
    client_usernames = [],
    count,
  }) => {
    const resolvedCount = is_all
      ? count ?? pagination.total
      : count ?? client_usernames.length;
    if (!is_all && !client_usernames.length) return;
    setUnassignModal({
      open: true,
      loading: false,
      is_all,
      client_usernames,
      count: resolvedCount,
    });
  };

  const openBulkUnassign = () => {
    if (selectAllAcrossPages) {
      openUnassignConfirm({ is_all: true, count: pagination.total });
    } else {
      openUnassignConfirm({
        client_usernames: [...selected],
        count: selected.size,
      });
    }
  };

  const handleUnassign = async () => {
    const headers = getHeaders();
    if (!headers) return;
    setUnassignModal((m) => ({ ...m, loading: true }));
    try {
      const body = unassignModal.is_all
        ? {
            is_all: true,
            filter: canManage ? filter : "mine",
            search: debouncedSearch || "",
            scope_staff_username:
              canManage && filter === "assigned" && staffFilterUsername
                ? staffFilterUsername
                : undefined,
            reminder_from: reminderFrom || undefined,
            reminder_to: reminderTo || undefined,
          }
        : { client_usernames: unassignModal.client_usernames };
      await axios.post(
        `${API_BASE_URL}/assistance/followup/unassign`,
        body,
        { headers },
      );
      toast.success("Unassigned");
      setUnassignModal({
        open: false,
        loading: false,
        is_all: false,
        client_usernames: [],
        count: 0,
      });
      setAssignOpen(false);
      setAssignTargets([]);
      clearSelection();
      fetchClients(pagination.page, pagination.limit);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unassign failed");
      setUnassignModal((m) => ({ ...m, loading: false }));
    }
  };

  const requestUnassignFromAssignModal = () => {
    if (assignMode === "all") {
      openUnassignConfirm({ is_all: true, count: pagination.total });
    } else {
      openUnassignConfirm({
        client_usernames: assignTargets,
        count: assignTargets.length,
      });
    }
  };

  const openPaymentReminder = (row) => {
    setPaymentReminder({
      open: true,
      clients: [
        {
          username: row.client_username || row.username,
          name: row.client_name || row.name,
          mobile: row.mobile,
          country_code: row.country_code,
          balance: row.balance,
        },
      ],
      isAll: false,
    });
  };

  const openBulkPaymentReminder = () => {
    if (selectAllAcrossPages && filter === "all") {
      setPaymentReminder({ open: true, clients: [], isAll: true });
      return;
    }
    const source = selectAllAcrossPages
      ? rows
      : rows.filter((r) => selected.has(r.client_username));
    const clients = source
      .filter((r) => Number(r.balance) > 0)
      .map((r) => ({
        username: r.client_username,
        name: r.client_name,
        mobile: r.mobile,
        country_code: r.country_code,
        balance: r.balance,
      }));
    if (!clients.length) {
      toast.error("No debtors in selection");
      return;
    }
    setPaymentReminder({ open: true, clients, isAll: false });
  };

  const filterTabs = canManage
    ? FILTERS_MANAGE
    : [{ id: "mine", label: "My clients" }];

  const tabCountLabel = (tabId) => {
    if (tabId === "unassigned") return summary.unassigned;
    if (tabId === "assigned") return summary.assigned;
    if (tabId === "mine") return summary.mine;
    return null;
  };

  const getRowActions = (row) =>
    [
      {
        label: "Notes",
        icon: FiFileText,
        onClick: () => setNotesClient(row),
      },
      canManage
        ? {
            label: "Assign",
            icon: FiEdit2,
            onClick: () => openAssign([row.client_username], "selected"),
          }
        : null,
      canManage && row.staff_username
        ? {
            label: "Unassign",
            icon: FiUserX,
            danger: true,
            onClick: () =>
              openUnassignConfirm({
                client_usernames: [row.client_username],
                count: 1,
              }),
          }
        : null,
      Number(row.balance) > 0
        ? {
            label: "Payment reminder",
            icon: FiBell,
            onClick: () => openPaymentReminder(row),
          }
        : null,
    ].filter(Boolean);

  const assignClientCount =
    assignMode === "all" ? pagination.total : assignTargets.length;

  const assignModalCanUnassign =
    canManage &&
    (filter === "assigned" ||
      assignMode === "all" ||
      assignTargets.some((username) =>
        rows.some(
          (r) => r.client_username === username && r.staff_username,
        ),
      ));

  const renderAssignedCell = (row) => {
    if (row.staff_username) {
      const phone = formatStaffPhone(row);
      return (
        <>
          <p className="m-0 truncate text-sm font-medium text-gray-700">
            {row.staff_name || "Staff"}
          </p>
          {phone ? (
            <p className="m-0 truncate text-xs text-gray-500">{phone}</p>
          ) : null}
        </>
      );
    }
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        Unassigned
      </span>
    );
  };

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
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset(
          isMinimized,
        )}`}
      >
        <div className="mx-2 my-3 flex h-full flex-col sm:mx-4 md:mx-8 md:my-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="m-0 text-base font-bold text-gray-800 md:text-lg">
                Debtor Follow-up
              </h1>
            </div>
            <button
              type="button"
              onClick={() => fetchClients(pagination.page, pagination.limit)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <FiRefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {initialLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`sum-sk-${i}`}
                  className="flex animate-pulse items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm"
                >
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-200" />
                  <div className="min-w-0 flex-1">
                    <div className="h-2.5 w-16 rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-10 rounded bg-gray-200" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <FiUsers className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      {canManage ? "Debtors" : "Assigned to me"}
                    </p>
                    <p className="m-0 mt-0.5 text-base font-bold text-gray-800">
                      {summary.total_clients}
                    </p>
                  </div>
                </div>
                {canManage ? (
                  <>
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <FiAlertCircle className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                          Unassigned
                        </p>
                        <p className="m-0 mt-0.5 text-base font-bold text-amber-700">
                          {summary.unassigned}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                        <FiUserCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                          Assigned
                        </p>
                        <p className="m-0 mt-0.5 text-base font-bold text-green-700">
                          {summary.assigned}
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-3 md:px-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {filterTabs.map((tab) => {
                    const count = tabCountLabel(tab.id);
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFilter(tab.id)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          filter === tab.id
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        }`}
                      >
                        {tab.label}
                        {count != null ? ` (${count})` : ""}
                      </button>
                    );
                  })}
                </div>

                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:justify-end">
                  <div className="relative min-w-[180px] max-w-xs flex-1 basis-[180px]">
                    <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search debtors…"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  {canManage && filter === "assigned" ? (
                    <div className={SELECT_CONTROL}>
                      <CustomSelect
                        value={
                          staffFilter ||
                          assigneeOptions[0] || {
                            value: "",
                            label: "All assignees",
                          }
                        }
                        onChange={(opt) =>
                          setStaffFilter(
                            !opt || opt.value === ""
                              ? null
                              : opt,
                          )
                        }
                        options={assigneeOptions}
                        isSearchable
                        isClearable
                        placeholder="All assignees"
                      />
                    </div>
                  ) : null}
                  <div className="flex w-full min-w-[12rem] max-w-xs flex-1 basis-[14rem] items-center gap-1 sm:w-56 sm:flex-none sm:max-w-none">
                    <DateRangePickerField
                      value={reminderRange}
                      onChange={(range) =>
                        setReminderRange({
                          start: range?.start || "",
                          end: range?.end || "",
                        })
                      }
                      placeholder="Reminder date range"
                      mode="range"
                      initialTab="quick"
                      quickOptionKeys={["tw", "lw", "lm", "tm", "lf", "fy"]}
                      showRangeHint={false}
                      showResetButton
                      truncateRangeLabel={false}
                      buttonClassName={DATE_RANGE_BTN}
                      wrapperClassName="w-full"
                    />
                    {reminderFrom || reminderTo ? (
                      <button
                        type="button"
                        onClick={() =>
                          setReminderRange({ start: "", end: "" })
                        }
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        title="Clear reminder range"
                        aria-label="Clear reminder range"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {canManage ? (
              <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2 md:hidden">
                <div className="flex items-center gap-2">
                  <AnimatedCheckbox
                    checked={pageSelectAll}
                    indeterminate={pageIndeterminate}
                    onChange={handleSelectAll}
                    ariaLabel="Select all"
                  />
                  <span className="text-sm font-semibold text-gray-800">
                    Debtors
                  </span>
                </div>
                <span className="text-xs text-gray-600">
                  {rows.length} shown
                </span>
              </div>
            ) : null}

            {canManage &&
            selectAll &&
            pagination.total > rows.length &&
            rows.length > 0 ? (
              <div className="border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs text-indigo-800">
                {selectAllAcrossPages ? (
                  <>
                    All {pagination.total.toLocaleString()} clients are
                    selected.{" "}
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="font-semibold underline hover:text-indigo-950"
                    >
                      Clear selection
                    </button>
                  </>
                ) : (
                  <>
                    All {rows.length} clients on this page are selected.{" "}
                    <button
                      type="button"
                      onClick={() => setSelectAllAcrossPages(true)}
                      className="font-semibold underline hover:text-indigo-950"
                    >
                      Select all {pagination.total.toLocaleString()} clients
                    </button>
                  </>
                )}
              </div>
            ) : null}

            <div className="flex-1 min-h-0 overflow-auto">
              {!accessLoaded || loading ? (
                <TableSkeleton
                  canManage={canManage}
                  showAssigned={showAssignedCol}
                />
              ) : rows.length === 0 ? (
                <div className="flex items-center justify-center px-4 py-12 text-gray-500">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <FiUsers className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      No debtor clients found
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Only clients with a positive balance are listed.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2 px-3 py-2 md:hidden">
                    {rows.map((row, index) => (
                      <motion.div
                        key={row.client_username}
                        className={`overflow-hidden rounded-lg border border-gray-200 bg-white ${
                          effectiveSelected.has(row.client_username)
                            ? "ring-2 ring-indigo-500"
                            : ""
                        }`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-start justify-between gap-2 p-3">
                          <div className="flex min-w-0 items-start gap-2">
                            {canManage ? (
                              <AnimatedCheckbox
                                checked={effectiveSelected.has(
                                  row.client_username,
                                )}
                                onChange={() =>
                                  toggleSelect(row.client_username)
                                }
                                ariaLabel={`Select ${row.client_name}`}
                              />
                            ) : null}
                            <span className="w-4 text-sm font-bold text-gray-800">
                              {(pagination.page - 1) * pagination.limit +
                                index +
                                1}
                            </span>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
                              <FiUser className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/client/profile/${encodeURIComponent(
                                  row.client_username,
                                )}`}
                                className="m-0 block truncate text-sm font-semibold text-gray-800 no-underline hover:text-indigo-600"
                              >
                                {row.client_name || "N/A"}
                              </Link>
                              {row.guardian_name ? (
                                <p className="m-0 truncate text-xs text-gray-500">
                                  {row.guardian_name}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <EmailActionMenu items={getRowActions(row)} />
                        </div>
                        <div className="space-y-1.5 border-t border-gray-100 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-gray-700">
                              <FiPhone className="h-3 w-3 text-gray-400" />
                              {formatPhone(row)}
                              <ClickToCallButton
                                phoneNumber={row.mobile}
                                countryCode={row.country_code}
                                displayName={row.client_name}
                                className="h-6 w-6"
                              />
                            </span>
                            <div className="flex items-center gap-1">
                              <Link
                                to={`/client/profile/${encodeURIComponent(
                                  row.client_username,
                                )}/ledger`}
                                className="font-semibold text-indigo-700 no-underline hover:opacity-80"
                              >
                                {formatBalance(row.balance)}
                              </Link>
                              {Number(row.balance) > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => openPaymentReminder(row)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm shadow-violet-200 transition hover:brightness-110"
                                  title="Send payment reminder"
                                  aria-label={`Send payment reminder to ${row.client_name}`}
                                >
                                  <FiBell className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <p className="m-0 text-xs text-gray-500">
                            {row.last_transaction?.date
                              ? `${formatDate(row.last_transaction.date)} · ${
                                  row.last_transaction.period || ""
                                }`
                              : "No payment"}
                          </p>
                          {showAssignedCol ? (
                            <div className="text-xs text-gray-500">
                              {renderAssignedCell(row)}
                            </div>
                          ) : null}
                          <NotesChip
                            row={row}
                            onClick={() => setNotesClient(row)}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className={`hidden md:block ${DESKTOP_MIN_W}`}>
                    <div className="sticky top-0 z-10 flex items-center border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                      {canManage ? (
                        <div className="flex w-12 flex-shrink-0 justify-center p-3">
                          <AnimatedCheckbox
                            checked={pageSelectAll}
                            indeterminate={pageIndeterminate}
                            onChange={handleSelectAll}
                            ariaLabel="Select all"
                          />
                        </div>
                      ) : null}
                      <div className="w-12 flex-shrink-0 border-l border-gray-100 p-3 text-center text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        #
                      </div>
                      <div className="min-w-[180px] flex-[1.4] border-l border-gray-100 p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Client
                      </div>
                      <div className="min-w-[140px] flex-1 border-l border-gray-100 p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Contact
                      </div>
                      <div className="min-w-[140px] flex-[1.1] border-l border-gray-100 p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Balance
                      </div>
                      {showAssignedCol ? (
                        <div className="min-w-[140px] flex-1 border-l border-gray-100 p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                          Assigned to
                        </div>
                      ) : null}
                      <div className="min-w-[160px] flex-[1.2] border-l border-gray-100 p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Notes
                      </div>
                      <div className="w-16 flex-shrink-0 border-l border-gray-100 py-3 pl-3 pr-4 text-center text-[11px] font-bold uppercase tracking-wide text-gray-700">
                        Action
                      </div>
                    </div>

                    {rows.map((row, index) => (
                      <motion.div
                        key={row.client_username}
                        className={`group flex items-center border-b border-gray-100 bg-white transition-colors hover:bg-gray-50 ${
                          effectiveSelected.has(row.client_username)
                            ? "bg-indigo-50/30"
                            : ""
                        }`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        {canManage ? (
                          <div className="flex w-12 flex-shrink-0 justify-center p-3">
                            <AnimatedCheckbox
                              checked={effectiveSelected.has(
                                row.client_username,
                              )}
                              onChange={() =>
                                toggleSelect(row.client_username)
                              }
                              ariaLabel={`Select ${row.client_name}`}
                            />
                          </div>
                        ) : null}
                        <div className="w-12 flex-shrink-0 border-l border-gray-100 p-3 text-center">
                          <span className="text-[11px] font-bold text-gray-800">
                            {(pagination.page - 1) * pagination.limit +
                              index +
                              1}
                          </span>
                        </div>
                        <div className="min-w-[180px] flex-[1.4] border-l border-gray-100 p-3 text-left">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm">
                              <FiUser className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/client/profile/${encodeURIComponent(
                                  row.client_username,
                                )}`}
                                className="m-0 block truncate text-sm font-semibold text-gray-800 no-underline hover:text-indigo-600"
                              >
                                {row.client_name || "N/A"}
                              </Link>
                              {row.guardian_name ? (
                                <p className="m-0 truncate text-xs leading-tight text-gray-500">
                                  {row.guardian_name}
                                </p>
                              ) : null}
                              {row.pan_number ? (
                                <p className="m-0 truncate font-mono text-xs leading-tight text-gray-400">
                                  PAN: {row.pan_number}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="min-w-[140px] flex-1 border-l border-gray-100 p-3 text-left">
                          <p className="m-0 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
                            {formatPhone(row)}
                            <ClickToCallButton
                              phoneNumber={row.mobile}
                              countryCode={row.country_code}
                              displayName={row.client_name}
                            />
                          </p>
                          {row.email ? (
                            <p className="m-0 mt-0.5 truncate text-xs text-gray-400">
                              {row.email}
                            </p>
                          ) : null}
                        </div>
                        <div className="min-w-[140px] flex-[1.1] border-l border-gray-100 p-3 text-left">
                          <div className="flex items-center gap-1">
                            <Link
                              to={`/client/profile/${encodeURIComponent(
                                row.client_username,
                              )}/ledger`}
                              className="text-sm font-semibold text-indigo-700 no-underline hover:opacity-80"
                              title="View ledger"
                            >
                              {formatBalance(row.balance)}
                            </Link>
                            {Number(row.balance) > 0 ? (
                              <button
                                type="button"
                                onClick={() => openPaymentReminder(row)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm shadow-violet-200 transition hover:brightness-110"
                                title="Send payment reminder"
                                aria-label={`Send payment reminder to ${row.client_name}`}
                              >
                                <FiBell className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500">
                            {row.last_transaction?.date
                              ? formatDate(row.last_transaction.date)
                              : "N/A"}
                          </div>
                          <div className="text-xs text-gray-400">
                            {row.last_transaction?.period || "No payment"}
                          </div>
                        </div>
                        {showAssignedCol ? (
                          <div className="min-w-[140px] flex-1 border-l border-gray-100 p-3 text-left">
                            {renderAssignedCell(row)}
                          </div>
                        ) : null}
                        <div className="min-w-[160px] flex-[1.2] border-l border-gray-100 p-3 text-left">
                          <NotesChip
                            row={row}
                            onClick={() => setNotesClient(row)}
                          />
                        </div>
                        <div className="flex w-16 flex-shrink-0 justify-center border-l border-gray-100 py-3 pl-3 pr-4">
                          <EmailActionMenu items={getRowActions(row)} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <TablePagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.total_pages}
              onPageChange={(page) => fetchClients(page, pagination.limit)}
              onLimitChange={(limit) => {
                setPagination((p) => ({ ...p, limit }));
                fetchClients(1, limit);
              }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {canManage && selectedCount > 0 ? (
          <motion.div
            className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
              <span className="px-2 text-xs font-semibold text-gray-600">
                {selectedCount.toLocaleString()} selected
              </span>
              <button
                type="button"
                onClick={openBulkAssign}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <FiUserCheck className="h-4 w-4" />
                Assign
              </button>
              <button
                type="button"
                onClick={openBulkUnassign}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Unassign
              </button>
              <button
                type="button"
                onClick={openBulkPaymentReminder}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
              >
                <FiBell className="h-4 w-4" />
                Remind
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AssignModal
        open={assignOpen}
        clientCount={assignClientCount}
        assignees={assignees}
        loadingAssignees={loadingAssignees}
        saving={assignSaving}
        showUnassign={assignModalCanUnassign}
        unassigning={unassignModal.open && unassignModal.loading}
        onClose={() => {
          if (!assignSaving && !unassignModal.loading) {
            setAssignOpen(false);
            setAssignTargets([]);
          }
        }}
        onSubmit={handleAssign}
        onUnassign={requestUnassignFromAssignModal}
        onSearchAssignees={loadAssignees}
      />

      <NotesModal
        open={Boolean(notesClient)}
        client={notesClient}
        onClose={() => setNotesClient(null)}
        onChanged={refreshTable}
        canEdit
      />

      <ClientPaymentReminderModal
        isOpen={paymentReminder.open}
        onClose={() =>
          setPaymentReminder({ open: false, clients: [], isAll: false })
        }
        onSuccess={() => {
          setPaymentReminder({ open: false, clients: [], isAll: false });
          refreshTable();
        }}
        clients={paymentReminder.clients}
        isAll={paymentReminder.isAll}
      />

      <ConfirmActionModal
        isOpen={unassignModal.open}
        title="Unassign clients"
        heading="Clear assignments?"
        message={`Remove follow-up staff from ${Number(
          unassignModal.count || 0,
        ).toLocaleString()} selected client${
          unassignModal.count === 1 ? "" : "s"
        }. They will appear under Unassigned.`}
        confirmLabel="Unassign"
        cancelLabel="Cancel"
        tone="danger"
        loading={unassignModal.loading}
        onCancel={() => {
          if (!unassignModal.loading) {
            setUnassignModal({
              open: false,
              loading: false,
              is_all: false,
              client_usernames: [],
              count: 0,
            });
          }
        }}
        onConfirm={handleUnassign}
      />
    </div>
  );
};

export default ClientFollowUp;
