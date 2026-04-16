import React, { useState, useEffect } from 'react';
import {
    FiSearch,
    FiPlus,
    FiX,
    FiMenu,
    FiEdit,
    FiFileText,
    FiTrash2,
    FiFilter,
    FiDollarSign,
    FiChevronRight,
    FiPrinter,
    FiTrendingUp
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import DateFilter from '../components/DateFilter';
import CreateExpenseModal from '../components/expense-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';

const ExpenseDetails = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [showCreateExpenseModal, setShowCreateExpenseModal] = useState(false);
    const [dateRange, setDateRange] = useState('');
    const [fromToDate, setFromToDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [totalCategories, setTotalCategories] = useState(0);
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });

    const [newCategoryForm, setNewCategoryForm] = useState({
        name: '',
        type: '',
        description: ''
    });

    // Handle expense form submission
    const handleCreateExpense = async (e) => {
        // Add your expense creation logic here
    };

    // Mock data for expense categories
    const mockCategoriesData = [
        {
            id: '1',
            name: 'Office Supplies',
            type: 'direct expense',
            description: 'Stationery, printing materials, office equipment',
            total_expenses: 15000,
            budget: 20000,
            status: 'active',
            created_date: '2024-01-15',
            expense_count: 12
        },
        {
            id: '2',
            name: 'Employee Salaries',
            type: 'direct expense',
            description: 'Monthly salaries and wages for employees',
            total_expenses: 75000,
            budget: 80000,
            status: 'active',
            created_date: '2024-01-10',
            expense_count: 45
        },
        {
            id: '3',
            name: 'Marketing Campaign',
            type: 'indirect expense',
            description: 'Digital marketing, advertisements, promotions',
            total_expenses: 25000,
            budget: 30000,
            status: 'active',
            created_date: '2024-01-20',
            expense_count: 8
        },
        {
            id: '4',
            name: 'Business Travel',
            type: 'reimbursable expense',
            description: 'Travel expenses, accommodation, transportation',
            total_expenses: 18000,
            budget: 25000,
            status: 'active',
            created_date: '2024-01-05',
            expense_count: 15
        },
        {
            id: '5',
            name: 'Software Subscriptions',
            type: 'indirect expense',
            description: 'Monthly/annual software licenses and subscriptions',
            total_expenses: 12000,
            budget: 15000,
            status: 'active',
            created_date: '2024-01-12',
            expense_count: 22
        },
        {
            id: '6',
            name: 'Utilities & Rent',
            type: 'direct expense',
            description: 'Electricity, water, internet, office rent',
            total_expenses: 45000,
            budget: 50000,
            status: 'active',
            created_date: '2024-01-01',
            expense_count: 6
        },
        {
            id: '7',
            name: 'Maintenance & Repairs',
            type: 'direct expense',
            description: 'Office maintenance, equipment repairs',
            total_expenses: 8000,
            budget: 10000,
            status: 'active',
            created_date: '2024-01-18',
            expense_count: 7
        },
        {
            id: '8',
            name: 'Professional Fees',
            type: 'indirect expense',
            description: 'Legal, accounting, consulting fees',
            total_expenses: 30000,
            budget: 35000,
            status: 'active',
            created_date: '2024-01-22',
            expense_count: 5
        },
        {
            id: '9',
            name: 'Training & Development',
            type: 'reimbursable expense',
            description: 'Employee training, workshops, certifications',
            total_expenses: 22000,
            budget: 25000,
            status: 'active',
            created_date: '2024-01-25',
            expense_count: 9
        },
        {
            id: '10',
            name: 'Insurance Premiums',
            type: 'direct expense',
            description: 'Business insurance, liability coverage',
            total_expenses: 18000,
            budget: 20000,
            status: 'active',
            created_date: '2024-01-28',
            expense_count: 4
        },
        {
            id: '11',
            name: 'Advertising',
            type: 'indirect expense',
            description: 'Online ads, print media, billboards',
            total_expenses: 32000,
            budget: 40000,
            status: 'active',
            created_date: '2024-01-30',
            expense_count: 11
        },
        {
            id: '12',
            name: 'Office Rent',
            type: 'direct expense',
            description: 'Monthly office space rental',
            total_expenses: 65000,
            budget: 70000,
            status: 'active',
            created_date: '2024-01-03',
            expense_count: 1
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

    // Initialize with current month date range
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = today;

        const formatDate = (date) => {
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '/');
        };

        const from = formatDate(firstDay);
        const to = formatDate(lastDay);

        setDateRange(`${from} - ${to}`);
        setFromToDate(`From ${from} to ${to}`);
        fetchCategoriesData(from, to);
    }, []);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Format percentage for budget utilization
    const formatPercentage = (expenses, budget) => {
        return ((expenses / budget) * 100).toFixed(1);
    };

    // Simulate API call to fetch categories data
    const fetchCategoriesData = async (from, to) => {
        setLoading(true);

        setTimeout(() => {
            const categoriesData = mockCategoriesData;
            setCategories(categoriesData);

            const total = categoriesData.reduce((acc, item) => acc + item.total_expenses, 0);
            setTotalCategories(total);
            setLoading(false);
        }, 1500);
    };

    // Handle search
    const handleSearch = () => {
        const [from, to] = dateRange.split(' - ');
        setFromToDate(`From ${from} to ${to}`);
        fetchCategoriesData(from, to);
    };

    // Handle date filter change
    const handleDateFilterChange = (filter) => {
        console.log('Selected filter:', filter);
        if (filter.range) {
            setDateRange(filter.range);
            const [from, to] = filter.range.split(' - ');
            setFromToDate(`From ${from} to ${to}`);
            fetchCategoriesData(from, to);
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewCategoryForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle new category form submission
    const handleCreateCategory = async (e) => {
        e.preventDefault();
        setLoading(true);

        setTimeout(() => {
            console.log('Creating new expense category:', newCategoryForm);

            // Add new category to the list
            const newCategory = {
                id: (categories.length + 1).toString(),
                name: newCategoryForm.name,
                type: newCategoryForm.type,
                description: newCategoryForm.description,
                total_expenses: 0,
                budget: 0,
                status: 'active',
                created_date: new Date().toISOString().split('T')[0],
                expense_count: 0
            };

            setCategories(prev => [...prev, newCategory]);
            setNewCategoryForm({ name: '', type: '', description: '' });
            setShowAddCategoryModal(false);

            const [from, to] = dateRange.split(' - ');
            fetchCategoriesData(from, to);

            alert('Expense category created successfully!');
        }, 1000);
    };

    // Handle export
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });

        // Simulate export process
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            alert(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    // Format expense type for display
    const formatExpenseType = (type) => {
        return type.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    // Get expense type color
    const getExpenseTypeColor = (type) => {
        switch(type) {
            case 'direct expense': return 'bg-blue-100 text-blue-700';
            case 'indirect expense': return 'bg-purple-100 text-purple-700';
            case 'reimbursable expense': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    // Get utilization color
    const getUtilizationColor = (utilization) => {
        if (utilization > 90) return 'bg-red-500';
        if (utilization > 75) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    // Get utilization text color
    const getUtilizationTextColor = (utilization) => {
        if (utilization > 90) return 'text-red-600';
        if (utilization > 75) return 'text-yellow-600';
        return 'text-green-600';
    };

    // Handle category deletion
    const handleDeleteCategory = (categoryId) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            setCategories(prev => prev.filter(cat => cat.id !== categoryId));
            setActiveRowDropdown(null);
            alert('Category deleted successfully!');
        }
    };

    // Toggle row dropdown
    const toggleRowDropdown = (categoryId) => {
        setActiveRowDropdown(activeRowDropdown === categoryId ? null : categoryId);
    };

    // Close all dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setShowAddDropdown(false);
                setActiveRowDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-20 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-32 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-12 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-10 mx-auto"></div>
            </td>
        </tr>
    );

    // Skeleton Loading Component for full page
    const SkeletonLoader = () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        {/* Skeleton Header */}
                        <div className="border-b border-slate-200 px-6 py-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="h-10 bg-gray-200 rounded w-40"></div>
                                    <div className="h-10 bg-gray-200 rounded w-32"></div>
                                </div>
                            </div>
                        </div>

                        {/* Skeleton Table */}
                        <div className="overflow-hidden">
                            <div className="border-b border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <tr>
                                            {[...Array(8)].map((_, i) => (
                                                <th key={i} className="text-center p-3">
                                                    <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                </table>
                            </div>

                            <div className="p-4">
                                {[...Array(6)].map((_, index) => (
                                    <div key={index} className="mb-4">
                                        <div className="h-12 bg-gray-100 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Show skeleton while loading
    if (loading) {
        return <SkeletonLoader />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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

            {/* Main Content Area - Full Page Scroll */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header Stats Card - Smaller */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md mb-4"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-xs font-medium">Total Expenses</p>
                                <h3 className="text-lg font-bold mt-1">₹{formatCurrency(totalCategories)}</h3>
                                <p className="text-blue-100 text-xs mt-1">
                                    {categories.length} Categories
                                </p>
                            </div>
                            <FiDollarSign className="w-5 h-5 opacity-80" />
                        </div>
                    </motion.div>

                    {/* Main Card */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-xl shadow-lg border border-slate-200"
                    >
                        {/* Card Header */}
                        <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 bg-blue-100 rounded-lg">
                                            <FiDollarSign className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <h5 className="text-lg font-bold text-slate-800">
                                            Expense Categories
                                        </h5>
                                    </div>
                                    {fromToDate && (
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <FiFilter className="w-3 h-3" />
                                            <p className="text-xs font-medium">
                                                {fromToDate}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                    {/* Date Filter Component */}
                                    <div className="w-full lg:w-auto">
                                        <DateFilter onChange={handleDateFilterChange} />
                                    </div>

                                    <div className="flex gap-2">
                                        {/* Export Dropdown */}
                                        <div className="dropdown-container relative">
                                            <motion.button
                                                onClick={() => setShowAddDropdown(!showAddDropdown)}
                                                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <PiExportBold className="w-4 h-4" />
                                                Export
                                                <FiChevronRight className={`w-3 h-3 transition-transform ${showAddDropdown ? 'rotate-90' : ''}`} />
                                            </motion.button>

                                            <AnimatePresence>
                                                {showAddDropdown && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 5 }}
                                                        className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden"
                                                    >
                                                        <div className="py-1">
                                                            <button
                                                                onClick={() => handleExport('pdf')}
                                                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                            >
                                                                <div className="p-1.5 bg-red-50 rounded mr-2 group-hover:bg-red-100 transition-colors">
                                                                    <PiFilePdfDuotone className="w-3.5 h-3.5 text-red-500" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-medium text-xs">Export as PDF</div>
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('excel')}
                                                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                            >
                                                                <div className="p-1.5 bg-green-50 rounded mr-2 group-hover:bg-green-100 transition-colors">
                                                                    <PiMicrosoftExcelLogoDuotone className="w-3.5 h-3.5 text-green-500" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-medium text-xs">Export as Excel</div>
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('print')}
                                                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                            >
                                                                <div className="p-1.5 bg-slate-50 rounded mr-2 group-hover:bg-slate-100 transition-colors">
                                                                    <FiPrinter className="w-3.5 h-3.5 text-slate-600" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-medium text-xs">Print Report</div>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Add New Button */}
                                        <motion.button
                                            onClick={() => setShowCreateExpenseModal(true)}
                                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Add New
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table Container */}
                        <div className="w-full">
                            <table className="w-full text-xs table-fixed">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[5%]">
                                            Sl No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[15%]">
                                            Category Name
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[10%]">
                                            Type
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[20%]">
                                            Description
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[15%]">
                                            Total Expenses
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[15%]">
                                            Budget
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[10%]">
                                            Utilization
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w=[10%]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {categories.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiDollarSign className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No expense categories found</p>
                                                    <p className="text-slate-500 text-xs mb-4">Start by creating your first category</p>
                                                    <motion.button
                                                        onClick={() => setShowAddCategoryModal(true)}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow transition-all duration-200"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Create Your First Category
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        categories.map((category, index) => {
                                            const isDropdownOpen = activeRowDropdown === category.id;
                                            const utilization = formatPercentage(category.total_expenses, category.budget);
                                            const utilizationColor = getUtilizationColor(utilization);
                                            const utilizationTextColor = getUtilizationTextColor(utilization);

                                            return (
                                                <motion.tr
                                                    key={category.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="hover:bg-blue-50/20 transition-colors duration-150"
                                                >
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-700 font-medium text-xs">
                                                            {index + 1}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="px-2">
                                                            <div className="text-slate-800 font-semibold text-xs truncate">
                                                                {category.name}
                                                            </div>
                                                            <div className="text-slate-500 text-[10px] mt-1">
                                                                {category.expense_count} expenses
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className={`px-2 py-1.5 rounded-full text-[9px] font-medium capitalize whitespace-nowrap ${getExpenseTypeColor(category.type)}`}>
                                                            {formatExpenseType(category.type)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="px-2">
                                                            <div className="text-slate-500 text-[10px] italic truncate">
                                                                "{category.description}"
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-slate-50 to-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded text-xs">
                                                            ₹{formatCurrency(category.total_expenses)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 font-bold px-3 py-1.5 rounded text-xs">
                                                            ₹{formatCurrency(category.budget)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-20 bg-slate-200 rounded-full h-1.5">
                                                                <div
                                                                    className={`h-1.5 rounded-full ${utilizationColor} transition-all duration-300`}
                                                                    style={{ width: `${Math.min(100, utilization)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className={`text-xs font-medium ${utilizationTextColor} min-w-[35px]`}>
                                                                {utilization}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="dropdown-container relative flex justify-center">
                                                            <motion.button
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                onClick={() => toggleRowDropdown(category.id)}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                <FiMenu className="w-3.5 h-3.5" />
                                                            </motion.button>
                                                            <AnimatePresence>
                                                                {isDropdownOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 5 }}
                                                                        className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden"
                                                                    >
                                                                        <div className="py-1">
                                                                            <a
                                                                                href={`/edit-expense-category?category_id=${category.id}`}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                onClick={() => setActiveRowDropdown(null)}
                                                                            >
                                                                                <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                    <FiEdit className="w-3 h-3 text-blue-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">Edit Category</div>
                                                                                </div>
                                                                            </a>
                                                                            <a
                                                                                href={`/view-expenses-by-category?category_id=${category.id}`}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                onClick={() => setActiveRowDropdown(null)}
                                                                            >
                                                                                <div className="p-1 bg-green-50 rounded mr-2">
                                                                                    <FiFileText className="w-3 h-3 text-green-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">View Expenses</div>
                                                                                </div>
                                                                            </a>
                                                                            <div className="border-t border-slate-100 mt-1 pt-1">
                                                                                <button
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => handleExport('print', category)}
                                                                                >
                                                                                    <div className="p-1 bg-slate-50 rounded mr-2">
                                                                                        <FiPrinter className="w-3 h-3 text-slate-600" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Print</div>
                                                                                    </div>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteCategory(category.id)}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors duration-150"
                                                                                >
                                                                                    <div className="p-1 bg-red-50 rounded mr-2">
                                                                                        <FiTrash2 className="w-3 h-3 text-red-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Delete Category</div>
                                                                                    </div>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Table Footer - Fixed */}
                        {/* <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white shrink-0">
                            <table className="w-full text-sm">
                                <tfoot>
                                    <tr>
                                        <td className="text-right p-4 font-bold text-slate-800 text-xs uppercase tracking-wider" colSpan="4">
                                            Total Expenses Across All Categories
                                        </td>
                                        <td className="text-center p-4">
                                            <span className="inline-flex items-center justify-center bg-gradient-to-r from-green-100 to-green-200 text-green-800 text-sm font-bold px-4 py-2 rounded-lg min-w-[100px]">
                                                ₹{formatCurrency(totalCategories)}
                                            </span>
                                        </td>
                                        <td className="p-4"></td>
                                        <td className="p-4"></td>
                                        <td className="p-4"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div> */}
                    </motion.div>
                </div>
            </div>

            {/* Export Confirmation Modal */}
            <AnimatePresence>
                {exportModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-white rounded-xl p-6 max-w-sm w-full mx-auto shadow-xl"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PiExportBold className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">
                                    Exporting {exportModal.type.toUpperCase()}
                                </h3>
                                <p className="text-slate-600 mb-6 text-sm">
                                    Your {exportModal.type} export is being processed...
                                </p>
                                <div className="flex justify-center space-x-2 mb-6">
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    This will only take a moment...
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <CreateExpenseModal
                isOpen={showCreateExpenseModal}
                onClose={() => setShowCreateExpenseModal(false)}
                onSubmit={handleCreateExpense}
                loading={loading}
            />
        </div>
    );
};

export default ExpenseDetails;