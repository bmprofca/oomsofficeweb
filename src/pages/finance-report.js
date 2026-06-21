import React, { useState, useEffect } from 'react';
import { Sidebar, Header } from '../components/menus';
import {
    FiSearch,
    FiRefreshCw,
    FiDollarSign,
    FiTrendingUp,
    FiTrendingDown,
    FiPieChart,
    FiBarChart2,
    FiFileText,
    FiUsers,
    FiBriefcase,
    FiHome,
    FiCreditCard,
    FiUser,
    FiLock
} from 'react-icons/fi';
import { useUserPermissions } from '../utils/permission-helper';

const FinanceReport = () => {
    const { check } = useUserPermissions();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activePage, setActivePage] = useState('finance');
    const [dateRange, setDateRange] = useState('');
    const [showDateModal, setShowDateModal] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [loading, setLoading] = useState(true);

    // Finance data state
    const [financeData, setFinanceData] = useState({
        // Profit & Loss
        sale_amount: 0,
        other_income_amount: 0,
        income_total_amount: 0,
        direct_expense: 0,
        indirect_expense: 0,
        reimbursable_expense: 0,
        depreciation: 0,
        purchase: 0,
        expense_total_amount: 0,
        net_profit: 0,
        
        // Balance Sheet - Liabilities
        capital_amount: 0,
        loan_amount: 0,
        sundry_creditor_amount: 0,
        ca_amount: 0,
        stuff_amount: 0,
        total_d: 0,
        
        // Balance Sheet - Assets
        fixed_assets_amount: 0,
        sundry_debtor_amount: 0,
        ca_amount_advance: 0,
        loan_to_stuff_amount: 0,
        cash_bank_amount: 0,
        total_e: 0
    });

    // Initialize with default date range (current month)
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const formatDate = (date) => {
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        const from = formatDate(firstDay);
        const to = formatDate(lastDay);
        
        setFromDate(from);
        setToDate(to);
        setDateRange(`${from} - ${to}`);
        
        // Load initial data
        fetchFinanceData(from, to);
    }, []);

    // Mock API call to fetch finance data
    const fetchFinanceData = (from, to) => {
        setLoading(true);
        
        // Simulate API delay
        setTimeout(() => {
            // Mock data - in real app, this would come from an API
            const mockData = {
                sale_amount: 1250000,
                other_income_amount: 50000,
                income_total_amount: 1300000,
                direct_expense: 350000,
                indirect_expense: 180000,
                reimbursable_expense: 75000,
                depreciation: 50000,
                purchase: 200000,
                expense_total_amount: 855000,
                net_profit: 445000,
                capital_amount: 800000,
                loan_amount: 300000,
                sundry_creditor_amount: 150000,
                ca_amount: 75000,
                stuff_amount: 50000,
                total_d: 1375000,
                fixed_assets_amount: 600000,
                sundry_debtor_amount: 250000,
                ca_amount_advance: 100000,
                loan_to_stuff_amount: 75000,
                cash_bank_amount: 350000,
                total_e: 1375000
            };

            setFinanceData(mockData);
            setLoading(false);
        }, 1000);
    };

    // Format currency
    const formatCurrency = (amount) => {
        if (!check('finance_balance_view')) {
            return '₹ *.*';
        }
        return `₹${Number(amount).toLocaleString('en-IN', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        })}`;
    };

    // Handle date range search
    const handleSearch = () => {
        const [from, to] = dateRange.split(' - ');
        fetchFinanceData(from, to);
    };

    // Handle date range modal save
    const handleSaveDateRange = () => {
        setDateRange(`${fromDate} - ${toDate}`);
        setShowDateModal(false);
        fetchFinanceData(fromDate, toDate);
    };

    // Loading component
    const LoadingSpinner = () => (
        <div className="flex justify-center items-center py-2">
            <div className="sk-wave sk-primary">
                <div className="sk-wave-rect bg-blue-600"></div>
                <div className="sk-wave-rect bg-blue-600"></div>
                <div className="sk-wave-rect bg-blue-600"></div>
                <div className="sk-wave-rect bg-blue-600"></div>
                <div className="sk-wave-rect bg-blue-600"></div>
            </div>
        </div>
    );

    if (!check('finance_report')) {
        return (
            <div className="flex h-screen bg-slate-50">
                <Sidebar
                    activePage={activePage}
                    setActivePage={setActivePage}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header
                        setSidebarOpen={setSidebarOpen}
                        activePage={activePage}
                        title="Finance Report"
                        subtitle="View financial reports and analytics"
                    />
                    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
                        <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full mx-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiLock className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Access Denied</h3>
                            <p className="text-slate-500 text-sm">You need the Finance Report access permission to view this report.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar
                activePage={activePage}
                setActivePage={setActivePage}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header
                    setSidebarOpen={setSidebarOpen}
                    activePage={activePage}
                    title="Finance Report"
                    subtitle="View financial reports and analytics"
                />

                <main className="flex-1 overflow-y-auto p-3">
                    <div className="max-w-7xl mx-auto">
                        {/* Finance Navigation */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-3">
                            <div className="flex space-x-2">
                                <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium">
                                    Report
                                </button>
                                <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium">
                                    Analytics
                                </button>
                                <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium">
                                    Statements
                                </button>
                            </div>
                        </div>

                        {/* Main Card */}
                        <div className="bg-white rounded-md shadow-sm border border-slate-200">
                            {/* Card Header */}
                            <div className="border-b border-slate-200 px-4 py-3">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                                    <h5 className="text-lg font-semibold text-slate-800 mb-0">Finance Report</h5>
                                    <div className="flex flex-col lg:flex-row gap-2">
                                        <button
                                            onClick={() => setShowDateModal(true)}
                                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            <FiRefreshCw className="w-4 h-4" />
                                            Period
                                        </button>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={dateRange}
                                                onChange={(e) => setDateRange(e.target.value)}
                                                placeholder="DD/MM/YYYY - DD/MM/YYYY"
                                                className="px-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none w-48"
                                            />
                                            <button
                                                onClick={handleSearch}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                                            >
                                                <FiSearch className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Profit & Loss Section */}
                                    <div>
                                        <div className="text-center text-slate-800 font-bold mb-3 text-lg">
                                            PROFIT & LOSS
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border border-slate-200">
                                                <thead>
                                                    <tr className="bg-slate-50">
                                                        <th className="text-start p-3 font-medium text-slate-700 border-b">PARTICULAR</th>
                                                        <th className="text-end p-3 font-medium text-slate-700 border-b">AMOUNT</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Sales */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Sales</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-chart-sale" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.sale_amount)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Other Income */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Add : Other income</td>
                                                        <td className="text-end p-3 border-b">
                                                            {loading ? (
                                                                <LoadingSpinner />
                                                            ) : (
                                                                formatCurrency(financeData.other_income_amount)
                                                            )}
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Total Income */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b font-semibold text-slate-800">Total (A)</td>
                                                        <td className="text-end p-3 border-b font-semibold">
                                                            {loading ? (
                                                                <LoadingSpinner />
                                                            ) : (
                                                                formatCurrency(financeData.income_total_amount)
                                                            )}
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Less Section */}
                                                    <tr>
                                                        <th colSpan="2" className="text-start p-3 border-b font-semibold text-slate-800 bg-slate-50">
                                                            Less:
                                                        </th>
                                                    </tr>
                                                    
                                                    {/* Purchase */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Purchase</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-purchase" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.purchase)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Direct Expense */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Direct Expense</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-chart-direct-expense" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.direct_expense)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Indirect Expense */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Indirect Expense</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-chart-indirect-expense" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.indirect_expense)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Reimbursable Expense */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Reimbursable Expense</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-chart-reimbursable-expense" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.reimbursable_expense)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Depreciation */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Depreciation</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-fixed-assets" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.depreciation)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Total Expense */}
                                                    <tr className="hover:bg-slate-50">
                                                        <th className="text-start p-3 border-b font-semibold text-slate-800">Total (B)</th>
                                                        <td className="text-end p-3 border-b font-semibold">
                                                            <a href="/view-chart-expense" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.expense_total_amount)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Net Profit */}
                                                    <tr className="hover:bg-slate-50 bg-green-50">
                                                        <th className="text-start p-3 font-semibold text-green-800">
                                                            Net Profit (C=A-B)
                                                        </th>
                                                        <td className="text-end p-3 font-semibold text-green-800">
                                                            {loading ? (
                                                                <LoadingSpinner />
                                                            ) : (
                                                                formatCurrency(financeData.net_profit)
                                                            )}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Balance Sheet Section */}
                                    <div>
                                        <div className="text-center text-slate-800 font-bold mb-3 text-lg">
                                            BALANCE SHEET
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border border-slate-200">
                                                <thead>
                                                    <tr className="bg-slate-50">
                                                        <th className="text-start p-3 font-medium text-slate-700 border-b">LIABILITIES</th>
                                                        <th className="text-end p-3 font-medium text-slate-700 border-b">AMOUNT</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Capital Amount */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Capital Amount</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-capital-accounts" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.capital_amount)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Loan */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Loan</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-bank-list" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.loan_amount)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Sundry Creditors */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Sundry Creditors</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-creditors" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.sundry_creditor_amount)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Payable to CA */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Payable to CA</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/ca-list" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.ca_amount)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Payable to Staff */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Payable to Staff</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-stuff" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.stuff_amount)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Total Liability */}
                                                    <tr className="hover:bg-slate-50 bg-blue-50">
                                                        <th className="text-start p-3 font-semibold text-blue-800">Total Liability (A)</th>
                                                        <th className="text-end p-3 font-semibold text-blue-800">
                                                            {loading ? (
                                                                <LoadingSpinner />
                                                            ) : (
                                                                formatCurrency(financeData.total_d)
                                                            )}
                                                        </th>
                                                    </tr>
                                                </tbody>
                                                
                                                {/* Assets Section */}
                                                <thead>
                                                    <tr className="bg-slate-50">
                                                        <th className="text-start p-3 font-medium text-slate-700 border-b">ASSETS</th>
                                                        <th className="text-end p-3 font-medium text-slate-700 border-b">AMOUNT</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Fixed Assets */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Fixed Assets</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-fixed-assets" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.fixed_assets_amount)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Sundry Debtors */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Sundry Debtors</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-debtors" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.sundry_debtor_amount)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Advance to CA */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Advance to CA</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/ca-list" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.ca_amount_advance)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Advance to Staff */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Advance to Staff</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-stuff" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.loan_to_stuff_amount)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Cash & Bank */}
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="text-start p-3 border-b text-slate-700">Cash & Bank</td>
                                                        <td className="text-end p-3 border-b">
                                                            <a href="/view-bank-list" className="text-blue-600 hover:text-blue-800">
                                                                {loading ? (
                                                                    <LoadingSpinner />
                                                                ) : (
                                                                    formatCurrency(financeData.cash_bank_amount)
                                                                )}
                                                            </a>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Total Assets */}
                                                    <tr className="hover:bg-slate-50 bg-green-50">
                                                        <th className="text-start p-3 font-semibold text-green-800">Total (E)</th>
                                                        <td className="text-end p-3 font-semibold text-green-800">
                                                            {loading ? (
                                                                <LoadingSpinner />
                                                            ) : (
                                                                formatCurrency(financeData.total_e)
                                                            )}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Date Range Modal */}
            {showDateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold text-slate-800">Default Date Range</h3>
                            <button
                                onClick={() => setShowDateModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                                    <input
                                        type="text"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        placeholder="DD/MM/YYYY"
                                        className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                                    <input
                                        type="text"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        placeholder="DD/MM/YYYY"
                                        className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t">
                            <button
                                onClick={() => setShowDateModal(false)}
                                className="px-4 py-2 text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleSaveDateRange}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceReport;