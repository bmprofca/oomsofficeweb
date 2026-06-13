// src/pages/TaskDetailedPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiEye, FiEdit, FiTrash2, FiChevronDown, FiChevronUp, 
  FiDownload, FiFilter, FiX, FiCalendar, FiClock, FiUser,
  FiBriefcase, FiCheckCircle, FiAlertCircle, FiLoader, 
  FiArrowLeft, FiRefreshCw, FiChevronLeft, FiChevronRight,
  FiUsers
} from 'react-icons/fi';
import { Sidebar, Header } from '../components/header';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";

const TaskDetailedPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const serviceId = searchParams.get('service_id');
  
  // Sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('sidebarMinimized');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [categoryLegend, setCategoryLegend] = useState({});
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    is_last_page: true
  });
  const [filters, setFilters] = useState({
    search: '',
    status_filter: ''
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [usersModal, setUsersModal] = useState({ open: false, users: [], taskName: '' });

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

  // Fetch detailed tasks
  const fetchDetailedTasks = useCallback(async () => {
    if (!category) return;
    
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/report/task-detailed?category=${category}`;
      
      if (serviceId && serviceId !== 'null' && serviceId !== 'undefined') {
        url += `&service_id=${serviceId}`;
      }
      
      url += `&page_no=${pagination.page_no}&limit=${pagination.limit}`;
      
      if (filters.search) {
        url += `&search=${encodeURIComponent(filters.search)}`;
      }
      if (filters.status_filter) {
        url += `&status_filter=${filters.status_filter}`;
      }
      
      const response = await fetch(url, {
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.data);
        setSummary(data.summary);
        setCategoryLegend(data.category_legend || {});
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching detailed tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [category, serviceId, pagination.page_no, pagination.limit, filters]);

  useEffect(() => {
    fetchDetailedTasks();
  }, [fetchDetailedTasks]);

  const toggleRowExpand = (taskId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedRows(newExpanded);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page_no: newPage }));
  };

  const handleRefresh = () => {
    fetchDetailedTasks();
  };

  const handleClearFilters = () => {
    setFilters({ search: '', status_filter: '' });
    setPagination(prev => ({ ...prev, page_no: 1 }));
  };

  const getStatusBadgeColor = (statusCategory) => {
    const colors = {
      'OD': 'bg-red-100 text-red-700',
      'DT': 'bg-orange-100 text-orange-700',
      'D7': 'bg-yellow-100 text-yellow-700',
      'FT': 'bg-green-100 text-green-700',
      'WIP': 'bg-blue-100 text-blue-700',
      'PFC': 'bg-purple-100 text-purple-700',
      'PFD': 'bg-pink-100 text-pink-700',
      'CPL': 'bg-emerald-100 text-emerald-700',
      'CNL': 'bg-gray-100 text-gray-700'
    };
    return colors[statusCategory] || 'bg-gray-100 text-gray-700';
  };

  const getDueDateColor = (dueCategory) => {
    const colors = {
      'OD': 'text-red-600 font-semibold',
      'DT': 'text-orange-600 font-semibold',
      'D7': 'text-yellow-600',
      'FT': 'text-green-600'
    };
    return colors[dueCategory] || 'text-gray-600';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Open users modal to show staff details
  const openUsersModal = (staffs, taskName) => {
    if (!staffs || staffs.length === 0) return;
    
    setUsersModal({
      open: true,
      users: staffs.map(staff => ({
        username: staff.username,
        name: staff.name,
        email: staff.email,
        mobile: staff.mobile,
        role: staff.role || 'Staff'
      })),
      taskName
    });
  };

  // Close users modal
  const closeUsersModal = () => {
    setUsersModal({
      open: false,
      users: [],
      taskName: ''
    });
  };

  // Users List Modal Component
  const UsersListModal = ({ isOpen, onClose, users, taskName }) => {
    if (!isOpen) return null;
    
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto overflow-hidden"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <FiUsers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Assigned Staff</h3>
                      <p className="text-indigo-100 text-sm">Task: {taskName}</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={onClose}
                    className="text-white hover:text-indigo-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FiX className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
              
              {/* Users List */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                  {users.map((user, index) => (
                    <motion.div
                      key={user.username}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                        {user.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 text-sm truncate">{user.name}</h4>
                        <p className="text-gray-600 text-xs truncate">{user.email}</p>
                        <p className="text-gray-500 text-xs mt-1">{user.mobile}</p>
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {user.username}
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {users.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiUser className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No staff assigned</p>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">{users.length}</span> staff member{users.length !== 1 ? 's' : ''} assigned
                  </div>
                  <motion.button
                    onClick={onClose}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium text-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Render staff avatars (similar to TaskDisplay)
  const renderStaffAvatars = (assignment, taskName) => {
    const staffs = assignment?.staff || [];
    
    if (staffs.length === 0) {
      return <span className="text-gray-400 text-sm">-</span>;
    }
    
    if (staffs.length === 1) {
      return (
        <button
          onClick={() => openUsersModal(staffs, taskName)}
          className="flex items-center justify-start cursor-pointer hover:opacity-80 transition-opacity"
          title={`Click to view ${staffs[0].name}'s details`}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm">
            {staffs[0].name?.charAt(0) || 'S'}
          </div>
        </button>
      );
    }
    
    if (staffs.length === 2) {
      return (
        <div className="flex -space-x-2">
          {staffs.map((staff, staffIndex) => (
            <button
              key={staff.username || staffIndex}
              onClick={() => openUsersModal(staffs, taskName)}
              className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              title={`Click to view ${staff.name}'s details`}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {staff.name?.charAt(0) || 'S'}
              </div>
            </button>
          ))}
        </div>
      );
    }
    
    if (staffs.length > 2) {
      const showMoreCount = staffs.length - 2;
      return (
        <div className="flex -space-x-2">
          {staffs.slice(0, 2).map((staff, staffIndex) => (
            <div
              key={staff.username || staffIndex}
              className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm"
            >
              {staff.name?.charAt(0) || 'S'}
            </div>
          ))}
          {staffs.length > 2 && (
            <button
              onClick={() => openUsersModal(staffs, taskName)}
              className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-gray-700 hover:bg-gray-400 hover:text-gray-800 transition-colors shadow-sm"
              title={`Click to view all ${staffs.length} staff members`}
            >
              +{showMoreCount}
            </button>
          )}
        </div>
      );
    }
  };

  const TaskDetailsModal = ({ task, onClose }) => {
    if (!task) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-800">Task Details</h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiX className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Task ID and Status */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Task ID</p>
                  <p className="font-mono text-sm break-all">{task.task_id}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  task.task_details.status_category === 'CPL' ? 'bg-green-100 text-green-700' :
                  task.task_details.status_category === 'CNL' ? 'bg-red-100 text-red-700' :
                  task.task_details.status_category === 'WIP' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {task.task_details.status_category}
                </span>
              </div>
            </div>

            {/* Client & Service Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <FiUser className="w-4 h-4" /> Client Information
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium text-gray-800">{task.client.name}</p>
                  <p className="text-sm text-gray-600">{task.client.email}</p>
                  <p className="text-sm text-gray-600">{task.client.phone}</p>
                  <p className="text-sm text-gray-500 mt-1">{task.client.address}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <FiBriefcase className="w-4 h-4" /> Service & Firm
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium text-gray-800">{task.service.service_name}</p>
                  <p className="text-sm text-gray-600">{task.service.category_name}</p>
                  <p className="text-sm text-gray-600 mt-2">Firm: {task.firm.firm_name}</p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                <FiCalendar className="w-4 h-4" /> Important Dates
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Created Date</p>
                  <p className="font-medium">{formatDate(task.task_details.create_date)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className={`font-medium ${getDueDateColor(task.task_details.due_category)}`}>
                    {formatDate(task.task_details.due_date)}
                  </p>
                  <p className="text-xs text-gray-500">Category: {task.task_details.due_category}</p>
                </div>
                {task.task_details.complete_date && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Completed Date</p>
                    <p className="font-medium text-green-600">{formatDate(task.task_details.complete_date)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Staff Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                <FiUsers className="w-4 h-4" /> Assigned Staff
              </h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600">Staff Members:</div>
                  <div>
                    {renderStaffAvatars(task.assignment, task.service.service_name)}
                  </div>
                  <div className="text-sm text-gray-500 ml-auto">
                    Total: {task.assignment?.staff_count || 0}
                  </div>
                </div>
                {task.assignment?.staff && task.assignment.staff.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Staff Details:</p>
                    <div className="space-y-1">
                      {task.assignment.staff.map((staff, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{staff.name}</span>
                          <span className="text-gray-500 ml-2">({staff.role || 'Staff'})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financials */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700">Financial Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Fees</p>
                  <p className="font-medium">₹{task.financials.fees}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Tax ({task.financials.tax_rate}%)</p>
                  <p className="font-medium">₹{task.financials.tax_value}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-medium text-indigo-600">₹{task.financials.total}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Billing Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                    task.financials.billing_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {task.financials.billing_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Created By */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700">Created By</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{task.task_details.created_by.name}</p>
                <p className="text-sm text-gray-600">{task.task_details.created_by.email}</p>
                <p className="text-sm text-gray-600">{task.task_details.created_by.mobile}</p>
              </div>
            </div>

            {/* Subtasks if any */}
            {task.subtasks.total > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700">Subtasks</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-bold">{task.subtasks.total}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="font-bold text-yellow-600">{task.subtasks.pending}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500">In Process</p>
                    <p className="font-bold text-blue-600">{task.subtasks.in_process}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Completed</p>
                    <p className="font-bold text-green-600">{task.subtasks.completed}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (!category || category === 'null') {
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
        <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">No Category Selected</h2>
              <p className="text-gray-500 mb-6">Please select a task category to view details.</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
              >
                Go Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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

      {/* Main content */}
      <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/')}
              className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center gap-2 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                      <FiCalendar className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                        {category} Tasks
                      </h1>
                      <p className="text-gray-500">
                        {categoryLegend[category] || `Tasks categorized as ${category}`}
                      </p>
                    </div>
                  </div>
                  {summary && (
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <span className="px-3 py-1 bg-gray-100 rounded-full">
                        Total Tasks: {summary.total_tasks}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 rounded-full">
                        Services: {summary.total_services_affected}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 rounded-full">
                        Clients: {summary.total_clients_affected}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 rounded-full">
                        Revenue: {formatCurrency(summary.total_revenue)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <motion.button 
                    onClick={handleRefresh}
                    disabled={loading}
                    className="p-3 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiRefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search by client name, email, or task ID..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, search: e.target.value }));
                    setPagination(prev => ({ ...prev, page_no: 1 }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="min-w-[150px]">
                <select
                  value={filters.status_filter}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, status_filter: e.target.value }));
                    setPagination(prev => ({ ...prev, page_no: 1 }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {(filters.search || filters.status_filter) && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <FiX className="w-4 h-4" /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Tasks Table */}
          {loading ? (
            <div className="bg-white rounded-2xl shadow-xl p-20 flex justify-center items-center">
              <FiLoader className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="w-10 p-4"></th>
                        <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          SL No
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          Client
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          Task Details
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          Dates
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          Staffs
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tasks.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-12 text-gray-500">
                            No tasks found
                          </td>
                        </tr>
                      ) : (
                        tasks.map((task, index) => (
                          <React.Fragment key={task.task_id}>
                            <tr className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-4">
                                <button
                                  onClick={() => toggleRowExpand(task.task_id)}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                  {expandedRows.has(task.task_id) ? 
                                    <FiChevronUp className="w-4 h-4" /> : 
                                    <FiChevronDown className="w-4 h-4" />
                                  }
                                </button>
                              </td>
                              <td className="p-4 text-gray-600">
                                {(pagination.page_no - 1) * pagination.limit + index + 1}
                              </td>
                              <td className="p-4">
                                <div>
                                  <p className="font-semibold text-gray-800">{task.client.name}</p>
                                  <p className="text-sm text-gray-500">{task.client.email}</p>
                                  <p className="text-sm text-gray-500">{task.client.phone}</p>
                                </div>
                              </td>
                              <td className="p-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-800">{task.service.service_name}</p>
                                    {task.task_details?.task_kind === 'recurring' ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">Recurring</span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 uppercase">Normal</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500">{task.service.category_name}</p>
                                  <p className="text-xs text-gray-400 font-mono mt-1">{task.task_id.slice(0, 20)}...</p>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <FiCalendar className="w-3 h-3 text-gray-400" />
                                    <span>Created: {formatDate(task.task_details.create_date)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <FiClock className="w-3 h-3 text-gray-400" />
                                    <span className={getDueDateColor(task.task_details.due_category)}>
                                      Due: {formatDate(task.task_details.due_date)}
                                    </span>
                                  </div>
                                  {task.task_details.complete_date && (
                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                      <FiCheckCircle className="w-3 h-3" />
                                      <span>Completed: {formatDate(task.task_details.complete_date)}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                {renderStaffAvatars(task.assignment, task.service.service_name)}
                              </td>
                              <td className="p-4">
                                <div className="space-y-1">
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(task.task_details.status_category)}`}>
                                    {task.task_details.status_category}
                                  </span>
                                  <p className="text-xs text-gray-500">{task.task_details.status}</p>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => setSelectedTask(task)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="View Details"
                                  >
                                    <FiEye className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <FiEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Expanded Row */}
                            <AnimatePresence>
                              {expandedRows.has(task.task_id) && (
                                <motion.tr
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="bg-gray-50"
                                >
                                  <td colSpan="8" className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {/* Financial Info */}
                                      <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <h4 className="font-semibold text-gray-700 mb-3">Financial Details</h4>
                                        <div className="space-y-2 text-sm">
                                          <p><span className="text-gray-500">Fees:</span> ₹{task.financials.fees}</p>
                                          <p><span className="text-gray-500">Tax ({task.financials.tax_rate}%):</span> ₹{task.financials.tax_value}</p>
                                          <p><span className="text-gray-500">Total:</span> ₹{task.financials.total}</p>
                                          <p><span className="text-gray-500">Billing:</span> 
                                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                              task.financials.billing_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                              {task.financials.billing_status}
                                            </span>
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Subtasks */}
                                      <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <h4 className="font-semibold text-gray-700 mb-3">Subtasks</h4>
                                        <div className="space-y-2">
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Total:</span>
                                            <span>{task.subtasks.total}</span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Pending:</span>
                                            <span className="text-yellow-600">{task.subtasks.pending}</span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">In Process:</span>
                                            <span className="text-blue-600">{task.subtasks.in_process}</span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Completed:</span>
                                            <span className="text-green-600">{task.subtasks.completed}</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Staff Details in expanded row */}
                                      <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                          <FiUsers className="w-4 h-4 text-indigo-600" />
                                          Staff Details
                                        </h4>
                                        {task.assignment?.staff && task.assignment.staff.length > 0 ? (
                                          <div className="space-y-2">
                                            {task.assignment.staff.map((staff, idx) => (
                                              <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                  {staff.name?.charAt(0) || 'S'}
                                                </div>
                                                <div className="flex-1">
                                                  <p className="font-medium text-gray-800 text-sm">{staff.name}</p>
                                                  <p className="text-xs text-gray-500">{staff.role || 'Staff'}</p>
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                  ID: {staff.username}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-gray-500 text-sm">No staff assigned</p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </motion.tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="mt-6 flex justify-center items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page_no - 1)}
                    disabled={pagination.page_no === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    Page {pagination.page_no} of {pagination.total_pages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page_no + 1)}
                    disabled={pagination.is_last_page}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    Next
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} />
        )}
      </AnimatePresence>

      {/* Users List Modal */}
      <UsersListModal
        isOpen={usersModal.open}
        onClose={closeUsersModal}
        users={usersModal.users}
        taskName={usersModal.taskName}
      />
    </div>
  );
};

export default TaskDetailedPage;