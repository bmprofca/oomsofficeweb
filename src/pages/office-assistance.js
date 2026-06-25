import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiLayout, FiSearch } from 'react-icons/fi';
import { Header, Sidebar } from '../components/header';

const CARD_SECTIONS = [
    {
        id: 'documents',
        title: 'Documents & Files',
        description: 'Organize records, links, and digital assets',
        cards: [
            {
                title: 'DSC Register',
                description: 'Add, edit and manage digital signature certificates',
                shortDesc: 'Digital signatures',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M3 19c3.333 -2 5 -4 5 -6c0 -3 -1 -3 -2 -3s-2.032 1.085 -2 3c.034 2.048 1.658 2.877 2.5 4c1.5 2 2.5 2.5 3.5 1c.667 -1 1.167 -1.833 1.5 -2.5c1 2.333 2.333 3.5 4 3.5h2.5" />
                        <path d="M20 17v-12c0 -1.121 -.879 -2 -2 -2s-2 .879 -2 2v12l2 2l2 -2z" />
                        <path d="M16 7h4" />
                    </svg>
                ),
                link: '/dsc-report',
                color: 'blue',
            },
            {
                title: 'File Index',
                description: 'Maintain a structured index of office documents',
                shortDesc: 'Document index',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                        <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
                        <path d="M10 13l-1 2l1 2" />
                        <path d="M14 13l1 2l-1 2" />
                    </svg>
                ),
                link: '/file-index',
                color: 'emerald',
            },
            {
                title: 'Important Links',
                description: 'Curate quick-access resources for your team',
                shortDesc: 'Quick links',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M9 15l6 -6" />
                        <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" />
                        <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" />
                    </svg>
                ),
                link: '/important-links',
                color: 'amber',
            },
        ],
    },
    {
        id: 'security',
        title: 'Security & Teams',
        description: 'Credentials, permissions, and group management',
        cards: [
            {
                title: 'Password Groups',
                description: 'Store and share credentials securely by group',
                shortDesc: 'Credential vault',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
                link: '/password-groups',
                color: 'indigo',
            },
            {
                title: 'User Group',
                description: 'Create and manage permission groups for staff',
                shortDesc: 'Team groups',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
                        <path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" />
                        <path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
                        <path d="M17 10h2a2 2 0 0 1 2 2v1" />
                        <path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
                        <path d="M3 13v-1a2 2 0 0 1 2 -2h2" />
                    </svg>
                ),
                link: '/groups',
                color: 'violet',
            },
        ],
    },
    {
        id: 'services',
        title: 'Services & Workflow',
        description: 'Catalog, requests, and service delivery',
        cards: [
            {
                title: 'Services',
                description: 'Define offerings, pricing, and service metadata',
                shortDesc: 'Service catalog',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                        <path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                        <path d="M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                        <path d="M14 7l6 0" />
                        <path d="M17 4l0 6" />
                    </svg>
                ),
                link: '/services',
                color: 'rose',
            },
            {
                title: 'Service Requests',
                description: 'Review, approve, or reject client service requests',
                shortDesc: 'Client requests',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" />
                        <path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
                        <path d="M9 14l2 2l4 -4" />
                    </svg>
                ),
                link: '/service-requests',
                color: 'cyan',
            },
        ],
    },
    {
        id: 'clients',
        title: 'Clients & Partners',
        description: 'Relationships, retention, and professional network',
        cards: [
            {
                title: 'Inactive Client',
                description: 'Track and re-engage dormant client accounts',
                shortDesc: 'Client retention',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
                        <path d="M6 21v-2a4 4 0 0 1 4 -4h3.5" />
                        <path d="M22 22l-5 -5" />
                        <path d="M17 22l5 -5" />
                    </svg>
                ),
                link: '/inactive-client',
                color: 'slate',
            },
            {
                title: 'CA List',
                description: 'Maintain your chartered accountant directory',
                shortDesc: 'CA directory',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
                        <path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" />
                        <path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
                        <path d="M17 10h2a2 2 0 0 1 2 2v1" />
                        <path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
                        <path d="M3 13v-1a2 2 0 0 1 2 -2h2" />
                    </svg>
                ),
                link: '/ca-list',
                color: 'purple',
            },
        ],
    },
    {
        id: 'automation',
        title: 'Automation',
        description: 'Scheduled reminders and recurring workflows',
        cards: [
            {
                title: 'Auto Payment Reminder',
                description: 'Configure automated billing and payment alerts',
                shortDesc: 'Billing alerts',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M12 13m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                        <path d="M12 10l0 3l2 0" />
                        <path d="M7 4l-2.75 2" />
                        <path d="M17 4l2.75 2" />
                    </svg>
                ),
                link: '/auto-reminder',
                color: 'orange',
            },
        ],
    },
];

