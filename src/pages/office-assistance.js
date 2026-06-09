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
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M3 19c3.333 -2 5 -4 5 -6c0 -3 -1 -3 -2 -3s-2.032 1.085 -2 3c.034 2.048 1.658 2.877 2.5 4c1.5 2 2.5 2.5 3.5 1c.667 -1 1.167 -1.833 1.5 -2.5c1 2.333 2.333 3.5 4 3.5h2.5" />
                    <path d="M20 17v-12c0 -1.121 -.879 -2 -2 -2s-2 .879 -2 2v12l2 2l2 -2z" />
                    <path d="M16 7h4" />
                </svg>
            ),
            link: "/dsc-report",
            color: "blue"
        },
        {
            title: "File Index",
            description: "Add new, edit & delete",
            shortDesc: "Document organization",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
                    <path d="M10 13l-1 2l1 2" />
                    <path d="M14 13l1 2l-1 2" />
                </svg>
            ),
            link: "/file-index",
            color: "emerald"
        },
        {
            title: "Password Groups",
            description: "Add new, edit & delete",
            shortDesc: "Secure credential storage",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            color: "indigo"
        },
        {
            title: "Important Links",
            description: "Add new, edit & delete",
            shortDesc: "Quick access resources",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M9 15l6 -6" />
                    <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" />
                    <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" />
                </svg>
            ),
            link: "/important-links",
            color: "amber"
        },
        {
            title: "Services",
            description: "Add new services, edit & delete",
            shortDesc: "Service catalog management",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                    <path d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"></path>
                    <path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"></path>
                    <path d="M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"></path>
                    <path d="M14 7l6 0"></path>
                    <path d="M17 4l0 6"></path>
                </svg>
            ),
            link: "/services",
            color: "rose"
        },
        {
            title: "Compliance Services",
            description: "Assign compliance services, view schedules and update statuses",
            shortDesc: "Compliance schedule management",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="2" />
                    <path d="M9 14l2 2l4 -4" />
                </svg>
            ),
            link: "/compliance",
            color: "blue"
        },
        {
            title: "User Group",
            description: "Add, edit & delete on Groups",
            shortDesc: "Team permission groups",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            color: "cyan"
        },
        {
            title: "Inactive Client",
            description: "Manage inactive clients",
            shortDesc: "Client retention tools",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
                    <path d="M6 21v-2a4 4 0 0 1 4 -4h3.5" />
                    <path d="M22 22l-5 -5" />
                    <path d="M17 22l5 -5" />
                </svg>
            ),
            link: "/inactive-client",
            color: "slate"
        },
        {
            title: "CA List",
            description: "Add, edit & delete",
            shortDesc: "Chartered accountant directory",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            color: "purple"
        },
        {
            title: "Auto Payment Reminder",
            description: "Schedule/manage your reminder",
            shortDesc: "Automated billing alerts",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 13m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                    <path d="M12 10l0 3l2 0" />
                    <path d="M7 4l-2.75 2" />
                    <path d="M17 4l2.75 2" />
                </svg>
            ),
            link: "/auto-reminder",
            color: "orange"
        }
    ];

    // Filter cards based on search
    const filteredCards = assistanceCards.filter(card =>
        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (card.shortDesc && card.shortDesc.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.03,
                delayChildren: 0.02
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 12 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: [0.25, 1, 0.5, 1]
            }
        },
        hover: {
            y: -3,
            transition: {
                duration: 0.15,
                ease: "easeOut"
            }
        }
    };

    const colorMap = {
        blue: { bg: 'bg-blue-50/70 text-blue-600', accent: 'from-blue-500 to-cyan-500', shadow: 'hover:shadow-blue-100/50' },
        emerald: { bg: 'bg-emerald-50/70 text-emerald-600', accent: 'from-emerald-500 to-teal-500', shadow: 'hover:shadow-emerald-100/50' },
        indigo: { bg: 'bg-indigo-50/70 text-indigo-600', accent: 'from-indigo-500 to-purple-500', shadow: 'hover:shadow-indigo-100/50' },
        amber: { bg: 'bg-amber-50/70 text-amber-600', accent: 'from-amber-500 to-orange-500', shadow: 'hover:shadow-amber-100/50' },
        rose: { bg: 'bg-rose-50/70 text-rose-600', accent: 'from-rose-500 to-pink-500', shadow: 'hover:shadow-rose-100/50' },
        cyan: { bg: 'bg-cyan-50/70 text-cyan-600', accent: 'from-cyan-500 to-blue-500', shadow: 'hover:shadow-cyan-100/50' },
        slate: { bg: 'bg-slate-100/70 text-slate-600', accent: 'from-slate-600 to-slate-700', shadow: 'hover:shadow-slate-100/50' },
        purple: { bg: 'bg-purple-50/70 text-purple-600', accent: 'from-purple-500 to-indigo-600', shadow: 'hover:shadow-purple-100/50' },
        orange: { bg: 'bg-orange-50/70 text-orange-600', accent: 'from-orange-500 to-red-500', shadow: 'hover:shadow-orange-100/50' }
    };

    return (
        <div className="min-h-screen bg-slate-50 overflow-hidden">
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

            {/* Main Content Area */}
            <div className={`pt-16 transition-all duration-300 ease-in-out h-screen overflow-hidden ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="h-full overflow-y-auto px-4 md:px-6 py-5 custom-scroll">
                    <div className="max-w-7xl mx-auto">

                        {/* Compact Header Section */}
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mb-5"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                            <line x1="8" y1="21" x2="16" y2="21"></line>
                                            <line x1="12" y1="17" x2="12" y2="21"></line>
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                                            Office Assistance
                                        </h1>
                                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                            Manage all office modules and configuration tools
                                        </p>
                                    </div>
                                </div>

                                {/* Compact Stats */}
                                <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-lg px-3 py-1 shadow-xs text-xs font-semibold text-slate-600 w-fit">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                        {filteredCards.length} Tools Available
                                    </span>
                                    <span className="text-slate-200">|</span>
                                    <span className="text-slate-500">Full Access</span>
                                </div>
                            </div>

                            {/* Compact Search Bar */}
                            <div className="mt-4">
                                <div className="relative max-w-xs">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search any module..."
                                        className="pl-8 pr-3 py-1.5 w-full text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition shadow-xs"
                                    />
                                    <svg className="absolute left-2.5 top-2.5 text-slate-400 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                        </motion.div>

                        {/* Cards Grid */}
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                        >
                            {filteredCards.map((card, index) => {
                                const colors = colorMap[card.color] || colorMap.indigo;
                                return (
                                    <motion.div
                                        key={index}
                                        variants={cardVariants}
                                        whileHover="hover"
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate(`.${card.link}`)}
                                        className="group cursor-pointer relative bg-white rounded-xl border border-slate-150 p-4 transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_8px_30px_rgba(99,102,241,0.04)] flex flex-col justify-between h-full overflow-hidden"
                                    >
                                        <div className="flex items-start gap-3.5">
                                            {/* Icon Box */}
                                            <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center transition-colors duration-300`}>
                                                {card.icon}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1.5">
                                                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors duration-200 truncate">
                                                        {card.title}
                                                    </h3>
                                                    {/* Hover Arrow */}
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 transform group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 leading-normal line-clamp-2">
                                                    {card.description}
                                                </p>
                                                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100/50 pt-2.5">
                                                    <span className="text-[9px] font-extrabold bg-slate-50 border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded tracking-wider">CRUD</span>
                                                    <span className="text-[10px] text-slate-400 truncate max-w-[120px] font-medium">{card.shortDesc}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Accent underline on hover */}
                                        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colors.accent} opacity-0 group-hover:opacity-100 transition-all duration-300`}></div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>

                        {/* Empty State */}
                        {filteredCards.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12"
                            >
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <p className="text-slate-500 text-xs">No matching modules found</p>
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                                >
                                    Clear search
                                </button>
                            </motion.div>
                        )}

                        {/* Compact Footer */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                            className="mt-8 pt-4 border-t border-slate-200/60"
                        >
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-medium">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        All systems operational
                                    </span>
                                    <span className="text-slate-200">|</span>
                                    <span>{assistanceCards.length} modules loaded</span>
                                </div>
                                <div className="flex gap-4">
                                    <button className="hover:text-slate-600 transition-colors flex items-center gap-1">
                                        Documentation
                                    </button>
                                    <button className="hover:text-slate-600 transition-colors flex items-center gap-1">
                                        Support
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfficeAssistance;

// Custom scrollbar styles
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