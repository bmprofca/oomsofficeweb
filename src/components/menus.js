// components/menus.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FiHome,
    FiUsers,
    FiBarChart2,
    FiSettings,
    FiChevronDown,
    FiUser,
    FiFolder,
    FiFileText,
    FiTrendingUp,
    FiPieChart,
    FiMenu,
    FiX,
    FiSearch,
    FiBell,
    FiLogOut,
    FiChevronLeft,
    FiChevronRight,
    FiMessageSquare,
    FiHelpCircle,
    FiCalendar,
    FiCreditCard,
    FiShield,
    FiMail,
    FiPlus
} from 'react-icons/fi';

// Sidebar Component
export const Sidebar = ({ sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed }) => {
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
    const sidebarRef = useRef(null);
    const submenuRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <FiHome className="text-base" />,
            badge: null,
            path: '/dashboard'
        },
        {
            id: 'task',
            label: 'Tasks',
            icon: <FiUsers className="text-base" />,
            path: '/task/view',
            submenu: [
                {
                    id: 'task-create',
                    label: 'New Task',
                    icon: <FiUser className="w-4 h-4" />,
                    path: '/task/create'
                },
                {
                    id: 'task-view',
                    label: 'View Task',
                    icon: <FiFolder className="w-4 h-4" />,
                    path: '/task/view'
                }
            ]
        },
        {
            id: 'client',
            label: 'Clients',
            icon: <FiUsers className="text-base" />,
            path: '/client/view',
            submenu: [
                {
                    id: 'client-create',
                    label: 'New Client',
                    icon: <FiUser className="w-4 h-4" />,
                    path: '/client/create'
                },
                {
                    id: 'client-view',
                    label: 'View Client',
                    icon: <FiFolder className="w-4 h-4" />,
                    path: '/client/view'
                }
            ]
        },
        {
            id: 'billing',
            label: 'Billing',
            icon: <FiBarChart2 className="text-base" />,
            badge: null,
            path: '/billing'
        },
        {
            id: 'finance',
            label: 'Finance',
            icon: <FiBarChart2 className="text-base" />,
            badge: null,
            path: '/finance/voucher/'
        },
        {
            id: 'staff',
            label: 'Staff Management',
            icon: <FiUsers className="text-base" />,
            badge: null,
            path: '/staff',
            submenu: [
                {
                    id: 'staff',
                    label: 'Staff',
                    icon: <FiUser className="w-4 h-4" />,
                    path: '/staff/view'
                },
                {
                    id: 'staff-team-report',
                    label: 'Team Report',
                    icon: <FiFileText className="w-4 h-4" />,
                    path: '/staff/team-report'
                },
                {
                    id: 'staff-attendance',
                    label: 'Attendance',
                    icon: <FiCalendar className="w-4 h-4" />,
                    path: '/staff/attendance'
                },
                {
                    id: 'staff-office-assistance',
                    label: 'Assistance',
                    icon: <FiHelpCircle className="w-4 h-4" />,
                    path: '/staff/office-assistance'
                }
            ]
        },
        {
            id: 'broadcast',
            label: 'Broadcast',
            icon: <FiMessageSquare className="text-base" />,
            badge: null,
            path: '/broadcast'
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: <FiSettings className="text-base" />,
            badge: null,
            path: '/settings'
        },
        {
            id: 'subscription',
            label: 'Subscription',
            icon: <FiCreditCard className="text-base" />,
            badge: null,
            path: '/subscription'
        }
    ];

    const handleMenuItemClick = (item, event) => {
        // Special case: Tasks/Clients should navigate to list page on click
        // and show "+ (create)" on the submenu arrow position.
        if (item.id === 'task' || item.id === 'client') {
            navigate(item.path);
            setSidebarOpen(false);
            setActiveSubmenu(null);
            return;
        }

        if (item.submenu) {
            if (sidebarCollapsed) {
                // For collapsed sidebar - show right side submenu
                const rect = event.currentTarget.getBoundingClientRect();
                setSubmenuPosition({
                    top: rect.top,
                    left: rect.right + 8
                });
                setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
            } else {
                // For expanded sidebar - toggle dropdown
                setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
            }
        } else {
            // Navigate directly for items without submenu
            navigate(item.path);
            setSidebarOpen(false);
            setActiveSubmenu(null);
        }
    };

    const handleSubmenuItemClick = (subItem) => {
        navigate(subItem.path);
        setSidebarOpen(false);
        setActiveSubmenu(null);
    };

    const handleMainItemNavigation = (item) => {
        // Navigate to main item path if it exists and has no submenu
        if (!item.submenu && item.path) {
            navigate(item.path);
            setSidebarOpen(false);
            setActiveSubmenu(null);
        }
        // If item has submenu and a main path, navigate to main path on double click
        if (item.submenu && item.path) {
            navigate(item.path);
            setSidebarOpen(false);
            setActiveSubmenu(null);
        }
    };

    const handleArrowClick = (itemId, event) => {
        event.stopPropagation();
        setActiveSubmenu(activeSubmenu === itemId ? null : itemId);
    };

    const isActiveMenuItem = (item) => {
        if (item.path === location.pathname) return true;
        if (item.submenu) {
            return item.submenu.some(subItem => subItem.path === location.pathname);
        }
        return false;
    };

    const isActiveSubmenuItem = (subItem) => {
        return subItem.path === location.pathname;
    };

    // Close submenu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // If there is an active submenu, and click is not inside:
            // - the collapsed submenu box (.sidebar-submenu)
            // - the expanded submenu (.sidebar-submenu-expanded)
            // - a sidebar item (.sidebar-item)
            // - the submenu arrow (.submenu-arrow)
            // then close active submenu.
            if (
                activeSubmenu &&
                !event.target.closest('.sidebar-submenu') &&
                !event.target.closest('.sidebar-submenu-expanded') &&
                !event.target.closest('.sidebar-item') &&
                !event.target.closest('.submenu-arrow')
            ) {
                setActiveSubmenu(null);
            }
        };

        // Use 'click' instead of 'mousedown' so that submenu clicks (React onClick) execute before the outside-click handler
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [activeSubmenu]);

    // Adjust submenu position on scroll/resize
    useEffect(() => {
        const handleResize = () => {
            if (activeSubmenu && sidebarCollapsed) {
                const activeItem = document.querySelector(`[data-menu-id="${activeSubmenu}"]`);
                if (activeItem) {
                    const rect = activeItem.getBoundingClientRect();
                    setSubmenuPosition({
                        top: rect.top,
                        left: rect.right + 8
                    });
                }
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize);
        };
    }, [activeSubmenu, sidebarCollapsed]);

    return (
        <>
            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity duration-200"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                ref={sidebarRef}
                className={`
                    fixed inset-y-0 left-0 z-30 bg-slate-800 shadow-xl transform transition-all duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    ${sidebarCollapsed ? 'w-12' : 'w-56'}
                `}
            >
                {/* Header */}
                <div className={`flex items-center justify-between h-16 border-b border-slate-700 flex-shrink-0 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
                    <div className={`w-6 h-6 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center ${sidebarCollapsed ? 'mx-auto' : ''}`}>
                        <span className="text-white font-bold text-sm">WB</span>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="flex-1 overflow-y-auto py-2">
                    <div className="space-y-1 px-1">
                        {menuItems.map((item) => (
                            <div key={item.id} className="relative">
                                {/* Main Menu Item */}
                                <button
                                    type="button"
                                    data-menu-id={item.id}
                                    onClick={(e) => handleMenuItemClick(item, e)}
                                    onDoubleClick={() => handleMainItemNavigation(item)}
                                    className={`
                                        w-full flex items-center sidebar-item rounded transition-all duration-150 group
                                        ${isActiveMenuItem(item)
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                        }
                                        ${sidebarCollapsed
                                            ? item.submenu ? 'justify-center px-1 py-2' : 'justify-center px-2 py-2'
                                            : 'px-2 py-2'
                                        }
                                        ${!sidebarCollapsed && item.submenu ? 'pr-8' : ''}
                                    `}
                                    title={sidebarCollapsed ? item.label : ''}
                                >
                                    <div className={`
                                        flex items-center justify-center transition-colors flex-shrink-0
                                        ${sidebarCollapsed ? 'w-5 h-5' : 'w-5 h-5'}
                                        ${isActiveMenuItem(item) ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                                    `}>
                                        {item.icon}
                                    </div>

                                    {!sidebarCollapsed && (
                                        <>
                                            <span className="ml-2 text-sm flex-1 text-left truncate">{item.label}</span>

                                            {/* Badge */}
                                            {item.badge && (
                                                <span className="bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center ml-auto mr-2 flex-shrink-0">
                                                    {item.badge}
                                                </span>
                                            )}

                                            {/* Submenu Arrow */}
                                            {item.submenu && (
                                                (() => {
                                                    const createSubItem =
                                                        item.submenu.find((s) => String(s.id).includes('create')) ||
                                                        item.submenu[0];

                                                    // For tasks/clients: arrow area becomes "+" (create link)
                                                    if (item.id === 'task' || item.id === 'client') {
                                                        return (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (createSubItem?.path) {
                                                                        navigate(createSubItem.path);
                                                                        setSidebarOpen(false);
                                                                        setActiveSubmenu(null);
                                                                    }
                                                                }}
                                                                className={`
                                                                    absolute right-2 submenu-arrow transition-transform duration-150 flex-shrink-0
                                                                    ${isActiveMenuItem(item) ? 'text-white' : 'text-slate-400'}
                                                                `}
                                                                aria-label={`Create ${item.label}`}
                                                                title={`Create ${item.label}`}
                                                            >
                                                                <FiPlus className="w-4 h-4" />
                                                            </button>
                                                        );
                                                    }

                                                    // Default behavior: chevron toggles submenu
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleArrowClick(item.id, e)}
                                                            className={`
                                                                absolute right-2 submenu-arrow transition-transform duration-150 flex-shrink-0
                                                                ${activeSubmenu === item.id ? 'rotate-180' : ''}
                                                                ${isActiveMenuItem(item) ? 'text-white' : 'text-slate-400'}
                                                            `}
                                                            aria-label="Toggle submenu"
                                                        >
                                                            <FiChevronDown className="w-4 h-4" />
                                                        </button>
                                                    );
                                                })()
                                            )}
                                        </>
                                    )}
                                </button>

                                {/* Submenu Indicator for Collapsed State */}
                                {sidebarCollapsed && item.submenu && (
                                    <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                                )}

                                {/* Traditional Submenu (Expanded State) */}
                                {!sidebarCollapsed && item.submenu && activeSubmenu === item.id && (
                                    // NOTE: added class 'sidebar-submenu-expanded' so document click handler can detect clicks inside
                                    <div className="sidebar-submenu-expanded mt-1 ml-4 pl-2 border-l border-slate-600 space-y-0.5 animate-in fade-in duration-150">
                                        {item.submenu.map((subItem) => (
                                            <button
                                                key={subItem.id}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();      // stop bubbling to parent menu
                                                    handleSubmenuItemClick(subItem);
                                                }}
                                                className={`
                                                    w-full flex items-center px-2 py-1.5 text-left rounded transition-all duration-150 group
                                                    ${isActiveSubmenuItem(subItem)
                                                        ? 'bg-slate-700 text-white'
                                                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                                    }
                                                `}
                                            >
                                                <div className={`
                                                    flex items-center justify-center w-4 h-4 mr-2 transition-colors
                                                    ${isActiveSubmenuItem(subItem) ? 'text-white' : 'text-slate-500 group-hover:text-white'}
                                                `}>
                                                    {subItem.icon}
                                                </div>
                                                <span className="text-sm truncate">{subItem.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right-side Submenu Box (Collapsed State Only) */}
                {sidebarCollapsed && activeSubmenu && (
                    <div
                        ref={submenuRef}
                        className="sidebar-submenu fixed w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-40 py-2 animate-in fade-in duration-150"
                        style={{
                            top: `${submenuPosition.top}px`,
                            left: `${submenuPosition.left}px`,
                        }}
                    >
                        <div className="px-3 py-1 border-b border-slate-700 mb-1">
                            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                                {menuItems.find(item => item.id === activeSubmenu)?.label}
                            </h3>
                        </div>
                        <div className="space-y-0.5">
                            {menuItems
                                .find(item => item.id === activeSubmenu)
                                ?.submenu?.map((subItem) => (
                                    <button
                                        key={subItem.id}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSubmenuItemClick(subItem);
                                        }}
                                        className={`
                                            w-full flex items-center px-3 py-2 text-left rounded mx-1 transition-all duration-150 group
                                            ${isActiveSubmenuItem(subItem)
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            flex items-center justify-center w-4 h-4 mr-2 transition-colors flex-shrink-0
                                            ${isActiveSubmenuItem(subItem) ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                                        `}>
                                            {subItem.icon}
                                        </div>
                                        <span className="text-sm truncate flex-1">{subItem.label}</span>
                                    </button>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

// Header Component
export const Header = ({ setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, title, subtitle }) => {
    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const location = useLocation();

    const getPageTitle = () => {
        if (title) return title;
        const titles = {
            '/dashboard': 'Dashboard',
            '/task': 'Tasks',
            '/task/create': 'Create Task',
            '/task/view': 'View Tasks',
            '/clients': 'Clients',
            '/client/create': 'Create Client',
            '/client/view': 'View Clients',
            '/billing': 'Billing',
            '/finance': 'Finance',
            '/finance/report': 'Finance Report',
            '/finance/voucher': 'Voucher Entry',
            '/finance/fixed-assets': 'Fixed Assets',
            '/staff': 'Staff Management',
            '/staff/view': 'View Staff',
            '/staff/team-report': 'Team Report',
            '/staff/attendance': 'Staff Attendance',
            '/staff/office-assistance': 'Office Assistance',
            '/broadcast': 'Broadcast',
            '/settings': 'Settings',
            '/subscription': 'Subscription'
        };
        return titles[location.pathname] || 'Dashboard';
    };

    const getPageSubtitle = () => {
        if (subtitle) return subtitle;
        const subtitles = {
            '/dashboard': 'Financial overview and key metrics',
            '/task': 'Manage and track tasks',
            '/clients': 'Manage client relationships',
            '/billing': 'Billing and invoicing management',
            '/finance': 'Financial management and reporting',
            '/staff': 'Staff management and coordination',
            '/broadcast': 'Broadcast messages and announcements',
            '/settings': 'System configuration and preferences',
            '/subscription': 'Subscription and billing management'
        };
        return subtitles[location.pathname] || 'Wealth Management System';
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileOpen && !event.target.closest('.profile-dropdown')) {
                setProfileOpen(false);
            }
            if (notificationsOpen && !event.target.closest('.notifications-dropdown')) {
                setNotificationsOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [profileOpen, notificationsOpen]);

    const handleSidebarCollapse = () => {
        setSidebarCollapsed(!sidebarCollapsed);
        localStorage.setItem('sidebarCollapsed', !sidebarCollapsed);
    }

    return (
        <header className="bg-white shadow-sm border-b border-slate-200 relative z-10">
            <div className="flex items-center justify-between h-16 px-4">
                {/* Left side */}
                <div className="flex items-center">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <FiMenu className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => handleSidebarCollapse()}
                        className="hidden lg:block p-1.5 rounded text-slate-500 hover:text-slate-700 bg-slate-100 transition-colors ml-2"
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <FiChevronLeft className={`w-5 h-5 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
                    </button>

                    <div className="ml-3 lg:ml-3">
                        <h1 className="text-base font-semibold text-slate-800">{getPageTitle()}</h1>
                        <p className="text-sm text-slate-500 hidden sm:block">
                            {getPageSubtitle()}
                        </p>
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center space-x-2">
                    {/* Search */}
                    <div className="hidden md:block relative">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-48 pl-8 pr-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                            />
                            <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400">
                                <FiSearch className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="relative notifications-dropdown">
                        <button
                            onClick={() => {
                                setNotificationsOpen(!notificationsOpen);
                                setProfileOpen(false);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors relative"
                        >
                            <FiBell className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Profile */}
                    <div className="relative profile-dropdown">
                        <button
                            onClick={() => {
                                setProfileOpen(!profileOpen);
                                setNotificationsOpen(false);
                            }}
                            className="flex items-center space-x-2 p-1 px-2 py-2 rounded bg-slate-100 transition-colors group"
                        >
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-white font-medium text-sm">SM</span>
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-medium text-slate-700">Sarah Miller</p>
                            </div>
                            <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${profileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in duration-150">
                                <div className="px-3 py-2 border-b border-slate-100">
                                    <p className="text-base font-medium text-slate-900">Sarah Miller</p>
                                    <p className="text-sm text-slate-500">s.miller@wealthbank.com</p>
                                </div>
                                <div className="py-1">
                                    <a href="#" className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors">
                                        <FiUser className="w-4 h-4 mr-2 text-slate-400" />
                                        My Profile
                                    </a>
                                    <a href="#" className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors">
                                        <FiSettings className="w-4 h-4 mr-2 text-slate-400" />
                                        Settings
                                    </a>
                                </div>
                                <div className="border-t border-slate-100 py-1">
                                    <a href="#" className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-slate-100 transition-colors">
                                        <FiLogOut className="w-4 h-4 mr-2" />
                                        Sign out
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};