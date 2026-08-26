import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FiKey, FiLoader, FiLock, FiSave } from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import { smsApi, FAST2SMS_ROUTE_OPTIONS } from "../../../services/smsApi";
import { useUserPermissions } from "../../../utils/permission-helper";

const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const FIELD_LABEL =
  "block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5";
const FIELD_INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const Fast2SmsConfigure = () => {
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [form, setForm] = useState({
    auth_token: "",
    sender_id: "",
    entity_id: "",
    route: "dlt",
  });

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await smsApi.getFast2SmsConfig();
        const data = res?.data || {};
        if (cancelled) return;
        setConfigured(Boolean(data.configured));
        setForm({
          auth_token: data.auth_token || "",
          sender_id: data.sender_id || "",
          entity_id: data.entity_id || "",
          route: data.route || "dlt",
        });
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error?.response?.data?.message ||
              error.message ||
              "Failed to load Fast2SMS config",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.auth_token.trim() && !configured) {
      toast.error("Authorization API key is required");
      return;
    }
    setSaving(true);
    try {
      const res = await smsApi.saveFast2SmsConfig({
        auth_token: form.auth_token.trim(),
        sender_id: form.sender_id.trim().toUpperCase(),
        entity_id: form.entity_id.trim(),
        route: form.route,
      });
      const data = res?.data || {};
      setConfigured(Boolean(data.configured));
      setForm({
        auth_token: data.auth_token || form.auth_token,
        sender_id: data.sender_id || "",
        entity_id: data.entity_id || "",
        route: data.route || "dlt",
      });
      toast.success(res?.message || "Fast2SMS config saved");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to save Fast2SMS config",
      );
    } finally {
      setSaving(false);
    }
  };

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";

  if (!check("broadcast_config_edit")) {
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
          className={`pt-16 flex h-[calc(100vh-4rem)] items-center justify-center transition-all duration-300 ease-in-out ${contentInset}`}
        >
          <div className="mx-4 w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <FiLock className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="mb-1 text-sm font-medium text-gray-500">
              Access Denied
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Access denied.
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
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
      >
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className={TOOLBAR_ROW}>
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <FiKey className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="m-0 text-base font-bold leading-tight text-gray-800 md:text-lg">
                    Fast2SMS Configure
                  </h1>
                </div>
              </div>
              {configured ? (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Configured
                </span>
              ) : (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  Not configured
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-4 p-4 md:p-5" aria-busy="true">
                <div className="space-y-1.5">
                  <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
                  <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                    <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-14 animate-pulse rounded bg-slate-200" />
                  <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
                </div>
                <div className="flex justify-end pt-2">
                  <div className="h-10 w-32 animate-pulse rounded-lg bg-blue-100" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 p-4 md:p-5">
                <div>
                  <label className={FIELD_LABEL}>Authorization API key</label>
                  <input
                    type="password"
                    autoComplete="off"
                    className={FIELD_INPUT}
                    value={form.auth_token}
                    onChange={(e) => updateField("auth_token", e.target.value)}
                    placeholder="API key"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={FIELD_LABEL}>Sender ID</label>
                    <input
                      type="text"
                      className={FIELD_INPUT}
                      value={form.sender_id}
                      onChange={(e) =>
                        updateField("sender_id", e.target.value.toUpperCase())
                      }
                      placeholder="Sender ID"
                      maxLength={8}
                    />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Entity ID (PEID)</label>
                    <input
                      type="text"
                      className={FIELD_INPUT}
                      value={form.entity_id}
                      onChange={(e) => updateField("entity_id", e.target.value)}
                      placeholder="Entity ID"
                    />
                  </div>
                </div>

                <div>
                  <label className={FIELD_LABEL}>Route</label>
                  <select
                    className={FIELD_INPUT}
                    value={form.route}
                    onChange={(e) => updateField("route", e.target.value)}
                  >
                    {FAST2SMS_ROUTE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <FiLoader className="h-4 w-4 animate-spin" />
                    ) : (
                      <FiSave className="h-4 w-4" />
                    )}
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fast2SmsConfigure;
