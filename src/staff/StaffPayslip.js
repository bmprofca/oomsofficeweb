// staff/StaffPayslip.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCalendar,
    FiDownload,
    FiFileText,
    FiChevronDown,
    FiChevronUp,
    FiPrinter,
    FiDollarSign,
    FiUsers,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiTrendingUp,
    FiInfo,
    FiLock
} from 'react-icons/fi';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';

const StaffPayslip = ({ username, variants }) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentDay = currentDate.getDate();
    
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generatingPayslip, setGeneratingPayslip] = useState(false);
    const [generatingDetailed, setGeneratingDetailed] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailedData, setDetailedData] = useState(null);
    const [expandedMonth, setExpandedMonth] = useState(null);
    const [error, setError] = useState(null);
    const [completedMonths, setCompletedMonths] = useState([]);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);

    // Check if a month is completed (all days passed or month is in the past)
    const isMonthCompleted = (month, year) => {
        if (year < currentYear) return true;
        if (year > currentYear) return false;
        
        // Same year
        if (month < currentMonth) return true;
        if (month > currentMonth) return false;
        
        // Current month - check if all days are completed
        // A month is considered completed when we are past the last day of the month
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        return currentDay > lastDayOfMonth;
    };

    // Get the last completed month (for default expansion)
    const getLastCompletedMonth = () => {
        for (let i = currentMonth - 1; i >= 1; i--) {
            if (isMonthCompleted(i, currentYear)) {
                return i;
            }
        }
        return null;
    };

    // Fetch all payslips for the year
    useEffect(() => {
        if (username) {
            fetchAllPayslips();
        }
    }, [selectedYear, username]);

    const fetchAllPayslips = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const payslipData = [];
            const completed = [];
            
            // Only fetch for months that are completed
            for (let month = 1; month <= 12; month++) {
                const isCompleted = isMonthCompleted(month, selectedYear);
                
                if (isCompleted) {
                    completed.push(month);
                    
                    try {
                        const response = await fetch(
                            `${API_BASE_URL}/attendance/generate-payslip`,
                            {
                                method: 'POST',
                                headers: getHeaders(),
                                body: JSON.stringify({
                                    username: username,
                                    month: month,
                                    year: selectedYear
                                })
                            }
                        );

                        if (response.ok) {
                            const contentType = response.headers.get("content-type");
                            if (contentType && contentType.includes("application/json")) {
                                const data = await response.json();
                                if (data.success && data.data) {
                                    payslipData.push({
                                        month: month,
                                        monthName: months[month - 1],
                                        year: selectedYear,
                                        data: data.data,
                                        hasPayslip: true,
                                        isCompleted: true
                                    });
                                } else {
                                    payslipData.push({
                                        month: month,
                                        monthName: months[month - 1],
                                        year: selectedYear,
                                        hasPayslip: false,
                                        isCompleted: true
                                    });
                                }
                            } else {
                                payslipData.push({
                                    month: month,
                                    monthName: months[month - 1],
                                    year: selectedYear,
                                    hasPayslip: true,
                                    isPdfOnly: true,
                                    isCompleted: true
                                });
                            }
                        } else {
                            payslipData.push({
                                month: month,
                                monthName: months[month - 1],
                                year: selectedYear,
                                hasPayslip: false,
                                isCompleted: true
                            });
                        }
                    } catch (err) {
                        console.error(`Error fetching payslip for month ${month}:`, err);
                        payslipData.push({
                            month: month,
                            monthName: months[month - 1],
                            year: selectedYear,
                            hasPayslip: false,
                            isCompleted: true
                        });
                    }
                } else {
                    // Month is not completed yet - show as locked
                    payslipData.push({
                        month: month,
                        monthName: months[month - 1],
                        year: selectedYear,
                        hasPayslip: false,
                        isCompleted: false,
                        isLocked: true
                    });
                }
            }
            
            setCompletedMonths(completed);
            setPayslips(payslipData);
            
            // Auto-expand the last completed month
            const lastCompleted = getLastCompletedMonth();
            if (lastCompleted && selectedYear === currentYear) {
                setExpandedMonth(lastCompleted);
            }
        } catch (err) {
            console.error('Error fetching payslips:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Generate Standard Payslip (PDF Download)
    const generatePayslip = async (month, year) => {
        if (!isMonthCompleted(month, year)) {
            alert(`Payslip for ${months[month - 1]} ${year} is not available yet. Month is not completed.`);
            return;
        }
        
        setGeneratingPayslip(true);
        
        try {
            const response = await fetch(
                `${API_BASE_URL}/attendance/generate-payslip`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        username: username,
                        month: month,
                        year: year
                    })
                }
            );

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to generate payslip');
                } else {
                    throw new Error(`Server error ${response.status}`);
                }
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `payslip_${username}_${months[month - 1]}_${year}.pdf`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
        } catch (err) {
            console.error('Error generating payslip:', err);
            alert('Failed to generate payslip: ' + err.message);
        } finally {
            setGeneratingPayslip(false);
        }
    };

    // Download Detailed Payslip as PDF (Direct PDF endpoint)
    const downloadDetailedPayslipPDFDirect = async (month, year) => {
        if (!isMonthCompleted(month, year)) {
            alert(`Detailed payslip for ${months[month - 1]} ${year} is not available yet. Month is not completed.`);
            return;
        }
        
        setGeneratingDetailed(true);
        
        try {
            const response = await fetch(
                `${API_BASE_URL}/attendance/detailed-payslip-pdf`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        username: username,
                        month: month,
                        year: year
                    })
                }
            );

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to generate detailed payslip PDF');
                } else {
                    throw new Error(`Server error ${response.status}`);
                }
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `detailed_payslip_${username}_${months[month - 1]}_${year}.pdf`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
        } catch (err) {
            console.error('Error downloading detailed payslip PDF:', err);
            alert('Failed to download detailed payslip: ' + err.message);
        } finally {
            setGeneratingDetailed(false);
        }
    };

    // Generate Detailed Payslip and show modal
    const generateDetailedPayslip = async (month, year) => {
        if (!isMonthCompleted(month, year)) {
            alert(`Detailed payslip for ${months[month - 1]} ${year} is not available yet. Month is not completed.`);
            return;
        }
        
        setGeneratingDetailed(true);
        
        try {
            const response = await fetch(
                `${API_BASE_URL}/attendance/detailed-payslip`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        username: username,
                        month: month,
                        year: year,
                        include_verification_details: true
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to generate detailed payslip');
            }

            const data = await response.json();
            
            if (data.success) {
                setDetailedData(data.data);
                setShowDetailModal(true);
            } else {
                alert(data.message || 'Failed to generate detailed payslip');
            }
        } catch (err) {
            console.error('Error generating detailed payslip:', err);
            alert('Failed to generate detailed payslip: ' + err.message);
        } finally {
            setGeneratingDetailed(false);
        }
    };

    // Download detailed payslip as PDF (from JSON response)
    const downloadDetailedPayslipPDF = async (month, year) => {
        setGeneratingDetailed(true);
        
        try {
            const response = await fetch(
                `${API_BASE_URL}/attendance/detailed-payslip`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        username: username,
                        month: month,
                        year: year,
                        include_verification_details: true
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to generate detailed payslip');
            }

            const data = await response.json();
            
            if (data.pdf && data.pdf.base64) {
                const byteCharacters = atob(data.pdf.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = data.pdf.filename || `detailed_payslip_${username}_${months[month - 1]}_${year}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                alert('PDF data not available');
            }
        } catch (err) {
            console.error('Error downloading detailed payslip:', err);
            alert('Failed to download detailed payslip: ' + err.message);
        } finally {
            setGeneratingDetailed(false);
        }
    };

    const toggleExpand = (month) => {
        if (expandedMonth === month) {
            setExpandedMonth(null);
        } else {
            setExpandedMonth(month);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(parseFloat(amount));
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '—';
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (error) {
            return '—';
        }
    };

    // Get month status message
    const getMonthStatusMessage = (month, year) => {
        if (year > currentYear) return "Future year - Not available";
        if (year === currentYear && month > currentMonth) return "Future month - Not available";
        if (year === currentYear && month === currentMonth) {
            const lastDayOfMonth = new Date(year, month, 0).getDate();
            if (currentDay <= lastDayOfMonth) {
                return `Month in progress - Available after ${months[month - 1]} ${lastDayOfMonth}`;
            }
        }
        return null;
    };

    // Icons
    const CalendarIcon = ({ className = "w-5 h-5" }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );

    const ChevronDownIcon = ({ className = "w-4 h-4" }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
    );

    const ChevronUpIcon = ({ className = "w-4 h-4" }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7-7 7 7" />
        </svg>
    );

    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-screen bg-gray-50"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                {/* Header Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Payslip Management</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                View and download payslips for completed months only
                            </p>
                            {selectedYear === currentYear && completedMonths.length > 0 && (
                                <p className="text-xs text-emerald-600 mt-2">
                                    <FiCheckCircle className="inline w-3 h-3 mr-1" />
                                    {completedMonths.length} month{completedMonths.length !== 1 ? 's' : ''} completed so far
                                </p>
                            )}
                        </div>
                        
                        {/* Year Selector */}
                        <div className="relative">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer min-w-[120px]"
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Banner for Current Month */}
                {selectedYear === currentYear && !isMonthCompleted(currentMonth, currentYear) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <FiClock className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-amber-800">Current Month ({months[currentMonth - 1]} {currentYear})</h4>
                                <p className="text-xs text-amber-700 mt-1">
                                    Payslip for the current month will be available after the month ends. 
                                    You can download payslips for all completed months.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading payslips...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiXCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {/* Payslips Table */}
                {!loading && !error && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Month
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Days in Month
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Salary Earned
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Actions
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Details
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payslips.map((payslip) => {
                                        const daysInMonth = new Date(selectedYear, payslip.month, 0).getDate();
                                        const isExpanded = expandedMonth === payslip.month;
                                        const isLocked = !payslip.isCompleted;
                                        const statusMessage = getMonthStatusMessage(payslip.month, selectedYear);
                                        const isCurrentMonth = selectedYear === currentYear && payslip.month === currentMonth;
                                        
                                        return (
                                            <React.Fragment key={payslip.month}>
                                                <tr className={`transition-colors ${isLocked ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'}`}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${isLocked ? 'bg-gray-100' : 'bg-purple-100'}`}>
                                                                {isLocked ? (
                                                                    <FiLock className={`w-4 h-4 ${isLocked ? 'text-gray-400' : 'text-purple-600'}`} />
                                                                ) : (
                                                                    <FiCalendar className="w-4 h-4 text-purple-600" />
                                                                )}
                                                            </div>
                                                            <span className={`font-semibold ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
                                                                {payslip.monthName} {payslip.year}
                                                                {isCurrentMonth && !isLocked && (
                                                                    <span className="ml-2 text-xs font-normal text-amber-500">(Current)</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={isLocked ? 'text-gray-400' : 'text-gray-600'}>{daysInMonth} days</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {!isLocked && payslip.hasPayslip && payslip.data?.summary?.net_salary ? (
                                                            <span className="text-lg font-bold text-emerald-600">
                                                                {formatCurrency(payslip.data.summary.net_salary)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {isLocked ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                                                <FiLock className="w-3 h-3 mr-1" />
                                                                {isCurrentMonth ? 'Month in Progress' : 'Not Available'}
                                                            </span>
                                                        ) : payslip.hasPayslip ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                <FiCheckCircle className="w-3 h-3 mr-1" />
                                                                Generated
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                                <FiXCircle className="w-3 h-3 mr-1" />
                                                                No Data
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <motion.button
                                                                whileHover={{ scale: isLocked ? 1 : 1.05 }}
                                                                whileTap={{ scale: isLocked ? 1 : 0.95 }}
                                                                onClick={() => !isLocked && generatePayslip(payslip.month, payslip.year)}
                                                                disabled={isLocked || !payslip.hasPayslip || generatingPayslip}
                                                                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                                                    isLocked 
                                                                        ? 'text-gray-300 cursor-not-allowed' 
                                                                        : 'text-purple-600 hover:bg-purple-50'
                                                                }`}
                                                                title={isLocked ? statusMessage || 'Month not completed' : 'Download Payslip'}
                                                            >
                                                                <FiDownload className="w-4 h-4" />
                                                            </motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: isLocked ? 1 : 1.05 }}
                                                                whileTap={{ scale: isLocked ? 1 : 0.95 }}
                                                                onClick={() => !isLocked && downloadDetailedPayslipPDFDirect(payslip.month, payslip.year)}
                                                                disabled={isLocked || !payslip.hasPayslip || generatingDetailed}
                                                                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                                                    isLocked 
                                                                        ? 'text-gray-300 cursor-not-allowed' 
                                                                        : 'text-indigo-600 hover:bg-indigo-50'
                                                                }`}
                                                                title={isLocked ? statusMessage || 'Month not completed' : 'Download Detailed Payslip PDF'}
                                                            >
                                                                <FiFileText className="w-4 h-4" />
                                                            </motion.button>
                                                        </div>
                                                        {isLocked && statusMessage && (
                                                            <p className="text-[10px] text-gray-400 mt-1">{statusMessage}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        {!isLocked && payslip.hasPayslip && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => toggleExpand(payslip.month)}
                                                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                            >
                                                                {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                                            </motion.button>
                                                        )}
                                                        {(!isLocked && !payslip.hasPayslip) && (
                                                            <span className="text-gray-300 text-xs">No data</span>
                                                        )}
                                                        {isLocked && (
                                                            <span className="text-gray-300">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                
                                                {/* Expanded Row - Attendance Summary (only for completed months with data) */}
                                                {isExpanded && !isLocked && payslip.hasPayslip && payslip.data && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan="6" className="px-6 py-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <FiUsers className="w-4 h-4 text-blue-500" />
                                                                        <span className="text-xs font-medium text-gray-500">Attendance Summary</span>
                                                                    </div>
                                                                    <div className="space-y-1 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Present:</span>
                                                                            <span className="font-semibold text-emerald-600">
                                                                                {payslip.data.attendance_summary?.present || 0}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Absent:</span>
                                                                            <span className="font-semibold text-rose-600">
                                                                                {payslip.data.attendance_summary?.absent || 0}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Half Day:</span>
                                                                            <span className="font-semibold text-amber-600">
                                                                                {payslip.data.attendance_summary?.half_day || 0}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Paid Leave:</span>
                                                                            <span className="font-semibold text-blue-600">
                                                                                {payslip.data.attendance_summary?.paid_leave || 0}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <FiDollarSign className="w-4 h-4 text-green-500" />
                                                                        <span className="text-xs font-medium text-gray-500">Earnings</span>
                                                                    </div>
                                                                    <div className="space-y-1 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Present Days:</span>
                                                                            <span>{formatCurrency(payslip.data.summary?.earnings?.present_amount)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Half Day:</span>
                                                                            <span>{formatCurrency(payslip.data.summary?.earnings?.half_day_amount)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Paid Leave:</span>
                                                                            <span>{formatCurrency(payslip.data.summary?.earnings?.paid_leave_amount)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between border-t pt-1 mt-1">
                                                                            <span className="font-medium">Total:</span>
                                                                            <span className="font-bold text-emerald-600">
                                                                                {formatCurrency(payslip.data.summary?.earnings?.total_earnings)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <FiClock className="w-4 h-4 text-orange-500" />
                                                                        <span className="text-xs font-medium text-gray-500">Deductions</span>
                                                                    </div>
                                                                    <div className="space-y-1 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Late Fine:</span>
                                                                            <span className="text-rose-600">
                                                                                {formatCurrency(payslip.data.summary?.deductions?.late_fine)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Other Deduction:</span>
                                                                            <span className="text-rose-600">
                                                                                {formatCurrency(payslip.data.summary?.deductions?.other_deduction)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between border-t pt-1 mt-1">
                                                                            <span className="font-medium">Total:</span>
                                                                            <span className="font-bold text-rose-600">
                                                                                {formatCurrency(payslip.data.summary?.deductions?.total_deduction)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <FiTrendingUp className="w-4 h-4 text-purple-600" />
                                                                        <span className="text-xs font-medium text-gray-700">Net Salary</span>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="text-2xl font-bold text-purple-700">
                                                                            {formatCurrency(payslip.data.summary?.net_salary)}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-1">
                                                                            Per Day: {formatCurrency(payslip.data.per_day_salary)}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            Monthly Gross: {formatCurrency(payslip.data.monthly_gross_salary)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                
                                                {isExpanded && !isLocked && !payslip.hasPayslip && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                            <FiInfo className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                            <p>No payslip data available for {payslip.monthName} {payslip.year}</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* No completed months message */}
                        {payslips.filter(p => p.isCompleted).length === 0 && selectedYear === currentYear && (
                            <div className="text-center py-12">
                                <FiInfo className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500">No completed months yet this year.</p>
                                <p className="text-sm text-gray-400 mt-1">Payslips will be available after each month ends.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Detailed Payslip Modal */}
                <AnimatePresence>
                    {showDetailModal && detailedData && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
                            >
                                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Detailed Payslip - {detailedData.salary_period?.month_year}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {detailedData.employee?.name} • {detailedData.employee?.designation}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => downloadDetailedPayslipPDF(detailedData.salary_period?.month, detailedData.salary_period?.year)}
                                            className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-purple-700"
                                        >
                                            <FiDownload className="w-4 h-4" />
                                            Download PDF
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => window.print()}
                                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-200"
                                        >
                                            <FiPrinter className="w-4 h-4" />
                                            Print
                                        </motion.button>
                                        <button
                                            onClick={() => setShowDetailModal(false)}
                                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {/* Company Info */}
                                    <div className="text-center mb-6 pb-4 border-b">
                                        <h2 className="text-2xl font-bold text-gray-800">{detailedData.company?.name}</h2>
                                        <p className="text-sm text-gray-500">{detailedData.company?.address}</p>
                                        <p className="text-sm text-gray-500">Phone: {detailedData.company?.mobile} | Email: {detailedData.company?.email}</p>
                                        <p className="text-sm text-gray-500">GST: {detailedData.company?.gst} | PAN: {detailedData.company?.pan}</p>
                                    </div>

                                    {/* Salary Slip Title */}
                                    <div className="text-center mb-6">
                                        <h3 className="text-xl font-bold text-purple-700">SALARY SLIP</h3>
                                        <p className="text-sm text-gray-500">For the month of {detailedData.salary_period?.month_year}</p>
                                    </div>

                                    {/* Employee Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="text-xs text-gray-500">Employee Name</p>
                                            <p className="font-semibold">{detailedData.employee?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Designation</p>
                                            <p className="font-semibold">{detailedData.employee?.designation}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Mobile</p>
                                            <p className="font-semibold">{detailedData.employee?.mobile}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Email</p>
                                            <p className="font-semibold">{detailedData.employee?.email}</p>
                                        </div>
                                    </div>

                                    {/* Salary Summary */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="bg-green-50 px-4 py-2 border-b">
                                                <h4 className="font-semibold text-green-700">Earnings</h4>
                                            </div>
                                            <table className="w-full">
                                                <tbody className="divide-y">
                                                    <tr>
                                                        <td className="px-4 py-2 text-gray-600">Present Days</td>
                                                        <td className="px-4 py-2 text-right">{formatCurrency(detailedData.summary?.earnings?.present_amount)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-2 text-gray-600">Half Day</td>
                                                        <td className="px-4 py-2 text-right">{formatCurrency(detailedData.summary?.earnings?.half_day_amount)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-2 text-gray-600">Paid Leave</td>
                                                        <td className="px-4 py-2 text-right">{formatCurrency(detailedData.summary?.earnings?.paid_leave_amount)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-2 text-gray-600">Overtime</td>
                                                        <td className="px-4 py-2 text-right">{formatCurrency(detailedData.summary?.earnings?.overtime_amount)}</td>
                                                    </tr>
                                                    <tr className="bg-green-50 font-bold">
                                                        <td className="px-4 py-2">Total Earnings</td>
                                                        <td className="px-4 py-2 text-right text-green-700">{formatCurrency(detailedData.summary?.earnings?.total_earnings)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="bg-rose-50 px-4 py-2 border-b">
                                                <h4 className="font-semibold text-rose-700">Deductions</h4>
                                            </div>
                                            <table className="w-full">
                                                <tbody className="divide-y">
                                                    <tr>
                                                        <td className="px-4 py-2 text-gray-600">Late Fine</td>
                                                        <td className="px-4 py-2 text-right">{formatCurrency(detailedData.summary?.deductions?.late_fine)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-2 text-gray-600">Other Deduction</td>
                                                        <td className="px-4 py-2 text-right">{formatCurrency(detailedData.summary?.deductions?.other_deduction)}</td>
                                                    </tr>
                                                    <tr className="bg-rose-50 font-bold">
                                                        <td className="px-4 py-2">Total Deductions</td>
                                                        <td className="px-4 py-2 text-right text-rose-700">{formatCurrency(detailedData.summary?.deductions?.total_deduction)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Net Salary */}
                                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-6 text-center border">
                                        <p className="text-sm text-gray-600">Net Salary</p>
                                        <p className="text-3xl font-bold text-purple-700">{formatCurrency(detailedData.summary?.net_salary)}</p>
                                        <p className="text-sm text-gray-500 mt-1">{detailedData.summary?.amount_in_words}</p>
                                    </div>

                                    {/* Attendance Summary */}
                                    <div className="mb-6">
                                        <h4 className="font-semibold text-gray-800 mb-3">Attendance Summary</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                <p className="text-2xl font-bold text-emerald-600">{detailedData.attendance_summary?.present || 0}</p>
                                                <p className="text-xs text-gray-500">Present</p>
                                            </div>
                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                <p className="text-2xl font-bold text-rose-600">{detailedData.attendance_summary?.absent || 0}</p>
                                                <p className="text-xs text-gray-500">Absent</p>
                                            </div>
                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                <p className="text-2xl font-bold text-amber-600">{detailedData.attendance_summary?.half_day || 0}</p>
                                                <p className="text-xs text-gray-500">Half Day</p>
                                            </div>
                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                <p className="text-2xl font-bold text-blue-600">{detailedData.attendance_summary?.paid_leave || 0}</p>
                                                <p className="text-xs text-gray-500">Paid Leave</p>
                                            </div>
                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                <p className="text-2xl font-bold text-purple-600">{detailedData.attendance_summary?.overtime_days || 0}</p>
                                                <p className="text-xs text-gray-500">Overtime Days</p>
                                            </div>
                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                <p className="text-2xl font-bold text-orange-600">{detailedData.attendance_summary?.bonus || 0}</p>
                                                <p className="text-xs text-gray-500">Bonus</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Calculation Formula */}
                                    {detailedData.calculation_formula && (
                                        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                                            <h4 className="font-semibold text-gray-800 mb-2">Calculation Formula</h4>
                                            <p className="text-sm text-gray-600">{detailedData.calculation_formula?.formula}</p>
                                            <p className="text-xs text-gray-500 mt-1">{detailedData.calculation_formula?.present_calculation}</p>
                                        </div>
                                    )}

                                    {/* Day-wise Breakdown */}
                                    <div>
                                        <h4 className="font-semibold text-gray-800 mb-3">Day-wise Breakdown</h4>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">Date</th>
                                                        <th className="px-3 py-2 text-left">Day</th>
                                                        <th className="px-3 py-2 text-left">Status</th>
                                                        <th className="px-3 py-2 text-left">Punch In</th>
                                                        <th className="px-3 py-2 text-left">Punch Out</th>
                                                        <th className="px-3 py-2 text-right">Amount</th>
                                                        <th className="px-3 py-2 text-center">Verified</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {detailedData.day_wise_breakdown?.map((day, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-3 py-2">{formatDate(day.date)}</td>
                                                            <td className="px-3 py-2">{day.day_name}</td>
                                                            <td className="px-3 py-2">
                                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium
                                                                    ${day.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                                                                        day.status === 'absent' ? 'bg-rose-100 text-rose-700' :
                                                                        day.status === 'half_day' ? 'bg-amber-100 text-amber-700' :
                                                                        day.status === 'weekly_off' ? 'bg-gray-100 text-gray-500' :
                                                                        'bg-blue-100 text-blue-700'}`}>
                                                                    {day.status_display}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2">{day.punch_in || '—'}</td>
                                                            <td className="px-3 py-2">{day.punch_out || '—'}</td>
                                                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(day.calculated_amount)}</td>
                                                            <td className="px-3 py-2 text-center">
                                                                {day.is_verified ? (
                                                                    <FiCheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                                                                ) : (
                                                                    <FiXCircle className="w-4 h-4 text-gray-300 mx-auto" />
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-6 pt-4 border-t text-center text-xs text-gray-400">
                                        This is a computer generated document. No signature required.
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default StaffPayslip;