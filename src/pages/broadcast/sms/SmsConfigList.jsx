import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import SmsConfigFormModal from './SmsConfigFormModal';
import { smsApi, normalizeList, normalizePagination } from './smsApi';
import { 
  FiPlus, 
  FiEdit, 
  FiMessageSquare, 
  FiStar, 
  FiPower, 
  FiMenu,
  FiChevronLeft,
  FiChevronRight,
  FiServer,
  FiDatabase,
  FiCalendar,
  FiSliders,
  FiInfo,
  FiChevronsLeft,
  FiChevronsRight,
  FiCornerDownLeft
} from 'react-icons/fi';

const TableSkeleton = ({ cols = 8, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, rIdx) => (
      <tr key={rIdx} className="animate-pulse border-b border-slate-100">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <td key={cIdx} className="px-6 py-4">
            <div className={`h-4 bg-slate-200 rounded ${
              cIdx === 0 ? 'w-2/3' :
              cIdx === 1 ? 'w-1/2' :
              cIdx === 2 ? 'w-3/4 font-mono' :
              cIdx === 3 ? 'w-1/2' :
              cIdx === 4 ? 'w-1/3' :
              cIdx === 5 ? 'w-1/2 mx-auto' :
              cIdx === 6 ? 'w-2/3' :
              'w-8 mx-auto'
            }`}></div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

const SmsConfigList = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openTestOnModal, setOpenTestOnModal] = useState(false);
  const [jumpPage, setJumpPage] = useState('');

  const fetchData = async (page = pagination.page_no, limit = pagination.limit) => {
    setLoading(true);
    try {
      const res = await smsApi.listConfigs({ page_no: page, limit: limit });
      setRows(normalizeList(res?.data));
      setPagination(normalizePagination(res?.pagination));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to load configs');
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (newLimit) => {
    const val = Number(newLimit);
    setPagination(prev => ({ ...prev, limit: val, page_no: 1 }));
    fetchData(1, val);
  };

  const handleJumpPage = (e) => {
    e?.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pagination.total_pages) {
      fetchData(pageNum, pagination.limit);
      setJumpPage('');
    } else {
      toast.error(`Please enter a valid page number between 1 and ${pagination.total_pages}`);
    }
  };

  useEffect(() => { fetchData(1, pagination.limit); }, []);
  useEffect(() => { localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); }, [isMinimized]);

  const updateStatus = async (row) => {
    try {
      await smsApi.changeConfigStatus({ config_id: row.config_id, status: row.status === 'active' ? 'inactive' : 'active' });
      toast.success('Status updated successfully');
      fetchData(pagination.page_no, pagination.limit);
      setOpenMenuId(null);
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'Failed to update status'); 
    }
  };

  const setDefault = async (row) => {
    try {
      await smsApi.setDefaultConfig({ config_id: row.config_id });
      toast.success('Default configuration updated');
      fetchData(pagination.page_no, pagination.limit);
      setOpenMenuId(null);
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'Failed to set default'); 
    }
  };

  const testConfig = async (row) => {
    try {
      await smsApi.testConfig({
        provider: row.provider,
        sender_id: row.sender_id,
        route: row.route,
        test_number: "9999999999", // simple fallback validation or prompts
      });
      toast.success('SMS gateway connection test successful');
      setOpenMenuId(null);
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'SMS Gateway test failed'); 
    }
  };

  const triggerTest = (row) => {
    setEditData(row);
    setOpenTestOnModal(true);
    setShowModal(true);
    setOpenMenuId(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      
      <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  SMS Gateway Configuration
                </h1>
                <p className="text-slate-500 mt-1 text-sm">
                  Configure Fast2SMS or other custom service integrations for text broadcasting
                </p>
              </div>
              <button
                onClick={() => { setEditData(null); setShowModal(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-sm"
              >
                <FiPlus className="w-4 h-4" />
                Add Gateway Credentials
              </button>
            </div>
          </div>

          {/* System Default Banner */}
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3">
            <div className="p-1 bg-blue-100 rounded-lg text-blue-600">
              <FiInfo className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">System Default Gateway (Our Service)</h3>
              <p className="text-xs text-slate-600 mt-1">
                By default, if you do not define any credentials here or deactivate them, the application automatically uses the **System Default Fast2SMS configuration (Our Service)** to route messages. You only need to add configurations below if you want to use your own personal/corporate SMS gateway accounts.
              </p>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            {/* Card Header */}
            <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiServer className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-slate-800">Branch Gateways</h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5">Manage credentials and sending limitations per branch gateway</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-0">
              {loading && rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-slate-500 font-medium">Loading configurations...</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card List */}
                  <div className="block lg:hidden">
                    {rows.length === 0 && !loading ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                          <FiDatabase className="w-10 h-10 text-slate-400" />
                        </div>
                        <p className="text-slate-600 text-center font-medium">No custom SMS configs found</p>
                        <p className="text-slate-400 text-sm text-center mt-1">The system is currently using the default system gateway. Create one below to use your own account.</p>
                        <button
                          onClick={() => { setEditData(null); setShowModal(true); }}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg transition-colors duration-200 text-sm"
                        >
                          <FiPlus className="w-4 h-4" />
                          Create Configuration
                        </button>
                      </div>
                    ) : (
                      rows.map((row) => (
                        <div key={row.config_id} className="border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="p-1.5 bg-blue-50 rounded-lg">
                                <FiMessageSquare className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900 text-sm">{row.config_name}</h3>
                                <p className="text-xs text-slate-500 font-mono">Provider: {row.provider}</p>
                              </div>
                            </div>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === row.config_id ? null : row.config_id);
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <FiMenu className="w-4 h-4 text-slate-600" />
                              </button>
                              {openMenuId === row.config_id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-[999]">
                                  <div className="py-1">
                                    <button
                                      onClick={() => { setEditData(row); setShowModal(true); }}
                                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                    >
                                      <FiEdit className="w-4 h-4" />
                                      Edit Details
                                    </button>
                                    <button
                                      onClick={() => triggerTest(row)}
                                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                    >
                                      <FiMessageSquare className="w-4 h-4" />
                                      Test SMS Gateway
                                    </button>
                                    <button
                                      onClick={() => setDefault(row)}
                                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                    >
                                      <FiStar className="w-4 h-4" />
                                      Set Default
                                    </button>
                                    <div className="border-t border-slate-100 my-1"></div>
                                    <button
                                      onClick={() => updateStatus(row)}
                                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-3"
                                    >
                                      <FiPower className="w-4 h-4" />
                                      {row.status === 'active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Route & Limit</p>
                              <span className="text-slate-700 text-xs font-semibold">{row.route.toUpperCase()} Route • Limit: {row.daily_limit}</span>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Status</p>
                              {row.status === 'active' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Gateway Name</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Provider</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Header/Sender ID</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Route</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Daily limit</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Create Date</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <TableSkeleton cols={8} rows={5} />
                        ) : rows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-16 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <div className="p-4 bg-slate-100 rounded-full mb-4">
                                  <FiDatabase className="w-10 h-10 text-slate-400" />
                                </div>
                                <p className="text-slate-600 text-center font-medium">No custom SMS configs found</p>
                                <p className="text-slate-400 text-sm text-center mt-1">The system is currently using the default system gateway.</p>
                                <button
                                  onClick={() => { setEditData(null); setShowModal(true); }}
                                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg transition-colors duration-200 text-sm"
                                >
                                  <FiPlus className="w-4 h-4" />
                                  Create Configuration
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          rows.map((row) => (
                            <tr key={row.config_id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-blue-50 rounded-lg">
                                    <FiMessageSquare className="w-3.5 h-3.5 text-blue-600" />
                                  </div>
                                  <span className="text-sm font-medium text-slate-900">{row.config_name}</span>
                                  {row.is_default && (
                                    <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                      <FiStar className="w-3 h-3 fill-current" />
                                      Default
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                {row.provider.toUpperCase()}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                                {row.sender_id || '-'}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700">
                                  <FiSliders className="w-3 h-3" />
                                  {row.route.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                {row.daily_limit}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {row.status === 'active' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5">
                                  <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-xs text-slate-500">
                                    {row.create_date ? new Date(row.create_date).toLocaleDateString() : '-'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(openMenuId === row.config_id ? null : row.config_id);
                                    }}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center justify-center"
                                  >
                                    <FiMenu className="w-4 h-4 text-slate-600" />
                                  </button>
                                  
                                  {openMenuId === row.config_id && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-[999]">
                                      <div className="py-1">
                                        <button
                                          onClick={() => { setEditData(row); setShowModal(true); }}
                                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                        >
                                          <FiEdit className="w-4 h-4" />
                                          Edit Details
                                        </button>
                                        <button
                                          onClick={() => triggerTest(row)}
                                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                        >
                                          <FiMessageSquare className="w-4 h-4" />
                                          Test Config
                                        </button>
                                        <button
                                          onClick={() => setDefault(row)}
                                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                        >
                                          <FiStar className="w-4 h-4" />
                                          Set Default
                                        </button>
                                        <div className="border-t border-slate-100 my-1"></div>
                                        <button
                                          onClick={() => updateStatus(row)}
                                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-3"
                                        >
                                          <FiPower className="w-4 h-4" />
                                          {row.status === 'active' ? 'Deactivate' : 'Activate'}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {rows.length > 0 && (
                    <div className="px-4 md:px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Range & Limit */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs text-slate-600">
                        <div>
                          Showing <span className="font-semibold text-slate-800">{pagination.total === 0 ? 0 : (pagination.page_no - 1) * pagination.limit + 1}</span> to{' '}
                          <span className="font-semibold text-slate-800">{Math.min(pagination.page_no * pagination.limit, pagination.total)}</span> of{' '}
                          <span className="font-semibold text-slate-800">{pagination.total}</span> gateways
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Show</span>
                          <select
                            value={pagination.limit}
                            onChange={(e) => handleLimitChange(e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded bg-white text-slate-700 font-medium outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                          <span>per page</span>
                        </div>
                      </div>

                      {/* Controls & Jump */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => fetchData(1, pagination.limit)}
                            disabled={pagination.page_no <= 1 || loading}
                            className="p-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            title="First Page"
                          >
                            <FiChevronsLeft size={14} />
                          </button>
                          <button
                            onClick={() => fetchData(pagination.page_no - 1, pagination.limit)}
                            disabled={pagination.page_no <= 1 || loading}
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            <FiChevronLeft size={14} />
                            <span>Prev</span>
                          </button>

                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                            {pagination.page_no} / {pagination.total_pages}
                          </span>

                          <button
                            onClick={() => fetchData(pagination.page_no + 1, pagination.limit)}
                            disabled={pagination.page_no >= pagination.total_pages || loading}
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            <span>Next</span>
                            <FiChevronRight size={14} />
                          </button>
                          <button
                            onClick={() => fetchData(pagination.total_pages, pagination.limit)}
                            disabled={pagination.page_no >= pagination.total_pages || loading}
                            className="p-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            title="Last Page"
                          >
                            <FiChevronsRight size={14} />
                          </button>
                        </div>

                        {/* Jump to Page */}
                        <form onSubmit={handleJumpPage} className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={pagination.total_pages}
                            placeholder="Go to..."
                            value={jumpPage}
                            onChange={(e) => setJumpPage(e.target.value)}
                            className="w-16 px-2 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 bg-white text-center"
                          />
                          <button
                            type="submit"
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center shadow"
                            title="Jump to Page"
                          >
                            <FiCornerDownLeft size={12} />
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <SmsConfigFormModal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          setOpenTestOnModal(false);
        }}
        editData={editData}
        defaultShowTest={openTestOnModal}
        onSuccess={() => fetchData()}
      />
    </div>
  );
};

export default SmsConfigList;
