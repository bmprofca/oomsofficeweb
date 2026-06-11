import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, FiRefreshCw, FiLoader, FiCalendar, FiClock,
  FiUser, FiBriefcase, FiCheckCircle, FiAlertCircle, FiX, FiSearch,
  FiUsers, FiMenu, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { Sidebar, Header } from '../components/header';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";

const RecurringTaskDetailedPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'ALL';
  const serviceId = searchParams.get('service_id');

  // Sidebar states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('sidebarMinimized');
    return saved ? JSON.parse(saved) : false;
  });

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
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

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [usersModal, setUsersModal] = useState({ open: false, users: [], serviceName: '' });

  // Persist sidebar minimized state
  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [mobileMenuOpen]);

  // Fetch detailed records
  const fetchDetailedRecords = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/report/recurring-task-detailed?category=${category}`;
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

      const response = await fetch(url, { headers: getHeaders() });
      const data = await response.json();

      if (data.success) {
        setRecords(data.data || []);
        setSummary(data.summary || null);
        setPagination(data.pagination || {
          page_no: pagination.page_no,
          limit: pagination.limit,
          total: data.total || 0,
          total_pages: data.total_pages || 1,
          is_last_page: pagination.page_no >= (data.total_pages || 1)
        });
      }
    } catch (error) {
      console.error('Error fetching detailed recurring tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [category, serviceId, pagination.page_no, pagination.limit, filters]);

  useEffect(() => {
    fetchDetailedRecords();
  }, [fetchDetailedRecords]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page_no: newPage }));
  };

  const handleRefresh = () => {
    fetchDetailedRecords();
  };

  const handleClearFilters = () => {
    setFilters({ search: '', status_filter: '' });
    setPagination(prev => ({ ...prev, page_no: 1 }));
  };

  const getStatusBadgeColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('dept') || s.includes('department') || s === 'pending') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (s.includes('client')) {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    }
    if (s.includes('complete') || s.includes('sale') || s === 'filed') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('outsource')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-slate-50 text-slate-400 border-slate-200';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Open users modal to show staff details
  const openUsersModal = (staffs, serviceName) => {
    if (!staffs || staffs.length === 0) return;
    setUsersModal({
      open: true,
      users: staffs.map(staff => ({
        username: staff.username || staff.employee_id,
        name: staff.name || staff.username || '—',
        email: staff.email || '—',
        mobile: staff.mobile || staff.phone || '—',
        role: staff.role || 'Staff'
      })),
      serviceName
    });
  };

  // Users List Modal Component
  const UsersListModal = ({ isOpen, onClose, users, serviceName }) => {
    if (!isOpen) return null;
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[200] p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto overflow-hidden flex flex-col max-h-[85vh]"
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-3.5 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                    <FiUsers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Assigned Staff</h3>
                    <p className="text-indigo-150 text-[10px] truncate max-w-[220px]">{serviceName}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Users List */}
              <div className="p-5 flex-1 overflow-y-auto space-y-3 [scrollbar-width:none]">
                {users.map((user) => (
                  <div key={user.username} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {user.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 text-xs truncate">{user.name}</h4>
                      <p className="text-slate-400 text-[10px] truncate">{user.email}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">{user.mobile}</p>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      @{user.username}
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <FiUser className="w-7 h-7 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No staff assigned</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                <span className="text-xs font-semibold text-slate-500">{users.length} assigned</span>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  // Render staff avatars
  const renderStaffAvatars = (staffs, serviceName) => {
    const list = staffs || [];
    if (list.length === 0) return <span className="text-slate-400 text-xs">—</span>;

    return (
      <div className="flex items-center justify-center -space-x-2.5">
        {list.slice(0, 2).map((staff, idx) => (
          <button
            key={staff.username || idx}
            type="button"
            onClick={() => openUsersModal(list, serviceName)}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white hover:opacity-90 hover:scale-105 hover:z-10 transition-all shadow-xs cursor-pointer"
            title={`View assigned staff details`}
          >
            {(staff.name || staff.username || 'S').charAt(0).toUpperCase()}
          </button>
        ))}
        {list.length > 2 && (
          <button
            type="button"
            onClick={() => openUsersModal(list, serviceName)}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white hover:opacity-90 hover:scale-105 hover:z-10 transition-all shadow-xs cursor-pointer"
          >
            +{list.length - 2}
          </button>
        )}
      </div>
    );
  };

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
      <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/')}
              className="mb-4 text-indigo-600 hover:text-indigo-850 flex items-center gap-1.5 text-xs font-semibold transition-colors"
            >
              <FiArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <FiCalendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-800">
                      Recurring Tasks: {category} List
                    </h1>
                    <p className="text-xs text-slate-500">
                      Drill-down breakdown of recurring tasks categorized under {category}
                    </p>
                  </div>
                </div>
                {summary && (
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full font-medium text-slate-600">
                      Total: {summary.total_tasks || pagination.total}
                    </span>
                    {summary.active_tasks !== undefined && (
                      <span className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-full font-medium text-amber-700">
                        Active: {summary.active_tasks}
                      </span>
                    )}
                    {summary.completed_tasks !== undefined && (
                      <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full font-medium text-emerald-700">
                        Completed: {summary.completed_tasks}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[260px] relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by firm name, client or service..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, search: e.target.value }));
                    setPagination(prev => ({ ...prev, page_no: 1 }));
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-slate-50/50"
                />
              </div>
              <div className="min-w-[160px]">
                <select
                  value={filters.status_filter}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, status_filter: e.target.value }));
                    setPagination(prev => ({ ...prev, page_no: 1 }));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-white font-medium text-slate-700"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending From The Department">Pending (Dept)</option>
                  <option value="Pending From Client">Pending (Client)</option>
                  <option value="Complete">Complete</option>
                  <option value="Outsource">Outsource</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
              {(filters.search || filters.status_filter) && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-xs font-semibold text-slate-655 border border-slate-250 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <FiX className="w-3.5 h-3.5" /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-20 flex justify-center items-center">
              <FiLoader className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                      <th className="px-4 py-3 w-16 text-center">#</th>
                      <th className="px-4 py-3">Firm / Client</th>
                      <th className="px-4 py-3">Service Details</th>
                      <th className="px-4 py-3">Period / FY</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-center">Staff Assigned</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-14 text-slate-405 font-medium">
                          No recurring task records found matching current query
                        </td>
                      </tr>
                    ) : (
                      records.map((record, index) => (
                        <tr key={record.schedule_id || index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-400">
                            {(pagination.page_no - 1) * pagination.limit + index + 1}
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-800 text-xs">{record.firm?.firm_name || record.firm_name || '—'}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Client: {record.firm?.client?.name || record.client_name || '—'}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-800 text-xs">{record.service_name || record.service_id || '—'}</p>
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono border bg-slate-50 text-slate-550 mt-1 uppercase tracking-wide">
                              {record.service_type || 'compliance'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-medium text-slate-800 text-xs">{record.period_name || '—'}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">FY: {record.financial_year}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                              <FiClock className="w-3.5 h-3.5 text-slate-400" />
                              {formatDate(record.due_date)}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-center align-middle">
                            {renderStaffAvatars(record.employees || [], record.service_name)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeColor(record.status)}`}>
                              {record.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {pagination.total_pages > 1 && (
                <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
                  <span>
                    Showing <span className="font-semibold text-slate-700">{(pagination.page_no - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-semibold text-slate-700">
                      {Math.min(pagination.page_no * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="font-semibold text-slate-700">{pagination.total}</span> records
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(pagination.page_no - 1)}
                      disabled={pagination.page_no <= 1}
                      className="p-1.5 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <FiChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <span className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-xs">
                      {pagination.page_no} / {pagination.total_pages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page_no + 1)}
                      disabled={pagination.page_no >= pagination.total_pages}
                      className="p-1.5 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <UsersListModal
        isOpen={usersModal.open}
        onClose={() => setUsersModal({ open: false, users: [], serviceName: '' })}
        users={usersModal.users}
        serviceName={usersModal.serviceName}
      />
    </div>
  );
};

export default RecurringTaskDetailedPage;
