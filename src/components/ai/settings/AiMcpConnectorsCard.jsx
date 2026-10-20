import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiCheck, FiCopy, FiEdit2, FiLink, FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import AiSettingsModal from './AiSettingsModal';
import AiWriteModeDialog from './AiWriteModeDialog';
import { relativeTime } from './aiProviderMeta';
import {
  createMcpConnector,
  deleteMcpConnector,
  getMcpConnectors,
  rotateMcpConnector,
  updateMcpConnector,
} from '../../../utils/ai-api';

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-50 ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

const memberLabel = (m) => `${m.name}${m.role === 'admin' ? ' (admin)' : m.designation ? ` (${m.designation})` : ''}`;

/** Create / edit: name + whose permissions the connector uses. */
function ConnectorDialog({ open, connector, members, onClose, onSaved }) {
  const isEdit = Boolean(connector);
  const [label, setLabel] = useState('');
  const [runAs, setRunAs] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLabel(connector?.label || '');
    setRunAs(connector?.run_as || members[0]?.username || '');
    setError('');
  }, [open, connector, members]);

  const save = async (e) => {
    e.preventDefault();
    if (!runAs) {
      setError('Choose a team member.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = isEdit
        ? await updateMcpConnector(connector.id, { label: label.trim(), runAs })
        : await createMcpConnector({ label: label.trim(), runAs });
      onSaved(data, isEdit ? 'updated' : 'created');
    } catch (err) {
      setError(errorMessage(err, 'Could not save the connector.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AiSettingsModal
      open={open}
      onClose={onClose}
      busy={saving}
      labelledBy="mcp-connector-title"
      title={isEdit ? 'Edit connector' : 'Create Claude connector'}
      subtitle="Lets Claude read this branch’s data with one team member’s permissions."
      icon={<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><FiLink className="h-4 w-4" /></span>}
      footer={(
        <>
          <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="mcp-connector-form" className="ui-btn ui-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create connector'}
          </button>
        </>
      )}
    >
      <form id="mcp-connector-form" onSubmit={save} className="space-y-4">
        <div>
          <label htmlFor="mcp-label" className="ui-label">Name <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="mcp-label" className="ui-input w-full" maxLength={60} placeholder="e.g. Claude — Sourav" value={label} onChange={(e) => setLabel(e.target.value.replace(/[<>{}`]/g, ''))} />
        </div>
        <div>
          <label htmlFor="mcp-run-as" className="ui-label">Access level of</label>
          <select id="mcp-run-as" className="ui-input w-full" value={runAs} onChange={(e) => setRunAs(e.target.value)}>
            {members.map((m) => (
              <option key={m.username} value={m.username}>{memberLabel(m)}</option>
            ))}
          </select>
          <p className="ui-help">Claude sees exactly what this person can see in OOMS (tasks, finance, reports). Choose the person who will use the connector.</p>
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}
      </form>
    </AiSettingsModal>
  );
}

/** Shows the secret URL once, with copy and the steps for Claude. */
function UrlDialog({ open, url, isPublic, onClose }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Connector URL copied');
    } catch (_) {
      toast.error('Copy failed — select the URL and copy it manually');
    }
  };

  return (
    <AiSettingsModal
      open={open}
      onClose={onClose}
      size="max-w-xl"
      labelledBy="mcp-url-title"
      title="Your connector URL"
      subtitle="Copy it now — for security it is shown only once."
      icon={<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><FiLink className="h-4 w-4" /></span>}
      footer={<button type="button" className="ui-btn ui-btn-primary" onClick={onClose}>Done</button>}
    >
      <div className="space-y-4 text-[13.5px] text-slate-600">
        <div className="flex gap-2">
          <input aria-label="Connector URL" readOnly value={url || ''} onFocus={(e) => e.target.select()} className="ui-input w-full font-mono text-[12.5px]" />
          <button type="button" className="ui-btn ui-btn-secondary shrink-0" onClick={copy}>
            {copied ? <FiCheck className="h-4 w-4 text-emerald-600" /> : <FiCopy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {!isPublic && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This address is not reachable from the internet (local or non-HTTPS server). Create the connector on the live OOMS site to use it with Claude.
          </p>
        )}
        <div>
          <p className="font-semibold text-slate-900">Add it to Claude</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5">
            <li>Open Claude → <strong>Settings</strong> → <strong>Connectors</strong>.</li>
            <li>Click <strong>Add custom connector</strong>.</li>
            <li>Name it <strong>OOMS</strong>, paste the URL above and click <strong>Add</strong>. No sign-in is needed.</li>
            <li>In a chat, switch the OOMS connector on from the tools menu and ask, for example, “Show my pending tasks”.</li>
          </ol>
          <p className="mt-2 text-[12.5px] text-slate-500">On a Claude Team or Enterprise plan, an organisation owner adds custom connectors.</p>
        </div>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px]">
          Treat this URL like a password: anyone who has it can read this branch’s data with the chosen person’s access. If it leaks, use <strong>Regenerate URL</strong>.
        </p>
      </div>
    </AiSettingsModal>
  );
}

/**
 * Settings → AI Assistant → "Claude connector (MCP)": secret URLs that let Claude (or any
 * MCP client) read this branch's data through the same read-only tools as Ask AI.
 */
export default function AiMcpConnectorsCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, connector: null });
  const [reveal, setReveal] = useState({ open: false, url: '' });
  const [confirm, setConfirm] = useState(null); // { kind: 'delete' | 'rotate', connector }
  const [busyId, setBusyId] = useState(null);
  const [writeTarget, setWriteTarget] = useState(null);

  const setMode = async (c, mode) => {
    setBusyId(c.id);
    try {
      setData(await updateMcpConnector(c.id, { accessMode: mode, acknowledgeWrite: mode === 'read_write' }));
      setWriteTarget(null);
      toast.success(mode === 'read_write' ? `${nameOf(c)} can now send after approval in Claude` : `${nameOf(c)} is read-only again`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not change the connector access'));
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    let alive = true;
    getMcpConnectors()
      .then((d) => alive && setData(d))
      .catch(() => alive && toast.error('Could not load connectors'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const connectors = data?.connectors || [];
  const members = data?.members || [];
  const max = data?.limits?.max_connectors || 20;
  const nameOf = (c) => c.label || 'Claude connector';

  const onSaved = (payload, kind) => {
    setData((d) => ({ ...d, ...payload }));
    setDialog({ open: false, connector: null });
    if (payload?.url) setReveal({ open: true, url: payload.url });
    else toast.success(kind === 'updated' ? 'Connector updated' : 'Connector saved');
  };

  const toggle = async (c, enabled) => {
    setBusyId(c.id);
    try {
      setData(await updateMcpConnector(c.id, { enabled }));
      toast.success(`${nameOf(c)} switched ${enabled ? 'on' : 'off'}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the connector'));
    } finally {
      setBusyId(null);
    }
  };

  const runConfirm = async () => {
    const { kind, connector } = confirm;
    setBusyId(connector.id);
    try {
      if (kind === 'delete') {
        setData(await deleteMcpConnector(connector.id));
        toast.success(`${nameOf(connector)} deleted`);
      } else {
        const payload = await rotateMcpConnector(connector.id);
        setData((d) => ({ ...d, ...payload }));
        setReveal({ open: true, url: payload.url });
      }
      setConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not complete the action'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="ui-card">
      <div className="ui-card-header flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="ui-card-title flex items-center gap-2"><FiLink className="h-4 w-4 text-slate-500" /> Claude connector (MCP)</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">Use OOMS data inside Claude: add a connector URL in Claude → Settings → Connectors. Read-only.</p>
        </div>
        <div className="flex items-center gap-2">
          {data && <span className="text-[12px] text-slate-400">{connectors.length} of {max}</span>}
          <button
            type="button"
            className="ui-btn ui-btn-primary ui-btn-sm"
            disabled={loading || !members.length || connectors.length >= max}
            onClick={() => setDialog({ open: true, connector: null })}
          >
            <FiPlus className="h-4 w-4" /> Create connector
          </button>
        </div>
      </div>
      <div className="ui-card-body space-y-3">
        {data && !data.public && (
          <p role="note" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This server ({data.endpoint}) is not reachable from the internet, so Claude can’t connect here. Connectors work on the live OOMS site (HTTPS).</span>
          </p>
        )}

        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        ) : connectors.length ? (
          <ul className="space-y-2" aria-label="Claude connectors">
            {connectors.map((c) => {
              const used = relativeTime(c.last_used_at);
              return (
                <li key={c.id} className={`flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center ${c.enabled ? 'bg-white' : 'bg-slate-50/70'}`}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><FiLink className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`truncate text-[14px] font-semibold ${c.enabled ? 'text-slate-900' : 'text-slate-500'}`}>{nameOf(c)}</span>
                        <span className={c.enabled ? (c.last_used_at ? 'ui-badge ui-badge-success' : 'ui-badge ui-badge-neutral') : 'ui-badge ui-badge-neutral'}>
                          {!c.enabled ? 'Off' : c.last_used_at ? 'Connected' : 'Not used yet'}
                        </span>
                        <span className={c.access_mode === 'read_write' ? 'ui-badge ui-badge-warning' : 'ui-badge ui-badge-neutral'}>
                          {c.access_mode === 'read_write' ? 'Read & write' : 'Read-only'}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                        Access of <span className="font-medium text-slate-700">{c.run_as_name || 'a team member'}</span>
                        <span className="mx-1.5 text-slate-300">|</span>
                        URL <span className="font-mono">{c.token_hint || '…'}</span>
                        {used && <><span className="mx-1.5 text-slate-300">|</span>used {used}{c.last_client ? ` by ${c.last_client}` : ''}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <button
                      type="button"
                      className="ui-btn ui-btn-ghost ui-btn-sm"
                      onClick={() => (c.access_mode === 'read_write' ? setMode(c, 'read') : setWriteTarget(c))}
                      disabled={busyId === c.id}
                    >
                      {c.access_mode === 'read_write' ? 'Make read-only' : 'Allow read & write'}
                    </button>
                    <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setConfirm({ kind: 'rotate', connector: c })} disabled={busyId === c.id}>
                      <FiRefreshCw className="h-3.5 w-3.5" /> Regenerate URL
                    </button>
                    <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon" onClick={() => setDialog({ open: true, connector: c })} disabled={busyId === c.id} aria-label={`Edit ${nameOf(c)}`}>
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon text-red-600" onClick={() => setConfirm({ kind: 'delete', connector: c })} disabled={busyId === c.id} aria-label={`Delete ${nameOf(c)}`}>
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                    <span className="ml-1.5">
                      <Switch checked={c.enabled} onChange={(v) => toggle(c, v)} disabled={busyId === c.id} label={`${c.enabled ? 'Switch off' : 'Switch on'} ${nameOf(c)}`} />
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-[13px] text-slate-500">
            No connectors yet. Create one to ask Claude about your tasks, attendance, balances and reports.
          </div>
        )}
      </div>

      <ConnectorDialog
        open={dialog.open}
        connector={dialog.connector}
        members={members}
        onClose={() => setDialog({ open: false, connector: null })}
        onSaved={onSaved}
      />
      <AiWriteModeDialog
        open={Boolean(writeTarget)}
        busy={Boolean(writeTarget) && busyId === writeTarget?.id}
        connector
        target={writeTarget ? `The connector “${nameOf(writeTarget)}”` : 'This connector'}
        onClose={() => setWriteTarget(null)}
        onConfirm={() => setMode(writeTarget, 'read_write')}
      />
      <UrlDialog open={reveal.open} url={reveal.url} isPublic={Boolean(data?.public)} onClose={() => setReveal({ open: false, url: '' })} />
      <AiSettingsModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        busy={Boolean(busyId)}
        size="max-w-md"
        labelledBy="mcp-confirm-title"
        title={confirm?.kind === 'delete' ? 'Delete connector?' : 'Regenerate connector URL?'}
        footer={(
          <>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setConfirm(null)} disabled={Boolean(busyId)}>Cancel</button>
            <button type="button" className={`ui-btn ${confirm?.kind === 'delete' ? 'ui-btn-danger' : 'ui-btn-primary'}`} onClick={runConfirm} disabled={Boolean(busyId)}>
              {confirm?.kind === 'delete' ? 'Delete' : 'Regenerate'}
            </button>
          </>
        )}
      >
        {confirm && (
          <p className="text-[13.5px] text-slate-600">
            {confirm.kind === 'delete'
              ? <><strong className="text-slate-900">{nameOf(confirm.connector)}</strong> will stop working in Claude immediately.</>
              : <>The current URL of <strong className="text-slate-900">{nameOf(confirm.connector)}</strong> stops working immediately. You’ll get a new URL to paste into Claude.</>}
          </p>
        )}
      </AiSettingsModal>
    </section>
  );
}
