import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import {
  FiSend,
  FiX,
  FiMessageSquare,
  FiUser,
  FiPhone,
  FiShield,
  FiDatabase,
  FiActivity,
  FiBarChart2,
  FiUsers,
  FiRefreshCw,
  FiChevronDown
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const formatTime = (date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Custom OMI avatar
const OmiAvatar = ({ isTyping }) => (
  <div className="relative flex-shrink-0">
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow border border-white/20">
      <span className="text-white font-extrabold text-[10px] tracking-wider">OMI</span>
    </div>
    <span className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-white ${isTyping ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`} />
  </div>
);

const OmiFloatingBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('omi_session_id') || '');
  const [botState, setBotState] = useState('init'); // init, waiting_for_phone, verified
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem('omi_chat_history');
    if (savedMessages) {
      try { return JSON.parse(savedMessages); } catch {}
    }
    return [
      {
        id: 'initial',
        sender: 'omi',
        text: 'Hello! I am **OMI**, your OOMS Personal Assistant. What is your name?',
        time: formatTime(new Date())
      }
    ];
  });
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('omi_chat_history', JSON.stringify(messages));
    if (sessionId) {
      localStorage.setItem('omi_session_id', sessionId);
    } else {
      localStorage.removeItem('omi_session_id');
    }
  }, [messages, sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  // Markdown Formatter (bold, bullets, line breaks)
  const formatMessageText = (text) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    let inList = false;
    const formatted = [];

    lines.forEach((line, idx) => {
      let currentLine = line;
      
      const boldRegex = /\*\*([^*]+)\*\*/g;
      currentLine = currentLine.replace(boldRegex, '<strong class="font-bold text-slate-800">$1</strong>');
      
      if (currentLine.trim().startsWith('* ') || currentLine.trim().startsWith('- ')) {
        const itemText = currentLine.replace(/^[*|-]\s+/, '');
        if (!inList) {
          inList = true;
          formatted.push('<ul class="list-disc pl-5 space-y-1 mb-2 text-slate-600">');
        }
        formatted.push(`<li>${itemText}</li>`);
      } else {
        if (inList) {
          inList = false;
          formatted.push('</ul>');
        }
        
        if (currentLine.trim().startsWith('### ')) {
          formatted.push(`<h4 class="text-xs font-bold text-blue-600 mt-2 mb-1 uppercase tracking-wider">${currentLine.replace(/^###\s+/, '')}</h4>`);
        } else if (currentLine.trim().startsWith('## ')) {
          formatted.push(`<h3 class="text-sm font-bold text-indigo-650 mt-3 mb-2">${currentLine.replace(/^##\s+/, '')}</h3>`);
        } else if (currentLine.trim()) {
          formatted.push(`<p class="mb-1.5 text-slate-650 leading-relaxed">${currentLine}</p>`);
        } else {
          formatted.push('<div class="h-1.5"></div>');
        }
      }
    });

    if (inList) {
      formatted.push('</ul>');
    }

    return <div dangerouslySetInnerHTML={{ __html: formatted.join('') }} className="space-y-0.5 text-xs text-slate-700" />;
  };

  // Chat Submission
  const handleSendMessage = async (textToSend) => {
    const text = textToSend?.trim() || inputValue.trim();
    if (!text) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: text,
      time: formatTime(new Date())
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const headers = getHeaders() || {};
      const res = await axios.post(
        `${API_BASE_URL}/bot/chat`,
        {
          message: text,
          session_id: sessionId || undefined
        },
        { headers }
      );

      if (res.data?.success) {
        setSessionId(res.data.session_id || '');
        setBotState(res.data.state || 'init');
        
        const botMsg = {
          id: `bot_${Date.now()}`,
          sender: 'omi',
          text: res.data.reply || 'No response from assistant.',
          time: formatTime(new Date())
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Error communicating with OMI Bot.');
    } finally {
      setIsTyping(false);
    }
  };

  // Reset Session
  const handleResetSession = async () => {
    setIsTyping(true);
    try {
      if (sessionId) {
        const headers = getHeaders() || {};
        await axios.post(`${API_BASE_URL}/bot/reset`, { session_id: sessionId }, { headers });
      }
    } catch (e) {
      console.error('Failed to call reset API:', e);
    } finally {
      setSessionId('');
      setBotState('init');
      setMessages([
        {
          id: `reset_${Date.now()}`,
          sender: 'omi',
          text: 'Hello! I am **OMI**, your OOMS Personal Assistant. What is your name?',
          time: formatTime(new Date())
        }
      ]);
      localStorage.removeItem('omi_session_id');
      localStorage.removeItem('omi_chat_history');
      setIsTyping(false);
      toast.success('OMI Bot session reset.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const starters = [
    { label: 'Check Wallet', query: 'what is my wallet balance?', icon: <FiDatabase className="text-emerald-500" /> },
    { label: 'Pending Tasks', query: 'show pending tasks', icon: <FiActivity className="text-cyan-500" /> },
    { label: 'Outstanding Fees', query: 'what are my pending fees?', icon: <FiBarChart2 className="text-rose-500" /> },
    { label: 'Active Clients', query: 'how many clients do we have?', icon: <FiUsers className="text-indigo-500" /> },
  ];

  return (
    <>
      {/* Floating launcher button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-750 text-white flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/20"
        title="Open OOMS Metrics Assistant"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FiChevronDown className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center"
            >
              <FiMessageSquare className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Floating Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed bottom-24 right-6 w-[360px] sm:w-[380px] h-[500px] max-h-[calc(100vh-8rem)] z-50 bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-650 p-4 text-white flex justify-between items-center shadow-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <span className="font-extrabold text-[10px] tracking-wider">OMI</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black uppercase tracking-wider">OMI Assistant</h3>
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  </div>
                  <p className="text-[9px] text-blue-100">OOMS Metrics Intelligence</p>
                </div>
              </div>

              {/* Status Badge & Reset Controls */}
              <div className="flex items-center gap-2">
                {botState === 'verified' && (
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-0.5" title="Identity Verified">
                    <FiShield className="w-2.5 h-2.5" /> Verified
                  </span>
                )}
                
                <button
                  onClick={handleResetSession}
                  title="Reset conversation state"
                  className="p-1 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white transition-all"
                >
                  <FiRefreshCw className="w-3.5 h-3.5" />
                </button>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white transition-all"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 min-h-0 bg-slate-50/50 p-4 overflow-y-auto space-y-3.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex gap-2 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                    {!isUser && <OmiAvatar isTyping={false} />}
                    <div>
                      <div className={`p-3 rounded-2xl ${
                        isUser
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-650 text-white rounded-tr-none shadow-sm'
                          : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none shadow-sm'
                      }`}>
                        {isUser ? <p className="text-xs leading-relaxed font-sans">{msg.text}</p> : formatMessageText(msg.text)}
                      </div>
                      <span className={`text-[8px] text-slate-400 mt-1 block font-mono ${isUser ? 'text-right' : 'text-left'}`}>{msg.time}</span>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-2 max-w-[80%] items-start">
                  <OmiAvatar isTyping={true} />
                  <div className="bg-white border border-slate-250/60 px-3 py-2 rounded-2xl rounded-tl-none shadow-sm">
                    <div className="flex items-center gap-1 py-0.5">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-blue-700 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Starters (Intent buttons) */}
            {botState === 'verified' && (
              <div className="p-2 border-t border-slate-100 bg-white grid grid-cols-2 gap-1 shrink-0">
                {starters.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(card.query)}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 hover:border-blue-500/40 rounded-xl text-left transition-all flex items-center gap-2 group text-[10px]"
                  >
                    <div className="p-1 bg-white rounded border border-slate-200 group-hover:scale-105 transition-transform">
                      {card.icon}
                    </div>
                    <span className="font-semibold text-slate-700 truncate group-hover:text-slate-900">{card.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-100 shrink-0">
              <div className="flex bg-slate-50 border border-slate-200/80 focus-within:border-blue-500/50 rounded-xl overflow-hidden shadow-inner transition-all duration-300">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    botState === 'init' ? 'Type your name to begin...' :
                    botState === 'waiting_for_phone' ? 'Enter mobile to verify...' :
                    'Ask OMI about metrics or tasks...'
                  }
                  className="flex-1 px-3 py-2 bg-transparent text-xs text-slate-700 outline-none placeholder-slate-400"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isTyping}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-750 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-450 text-white font-bold transition-all flex items-center justify-center shrink-0"
                >
                  <FiSend className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OmiFloatingBot;
