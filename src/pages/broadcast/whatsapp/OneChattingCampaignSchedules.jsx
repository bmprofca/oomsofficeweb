import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiClock,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiLock,
  FiPause,
  FiPlay,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import ConfirmActionModal from "../../../components/ConfirmActionModal";
import { useUserPermissions } from "../../../utils/permission-helper";
import { extractApiError } from "../../../utils/oneChattingSendUtils";
import { normalizeList, whatsappApi } from "../../../services/whatsappApi";

const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const TOOLBAR_BTN = "px-3 py-2 text-sm font-medium rounded-lg";
const TABLE_HEAD_ROW =
  "bg-gradient-to-r from-gray-50 to-white border-b border-gray-200";
const TABLE_TH =
  "px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap";
const TABLE_ROW =
  "border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors";
const TABLE_TD = "px-3 py-3 min-w-0 text-left align-middle";

const formatHumanTime = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(value);
  }
};

const audienceLabel = (audience) => {
  if (!audience || typeof audience !== "object") return "—";
  const type = String(audience.audience_type || "").toLowerCase();
  if (type === "client") {
    if (audience.select_all_clients) return "All clients";
    const n = Array.isArray(audience.usernames) ? audience.usernames.length : 0;
    return `${n} client${n === 1 ? "" : "s"}`;
  }
  if (type === "group") {
    const n = Array.isArray(audience.group_ids) ? audience.group_ids.length : 0;
    return `${n} group${n === 1 ? "" : "s"}`;
  }
  if (type === "task") {
    return `Task · ${audience.service_id || "—"}`;
  }
  return type || "—";
};

