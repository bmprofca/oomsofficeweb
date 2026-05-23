import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiPaperclip, FiImage, FiSmile, FiMoreVertical, FiCheck, FiCheckCircle, FiClock, FiUser, FiVideo, FiPhone, FiInfo, FiSearch, FiPaperclip as FiAttachment } from 'react-icons/fi';

const ChattingTab = () => {
    const [chatMessage, setChatMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([
        {
            id: 1,
            sender: 'client',
            name: 'Venkatesh R',
            message: 'Hello, I need help with my GST filing for this quarter. The deadline is approaching.',
            timestamp: '2024-01-20 10:30 AM',
            read: true,
            type: 'text'
        },
        {
            id: 2,
            sender: 'advisor',
            name: 'You',
            message: 'Sure, I can help with that. Please share your purchase and sales details. Do you have the invoices ready?',
            timestamp: '2024-01-20 10:32 AM',
            read: true,
            type: 'text'
        },
        {
            id: 3,
            sender: 'client',
            name: 'Venkatesh R',
            message: 'I will upload all the documents by tomorrow evening. Also, I have some queries about input tax credit.',
            timestamp: '2024-01-20 10:35 AM',
            read: true,
            type: 'text'
        },
        {
            id: 4,
            sender: 'advisor',
            name: 'You',
            message: 'Perfect. Please send the documents and I\'ll review them. Regarding input tax credit, we can discuss after reviewing your documents.',
            timestamp: '2024-01-20 10:38 AM',
            read: true,
            type: 'text'
        },
        {
            id: 5,
            sender: 'client',
            name: 'Venkatesh R',
            message: 'Document uploaded: GST_Invoice_Q3_2024.pdf',
            timestamp: '2024-01-20 11:15 AM',
            read: true,
            type: 'file',
            file: {
                name: 'GST_Invoice_Q3_2024.pdf',
                size: '2.4 MB',
                type: 'pdf'
            }
        }
    ]);

    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (chatMessage.trim()) {
            const newMessage = {
                id: chatMessages.length + 1,
                sender: 'advisor',
                name: 'You',
                message: chatMessage,
                timestamp: new Date().toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                read: true,
                type: 'text'
            };
            setChatMessages([...chatMessages, newMessage]);
            setChatMessage('');
            
            // Simulate client typing
            setIsTyping(true);
            setTimeout(() => {
                const autoReply = {
                    id: chatMessages.length + 2,
                    sender: 'client',
                    name: 'Venkatesh R',
                    message: 'Thank you for your assistance. I will wait for your review.',
                    timestamp: new Date().toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    }),
                    read: true,
                    type: 'text'
                };
                setChatMessages(prev => [...prev, autoReply]);
                setIsTyping(false);
            }, 2000);
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    };

    const getMessageStatus = (message) => {
        if (message.sender === 'advisor') {
            return message.read ? (
                <FiCheckCircle className="w-3 h-3 text-green-500" />
            ) : (
                <FiCheck className="w-3 h-3 text-slate-400" />
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-xl p-0 overflow-hidden flex flex-col h-[600px]"
        >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <FiUser className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Venkatesh R</h3>
                            <div className="flex items-center gap-2 text-sm text-blue-100">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span>Online</span>
                                <span className="text-xs">• Active 5 min ago</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.button
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <FiPhone className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <FiVideo className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <FiInfo className="w-5 h-5" />
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Date Separator */}
                    <div className="flex items-center justify-center my-4">
                        <div className="px-4 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-slate-700 text-sm rounded-full">
                            Today, January 20, 2024
                        </div>
                    </div>

                    {chatMessages.map((msg, index) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex ${msg.sender === 'advisor' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className="max-w-lg">
                                <div className={`flex items-end gap-2 ${msg.sender === 'advisor' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        msg.sender === 'advisor' 
                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                                            : 'bg-gradient-to-r from-gray-200 to-gray-300 text-slate-700'
                                    }`}>
                                        <FiUser className="w-4 h-4" />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <div className={`flex items-center gap-2 ${msg.sender === 'advisor' ? 'justify-end' : ''}`}>
                                            <span className="text-xs font-medium text-slate-500">{msg.name}</span>
                                            <span className="text-xs text-slate-400">{formatTime(msg.timestamp)}</span>
                                        </div>
                                        
                                        <div
                                            className={`rounded-2xl px-4 py-3 max-w-md ${
                                                msg.sender === 'advisor'
                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-br-none'
                                                    : 'bg-gradient-to-r from-gray-100 to-gray-200 text-slate-800 rounded-bl-none'
                                            } ${msg.type === 'file' ? '!bg-gradient-to-r from-green-50 to-emerald-50 !text-slate-800 border border-green-200' : ''}`}
                                        >
                                            {msg.type === 'file' ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                                                        <FiAttachment className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800">{msg.file.name}</div>
                                                        <div className="text-xs text-slate-600">{msg.file.size} • PDF Document</div>
                                                        <motion.button
                                                            className="mt-2 px-3 py-1 text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-md transition-all duration-200"
                                                            whileHover={{ scale: 1.05, y: -1 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            Download
                                                        </motion.button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm leading-relaxed">{msg.message}</div>
                                            )}
                                        </div>
                                        
                                        <div className={`flex items-center gap-1 ${msg.sender === 'advisor' ? 'justify-end' : ''}`}>
                                            {getMessageStatus(msg)}
                                            {msg.sender === 'advisor' && (
                                                <span className="text-xs text-slate-400">{msg.read ? 'Read' : 'Sent'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start"
                        >
                            <div className="max-w-lg">
                                <div className="flex items-end gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
                                        <FiUser className="w-4 h-4 text-slate-700" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Venkatesh R</span>
                                            <span className="text-xs text-slate-400">typing...</span>
                                        </div>
                                        <div className="bg-gradient-to-r from-gray-100 to-gray-200 text-slate-800 rounded-2xl rounded-bl-none px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <motion.div
                                                    className="w-2 h-2 bg-gray-500 rounded-full"
                                                    animate={{ scale: [1, 1.5, 1] }}
                                                    transition={{ repeat: Infinity, duration: 0.6 }}
                                                />
                                                <motion.div
                                                    className="w-2 h-2 bg-gray-500 rounded-full"
                                                    animate={{ scale: [1, 1.5, 1] }}
                                                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                                                />
                                                <motion.div
                                                    className="w-2 h-2 bg-gray-500 rounded-full"
                                                    animate={{ scale: [1, 1.5, 1] }}
                                                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 p-4 bg-white">
                    <form onSubmit={handleSendMessage} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <motion.button
                                type="button"
                                className="p-3 bg-gradient-to-r from-gray-100 to-gray-200 text-slate-600 hover:shadow-md rounded-xl transition-all duration-200"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <FiPaperclip className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                                type="button"
                                className="p-3 bg-gradient-to-r from-gray-100 to-gray-200 text-slate-600 hover:shadow-md rounded-xl transition-all duration-200"
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <FiImage className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                                type="button"
                                className="p-3 bg-gradient-to-r from-gray-100 to-gray-200 text-slate-600 hover:shadow-md rounded-xl transition-all duration-200"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <FiSmile className="w-5 h-5" />
                            </motion.button>
                            
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                    className="w-full pl-4 pr-24 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                />
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                                    <motion.button
                                        type="submit"
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 font-medium"
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        disabled={!chatMessage.trim()}
                                    >
                                        <FiSend className="w-4 h-4" />
                                        Send
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-500 px-2">
                            <span>Press Enter to send message</span>
                            <span>Characters: {chatMessage.length}/1000</span>
                        </div>
                    </form>
                </div>
            </div>

            {/* Quick Actions Sidebar */}
            {/* <div className="absolute right-4 top-20 hidden lg:block">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-4 w-64">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <FiInfo className="w-4 h-4 text-blue-600" />
                        Chat Information
                    </h4>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-600">Client Details</div>
                            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                                <div className="font-medium text-slate-800">Venkatesh R</div>
                                <div className="text-sm text-slate-600">Client since Jan 2023</div>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-600">Active Topics</div>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-xs rounded-full">
                                    GST Filing
                                </span>
                                <span className="px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs rounded-full">
                                    Tax Consultation
                                </span>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-600">Recent Files</div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg">
                                    <FiAttachment className="w-4 h-4 text-slate-400" />
                                    <div className="text-xs">
                                        <div className="font-medium text-slate-800">GST_Invoice_Q3.pdf</div>
                                        <div className="text-slate-500">2.4 MB • Today</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <motion.button
                            className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 font-medium"
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Schedule Meeting
                        </motion.button>
                    </div>
                </div>
            </div> */}
        </motion.div>
    );
};

export default ChattingTab;