import React, { useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiClock, FiLoader, FiSend, FiXCircle } from 'react-icons/fi';
import { cancelAiAction, confirmAiAction } from '../../../utils/ai-api';

/**
 * Confirmation card for a write action the assistant prepared (read-write mode):
 * exactly what will be sent, to whom, on which channel. Nothing happens until the
 * user clicks Confirm. Block contract: SERVER/ai/blocks.js actionBlock.
 */

const DONE = {
  done: { icon: FiCheckCircle, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', label: 'Sent' },
  partial: { icon: FiAlertCircle, tone: 'border-amber-200 bg-amber-50 text-amber-900', label: 'Partly sent' },
  failed: { icon: FiXCircle, tone: 'border-red-200 bg-red-50 text-red-700', label: 'Not sent' },
  cancelled: { icon: FiXCircle, tone: 'border-slate-200 bg-slate-50 text-slate-600', label: 'Cancelled' },
  expired: { icon: FiClock, tone: 'border-slate-200 bg-slate-50 text-slate-600', label: 'Expired' },
  executing: { icon: FiLoader, tone: 'border-slate-200 bg-slate-50 text-slate-600', label: 'Sending' },
};

const CHANNEL = { email: 'Email', whatsapp: 'WhatsApp' };

export default function AiActionBlock({ block }) {
  const [state, setState] = useState(block.state || { status: 'pending' });
  const [busy, setBusy] = useState(null); // 'confirm' | 'cancel'

  const run = async (kind) => {
    setBusy(kind);
    try {
      const data = kind === 'confirm' ? await confirmAiAction(block.action_id) : await cancelAiAction(block.action_id);
      setState({ status: data?.status || (kind === 'cancel' ? 'cancelled' : 'done'), message: data?.message, channels: data?.channels });
    } catch (err) {
      const res = err?.response?.data;
      if (res?.data?.status) setState({ status: res.data.status, message: res.message, channels: res.data.channels });
      else setState((s) => ({ ...s, error: res?.message || 'Could not complete this. Please try again.' }));
    } finally {
      setBusy(null);
    }
  };

  const pending = state.status === 'pending';
  const outcome = DONE[state.status];
  const OutcomeIcon = outcome?.icon;

  return (
    <div className="rounded-xl border border-indigo-200 bg-white p-3 shadow-sm" role="group" aria-label={block.title}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><FiSend className="h-3.5 w-3.5" /></span>
        <p className="text-[14px] font-semibold text-slate-900">{block.title}</p>
        {pending && <span className="ui-badge ui-badge-warning ml-auto">Needs your confirmation</span>}
        {outcome && <span className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium ${outcome.tone}`}><OutcomeIcon className="h-3 w-3" />{outcome.label}</span>}
      </div>

      <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        {(block.fields || []).map((f) => (
          <React.Fragment key={`${f.label}:${f.value}`}>
            <dt className="text-slate-500">{f.label}</dt>
            <dd className="break-words font-medium text-slate-800">{f.value}</dd>
          </React.Fragment>
        ))}
      </dl>

      {block.items?.length > 0 && (
        <ul className="mt-2 space-y-0.5 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] text-slate-700">
          {block.items.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      )}
      {block.body && (
        <div className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800">{block.body}</div>
      )}

      {state.message && !pending && (
        <p className={`mt-2.5 rounded-lg border px-3 py-2 text-[12.5px] ${outcome?.tone || 'border-slate-200 bg-slate-50 text-slate-700'}`} role="status">
          {state.message}
          {state.channels && Object.keys(state.channels).length > 1 && (
            <span className="mt-1 block">
              {Object.entries(state.channels).map(([ch, r]) => `${CHANNEL[ch] || ch}: ${r.status === 'sent' ? 'sent' : `failed${r.reason ? ` (${r.reason})` : ''}`}`).join(' · ')}
            </span>
          )}
        </p>
      )}
      {state.error && <p className="mt-2 text-[12.5px] text-red-600" role="alert">{state.error}</p>}

      {pending && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-[11.5px] text-slate-400">Review carefully. Expires in {block.expires_minutes || 15} min.</span>
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => run('cancel')} disabled={Boolean(busy)}>
            {busy === 'cancel' ? 'Cancelling…' : 'Cancel'}
          </button>
          <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => run('confirm')} disabled={Boolean(busy)}>
            {busy === 'confirm' ? <><FiLoader className="h-3.5 w-3.5 animate-spin" /> Sending…</> : <><FiSend className="h-3.5 w-3.5" /> Confirm &amp; send</>}
          </button>
        </div>
      )}
    </div>
  );
}
