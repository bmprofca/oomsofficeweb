import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiMaximize2, FiX, FiZap } from 'react-icons/fi';
import AiChatPanel from './AiChatPanel';
import useAiChat, { readActiveConversation } from './useAiChat';

/**
 * Right-side assistant drawer opened from the header on any page.
 * Resumes the last conversation of this user + branch for the browser session.
 */
export default function AiAssistantDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const chat = useAiChat();
  const panelRef = useRef(null);
  const { loadConversation, conversationId, sending, messages, newChat } = chat;
  const stateRef = useRef({ sending, conversationId, messages });
  stateRef.current = { sending, conversationId, messages };

  // Every page mounts its own Header (and kept-alive pages keep theirs), so on each open
  // sync with the conversation that is active for this user + branch in this browser tab.
  useEffect(() => {
    if (!open) return;
    const { sending: busy, conversationId: current, messages: shown } = stateRef.current;
    if (busy) return;
    const active = readActiveConversation();
    if (active) loadConversation(active);
    else if (current || shown.length) newChat();
  }, [open, loadConversation, newChat]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const openFullPage = () => {
    onClose();
    navigate(conversationId ? `/ai-assistant?c=${encodeURIComponent(conversationId)}` : '/ai-assistant');
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10040] flex justify-end overflow-hidden overscroll-none pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] pointer-events-auto sm:bg-slate-900/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="OOMS Assistant"
            className="relative z-[1] flex h-full w-full flex-col bg-slate-50 shadow-2xl pointer-events-auto sm:w-[460px] sm:border-l sm:border-slate-200"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 text-white">
                <FiZap className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[14px] font-semibold text-slate-900">OOMS Assistant</p>
                <p className="truncate text-[11px] text-slate-500">Answers from your office data</p>
              </div>
              <button type="button" onClick={chat.newChat} className="ui-btn ui-btn-ghost ui-btn-icon ui-btn-sm" title="New chat" aria-label="New chat">
                <FiEdit className="h-4 w-4" />
              </button>
              <button type="button" onClick={openFullPage} className="ui-btn ui-btn-ghost ui-btn-icon ui-btn-sm" title="Open full page" aria-label="Open full page">
                <FiMaximize2 className="h-4 w-4" />
              </button>
              <button type="button" onClick={onClose} className="ui-btn ui-btn-ghost ui-btn-icon ui-btn-sm" title="Close (Esc)" aria-label="Close">
                <FiX className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 min-h-0">
              <AiChatPanel chat={chat} compact />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
