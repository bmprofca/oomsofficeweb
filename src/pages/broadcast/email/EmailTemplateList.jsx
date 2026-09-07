// EmailTemplateList.js (Professional UI with compact design - no horizontal scroll)

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Mail, FileText, Search, Plus, Edit, Eye, RefreshCw, CheckCircle, Calendar, Hash, CreditCard, Bell, Gift, Smile, BarChart2, FilePlus, Check } from 'react-feather';
import TablePagination from '../../../components/TablePagination';
import { FiLock, FiXCircle } from 'react-icons/fi';
import { Header, Sidebar } from '../../../components/header';
import EmailTemplateFormModal from '../../../components/Modals/EmailTemplateFormModal';
import StaticTemplateFormModal from '../../../components/Modals/StaticTemplateFormModal';
import EmailActionMenu from './EmailActionMenu';
import { emailApi, normalizeList, normalizePagination } from './emailApi';
import { formatEmailTemplateType, CAMPAIGN_TYPE_META, STATIC_TYPE_META } from './emailTemplateTypes';
import { useUserPermissions } from '../../../utils/permission-helper';
import CustomSelect from '../../../components/CustomSelect';
import { optionByValue } from '../../../utils/customSelectHelpers';

const ICON_BY_KEY = {
  mail: Mail,
  smile: Smile,
  gift: Gift,
  chart: BarChart2,
  invoice: FileText,
  bell: Bell,
  plus: FilePlus,
  card: CreditCard,
  receive: CreditCard,
  check: Check,
  file: FileText,
};

const TemplateTypeIcon = ({ typeKey, className = 'w-3.5 h-3.5' }) => {
  const Icon = ICON_BY_KEY[typeKey] || Mail;
  return <Icon className={className} />;
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const SkeletonCell = () => <div className="h-3 rounded bg-slate-200 animate-pulse" />;

const EmailTemplateTableSkeleton = ({ cols = 6 }) => (
  <table className="w-full">
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        {Array.from({ length: cols }).map((_, i) => (
          <th key={i} className="px-4 py-3 text-left">
            <div className="h-2.5 w-16 rounded bg-slate-200 animate-pulse" />
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3"><SkeletonCell /></td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const EmailTemplateList = () => {
  const { check } = useUserPermissions();
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
  const [showStaticModal, setShowStaticModal] = useState(false);
  const [staticEditData, setStaticEditData] = useState(null);

  // Fetch Email Templates
  const fetchTemplates = async (page = 1, limit = pagination.limit) => {
    setLoading(true);
    try {
      const params = {
        page_no: page,
        limit,
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

  const fetchStaticTemplates = async () => {
    setStaticLoading(true);
    try {
      const res = await emailApi.listStaticTemplates();
      setStaticRows(normalizeList(res?.data));
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

  const changeStaticStatus = async (row) => {
    try {
      const next = row.status === 'active' ? 'inactive' : 'active';
      await emailApi.changeStaticTemplateStatus({ template_id: row.template_id, status: next });
      toast.success(next === 'active'
        ? 'This notification type is now active'
        : 'This notification type is now inactive');
      fetchStaticTemplates();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to change status');
    }
  };

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const isActive = status === 'active';
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
        isActive
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-600'
      }`}>
        {isActive ? <CheckCircle size={12} /> : <FiXCircle className="w-3 h-3" />}
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  if (!check('broadcast_config_edit')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
        <div className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
          <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiLock className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Access Denied</h3>
            <p className="text-slate-500 text-sm">You do not have permission to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      
      <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Email Templates
                </h1>
                <p className="text-slate-500 mt-1 text-sm">
                  Campaign templates for broadcasts, and seven static notification templates you customize and activate
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
                      <div className="w-40">
                        <CustomSelect
                          options={STATUS_FILTER_OPTIONS}
                          value={optionByValue(STATUS_FILTER_OPTIONS, statusFilter) || STATUS_FILTER_OPTIONS[0]}
                          onChange={(opt) => setStatusFilter(opt?.value || '')}
                          isClearable={false}
                          isSearchable={false}
                          placeholder="Status"
                        />
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
                    <EmailTemplateTableSkeleton cols={7} />
                  ) : (
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">#</th>
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
                            <td colSpan={7} className="px-4 py-16 text-center">
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
                          rows.map((row, index) => (
                            <tr key={row.template_id} className="hover:bg-slate-50 transition-colors duration-150">
                              <td className="px-4 py-3 text-xs tabular-nums text-slate-500">
                                {((pagination.page_no - 1) * pagination.limit) + index + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${row.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <TemplateTypeIcon typeKey={CAMPAIGN_TYPE_META[row.template_type]?.icon} />
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-gray-800">{row.template_name}</span>
                                    <p className="text-xs text-gray-500">{CAMPAIGN_TYPE_META[row.template_type]?.label || formatEmailTemplateType(row.template_type) || 'General'}</p>
                                  </div>
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
                              <td className="px-4 py-3 text-center">
                                <EmailActionMenu
                                  items={[
                                    { label: 'Edit', icon: Edit, onClick: () => { setEditData(row); setShowModal(true); } },
                                    { label: 'Preview', icon: Eye, onClick: () => preview(row) },
                                    { label: 'Toggle Status', icon: RefreshCw, warning: true, onClick: () => changeStatus(row) },
                                  ]}
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {rows.length > 0 && (
                  <TablePagination
                    page={pagination.page_no}
                    limit={pagination.limit}
                    total={pagination.total}
                    totalPages={pagination.total_pages}
                    rowOptions={[10, 20, 50, 100]}
                    defaultRows={10}
                    onPageChange={(page) => fetchTemplates(page)}
                    onLimitChange={(limit) => {
                      setPagination((p) => ({ ...p, limit, page_no: 1 }));
                      fetchTemplates(1, Number(limit));
                    }}
                  />
                )}
              </div>
            )}

            {activeTab === 'static-templates' && (
              <div>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-sm text-slate-600">
                    These seven notification types are predefined. Customize the subject and body, then activate a type so it is used when email is selected on the send notification modal.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  {staticLoading ? (
                    <EmailTemplateTableSkeleton cols={6} />
                  ) : (
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Subject</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">Variables</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Status</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staticRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-16 text-center">
                              <div className="flex flex-col items-center">
                                <div className="p-3 bg-slate-100 rounded-full mb-3">
                                  <FileText size={32} className="text-slate-400" />
                                </div>
                                <p className="text-slate-500 font-medium">Static templates will appear after the first load</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          staticRows.map((row, index) => (
                            <tr key={row.template_id} className="hover:bg-slate-50 transition-colors duration-150">
                              <td className="px-4 py-3 text-xs tabular-nums text-slate-500">{index + 1}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                  row.status === 'active' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  <TemplateTypeIcon typeKey={STATIC_TYPE_META[formatEmailTemplateType(row.template_type)]?.icon} className="w-3 h-3" />
                                  {formatEmailTemplateType(row.template_type)}
                                </span>
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
                                <EmailActionMenu
                                  items={[
                                    { label: 'Edit', icon: Edit, onClick: () => { setStaticEditData(row); setShowStaticModal(true); } },
                                    { label: row.status === 'active' ? 'Deactivate' : 'Activate', icon: CheckCircle, onClick: () => changeStaticStatus(row) },
                                  ]}
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
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
        onSuccess={() => fetchStaticTemplates()} 
      />
    </div>
  );
};

export default EmailTemplateList;