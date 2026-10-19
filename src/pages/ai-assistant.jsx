import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiEdit, FiMessageSquare, FiTrash2, FiZap } from 'react-icons/fi';
import { Header, Sidebar } from '../components/header';
import AiChatPanel from '../components/ai/AiChatPanel';
import useAiChat, { readActiveConversation } from '../components/ai/useAiChat';
import ConfirmActionModal from '../components/ConfirmActionModal';
import useAiStatus from '../components/ai/useAiStatus';
import { deleteAiConversation, listAiConversations } from '../utils/ai-api';

function relativeTime(value) {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function AiAssistantPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('sidebarMinimized');
    return saved ? JSON.parse(saved) : false;
  });
  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  const aiStatus = useAiStatus();
  const aiEnabled = aiStatus.enabled;
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refreshList = useCallback(async () => {
    try {
      setConversations(await listAiConversations());
    } catch (_) {
      // List is a convenience; the chat itself still works.
    } finally {
      setListLoading(false);
    }
  }, []);

  const chat = useAiChat({
    onConversationChange: (id) => {
      setSearchParams(id ? { c: id } : {}, { replace: true });
    },
  });
  const { loadConversation, conversationId, sending, newChat } = chat;

  // Open the conversation from ?c=… (drawer "open full page"), else resume the active one.
  const requested = searchParams.get('c');
  const initRef = useRef(false);
  useEffect(() => {
    if (!aiEnabled) return;
    const target = requested || (!initRef.current ? readActiveConversation() : null);
    initRef.current = true;
    if (target && target !== conversationId) loadConversation(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested, aiEnabled]);

  useEffect(() => {
    if (aiEnabled) refreshList();
  }, [refreshList, aiEnabled]);

  // Refresh history once an answer finishes (new conversation titles / ordering).
  const wasSending = useRef(false);
  useEffect(() => {
    if (wasSending.current && !sending) refreshList();
    wasSending.current = sending;
  }, [sending, refreshList]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAiConversation(pendingDelete.conversation_id);
      if (pendingDelete.conversation_id === conversationId) newChat();
      setConversations((list) => list.filter((c) => c.conversation_id !== pendingDelete.conversation_id));
      toast.success('Conversation deleted');
    } catch (_) {
      toast.error('Could not delete the conversation');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

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

      <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="mx-2 my-3 flex h-[calc(100dvh-5.5rem)] min-h-[480px] flex-col sm:mx-4 md:mx-8 md:my-4">
          {aiStatus.loading ? (
            <div className="flex-1 animate-pulse rounded-2xl border border-slate-200 bg-white" aria-busy="true" />
          ) : !aiEnabled ? (
            <div className="ui-card flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <FiZap className="h-5 w-5" />
              </span>
              <p className="text-[15px] font-semibold text-slate-900">The AI assistant is not enabled for this office</p>
              {aiStatus.can_manage ? (
                <Link to="/settings/ai-assistant" className="ui-btn ui-btn-primary">Set up AI Assistant</Link>
              ) : (
                <p className="text-sm text-slate-500">Ask your branch admin to turn it on in Settings → AI Assistant.</p>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* History */}
              <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/60 md:flex">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 text-white">
                      <FiZap className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-display text-[14px] font-semibold text-slate-900">Assistant</span>
                  </div>
                  <button type="button" onClick={newChat} className="ui-btn ui-btn-secondary ui-btn-sm" title="New chat">
                    <FiEdit className="h-3.5 w-3.5" /> New
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-2">
                  {listLoading ? (
                    [0, 1, 2, 3].map((i) => <div key={i} className="mb-1.5 h-11 animate-pulse rounded-lg bg-slate-100" />)
                  ) : conversations.length === 0 ? (
                    <p className="px-2 py-6 text-center text-[12px] text-slate-500">No conversations yet.</p>
                  ) : (
                    conversations.map((c) => {
                      const active = c.conversation_id === conversationId;
                      return (
                        <div
                          key={c.conversation_id}
                          className={`group mb-1 flex items-center gap-1 rounded-lg ${active ? 'bg-indigo-50' : 'hover:bg-white'}`}
                        >
                          <button
                            type="button"
                            disabled={sending}
                            onClick={() => loadConversation(c.conversation_id)}
                            className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2 text-left"
                          >
                            <FiMessageSquare className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className="min-w-0">
                              <span className={`block truncate text-[12.5px] ${active ? 'font-semibold text-indigo-700' : 'text-slate-700'}`}>
                                {c.title || 'New chat'}
                              </span>
                              <span className="block text-[11px] text-slate-400">{relativeTime(c.last_message_at)}</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(c)}
                            className="mr-1 rounded-md p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                            title="Delete conversation"
                            aria-label="Delete conversation"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </aside>

              {/* Chat */}
              <section className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 md:hidden">
                  <span className="font-display text-[14px] font-semibold text-slate-900">OOMS Assistant</span>
                  <button type="button" onClick={newChat} className="ui-btn ui-btn-secondary ui-btn-sm">
                    <FiEdit className="h-3.5 w-3.5" /> New
                  </button>
                </div>
                <div className="mx-auto flex w-full max-w-4xl flex-1 min-h-0 flex-col">
                  <AiChatPanel chat={chat} />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(pendingDelete)}
        title="Delete conversation"
        heading="Delete this conversation?"
        message="The chat history will be removed from your list."
        tone="danger"
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
