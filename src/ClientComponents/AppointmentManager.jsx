import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertCircle, FiCalendar, FiCheck, FiEdit2, FiFilter, FiMail, FiMoreVertical, FiPhone, FiPlus, FiRefreshCw, FiSettings, FiTrash2, FiUser, FiX } from "react-icons/fi";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import axios from "axios";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import Modal from "../components/common/Modal";
import ConfirmActionModal from "../components/ConfirmActionModal";
import { DatePickerField } from "../components/PortalDatePicker";
import TablePagination from "../components/TablePagination";
import AppointmentTimePicker from "./AppointmentTimePicker";

const emptyDraft = () => ({
  client_username: "",
  client_name: "",
  client_mobile: "",
  client_country_code: "",
  client_email: "",
  notes: "",
  start_at: "",
  end_at: "",
  attendee_usernames: [],
});

function localInputValue(value) {
  if (!value) return "";
  const date = new Date(`${String(value).replace(" ", "T").replace(/Z$/, "")}Z`);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function localApiValue(value) {
  return value ? new Date(value).toISOString() : "";
}

function displayDate(value, timezone) {
  if (!value) return "Time not set";
  const date = new Date(`${String(value).replace(" ", "T").replace(/Z$/, "")}Z`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(date);
}

const AppointmentManager = ({ clientUsername, clientName, mine = false }) => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 0 });
  const [attendees, setAttendees] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [incomingOnly, setIncomingOnly] = useState(mine);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftFromDate, setDraftFromDate] = useState("");
  const [draftToDate, setDraftToDate] = useState("");
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: undefined, bottom: undefined, right: 0, openUpward: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      const [appointmentResponse, attendeesResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/appointments`, {
          headers,
          params: {
            mine: incomingOnly ? "true" : "false",
            client_username: clientUsername || undefined,
            page,
            limit: 50,
            search: search.trim() || undefined,
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
          },
        }),
        axios.get(`${API_BASE_URL}/appointments/attendees`, { headers }),
      ]);
      setAppointments(appointmentResponse.data?.data || []);
      setPagination(appointmentResponse.data?.pagination || { page, limit: 50, total: 0, total_pages: 0 });
      setAttendees(attendeesResponse.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load appointments");
    } finally {
      setLoading(false);
    }
  }, [clientUsername, fromDate, incomingOnly, page, search, toDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".appointment-dropdown-container")) setActiveActionMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;
    axios.get(`${API_BASE_URL}/appointments/google-calendar`, { headers: getHeaders() })
      .then((response) => {
        if (active) setCalendarStatus(response.data?.data || { configured: false });
      })
      .catch((error) => {
        if (active) toast.error(error.response?.data?.message || "Unable to load Google Calendar status");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!modalOpen) {
      setClients([]);
      return undefined;
    }
    const searchTerm = clientUsername || clientSearch.trim();
    if (searchTerm.length < 2) {
      setClients([]);
      return undefined;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/appointments/clients`, {
          headers: getHeaders(),
          params: { search: searchTerm },
        });
        if (!active) return;
        const results = response.data?.data || [];
        if (clientUsername) {
          const selectedClient = results.find((client) => client.username === clientUsername);
          if (selectedClient) {
            setDraft((current) => ({
              ...current,
              client_name: selectedClient.name || current.client_name,
              client_mobile: selectedClient.mobile || "",
              client_country_code: selectedClient.country_code || "",
              client_email: selectedClient.email || "",
            }));
          }
          setClients([]);
        } else {
          setClients(results);
        }
      } catch (error) {
        if (active) toast.error(error.response?.data?.message || "Unable to search clients");
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [clientSearch, clientUsername, modalOpen]);

  const openCreate = () => {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    setEditingId("");
    setDraft({
      ...emptyDraft(),
      client_username: clientUsername || "",
      client_name: clientName || "",
      start_at: localInputValue(start.toISOString()),
      end_at: localInputValue(end.toISOString()),
    });
    setClientSearch("");
    setModalOpen(true);
  };

  const openEdit = (appointment) => {
    setEditingId(appointment.appointment_id);
    setDraft({
      client_username: appointment.client_username,
      client_name: appointment.client_name,
      client_mobile: appointment.client_mobile || "",
      client_country_code: appointment.client_country_code || "",
      client_email: appointment.client_email || "",
      notes: appointment.notes || "",
      start_at: localInputValue(appointment.start_at),
      end_at: localInputValue(appointment.end_at),
      attendee_usernames: (appointment.attendees || []).map((attendee) => attendee.attendee_username),
    });
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!draft.client_username || !draft.start_at || !draft.end_at || !draft.attendee_usernames.length) {
      toast.error("Select a client, time, and at least one attendee");
      return;
    }
    if (new Date(draft.start_at) >= new Date(draft.end_at)) {
      toast.error("End time must be after start time");
      return;
    }
    setSaving(true);
    try {
      const headers = getHeaders();
      const body = {
        client_username: draft.client_username,
        notes: draft.notes,
        start_at: localApiValue(draft.start_at),
        end_at: localApiValue(draft.end_at),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        attendee_usernames: draft.attendee_usernames,
      };
      const response = editingId
        ? await axios.put(`${API_BASE_URL}/appointments/${encodeURIComponent(editingId)}`, body, { headers })
        : await axios.post(`${API_BASE_URL}/appointments`, body, { headers });
      if (response.data?.calendar?.status !== "synced") {
        toast.error(response.data?.calendar?.error || "Appointment saved, but Google Calendar invitation is not synced");
      } else {
        toast.success(editingId ? "Appointment updated" : "Appointment created and invitations sent");
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save appointment");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (appointment) => {
    setCancelTarget(appointment);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const response = await axios.delete(`${API_BASE_URL}/appointments/${encodeURIComponent(cancelTarget.appointment_id)}`, { headers: getHeaders() });
      if (response.data?.calendar?.status !== "cancelled") {
        toast.error(response.data?.calendar?.error || "Appointment cancelled, but Google Calendar cancellation is pending");
      } else {
        toast.success("Appointment cancelled");
      }
      setCancelTarget(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to cancel appointment");
    } finally {
      setCancelling(false);
    }
  };

  const retrySync = async (appointment) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/appointments/${encodeURIComponent(appointment.appointment_id)}/sync`, {}, { headers: getHeaders() });
      if (response.data?.calendar?.status === "synced" || response.data?.calendar?.status === "cancelled") {
        toast.success("Calendar synchronization completed");
      } else {
        toast.error(response.data?.calendar?.error || "Calendar synchronization is still pending");
      }
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to retry calendar synchronization");
    }
  };

  const toggleAttendee = (username) => {
    setDraft((current) => ({
      ...current,
      attendee_usernames: current.attendee_usernames.includes(username)
        ? current.attendee_usernames.filter((value) => value !== username)
        : [...current.attendee_usernames, username],
    }));
  };

  const updateDraftDate = (field, value) => {
    setDraft((current) => {
      const [, time = "09:00"] = current[field].split("T");
      return { ...current, [field]: value ? `${value}T${time}` : "" };
    });
  };

  const updateDraftTime = (field, value) => {
    setDraft((current) => {
      const [date = "", time = ""] = current[field].split("T");
      return { ...current, [field]: date ? `${date}T${value || time}` : "" };
    });
  };

  const openFilters = () => {
    setDraftFromDate(fromDate);
    setDraftToDate(toDate);
    setFilterModalOpen(true);
  };

  const applyFilters = () => {
    if (draftFromDate && draftToDate && draftFromDate > draftToDate) {
      toast.error("The start date must be on or before the end date");
      return;
    }
    setPage(1);
    setFromDate(draftFromDate);
    setToDate(draftToDate);
    setFilterModalOpen(false);
  };

  const toggleActionMenu = (appointment, event) => {
    if (activeActionMenu === appointment.appointment_id) {
      setActiveActionMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const hasRetry = appointment.calendar_sync_status === "failed" || appointment.calendar_sync_status === "pending";
    const estimatedHeight = hasRetry ? 144 : 104;
    const openUpward = window.innerHeight - rect.bottom < estimatedHeight + 8;
    setActionMenuPosition({
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      right: window.innerWidth - rect.right,
      openUpward,
    });
    setActiveActionMenu(appointment.appointment_id);
  };

  const runAppointmentAction = (action, appointment) => {
    setActiveActionMenu(null);
    action(appointment);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-indigo-600" />
          <h2 className="font-semibold text-slate-900">{clientUsername ? "Client appointments" : "Appointments"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {!clientUsername ? (
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Appointment view">
              {[
                { label: "All appointments", value: false },
                { label: "For me", value: true },
              ].map((tab) => {
                const active = incomingOnly === tab.value;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setPage(1);
                      setIncomingOnly(tab.value);
                    }}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <button type="button" onClick={load} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Refresh appointments">
            <FiRefreshCw />
          </button>
          <button type="button" onClick={() => { window.location.assign("/settings/google-calendar"); }} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Google Calendar settings" title="Google Calendar settings">
            <FiSettings />
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <FiPlus /> Schedule appointment
          </button>
        </div>
      </div>

        {calendarStatus ? (
          <div className={`flex items-start gap-2 border-b px-4 py-3 text-sm ${calendarStatus.configured ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-100 bg-amber-50 text-amber-800"}`}>
            <FiAlertCircle className="mt-0.5 shrink-0" />
            <span>{calendarStatus.configured ? "Google Calendar is connected. Appointment invitations will sync to the company calendar." : "Google Calendar is not connected. Appointment invitations will not sync until it is configured."}</span>
          </div>
        ) : null}

        <div className="flex gap-2 border-b border-slate-100 p-4">
          <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search client or attendee" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" aria-label="Search appointments" />
          <button type="button" onClick={openFilters} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${fromDate || toDate ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`} aria-label="Filter appointments">
            <FiFilter /> <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

      {loading ? (
        <div className="overflow-x-auto" aria-busy="true" aria-label="Loading appointments">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="border-b border-slate-200 px-4 py-3 font-semibold">#</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 font-semibold">Client Details</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 font-semibold">Date &amp; time</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 font-semibold">Attendees</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 font-semibold">Notes</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 font-semibold">Google Calendar</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }, (_, index) => (
                <tr key={`appointment-skeleton-${index}`}>
                  <td className="border-b border-slate-100 px-4 py-5"><div className="h-4 w-5 animate-pulse rounded bg-slate-200" /></td>
                  <td className="border-b border-l border-slate-100 px-4 py-5">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="border-b border-l border-slate-100 px-4 py-5"><div className="h-4 w-36 animate-pulse rounded bg-slate-200" /><div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" /></td>
                  <td className="border-b border-l border-slate-100 px-4 py-5"><div className="h-4 w-36 animate-pulse rounded bg-slate-200" /></td>
                  <td className="border-b border-l border-slate-100 px-4 py-5"><div className="h-4 w-28 animate-pulse rounded bg-slate-100" /></td>
                  <td className="border-b border-l border-slate-100 px-4 py-5"><div className="h-4 w-16 animate-pulse rounded bg-slate-200" /></td>
                  <td className="border-b border-l border-slate-100 px-4 py-5"><div className="ml-auto h-9 w-9 animate-pulse rounded-lg bg-slate-100" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">No upcoming appointments found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="border-b border-slate-200 px-4 py-3 font-semibold">#</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 font-semibold">Client Details</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 font-semibold">Date &amp; time</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 font-semibold">Attendees</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 font-semibold">Notes</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 font-semibold">Google Calendar</th>
                <th scope="col" className="border-b border-l border-slate-200 px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment, index) => (
                <tr key={appointment.appointment_id} className="align-middle hover:bg-slate-50/70">
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-500">{(page - 1) * (pagination.limit || 50) + index + 1}</td>
                  <td className="border-b border-l border-slate-100 px-4 py-3">
                    <div className="flex w-full items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
                        <FiUser className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/client/profile/${encodeURIComponent(appointment.client_username)}/basic-details`)}
                          className="block text-left font-semibold text-slate-900 hover:text-indigo-700"
                          aria-label={`Open ${appointment.client_name}'s client profile`}
                        >
                          {appointment.client_name}
                        </button>
                        {appointment.client_mobile ? (
                          <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                            <FiPhone className="shrink-0 text-slate-400" />
                            {appointment.client_mobile}
                          </span>
                        ) : null}
                        {appointment.client_email ? (
                          <span className="mt-1 flex items-start gap-1.5 break-all text-xs text-slate-600">
                            <FiMail className="mt-0.5 shrink-0 text-slate-400" />
                            {appointment.client_email}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap border-b border-l border-slate-100 px-4 py-3 text-slate-600">
                    <div>{displayDate(appointment.start_at, appointment.timezone)}</div>
                    <div className="mt-1 text-xs text-slate-500">to {displayDate(appointment.end_at, appointment.timezone)}</div>
                  </td>
                  <td className="max-w-56 border-b border-l border-slate-100 px-4 py-3 text-slate-600">
                    {(appointment.attendees || []).map((item) => item.attendee_name).join(", ") || "None"}
                  </td>
                  <td className="max-w-64 whitespace-pre-wrap break-words border-b border-l border-slate-100 px-4 py-3 text-slate-600">{appointment.notes || "—"}</td>
                  <td className="border-b border-l border-slate-100 px-4 py-3">
                    <div className={`font-medium ${appointment.calendar_sync_status === "synced" ? "text-emerald-700" : "text-amber-700"}`}>
                      {appointment.calendar_sync_status || "Unknown"}
                    </div>
                    {appointment.calendar_sync_error ? <p className="mt-1 max-w-56 text-xs text-amber-700">{appointment.calendar_sync_error}</p> : null}
                  </td>
                  <td className="border-b border-l border-slate-100 px-4 py-3">
                    <div className="appointment-dropdown-container flex justify-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleActionMenu(appointment, event);
                        }}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${activeActionMenu === appointment.appointment_id ? "border-slate-300 bg-slate-200" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                        aria-label={`Actions for appointment with ${appointment.client_name}`}
                        aria-haspopup="menu"
                        aria-expanded={activeActionMenu === appointment.appointment_id}
                      >
                        <FiMoreVertical />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && pagination.total > 0 ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <TablePagination
            page={page}
            limit={pagination.limit || 50}
            total={pagination.total}
            totalPages={pagination.total_pages || 1}
            showRows={false}
            showJump={false}
            showFirstLast={false}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      {activeActionMenu && typeof document !== "undefined" ? createPortal(
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: actionMenuPosition.openUpward ? 6 : -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          role="menu"
          className="appointment-dropdown-container fixed overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl"
          style={{
            top: actionMenuPosition.top,
            bottom: actionMenuPosition.bottom,
            right: actionMenuPosition.right,
            width: 192,
            zIndex: 9999,
          }}
        >
          {(() => {
            const appointment = appointments.find((item) => item.appointment_id === activeActionMenu);
            if (!appointment) return null;
            const itemClass = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50";
            return (
              <>
                {appointment.calendar_sync_status === "failed" || appointment.calendar_sync_status === "pending" ? (
                  <button type="button" role="menuitem" onClick={() => runAppointmentAction(retrySync, appointment)} className={`${itemClass} text-amber-700`}>
                    <FiRefreshCw className="h-4 w-4" /> Retry calendar
                  </button>
                ) : null}
                <button type="button" role="menuitem" onClick={() => runAppointmentAction(openEdit, appointment)} className={itemClass}>
                  <FiEdit2 className="h-4 w-4 text-indigo-600" /> Edit appointment
                </button>
                <button type="button" role="menuitem" onClick={() => runAppointmentAction(cancel, appointment)} className={`${itemClass} border-t border-slate-100 text-rose-600`}>
                  <FiTrash2 className="h-4 w-4" /> Cancel appointment
                </button>
              </>
            );
          })()}
        </motion.div>,
        document.body,
      ) : null}

      {filterModalOpen ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterModalOpen(false); }}>
          <section className="w-full max-w-md rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="appointment-filters-title">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="appointment-filters-title" className="font-semibold text-slate-900">Filter appointments</h2>
              <button type="button" onClick={() => setFilterModalOpen(false)} aria-label="Close filters" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><FiX /></button>
            </div>
            <div className="grid gap-4 p-5">
              <div className="grid gap-1 text-sm font-medium text-slate-700">
                <span>From date</span>
                <DatePickerField value={draftFromDate} onChange={setDraftFromDate} placeholder="Any date" wrapperClassName="w-full" buttonClassName="w-full rounded-lg border border-slate-300 px-3 py-2 text-left font-normal text-slate-700" />
              </div>
              <div className="grid gap-1 text-sm font-medium text-slate-700">
                <span>To date</span>
                <DatePickerField value={draftToDate} onChange={setDraftToDate} placeholder="Any date" wrapperClassName="w-full" buttonClassName="w-full rounded-lg border border-slate-300 px-3 py-2 text-left font-normal text-slate-700" />
              </div>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => { setDraftFromDate(""); setDraftToDate(""); }} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Clear dates</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setFilterModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">Cancel</button>
                <button type="button" onClick={applyFilters} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Apply filters</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId ? "Edit appointment" : "Schedule appointment"}
        subtitle="Manage the appointment details and invitations."
        size="2xl"
        centered
        bodyClassName="p-5"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-white disabled:opacity-60">Close</button>
            <button type="submit" form="appointment-form" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"><FiCheck />{saving ? "Saving…" : editingId ? "Save changes" : "Schedule appointment"}</button>
          </div>
        }
      >
        <form id="appointment-form" onSubmit={save} className="grid gap-4">
              <div className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Client</span>
                {(clientUsername || draft.client_username) ? (
                  <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 shadow-sm">
                      <FiUser className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">{draft.client_name || clientName || "Client"}</div>
                      {draft.client_mobile ? (
                        <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-600">
                          <FiPhone className="shrink-0 text-slate-400" />
                          <span>{[draft.client_country_code, draft.client_mobile].filter(Boolean).join(" ")}</span>
                        </div>
                      ) : null}
                      {draft.client_email ? (
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-slate-600">
                          <FiMail className="shrink-0 text-slate-400" />
                          <span className="truncate">{draft.client_email}</span>
                        </div>
                      ) : null}
                    </div>
                    {!clientUsername ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((current) => ({ ...current, client_username: "", client_name: "", client_mobile: "", client_country_code: "", client_email: "" }));
                          setClientSearch("");
                        }}
                        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                      >
                        Change
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      value={clientSearch}
                      onChange={(event) => setClientSearch(event.target.value)}
                      placeholder="Search by client name, mobile, or email"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      required
                    />
                    {clients.length ? (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                        {clients.map((client) => (
                          <button
                            type="button"
                            key={client.username}
                            onClick={() => {
                              setDraft((current) => ({
                                ...current,
                                client_username: client.username,
                                client_name: client.name || "",
                                client_mobile: client.mobile || "",
                                client_country_code: client.country_code || "",
                                client_email: client.email || "",
                              }));
                              setClientSearch("");
                              setClients([]);
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-indigo-50"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
                              <FiUser className="h-4 w-4 text-white" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-900">{client.name || "Client"}</span>
                              {client.mobile ? (
                                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
                                  <FiPhone className="shrink-0 text-slate-400" />
                                  {[client.country_code, client.mobile].filter(Boolean).join(" ")}
                                </span>
                              ) : null}
                              {client.email ? (
                                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
                                  <FiMail className="shrink-0 text-slate-400" />
                                  <span className="truncate">{client.email}</span>
                                </span>
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Start", field: "start_at" },
                  { label: "End", field: "end_at" },
                ].map(({ label, field }) => (
                  <div key={field} className="grid gap-1 text-sm font-medium text-slate-700">
                    <span>{label}</span>
                    <div className="grid grid-cols-2 gap-2">
                      <DatePickerField
                        value={draft[field].split("T")[0]}
                        onChange={(value) => updateDraftDate(field, value)}
                        placeholder="Select date"
                        wrapperClassName="w-full"
                        buttonClassName="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-700"
                        showResetButton={false}
                      />
                      <AppointmentTimePicker
                        value={draft[field].split("T")[1] || "09:00"}
                        onChange={(value) => updateDraftTime(field, value)}
                        label={`${label} time`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <label className="grid gap-1 text-sm font-medium text-slate-700">Notes
                <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} maxLength={10000} rows={3} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" />
              </label>
              <fieldset className="grid gap-3">
                <legend className="text-sm font-medium text-slate-700">Invite staff/admins</legend>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="flex h-[360px] flex-col rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-700">Available</h3>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {attendees.filter((person) => person.can_receive_invite && !draft.attendee_usernames.includes(person.username)).length}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!attendees.some((person) => person.can_receive_invite && !draft.attendee_usernames.includes(person.username))}
                        onClick={() => setDraft((current) => ({
                          ...current,
                          attendee_usernames: attendees.filter((person) => person.can_receive_invite).map((person) => person.username),
                        }))}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Select all
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {attendees.filter((person) => person.can_receive_invite && !draft.attendee_usernames.includes(person.username)).length ? (
                        attendees.filter((person) => person.can_receive_invite && !draft.attendee_usernames.includes(person.username)).map((person) => (
                          <button
                            key={person.username}
                            type="button"
                            onClick={() => toggleAttendee(person.username)}
                            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              <FiUser className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-800">{person.name}</span>
                              <span className="block truncate text-xs text-slate-500">{person.role}</span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">No staff available.</div>
                      )}
                    </div>
                  </div>

                  <div className="flex h-[360px] flex-col rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-indigo-700">Selected</h3>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{draft.attendee_usernames.length}</span>
                      </div>
                      <button
                        type="button"
                        disabled={!draft.attendee_usernames.length}
                        onClick={() => setDraft((current) => ({ ...current, attendee_usernames: [] }))}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {draft.attendee_usernames.length ? (
                        attendees
                          .filter((person) => person.can_receive_invite && draft.attendee_usernames.includes(person.username))
                          .map((person) => (
                            <button
                              key={person.username}
                              type="button"
                              onClick={() => toggleAttendee(person.username)}
                              className="flex w-full items-center gap-3 rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-indigo-300"
                            >
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                                <FiUser className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-slate-800">{person.name}</span>
                                <span className="block truncate text-xs text-slate-500">{person.role}</span>
                              </span>
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Selected</span>
                            </button>
                          ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-indigo-200 bg-white px-3 py-4 text-center text-sm text-indigo-600">No staff selected yet.</div>
                      )}
                    </div>
                  </div>
                </div>
                {attendees.some((person) => !person.can_receive_invite) ? <p className="text-xs text-amber-700">Some staff/admins are unavailable because their profile email is missing or invalid.</p> : null}
              </fieldset>
        </form>
      </Modal>
      <ConfirmActionModal
        isOpen={Boolean(cancelTarget)}
        title="Cancel appointment"
        heading={`Cancel the appointment with ${cancelTarget?.client_name || "this client"}?`}
        message="This will cancel the appointment and send cancellation updates to the invitees."
        confirmLabel="Cancel appointment"
        loading={cancelling}
        onCancel={() => !cancelling && setCancelTarget(null)}
        onConfirm={confirmCancel}
      />
    </section>
  );
};

export default AppointmentManager;
