import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiArrowUp, FiRefreshCw, FiSquare, FiZap } from 'react-icons/fi';
import { useUserPermissions } from '../../utils/permission-helper';
import AiMarkdown from './blocks/AiMarkdown';
import BlockRenderer from './blocks/BlockRenderer';

// Suggestions are filtered by permission only to avoid offering prompts the user
// cannot use; the server enforces the real rules on every tool call.
const SUGGESTIONS = [
  { text: 'Show my pending tasks', perm: null },
  { text: 'Which tasks are overdue?', perm: null },
  { text: 'Who is absent today?', perm: 'staff_view_manage' },
  { text: 'Show the attendance report for last month', perm: 'staff_view_manage' },
  { text: 'Show employee-wise task completion statistics', perm: 'task_summary_view' },
  { text: 'Show me the outstanding balances', perm: 'finance_balance_view' },
  { text: "Compare this month's expenses with last month", perm: 'finance_report' },
  { text: 'Summarize my office activities for this week', perm: 'dashboard_statistics_view' },
];

function AssistantAvatar() {
  return (
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 text-white">
      <FiZap className="h-3.5 w-3.5" />
    </span>
  );
}

function Message({ message, onRetry, onOption, sending }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2 text-[13.5px] text-white">
          {message.text}
        </div>
      </div>
    );
  }

  const blocks = message.blocks || [];
  return (
    <div className="flex gap-2.5">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 space-y-2.5">
        {message.pending && !message.text && (
          <div className="flex items-center gap-2 py-1 text-[13px] text-slate-500" role="status" aria-live="polite">
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
            </span>
            {message.statusLabel || 'Thinking…'}
          </div>
        )}
        {message.text && !message.error && <AiMarkdown text={message.text} />}
        {blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} onOption={onOption} disabled={sending} />
        ))}
        {message.error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p>{message.error.message}</p>
              {message.error.retryable && message.error.retryText && (
                <button
                  type="button"
                  onClick={() => onRetry(message)}
                  disabled={sending}
                  className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  <FiRefreshCw className="h-3 w-3" /> Retry
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiChatPanel({ chat, compact = false, autoFocus = true }) {
  const { messages, sending, loadingHistory, send, stop, retry } = chat;
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const { check } = useUserPermissions();

  const suggestions = useMemo(() => SUGGESTIONS.filter((s) => !s.perm || check(s.perm)).slice(0, compact ? 4 : 6), [check, compact]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Auto-grow the textarea up to ~5 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [draft]);

  const submit = (text = draft) => {
    const value = String(text).trim();
    if (!value || sending) return;
    send(value);
    setDraft('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 space-y-4 overflow-y-auto overscroll-y-contain px-4 py-4">
        {loadingHistory ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-10 animate-pulse rounded-xl bg-slate-100 ${i % 2 ? 'ml-auto w-1/2' : 'w-3/4'}`} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <FiZap className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-[15px] font-semibold text-slate-900">Ask about your office</h3>
            <p className="mt-1 max-w-sm text-[13px] text-slate-500">
              Tasks, attendance, balances and reports — answered from your OOMS data, within your permissions.
            </p>
            <div className={`mt-4 grid w-full max-w-lg gap-2 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
              {suggestions.map((s) => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => submit(s.text)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[12.5px] text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700"
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Message key={m.id} message={m} onRetry={retry} onOption={(opt) => submit(opt)} sending={sending} />)
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-3 pb-3 pt-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15"
        >
          <label htmlFor="ai-chat-input" className="sr-only">Ask the OOMS assistant</label>
          <textarea
            id="ai-chat-input"
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask about tasks, attendance, balances…"
            className="max-h-[132px] min-h-[36px] flex-1 resize-none border-0 bg-transparent py-1.5 text-[13.5px] text-slate-800 outline-none placeholder:text-slate-400 [scrollbar-width:none]"
          />
          {sending ? (
            <button type="button" onClick={stop} className="ui-btn ui-btn-secondary ui-btn-icon ui-btn-sm mb-0.5" title="Stop" aria-label="Stop">
              <FiSquare className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              className="ui-btn ui-btn-primary ui-btn-icon ui-btn-sm mb-0.5"
              title="Send"
              aria-label="Send"
            >
              <FiArrowUp className="h-4 w-4" />
            </button>
          )}
        </form>
        <p className="mt-1.5 px-1 text-[11px] text-slate-400">Read-only assistant. Check important figures in the related OOMS screen.</p>
      </div>
    </div>
  );
}
