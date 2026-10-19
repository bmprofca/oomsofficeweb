import React, { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiZap } from 'react-icons/fi';
import AiAssistantDrawer from './AiAssistantDrawer';
import useAiStatus from './useAiStatus';

/**
 * "Ask AI" button in the global header; opens the assistant drawer on any page.
 * Shown only when the current branch has enabled the assistant (Settings → AI Assistant).
 */
export default function AiHeaderButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { enabled } = useAiStatus();
  const close = useCallback(() => setOpen(false), []);

  if (!enabled || location.pathname.startsWith('/ai-assistant')) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
        title="Ask the OOMS Assistant"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <FiZap className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Ask AI</span>
      </button>
      <AiAssistantDrawer open={open} onClose={close} />
    </>
  );
}
