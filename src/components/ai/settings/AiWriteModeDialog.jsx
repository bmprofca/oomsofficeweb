import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCheck, FiShield } from 'react-icons/fi';
import AiSettingsModal from './AiSettingsModal';

export const WRITE_ACTIONS = [
  { title: 'Send WhatsApp messages', detail: 'Free-text messages to your clients and team (needs the OOMS Web WhatsApp channel).' },
  { title: 'Send emails', detail: 'From your office email settings, to clients and team members.' },
  { title: 'Share client documents', detail: 'Documents stored in a client’s profile, by WhatsApp and/or email.' },
  { title: 'Share ledger statements', detail: 'A client’s ledger statement PDF for a period.' },
];

/**
 * Confirmation before switching the assistant (or a connector) to read & write.
 * The server also requires this acknowledgement (acknowledge_write).
 */
export default function AiWriteModeDialog({ open, onClose, onConfirm, busy, target = 'the AI Assistant', connector = false }) {
  const [agreed, setAgreed] = useState(false);
  useEffect(() => {
    if (open) setAgreed(false);
  }, [open]);

  return (
    <AiSettingsModal
      open={open}
      onClose={onClose}
      busy={busy}
      size="max-w-lg"
      labelledBy="ai-write-mode-title"
      title="Turn on read & write?"
      subtitle={`${target} will be able to send messages and share documents on behalf of your office.`}
      icon={<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><FiAlertTriangle className="h-4 w-4" /></span>}
      footer={(
        <>
          <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose} disabled={busy}>Keep read-only</button>
          <button type="button" className="ui-btn ui-btn-primary" onClick={onConfirm} disabled={!agreed || busy}>
            {busy ? 'Saving…' : 'Turn on read & write'}
          </button>
        </>
      )}
    >
      <div className="space-y-4 text-[13.5px] text-slate-600">
        <div>
          <p className="font-semibold text-slate-900">What it can do</p>
          <ul className="mt-1.5 space-y-1.5">
            {WRITE_ACTIONS.map((a) => (
              <li key={a.title} className="flex gap-2">
                <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <span><span className="font-medium text-slate-800">{a.title}.</span> {a.detail}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[12.5px] text-slate-500">It cannot create, edit or delete tasks, clients, entries or any other records.</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
          <p className="flex items-center gap-1.5 font-semibold text-emerald-900"><FiShield className="h-4 w-4" /> Safeguards</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[12.5px] text-emerald-900">
            <li>
              {connector
                ? 'Nothing is sent until the person using Claude approves it (Claude asks before every send).'
                : 'Nothing is sent until the person who asked clicks Confirm on a preview showing exactly what will go out.'}
            </li>
            <li>Only to this office’s own clients and team members, using the contact details saved in OOMS.</li>
            <li>Follows each person’s permissions: messages need “Send Broadcast”, ledger statements need “Finance Report”.</li>
            <li>Messages are checked so no internal or system details are sent. Every send is logged.</li>
            <li>You can switch back to read-only at any time.</li>
          </ul>
        </div>
        <label className="flex items-start gap-2 text-[13px] text-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          I understand that messages and documents will be sent in my office’s name after confirmation.
        </label>
      </div>
    </AiSettingsModal>
  );
}
