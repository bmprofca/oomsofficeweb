// EmailTemplateList.js (Professional UI with compact design - no horizontal scroll)

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Mail, FileText, Search, Plus, Edit, Eye, RefreshCw, Trash2, CheckCircle, XCircle, Filter, ChevronLeft, ChevronRight, Calendar, Hash, Type, CreditCard } from 'react-feather';
import { FiHome, FiChevronRight as FiChevronRightIcon, FiSend } from 'react-icons/fi';
import { Header, Sidebar } from '../../../components/header';
import EmailTemplateFormModal from './EmailTemplateFormModal';
import StaticTemplateFormModal from './StaticTemplateFormModal';
import { emailApi, normalizeList, normalizePagination } from './emailApi';

const EmailTemplateList = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [activeTab, setActiveTab] = useState('email-templates');
  
  // Email Templates State
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Static Templates State
  const [staticLoading, setStaticLoading] = useState(false);
  const [staticRows, setStaticRows] = useState([]);
  const [staticPagination, setStaticPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [showStaticModal, setShowStaticModal] = useState(false);
  const [staticEditData, setStaticEditData] = useState(null);
  const [staticSearch, setStaticSearch] = useState('');
  const [templateTypeFilter, setTemplateTypeFilter] = useState('');
  const [templateTypes, setTemplateTypes] = useState([]);

  // Fetch Email Templates
  const fetchTemplates = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page_no: page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      };
      const res = await emailApi.listTemplates(params);
      setRows(normalizeList(res?.data));
      setPagination(normalizePagination(res?.pagination));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Static Templates
  const fetchStaticTemplates = async (page = 1) => {
    setStaticLoading(true);
    try {
      const params = { 
        page_no: page, 
        limit: staticPagination.limit,
        ...(staticSearch && { search: staticSearch }),
        ...(templateTypeFilter && { template_type: templateTypeFilter })
      };
      const res = await emailApi.listStaticTemplates(params);
      const data = normalizeList(res?.data);
      setStaticRows(data);
      setStaticPagination(normalizePagination(res?.pagination));
      
      const types = [...new Set(data.map(item => item.template_type))];
      setTemplateTypes(types);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to load static templates');
    } finally {
      setStaticLoading(false);
    }
  };

  useEffect(() => { 
    if (activeTab === 'email-templates') {
      fetchTemplates(); 
    } else {
      fetchStaticTemplates();
    }
  }, [activeTab, searchTerm, statusFilter]);
  
  useEffect(() => { 
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); 
  }, [isMinimized]);

  // Email Template Actions
  const changeStatus = async (row) => {
    try {
      await emailApi.changeTemplateStatus({ 
        template_id: row.template_id, 
        status: row.status === 'active' ? 'inactive' : 'active' 
      });
      toast.success('Template status updated');
      fetchTemplates(pagination.page_no);
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'Failed to change status'); 
    }
  };

  const preview = async (row) => {
    try {
      const res = await emailApi.previewTemplate({
        subject: row.subject,
        html_body: row.html_body || '',
        text_body: row.text_body || '',
        variables: {},
      });
      toast.success('Preview generated');
      console.log('Template preview', res);
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'Preview failed'); 
    }
  };

  // Static Template Actions
  const deleteStaticTemplate = async (row) => {
    if (!window.confirm(`Delete template "${row.template_name}"?`)) return;
    try {
      await emailApi.deleteStaticTemplate({ template_id: row.template_id });
      toast.success('Static template deleted successfully');
      fetchStaticTemplates(staticPagination.page_no);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete template');
    }
  };

  const setDefaultStaticTemplate = async (row) => {
    try {
      await emailApi.setDefaultStaticTemplate({ template_id: row.template_id });
      toast.success('Default template set successfully');
      fetchStaticTemplates(staticPagination.page_no);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to set default template');
    }
  };

  const handleStaticSearch = () => {
    fetchStaticTemplates(1);
  };

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        status === 'active' 
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' 
          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-600/10'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      
      <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="p-4 md:p-6 lg:p-8">
          {/* Breadcrumbs */}
          <div className="mb-4">
            <nav className="flex items-center text-sm text-gray-600">
              <Link to="/" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                <FiHome className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <FiChevronRightIcon className="w-4 h-4 mx-2 text-gray-400" />
              <Link to="/broadcast/email-channel" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                <FiSend className="w-4 h-4" />
                <span>Broadcast</span>
              </Link>
              <FiChevronRightIcon className="w-4 h-4 mx-2 text-gray-400" />
              <span className="text-gray-900 font-medium">Templates</span>
            </nav>
          </div>

          {/* Header Section */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Email Templates
                </h1>
                <p className="text-slate-500 mt-1 text-sm">
                  Manage your email templates and static templates for automated communications
                </p>
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <nav className="flex gap-1 px-6" aria-label="Tabs">
                {[
                  { id: 'email-templates', name: 'Email Templates', icon: Mail },
                  { id: 'static-templates', name: 'Static Templates', icon: FileText }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        relative py-3.5 px-4 font-medium text-sm transition-all duration-200 inline-flex items-center gap-2
                        ${activeTab === tab.id 
                          ? 'text-blue-600' 
                          : 'text-slate-500 hover:text-slate-700'
                        }
                      `}
                    >
                      <Icon size={16} />
                      {tab.name}
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Email Templates Tab */}
            {activeTab === 'email-templates' && (
              <div>
                {/* Filters Bar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex flex-wrap gap-3">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search templates..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-64 pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                        />
                      </div>
                      <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
                        >
                          <option value="">All Status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={() => { setEditData(null); setShowModal(true); }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <Plus size={16} />
                      Add Template
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      <p className="mt-3 text-sm text-slate-500">Loading templates...</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Template Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Subject</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Variables</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Created</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-16 text-center">
                              <div className="flex flex-col items-center">
                                <div className="p-3 bg-slate-100 rounded-full mb-3">
                                  <Mail size={32} className="text-slate-400" />
                                </div>
                                <p className="text-slate-500 font-medium">No templates found</p>
                                <p className="text-slate-400 text-sm mt-1">Create your first email template</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          rows.map((row) => (
                            <tr key={row.template_id} className="hover:bg-slate-50 transition-colors duration-150">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-blue-50 rounded-lg">
                                    <Mail size={14} className="text-blue-600" />
                                  </div>
                                  <span className="text-sm font-medium text-slate-900">{row.template_name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-slate-600 line-clamp-1">{row.subject}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium">
                                  <Hash size={10} />
                                  {Object.keys(row.variables_json || {}).length}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <Calendar size={12} />
                                  <span>{row.create_date ? new Date(row.create_date).toLocaleDateString() : '-'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => { setEditData(row); setShowModal(true); }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                    title="Edit"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => preview(row)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200"
                                    title="Preview"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    onClick={() => changeStatus(row)}
                                    className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200"
                                    title="Toggle Status"
                                  >
                                    <RefreshCw size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {rows.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-slate-600">
                      Showing <span className="font-semibold text-slate-800">{((pagination.page_no - 1) * pagination.limit) + 1}</span> to{' '}
                      <span className="font-semibold text-slate-800">{Math.min(pagination.page_no * pagination.limit, pagination.total)}</span> of{' '}
                      <span className="font-semibold text-slate-800">{pagination.total}</span> templates
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchTemplates(pagination.page_no - 1)}
                        disabled={pagination.page_no <= 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft size={14} />
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-600">Page</span>
                        <span className="text-xs font-semibold text-slate-800 bg-white px-2 py-1 rounded border border-slate-300">
                          {pagination.page_no}
                        </span>
                        <span className="text-xs text-slate-600">of {pagination.total_pages}</span>
                      </div>
                      <button
                        onClick={() => fetchTemplates(pagination.page_no + 1)}
                        disabled={pagination.page_no >= pagination.total_pages}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Static Templates Tab */}
            {activeTab === 'static-templates' && (
              <div>
                {/* Filters Bar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex flex-wrap gap-3">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search templates..."
                          value={staticSearch}
                          onChange={(e) => setStaticSearch(e.target.value)}
                          className="w-64 pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                        />
                      </div>
                      {templateTypes.length > 0 && (
                        <div className="relative">
                          <Type size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select
                            value={templateTypeFilter}
                            onChange={(e) => setTemplateTypeFilter(e.target.value)}
                            className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
                          >
                            <option value="">All Types</option>
                            {templateTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button
                        onClick={handleStaticSearch}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm"
                      >
                        Search
                      </button>
                      {(staticSearch || templateTypeFilter) && (
                        <button
                          onClick={() => { setStaticSearch(''); setTemplateTypeFilter(''); fetchStaticTemplates(1); }}
                          className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 transition-all duration-200"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {/* Add button commented out as per original */}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  {staticLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      <p className="mt-3 text-sm text-slate-500">Loading static templates...</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Template Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Subject</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">Variables</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Status</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Default</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Created</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staticRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-16 text-center">
                              <div className="flex flex-col items-center">
                                <div className="p-3 bg-slate-100 rounded-full mb-3">
                                  <FileText size={32} className="text-slate-400" />
                                </div>
                                <p className="text-slate-500 font-medium">No static templates found</p>
                                <p className="text-slate-400 text-sm mt-1">Static templates will appear here</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          staticRows.map((row) => (
                            <tr key={row.template_id} className="hover:bg-slate-50 transition-colors duration-150">
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700">
                                  <CreditCard size={12} />
                                  {row.template_type?.substring(0, 15)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-purple-50 rounded-lg">
                                    <FileText size={14} className="text-purple-600" />
                                  </div>
                                  <span className="text-sm font-medium text-slate-900">{row.template_name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-slate-600 line-clamp-1">{row.subject}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium">
                                  <Hash size={10} />
                                  {row.total_variables || row.variables_json?.length || 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-4 py-3 text-center">
                                {row.is_default === 1 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700">
                                    <CheckCircle size={12} />
                                    Default
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setDefaultStaticTemplate(row)}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    Set Default
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <Calendar size={12} />
                                  <span>{row.create_date ? new Date(row.create_date).toLocaleDateString() : '-'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => { setStaticEditData(row); setShowStaticModal(true); }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                    title="Edit"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  {/* Delete button commented out as per original */}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {staticRows.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-slate-600">
                      Showing <span className="font-semibold text-slate-800">{((staticPagination.page_no - 1) * staticPagination.limit) + 1}</span> to{' '}
                      <span className="font-semibold text-slate-800">{Math.min(staticPagination.page_no * staticPagination.limit, staticPagination.total)}</span> of{' '}
                      <span className="font-semibold text-slate-800">{staticPagination.total}</span> templates
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchStaticTemplates(staticPagination.page_no - 1)}
                        disabled={staticPagination.page_no <= 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft size={14} />
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-600">Page</span>
                        <span className="text-xs font-semibold text-slate-800 bg-white px-2 py-1 rounded border border-slate-300">
                          {staticPagination.page_no}
                        </span>
                        <span className="text-xs text-slate-600">of {staticPagination.total_pages}</span>
                      </div>
                      <button
                        onClick={() => fetchStaticTemplates(staticPagination.page_no + 1)}
                        disabled={staticPagination.page_no >= staticPagination.total_pages}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <EmailTemplateFormModal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        editData={editData} 
        onSuccess={() => fetchTemplates(pagination.page_no)} 
      />
      
      <StaticTemplateFormModal 
        show={showStaticModal} 
        onHide={() => setShowStaticModal(false)} 
        editData={staticEditData} 
        onSuccess={() => fetchStaticTemplates(staticPagination.page_no)} 
      />
    </div>
  );
};

export default EmailTemplateList;