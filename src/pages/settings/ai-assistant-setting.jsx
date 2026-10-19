import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowLeft,
  FiCpu,
  FiInfo,
  FiLock,
  FiPlus,
  FiShield,
  FiTrash2,
  FiZap,
} from 'react-icons/fi';
import { Header, Sidebar } from '../../components/header';
import AiConnectionDialog from '../../components/ai/settings/AiConnectionDialog';
import AiConnectionList from '../../components/ai/settings/AiConnectionList';
import AiMcpConnectorsCard from '../../components/ai/settings/AiMcpConnectorsCard';
import AiSettingsModal from '../../components/ai/settings/AiSettingsModal';
import { connectionStatus, isFailing } from '../../components/ai/settings/aiProviderMeta';
import {
  deleteAiConnection,
  getAiSettings,
  reorderAiConnections,
  saveAiSettings,
  testSavedAiConnection,
  updateAiConnection,
} from '../../utils/ai-api';

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

function Toggle({ checked, onChange, disabled, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-50 ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Notice({ tone = 'info', children }) {
  const styles = {
    danger: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900',
  };
  const Icon = tone === 'danger' ? FiAlertCircle : tone === 'warning' ? FiAlertTriangle : FiInfo;
  return (
    <div role={tone === 'info' ? 'note' : 'alert'} className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] ${styles[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
      <div className="space-y-4 lg:col-span-2">
        {[96, 260, 140].map((h, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white" style={{ height: h }} />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}

export default function AiAssistantSetting() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebarMinimized');
      return saved ? JSON.parse(saved) : false;
    } catch (_) {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    } catch (_) {
      /* storage unavailable */
    }
  }, [isMinimized]);

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [data, setData] = useState(null);
  const [rates, setRates] = useState({ rate_per_min: 6, rate_per_day: 200 });
  const [savingRates, setSavingRates] = useState(false);
  const [togglingAssistant, setTogglingAssistant] = useState(false);
  const [dialog, setDialog] = useState({ open: false, mode: 'add', connection: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [testingId, setTestingId] = useState(null);

  const apply = (payload) => {
    if (!payload) return;
    setData((prev) => ({ ...prev, ...payload }));
    if (payload.settings) setRates({ rate_per_min: payload.settings.rate_per_min, rate_per_day: payload.settings.rate_per_day });
  };

  useEffect(() => {
    let alive = true;
    getAiSettings()
      .then((payload) => alive && apply(payload))
      .catch((err) => {
        if (!alive) return;
        if (err?.response?.status === 403) setForbidden(true);
        else toast.error('Could not load AI settings');
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const settings = data?.settings;
  const connections = useMemo(() => data?.connections || [], [data]);
  const providers = data?.providers || [];
  const maxConnections = data?.limits?.max_connections || 10;
  const active = connections.filter((c) => c.enabled);
  const primary = active[0] || null;
  const firstWorking = active.find((c) => !isFailing(c)) || null;
  const providerLabel = (id) => providers.find((p) => p.id === id)?.label || id;
  const nameOf = (c) => c.label || providerLabel(c.provider);

  /* ------------------------------ actions ------------------------------ */

  const toggleAssistant = async (enabled) => {
    setTogglingAssistant(true);
    try {
      apply(await saveAiSettings({ enabled, rate_per_min: settings.rate_per_min, rate_per_day: settings.rate_per_day }));
      toast.success(enabled ? 'AI Assistant is on for this branch' : 'AI Assistant is off for this branch');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the assistant'));
    } finally {
      setTogglingAssistant(false);
    }
  };

  const saveRates = async (e) => {
    e.preventDefault();
    setSavingRates(true);
    try {
      apply(await saveAiSettings({ enabled: settings.enabled, rate_per_min: Number(rates.rate_per_min), rate_per_day: Number(rates.rate_per_day) }));
      toast.success('Usage limits saved');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save usage limits'));
    } finally {
      setSavingRates(false);
    }
  };

  const reorder = async (next) => {
    const previous = connections;
    setData((d) => ({ ...d, connections: next })); // optimistic
    try {
      apply(await reorderAiConnections(next.map((c) => c.id)));
    } catch (err) {
      setData((d) => ({ ...d, connections: previous }));
      toast.error(errorMessage(err, 'Could not save the new order'));
    }
  };

  const toggleConnection = async (connection, enabled) => {
    setBusyId(connection.id);
    try {
      apply(await updateAiConnection(connection.id, { enabled }));
      toast.success(`${nameOf(connection)} switched ${enabled ? 'on' : 'off'}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the connection'));
    } finally {
      setBusyId(null);
    }
  };

  const testConnection = async (connection) => {
    setTestingId(connection.id);
    try {
      const result = await testSavedAiConnection(connection.id);
      if (result?.connections) apply({ connections: result.connections });
      if (result?.ok) toast.success(`${nameOf(connection)}: ${result.message}`);
      else toast.error(`${nameOf(connection)}: ${result?.message || 'Test failed'}`, { duration: 6000 });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not test the connection'));
    } finally {
      setTestingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      apply(await deleteAiConnection(deleteTarget.id));
      toast.success(`${nameOf(deleteTarget)} deleted`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete the connection'));
    } finally {
      setDeleting(false);
    }
  };

  const onDialogSaved = (payload, kind) => {
    apply(payload);
    setDialog((d) => ({ ...d, open: false }));
    toast.success(kind === 'added' ? 'Connection added' : 'Connection updated');
  };

  /* ------------------------------- render ------------------------------- */

  const notices = [];
  if (settings && connections.length) {
    if (settings.enabled && !active.length) {
      notices.push(<Notice key="none" tone="danger">No connection is switched on, so your team can’t use the assistant. Switch one on below.</Notice>);
    } else if (primary && isFailing(primary)) {
      notices.push(
        <Notice key="primary" tone={firstWorking ? 'warning' : 'danger'}>
          <strong>{nameOf(primary)}</strong> reported “{connectionStatus(primary).label}”. {connectionStatus(primary).help}{' '}
          {firstWorking && firstWorking.id !== primary.id
            ? <>Questions are being answered by <strong>{nameOf(firstWorking)}</strong> in the meantime.</>
            : active.length > 1 ? 'The backups also reported problems.' : 'Add a backup connection so questions still get answered.'}
        </Notice>
      );
    } else if (active.length === 1) {
      notices.push(<Notice key="backup" tone="info">Tip: add a backup connection (another key or provider) so questions are still answered if this one runs out of credit or the provider is down.</Notice>);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

      <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="mx-2 my-3 sm:mx-4 md:mx-8 md:my-4">
          <div className="ui-page-header">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate('/settings')} className="ui-btn ui-btn-ghost ui-btn-icon" aria-label="Back to settings">
                <FiArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="ui-eyebrow">Settings</p>
                <h1 className="ui-page-title">AI Assistant</h1>
                <p className="ui-page-subtitle">Connect one or more AI providers. If the first one fails, the next one answers automatically.</p>
              </div>
            </div>
          </div>

          {loading ? (
            <SettingsSkeleton />
          ) : forbidden ? (
            <div className="ui-card flex flex-col items-center gap-2 p-8 text-center">
              <FiLock className="h-6 w-6 text-slate-400" />
              <p className="font-semibold text-slate-800">Only branch admins can manage the AI Assistant.</p>
              <p className="text-sm text-slate-500">Ask your branch admin to set it up.</p>
            </div>
          ) : !settings ? (
            <div className="ui-card p-8 text-center text-sm text-slate-500">AI settings are unavailable right now. Please reload the page.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {/* Assistant switch + summary */}
                <section className="ui-card">
                  <div className="ui-card-body space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <FiZap className="h-5 w-5" />
                        </span>
                        <div>
                          <label htmlFor="ai-enabled" className="text-[15px] font-semibold text-slate-900">AI Assistant for this branch</label>
                          <p className="mt-0.5 text-[13px] text-slate-500">
                            {settings.enabled && active.length
                              ? <>On · answering with <span className="font-medium text-slate-700">{nameOf(firstWorking || primary)}</span>{active.length > 1 ? ` · ${active.length - 1} backup${active.length > 2 ? 's' : ''}` : ''}</>
                              : settings.enabled
                                ? 'On, but no connection is switched on.'
                                : 'Off · the Ask AI button is hidden from your team.'}
                          </p>
                        </div>
                      </div>
                      <Toggle
                        id="ai-enabled"
                        checked={settings.enabled}
                        disabled={togglingAssistant || (!settings.enabled && !active.length)}
                        onChange={toggleAssistant}
                      />
                    </div>
                    {!settings.enabled && !active.length && (
                      <p className="text-[12.5px] text-slate-500">Add and switch on at least one AI connection to turn the assistant on.</p>
                    )}
                    {notices}
                  </div>
                </section>

                {/* Connections */}
                <section className="ui-card">
                  <div className="ui-card-header flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="ui-card-title flex items-center gap-2"><FiCpu className="h-4 w-4 text-slate-500" /> AI connections</h2>
                      <p className="mt-0.5 text-[12.5px] text-slate-500">Drag to set the order. The first switched-on connection answers; the rest are backups.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-slate-400">{connections.length} of {maxConnections}</span>
                      <button
                        type="button"
                        className="ui-btn ui-btn-primary ui-btn-sm"
                        onClick={() => setDialog({ open: true, mode: 'add', connection: null })}
                        disabled={connections.length >= maxConnections}
                      >
                        <FiPlus className="h-4 w-4" /> Add connection
                      </button>
                    </div>
                  </div>
                  <div className="ui-card-body">
                    {connections.length ? (
                      <AiConnectionList
                        connections={connections}
                        providers={providers}
                        busyId={busyId}
                        testingId={testingId}
                        onReorder={reorder}
                        onToggle={toggleConnection}
                        onTest={testConnection}
                        onEdit={(c) => setDialog({ open: true, mode: 'edit', connection: c })}
                        onDelete={setDeleteTarget}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FiCpu className="h-5 w-5" /></span>
                        <div>
                          <p className="font-semibold text-slate-800">No AI connections yet</p>
                          <p className="mt-0.5 text-[13px] text-slate-500">Add an API key from Anthropic Claude, OpenAI, Google Gemini or DeepSeek to get started.</p>
                        </div>
                        <button type="button" className="ui-btn ui-btn-primary" onClick={() => setDialog({ open: true, mode: 'add', connection: null })}>
                          <FiPlus className="h-4 w-4" /> Add your first connection
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                {/* Remote MCP connectors (Claude custom connector) */}
                <AiMcpConnectorsCard />

                {/* Usage limits */}
                <section className="ui-card">
                  <div className="ui-card-header">
                    <h2 className="ui-card-title">Usage limits</h2>
                  </div>
                  <form onSubmit={saveRates} className="ui-card-body grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div>
                      <label htmlFor="ai-rpm" className="ui-label">Questions per user per minute</label>
                      <input id="ai-rpm" type="number" min={1} max={60} className="ui-input w-full" value={rates.rate_per_min} onChange={(e) => setRates((r) => ({ ...r, rate_per_min: e.target.value }))} required />
                    </div>
                    <div>
                      <label htmlFor="ai-rpd" className="ui-label">Questions per user per day</label>
                      <input id="ai-rpd" type="number" min={1} max={5000} className="ui-input w-full" value={rates.rate_per_day} onChange={(e) => setRates((r) => ({ ...r, rate_per_day: e.target.value }))} required />
                    </div>
                    <button type="submit" className="ui-btn ui-btn-secondary" disabled={savingRates}>{savingRates ? 'Saving…' : 'Save limits'}</button>
                  </form>
                </section>
              </div>

              {/* Info */}
              <aside className="space-y-4">
                <div className="ui-card">
                  <div className="ui-card-body space-y-3 text-[13px] text-slate-600">
                    <p className="font-semibold text-slate-900">How failover works</p>
                    <ol className="list-decimal space-y-1.5 pl-4">
                      <li>Every question goes to the first switched-on connection.</li>
                      <li>If it has no credit, its key is rejected, or the provider is down or busy, the next connection answers the same question automatically.</li>
                      <li>A connection that just failed is skipped for a short while, so your team doesn’t wait on it.</li>
                    </ol>
                    <p>You can add several keys for the same provider, or mix providers.</p>
                  </div>
                </div>
                <div className="ui-card">
                  <div className="ui-card-body space-y-3 text-[13px] text-slate-600">
                    <p className="flex items-center gap-1.5 font-semibold text-slate-900"><FiShield className="h-4 w-4 text-emerald-600" /> Safety &amp; privacy</p>
                    <ul className="list-disc space-y-1.5 pl-4">
                      <li>Every question is safety-checked before it reaches any AI provider. Attempts to get system details, code or other offices’ data are refused.</li>
                      <li>Every answer is checked before it is shown; internal IDs and system details are removed.</li>
                      <li>The assistant only reads data and respects each user’s permissions.</li>
                      <li>API keys are stored encrypted and never shown again. Only branch admins can manage this page.</li>
                      <li>Questions and the data needed to answer them are sent to the provider that answers.</li>
                      <li>Claude connectors are read-only, use one team member’s permissions, and can be switched off or given a new URL at any time.</li>
                    </ul>
                  </div>
                </div>
                {settings.modify_date && (
                  <p className="px-1 text-[12px] text-slate-400">Assistant settings updated {String(settings.modify_date).slice(0, 16).replace('T', ' ')}</p>
                )}
              </aside>
            </div>
          )}
        </div>
      </div>

      {data && (
        <AiConnectionDialog
          open={dialog.open}
          mode={dialog.mode}
          connection={dialog.connection}
          providers={providers}
          efforts={data.efforts || ['low', 'medium', 'high']}
          onClose={() => setDialog((d) => ({ ...d, open: false }))}
          onSaved={onDialogSaved}
        />
      )}

      <AiSettingsModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        busy={deleting}
        size="max-w-md"
        labelledBy="ai-delete-title"
        title="Delete AI connection?"
        icon={<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"><FiTrash2 className="h-4 w-4" /></span>}
        footer={(
          <>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
            <button type="button" className="ui-btn ui-btn-danger" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
          </>
        )}
      >
        {deleteTarget && (
          <div className="space-y-2 text-[13.5px] text-slate-600">
            <p><strong className="text-slate-900">{nameOf(deleteTarget)}</strong> and its saved API key ({deleteTarget.api_key_hint || '••••'}) will be permanently removed.</p>
            {deleteTarget.enabled && active.length === 1 && settings?.enabled && (
              <Notice tone="warning">This is the only switched-on connection. Your team won’t be able to use the assistant until you add another one.</Notice>
            )}
          </div>
        )}
      </AiSettingsModal>
    </div>
  );
}
