// EmailTemplateList.js (Professional UI with compact design - no horizontal scroll)

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Mail, FileText, Search, Plus, Edit, Eye, RefreshCw, Trash2, CheckCircle, XCircle } from 'react-feather';
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
    const variants = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle }
    };
    const variant = variants[status] || variants.inactive;
    const Icon = variant.icon;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variant.bg} ${variant.text}`}>
        <Icon size={10} className="mr-1" />
        {status}
      </span>
    );
  };

  // Compact Table Header Component
  const CompactTableHeader = ({ children, className = "" }) => (
    <th className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 ${className}`}>
      {children}
    </th>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      
      <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="px-4 py-4">
          {/* Header Section */}
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Email Templates</h1>
            <p className="text-sm text-gray-600 mt-0.5">Manage your email templates and static templates</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-6 px-4" aria-label="Tabs">
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
                        py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 inline-flex items-center
                        ${activeTab === tab.id 
                          ? 'border-blue-500 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <Icon size={16} className="mr-1.5" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Email Templates Tab */}
            {activeTab === 'email-templates' && (
              <div>
                {/* Filters Bar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search templates..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-64 pl-8 pr-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <button
                      onClick={() => { setEditData(null); setShowModal(true); }}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                    >
                      <Plus size={14} className="mr-1.5" />
                      Add Template
                    </button>
                  </div>
                </div>

                {/* Table - No horizontal scroll */}
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <CompactTableHeader>Template Name</CompactTableHeader>
                          <CompactTableHeader>Subject</CompactTableHeader>
                          <CompactTableHeader className="w-20">Variables</CompactTableHeader>
                          <CompactTableHeader className="w-24">Status</CompactTableHeader>
                          <CompactTableHeader className="w-28">Created</CompactTableHeader>
                          <CompactTableHeader className="w-28">Actions</CompactTableHeader>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                              <Mail size={40} className="mx-auto text-gray-400 mb-2" />
                              <p className="text-sm">No templates found</p>
                            </td>
                          </tr>
                        ) : (
                          rows.map((row) => (
                            <tr key={row.template_id} className="hover:bg-gray-50 transition-colors duration-150">
                              <td className="px-3 py-2">
                                <div className="font-medium text-gray-900 text-sm">{row.template_name}</div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600 truncate max-w-xs">{row.subject}</td>
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-medium">
                                  {Object.keys(row.variables_json || {}).length}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-500">
                                {row.create_date ? new Date(row.create_date).toLocaleDateString() : '-'}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex space-x-1.5">
                                  <button
                                    onClick={() => { setEditData(row); setShowModal(true); }}
                                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => preview(row)}
                                    className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                                    title="Preview"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    onClick={() => changeStatus(row)}
                                    className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
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
                  <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                    <div className="text-xs text-gray-700">
                      Showing {((pagination.page_no - 1) * pagination.limit) + 1} to {Math.min(pagination.page_no * pagination.limit, pagination.total)} of {pagination.total}
                    </div>
                    <div className="flex space-x-1.5">
                      <button
                        onClick={() => fetchTemplates(pagination.page_no - 1)}
                        disabled={pagination.page_no <= 1}
                        className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => fetchTemplates(pagination.page_no + 1)}
                        disabled={pagination.page_no >= pagination.total_pages}
                        className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Static Templates Tab - Compact Design */}
            {activeTab === 'static-templates' && (
              <div>
                {/* Filters Bar */}
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search..."
                          value={staticSearch}
                          onChange={(e) => setStaticSearch(e.target.value)}
                          className="w-56 pl-7 pr-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                        />
                        <Search size={12} className="absolute left-2 top-1.5 text-gray-400" />
                      </div>
                      {templateTypes.length > 0 && (
                        <select
                          value={templateTypeFilter}
                          onChange={(e) => setTemplateTypeFilter(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">All Types</option>
                          {templateTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={handleStaticSearch}
                        className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
                      >
                        Search
                      </button>
                      {(staticSearch || templateTypeFilter) && (
                        <button
                          onClick={() => { setStaticSearch(''); setTemplateTypeFilter(''); fetchStaticTemplates(1); }}
                          className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {/* <button
                      onClick={() => { setStaticEditData(null); setShowStaticModal(true); }}
                      className="inline-flex items-center px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
                    >
                      <Plus size={12} className="mr-1" />
                      Add
                    </button> */}
                  </div>
                </div>

                {/* Compact Table - No horizontal scroll */}
                <div className="overflow-x-auto">
                  {staticLoading ? (
                    <div className="flex justify-center items-center py-10">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <table className="w-full table-auto divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <CompactTableHeader className="w-24">Type</CompactTableHeader>
                          <CompactTableHeader>Name</CompactTableHeader>
                          <CompactTableHeader>Subject</CompactTableHeader>
                          <CompactTableHeader className="w-16">Vars</CompactTableHeader>
                          <CompactTableHeader className="w-20">Status</CompactTableHeader>
                          <CompactTableHeader className="w-20">Default</CompactTableHeader>
                          <CompactTableHeader className="w-24">Created</CompactTableHeader>
                          <CompactTableHeader className="w-16">Actions</CompactTableHeader>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {staticRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                              <FileText size={32} className="mx-auto text-gray-400 mb-2" />
                              <p className="text-sm">No static templates found</p>
                            </td>
                          </tr>
                        ) : (
                          staticRows.map((row) => (
                            <tr key={row.template_id} className="hover:bg-gray-50 transition-colors duration-150">
                              <td className="px-2 py-1.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {row.template_type?.substring(0, 12)}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="font-medium text-gray-900 text-xs">{row.template_name}</div>
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 truncate max-w-[150px]">{row.subject}</td>
                              <td className="px-2 py-1.5 text-center">
                                <span className="inline-flex items-center px-1 py-0.5 rounded bg-purple-50 text-purple-700 text-xs">
                                  {row.total_variables || row.variables_json?.length || 0}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-2 py-1.5">
                                {row.is_default === 1 ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle size={10} className="mr-0.5" />
                                    Default
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setDefaultStaticTemplate(row)}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    Set
                                  </button>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-500">
                                {row.create_date ? new Date(row.create_date).toLocaleDateString() : '-'}
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => { setStaticEditData(row); setShowStaticModal(true); }}
                                    className="p-0.5 text-blue-600 hover:text-blue-800"
                                    title="Edit"
                                  >
                                    <Edit size={12} />
                                  </button>
                                  {/* <button
                                    onClick={() => deleteStaticTemplate(row)}
                                    className="p-0.5 text-red-600 hover:text-red-800"
                                    title="Delete"
                                  >
                                    <Trash2 size={12} />
                                  </button> */}
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
                  <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                    <div className="text-xs text-gray-700">
                      {((staticPagination.page_no - 1) * staticPagination.limit) + 1} - {Math.min(staticPagination.page_no * staticPagination.limit, staticPagination.total)} of {staticPagination.total}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => fetchStaticTemplates(staticPagination.page_no - 1)}
                        disabled={staticPagination.page_no <= 1}
                        className="px-2 py-0.5 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => fetchStaticTemplates(staticPagination.page_no + 1)}
                        disabled={staticPagination.page_no >= staticPagination.total_pages}
                        className="px-2 py-0.5 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
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