import React, { useState, useEffect } from 'react';
import { Header, Sidebar } from '../components/header';
import {
    FiSend,
    FiFileText,
    FiSettings,
    FiBarChart2,
    FiMessageSquare,
    FiLayers,
    FiMail,
    FiLoader,
    FiMessageCircle,
    FiLock,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
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

const TAB_META = {
    whatsapp: { label: 'WhatsApp', accent: 'green', icon: FiMessageCircle },
    'text-message': { label: 'SMS', accent: 'blue', icon: FiMessageSquare },
    'email-channel': { label: 'Email', accent: 'indigo', icon: FiMail },
};

const ACCENT_CLASS = {
    green: {
        chip: 'bg-emerald-100 text-emerald-700',
        border: 'border-emerald-500',
        text: 'text-emerald-700',
        tab: 'border-emerald-500 text-emerald-600',
        hover: 'hover:border-emerald-300 hover:bg-emerald-50/40',
    },
    blue: {
        chip: 'bg-blue-100 text-blue-700',
        border: 'border-blue-500',
        text: 'text-blue-700',
        tab: 'border-blue-500 text-blue-600',
        hover: 'hover:border-blue-300 hover:bg-blue-50/40',
    },
    indigo: {
        chip: 'bg-indigo-100 text-indigo-700',
        border: 'border-indigo-500',
        text: 'text-indigo-700',
        tab: 'border-indigo-500 text-indigo-600',
        hover: 'hover:border-indigo-300 hover:bg-indigo-50/40',
    },
};

const ChannelSwitchPills = ({
    label,
    value,
    options,
    onChange,
    disabled = false,
    accent = 'blue',
    loading = false,
}) => {
    const accentStyles = {
        blue: 'bg-blue-600 text-white border-blue-600 shadow-blue-100',
        green: 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-100',
    };

    return (
        <div className="flex w-full flex-col gap-1.5 sm:w-auto">
            {label ? (
                <span className="text-xs font-medium text-slate-600">{label}</span>
            ) : null}
            <div className="flex items-center gap-1.5">
                <div className="inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {options.map((opt) => {
                        const active = value === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                disabled={disabled}
                                onClick={() => onChange(opt.value)}
                                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${active
                                    ? `${accentStyles[accent]}`
                                    : 'border-transparent bg-transparent text-slate-600 hover:bg-white hover:text-slate-800'
                                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
                {loading ? <FiLoader className="h-3.5 w-3.5 animate-spin text-emerald-600" /> : null}
            </div>
        </div>
    );
};

const Broadcast = () => {
    const navigate = useNavigate();
    const { tab } = useParams();
    const allowedTabs = ['whatsapp', 'text-message', 'email-channel'];
    const activeTab = allowedTabs.includes(tab) ? tab : 'whatsapp';
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
            title: "Template",
            description: "Manage WhatsApp templates",
            icon: <FiFileText className="w-5 h-5" />,
            link: "/broadcast/whatsapp/system/template",
            color: "bg-green-100 text-green-600",
            permission: "broadcast_config_edit"
        },
        {
            title: "Report",
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

    const textMessageChannelOptions = [
        { value: '0', label: 'Disabled' },
        { value: 'ooms', label: 'OOMS' },
    ];

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

    const renderEmptyChannelState = (title, description, accent = 'green') => (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-7 text-center">
            <FiMessageSquare className={`mx-auto mb-2.5 h-8 w-8 ${ACCENT_CLASS[accent].text}`} />
            <h3 className="text-base font-semibold text-slate-700">{title}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
        </div>
    );

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
    const renderCardGrid = (cards, accent = 'green') => (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                        whileHover={hasPermission ? { y: -4 } : {}}
                        whileTap={hasPermission ? { scale: 0.98 } : {}}
                        onClick={() => {
                            if (!hasPermission) {
                                toast.error("You do not have permission to access this feature.");
                                return;
                            }
                            navigate(card.link);
                        }}
                        className={`group ${hasPermission ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                    >
                        <div className={`relative h-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 ${ACCENT_CLASS[accent].hover}`}>
                            {!hasPermission && (
                                <div className="absolute right-3 top-3 rounded-full bg-slate-100 p-1 text-slate-400">
                                    <FiLock className="h-3 w-3" />
                                </div>
                            )}
                            <div className="flex h-full flex-col">
                                <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md ${card.color}`}>
                                    {card.icon}
                                </div>
                                <h6 className="mb-0.5 text-[13px] font-semibold leading-tight text-slate-800">
                                    {card.title}
                                </h6>
                                <p className="text-[11px] leading-relaxed text-slate-500">
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
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h5 className="text-base font-semibold text-slate-800">SMS</h5>
                        <p className="text-xs text-slate-500">Manage gateway, templates and campaign execution.</p>
                    </div>
                    {isHeadBranch && (
                        <ChannelSwitchPills
                            label="SMS Channel"
                            value={textMessageChannel}
                            options={textMessageChannelOptions}
                            onChange={handleTextMessageChannelChange}
                            accent="blue"
                        />
                    )}
                </div>
            </div>
            <div className="p-4">
                {textMessageChannel === 'ooms' ? (
                    renderCardGrid(textMessageCards, 'blue')
                ) : textMessageChannel === '0' ? (
                    renderEmptyChannelState(
                        'SMS broadcasting is currently disabled',
                        'Select OOMS channel to enable campaign and template tools.',
                        'blue'
                    )
                ) : null}
            </div>
        </div>
    );

    // Render WhatsApp section
    const renderWhatsappSection = () => (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
                <h5 className="text-base font-semibold text-slate-800">WhatsApp</h5>
            </div>
            <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-800">Active WhatsApp Channel</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Select which integration this branch uses for WhatsApp broadcasts
                        </p>
                    </div>
                    <ChannelSwitchPills
                        label="WhatsApp Channel"
                        value={whatsappChannel}
                        options={WHATSAPP_CHANNEL_OPTIONS.map((option) => ({
                            value: option.value,
                            label: option.label,
                        }))}
                        onChange={handleWhatsappChannelChange}
                        disabled={whatsappChannelSaving}
                        loading={whatsappChannelSaving}
                        accent="green"
                    />
                </div>
            </div>
            {whatsappChannel !== 'disabled' && (
                <div className="border-b border-slate-200 px-4 pt-2.5">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto">
                        {WHATSAPP_SUB_TABS.map((subTab) => (
                            <button
                                key={subTab.value}
                                type="button"
                                onClick={() => handleWhatsappSubTabChange(subTab.value)}
                                className={`border-b-2 px-1 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${whatsappSubTab === subTab.value
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                    }`}
                            >
                                {subTab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            )}
            <div className="p-4">
                {whatsappChannel === 'disabled' ? (
                    renderEmptyChannelState(
                        'WhatsApp broadcasting is currently disabled',
                        'Select an active WhatsApp channel to unlock template and send flows.',
                        'green'
                    )
                ) : (
                    renderWhatsappSubTabContent()
                )}
            </div>
        </div>
    );

    const renderEmailSection = () => (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
                <h5 className="text-base font-semibold text-slate-800">Email Broadcast</h5>
                <p className="text-xs text-slate-500">Control SMTP, reusable templates, and bulk campaign delivery.</p>
            </div>
            <div className="p-4">
                {renderCardGrid(emailCards, 'indigo')}
            </div>
        </div>
    );

    if (!check('broadcast_livechat') && !check('broadcast_send') && !check('broadcast_config_edit')) {
        return (
            <div className="min-h-screen bg-slate-50">
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
                <div className={`flex h-[calc(100vh-4rem)] items-center justify-center pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                    <div className="mx-4 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                            <FiLock className="h-7 w-7 text-slate-400" />
                        </div>
                        <h3 className="mb-1.5 text-base font-bold text-slate-800">Access Denied</h3>
                        <p className="text-sm text-slate-500">You do not have permission to access the Broadcast section.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
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
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-3"
                    >
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-200 px-4 py-3">
                                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <h5 className="mb-0.5 text-lg font-semibold text-slate-800">
                                            Broadcast
                                        </h5>
                                        <p className="text-sm text-slate-500">
                                            Manage WhatsApp, SMS and Email notifications
                                        </p>
                                    </div>
                                    <div className="grid w-full grid-cols-1 gap-1.5 sm:w-auto sm:grid-cols-3">
                                        {Object.entries(TAB_META).map(([key, meta]) => {
                                            const Icon = meta.icon;
                                            const active = activeTab === key;
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => navigate(`/broadcast/${key}`)}
                                                    className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${active ? `${ACCENT_CLASS[meta.accent].chip} border-transparent` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    <Icon className="h-3.5 w-3.5" />
                                                    <span className="truncate">{meta.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="p-4">
                                {activeTab === 'whatsapp' && renderWhatsappSection()}

                                {activeTab === 'text-message' && isHeadBranch && renderTextMessageSection()}
                                {activeTab === 'text-message' && !isHeadBranch && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-8 text-center"
                                    >
                                        <div className="mx-auto max-w-md text-slate-500">
                                            <FiMessageSquare className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                                            <h3 className="mb-1.5 text-base font-semibold text-slate-700">
                                                Restricted Access
                                            </h3>
                                            <p className="text-sm text-slate-500">
                                                SMS broadcasting is only available for head branches.
                                                Please contact your administrator for access.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'email-channel' && renderEmailSection()}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Broadcast;