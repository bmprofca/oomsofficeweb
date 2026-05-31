import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Sidebar, Header } from '../../components/header';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import {
  FiSend,
  FiX,
  FiMessageSquare,
  FiUser,
  FiPhone,
  FiShield,
  FiCheckCircle,
  FiActivity,
  FiBarChart2,
  FiUsers,
  FiDatabase,
  FiRefreshCw
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const formatTime = (date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// OMI Bot Avatar Component
const OmiAvatar = ({ isTyping }) => (
  <div className="relative flex-shrink-0">
    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-500/20 border border-white/10">
      <span className="text-white font-extrabold text-xs tracking-wider">OMI</span>
    </div>
    <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-slate-900 ${isTyping ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`} />
    {!isTyping && (
      <span className="absolute -inset-0.5 rounded-full bg-emerald-500 opacity-25 animate-ping pointer-events-none" />
    )}
  </div>
);

const OmiBot = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));

  // Chat conversation states
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

  // Sync isMinimized state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  // Save chat history and session ID
  useEffect(() => {
    localStorage.setItem('omi_chat_history', JSON.stringify(messages));
    if (sessionId) {
      localStorage.setItem('omi_session_id', sessionId);
    } else {
      localStorage.removeItem('omi_session_id');
    }
  }, [messages, sessionId]);

  // Keep chat scrolled to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Custom Message Formatter (supports **bold**, lists, headers)
  const formatMessageText = (text) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    let inList = false;
    const formatted = [];

    lines.forEach((line, idx) => {
      let currentLine = line;
      
      // Parse Bold (**text**)
      const boldRegex = /\*\*([^*]+)\*\*/g;
      currentLine = currentLine.replace(boldRegex, '<strong class="font-bold text-white">$1</strong>');
      
      // Parse List items starting with * or -
      if (currentLine.trim().startsWith('* ') || currentLine.trim().startsWith('- ')) {
        const itemText = currentLine.replace(/^[*|-]\s+/, '');
        if (!inList) {
          inList = true;
          formatted.push('<ul class="list-disc pl-5 space-y-1 mb-2 text-slate-350">');
        }
        formatted.push(`<li>${itemText}</li>`);
      } else {
        if (inList) {
          inList = false;
          formatted.push('</ul>');
        }
        
        // Parse sub-headers
        if (currentLine.trim().startsWith('### ')) {
          formatted.push(`<h4 class="text-xs font-bold text-cyan-400 mt-3 mb-1 uppercase tracking-wider">${currentLine.replace(/^###\s+/, '')}</h4>`);
        } else if (currentLine.trim().startsWith('## ')) {
          formatted.push(`<h3 class="text-sm font-bold text-indigo-400 mt-4 mb-2">${currentLine.replace(/^##\s+/, '')}</h3>`);
        } else if (currentLine.trim()) {
          formatted.push(`<p class="mb-2 text-slate-300 leading-relaxed">${currentLine}</p>`);
        } else {
          formatted.push('<div class="h-2"></div>');
        }
      }
    });

    if (inList) {
      formatted.push('</ul>');
    }

    return <div dangerouslySetInnerHTML={{ __html: formatted.join('') }} className="space-y-1 font-sans text-sm" />;
  };

  // Send Message to Bot API
  const handleSendMessage = async (textToSend) => {
    const text = textToSend?.trim() || inputValue.trim();
    if (!text) return;

    // Add user message locally
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
        
        // Add bot message response
        const botMsg = {
          id: `bot_${Date.now()}`,
          sender: 'omi',
          text: res.data.reply || 'No response from assistant.',
          time: formatTime(new Date())
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        toast.error('Bot request failed');
      }
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Error communicating with OMI Bot.');
    } finally {
      setIsTyping(false);
    }
  };

  // Reset Session Handler
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
      toast.success('OMI Bot session reset successfully.');
    }
  };

  // Keypress event handler
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Dynamic intent floating shortcuts
  const starters = [
    { label: 'Check Wallet Balance', query: 'what is my balance?', icon: <FiDatabase className="text-emerald-400" /> },
    { label: 'Pending Tasks List', query: 'show pending tasks', icon: <FiActivity className="text-cyan-400" /> },
    { label: 'Outstanding Fees due', query: 'what are my pending fees?', icon: <FiBarChart2 className="text-rose-400" /> },
    { label: 'Active Clients Count', query: 'how many clients do we have?', icon: <FiUsers className="text-indigo-400" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-105 flex flex-col">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} title="OMI Assistant" subtitle="Conversational bot powered by metrics database" />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

      <div className={`flex-1 pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'} flex flex-col h-screen overflow-hidden bg-slate-950`}>
        <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 flex flex-col h-[calc(100vh-4rem)]">
          
          {/* Glowing Glassmorphic Bot Header */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl mb-4 relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-24 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                <FiMessageSquare className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">OMI Assistant</h2>
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                </div>
                <p className="text-[10px] text-slate-405 mt-0.5">OOMS Metric Intelligence Engine v1.0</p>
              </div>
            </div>

            {/* Verification State Badge */}
            <div className="flex items-center gap-3">
              {botState === 'init' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <FiUser className="w-3 h-3" /> State: Init
                </span>
              )}
              {botState === 'waiting_for_phone' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1 animate-pulse">
                  <FiPhone className="w-3 h-3" /> Needs Phone
                </span>
              )}
              {botState === 'verified' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 flex items-center gap-1 shadow-sm shadow-emerald-500/5">
                  <FiShield className="w-3 h-3 text-emerald-450" /> Identity Verified
                </span>
              )}

              <button
                onClick={handleResetSession}
                title="Reset conversation state"
                className="p-1.5 bg-slate-800 hover:bg-red-950/30 hover:border-red-900 border border-slate-700/50 rounded-xl text-slate-400 hover:text-red-400 transition-all duration-300"
              >
                <FiRefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Feed Area */}
          <div className="flex-1 min-h-0 bg-slate-900/20 border border-slate-900/50 rounded-3xl p-4 md:p-6 overflow-y-auto space-y-4 mb-4 backdrop-blur-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''} animate-fadeIn`}>
                  {!isUser && <OmiAvatar isTyping={false} />}
                  
                  <div>
                    <div className={`p-3.5 rounded-2xl text-xs md:text-sm ${
                      isUser 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/15' 
                        : 'bg-slate-800/80 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                    }`}>
                      {isUser ? <p className="leading-relaxed font-sans">{msg.text}</p> : formatMessageText(msg.text)}
                    </div>
                    <span className={`text-[9px] text-slate-500 mt-1 block font-mono ${isUser ? 'text-right' : 'text-left'}`}>{msg.time}</span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-3 max-w-[80%] items-start">
                <OmiAvatar isTyping={true} />
                <div className="bg-slate-800/50 border border-slate-800 px-4 py-3 rounded-2xl rounded-tl-none">
                  <div className="flex items-center gap-1.5 py-0.5">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-0"></span>
                    <span className="w-1.5 h-1.5 bg-cyan-450 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Query Floating Cards (Visible only when Verified) */}
          {botState === 'verified' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 shrink-0">
              {starters.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(card.query)}
                  className="p-3 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 hover:border-blue-500/50 rounded-2xl text-left transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/5 flex items-center gap-2.5"
                >
                  <div className="p-1.5 bg-slate-850 rounded-lg group-hover:scale-105 transition-transform duration-300">
                    {card.icon}
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{card.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input control box */}
          <div className="shrink-0 relative">
            <div className="flex bg-slate-900 border border-slate-800/80 focus-within:border-indigo-500/60 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  botState === 'init' ? 'Type your name to begin...' :
                  botState === 'waiting_for_phone' ? 'Enter your mobile number to verify...' :
                  'Ask OMI about wallets, tasks, clients, or search firms...'
                }
                className="flex-1 px-4 py-3 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-500"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isTyping}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-850 disabled:to-slate-850 text-white font-bold transition-all duration-300 flex items-center justify-center border-l border-slate-800/50 shrink-0"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OmiBot;
