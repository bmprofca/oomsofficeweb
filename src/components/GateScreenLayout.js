import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { Header, Sidebar } from './header';

export const GateSectionLabel = ({ children, className = '' }) => (
    <p className={`text-[11px] font-bold uppercase tracking-wide text-gray-500 ${className}`}>
        {children}
    </p>
);

export const GateContentHeader = ({ title, subtitle, onBack, backLabel = 'Back', className = '' }) => (
    <div className={className}>
        {onBack ? (
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors"
            >
                <FiArrowLeft className="w-3.5 h-3.5" />
                {backLabel}
            </button>
        ) : null}
        <h2 className={`${onBack ? 'mt-2' : ''} text-base md:text-lg font-bold text-gray-800 tracking-tight`}>
            {title}
        </h2>
        {subtitle ? (
            <p className="mt-1.5 text-xs text-gray-500 leading-relaxed max-w-prose">
                {subtitle}
            </p>
        ) : null}
    </div>
);

const ICON_TONES = {
    indigo: {
        wrap: 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm shadow-indigo-200/50',
        icon: 'text-white',
        hover: 'hover:border-indigo-200 hover:bg-indigo-50/50',
        active: 'border-indigo-200 bg-indigo-50/70 ring-1 ring-indigo-100',
    },
    emerald: {
        wrap: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm shadow-emerald-200/50',
        icon: 'text-white',
        hover: 'hover:border-emerald-200 hover:bg-emerald-50/50',
        active: 'border-emerald-200 bg-emerald-50/70 ring-1 ring-emerald-100',
    },
    violet: {
        wrap: 'bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm shadow-violet-200/50',
        icon: 'text-white',
        hover: 'hover:border-violet-200 hover:bg-violet-50/50',
        active: 'border-violet-200 bg-violet-50/70 ring-1 ring-violet-100',
    },
};

export const GateActionCard = ({
    icon: Icon,
    iconTone = 'indigo',
    title,
    description,
    badge,
    onClick,
    active = false,
    disabled = false,
    trailing: Trailing = null,
}) => {
    const tone = ICON_TONES[iconTone] || ICON_TONES.indigo;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`group w-full text-left rounded-lg border bg-white p-3 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
                active
                    ? tone.active
                    : `border-gray-200 shadow-sm ${tone.hover} hover:shadow-md`
            }`}
        >
            <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tone.wrap}`}>
                    <Icon className={`w-4 h-4 ${tone.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                            {title}
                        </p>
                        {badge}
                    </div>
                    {description ? (
                        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {description}
                        </div>
                    ) : null}
                </div>
                {Trailing ? (
                    <Trailing className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                ) : null}
            </div>
        </button>
    );
};

export const GateLeftPanel = ({
    gradient,
    badge,
    badgeIcon: BadgeIcon,
    icon: PanelIcon,
    title,
    subtitle,
    description,
    statuses = [],
}) => (
    <div className={`relative p-5 sm:p-6 text-white bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.2)_0%,_transparent_50%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

        <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
                {BadgeIcon ? <BadgeIcon className="w-3.5 h-3.5" /> : null}
                {badge}
            </div>

            <div className="mt-4 flex items-start gap-3">
                {PanelIcon ? (
                    <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                        <PanelIcon className="w-5 h-5" />
                    </div>
                ) : null}
                <div className="min-w-0 pt-0.5">
                    {subtitle ? (
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                            {subtitle}
                        </p>
                    ) : null}
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 leading-tight">
                        {title}
                    </h1>
                </div>
            </div>

            {description ? (
                <p className="mt-3 text-sm text-white/85 leading-relaxed max-w-md font-medium">
                    {description}
                </p>
            ) : null}

            {statuses.length > 0 && (
                <div className="mt-5 rounded-xl bg-white/10 border border-white/15 p-3 backdrop-blur-sm space-y-2.5">
                    {statuses.map((status) => (
                        <div key={status.label}>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-white/65">
                                {status.label}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/10 px-2.5 py-1 text-xs font-semibold">
                                    {status.icon ? <status.icon className="w-3.5 h-3.5 opacity-90" /> : null}
                                    <span className="truncate max-w-[220px] sm:max-w-none">{status.value}</span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

const GateScreenLayout = ({ leftPanel, children, loading = false, loadingMessage = 'Loading...' }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3 px-4">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                    <div className="h-7 w-7 rounded-full border-2 border-gray-200 border-t-indigo-600 animate-spin" />
                </div>
                <p className="text-sm font-medium text-gray-500">{loadingMessage}</p>
                <p className="text-xs text-gray-400">Please wait a moment</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
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

            <div className={`pt-16 flex-1 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#eef2ff_0%,_transparent_55%),_radial-gradient(ellipse_at_bottom_right,_#f5f3ff_0%,_transparent_50%)] pointer-events-none" />
                    <div className="absolute top-8 right-8 w-56 h-56 rounded-full bg-indigo-200/25 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-8 left-8 w-48 h-48 rounded-full bg-violet-200/20 blur-3xl pointer-events-none" />

                    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                        >
                            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
                                {leftPanel}
                                <div className="p-4 sm:p-5 lg:p-6 flex flex-col justify-start min-w-0 bg-gradient-to-b from-white to-gray-50/40">
                                    {children}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GateScreenLayout;
