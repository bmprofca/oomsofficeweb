import React, { useState, useEffect } from 'react';
import { Header, Sidebar } from '../components/header';
import {
    FiSend,
    FiFileText,
    FiSettings,
    FiBarChart2,
    FiBell,
    FiMessageSquare,
    FiDatabase,
    FiLayers,
    FiMail,
    FiHome,
    FiChevronRight,
    FiLoader,
    FiMessageCircle,
    FiLock,
} from 'react-icons/fi';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    whatsappApi,
    WHATSAPP_CHANNEL_OPTIONS,
    WHATSAPP_SUB_TABS,
} from './broadcast/whatsapp/whatsappApi';
import { setStoredWhatsappChannel } from './broadcast/whatsapp/whatsappChannelStore';
import { useWhatsappChannel } from './broadcast/whatsapp/useWhatsappChannel';
import { useUserPermissions } from '../utils/permission-helper';

const Broadcast = () => {
    const navigate = useNavigate();
    const { tab } = useParams();
    const activeTab = tab || 'whatsapp';
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    const { check } = useUserPermissions();

    // Channel states
    const [textMessageChannel, setTextMessageChannel] = useState('ooms');
    const whatsappChannel = useWhatsappChannel();
    const [whatsappSubTab, setWhatsappSubTab] = useState('ooms system');
    const [whatsappChannelSaving, setWhatsappChannelSaving] = useState(false);
    const [isHeadBranch, setIsHeadBranch] = useState(true); // Mock data - in real app, get from props/API

    // Mock app settings
    const [appSettings, setAppSettings] = useState({
        text_message_channel: 'ooms',
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

    // Load initial settings
    useEffect(() => {
        setTextMessageChannel(appSettings.text_message_channel);
    }, [appSettings]);

    useEffect(() => {
        if (whatsappChannel !== 'disabled') {
            setWhatsappSubTab(whatsappChannel);
        }
    }, [whatsappChannel]);

    // Text Message Cards data
    const textMessageCards = [
        {
            title: "SMS Gateways",
            description: "Manage SMS configurations",
            icon: <FiSettings className="w-5 h-5" />,
            link: "/broadcast/sms/configs",
            color: "bg-blue-100 text-blue-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Templates",
            description: "Manage text template messages",
            icon: <FiFileText className="w-5 h-5" />,
            link: "/broadcast/sms/templates",
            color: "bg-blue-100 text-blue-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Campaigns",
            description: "View all text message campaigns",
            icon: <FiLayers className="w-5 h-5" />,
            link: "/broadcast/sms",
            color: "bg-blue-100 text-blue-600",
            permission: ["broadcast_send", "broadcast_config_edit"]
        },
        {
            title: "Launch Broadcast",
            description: "Send a new text message broadcast",
            icon: <FiSend className="w-5 h-5" />,
            link: "/broadcast/sms/create",
            color: "bg-blue-100 text-blue-600",
            permission: "broadcast_send"
        },
        {
            title: "Reports",
            description: "View SMS delivery logs and stats",
            icon: <FiBarChart2 className="w-5 h-5" />,
            link: "/broadcast/report?tab=text-message",
            color: "bg-blue-100 text-blue-600",
            permission: ["broadcast_send", "broadcast_config_edit"]
        }
    ];

    // WhatsApp OOMS Cards data
    const whatsappOomsCards = [
        {
            title: "Send Message",
            description: "Send WhatsApp messages",
            icon: <FiSend className="w-5 h-5" />,
            link: "./whatsapp/ooms?tab=send",
            color: "bg-green-100 text-green-600",
            permission: "broadcast_send"
        },
        {
            title: "Static Templates",
            description: "Manage static WhatsApp templates",
            icon: <FiLayers className="w-5 h-5" />,
            link: "./whatsapp/ooms?tab=static-template",
            color: "bg-green-100 text-green-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Dynamic Templates",
            description: "Manage dynamic WhatsApp templates",
            icon: <FiDatabase className="w-5 h-5" />,
            link: "./whatsapp/ooms?tab=dynamic-template",
            color: "bg-green-100 text-green-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Configuration",
            description: "WhatsApp connection settings",
            icon: <FiSettings className="w-5 h-5" />,
            link: "./whatsapp/ooms?tab=configuration",
            color: "bg-green-100 text-green-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Reports",
            description: "View WhatsApp delivery reports",
            icon: <FiBarChart2 className="w-5 h-5" />,
            link: "./report?tab=whatsapp",
            color: "bg-green-100 text-green-600",
            permission: ["broadcast_send", "broadcast_config_edit"]
        }
    ];

    // WhatsApp OneChatting Cards data
    const whatsappOneChattingCards = [
        {
            title: "Live Chat",
            description: "View and manage WhatsApp conversations",
            icon: <FiMessageCircle className="w-5 h-5" />,
            link: "/broadcast/whatsapp/onechatting/live-chat",
            color: "bg-green-100 text-green-600",
            permission: "broadcast_livechat"
        },
        {
            title: "Templates",
            description: "View OneChatting WhatsApp templates",
            icon: <FiFileText className="w-5 h-5" />,
            link: "/broadcast/whatsapp/onechatting/templates",
            color: "bg-green-100 text-green-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Send Message",
            description: "Send WhatsApp messages",
            icon: <FiSend className="w-5 h-5" />,
            link: "./whatsapp/onechatting?tab=send",
            color: "bg-green-100 text-green-600",
            permission: "broadcast_send"
        },
        {
            title: "Report",
            description: "View delivery reports",
            icon: <FiBarChart2 className="w-5 h-5" />,
            link: "./report?tab=whatsapp",
            color: "bg-green-100 text-green-600",
            permission: ["broadcast_send", "broadcast_config_edit"]
        },
        {
            title: "Configure",
            description: "OneChatting settings",
            icon: <FiSettings className="w-5 h-5" />,
            link: "/broadcast/whatsapp/onechatting/configure",
            color: "bg-green-100 text-green-600",
            permission: "broadcast_config_edit"
        }
    ];

    // WhatsApp Web (OOMS Web) Cards data
    const whatsappWebCards = [
        {
            title: "Connect WhatsApp",
            description: "Link this branch via QR or pairing code",
            icon: <FiMessageCircle className="w-5 h-5" />,
            link: "/broadcast/whatsapp/web/session",
            color: "bg-green-100 text-green-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Templates",
            description: "Manage WhatsApp Web message templates",
            icon: <FiFileText className="w-5 h-5" />,
            link: "/broadcast/whatsapp/web/templates",
            color: "bg-green-100 text-green-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Reports",
            description: "View WhatsApp Web delivery reports",
            icon: <FiBarChart2 className="w-5 h-5" />,
            link: "./report?tab=whatsapp",
            color: "bg-green-100 text-green-600",
            permission: ["broadcast_send", "broadcast_config_edit"]
        }
    ];

    // Push Notification Cards data
    const pushNotificationCards = [
        {
            title: "Send Notification",
            description: "Send push notifications",
            icon: <FiBell className="w-5 h-5" />,
            link: "./push-notification?tab=send",
            color: "bg-purple-100 text-purple-600",
            permission: "broadcast_send"
        },
        {
            title: "Static Templates",
            description: "Manage static notification templates",
            icon: <FiLayers className="w-5 h-5" />,
            link: "./push-notification?tab=static-template",
            color: "bg-purple-100 text-purple-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Dynamic Templates",
            description: "Manage dynamic notification templates",
            icon: <FiDatabase className="w-5 h-5" />,
            link: "./push-notification?tab=dynamic-template",
            color: "bg-purple-100 text-purple-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Configuration",
            description: "Notification settings",
            icon: <FiSettings className="w-5 h-5" />,
            link: "./push-notification?tab=configuration",
            color: "bg-purple-100 text-purple-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Reports",
            description: "View notification reports",
            icon: <FiBarChart2 className="w-5 h-5" />,
            link: "./report?tab=push",
            color: "bg-purple-100 text-purple-600",
            permission: ["broadcast_send", "broadcast_config_edit"]
        }
    ];

    const emailCards = [
        {
            title: "SMTP Configs",
            description: "Manage SMTP connections",
            icon: <FiSettings className="w-5 h-5" />,
            link: "/broadcast/email/configs",
            color: "bg-indigo-100 text-indigo-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Templates",
            description: "Manage email templates",
            icon: <FiFileText className="w-5 h-5" />,
            link: "/broadcast/email/templates",
            color: "bg-indigo-100 text-indigo-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Broadcasts",
            description: "View all email broadcasts",
            icon: <FiMail className="w-5 h-5" />,
            link: "/broadcast/email",
            color: "bg-indigo-100 text-indigo-600",
            permission: ["broadcast_send", "broadcast_config_edit"]
        },
        {
            title: "Create Broadcast",
            description: "Create new email campaign",
            icon: <FiSend className="w-5 h-5" />,
            link: "/broadcast/email/create",
            color: "bg-indigo-100 text-indigo-600",
            permission: "broadcast_send"
        },
        {
            title: "Reports",
            description: "View email campaign reports",
            icon: <FiBarChart2 className="w-5 h-5" />,
            link: "/broadcast/email/reports",
            color: "bg-indigo-100 text-indigo-600",
            permission: ["broadcast_send", "broadcast_config_edit"]
        },
    ];

    // Handle channel changes
    const handleTextMessageChannelChange = async (newChannel) => {
        setTextMessageChannel(newChannel);
        // In real app, make API call
        console.log('Updating Text Message channel to:', newChannel);
        // Simulate API call
        // await updateTextMessageChannel(newChannel);
    };

    const handleWhatsappChannelChange = async (newChannel) => {
        const previousChannel = whatsappChannel;
        setWhatsappChannelSaving(true);
        try {
            await whatsappApi.updateChannel({ channel: newChannel });
            setStoredWhatsappChannel(newChannel);
            toast.success('WhatsApp channel updated successfully');
            if (newChannel !== 'disabled') {
                setWhatsappSubTab(newChannel);
            }
        } catch (error) {
            setStoredWhatsappChannel(previousChannel);
            toast.error(error?.response?.data?.message || error.message || 'Failed to update WhatsApp channel');
        } finally {
            setWhatsappChannelSaving(false);
        }
    };

    const handleWhatsappSubTabChange = (subTabId) => {
        setWhatsappSubTab(subTabId);
    };

    const renderWhatsappSubTabContent = () => {
        if (whatsappSubTab === 'onechatting') {
            return renderCardGrid(whatsappOneChattingCards);
        }
        if (whatsappSubTab === 'ooms web') {
            return renderCardGrid(whatsappWebCards);
        }
        return renderCardGrid(whatsappOomsCards);
    };

    // Render card grid
    const renderCardGrid = (cards) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {cards.map((card, index) => {
                const hasPermission = card.permission 
                    ? (Array.isArray(card.permission) 
                        ? card.permission.some(p => check(p)) 
                        : check(card.permission))
                    : true;

                return (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={hasPermission ? { y: -5, scale: 1.02 } : {}}
                        whileTap={hasPermission ? { scale: 0.98 } : {}}
                        onClick={() => {
                            if (!hasPermission) {
                                toast.error("You do not have permission to access this feature.");
                                return;
                            }
                            navigate(card.link);
                        }}
                        className={`cursor-pointer ${!hasPermission ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 h-full relative">
                            {!hasPermission && (
                                <div className="absolute top-2 right-2 text-gray-400 bg-gray-100 p-1 rounded-full">
                                    <FiLock className="w-3 h-3" />
                                </div>
                            )}
                            <div className="flex flex-col items-center text-center">
                                <div className={`rounded-lg p-3 mb-3 ${card.color}`}>
                                    {card.icon}
                                </div>
                                <h6 className="text-sm font-semibold text-gray-800 mb-2 leading-tight">
                                    {card.title}
                                </h6>
                                <p className="text-xs text-gray-500 leading-tight">
                                    {card.description}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );

    // Render Text Message section
    const renderTextMessageSection = () => (
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <h5 className="text-lg font-semibold text-gray-800">SMS</h5>
                    {isHeadBranch && (
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-600 whitespace-nowrap">Select Channel</div>
                            <select
                                value={textMessageChannel}
                                onChange={(e) => handleTextMessageChannelChange(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none text-sm"
                            >
                                <option value="0">Disable</option>
                                <option value="ooms">OOMS</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-6">
                {textMessageChannel === 'ooms' ? (
                    renderCardGrid(textMessageCards)
                ) : textMessageChannel === '0' ? (
                    <div className="text-center py-12 text-gray-500">
                        <FiMessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-medium">Text Message broadcasting is currently disabled</p>
                        <p className="text-sm text-gray-400 mt-2">Enable it to start sending messages</p>
                    </div>
                ) : null}
            </div>
        </div>
    );

    // Render WhatsApp section
    const renderWhatsappSection = () => (
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="border-b border-gray-200 px-6 py-4">
                <h5 className="text-lg font-semibold text-gray-800">WhatsApp</h5>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-gray-800">Active WhatsApp Channel</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Select which integration this branch uses for WhatsApp broadcasts
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:min-w-[220px]">
                        <select
                            value={whatsappChannel}
                            onChange={(e) => handleWhatsappChannelChange(e.target.value)}
                            disabled={whatsappChannelSaving}
                            className="w-full sm:w-auto min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {WHATSAPP_CHANNEL_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {whatsappChannelSaving && (
                            <FiLoader className="w-4 h-4 animate-spin text-green-600 shrink-0" />
                        )}
                    </div>
                </div>
            </div>
            {whatsappChannel !== 'disabled' && (
                <div className="px-6 pt-4 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {WHATSAPP_SUB_TABS.map((subTab) => (
                            <button
                                key={subTab.value}
                                type="button"
                                onClick={() => handleWhatsappSubTabChange(subTab.value)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${whatsappSubTab === subTab.value
                                    ? 'border-green-500 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {subTab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            )}
            <div className="p-6">
                {whatsappChannel === 'disabled' ? (
                    <div className="text-center py-12 text-gray-500">
                        <FiMessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-medium">WhatsApp broadcasting is currently disabled</p>
                        <p className="text-sm text-gray-400 mt-2">Enable it to start sending messages</p>
                    </div>
                ) : (
                    renderWhatsappSubTabContent()
                )}
            </div>
        </div>
    );

    // Render Push Notification section
    const renderPushNotificationSection = () => (
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <h5 className="text-lg font-semibold text-gray-800">Push Notification</h5>
                </div>
            </div>
            <div className="p-6">
                {renderCardGrid(pushNotificationCards)}
            </div>
        </div>
    );

    const renderEmailSection = () => (
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="border-b border-gray-200 px-6 py-4">
                <h5 className="text-lg font-semibold text-gray-800">Email Broadcast</h5>
            </div>
            <div className="p-6">
                {renderCardGrid(emailCards)}
            </div>
        </div>
    );

    if (!check('broadcast_livechat') && !check('broadcast_send') && !check('broadcast_config_edit')) {
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
                <div className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                    <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm max-w-sm w-full mx-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiLock className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Access Denied</h3>
                        <p className="text-gray-500 text-sm">You do not have permission to access the Broadcast section.</p>
                    </div>
                </div>
            </div>
        );
    }

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
                    {/* Breadcrumbs */}
                    <motion.div
                        className="mb-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <nav className="flex items-center text-sm text-gray-600">
                            <Link
                                to="/"
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                            >
                                <FiHome className="w-4 h-4" />
                                <span>Dashboard</span>
                            </Link>
                            <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                            <Link
                                to="/broadcast"
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                            >
                                <FiSend className="w-4 h-4" />
                                <span>Broadcast</span>
                            </Link>
                            {tab && (
                                <>
                                    <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                                    <span className="text-gray-900 font-medium capitalize">
                                        {tab === 'email-channel' ? 'Email' : tab.replace('-', ' ')}
                                    </span>
                                </>
                            )}
                        </nav>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        {/* Header with Tabs */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="border-b border-gray-200 px-6 py-4">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div>
                                        <h5 className="text-lg font-semibold text-gray-800 mb-1">
                                            Broadcast
                                        </h5>
                                        <p className="text-gray-500 text-sm">
                                            Manage WhatsApp, SMS, Email, and Push Notifications
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="px-6 pt-4">
                                <div className="border-b border-gray-200">
                                    <nav className="-mb-px flex space-x-8 overflow-x-auto">
                                        <button
                                            onClick={() => navigate('/broadcast/whatsapp')}
                                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'whatsapp'
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            WhatsApp
                                        </button>
                                        <button
                                            onClick={() => navigate('/broadcast/text-message')}
                                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'text-message'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            SMS
                                        </button>
                                        <button
                                            onClick={() => navigate('/broadcast/email-channel')}
                                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'email-channel'
                                                ? 'border-indigo-500 text-indigo-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            Email
                                        </button>
                                        <button
                                            onClick={() => navigate('/broadcast/push')}
                                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'push'
                                                ? 'border-purple-500 text-purple-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            Push Notification
                                        </button>
                                    </nav>
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="p-6">
                                {activeTab === 'whatsapp' && renderWhatsappSection()}

                                {activeTab === 'text-message' && isHeadBranch && renderTextMessageSection()}
                                {activeTab === 'text-message' && !isHeadBranch && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center"
                                    >
                                        <div className="text-gray-500 max-w-md mx-auto">
                                            <FiMessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                                Restricted Access
                                            </h3>
                                            <p className="text-gray-500">
                                                SMS broadcasting is only available for head branches.
                                                Please contact your administrator for access.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'email-channel' && renderEmailSection()}

                                {activeTab === 'push' && renderPushNotificationSection()}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Broadcast;