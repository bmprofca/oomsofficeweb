import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiBell,
    FiChevronRight,
    FiClipboard,
    FiFileText,
    FiGrid,
    FiKey,
    FiLink,
    FiLock,
    FiSearch,
    FiUserCheck,
    FiUsers,
    FiUserX,
} from 'react-icons/fi';
import { Header, Sidebar } from '../components/header';

const CARD_SECTIONS = [
    {
        id: 'documents',
        title: 'Documents & Files',
        description: 'Organize records, links, and digital assets',
        cards: [
            {
                title: 'DSC Register',
                description: 'Manage digital signature certificates',
                icon: FiKey,
                link: '/dsc-report',
                color: 'bg-blue-50 text-blue-600',
            },
            {
                title: 'File Index',
                description: 'Structured index of office documents',
                icon: FiFileText,
                link: '/file-index',
                color: 'bg-emerald-50 text-emerald-600',
            },
            {
                title: 'Important Links',
                description: 'Quick-access resources for your team',
                icon: FiLink,
                link: '/important-links',
                color: 'bg-amber-50 text-amber-600',
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
                description: 'Store and share credentials by group',
                icon: FiLock,
                link: '/password-groups',
                color: 'bg-indigo-50 text-indigo-600',
            },
            {
                title: 'User Group',
                description: 'Permission groups for staff',
                icon: FiUsers,
                link: '/groups',
                color: 'bg-violet-50 text-violet-600',
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
                description: 'Offerings, pricing, and metadata',
                icon: FiGrid,
                link: '/services',
                color: 'bg-rose-50 text-rose-600',
            },
            {
                title: 'Service Requests',
                description: 'Review and approve client requests',
                icon: FiClipboard,
                link: '/service-requests',
                color: 'bg-cyan-50 text-cyan-600',
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
                description: 'Track and re-engage dormant accounts',
                icon: FiUserX,
                link: '/inactive-client',
                color: 'bg-slate-100 text-slate-600',
            },
            {
                title: 'CA List',
                description: 'Chartered accountant directory',
                icon: FiUserCheck,
                link: '/ca-list',
                color: 'bg-purple-50 text-purple-600',
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
                description: 'Automated billing and payment alerts',
                icon: FiBell,
                link: '/auto-reminder',
                color: 'bg-orange-50 text-orange-600',
            },
        ],
    },
];

function ModuleCard({ card, onNavigate }) {
    const Icon = card.icon;

    return (
        <button
            type="button"
            onClick={() => onNavigate(card.link)}
            className="group w-full text-left rounded-lg border border-gray-200 bg-white p-3 hover:border-indigo-200 hover:shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        >
            <div className="flex items-start gap-3">
                <div
                    className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}
                >
                    <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-indigo-700 leading-snug">
                        {card.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                        {card.description}
                    </p>
                </div>
                <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 shrink-0 mt-0.5 transition-colors" />
            </div>
        </button>
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

    const allCards = useMemo(() => CARD_SECTIONS.flatMap((section) => section.cards), []);

    const filteredSections = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return CARD_SECTIONS;

        return CARD_SECTIONS.map((section) => ({
            ...section,
            cards: section.cards.filter(
                (card) =>
                    card.title.toLowerCase().includes(q) ||
                    card.description.toLowerCase().includes(q) ||
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

            <div
                className={`pt-16 transition-all duration-300 ease-in-out min-h-screen ${
                    isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">Office Assistance</h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Documents, services, clients, and office automation tools
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {visibleCount} module{visibleCount !== 1 ? 's' : ''} · {CARD_SECTIONS.length}{' '}
                                categories
                            </p>
                        </div>
                        <div className="relative w-full sm:max-w-xs shrink-0">
                            <label htmlFor="office-module-search" className="sr-only">
                                Search modules
                            </label>
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                id="office-module-search"
                                type="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search modules..."
                                className="w-full pl-9 pr-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {filteredSections.map((section) => (
                            <section
                                key={section.id}
                                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                            >
                                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                                    <h2 className="text-sm font-semibold text-gray-800">{section.title}</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                                </div>
                                <div className="p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {section.cards.map((card) => (
                                            <ModuleCard
                                                key={card.link}
                                                card={card}
                                                onNavigate={handleNavigate}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>

                    {visibleCount === 0 && (
                        <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
                            <FiSearch className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-sm font-medium text-gray-800">No modules found</h3>
                            <p className="mt-1 text-xs text-gray-500">
                                Try another term or browse all {allCards.length} modules.
                            </p>
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="mt-4 inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Clear search
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OfficeAssistance;
