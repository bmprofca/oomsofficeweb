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
    FiActivity
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { SaleForm, TransactionModalManager } from '../components/Modals/CreateTransactions';
import PurchaseForm from '../components/purchase-form';
import CreateLedgerModal from '../components/create-ledger-modal';
import DiscountForm from '../components/discount-form';
import ExpenseForm from '../components/expense-form';
import { motion } from 'framer-motion';
import { Header, Sidebar } from '../components/header';

const FinanceEntry = () => {
    const navigate = useNavigate();
    const location = useLocation();
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

    const handleExpenseSubmit = (ledgerData) => {
        console.log('Ledger created successfully:', ledgerData);
        alert('Ledger created successfully! Refreshing data...');
    }

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
                                    {/* Sales Register */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-cyan-50 hover:border-cyan-200 transition-colors w-full"
                                        onClick={() => navigate('./sales')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Sales Register</span>
                                    </motion.button>

                                    {/* Purchase Register */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-orange-50 hover:border-orange-200 transition-colors w-full"
                                        onClick={() => navigate('./purchase')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Purchase Register</span>
                                    </motion.button>

                                    {/* Received Register */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-full"
                                        onClick={() => navigate('./received')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Received Register</span>
                                    </motion.button>

                                    {/* Payment Register */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-full"
                                        onClick={() => navigate('./payment')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Payment Register</span>
                                    </motion.button>

                                    {/* Contra Register */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-full"
                                        onClick={() => navigate('./contra')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Contra Register</span>
                                    </motion.button>

                                    {/* Journal Register */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-full"
                                        onClick={() => navigate('./journal')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Journal Register</span>
                                    </motion.button>

                                    {/* Expense Register */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-full"
                                        onClick={() => navigate('./expense')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Expense Register</span>
                                    </motion.button>

                                    {/* Expense Discount */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-full"
                                        onClick={() => navigate('./discount')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Discount Register</span>
                                    </motion.button>

                                    {/* Cash & Bank - Expense Discount Style */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-full"
                                        onClick={() => navigate('./bank-list')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Cash & Bank</span>
                                    </motion.button>

                                    {/* Capital Account - Expense Discount Style */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-full"
                                        onClick={() => navigate('./capital-account')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Capital Account</span>
                                    </motion.button>
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
                                    {/* Trail Balance */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors w-full"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Trail Balance</span>
                                    </motion.button>

                                    {/* Balance Sheet */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-green-50 hover:border-green-200 transition-colors w-full"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Balance Sheet</span>
                                    </motion.button>

                                    {/* Profit & Loss A/c */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-200 transition-colors w-full"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Profit & Loss A/c</span>
                                    </motion.button>

                                    {/* Loan & Advances */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-yellow-50 hover:border-yellow-200 transition-colors w-full"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Loan & Advances</span>
                                    </motion.button>

                                    {/* GST Sales Report */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-colors w-full"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">GST Sales Report</span>
                                    </motion.button>

                                    {/* GST Purchase Report */}
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-pink-50 hover:border-pink-200 transition-colors w-full"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">GST Purchase Report</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Cards - 30% */}
                        <div className="flex flex-col gap-3">
                            {/* Finance Entries Card */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4 h-fit">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Finance Entries</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Sales Card */}
                                    <motion.div
                                        className="block transition-all hover:shadow-sm cursor-pointer"
                                        onClick={() => setSaleFormModal(true)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-all duration-200 h-full">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-yellow-100 rounded-lg p-2 flex-shrink-0">
                                                    <FiTrendingUp className="w-5 h-5 text-yellow-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h6 className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                                                        Sales
                                                    </h6>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Purchase Card */}
                                    <motion.div
                                        className="block transition-all hover:shadow-sm cursor-pointer"
                                        onClick={() => setPurchaseFormModal(true)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-all duration-200 h-full">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-red-100 rounded-lg p-2 flex-shrink-0">
                                                    <FiShoppingCart className="w-5 h-5 text-red-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h6 className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                                                        Purchase
                                                    </h6>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Received Card */}
                                    <motion.div
                                        className="block transition-all hover:shadow-sm cursor-pointer"
                                        onClick={() => setPaymentReceivedFormModal(true)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-all duration-200 h-full">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                                                    <FiCreditCard className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h6 className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                                                        Received
                                                    </h6>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Payment Card */}
                                    <motion.div
                                        className="block transition-all hover:shadow-sm cursor-pointer"
                                        onClick={() => setPaymentSendFormModal(true)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-all duration-200 h-full">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-indigo-100 rounded-lg p-2 flex-shrink-0">
                                                    <FiDollarSign className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h6 className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                                                        Payment
                                                    </h6>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Contra Card */}
                                    <motion.div
                                        className="block transition-all hover:shadow-sm cursor-pointer"
                                        onClick={() => setContraFormModal(true)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-all duration-200 h-full">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-teal-100 rounded-lg p-2 flex-shrink-0">
                                                    <FiRepeat className="w-5 h-5 text-teal-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h6 className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                                                        Contra
                                                    </h6>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Journal Card */}
                                    <motion.div
                                        className="block transition-all hover:shadow-sm cursor-pointer"
                                        onClick={() => setJournalFormModal(true)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-all duration-200 h-full">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-red-100 rounded-lg p-2 flex-shrink-0">
                                                    <FiFileText className="w-5 h-5 text-red-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h6 className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                                                        Journal
                                                    </h6>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Expenses Card */}
                                    <motion.div
                                        className="block transition-all hover:shadow-sm cursor-pointer"
                                        onClick={() => setExpenseFormModal(true)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-all duration-200 h-full">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-orange-100 rounded-lg p-2 flex-shrink-0">
                                                    <FiPieChart className="w-5 h-5 text-orange-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h6 className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                                                        Expenses
                                                    </h6>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Discount Card */}
                                    <motion.div
                                        className="block transition-all hover:shadow-sm cursor-pointer"
                                        onClick={() => setDiscountFormModal(true)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-all duration-200 h-full">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-orange-100 rounded-lg p-2 flex-shrink-0">
                                                    <FiPieChart className="w-5 h-5 text-orange-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h6 className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                                                        Discount
                                                    </h6>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
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
                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors w-full"
                                        onClick={() => navigate('./ledger-group')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Ledger Groups</span>
                                    </motion.button>

                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-green-50 hover:border-green-200 transition-colors w-full"
                                        onClick={() => setCreateLedgerModal(true)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Create Ledger</span>
                                    </motion.button>

                                    <motion.button
                                        className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-200 transition-colors w-full"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">View Ledger</span>
                                    </motion.button>
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

            <ExpenseForm
                isOpen={expenseFormModal}
                onClose={() => setExpenseFormModal(false)}
                onSuccess={handleExpenseSubmit}
                mode="modal"
            />
        </div>
    );
};

export default FinanceEntry;