const COLOR_MAP = {
    blue: {
        icon: 'bg-blue-50 text-blue-600 ring-blue-100',
        pill: 'bg-blue-50 text-blue-700 border-blue-100',
        hover: 'group-hover:border-blue-200 group-hover:shadow-blue-100/60',
        accent: 'from-blue-500 to-sky-500',
    },
    emerald: {
        icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
        pill: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        hover: 'group-hover:border-emerald-200 group-hover:shadow-emerald-100/60',
        accent: 'from-emerald-500 to-teal-500',
    },
    indigo: {
        icon: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
        pill: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        hover: 'group-hover:border-indigo-200 group-hover:shadow-indigo-100/60',
        accent: 'from-indigo-500 to-violet-500',
    },
    amber: {
        icon: 'bg-amber-50 text-amber-600 ring-amber-100',
        pill: 'bg-amber-50 text-amber-700 border-amber-100',
        hover: 'group-hover:border-amber-200 group-hover:shadow-amber-100/60',
        accent: 'from-amber-500 to-orange-500',
    },
    rose: {
        icon: 'bg-rose-50 text-rose-600 ring-rose-100',
        pill: 'bg-rose-50 text-rose-700 border-rose-100',
        hover: 'group-hover:border-rose-200 group-hover:shadow-rose-100/60',
        accent: 'from-rose-500 to-pink-500',
    },
    cyan: {
        icon: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
        pill: 'bg-cyan-50 text-cyan-700 border-cyan-100',
        hover: 'group-hover:border-cyan-200 group-hover:shadow-cyan-100/60',
        accent: 'from-cyan-500 to-blue-500',
    },
    slate: {
        icon: 'bg-slate-100 text-slate-600 ring-slate-200',
        pill: 'bg-slate-100 text-slate-700 border-slate-200',
        hover: 'group-hover:border-slate-300 group-hover:shadow-slate-200/60',
        accent: 'from-slate-500 to-slate-600',
    },
    purple: {
        icon: 'bg-purple-50 text-purple-600 ring-purple-100',
        pill: 'bg-purple-50 text-purple-700 border-purple-100',
        hover: 'group-hover:border-purple-200 group-hover:shadow-purple-100/60',
        accent: 'from-purple-500 to-indigo-500',
    },
    violet: {
        icon: 'bg-violet-50 text-violet-600 ring-violet-100',
        pill: 'bg-violet-50 text-violet-700 border-violet-100',
        hover: 'group-hover:border-violet-200 group-hover:shadow-violet-100/60',
        accent: 'from-violet-500 to-purple-500',
    },
    orange: {
        icon: 'bg-orange-50 text-orange-600 ring-orange-100',
        pill: 'bg-orange-50 text-orange-700 border-orange-100',
        hover: 'group-hover:border-orange-200 group-hover:shadow-orange-100/60',
        accent: 'from-orange-500 to-red-500',
    },
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.04, delayChildren: 0.02 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
    },
};

