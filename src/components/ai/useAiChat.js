import { useCallback, useEffect, useRef, useState } from 'react';
import { AiChatError, getAiConversation, streamChat } from '../../utils/ai-api';

let localId = 0;
const nextId = () => `local-${Date.now()}-${(localId += 1)}`;

/** sessionStorage key scoped to user + branch so a branch switch never resumes another branch's chat. */
function activeKey() {
  const user = localStorage.getItem('user_username') || '';
  const branch = localStorage.getItem('branch_id') || '';
  return `ooms_ai_active:${user}:${branch}`;
}

export function readActiveConversation() {
  try {
    return sessionStorage.getItem(activeKey()) || null;
  } catch (_) {
    return null;
  }
}

function writeActiveConversation(id) {
  try {
    if (id) sessionStorage.setItem(activeKey(), id);
    else sessionStorage.removeItem(activeKey());
  } catch (_) {
    /* private mode — chat still works for this session */
  }
}

/**
 * Chat state machine shared by the drawer and the full page.
 * messages: [{ id, role: 'user'|'assistant', text, blocks, status, pending, statusLabel, error }]
 */
export default function useAiChat({ initialConversationId = null, onConversationChange } = {}) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const abortRef = useRef(null);
  const sendingRef = useRef(false);
  const changeRef = useRef(onConversationChange);
  changeRef.current = onConversationChange;

  const setActive = useCallback((id) => {
    setConversationId(id);
    writeActiveConversation(id);
    changeRef.current?.(id);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateMessage = (id, patch) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)));

  const send = useCallback(
    async (rawText) => {
      const text = String(rawText || '').trim();
      if (!text || sendingRef.current) return; // prevent duplicate submissions
      sendingRef.current = true;
      setSending(true);

      const assistantId = nextId();
      setMessages((list) => [
        ...list,
        { id: nextId(), role: 'user', text },
        { id: assistantId, role: 'assistant', text: '', blocks: [], pending: true, statusLabel: 'Thinking…' },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      let activeId = conversationId;

      try {
        await streamChat({
          message: text,
          conversationId: activeId,
          signal: controller.signal,
          onEvent: ({ event, data }) => {
            if (event === 'meta' && data?.conversation_id && data.conversation_id !== activeId) {
              activeId = data.conversation_id;
              setActive(activeId);
            } else if (event === 'status') {
              updateMessage(assistantId, { statusLabel: data?.label || 'Working…' });
            } else if (event === 'block') {
              updateMessage(assistantId, (m) => ({ blocks: [...(m.blocks || []), data] }));
            } else if (event === 'text') {
              updateMessage(assistantId, { text: data?.text || '' });
            } else if (event === 'done') {
              updateMessage(assistantId, { pending: false, status: data?.status || 'ok', statusLabel: null });
            }
          },
        });
      } catch (err) {
        if (err?.name === 'AbortError') {
          updateMessage(assistantId, { pending: false, statusLabel: null, text: 'Stopped.', status: 'partial' });
        } else {
          const e = err instanceof AiChatError ? err : new AiChatError('UNKNOWN', 'Something went wrong. Please try again.');
          if (e.conversationId && e.conversationId !== activeId) setActive(e.conversationId);
          updateMessage(assistantId, {
            pending: false,
            statusLabel: null,
            error: { message: e.message, retryable: e.retryable, retryText: text, code: e.code },
          });
        }
      } finally {
        sendingRef.current = false;
        setSending(false);
        abortRef.current = null;
      }
    },
    [conversationId, setActive]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const retry = useCallback(
    (failed) => {
      if (!failed?.error?.retryText) return;
      // Drop the failed user/assistant pair; send() re-adds the question.
      setMessages((list) => {
        const idx = list.findIndex((m) => m.id === failed.id);
        return idx > 0 ? [...list.slice(0, idx - 1), ...list.slice(idx + 1)] : list;
      });
      send(failed.error.retryText);
    },
    [send]
  );

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setActive(null);
  }, [setActive]);

  const loadConversation = useCallback(
    async (id) => {
      if (!id) return;
      abortRef.current?.abort();
      setLoadingHistory(true);
      try {
        const data = await getAiConversation(id);
        const list = (data?.messages || []).map((m) => ({
          id: m.message_id,
          role: m.role,
          text: m.content || '',
          blocks: Array.isArray(m.blocks) ? m.blocks : [],
          status: m.status,
          ...(m.status === 'error' ? { error: { message: m.content, retryable: false } } : {}),
        }));
        setMessages(list);
        setActive(id);
      } catch (err) {
        // Conversation gone (deleted / other branch): start fresh instead of failing.
        setMessages([]);
        setActive(null);
      } finally {
        setLoadingHistory(false);
      }
    },
    [setActive]
  );

  return { messages, conversationId, sending, loadingHistory, send, stop, retry, newChat, loadConversation };
}
