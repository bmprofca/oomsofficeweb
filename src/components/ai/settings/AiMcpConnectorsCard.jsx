import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiCheck, FiCopy, FiEdit2, FiEdit3, FiEye, FiLink, FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import AiSettingsModal from './AiSettingsModal';
import AiWriteModeDialog, { WRITE_ACTIONS } from './AiWriteModeDialog';
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

const ACCESS_OPTIONS = [
  { id: 'read', icon: FiEye, title: 'Read-only', text: 'Claude can look up tasks, attendance, balances and reports. Nothing is sent.' },
  { id: 'read_write', icon: FiEdit3, title: 'Read & write', text: 'Claude can also send WhatsApp messages and emails, and share documents and ledgers, after you approve each one in Claude.' },
];

/** Compact Read-only | Read & write switch shown on each connector. */
function AccessToggle({ value, onChange, disabled, name }) {
  return (
    <div role="radiogroup" aria-label={`Access of ${name}`} className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {ACCESS_OPTIONS.map((opt) => {
        const active = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !active && onChange(opt.id)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-60 ${
              active ? (opt.id === 'read_write' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {opt.title}
          </button>
        );
      })}
    </div>
  );
}

const memberLabel = (m) => `${m.name}${m.role === 'admin' ? ' (admin)' : m.designation ? ` (${m.designation})` : ''}`;

/** Create / edit: name, whose permissions the connector uses, and read-only or read & write. */
function ConnectorDialog({ open, connector, members, onClose, onSaved }) {
  const isEdit = Boolean(connector);
  const [label, setLabel] = useState('');
  const [runAs, setRunAs] = useState('');
  const [accessMode, setAccessMode] = useState('read');
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLabel(connector?.label || '');
    setRunAs(connector?.run_as || members[0]?.username || '');
    setAccessMode(connector?.access_mode === 'read_write' ? 'read_write' : 'read');
    setAgreed(false);
    setError('');
  }, [open, connector, members]);

  const save = async (e) => {
    e.preventDefault();
    if (!runAs) {
      setError('Choose a team member.');
      return;
    }
    // Turning read & write on (new connector, or an existing read-only one) needs the acknowledgement.
    const needsAck = accessMode === 'read_write' && connector?.access_mode !== 'read_write';
    if (needsAck && !agreed) {
      setError('Tick the confirmation to allow read & write.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = isEdit
        ? await updateMcpConnector(connector.id, {
          label: label.trim(),
          runAs,
          ...(accessMode !== (connector.access_mode || 'read') ? { accessMode, acknowledgeWrite: needsAck } : {}),
        })
        : await createMcpConnector({ label: label.trim(), runAs, accessMode, acknowledgeWrite: needsAck });
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
      subtitle="Lets Claude use this branch’s data with one team member’s permissions."
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
        <div>
          <p className="ui-label" id="mcp-access-label">Access</p>
          <div role="radiogroup" aria-labelledby="mcp-access-label" className="grid gap-2 sm:grid-cols-2">
            {ACCESS_OPTIONS.map((opt) => {
              const active = accessMode === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAccessMode(opt.id)}
                  className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${active ? 'border-indigo-500 bg-indigo-50/60' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon className="h-4 w-4" /></span>
                  <span>
                    <span className={`block text-[13.5px] font-semibold ${active ? 'text-indigo-700' : 'text-slate-800'}`}>{opt.title}{opt.id === 'read' && <span className="ui-badge ui-badge-neutral ml-1.5">Default</span>}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">{opt.text}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {accessMode === 'read_write' && connector?.access_mode !== 'read_write' && (
            <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[12.5px] text-amber-900">
              <p className="font-semibold">Claude will be able to:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {WRITE_ACTIONS.map((a) => <li key={a.title}>{a.title}</li>)}
              </ul>
              <p className="mt-1.5">Nothing is sent until the person using Claude approves it. Only to this office’s own clients and team, following this person’s permissions. Every send is logged.</p>
              <label className="mt-2 flex items-start gap-2 text-[12.5px] text-amber-950">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                I understand that messages and documents will be sent in my office’s name after approval in Claude.
              </label>
            </div>
          )}
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}
      </form>
    </AiSettingsModal>
  );
}

/** Shows the secret URL once, with copy and the steps for Claude. */
function UrlDialog({ open, url, isPublic, writable, onClose }) {
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
            {writable && <li>This connector is read &amp; write: ask, for example, “Email Asish that his documents are received”. Claude shows what will be sent and asks you to approve before anything goes out.</li>}
          </ol>
          <p className="mt-2 text-[12.5px] text-slate-500">On a Claude Team or Enterprise plan, an organisation owner adds custom connectors.</p>
        </div>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px]">
          Treat this URL like a password: anyone who has it can use this branch’s data with the chosen person’s access. If it leaks, use <strong>Regenerate URL</strong>.
        </p>
      </div>
    </AiSettingsModal>
  );
}

/**
 * Settings → AI Assistant → "Claude connector (MCP)": secret URLs that let Claude (or any
 * MCP client) use this branch's data through the same tools as Ask AI. Read-only by default;
 * read & write per connector (send/share after approval in Claude).
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
      toast.success(mode === 'read_write'
        ? `${nameOf(c)} can now send after approval in Claude. If Claude doesn’t show the send tools yet, start a new chat or reconnect OOMS in Claude’s Connectors settings.`
        : `${nameOf(c)} is read-only again`, { duration: 6000 });
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
    if (payload?.url) setReveal({ open: true, url: payload.url, writable: payload.connectors?.find((c) => c.id === payload.id)?.access_mode === 'read_write' });
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
          <p className="mt-0.5 text-[12.5px] text-slate-500">Use OOMS inside Claude: add a connector URL in Claude → Settings → Connectors. Each connector is read-only unless you allow read &amp; write.</p>
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
                    <span className="mr-1">
                      <AccessToggle
                        name={nameOf(c)}
                        value={c.access_mode === 'read_write' ? 'read_write' : 'read'}
                        disabled={busyId === c.id}
                        onChange={(mode) => (mode === 'read_write' ? setWriteTarget(c) : setMode(c, 'read'))}
                      />
                    </span>
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
      <UrlDialog open={reveal.open} url={reveal.url} writable={reveal.writable} isPublic={Boolean(data?.public)} onClose={() => setReveal({ open: false, url: '' })} />
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
