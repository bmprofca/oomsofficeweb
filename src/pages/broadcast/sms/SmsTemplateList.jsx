import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import SmsTemplateFormModal from './SmsTemplateFormModal';
import { smsApi, normalizeList, normalizePagination } from './smsApi';
import { 
  FiPlus, 
  FiEdit, 
  FiFileText, 
  FiRefreshCw, 
  FiSearch, 
  FiFilter, 
  FiChevronLeft, 
  FiChevronRight, 
  FiCalendar, 
  FiHash,
  FiActivity,
  FiChevronsLeft,
  FiChevronsRight,
  FiCornerDownLeft
} from 'react-icons/fi';

const TableSkeleton = ({ cols = 7, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, rIdx) => (
      <tr key={rIdx} className="animate-pulse border-b border-slate-100">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <td key={cIdx} className="px-6 py-4">
            <div className={`h-4 bg-slate-200 rounded ${
              cIdx === 0 ? 'w-2/3' :
              cIdx === 1 ? 'w-1/2 font-mono' :
              cIdx === 2 ? 'w-5/6 font-mono' :
              cIdx === 3 ? 'w-8 mx-auto' :
              cIdx === 4 ? 'w-1/2 mx-auto' :
              cIdx === 5 ? 'w-2/3' :
              'w-12 mx-auto'
            }`}></div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

const SmsTemplateList = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jumpPage, setJumpPage] = useState('');

  const fetchTemplates = async (page = 1, limit = pagination.limit) => {
    setLoading(true);
    try {
      const params = {
        page_no: page,
        limit: limit,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      };
      const res = await smsApi.listTemplates(params);
      setRows(normalizeList(res?.data));
      setPagination(normalizePagination(res?.pagination));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (newLimit) => {
    const val = Number(newLimit);
    setPagination(prev => ({ ...prev, limit: val, page_no: 1 }));
    fetchTemplates(1, val);
  };

  const handleJumpPage = (e) => {
    e?.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pagination.total_pages) {
      fetchTemplates(pageNum, pagination.limit);
      setJumpPage('');
    } else {
      toast.error(`Please enter a valid page number between 1 and ${pagination.total_pages}`);
    }
  };

  useEffect(() => { 
    fetchTemplates(1, pagination.limit); 
  }, [searchTerm, statusFilter]);

  useEffect(() => { 
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); 
  }, [isMinimized]);

  const changeStatus = async (row) => {
    try {
      await smsApi.changeTemplateStatus({ 
        template_id: row.template_id, 
        status: row.status === 'active' ? 'inactive' : 'active' 
      });
      toast.success('Template status updated');
      fetchTemplates(pagination.page_no, pagination.limit);
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'Failed to change status'); 
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      
      <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  SMS Templates
                </h1>
                <p className="text-slate-500 mt-1 text-sm">
                  Design and manage text message templates with variable placeholders
                </p>
              </div>
              <button
                onClick={() => { setEditData(null); setShowModal(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <FiPlus className="w-4 h-4" />
                Add SMS Template
              </button>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Filters Bar */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64 pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white outline-none"
                    />
                  </div>
                  <div className="relative">
                    <FiFilter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer outline-none"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Template Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-36">DLT Template ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Message Snippet</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Variables</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-36">Created</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <TableSkeleton cols={7} rows={5} />
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="p-3 bg-slate-100 rounded-full mb-3">
                            <FiFileText size={32} className="text-slate-400" />
                          </div>
                          <p className="text-slate-500 font-medium">No SMS templates found</p>
                          <p className="text-slate-400 text-sm mt-1">Create your first SMS template to start broadcasting</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.template_id} className="hover:bg-slate-50/50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-50 rounded-lg">
                              <FiFileText size={14} className="text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-900">{row.template_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-500">
                          {row.dlt_template_id || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600 font-mono line-clamp-1 truncate max-w-[400px]">{row.message}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold">
                            <FiHash size={10} />
                            {row.variables_json ? (Array.isArray(row.variables_json) ? row.variables_json.length : JSON.parse(row.variables_json).length) : 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-slate-600/10">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <FiCalendar size={12} />
                            <span>{row.create_date ? new Date(row.create_date).toLocaleDateString() : '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => { setEditData(row); setShowModal(true); }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="Edit"
                            >
                              <FiEdit size={14} />
                            </button>
                            <button
                              onClick={() => changeStatus(row)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200"
                              title="Toggle Status"
                            >
                              <FiRefreshCw size={14} />
                            </button>
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
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Range & Limit */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs text-slate-600">
                  <div>
                    Showing <span className="font-semibold text-slate-800">{pagination.total === 0 ? 0 : (pagination.page_no - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-semibold text-slate-800">{Math.min(pagination.page_no * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-semibold text-slate-800">{pagination.total}</span> templates
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
                      onClick={() => fetchTemplates(1, pagination.limit)}
                      disabled={pagination.page_no <= 1 || loading}
                      className="p-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      title="First Page"
                    >
                      <FiChevronsLeft size={14} />
                    </button>
                    <button
                      onClick={() => fetchTemplates(pagination.page_no - 1, pagination.limit)}
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
                      onClick={() => fetchTemplates(pagination.page_no + 1, pagination.limit)}
                      disabled={pagination.page_no >= pagination.total_pages || loading}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span>Next</span>
                      <FiChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => fetchTemplates(pagination.total_pages, pagination.limit)}
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
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <SmsTemplateFormModal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        editData={editData} 
        onSuccess={() => fetchTemplates(pagination.page_no, pagination.limit)} 
      />
    </div>
  );
};

export default SmsTemplateList;
