import React, { useState, useEffect } from 'react';
import {
    FiUsers,
    FiShield,
    FiFileText,
    FiSettings,
    FiMail,
    FiPhone,
    FiCalendar,
    FiLock,
    FiCreditCard,
    FiGitBranch,
    FiUserCheck,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Header, Sidebar } from '../components/header';

const Settings = () => {
    const navigate = useNavigate();
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
            color: "bg-blue-100"
        },
        {
            title: "Staff Permissions",
            description: "Manage staff access rights",
            icon: <FiShield className="w-5 h-5 text-green-600" />,
            link: "/settings/permissions",
            color: "bg-green-100"
        },
        {
            title: "Invoice Setting",
            description: "Voucher configuration",
            icon: <FiFileText className="w-5 h-5 text-purple-600" />,
            link: "/settings/invoice-setting",
            color: "bg-purple-100"
        },
        {
            title: "App Settings",
            description: "Configure your application",
            icon: <FiSettings className="w-5 h-5 text-orange-600" />,
            link: "/settings/app-setting",
            color: "bg-orange-100",
            show: userData.isHeadBranch
        },
        {
            title: "Email Configuration",
            description: "Set up your SMTP settings",
            icon: <FiMail className="w-5 h-5 text-red-600" />,
            link: "/settings/email-setting",
            color: "bg-red-100"
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

    // Filter cards based on user permissions
    const filteredCards = settingsCards.filter(card =>
        card.show === undefined || card.show === true
    );

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
                                {filteredCards.map((card, index) => (
                                    <div
                                        key={index}
                                        onClick={() => navigate(card.link)}
                                        className="block transition-all hover:scale-105 hover:shadow-md cursor-pointer"
                                    >
                                        <div className="bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-all duration-200 h-full">
                                            <div className="flex flex-col items-center text-center">
                                                <div className={`${card.color} rounded-lg p-2 mb-2`}>
                                                    {card.icon}
                                                </div>
                                                <h6 className="text-sm font-semibold text-gray-800 mb-1 leading-tight">
                                                    {card.title}
                                                </h6>
                                                <p className="text-xs text-gray-500 leading-tight">
                                                    {card.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;