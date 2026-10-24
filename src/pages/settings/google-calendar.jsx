import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiExternalLink, FiRefreshCw } from "react-icons/fi";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Header, Sidebar } from "../../components/header";
import API_BASE_URL from "../../utils/api-controller";
import getHeaders from "../../utils/get-headers";

const GoogleCalendarSettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [calendarId, setCalendarId] = useState("primary");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/appointments/google-calendar`, { headers: getHeaders() });
      const data = response.data?.data;
      setStatus(data || { configured: false, calendar_id: "" });
      if (data?.calendar_id) setCalendarId(data.calendar_id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load Google Calendar settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const error = searchParams.get("calendar_error");
    if (searchParams.get("calendar_connected") === "1") {
      toast.success("This company's Google Calendar is connected");
      loadStatus();
    } else if (error) {
      toast.error(error);
    }
    if (error || searchParams.has("calendar_connected")) {
      const cleanParams = new URLSearchParams(searchParams);
      cleanParams.delete("calendar_connected");
      cleanParams.delete("calendar_error");
      setSearchParams(cleanParams, { replace: true });
    }
  }, [loadStatus, searchParams, setSearchParams]);

  const connect = async (event) => {
    event.preventDefault();
    setConnecting(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/appointments/google-calendar/connect`,
        { calendar_id: calendarId.trim() || "primary" },
        { headers: getHeaders() },
      );
      const authorizationUrl = response.data?.data?.authorization_url;
      if (!authorizationUrl) throw new Error("The server did not return Google's authorization link");
      window.location.assign(authorizationUrl);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to connect Google Calendar");
      setConnecting(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/appointments/google-calendar/test`, {}, { headers: getHeaders() });
      toast.success(response.data?.message || "Google Calendar connection is ready");
      await loadStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || "Google Calendar connection test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="app-page">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <main className={`min-h-screen pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}>
        <div className="mx-3 my-3 max-w-3xl space-y-5 sm:mx-5 sm:my-4 lg:mx-8 lg:my-5">
          <a href="/settings" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-900">
            <FiArrowLeft /> Settings
          </a>
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start gap-3 border-b border-slate-100 p-5">
              <span className="rounded-lg bg-blue-50 p-3 text-blue-700"><FiCalendar className="h-5 w-5" /></span>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Company Google Calendar</h1>
                <p className="mt-1 text-sm text-slate-600">Appointments created in this branch are sent only to its connected calendar.</p>
              </div>
            </div>
            <div className="space-y-5 p-5">
              <div className={`rounded-lg border p-4 ${status?.configured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  {status?.configured ? <FiCheckCircle className="text-emerald-700" /> : <FiCalendar className="text-amber-700" />}
                  {loading ? "Checking connection…" : status?.configured ? "Calendar connected" : "Calendar not connected"}
                </div>
                {status?.configured ? (
                  <p className="mt-1 text-sm text-slate-600">
                    Calendar ID: <span className="font-medium">{status.calendar_id || "primary"}</span>
                    {status.connected_at ? ` · Connected ${new Date(status.connected_at).toLocaleString()}` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">Connect a Google account that has access to this company's calendar before scheduling appointments.</p>
                )}
              </div>

              <form onSubmit={connect} className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Google Calendar ID
                  <input
                    value={calendarId}
                    onChange={(event) => setCalendarId(event.target.value)}
                    maxLength={255}
                    placeholder="primary"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                    required
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">Use “primary” for the account's main calendar. Connecting again replaces this branch's active calendar for new appointments.</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={loading || connecting} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                    <FiExternalLink />{connecting ? "Connecting…" : status?.configured ? "Reconnect Google account" : "Connect Google account"}
                  </button>
                  {status?.configured ? (
                    <button type="button" onClick={testConnection} disabled={testing || loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      <FiRefreshCw className={testing ? "animate-spin" : ""} />{testing ? "Testing…" : "Test connection"}
                    </button>
                  ) : null}
                </div>
              </form>
              <div className="rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                OOMS uses its centrally managed Google OAuth app; do not enter Google OAuth client secrets here. The company authorizes its own Google account. Credentials are stored encrypted by OOMS and are never shown in this page. If a company has multiple branches that should share one calendar, contact your OOMS administrator before connecting each branch separately.
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default GoogleCalendarSettings;
