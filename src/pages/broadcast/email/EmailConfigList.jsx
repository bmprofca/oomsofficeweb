import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import EmailConfigFormModal from './EmailConfigFormModal';
import { emailApi, normalizeList, normalizePagination } from './emailApi';
import { 
  FiPlus, 
  FiEdit, 
  FiMail, 
  FiStar, 
  FiPower, 
  FiMenu,
  FiChevronLeft,
  FiChevronRight,
  FiServer,
  FiDatabase,
  FiCalendar,
  FiAtSign
} from 'react-icons/fi';

const EmailConfigList = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const fetchData = async (page = pagination.page_no) => {
    setLoading(true);
    try {
      const res = await emailApi.listConfigs({ page_no: page, limit: pagination.limit });
      setRows(normalizeList(res?.data));
      setPagination(normalizePagination(res?.pagination));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to load configs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(1); }, []);
  useEffect(() => { localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); }, [isMinimized]);

  const updateStatus = async (row) => {
    try {
      await emailApi.changeConfigStatus({ config_id: row.config_id, status: row.status === 'active' ? 'inactive' : 'active' });
      toast.success('Status updated successfully');
      fetchData();
      setOpenMenuId(null);
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'Failed to update status'); 
    }
  };

  const setDefault = async (row) => {
    try {
      await emailApi.setDefaultConfig({ config_id: row.config_id });
      toast.success('Default configuration updated');
      fetchData();
      setOpenMenuId(null);
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'Failed to set default'); 
    }
  };

  const testSmtp = async (row) => {
    try {
      await emailApi.testConfig({
        host: row.host,
        port: Number(row.port),
        secure: Number(row.secure) ? 1 : 0,
        username: row.username || row.smtp_username,
        password: row.password,
      });
      toast.success('SMTP connection test successful');
      setOpenMenuId(null);
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'SMTP test failed'); 
    }
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
                  SMTP Configuration
                </h1>
                <p className="text-slate-500 mt-1 text-sm">
                  Manage and monitor your email server configurations
                </p>
              </div>
              <button
                onClick={() => { setEditData(null); setShowModal(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-sm"
              >
                <FiPlus className="w-4 h-4" />
                Add New Configuration
              </button>
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
                  <h2 className="text-base md:text-lg font-semibold text-slate-800">Email Configurations</h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5">Configure SMTP servers for reliable email delivery</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  </div>
                  <p className="mt-4 text-slate-500 font-medium">Loading configurations...</p>
                </div>
              ) : (
                <>
                  {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <div className="p-4 bg-slate-100 rounded-full mb-4">
                        <FiDatabase className="w-10 h-10 text-slate-400" />
                      </div>
                      <p className="text-slate-600 text-center font-medium">No SMTP configs found</p>
                      <p className="text-slate-400 text-sm text-center mt-1">Get started by creating your first configuration</p>
                      <button
                        onClick={() => { setEditData(null); setShowModal(true); }}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg transition-colors duration-200 text-sm"
                      >
                        <FiPlus className="w-4 h-4" />
                        Create Configuration
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Responsive Grid View for Mobile, Table View for Desktop */}
                      <div className="block lg:hidden">
                        {rows.map((row) => (
                          <div key={row.config_id} className="border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="p-1.5 bg-blue-50 rounded-lg">
                                  <FiMail className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900 text-sm">{row.config_name}</h3>
                                  <p className="text-xs text-slate-500 font-mono">{row.host}:{row.port}</p>
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
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-[9999]">
                                    <div className="py-1">
                                      <button
                                        onClick={() => { setEditData(row); setShowModal(true); }}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                      >
                                        <FiEdit className="w-4 h-4" />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => testSmtp(row)}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                      >
                                        <FiMail className="w-4 h-4" />
                                        Test SMTP
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
                                <p className="text-xs text-slate-500 mb-1">From Email</p>
                                <div className="flex items-center gap-1">
                                  <FiAtSign className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-700 text-xs truncate">{row.from_email}</span>
                                </div>
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
                            <div className="mt-3 pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <FiCalendar className="w-3 h-3" />
                                <span>{row.create_date ? new Date(row.create_date).toLocaleDateString() : '-'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Host</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Port</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">From Email</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Create Date</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rows.map((row) => (
                              <tr key={row.config_id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-50 rounded-lg">
                                      <FiMail className="w-3.5 h-3.5 text-blue-600" />
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
                                <td className="px-4 py-3">
                                  <span className="text-xs font-mono text-slate-600">{row.host}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-slate-600">{row.port}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1">
                                    <FiAtSign className="w-3 h-3 text-slate-400" />
                                    <span className="text-sm text-slate-600 truncate max-w-[200px]">{row.from_email}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
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
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1">
                                    <FiCalendar className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs text-slate-500">
                                      {row.create_date ? new Date(row.create_date).toLocaleDateString() : '-'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
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
                                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-[9999]">
                                        <div className="py-1">
                                          <button
                                            onClick={() => { setEditData(row); setShowModal(true); }}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                          >
                                            <FiEdit className="w-4 h-4" />
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => testSmtp(row)}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                          >
                                            <FiMail className="w-4 h-4" />
                                            Test SMTP
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
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="px-4 md:px-6 py-4 border-t border-slate-200 bg-slate-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-xs md:text-sm text-slate-600">
                            Showing <span className="font-semibold text-slate-800">{rows.length}</span> of{' '}
                            <span className="font-semibold text-slate-800">{pagination.total}</span> configurations
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => fetchData(pagination.page_no - 1)}
                              disabled={pagination.page_no <= 1}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <FiChevronLeft className="w-3.5 h-3.5" />
                              Previous
                            </button>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-300">
                              <span className="text-xs md:text-sm text-slate-600">Page</span>
                              <span className="text-xs md:text-sm font-semibold text-slate-800">{pagination.page_no}</span>
                              <span className="text-xs md:text-sm text-slate-600">of</span>
                              <span className="text-xs md:text-sm font-semibold text-slate-800">{pagination.total_pages}</span>
                            </div>
                            <button
                              onClick={() => fetchData(pagination.page_no + 1)}
                              disabled={pagination.page_no >= pagination.total_pages}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              Next
                              <FiChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <EmailConfigFormModal show={showModal} onHide={() => setShowModal(false)} editData={editData} onSuccess={() => fetchData()} />
    </div>
  );
};

export default EmailConfigList;