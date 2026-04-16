import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FiSearch,
    FiPlus,
    FiX,
    FiMenu,
    FiEdit,
    FiFileText,
    FiFilter,
    FiDollarSign,
    FiChevronRight,
    FiPrinter
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import DateFilter from '../components/DateFilter';
import { useNavigate } from 'react-router-dom';
import CreateExpenseModal from '../components/expense-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import Select from 'react-select';
import { debounce } from 'lodash';
import Pagination from '../components/paging-nation-component'; // Import the Pagination component

const ViewExpenses = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [dateRange, setDateRange] = useState('');
    const [fromToDate, setFromToDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [totalExpense, setTotalExpense] = useState(0);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [showCreateExpenseModal, setShowCreateExpenseModal] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [pagination, setPagination] = useState({
        page_no: 1,
        limit: 10,
        total: 0,
        total_pages: 0,
        is_last_page: false
    });
    const [itemOptions, setItemOptions] = useState([]);
    const [itemLoading, setItemLoading] = useState(false);
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    
    const navigate = useNavigate();
    const searchInputRef = useRef(null);

    // New Item Form State
    const [newItemForm, setNewItemForm] = useState({
        name: '',
        remark: '',
        type: ''
    });

    // Type options for dropdown
    const typeOptions = [
        { value: 'direct', label: 'Direct Expense' },
        { value: 'indirect', label: 'Indirect Expense' },
        { value: 'reimbursable', label: 'Reimbursable Expense' }
    ];

    // Initialize with current month date range
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const formatDateForAPI = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const formatDateForDisplay = (date) => {
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '/');
        };

        const from = formatDateForAPI(firstDay);
        const to = formatDateForAPI(today);
        const fromDisplay = formatDateForDisplay(firstDay);
        const toDisplay = formatDateForDisplay(today);

        setDateRange(`${fromDisplay} - ${toDisplay}`);
        setFromToDate(`From ${fromDisplay} to ${toDisplay}`);
        fetchExpensesData(from, to);
    }, []);

    // Debounced search for items
    const debouncedItemSearch = useCallback(
        debounce((searchValue) => {
            fetchItems(searchValue);
        }, 300),
        []
    );

    useEffect(() => {
        if (itemSearchTerm !== undefined) {
            debouncedItemSearch(itemSearchTerm);
        }
        return () => {
            debouncedItemSearch.cancel();
        };
    }, [itemSearchTerm]);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Fetch items for dropdown
    const fetchItems = async (search = '') => {
        setItemLoading(true);
        try {
            const headers = getHeaders();
            const url = `${API_BASE_URL}/expense/item/list?page_no=1&limit=50&search=${search}`;
            const response = await fetch(url, { headers });
            const result = await response.json();
            
            if (result.success && result.data) {
                const options = result.data.map(item => ({
                    value: item.item_id,
                    label: item.name,
                    type: item.type
                }));
                setItemOptions(options);
            }
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setItemLoading(false);
        }
    };

    // Fetch expenses data from API
    const fetchExpensesData = async (from, to, pageNo = 1, search = '', itemId = '', type = '') => {
        setLoading(true);
        
        try {
            const headers = getHeaders();
            let url = `${API_BASE_URL}/expense/list?page_no=${pageNo}&limit=${pagination.limit}&from_date=${from}&to_date=${to}`;
            
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (itemId) url += `&item_id=${itemId}`;
            if (type) url += `&type=${type}`;
            
            const response = await fetch(url, { headers });
            const result = await response.json();
            
            if (result.success) {
                setExpenses(result.data || []);
                setTotalExpense(result.stats?.amount || 0);
                setPagination({
                    page_no: result.meta?.page_no || 1,
                    limit: result.meta?.limit || 10,
                    total: result.meta?.total || 0,
                    total_pages: result.meta?.total_pages || 0,
                    is_last_page: result.meta?.is_last_page || true
                });
            } else {
                console.error('API Error:', result);
                setExpenses([]);
                setTotalExpense(0);
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
            setExpenses([]);
            setTotalExpense(0);
        } finally {
            setLoading(false);
        }
    };

    // Handle search
    const handleSearch = () => {
        const [fromDisplay, toDisplay] = dateRange.split(' - ');
        
        // Convert display dates to API format
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        };
        
        const from = parseDate(fromDisplay);
        const to = parseDate(toDisplay);
        
        setFromToDate(`From ${fromDisplay} to ${toDisplay}`);
        fetchExpensesData(from, to, 1, searchTerm, selectedItem?.value || '', selectedType?.value || '');
    };

    // Handle date filter change
    const handleDateFilterChange = (filter) => {
        if (filter.range) {
            setDateRange(filter.range);
            const [fromDisplay, toDisplay] = filter.range.split(' - ');
            
            // Convert display dates to API format
            const parseDate = (dateStr) => {
                const [day, month, year] = dateStr.split('/');
                return `${year}-${month}-${day}`;
            };
            
            const from = parseDate(fromDisplay);
            const to = parseDate(toDisplay);
            
            setFromToDate(`From ${fromDisplay} to ${toDisplay}`);
            fetchExpensesData(from, to, 1, searchTerm, selectedItem?.value || '', selectedType?.value || '');
        }
    };

    // Handle item selection change
    const handleItemChange = (selected) => {
        setSelectedItem(selected);
        
        const [fromDisplay, toDisplay] = dateRange.split(' - ');
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        };
        
        const from = parseDate(fromDisplay);
        const to = parseDate(toDisplay);
        
        fetchExpensesData(from, to, 1, searchTerm, selected?.value || '', selectedType?.value || '');
    };

    // Handle type selection change
    const handleTypeChange = (selected) => {
        setSelectedType(selected);
        
        const [fromDisplay, toDisplay] = dateRange.split(' - ');
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        };
        
        const from = parseDate(fromDisplay);
        const to = parseDate(toDisplay);
        
        fetchExpensesData(from, to, 1, searchTerm, selectedItem?.value || '', selected?.value || '');
    };

    // Handle search input change
    const handleSearchInputChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Handle search button click or enter key
    const handleSearchSubmit = () => {
        handleSearch();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearchSubmit();
        }
    };

    // Handle pagination - page change
    const handlePageChange = (newPage) => {
        const [fromDisplay, toDisplay] = dateRange.split(' - ');
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        };
        
        const from = parseDate(fromDisplay);
        const to = parseDate(toDisplay);
        
        fetchExpensesData(from, to, newPage, searchTerm, selectedItem?.value || '', selectedType?.value || '');
    };

    // Handle pagination - limit change
    const handleLimitChange = (newLimit) => {
        const [fromDisplay, toDisplay] = dateRange.split(' - ');
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        };
        
        const from = parseDate(fromDisplay);
        const to = parseDate(toDisplay);
        
        setPagination(prev => ({ ...prev, limit: newLimit, page_no: 1 }));
        fetchExpensesData(from, to, 1, searchTerm, selectedItem?.value || '', selectedType?.value || '');
    };

    // Handle custom page change
    const handleCustomPageChange = (newPage) => {
        handlePageChange(newPage);
    };

    // Handle new item form input changes
    const handleItemInputChange = (e) => {
        const { name, value } = e.target;
        setNewItemForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle new item form submission with API integration
    const handleCreateItem = async (e) => {
        e.preventDefault();
        
        // Validate form
        if (!newItemForm.name.trim()) {
            alert('Please enter expense name');
            return;
        }
        if (!newItemForm.type) {
            alert('Please select expense type');
            return;
        }
        
        setLoading(true);
        
        try {
            const headers = getHeaders();
            const payload = {
                name: newItemForm.name.trim(),
                remark: newItemForm.remark.trim() || '',
                type: newItemForm.type
            };
            
            const response = await fetch(`${API_BASE_URL}/expense/item/create`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Expense item created successfully!');
                setShowAddItemModal(false);
                setNewItemForm({ name: '', remark: '', type: '' });
                fetchItems(); // Refresh items list for dropdown
                
                // Optionally refresh the expenses list if needed
                const [fromDisplay, toDisplay] = dateRange.split(' - ');
                const parseDate = (dateStr) => {
                    const [day, month, year] = dateStr.split('/');
                    return `${year}-${month}-${day}`;
                };
                const from = parseDate(fromDisplay);
                const to = parseDate(toDisplay);
                fetchExpensesData(from, to, pagination.page_no, searchTerm, selectedItem?.value || '', selectedType?.value || '');
            } else {
                alert(result.message || 'Failed to create expense item');
            }
        } catch (error) {
            console.error('Error creating item:', error);
            alert('Failed to create expense item. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle expense form submission
    const handleCreateExpense = async (e) => {
        // This will be handled by your CreateExpenseModal component
        // Just refresh the list after modal closes
        if (showCreateExpenseModal === false) {
            handleSearch(); // Refresh list
        }
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
        if (!type) return '';
        const typeMap = {
            'direct': 'Direct Expense',
            'indirect': 'Indirect Expense',
            'reimbursable': 'Reimbursable Expense'
        };
        return typeMap[type] || type;
    };

    // Get expense type color
    const getExpenseTypeColor = (type) => {
        switch(type) {
            case 'direct': return 'bg-blue-100 text-blue-700';
            case 'indirect': return 'bg-purple-100 text-purple-700';
            case 'reimbursable': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    // Toggle row dropdown
    const toggleRowDropdown = (itemId) => {
        setActiveRowDropdown(activeRowDropdown === itemId ? null : itemId);
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

    // Fetch initial items
    useEffect(() => {
        fetchItems();
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
                <div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
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
                        <div className="overflow-hidden">
                            <div className="border-b border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <tr>
                                            {[...Array(6)].map((_, i) => (
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
    if (loading && expenses.length === 0) {
        return <SkeletonLoader />;
    }

    // Custom styles for react-select
    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            minHeight: '40px',
            borderColor: state.isFocused ? '#3b82f6' : '#e2e8f0',
            boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
            '&:hover': {
                borderColor: '#3b82f6'
            },
            fontSize: '12px'
        }),
        menu: (base) => ({
            ...base,
            fontSize: '12px',
            zIndex: 20
        }),
        option: (base, state) => ({
            ...base,
            fontSize: '12px',
            backgroundColor: state.isFocused ? '#eff6ff' : 'white',
            color: '#1e293b'
        }),
        placeholder: (base) => ({
            ...base,
            fontSize: '12px',
            color: '#94a3b8'
        }),
        singleValue: (base) => ({
            ...base,
            fontSize: '12px'
        })
    };

    // Prepare pagination object for the Pagination component
    const paginationProps = {
        page: pagination.page_no,
        limit: pagination.limit,
        total: pagination.total,
        total_pages: pagination.total_pages,
        is_last_page: pagination.is_last_page
    };

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
                    {/* Header Stats Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md mb-4"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-xs font-medium">Total Expenses</p>
                                <h3 className="text-lg font-bold mt-1">₹{formatCurrency(totalExpense)}</h3>
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
                                            Expenses Register
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
                                        
                                        {/* Item Button */}
                                        <motion.button
                                            onClick={() => setShowAddItemModal(true)}
                                            className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Item
                                        </motion.button>
                                        
                                        {/* Entry Button */}
                                        <motion.button
                                            onClick={() => setShowCreateExpenseModal(true)}
                                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Entry
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Search and Filter Row */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Search Input */}
                                <div className="relative">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="Search by invoice no, remark, or party..."
                                        value={searchTerm}
                                        onChange={handleSearchInputChange}
                                        onKeyPress={handleKeyPress}
                                        className="w-full px-4 py-2 pl-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <button
                                        onClick={handleSearchSubmit}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                    >
                                        Search
                                    </button>
                                </div>
                                
                                {/* Item Filter */}
                                <Select
                                    options={itemOptions}
                                    value={selectedItem}
                                    onChange={handleItemChange}
                                    placeholder="Filter by item..."
                                    isClearable
                                    isLoading={itemLoading}
                                    styles={customSelectStyles}
                                    className="text-sm"
                                />
                                
                                {/* Type Filter */}
                                <Select
                                    options={typeOptions}
                                    value={selectedType}
                                    onChange={handleTypeChange}
                                    placeholder="Filter by type..."
                                    isClearable
                                    styles={customSelectStyles}
                                    className="text-sm"
                                />
                            </div>
                        </div>
                        
                        {/* Table Container */}
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-xs table-auto">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[5%]">
                                            Sl No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[20%]">
                                            Invoice No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[25%]">
                                            Item Name
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[10%]">
                                            Type
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[10%]">
                                            Date
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[10%]">
                                            Amount
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[10%]">
                                            Remark
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider w-[10%]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiDollarSign className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No expense records found</p>
                                                    <p className="text-slate-500 text-xs mb-4">Start by creating your first expense item</p>
                                                    <motion.button
                                                        onClick={() => setShowAddItemModal(true)}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow transition-all duration-200"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Create Your First Expense
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        expenses.map((expense, index) => {
                                            const isDropdownOpen = activeRowDropdown === expense.expense_id;
                                            const itemName = expense.item?.name || 'N/A';
                                            const itemType = expense.item?.type || '';
                                            
                                            return (
                                                <motion.tr
                                                    key={expense.expense_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="hover:bg-blue-50/20 transition-colors duration-150"
                                                >
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-700 font-medium text-xs">
                                                            {((pagination.page_no - 1) * pagination.limit) + index + 1}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className="inline-flex items-center justify-center bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded text-xs border border-slate-300/50">
                                                            {expense.invoice_no || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="px-2">
                                                            <div className="text-slate-800 font-semibold text-xs truncate">
                                                                {itemName}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <span className={`px-2 py-1.5 rounded-full text-[9px] font-medium capitalize whitespace-nowrap ${getExpenseTypeColor(itemType)}`}>
                                                            {formatExpenseType(itemType)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-600 text-xs">
                                                            {formatDate(expense.expense_date)}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <motion.span
                                                            onClick={() => navigate('../finance/voucher/expense-details', { state: { expense } })}
                                                            className="inline-flex items-center justify-center bg-gradient-to-r from-green-50 to-green-100 text-green-800 font-bold px-3 py-1.5 rounded text-xs cursor-pointer hover:shadow transition-all duration-150"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            ₹{formatCurrency(expense.amount)}
                                                        </motion.span>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-600 text-xs truncate max-w-[150px]" title={expense.remark}>
                                                            {expense.remark || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="dropdown-container relative flex justify-center">
                                                            <motion.button
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                onClick={() => toggleRowDropdown(expense.expense_id)}
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
                                                                                href={`/edit-expense?expense_id=${expense.expense_id}`}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                onClick={() => setActiveRowDropdown(null)}
                                                                            >
                                                                                <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                    <FiEdit className="w-3 h-3 text-blue-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">Edit Expense</div>
                                                                                </div>
                                                                            </a>
                                                                            <div className="border-t border-slate-100 mt-1 pt-1">
                                                                                <motion.span
                                                                                    onClick={() => navigate('../finance/voucher/expense-details', { state: { expense } })}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
                                                                                >
                                                                                    <div className="p-1 bg-green-50 rounded mr-2">
                                                                                        <FiFileText className="w-3 h-3 text-green-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">View Details</div>
                                                                                    </div>
                                                                                </motion.span>
                                                                                <button
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                    onClick={() => handleExport('print', expense)}
                                                                                >
                                                                                    <div className="p-1 bg-slate-50 rounded mr-2">
                                                                                        <FiPrinter className="w-3 h-3 text-slate-600" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Print</div>
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
                        
                        {/* Pagination Component */}
                        {expenses.length > 0 && (
                            <Pagination
                                pagination={paginationProps}
                                onPageChange={handlePageChange}
                                onLimitChange={handleLimitChange}
                                onCustomPageChange={handleCustomPageChange}
                                loading={loading}
                                showPageInfo={true}
                                showLimitSelector={true}
                                showCustomInput={true}
                            />
                        )}
                    </motion.div>
                </div>
            </div>
            
            {/* Add Item Modal with API Integration */}
            <AddItemModal
                isOpen={showAddItemModal}
                onClose={() => {
                    setShowAddItemModal(false);
                    setNewItemForm({ name: '', remark: '', type: '' });
                }}
                onSubmit={handleCreateItem}
                formData={newItemForm}
                onChange={handleItemInputChange}
                loading={loading}
                typeOptions={typeOptions}
            />
            
            <CreateExpenseModal
                isOpen={showCreateExpenseModal}
                onClose={() => {
                    setShowCreateExpenseModal(false);
                    handleSearch(); // Refresh list
                }}
                onSubmit={handleCreateExpense}
                onChange={() => {}}
                loading={loading}
            />
            
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
        </div>
    );
};

// Add Expense Item Modal with API Integration
const AddItemModal = ({
    isOpen,
    onClose,
    onSubmit,
    formData,
    onChange,
    loading,
    typeOptions
}) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                {/* Overlay */}
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    onClick={onClose}
                />
                {/* Compact Modal panel */}
                <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-300">
                    {/* Professional Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-300 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                        <h2 className="text-xl font-bold">Add Expense Item</h2>
                        <button
                            onClick={onClose}
                            className="text-blue-200 p-1 text-white rounded-lg bg-blue-500 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Compact Body */}
                    <div className="p-6">
                        <form onSubmit={onSubmit}>
                            <div className="space-y-4">
                                {/* Expense Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Expense Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={onChange}
                                        placeholder="Enter expense name"
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors"
                                        required
                                    />
                                </div>
                                
                                {/* Expense Type */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Expense Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors bg-white"
                                        required
                                    >
                                        <option value="" disabled>Select Expense Type</option>
                                        {typeOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Remark */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Remark
                                    </label>
                                    <textarea
                                        name="remark"
                                        value={formData.remark}
                                        onChange={onChange}
                                        placeholder="Enter remark (optional)"
                                        rows="3"
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors resize-none"
                                    />
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    {/* Footer Section */}
                    <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 rounded-b-xl">
                        <div className="flex justify-end items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                onClick={onSubmit}
                                disabled={loading}
                                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center min-w-[120px] justify-center"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating...
                                    </>
                                ) : (
                                    'Create Item'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewExpenses;