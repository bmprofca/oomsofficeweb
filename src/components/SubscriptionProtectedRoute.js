import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiArrowLeft, FiCreditCard, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useSubscription } from '../hooks/useSubscription';
import { Header, Sidebar } from './header';

export const SubscriptionBlockedScreen = ({ requiredLevel }) => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    const planDetails = {
        core: {
            title: "Subscription Required",
            description: "You need an active subscription to access the OOMS CRM portal and manage your clients, tasks, and billing.",
            requiredPlan: "Business Plan",
            features: ["Task Management", "Client Database", "Billing & Invoicing", "Finance Ledger", "Broadcast Messages"]
        },
        'staff-management': {
            title: "Upgrade to BusinessPlus",
            description: "Staff Management is a premium feature. Please upgrade your plan to start managing your team, tracking attendance, and generating reports.",
            requiredPlan: "BusinessPlus",
            features: ["Staff Profiles", "Attendance Logs", "Office Assistance", "Team Performance Reports"]
        },
        'live-chat': {
            title: "Unlock Live Chat with BusinessPro",
            description: "Live Chat with customers directly is exclusive to BusinessPro. Upgrade your subscription to enable real-time messaging and chat widgets.",
            requiredPlan: "BusinessPro",
            features: ["WhatsApp Live Chat", "Chat Widgets", "Customer Communication Portal", "Dedicated Support Channel"]
        }
    };

    const details = planDetails[requiredLevel] || planDetails.core;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
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

            <div className={`pt-16 flex-1 flex items-center justify-center transition-all duration-300 ease-in-out px-4 py-12 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <motion.div
                    className="max-w-md w-full bg-white rounded-2xl border border-indigo-100 shadow-xl overflow-hidden"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-8 text-center text-white relative">
                        <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-white/30 animate-pulse">
                            <FiLock className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight">{details.title}</h3>
                        <p className="text-indigo-100 text-xs mt-2 font-medium capitalize">
                            Requires {details.requiredPlan}
                        </p>
                    </div>
                    <div className="p-8">
                        <p className="text-gray-600 text-sm text-center mb-6 leading-relaxed">
                            {details.description}
                        </p>

                        <div className="bg-indigo-50/50 rounded-xl p-5 mb-6 border border-indigo-100/50">
                            <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-3">
                                What you'll unlock:
                            </h4>
                            <ul className="space-y-2.5">
                                {details.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2.5 text-slate-700 text-sm">
                                        <FiCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            <motion.button
                                onClick={() => navigate('/subscription')}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <FiCreditCard className="w-4 h-4" />
                                View Pricing Plans
                            </motion.button>
                            <motion.button
                                onClick={() => navigate('/')}
                                className="w-full py-3 bg-white text-slate-600 rounded-xl font-medium border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <FiArrowLeft className="w-4 h-4" />
                                Back to Dashboard
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export const SubscriptionProtectedRoute = ({ children, requiredLevel }) => {
    const { hasAccess, loading } = useSubscription();

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const authorized = hasAccess(requiredLevel);

    if (!authorized) {
        return <SubscriptionBlockedScreen requiredLevel={requiredLevel} />;
    }

    return children;
};
