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
    const [searchTerm, setSearchTerm] = useState('');

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
            shortDesc: "Digital signature management",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            shortDesc: "Document organization",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            shortDesc: "Secure credential storage",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            shortDesc: "Quick access resources",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            shortDesc: "Service catalog management",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            shortDesc: "Subscription management",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            shortDesc: "Team permission groups",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            shortDesc: "Client retention tools",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            shortDesc: "Chartered accountant directory",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            shortDesc: "Automated billing alerts",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

    // Filter cards based on search
    const filteredCards = assistanceCards.filter(card =>
        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (card.shortDesc && card.shortDesc.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Animation variants - more subtle for professional feel
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.04,
                delayChildren: 0.05
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1]
            }
        },
        hover: {
            y: -4,
            transition: {
                duration: 0.2,
                ease: "easeOut"
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/80 overflow-hidden">
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
            <div className={`pt-16 transition-all duration-300 ease-in-out h-screen overflow-hidden ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="h-full overflow-y-auto px-4 md:px-6 py-5 custom-scroll">
                    <div className="max-w-7xl mx-auto">
                        {/* Compact Header Section */}
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="mb-6"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                            <line x1="8" y1="21" x2="16" y2="21"></line>
                                            <line x1="12" y1="17" x2="12" y2="21"></line>
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                                            Office Assistance
                                        </h1>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Manage all office modules and configurations
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Compact Stats */}
                                <div className="flex items-center gap-4 bg-white/70 backdrop-blur-sm rounded-lg border border-slate-200/60 px-3 py-1.5 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="text-center">
                                            <div className="text-lg font-semibold text-slate-700">{filteredCards.length}</div>
                                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Tools</div>
                                        </div>
                                        <div className="h-6 w-px bg-slate-200"></div>
                                        <div className="text-center">
                                            <div className="text-lg font-semibold text-slate-700">CRUD</div>
                                            <div className="text-[10px] font-medium text-slate-400">Full Access</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Compact Search Bar */}
                            <div className="mt-4">
                                <div className="relative max-w-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search any module..."
                                        className="pl-9 pr-3 py-2 w-full text-sm bg-white/80 border border-slate-200/70 rounded-lg focus:ring-1 focus:ring-blue-400/30 focus:border-blue-400/40 outline-none transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        </motion.div>

                        {/* Compact Cards Grid - Professional & Space Efficient */}
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4"
                        >
                            {filteredCards.map((card, index) => (
                                <motion.div
                                    key={index}
                                    variants={cardVariants}
                                    whileHover="hover"
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate(`.${card.link}`)}
                                    className="group cursor-pointer"
                                >
                                    {/* Compact Card - Professional Minimal Design */}
                                    <div className={`relative bg-white rounded-lg border border-slate-200/70 p-3.5 transition-all duration-200 hover:border-transparent hover:shadow-md hover:shadow-${card.gradient.split(' ')[0].replace('from-', '')}/10 ${card.shadowColor}`}>
                                        <div className="flex items-start gap-3">
                                            {/* Icon - Smaller and compact */}
                                            <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${card.bgGradient} flex items-center justify-center`}>
                                                <div className={`text-${card.gradient.split(' ')[0].replace('from-', '')}-600`}>
                                                    {card.icon}
                                                </div>
                                            </div>
                                            
                                            {/* Content - Compact */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors truncate">
                                                    {card.title}
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                                    {card.description}
                                                </p>
                                                <div className="mt-1.5 flex items-center gap-1.5">
                                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">CRUD</span>
                                                    <span className="text-[10px] text-slate-300">•</span>
                                                    <span className="text-[10px] text-slate-500">{card.shortDesc}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Arrow Indicator */}
                                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Subtle bottom accent line */}
                                        <div className={`absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r ${card.gradient} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200`}></div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Empty State */}
                        {filteredCards.length === 0 && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12"
                            >
                                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <p className="text-slate-500 text-sm">No matching modules found</p>
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Clear search
                                </button>
                            </motion.div>
                        )}

                        {/* Compact Footer */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="mt-8 pt-5 border-t border-slate-200/60"
                        >
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        All systems operational
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span>{assistanceCards.length} professional modules</span>
                                </div>
                                <div className="flex gap-4">
                                    <button className="hover:text-slate-700 transition-colors flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Documentation
                                    </button>
                                    <button className="hover:text-slate-700 transition-colors flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        Support
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Professional Background - Subtle and Clean */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/60"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-100/20 to-transparent rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-100/10 to-transparent rounded-full blur-3xl"></div>
            </div>
        </div>
    );
};

export default OfficeAssistance;

// Add this to your global CSS or component CSS for custom scrollbar
const styles = `
.custom-scroll::-webkit-scrollbar {
    width: 4px;
    height: 4px;
}
.custom-scroll::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
}
.custom-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
}
.custom-scroll::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}
.line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
`;