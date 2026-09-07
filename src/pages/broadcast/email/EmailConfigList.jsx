import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import EmailConfigFormModal from '../../../components/Modals/EmailConfigFormModal';
import EmailActionMenu from './EmailActionMenu';
import { emailApi, normalizeList, normalizePagination } from './emailApi';
import TablePagination from '../../../components/TablePagination';
import { 
  FiPlus, 
  FiEdit, 
  FiMail, 
  FiPower, 
  FiDatabase,
  FiCalendar,
  FiAtSign,
  FiLock,
  FiTrash2
} from 'react-icons/fi';
import { useUserPermissions } from '../../../utils/permission-helper';
import ConfirmActionModal from '../../../components/ConfirmActionModal';

const ConfigTableSkeleton = () => (
  <>
    <div className="block lg:hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-b border-slate-200 p-4 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="h-8 w-8 rounded-lg bg-slate-200" />
              <div className="space-y-2">
                <div className="h-3 w-32 rounded bg-slate-200" />
                <div className="h-2.5 w-24 rounded bg-slate-100" />
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-8 rounded bg-slate-100" />
            <div className="h-8 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {['#', 'Name', 'Host', 'Port', 'From Email', 'Status', 'Create Date', 'Actions'].map((h) => (
              <th key={h} className="p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              {Array.from({ length: 8 }).map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <div className="h-3 rounded bg-slate-200" style={{ width: c === 0 ? 140 : 72 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

const EmailConfigList = () => {
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async (page = pagination.page_no, limit = pagination.limit) => {
    setLoading(true);
    try {
      const res = await emailApi.listConfigs({ page_no: page, limit });
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
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'Failed to update status'); 
    }
  };

  const testSmtp = async (row) => {
    if (testingId) return;
    setTestingId(row.config_id);
    const toastId = toast.loading('Testing SMTP connection…');
    try {
      await emailApi.testConfig({
        host: row.host,
        port: Number(row.port),
        secure: Number(row.secure) ? 1 : 0,
        username: row.username || row.smtp_username,
        password: row.password,
      });
      toast.success('SMTP connection test successful', { id: toastId });
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'SMTP test failed', { id: toastId });
    } finally {
      setTestingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.config_id) return;
    setDeleting(true);
    try {
      await emailApi.deleteConfig({ config_id: deleteTarget.config_id });
      toast.success('SMTP config deleted');
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete SMTP config');
    } finally {
      setDeleting(false);
    }
  };

  const configMenuItems = (row) => [
    { label: 'Edit', icon: FiEdit, onClick: () => { setEditData(row); setShowModal(true); } },
    {
      label: testingId === row.config_id ? 'Testing…' : 'Test SMTP',
      icon: FiMail,
      disabled: Boolean(testingId),
      onClick: () => testSmtp(row),
    },
    { label: row.status === 'active' ? 'Deactivate' : 'Activate', icon: FiPower, warning: true, onClick: () => updateStatus(row) },
    { label: 'Delete', icon: FiTrash2, danger: true, onClick: () => setDeleteTarget(row) },
  ];

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
    <div className="min-h-screen bg-gray-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      
      <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-base md:text-lg font-bold text-gray-800">SMTP Configuration</h1>
                  <p className="text-xs text-gray-500 mt-0.5">The active config is used for all branch emails</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditData(null); setShowModal(true); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
                >
                  <FiPlus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-0">
              {loading ? (
                <ConfigTableSkeleton />
              ) : (
                <>
                  {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <FiDatabase className="w-7 h-7 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium text-sm">No SMTP configs found</p>
                      <p className="text-gray-400 text-xs mt-1">Add your first configuration to start sending</p>
                      <button
                        type="button"
                        onClick={() => { setEditData(null); setShowModal(true); }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
                      >
                        <FiPlus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Responsive Grid View for Mobile, Table View for Desktop */}
                      <div className="block lg:hidden">
                        {rows.map((row, index) => (
                          <div key={row.config_id} className="border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-xs tabular-nums text-slate-400 w-5">
                                  {((pagination.page_no - 1) * pagination.limit) + index + 1}
                                </span>
                                <div className="p-1.5 bg-blue-50 rounded-lg">
                                  <FiMail className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900 text-sm">{row.config_name}</h3>
                                  <p className="text-xs text-slate-500 font-mono">{row.host}:{row.port}</p>
                                </div>
                              </div>
                              <EmailActionMenu items={configMenuItems(row)} />
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
                              <th className="p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide w-12">#</th>
                              <th className="p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">Name</th>
                              <th className="p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">Host</th>
                              <th className="p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">Port</th>
                              <th className="p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">From Email</th>
                              <th className="p-3 text-center text-[11px] font-bold text-gray-700 uppercase tracking-wide">Status</th>
                              <th className="p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide">Create Date</th>
                              <th className="p-3 text-center text-[11px] font-bold text-gray-700 uppercase tracking-wide">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rows.map((row, index) => (
                              <tr key={row.config_id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-xs tabular-nums text-slate-500">
                                  {((pagination.page_no - 1) * pagination.limit) + index + 1}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-50 rounded-lg">
                                      <FiMail className="w-3.5 h-3.5 text-blue-600" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-900">{row.config_name}</span>
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
                                  <EmailActionMenu items={configMenuItems(row)} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <TablePagination
                        page={pagination.page_no}
                        limit={pagination.limit}
                        total={pagination.total}
                        totalPages={pagination.total_pages}
                        rowOptions={[10, 20, 50, 100]}
                        defaultRows={10}
                        onPageChange={(page) => fetchData(page)}
                        onLimitChange={(limit) => {
                          setPagination((p) => ({ ...p, limit, page_no: 1 }));
                          fetchData(1, Number(limit));
                        }}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <EmailConfigFormModal show={showModal} onHide={() => setShowModal(false)} editData={editData} onSuccess={() => fetchData()} />
      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        title="Delete SMTP"
        heading={deleteTarget?.status === 'active' ? 'Delete the active SMTP config?' : 'Delete this SMTP config?'}
        message={
          deleteTarget?.status === 'active'
            ? `${deleteTarget.config_name} is currently active. Emails will stop sending until you activate another config.`
            : `Delete "${deleteTarget?.config_name || 'this config'}"? This cannot be undone.`
        }
        confirmLabel="Delete"
        loading={deleting}
        tone="danger"
        onCancel={() => { if (!deleting) setDeleteTarget(null); }}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default EmailConfigList;