const OneChattingCampaignSchedules = () => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);

  const canSend = check("broadcast_send");
  const canView = canSend || check("broadcast_config_edit");

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whatsappApi.listCampaignSchedules();
      setRows(normalizeList(res?.data ?? res));
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load schedules"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (canView) fetchSchedules();
  }, [canView, fetchSchedules]);

  const toggleActive = async (row) => {
    if (!canSend || !row?.schedule_id) return;
    setBusyId(row.schedule_id);
    try {
      const next = Number(row.is_active) === 1 ? 0 : 1;
      await whatsappApi.updateCampaignSchedule(row.schedule_id, {
        is_active: next,
      });
      toast.success(next ? "Schedule activated" : "Schedule paused");
      await fetchSchedules();
    } catch (error) {
      toast.error(extractApiError(error, "Failed to update schedule"));
    } finally {
      setBusyId(null);
    }
  };

  const runNow = async (row) => {
    if (!canSend || !row?.schedule_id) return;
    setBusyId(row.schedule_id);
    try {
      const res = await whatsappApi.runCampaignSchedule(row.schedule_id);
      const campaignId = res?.data?.campaign_id || res?.campaign_id;
      toast.success(res?.message || "Campaign created from schedule");
      if (campaignId) {
        navigate(`/broadcast/whatsapp/onechatting/campaigns/${campaignId}`);
      } else {
        await fetchSchedules();
      }
    } catch (error) {
      toast.error(extractApiError(error, "Failed to run schedule"));
    } finally {
      setBusyId(null);
    }
  };

  const runDelete = async () => {
    if (!confirmRow?.schedule_id) return;
    setBusyId(confirmRow.schedule_id);
    try {
      await whatsappApi.deleteCampaignSchedule(confirmRow.schedule_id);
      toast.success("Schedule deleted");
      setConfirmRow(null);
      await fetchSchedules();
    } catch (error) {
      toast.error(extractApiError(error, "Failed to delete schedule"));
    } finally {
      setBusyId(null);
    }
  };

  if (!canView) {
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
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
        >
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiLock className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Access Denied
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              You do not have permission to view recurring campaigns.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        className={`pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <FiClock className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight truncate m-0">
                    Recurring campaigns
                  </h1>
                  <p className="text-xs text-gray-500 m-0 truncate">
                    Cron-style WhatsApp broadcasts (IST)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto min-w-0 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/broadcast/whatsapp/onechatting/campaigns")
                  }
                  className={`${TOOLBAR_BTN} border border-gray-300 text-gray-700 hover:bg-gray-100 shrink-0`}
                >
                  Campaign history
                </button>
                <button
                  type="button"
                  onClick={fetchSchedules}
                  disabled={loading}
                  className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 shrink-0"
                  title="Refresh"
                >
                  <FiRefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                </button>
                {canSend ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/broadcast/whatsapp/onechatting/campaigns/create",
                      )
                    }
                    className={`${TOOLBAR_BTN} inline-flex items-center gap-1.5 text-white bg-emerald-600 hover:bg-emerald-700 shrink-0`}
                  >
                    <FiPlus className="w-3.5 h-3.5" />
                    New schedule
                  </button>
                ) : null}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                <FiLoader className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading schedules…</span>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-500 px-4">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <FiClock className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500 m-0">
                  No recurring schedules yet
                </p>
                <p className="text-xs text-gray-400 mt-1 m-0 text-center">
                  Create a campaign and choose Recurring to run on a cycle.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full table-fixed min-w-[900px]">
                    <thead>
                      <tr className={TABLE_HEAD_ROW}>
                        <th className={`${TABLE_TH} w-12`}>#</th>
                        <th className={`${TABLE_TH} w-[22%]`}>Name</th>
                        <th className={`${TABLE_TH} w-[20%]`}>Schedule</th>
                        <th className={`${TABLE_TH} w-[14%]`}>Audience</th>
                        <th className={`${TABLE_TH} w-[12%]`}>Status</th>
                        <th className={`${TABLE_TH} w-[16%]`}>Last run</th>
                        <th className={`${TABLE_TH} w-[14%] text-center`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => {
                        const active = Number(row.is_active) === 1;
                        const busy = busyId === row.schedule_id;
                        return (
                          <tr key={row.schedule_id} className={TABLE_ROW}>
                            <td className={`${TABLE_TD} text-[11px] font-bold text-gray-800`}>
                              {index + 1}
                            </td>
                            <td className={TABLE_TD}>
                              <p className="font-semibold text-gray-800 text-sm m-0 truncate">
                                {row.name}
                              </p>
                              <p className="text-xs text-gray-400 m-0 truncate">
                                {row.template_name || row.template_id || "—"}
                              </p>
                            </td>
                            <td className={TABLE_TD}>
                              <p className="text-xs font-medium capitalize text-indigo-700 m-0">
                                {row.schedule_type}
                              </p>
                              <p className="text-xs text-gray-500 m-0">
                                {row.schedule_display || "—"}
                              </p>
                            </td>
                            <td className={`${TABLE_TD} text-sm text-gray-700`}>
                              {audienceLabel(row.audience)}
                            </td>
                            <td className={TABLE_TD}>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  active
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {active ? "Active" : "Paused"}
                              </span>
                            </td>
                            <td className={TABLE_TD}>
                              <p className="text-sm text-gray-700 m-0">
                                {formatHumanTime(row.last_run_at)}
                              </p>
                              {row.last_error ? (
                                <p className="text-[11px] text-red-600 m-0 truncate" title={row.last_error}>
                                  {row.last_error}
                                </p>
                              ) : row.last_campaign_id ? (
                                <button
                                  type="button"
                                  className="text-[11px] text-emerald-700 hover:underline m-0"
                                  onClick={() =>
                                    navigate(
                                      `/broadcast/whatsapp/onechatting/campaigns/${row.last_campaign_id}`,
                                    )
                                  }
                                >
                                  View last campaign
                                </button>
                              ) : null}
                            </td>
                            <td className={`${TABLE_TD} text-center`}>
                              <div className="inline-flex items-center gap-1">
                                {canSend ? (
                                  <>
                                    <button
                                      type="button"
                                      title="Run now"
                                      disabled={busy}
                                      onClick={() => runNow(row)}
                                      className="p-2 rounded-lg border border-gray-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                                    >
                                      {busy ? (
                                        <FiLoader className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <FiSend className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      title={active ? "Pause" : "Activate"}
                                      disabled={busy}
                                      onClick={() => toggleActive(row)}
                                      className="p-2 rounded-lg border border-gray-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                                    >
                                      {active ? (
                                        <FiPause className="w-3.5 h-3.5" />
                                      ) : (
                                        <FiPlay className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      title="Delete"
                                      disabled={busy}
                                      onClick={() => setConfirmRow(row)}
                                      className="p-2 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                      <FiTrash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-100">
                  {rows.map((row) => {
                    const active = Number(row.is_active) === 1;
                    const busy = busyId === row.schedule_id;
                    return (
                      <div key={row.schedule_id} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 m-0 truncate">
                              {row.name}
                            </p>
                            <p className="text-xs text-gray-500 m-0">
                              {row.schedule_display || row.schedule_type}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {active ? "Active" : "Paused"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 m-0">
                          {audienceLabel(row.audience)} · Last:{" "}
                          {formatHumanTime(row.last_run_at)}
                        </p>
                        {canSend ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => runNow(row)}
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50"
                            >
                              <FiSend className="w-3 h-3" /> Run now
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => toggleActive(row)}
                              className="px-2 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700"
                            >
                              {active ? "Pause" : "Activate"}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setConfirmRow(row)}
                              className="px-2 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(confirmRow)}
        loading={Boolean(busyId && confirmRow)}
        onCancel={() => !busyId && setConfirmRow(null)}
        onConfirm={runDelete}
        title="Delete schedule"
        heading="Delete recurring schedule?"
        message={`This will stop automatic sends for “${confirmRow?.name || "this schedule"}”. Past campaigns are kept.`}
        confirmLabel={busyId && confirmRow ? "Deleting…" : "Delete"}
        tone="danger"
      />
    </div>
  );
};

export default OneChattingCampaignSchedules;
