import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header, Sidebar } from '../components/header';

const OfficeAssistance = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    // Office assistance cards data with professional color schemes
    const assistanceCards = [
        {
            title: "DSC Register",
            description: "Add new DSC, edit & delete",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M3 19c3.333 -2 5 -4 5 -6c0 -3 -1 -3 -2 -3s-2.032 1.085 -2 3c.034 2.048 1.658 2.877 2.5 4c1.5 2 2.5 2.5 3.5 1c.667 -1 1.167 -1.833 1.5 -2.5c1 2.333 2.333 3.5 4 3.5h2.5" />
                    <path d="M20 17v-12c0 -1.121 -.879 -2 -2 -2s-2 .879 -2 2v12l2 2l2 -2z" />
                    <path d="M16 7h4" />
                </svg>
            ),
            link: "/dsc-report",
            gradient: "from-blue-500 to-cyan-500",
            bgGradient: "from-blue-50 to-blue-100/30",
            shadowColor: "hover:shadow-blue-100/50"
        },
        {
            title: "File Index",
            description: "Add new, edit & delete",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
                    <path d="M10 13l-1 2l1 2" />
                    <path d="M14 13l1 2l-1 2" />
                </svg>
            ),
            link: "/file-index",
            gradient: "from-emerald-500 to-teal-500",
            bgGradient: "from-emerald-50 to-emerald-100/30",
            shadowColor: "hover:shadow-emerald-100/50"
        },
        {
            title: "Password Groups",
            description: "Add new, edit & delete",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 17v4" />
                    <path d="M10 20l4 -2" />
                    <path d="M10 18l4 2" />
                    <path d="M5 17v4" />
                    <path d="M3 20l4 -2" />
                    <path d="M3 18l4 2" />
                    <path d="M19 17v4" />
                    <path d="M17 20l4 -2" />
                    <path d="M17 18l4 2" />
                    <path d="M9 6a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                    <path d="M7 14a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2" />
                </svg>
            ),
            link: "/password-groups",
            gradient: "from-indigo-500 to-purple-500",
            bgGradient: "from-indigo-50 to-indigo-100/30",
            shadowColor: "hover:shadow-indigo-100/50"
        },
        {
            title: "Important Links",
            description: "Add new, edit & delete",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M9 15l6 -6" />
                    <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" />
                    <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" />
                </svg>
            ),
            link: "/important-links",
            gradient: "from-amber-500 to-orange-500",
            bgGradient: "from-amber-50 to-amber-100/30",
            shadowColor: "hover:shadow-amber-100/50"
        },
        {
            title: "Services",
            description: "Add new services, edit & delete",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                    <path d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"></path>
                    <path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"></path>
                    <path d="M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"></path>
                    <path d="M14 7l6 0"></path>
                    <path d="M17 4l0 6"></path>
                </svg>
            ),
            link: "/services",
            gradient: "from-rose-500 to-pink-500",
            bgGradient: "from-rose-50 to-rose-100/30",
            shadowColor: "hover:shadow-rose-100/50"
        },
        {
            title: "Recurring Group",
            description: "Add new group, edit & delete",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M3 3m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                    <path d="M15 15m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                    <path d="M21 11v-3a2 2 0 0 0 -2 -2h-6l3 3m0 -6l-3 3" />
                    <path d="M3 13v3a2 2 0 0 0 2 2h6l-3 -3m0 6l3 -3" />
                </svg>
            ),
            link: "/recurring-groups",
            gradient: "from-violet-500 to-purple-600",
            bgGradient: "from-violet-50 to-violet-100/30",
            shadowColor: "hover:shadow-violet-100/50"
        },
        {
            title: "User Group",
            description: "Add, edit & delete on Groups",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                    <path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
                    <path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1"></path>
                    <path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
                    <path d="M17 10h2a2 2 0 0 1 2 2v1"></path>
                    <path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
                    <path d="M3 13v-1a2 2 0 0 1 2 -2h2"></path>
                </svg>
            ),
            link: "/groups",
            gradient: "from-cyan-500 to-blue-500",
            bgGradient: "from-cyan-50 to-cyan-100/30",
            shadowColor: "hover:shadow-cyan-100/50"
        },
        {
            title: "Inactive Client",
            description: "Manage inactive clients",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
                    <path d="M6 21v-2a4 4 0 0 1 4 -4h3.5" />
                    <path d="M22 22l-5 -5" />
                    <path d="M17 22l5 -5" />
                </svg>
            ),
            link: "/inactive-client",
            gradient: "from-slate-600 to-slate-700",
            bgGradient: "from-slate-50 to-slate-100/30",
            shadowColor: "hover:shadow-slate-100/50"
        },
        {
            title: "CA List",
            description: "Add, edit & delete",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                    <path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
                    <path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1"></path>
                    <path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
                    <path d="M17 10h2a2 2 0 0 1 2 2v1"></path>
                    <path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
                    <path d="M3 13v-1a2 2 0 0 1 2 -2h2"></path>
                </svg>
            ),
            link: "/ca-list",
            gradient: "from-purple-500 to-indigo-600",
            bgGradient: "from-purple-50 to-purple-100/30",
            shadowColor: "hover:shadow-purple-100/50"
        },
        {
            title: "Auto Payment Reminder",
            description: "Schedule/manage your reminder",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 13m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                    <path d="M12 10l0 3l2 0" />
                    <path d="M7 4l-2.75 2" />
                    <path d="M17 4l2.75 2" />
                </svg>
            ),
            link: "/auto-reminder",
            gradient: "from-orange-500 to-red-500",
            bgGradient: "from-orange-50 to-orange-100/30",
            shadowColor: "hover:shadow-orange-100/50"
        }
    ];

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.1
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1]
            }
        },
        hover: {
            y: -12,
            transition: {
                duration: 0.3,
                ease: "easeOut"
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 overflow-hidden">
            {/* Fixed Header */}
            <Header
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />
            
            {/* Fixed Sidebar */}
            <Sidebar
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />

            {/* Main Content Area - Scrollable */}
            <div className={`pt-20 transition-all duration-300 ease-in-out h-screen overflow-hidden ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="h-full overflow-y-auto px-4 md:px-8 py-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Premium Header Section */}
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="mb-10"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                                <line x1="12" y1="17" x2="12" y2="21"></line>
                                            </svg>
                                        </div>
                                        <div>
                                            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                                                Office Assistance
                                            </h1>
                                            <p className="text-sm text-gray-500 font-medium mt-1">
                                                Professional tools for efficient office management
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Stats Card */}
                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/70 px-5 py-4 shadow-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">{assistanceCards.length}</div>
                                            <div className="text-xs font-medium text-gray-500">Total Tools</div>
                                        </div>
                                        <div className="h-10 w-px bg-gradient-to-b from-gray-200 to-gray-100"></div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">10+</div>
                                            <div className="text-xs font-medium text-gray-500">Categories</div>
                                        </div>
                                        <div className="h-10 w-px bg-gradient-to-b from-gray-200 to-gray-100"></div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">24/7</div>
                                            <div className="text-xs font-medium text-gray-500">Available</div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                            
                            {/* Filter/Search Bar */}
                            <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center">
                                <div className="relative flex-1 max-w-md">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search tools and features..."
                                        className="pl-10 pr-4 py-3 w-full bg-white/80 backdrop-blur-sm border border-gray-200/70 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 outline-none transition-all duration-300 shadow-sm"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:-translate-y-0.5">
                                        All Tools
                                    </button>
                                    <button className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/70 text-gray-700 font-medium rounded-xl hover:bg-white hover:shadow-md transition-all duration-300">
                                        Categories
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Office Assistance Cards Grid */}
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6"
                        >
                            {assistanceCards.map((card, index) => (
                                <motion.div
                                    key={index}
                                    variants={cardVariants}
                                    whileHover="hover"
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate(`.${card.link}`)}
                                    className="group cursor-pointer relative"
                                >
                                    {/* Enhanced Glow Effect with Light Blue Shadow */}
                                    <div className={`absolute -inset-1 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500 rounded-2xl ${card.shadowColor}`}></div>
                                    <div className={`absolute inset-0 bg-gradient-to-r from-blue-200/20 via-blue-100/10 to-cyan-200/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 rounded-2xl ${card.shadowColor}`}></div>
                                    
                                    {/* Main Card */}
                                    <div className={`relative bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 transition-all duration-500 group-hover:border-transparent h-full shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 ${card.shadowColor}`}>
                                        {/* Card Content */}
                                        <div className="flex flex-col h-full">
                                            {/* Icon Badge */}
                                            <div className="mb-5">
                                                <div className="relative">
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-20 rounded-xl`}></div>
                                                    <div className={`relative w-16 h-16 rounded-xl bg-gradient-to-br ${card.bgGradient} border border-gray-100/50 flex items-center justify-center shadow-lg`}>
                                                        <div className={`bg-gradient-to-br ${card.gradient} bg-clip-text text-transparent`}>
                                                            {card.icon}
                                                        </div>
                                                    </div>
                                                    <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors">
                                                    {card.title}
                                                </h3>
                                                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                                                    {card.description}
                                                </p>
                                            </div>
                                            
                                            {/* Action Footer */}
                                            <div className="flex items-center justify-between pt-5 mt-4 border-t border-gray-100/70 group-hover:border-gray-200/50 transition-colors">
                                                <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-600 transition-colors tracking-wide uppercase">
                                                    Access Tool
                                                </span>
                                                <div className="relative">
                                                    <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-20 rounded-full blur transition-opacity duration-300`}></div>
                                                    <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-md group-hover:shadow-lg ${card.shadowColor}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Professional Corner Accent */}
                                        <div className={`absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-2xl`}>
                                            <div className={`absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br ${card.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500 rotate-45`}></div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Premium Footer */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8, duration: 0.5 }}
                            className="mt-12 pt-8 border-t border-gray-200/50"
                        >
                            <div className="bg-gradient-to-r from-blue-50/50 to-gray-50/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-8 shadow-sm">
                                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                                            Need Professional Assistance?
                                        </h3>
                                        <p className="text-gray-600 text-sm max-w-2xl">
                                            Our comprehensive suite of office tools is designed to streamline your workflow. 
                                            Each module is built with professional-grade features to ensure maximum productivity 
                                            and efficiency in your daily operations.
                                        </p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:-translate-y-0.5">
                                            Get Support
                                        </button>
                                        <button className="px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/70 text-gray-700 font-medium rounded-xl hover:bg-white hover:shadow-md transition-all duration-300">
                                            View Documentation
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Ultra-Professional Background Effects */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                {/* Main Gradient Mesh */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/10 to-gray-50"></div>
                
                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.1) 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }}></div>
                
                {/* Floating Orbs */}
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-blue-100/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-gradient-to-br from-cyan-200/20 to-blue-100/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-gray-100/10 to-gray-50/5 rounded-full blur-3xl"></div>
                
                {/* Corner Accents */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/5 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/5 to-transparent"></div>
            </div>

            {/* Floating Action Button */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-1 z-40"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </motion.button>
        </div>
    );
};

export default OfficeAssistance;