function ModuleCard({ card, onNavigate }) {
    const colors = COLOR_MAP[card.color] || COLOR_MAP.indigo;

    return (
        <motion.button
            type="button"
            variants={cardVariants}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onNavigate(card.link)}
            className={`group relative w-full text-left bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-xl ${colors.hover} overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2`}
        >
            <div className="flex items-start justify-between gap-4">
                <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl ring-1 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${colors.icon}`}
                >
                    {card.icon}
                </div>
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 transition-all duration-300 group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-600">
                    <FiArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
            </div>

            <div className="mt-5">
                <h3 className="text-base font-semibold text-slate-900 tracking-tight group-hover:text-indigo-700 transition-colors">
                    {card.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2">
                    {card.description}
                </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors.pill}`}
                >
                    {card.shortDesc}
                </span>
                <span className="text-xs font-medium text-slate-400 group-hover:text-indigo-500 transition-colors">
                    Open module
                </span>
            </div>

            <div
                className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />
        </motion.button>
    );
}

const OfficeAssistance = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [searchTerm, setSearchTerm] = useState('');

    const allCards = useMemo(
        () => CARD_SECTIONS.flatMap((section) => section.cards),
        []
    );

    const filteredSections = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return CARD_SECTIONS;

        return CARD_SECTIONS.map((section) => ({
            ...section,
            cards: section.cards.filter(
                (card) =>
                    card.title.toLowerCase().includes(q) ||
                    card.description.toLowerCase().includes(q) ||
                    card.shortDesc.toLowerCase().includes(q) ||
                    section.title.toLowerCase().includes(q)
            ),
        })).filter((section) => section.cards.length > 0);
    }, [searchTerm]);

    const visibleCount = filteredSections.reduce((sum, s) => sum + s.cards.length, 0);

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

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

    const handleNavigate = (link) => navigate(`.${link}`);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-100/80 via-slate-50 to-white">
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

            <div
                className={`pt-16 transition-all duration-300 ease-in-out min-h-screen ${
                    isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
                    <motion.header
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 pointer-events-none" />
                        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-indigo-100/40 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-sky-100/50 blur-3xl pointer-events-none" />

                        <div className="relative px-6 sm:px-8 py-7 sm:py-9">
                            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-10">
                                <div className="flex items-start gap-4 sm:gap-5">
                                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200/80">
                                        <FiLayout className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600/90">
                                            Office Hub
                                        </p>
                                        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                                            Office Assistance
                                        </h1>
                                        <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-xl leading-relaxed">
                                            A central workspace for documents, services, clients, and office automation tools.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 backdrop-blur px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        {visibleCount} module{visibleCount !== 1 ? 's' : ''} available
                                    </div>
                                    <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-2.5 text-sm font-medium text-indigo-700">
                                        {CARD_SECTIONS.length} categories
                                    </div>
                                </div>
                            </div>

                            <div className="mt-7 sm:mt-8 max-w-xl">
                                <label htmlFor="office-module-search" className="sr-only">
                                    Search modules
                                </label>
                                <div className="relative">
                                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        id="office-module-search"
                                        type="search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search modules by name or purpose..."
                                        className="w-full pl-12 pr-4 py-3.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.header>

                    <div className="mt-10 sm:mt-12 space-y-12 sm:space-y-14">
                        {filteredSections.map((section) => (
                            <section key={section.id}>
                                <div className="mb-5 sm:mb-6">
                                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
                                        {section.title}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                                </div>

                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6"
                                >
                                    {section.cards.map((card) => (
                                        <ModuleCard
                                            key={card.link}
                                            card={card}
                                            onNavigate={handleNavigate}
                                        />
                                    ))}
                                </motion.div>
                            </section>
                        ))}
                    </div>

                    {visibleCount === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-12 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center"
                        >
                            <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                <FiSearch className="w-6 h-6 text-slate-400" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-800">No modules found</h3>
                            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                                Try a different search term or browse all {allCards.length} office tools.
                            </p>
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                            >
                                Clear search
                            </button>
                        </motion.div>
                    )}

                    <footer className="mt-14 sm:mt-16 pt-6 border-t border-slate-200/80">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-500">
                            <p>
                                <span className="inline-flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    All systems operational
                                </span>
                                <span className="hidden sm:inline mx-3 text-slate-300">·</span>
                                <span className="block sm:inline mt-1 sm:mt-0">
                                    {allCards.length} modules across {CARD_SECTIONS.length} categories
                                </span>
                            </p>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default OfficeAssistance;
