import React, { useState, useEffect } from 'react';
import {
    FiDollarSign,
    FiHome,
    FiTrendingUp,
    FiShoppingCart,
    FiCreditCard,
    FiRepeat,
    FiFileText,
    FiPieChart,
    FiUsers,
    FiPackage,
    FiBarChart2,
    FiActivity,
    FiLock
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { SaleForm, PurchaseForm, TransactionModalManager } from '../components/Modals/CreateTransactions';
import CreateLedgerModal from '../components/create-ledger-modal';
import DiscountForm from '../components/discount-form';
import { motion } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import { useUserPermissions } from '../utils/permission-helper';
import { toast } from 'react-hot-toast';

const FinanceEntry = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { check } = useUserPermissions();
    const initialClientUsername = location.state?.username || '';
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [saleFormModal, setSaleFormModal] = useState(false);
    const [purchaseFormModal, setPurchaseFormModal] = useState(false);
    const [paymentReceivedFormModal, setPaymentReceivedFormModal] = useState(false);
    const [paymentSendFormModal, setPaymentSendFormModal] = useState(false);
    const [contraFormModal, setContraFormModal] = useState(false);
    const [journalFormModal, setJournalFormModal] = useState(false);
    const [createLedgerModal, setCreateLedgerModal] = useState(false);
    const [discountFormModal, setDiscountFormModal] = useState(false);
    const [expenseFormModal, setExpenseFormModal] = useState(false);

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

    const handleSaleSuccess = (saleData) => {
        console.log('Sale created successfully:', saleData);
        alert('Sale entry confirmed! Refreshing data...');
    };

    const handlePurchaseSuccess = (purchaseData) => {
        console.log('Purchase created successfully:', purchaseData);
        alert('Purchase entry confirmed! Refreshing data...');
    }

    const handlePaymentReceivedSubmit = (type, payload) => {
        console.log(`${type} transaction created:`, payload);
    };

    const handlePaymentSendSubmit = (type, payload) => {
        console.log(`${type} transaction created:`, payload);
    };

    const handleContraSubmit = (type, payload) => {
        console.log(`${type} transaction created:`, payload);
    };

    const handleJournalSubmit = (type, payload) => {
        console.log(`${type} transaction created:`, payload);
    };

    const handleLedgerCreateSuccess = (ledgerData) => {
        console.log('Ledger created successfully:', ledgerData);
        alert('Ledger created successfully! Refreshing data...');
    }

    const handleDiscountSubmit = (ledgerData) => {
        console.log('Ledger created successfully:', ledgerData);
        alert('Ledger created successfully! Refreshing data...');
    }

    const handleExpenseSubmit = (type, payload) => {
        console.log(`${type} transaction created:`, payload);
    };

    const formatCurrency = (amount) => {
        const value = Number(amount);
        if (!Number.isFinite(value)) return '0.00';
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const emptySummary = { totalCredit: 0, totalDebit: 0 };

    return (
        <div className="min-h-screen bg-slate-50 overflow-hidden">
            {/* Fixed Header */}
            <Header
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />

            {/* Fixed Sidebar */}
            <Sidebar
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />

            {/* Main Content Area - Scrollable */}
            <div className={`pt-16 transition-all duration-300 ease-in-out h-screen overflow-hidden ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="h-full overflow-y-auto p-3">
                    <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-3 h-full">
                        {/* Main Content Area - 70% */}
                        <div className="flex flex-col gap-3">
                            {/* Graphs Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {/* Graph 1 */}
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-slate-800">Revenue Overview</h3>
                                        <FiBarChart2 className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div className="h-48 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <div className="text-center text-slate-500">
                                            <FiBarChart2 className="w-12 h-12 mx-auto mb-2" />
                                            <p className="text-sm">Revenue Chart</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Graph 2 */}
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-slate-800">Expense Analysis</h3>
                                        <FiPieChart className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div className="h-48 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <div className="text-center text-slate-500">
                                            <FiPieChart className="w-12 h-12 mx-auto mb-2" />
                                            <p className="text-sm">Expense Chart</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='bg-white rounded-lg border border-slate-200 p-4'>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800">Financial Reports</h3>
                                    <div className="text-slate-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                                {/* Four Column Layout for Reports and Ledger */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { name: 'Sales Register', path: './sales', hoverBg: 'hover:bg-cyan-50 hover:border-cyan-200', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', svgPath: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
                                        { name: 'Purchase Register', path: './purchase', hoverBg: 'hover:bg-orange-50 hover:border-orange-200', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', svgPath: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
                                        { name: 'Received Register', path: './received', hoverBg: 'hover:bg-indigo-50 hover:border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', svgPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                                        { name: 'Payment Register', path: './payment', hoverBg: 'hover:bg-indigo-50 hover:border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', svgPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                                        { name: 'Contra Register', path: './contra', hoverBg: 'hover:bg-indigo-50 hover:border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', svgPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                                        { name: 'Journal Register', path: './journal', hoverBg: 'hover:bg-indigo-50 hover:border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', svgPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                                        { name: 'Expense Register', path: './expense', hoverBg: 'hover:bg-indigo-50 hover:border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', svgPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                                        { name: 'Discount Register', path: './discount', hoverBg: 'hover:bg-indigo-50 hover:border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', svgPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                                        { name: 'Cash & Bank', path: './bank-list', hoverBg: 'hover:bg-indigo-50 hover:border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', svgPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                                        { name: 'Capital Account', path: './capital-account', hoverBg: 'hover:bg-indigo-50 hover:border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', svgPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
                                    ].map((btn, idx) => {
                                        const isLocked = !check('finance_report');
                                        return (
                                            <motion.button
                                                key={idx}
                                                className={`flex items-center p-3 bg-slate-50 rounded-lg border w-full transition-colors relative ${isLocked
                                                        ? 'opacity-60 cursor-not-allowed border-slate-200 hover:bg-transparent'
                                                        : `border-slate-200 ${btn.hoverBg}`
                                                    }`}
                                                onClick={() => {
                                                    if (isLocked) {
                                                        toast.error('Need Access Permission');
                                                    } else {
                                                        navigate(btn.path);
                                                    }
                                                }}
                                                whileHover={!isLocked ? { scale: 1.02 } : {}}
                                                whileTap={!isLocked ? { scale: 0.98 } : {}}
                                            >
                                                <div className={`w-8 h-8 ${isLocked ? 'bg-slate-100 text-slate-400' : btn.iconBg} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                                                    {isLocked ? (
                                                        <FiLock className="w-4 h-4 text-slate-400" />
                                                    ) : (
                                                        <svg className={`w-4 h-4 ${btn.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={btn.svgPath} />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{btn.name}</span>
                                                {isLocked && <FiLock className="w-3.5 h-3.5 text-slate-400 ml-auto" />}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className='bg-white rounded-lg border border-slate-200 p-4'>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800">Financial Summary</h3>
                                    <div className="text-slate-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                                {/* Four Column Layout for Reports and Ledger */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { name: 'Trail Balance', hoverBg: 'hover:bg-blue-50 hover:border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', svgPaths: ['M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'] },
                                        { name: 'Balance Sheet', hoverBg: 'hover:bg-green-50 hover:border-green-200', iconBg: 'bg-green-100', iconColor: 'text-green-600', svgPaths: ['M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'] },
                                        { name: 'Profit & Loss A/c', hoverBg: 'hover:bg-purple-50 hover:border-purple-200', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', svgPaths: ['M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'] },
                                        { name: 'Loan & Advances', hoverBg: 'hover:bg-yellow-50 hover:border-yellow-200', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', svgPaths: ['M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'] },
                                        { name: 'GST Sales Report', hoverBg: 'hover:bg-red-50 hover:border-red-200', iconBg: 'bg-red-100', iconColor: 'text-red-600', svgPaths: ['M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'] },
                                        { name: 'GST Purchase Report', hoverBg: 'hover:bg-pink-50 hover:border-pink-200', iconBg: 'bg-pink-100', iconColor: 'text-pink-600', svgPaths: ['M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'] }
                                    ].map((btn, idx) => {
                                        const isLocked = !check('finance_report');
                                        return (
                                            <motion.button
                                                key={idx}
                                                className={`flex items-center p-3 bg-slate-50 rounded-lg border w-full transition-colors relative ${isLocked
                                                        ? 'opacity-60 cursor-not-allowed border-slate-200 hover:bg-transparent'
                                                        : `border-slate-200 ${btn.hoverBg}`
                                                    }`}
                                                onClick={() => {
                                                    if (isLocked) {
                                                        toast.error('Need Access Permission');
                                                    }
                                                }}
                                                whileHover={!isLocked ? { scale: 1.02 } : {}}
                                                whileTap={!isLocked ? { scale: 0.98 } : {}}
                                            >
                                                <div className={`w-8 h-8 ${isLocked ? 'bg-slate-100 text-slate-400' : btn.iconBg} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                                                    {isLocked ? (
                                                        <FiLock className="w-4 h-4 text-slate-400" />
                                                    ) : (
                                                        <svg className={`w-4 h-4 ${btn.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            {btn.svgPaths.map((d, i) => (
                                                                <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
                                                            ))}
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{btn.name}</span>
                                                {isLocked && <FiLock className="w-3.5 h-3.5 text-slate-400 ml-auto" />}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Cards - 30% */}
                        <div className="flex flex-col gap-3">
                            {/* Finance Entries Card */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4 h-fit">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Finance Entries</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { name: 'Sales', icon: FiTrendingUp, iconColor: 'text-yellow-600', iconBg: 'bg-yellow-100', setOpen: () => setSaleFormModal(true) },
                                        { name: 'Purchase', icon: FiShoppingCart, iconColor: 'text-red-600', iconBg: 'bg-red-100', setOpen: () => setPurchaseFormModal(true) },
                                        { name: 'Received', icon: FiCreditCard, iconColor: 'text-blue-600', iconBg: 'bg-blue-100', setOpen: () => setPaymentReceivedFormModal(true) },
                                        { name: 'Payment', icon: FiDollarSign, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-100', setOpen: () => setPaymentSendFormModal(true) },
                                        { name: 'Contra', icon: FiRepeat, iconColor: 'text-teal-600', iconBg: 'bg-teal-100', setOpen: () => setContraFormModal(true) },
                                        { name: 'Journal', icon: FiFileText, iconColor: 'text-red-600', iconBg: 'bg-red-100', setOpen: () => setJournalFormModal(true) },
                                        { name: 'Expenses', icon: FiPieChart, iconColor: 'text-orange-600', iconBg: 'bg-orange-100', setOpen: () => setExpenseFormModal(true) },
                                        { name: 'Discount', icon: FiPieChart, iconColor: 'text-orange-600', iconBg: 'bg-orange-100', setOpen: () => setDiscountFormModal(true) }
                                    ].map((entry, idx) => {
                                        const isLocked = !check('finance_entry');
                                        const Icon = entry.icon;
                                        return (
                                            <motion.div
                                                key={idx}
                                                className={`block transition-all hover:shadow-sm cursor-pointer relative rounded-lg border border-slate-200 p-3 transition-all duration-200 ${isLocked
                                                        ? 'opacity-60 cursor-not-allowed hover:bg-transparent'
                                                        : 'bg-white hover:border-slate-300'
                                                    }`}
                                                onClick={() => {
                                                    if (isLocked) {
                                                        toast.error('Need Access Permission');
                                                    } else {
                                                        entry.setOpen();
                                                    }
                                                }}
                                                whileHover={!isLocked ? { scale: 1.02 } : {}}
                                                whileTap={!isLocked ? { scale: 0.98 } : {}}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 min-w-0">
                                                        <div className={`${isLocked ? 'bg-slate-100 text-slate-400' : entry.iconBg} rounded-lg p-2 flex-shrink-0`}>
                                                            {isLocked ? (
                                                                <FiLock className="w-5 h-5 text-slate-400" />
                                                            ) : (
                                                                <Icon className={`w-5 h-5 ${entry.iconColor}`} />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h6 className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                                                                {entry.name}
                                                            </h6>
                                                        </div>
                                                    </div>
                                                    {isLocked && <FiLock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Additional Ledger Card */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4 h-fit">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800">Additional Ledger</h3>
                                    <div className="text-slate-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { name: 'Ledger Groups', action: () => navigate('./ledger-group'), hoverBg: 'hover:bg-blue-50 hover:border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', svgPaths: ['M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'], permission: 'finance_report' },
                                        { name: 'Create Ledger', action: () => setCreateLedgerModal(true), hoverBg: 'hover:bg-green-50 hover:border-green-200', iconBg: 'bg-green-100', iconColor: 'text-green-600', svgPaths: ['M12 6v6m0 0v6m0-6h6m-6 0H6'], permission: 'finance_entry' },
                                        { name: 'View Ledger', action: () => { }, hoverBg: 'hover:bg-purple-50 hover:border-purple-200', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', svgPaths: ['M15 12a3 3 0 11-6 0 3 3 0 016 0z', 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'], permission: 'finance_report' }
                                    ].map((btn, idx) => {
                                        const isLocked = !check(btn.permission);
                                        return (
                                            <motion.button
                                                key={idx}
                                                className={`flex items-center p-3 bg-slate-50 rounded-lg border w-full transition-colors relative ${isLocked
                                                        ? 'opacity-60 cursor-not-allowed border-slate-200 hover:bg-transparent'
                                                        : `border-slate-200 ${btn.hoverBg}`
                                                    }`}
                                                onClick={() => {
                                                    if (isLocked) {
                                                        toast.error('Need Access Permission');
                                                    } else {
                                                        btn.action();
                                                    }
                                                }}
                                                whileHover={!isLocked ? { scale: 1.02 } : {}}
                                                whileTap={!isLocked ? { scale: 0.98 } : {}}
                                            >
                                                <div className={`w-8 h-8 ${isLocked ? 'bg-slate-100 text-slate-400' : btn.iconBg} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                                                    {isLocked ? (
                                                        <FiLock className="w-4 h-4 text-slate-400" />
                                                    ) : (
                                                        <svg className={`w-4 h-4 ${btn.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            {btn.svgPaths.map((d, i) => (
                                                                <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
                                                            ))}
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{btn.name}</span>
                                                {isLocked && <FiLock className="w-3.5 h-3.5 text-slate-400 ml-auto" />}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* All Modals */}
            <SaleForm
                isOpen={saleFormModal}
                onClose={() => setSaleFormModal(false)}
                onSuccess={handleSaleSuccess}
                mode="modal"
            />

            <PurchaseForm
                isOpen={purchaseFormModal}
                onClose={() => setPurchaseFormModal(false)}
                onSuccess={handlePurchaseSuccess}
                mode="modal"
            />

            {/* Payment Received Modal */}
            <TransactionModalManager
                modalType="RECEIVE"
                isOpen={paymentReceivedFormModal}
                onClose={() => setPaymentReceivedFormModal(false)}
                onSubmit={handlePaymentReceivedSubmit}
                clientId={initialClientUsername}
                clientName={initialClientUsername || 'Selected Client'}
                formatCurrency={formatCurrency}
                summary={emptySummary}
            />

            {/* Payment Send Modal */}
            <TransactionModalManager
                modalType="PAYMENT"
                isOpen={paymentSendFormModal}
                onClose={() => setPaymentSendFormModal(false)}
                onSubmit={handlePaymentSendSubmit}
                clientId={initialClientUsername}
                clientName={initialClientUsername || 'Selected Client'}
                formatCurrency={formatCurrency}
                summary={emptySummary}
            />

            <TransactionModalManager
                modalType="CONTRA"
                isOpen={contraFormModal}
                onClose={() => setContraFormModal(false)}
                onSubmit={handleContraSubmit}
                formatCurrency={formatCurrency}
                summary={emptySummary}
                showFromBank={true}
                showToBank={true}
            />

            <TransactionModalManager
                modalType="JOURNAL"
                isOpen={journalFormModal}
                onClose={() => setJournalFormModal(false)}
                onSubmit={handleJournalSubmit}
                formatCurrency={formatCurrency}
                summary={emptySummary}
                clientId={initialClientUsername}
                clientName={initialClientUsername || ''}
                showSummary={true}
                showFromClient={true}
                showToClient={true}
            />

            <CreateLedgerModal
                isOpen={createLedgerModal}
                onClose={() => setCreateLedgerModal(false)}
                onSuccess={handleLedgerCreateSuccess}
                mode="modal"
            />

            <DiscountForm
                isOpen={discountFormModal}
                onClose={() => setDiscountFormModal(false)}
                onSuccess={handleDiscountSubmit}
                mode="modal"
            />

            <TransactionModalManager
                modalType="EXPENSE"
                isOpen={expenseFormModal}
                onClose={() => setExpenseFormModal(false)}
                onSubmit={handleExpenseSubmit}
                clientId={initialClientUsername}
                clientName={initialClientUsername || ''}
                formatCurrency={formatCurrency}
                summary={emptySummary}
                showClient={Boolean(initialClientUsername)}
            />
        </div>
    );
};

export default FinanceEntry;