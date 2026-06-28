import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FiBell,
    FiBriefcase,
    FiChevronRight,
    FiClipboard,
    FiFileText,
    FiGrid,
    FiKey,
    FiLink,
    FiLock,
    FiSearch,
    FiUserCheck,
    FiUserX,
} from 'react-icons/fi';
import { Header, Sidebar } from '../components/header';

const OFFICE_MODULES = [
    {
        title: 'DSC Register',
        description: 'Manage digital signature certificates',
        icon: FiKey,
        link: '/dsc-report',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        accent: 'from-blue-500/10 to-transparent',
        hoverBorder: 'hover:border-blue-200',
    },
    {
        title: 'File Index',
        description: 'Structured index of office documents',
        icon: FiFileText,
        link: '/file-index',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        accent: 'from-emerald-500/10 to-transparent',
        hoverBorder: 'hover:border-emerald-200',
    },
    {
        title: 'Important Links',
        description: 'Quick-access resources for your team',
        icon: FiLink,
        link: '/important-links',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        accent: 'from-amber-500/10 to-transparent',
        hoverBorder: 'hover:border-amber-200',
    },
    {
        title: 'Password Groups',
        description: 'Store and share credentials securely',
        icon: FiLock,
        link: '/password-groups',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        accent: 'from-indigo-500/10 to-transparent',
        hoverBorder: 'hover:border-indigo-200',
    },
    {
        title: 'Services',
        description: 'Branch offerings, pricing, and metadata',
        icon: FiGrid,
        link: '/services',
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-600',
        accent: 'from-rose-500/10 to-transparent',
        hoverBorder: 'hover:border-rose-200',
    },
    {
        title: 'Service Requests',
        description: 'Review and approve client requests',
        icon: FiClipboard,
        link: '/service-requests',
        iconBg: 'bg-cyan-100',
        iconColor: 'text-cyan-600',
        accent: 'from-cyan-500/10 to-transparent',
        hoverBorder: 'hover:border-cyan-200',
    },
    {
        title: 'Inactive Client',
        description: 'Track and re-engage dormant accounts',
        icon: FiUserX,
        link: '/inactive-client',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-600',
        accent: 'from-gray-500/10 to-transparent',
        hoverBorder: 'hover:border-gray-300',
    },
    {
        title: 'CA List',
        description: 'Chartered accountant directory',
        icon: FiUserCheck,
        link: '/ca-list',
        iconBg: 'bg-violet-100',
        iconColor: 'text-violet-600',
        accent: 'from-violet-500/10 to-transparent',
        hoverBorder: 'hover:border-violet-200',
    },
    {
        title: 'Auto Payment Reminder',
        description: 'Automated billing and payment alerts',
        icon: FiBell,
        link: '/auto-reminder',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        accent: 'from-orange-500/10 to-transparent',
        hoverBorder: 'hover:border-orange-200',
    },
];

function ModuleCard({ module, index, onNavigate }) {
    const Icon = module.icon;

    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(module.link)}
            className={`group relative w-full text-left overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${module.hoverBorder} hover:shadow-md`}
        >
            <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${module.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`} />

            <div className="relative flex flex-col gap-3 min-h-[108px]">
                <div className="flex items-start justify-between gap-2">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${module.iconBg} ${module.iconColor} shadow-sm`}>
                        <Icon className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-50 text-gray-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors duration-200">
                        <FiChevronRight className="w-4 h-4" />
                    </span>
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors leading-tight">
                        {module.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 leading-snug line-clamp-2">
                        {module.description}
                    </p>
                </div>
            </div>
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

    const filteredModules = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return OFFICE_MODULES;
        return OFFICE_MODULES.filter(
            (mod) =>
                mod.title.toLowerCase().includes(q) ||
                mod.description.toLowerCase().includes(q)
        );
    }, [searchTerm]);

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
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
                <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="border-b border-gray-200 px-3 md:px-4 py-3 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                        <FiBriefcase className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight">
                                            Office Assistance
                                        </h1>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {filteredModules.length} module{filteredModules.length !== 1 ? 's' : ''} available
                                        </p>
                                    </div>
                                </div>

                                <div className="relative w-full sm:max-w-xs shrink-0">
                                    <label htmlFor="office-module-search" className="sr-only">
                                        Search modules
                                    </label>
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                    <input
                                        id="office-module-search"
                                        type="search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search modules…"
                                        className="w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white outline-none transition focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-3 md:p-4">
                            {filteredModules.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                                    {filteredModules.map((mod, index) => (
                                        <ModuleCard
                                            key={mod.link}
                                            module={mod}
                                            index={index}
                                            onNavigate={handleNavigate}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                        <FiSearch className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">No modules found</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Try another term or browse all {OFFICE_MODULES.length} modules.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                                    >
                                        Clear search
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfficeAssistance;
