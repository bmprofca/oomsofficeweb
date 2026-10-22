import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiRepeat, FiFileText, FiClipboard, FiSettings, FiCheck, FiBell, FiCalendar, FiClock, FiTrendingUp, FiZap, FiAlertCircle,  FiActivity, FiRefreshCw, FiDatabase, FiMail, FiShield, FiBarChart2 } from 'react-icons/fi';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const AutomationTab = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [automationSettings, setAutomationSettings] = useState({
        recurringTasks: true,
        autoBilling: false,
        paymentReminders: true,
        documentReminders: true,
        complianceAlerts: false,
        taxDeadlineAlerts: true,
        reportGeneration: false,
        clientOnboarding: true,
        emailNotifications: true,
        dataBackup: true,
        auditTrail: false,
        performanceReports: true
    });

    const handleAutomationChange = (setting) => {
        const next = {
            ...automationSettings,
            [setting]: !automationSettings[setting],
        };
        setAutomationSettings(next);
        saveAutomationSettings(next);
    };

    const saveAutomationSettings = async (policies) => {
        setSaving(true);
        setError('');
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Your session has expired. Please sign in again.');
            const response = await fetch(`${API_BASE_URL}/automation-policies`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ scope_type: 'branch', policies }),
            });
            const result = await response.json().catch(() => null);
            if (!response.ok || !result?.success) {
                throw new Error(result?.message || 'Failed to save automation policies');
            }
            if (result?.data?.policies) setAutomationSettings(result.data.policies);
        } catch (saveError) {
            setError(saveError.message || 'Failed to save automation policies');
        } finally {
            setSaving(false);
        }
    };

    const toggleAllAutomations = (enable) => {
        const next = {};
        automationFeatures.forEach(feature => {
            next[feature.key] = enable;
        });
        setAutomationSettings(next);
        saveAutomationSettings(next);
    };

    useEffect(() => {
        let active = true;
        const loadPolicies = async () => {
            try {
                const headers = getHeaders();
                if (!headers) throw new Error('Your session has expired. Please sign in again.');
                const response = await fetch(`${API_BASE_URL}/automation-policies?scope_type=branch`, { headers });
                const result = await response.json().catch(() => null);
                if (!response.ok || !result?.success) {
                    throw new Error(result?.message || 'Failed to load automation policies');
                }
                if (active && result?.data?.policies) setAutomationSettings(result.data.policies);
            } catch (loadError) {
                if (active) setError(loadError.message || 'Failed to load automation policies');
            } finally {
                if (active) setLoading(false);
            }
        };
        loadPolicies();
        return () => { active = false; };
    }, []);

    const automationFeatures = [
        {
            key: 'recurringTasks',
            title: 'Compliance Automation',
            description: 'Automatically create and assign compliance tasks based on predefined schedules',
            icon: FiRepeat,
            category: 'Task Management',
            impact: 'High',
            frequency: 'Daily',
            status: 'Active'
        },
        {
            key: 'autoBilling',
            title: 'Automatic Billing System',
            description: 'Generate and send invoices automatically for recurring services and subscriptions',
            icon: FiFileText,
            category: 'Billing',
            impact: 'High',
            frequency: 'Monthly',
            status: 'Inactive'
        },
        {
            key: 'paymentReminders',
            title: 'Smart Payment Reminders',
            description: 'Send automated payment reminders with escalation levels for overdue payments',
            icon: FiBell,
            category: 'Billing',
            impact: 'Medium',
            frequency: 'Weekly',
            status: 'Active'
        },
        {
            key: 'documentReminders',
            title: 'Document Collection Automation',
            description: 'Automatically remind clients to submit required documents with deadline tracking',
            icon: FiClipboard,
            category: 'Documentation',
            impact: 'High',
            frequency: 'Daily',
            status: 'Active'
        },
        {
            key: 'complianceAlerts',
            title: 'Compliance Deadline Alerts',
            description: 'Get proactive alerts for upcoming regulatory and compliance deadlines',
            icon: FiCalendar,
            category: 'Compliance',
            impact: 'Critical',
            frequency: 'Real-time',
            status: 'Inactive'
        },
        {
            key: 'taxDeadlineAlerts',
            title: 'Tax Filing Alerts',
            description: 'Automated reminders for GST, TDS, and income tax filing deadlines',
            icon: FiClock,
            category: 'Tax',
            impact: 'Critical',
            frequency: 'Weekly',
            status: 'Active'
        },
        {
            key: 'reportGeneration',
            title: 'Automated Report Generation',
            description: 'Schedule and generate financial reports automatically at specified intervals',
            icon: FiBarChart2,
            category: 'Reporting',
            impact: 'Medium',
            frequency: 'Monthly',
            status: 'Inactive'
        },
        {
            key: 'clientOnboarding',
            title: 'Client Onboarding Automation',
            description: 'Automated workflows for new client setup and document collection',
            icon: FiActivity,
            category: 'Operations',
            impact: 'High',
            frequency: 'On-demand',
            status: 'Active'
        },
        {
            key: 'emailNotifications',
            title: 'Smart Email Notifications',
            description: 'Automated email notifications for important updates and milestones',
            icon: FiMail,
            category: 'Communication',
            impact: 'Medium',
            frequency: 'Real-time',
            status: 'Active'
        },
        {
            key: 'dataBackup',
            title: 'Automatic Data Backup',
            description: 'Scheduled automatic backups of client data and documents',
            icon: FiDatabase,
            category: 'Security',
            impact: 'High',
            frequency: 'Daily',
            status: 'Active'
        },
        {
            key: 'auditTrail',
            title: 'Audit Trail Automation',
            description: 'Automatically log all system activities for compliance and security',
            icon: FiShield,
            category: 'Security',
            impact: 'Medium',
            frequency: 'Real-time',
            status: 'Inactive'
        },
        {
            key: 'performanceReports',
            title: 'Performance Analytics',
            description: 'Automated generation of team performance and productivity reports',
            icon: FiTrendingUp,
            category: 'Analytics',
            impact: 'Medium',
            frequency: 'Weekly',
            status: 'Active'
        }
    ];

    const calculateAutomationStats = () => {
        const totalAutomations = automationFeatures.length;
        const activeAutomations = automationFeatures.filter(f => automationSettings[f.key]).length;
        const enabledPercentage = Math.round((activeAutomations / totalAutomations) * 100);
        const highImpactCount = automationFeatures.filter(f => f.impact === 'High' || f.impact === 'Critical').length;
        const highImpactActive = automationFeatures.filter(f => (f.impact === 'High' || f.impact === 'Critical') && automationSettings[f.key]).length;
        
        return { totalAutomations, activeAutomations, enabledPercentage, highImpactCount, highImpactActive };
    };

    const stats = calculateAutomationStats();

    const getImpactColor = (impact) => {
        switch (impact) {
            case 'Critical': return 'bg-red-50 text-red-800 border border-red-200';
            case 'High': return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
            case 'Medium': return 'bg-blue-50 text-blue-800 border border-blue-200';
            default: return 'bg-gray-50 text-slate-800 border border-gray-200';
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'Task Management': return 'bg-blue-50 text-blue-700';
            case 'Billing': return 'bg-green-50 text-green-700';
            case 'Documentation': return 'bg-purple-50 text-purple-700';
            case 'Compliance': return 'bg-red-50 text-red-700';
            case 'Tax': return 'bg-yellow-50 text-yellow-700';
            case 'Reporting': return 'bg-blue-50 text-blue-700';
            case 'Operations': return 'bg-green-50 text-green-700';
            case 'Communication': return 'bg-purple-50 text-purple-700';
            case 'Security': return 'bg-red-50 text-red-700';
            case 'Analytics': return 'bg-blue-50 text-blue-700';
            default: return 'bg-gray-50 text-slate-700';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-50 rounded-2xl border border-gray-100 shadow-xl p-6"
        >
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                <div className="space-y-2">
                    <h3 className="font-display text-lg md:text-xl font-bold tracking-tight text-slate-900 text-slate-900">
                        Automation Center
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600">Configure automated workflows to streamline your client management processes</p>
                </div>
                <div className="flex items-center gap-3">
                    <motion.button
                        onClick={() => toggleAllAutomations(false)}
                        disabled={loading || saving}
                        className="px-5 py-2.5 bg-gray-500 text-white rounded-xl hover:shadow-lg hover:shadow-gray-500/25 transition-all duration-300 font-semibold"
                        whileHover={{ scale: 1.02, y: -2 }}
                    >
                        Disable All
                    </motion.button>
                    <motion.button
                        onClick={() => toggleAllAutomations(true)}
                        disabled={loading || saving}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 font-semibold"
                        whileHover={{ scale: 1.02, y: -2 }}
                    >
                        Enable All
                    </motion.button>
                </div>
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {error}
                </div>
            )}
            {saving && <div className="mb-4 text-xs text-slate-500" role="status">Saving automation policies…</div>}

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Active Automations</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{stats.activeAutomations}/{stats.totalAutomations}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                            <FiZap className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Automation Rate</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{stats.enabledPercentage}%</p>
                        </div>
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                            <FiActivity className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">High Impact Active</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{stats.highImpactActive}/{stats.highImpactCount}</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                            <FiAlertCircle className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Time Saved</p>
                            <p className="text-base font-bold text-slate-800 mt-1">40+ hrs</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                            <FiClock className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Automation Features Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {automationFeatures.map((feature, index) => {
                    const Icon = feature.icon;
                    const isActive = automationSettings[feature.key];
                    
                    return (
                        <motion.div
                            key={feature.key}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-6 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md ${
                                isActive 
                                    ? 'bg-blue-50 border-blue-200' 
                                    : 'bg-white border-gray-200'
                            }`}
                        >
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                                            isActive 
                                                ? 'bg-blue-600 text-white' 
                                                : 'bg-gray-200 text-slate-600'
                                        }`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-base font-bold text-slate-800">{feature.title}</h4>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getImpactColor(feature.impact)}`}>
                                                    {feature.impact} Impact
                                                </span>
                                            </div>
                                            <p className="text-slate-600 text-sm">{feature.description}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getCategoryColor(feature.category)}`}>
                                        {feature.category}
                                    </span>
                                    <div className="flex items-center gap-1 text-sm text-slate-600">
                                        <FiClock className="w-4 h-4" />
                                        <span>{feature.frequency}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-slate-600">
                                        <FiActivity className="w-4 h-4" />
                                        <span className={isActive ? 'text-green-600 font-semibold' : 'text-slate-600'}>
                                            {isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                                            isActive 
                                                ? 'bg-green-50' 
                                                : 'bg-gray-100'
                                        }`}>
                                            <div className="text-sm font-semibold">
                                                {isActive ? 'ON' : 'OFF'}
                                            </div>
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            {isActive ? 'Automation active' : 'Automation paused'}
                                        </div>
                                    </div>
                                    
                                    <motion.div
                                        className={`relative w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                                            isActive 
                                                ? 'bg-green-500 justify-end' 
                                                : 'bg-gray-400 justify-start'
                                        }`}
                                        onClick={() => handleAutomationChange(feature.key)}
                                    >
                                        <div className="w-6 h-6 bg-white rounded-full shadow-md"></div>
                                        {isActive && (
                                            <div className="absolute -right-1 -top-1">
                                                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                    <FiCheck className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Automation Performance */}
            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                            <FiTrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-800 mb-2">Automation Performance</h4>
                            <p className="text-sm text-slate-600">
                                Currently saving approximately <span className="font-bold text-green-600">40+ hours monthly</span> through active automations. 
                                Enable more features to increase efficiency.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <motion.button
                            onClick={() => toggleAllAutomations(true)}
                            className="px-5 py-2.5 bg-green-500 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 font-semibold"
                            whileHover={{ scale: 1.05, y: -2 }}
                        >
                            Optimize All
                        </motion.button>
                        <motion.button
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 font-semibold"
                            whileHover={{ scale: 1.05, y: -2 }}
                        >
                            View Analytics
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Category Distribution & Impact Analysis */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <FiSettings className="w-5 h-5 text-blue-600" />
                        Automation by Category
                    </h4>
                    <div className="space-y-3">
                        {Array.from(new Set(automationFeatures.map(f => f.category))).map((category, index) => {
                            const categoryFeatures = automationFeatures.filter(f => f.category === category);
                            const activeInCategory = categoryFeatures.filter(f => automationSettings[f.key]).length;
                            const percentage = (activeInCategory / categoryFeatures.length) * 100;
                            
                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-700">{category}</span>
                                        <span className="font-semibold text-slate-800">{activeInCategory}/{categoryFeatures.length} active</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="h-2 rounded-full bg-blue-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <FiAlertCircle className="w-5 h-5 text-yellow-600" />
                        Impact Analysis
                    </h4>
                    <div className="space-y-3">
                        {Array.from(new Set(automationFeatures.map(f => f.impact))).map((impact, index) => {
                            const impactFeatures = automationFeatures.filter(f => f.impact === impact);
                            const activeInImpact = impactFeatures.filter(f => automationSettings[f.key]).length;
                            const totalInImpact = impactFeatures.length;
                            const percentage = (activeInImpact / totalInImpact) * 100;
                            
                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-700">{impact} Impact</span>
                                        <span className="font-semibold text-slate-800">{activeInImpact}/{totalInImpact} active</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full ${
                                                impact === 'Critical' ? 'bg-red-500' :
                                                impact === 'High' ? 'bg-yellow-500' :
                                                impact === 'Medium' ? 'bg-blue-500' :
                                                'bg-gray-500'
                                            }`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Quick Automation Setup */}
            <div className="mt-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        <FiZap className="w-5 h-5 text-blue-600" />
                        Quick Automation Presets
                    </h4>
                    <motion.button
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                        <FiRefreshCw className="w-3 h-3" />
                        Reset to Default
                    </motion.button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="font-medium text-slate-800 mb-2">Compliance Focus</div>
                        <div className="text-sm text-slate-600 mb-3">Enables all compliance-related automations</div>
                        <motion.button
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:shadow-md transition-all duration-200 text-sm font-medium"
                            whileHover={{ scale: 1.05, y: -2 }}
                        >
                            Apply Preset
                        </motion.button>
                    </div>
                    
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="font-medium text-slate-800 mb-2">Billing Automation</div>
                        <div className="text-sm text-slate-600 mb-3">Full billing and payment automation suite</div>
                        <motion.button
                            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:shadow-md transition-all duration-200 text-sm font-medium"
                            whileHover={{ scale: 1.05, y: -2 }}
                        >
                            Apply Preset
                        </motion.button>
                    </div>
                    
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                        <div className="font-medium text-slate-800 mb-2">Document Management</div>
                        <div className="text-sm text-slate-600 mb-3">Document collection and reminder automations</div>
                        <motion.button
                            className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:shadow-md transition-all duration-200 text-sm font-medium"
                            whileHover={{ scale: 1.05, y: -2 }}
                        >
                            Apply Preset
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AutomationTab;
