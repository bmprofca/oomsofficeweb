import React, { useState, useEffect } from 'react';
import {
    FiUsers,
    FiShield,
    FiFileText,
    FiSettings,
    FiPhone,
    FiCalendar,
    FiLock,
    FiCreditCard,
    FiGitBranch,
    FiUserCheck,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Header, Sidebar } from '../components/header';
import { useUserPermissions } from '../utils/permission-helper';

const Settings = () => {
    const navigate = useNavigate();
    const { check } = useUserPermissions();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [activePage, setActivePage] = useState('settings');

    // Mock user data - in real app, get from props/API
    const userData = {
        isHeadBranch: true,
        isMainAdmin: true
    };

    // Settings cards data
    const settingsCards = [
        {
            title: "Staff List",
            description: "Add, edit & delete staff",
            icon: <FiUsers className="w-5 h-5 text-blue-600" />,
            link: "/settings/staff-list",
            color: "bg-blue-100",
            permission: "setting_view_edit"
        },
        {
            title: "Admin",
            description: "Invite & manage branch admins",
            icon: <FiUserCheck className="w-5 h-5 text-indigo-600" />,
            link: "/settings/admin",
            color: "bg-indigo-100",
        },
        {
            title: "Agents",
            description: "Invite & manage branch agents",
            icon: <FiUsers className="w-5 h-5 text-teal-600" />,
            link: "/settings/agent-list",
            color: "bg-teal-100",
        },
        {
            title: "Staff Permissions",
            description: "Manage staff access rights",
            icon: <FiShield className="w-5 h-5 text-green-600" />,
            link: "/settings/permissions",
            color: "bg-green-100",
            permission: "setting_view_edit"
        },
        {
            title: "Invoice Setting",
            description: "Voucher configuration",
            icon: <FiFileText className="w-5 h-5 text-purple-600" />,
            link: "/settings/invoice-setting",
            color: "bg-purple-100",
            permission: ["setting_view_edit", "finance_entry"]
        },
        {
            title: "App Settings",
            description: "Configure your application",
            icon: <FiSettings className="w-5 h-5 text-orange-600" />,
            link: "/settings/app-setting",
            color: "bg-orange-100",
            show: userData.isHeadBranch,
            permission: "setting_view_edit"
        }
    ];

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

    // Filter cards based on user preferences (e.g. isHeadBranch), keeping locked ones to display as grayed-out
    const filteredCards = settingsCards.filter(card => {
        if (card.show !== undefined && card.show !== true) return false;
        return true;
    });

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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
                        <p className="text-gray-600 mt-1">
                            Configure application settings and preferences
                        </p>
                    </div>

                    {/* Compact Settings Cards Grid */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h5 className="text-lg font-semibold text-gray-800">Application Settings</h5>
                            <p className="text-sm text-gray-500 mt-1">
                                Manage all application configurations and preferences
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                                {filteredCards.map((card, index) => {
                                    const isLocked = card.permission ? (Array.isArray(card.permission) ? !card.permission.some(p => check(p)) : !check(card.permission)) : false;
                                    return (
                                        <div
                                            key={index}
                                            onClick={() => !isLocked && navigate(card.link)}
                                            className={`block transition-all duration-200 ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:scale-105 hover:shadow-md cursor-pointer'}`}
                                        >
                                            <div className={`bg-white rounded-lg border p-3 hover:border-gray-300 transition-all duration-200 h-full relative ${isLocked ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200 bg-white'}`}>
                                                <div className="flex flex-col items-center text-center">
                                                    {isLocked && (
                                                        <div className="absolute top-1 right-1 p-1 text-slate-400 bg-slate-100 rounded-full" title="Locked (No permission)">
                                                            <FiLock className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                    <div className={`${isLocked ? 'bg-slate-200/50 text-slate-400' : card.color} rounded-lg p-2 mb-2`}>
                                                        {card.icon}
                                                    </div>
                                                    <h6 className={`text-sm font-semibold mb-1 leading-tight ${isLocked ? 'text-slate-400' : 'text-gray-800'}`}>
                                                        {card.title}
                                                    </h6>
                                                    <p className="text-xs text-gray-500 leading-tight">
                                                        {card.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;