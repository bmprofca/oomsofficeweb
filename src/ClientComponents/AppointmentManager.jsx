import React, { useCallback, useEffect, useState } from "react";
import { FiCalendar, FiCheck, FiEdit2, FiPlus, FiRefreshCw, FiTrash2, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import axios from "axios";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";

const emptyDraft = () => ({
  client_username: "",
  client_name: "",
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
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 0 });
  const [attendees, setAttendees] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [incomingOnly, setIncomingOnly] = useState(mine);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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
    if (clientUsername || !modalOpen || clientSearch.trim().length < 2) {
      setClients([]);
      return undefined;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/appointments/clients`, {
          headers: getHeaders(),
          params: { search: clientSearch.trim() },
        });
        if (active) setClients(response.data?.data || []);
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
    if (!window.confirm(`Cancel the appointment with ${appointment.client_name}?`)) return;
    try {
      const response = await axios.delete(`${API_BASE_URL}/appointments/${encodeURIComponent(appointment.appointment_id)}`, { headers: getHeaders() });
      if (response.data?.calendar?.status !== "cancelled") {
        toast.error(response.data?.calendar?.error || "Appointment cancelled, but Google Calendar cancellation is pending");
      } else {
        toast.success("Appointment cancelled");
      }
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to cancel appointment");
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

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-indigo-600" />
          <h2 className="font-semibold text-slate-900">{clientUsername ? "Client appointments" : "Appointments"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {!clientUsername ? (
            <button type="button" onClick={() => setIncomingOnly((value) => !value)} className={`rounded-lg border px-3 py-2 text-sm ${incomingOnly ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}>
              {incomingOnly ? "Incoming to me" : "All accessible"}
            </button>
          ) : null}
          <button type="button" onClick={load} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Refresh appointments">
            <FiRefreshCw />
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <FiPlus /> Schedule appointment
          </button>
        </div>
      </div>

      <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-3">
        <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search client or attendee" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" aria-label="Search appointments" />
        <label className="flex items-center gap-2 text-xs text-slate-500">From
          <input type="date" value={fromDate} onChange={(event) => { setPage(1); setFromDate(event.target.value); }} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700" />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">To
          <input type="date" value={toDate} onChange={(event) => { setPage(1); setToDate(event.target.value); }} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700" />
        </label>
      </div>

      {loading ? <p className="p-5 text-sm text-slate-500">Loading appointments…</p> : appointments.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">No upcoming appointments found.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {appointments.map((appointment) => (
            <article key={appointment.appointment_id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">{appointment.client_name}</h3>
                <p className="mt-1 text-sm text-slate-600">{displayDate(appointment.start_at, appointment.timezone)} – {displayDate(appointment.end_at, appointment.timezone)}</p>
                <p className="mt-1 text-xs text-slate-500">Attendees: {(appointment.attendees || []).map((item) => item.attendee_name).join(", ") || "None"}</p>
                {appointment.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{appointment.notes}</p> : null}
                <p className={`mt-2 text-xs font-medium ${appointment.calendar_sync_status === "synced" ? "text-emerald-700" : "text-amber-700"}`}>
                  Google Calendar: {appointment.calendar_sync_status}
                  {appointment.calendar_sync_error ? ` — ${appointment.calendar_sync_error}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {appointment.calendar_sync_status === "failed" || appointment.calendar_sync_status === "pending" ? (
                  <button type="button" onClick={() => retrySync(appointment)} className="rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-800 hover:bg-amber-50">Retry calendar</button>
                ) : null}
                <button type="button" onClick={() => openEdit(appointment)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Edit appointment"><FiEdit2 /></button>
                <button type="button" onClick={() => cancel(appointment)} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50" aria-label="Cancel appointment"><FiTrash2 /></button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && pagination.total_pages > 1 ? (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>{pagination.total} appointment{pagination.total === 1 ? "" : "s"} · page {page} of {pagination.total_pages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= pagination.total_pages} onClick={() => setPage((value) => Math.min(pagination.total_pages, value + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation">
          <form onSubmit={save} className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="appointment-form-title">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="appointment-form-title" className="font-semibold text-slate-900">{editingId ? "Edit appointment" : "Schedule appointment"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><FiX /></button>
            </div>
            <div className="grid gap-4 p-5">
              {clientUsername ? (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{clientName || draft.client_name || clientUsername}</div>
              ) : (
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Client
                  <input value={draft.client_name || clientSearch} onChange={(event) => { setClientSearch(event.target.value); setDraft((current) => ({ ...current, client_username: "", client_name: "" })); }} placeholder="Search client name or username" className="rounded-lg border border-slate-300 px-3 py-2 font-normal" required />
                  {clients.length ? <span className="max-h-36 overflow-y-auto rounded-lg border border-slate-200">
                    {clients.map((client) => <button type="button" key={client.username} onClick={() => { setDraft((current) => ({ ...current, client_username: client.username, client_name: client.name })); setClientSearch(client.name); setClients([]); }} className="block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-indigo-50">{client.name} <span className="text-xs text-slate-500">{client.username}</span></button>)}
                  </span> : null}
                </label>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-slate-700">Start
                  <input type="datetime-local" value={draft.start_at} onChange={(event) => setDraft({ ...draft, start_at: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" required />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">End
                  <input type="datetime-local" value={draft.end_at} onChange={(event) => setDraft({ ...draft, end_at: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" required />
                </label>
              </div>
              <label className="grid gap-1 text-sm font-medium text-slate-700">Notes
                <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} maxLength={10000} rows={3} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" />
              </label>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium text-slate-700">Invite staff/admins</legend>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                  {attendees.filter((person) => person.can_receive_invite).map((person) => (
                    <label key={person.username} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0">
                      <input type="checkbox" checked={draft.attendee_usernames.includes(person.username)} onChange={() => toggleAttendee(person.username)} />
                      <span>{person.name} <span className="text-xs text-slate-500">({person.role})</span></span>
                      <span className="ml-auto text-xs text-slate-500">{person.email}</span>
                    </label>
                  ))}
                </div>
                {attendees.some((person) => !person.can_receive_invite) ? <p className="text-xs text-amber-700">Some staff/admins are unavailable because their profile email is missing or invalid.</p> : null}
              </fieldset>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">Close</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><FiCheck />{saving ? "Saving…" : "Save appointment"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
};

export default AppointmentManager;
