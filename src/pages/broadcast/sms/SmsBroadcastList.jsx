import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import { smsApi, normalizeList, normalizePagination } from './smsApi';
import { 
  FiPlus, 
  FiMenu, 
  FiEye, 
  FiPause, 
  FiPlay, 
  FiX, 
  FiRefreshCw, 
  FiChevronLeft, 
  FiChevronRight,
  FiSend,
  FiCalendar,
  FiLayers,
  FiDatabase,
  FiInfo
} from 'react-icons/fi';

const SmsBroadcastList = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [openMenuId, setOpenMenuId] = useState(null);

  const fetchData = async (page = pagination.page_no) => {
    setLoading(true);
    try {
      const res = await smsApi.listBroadcasts({ page_no: page, limit: pagination.limit });
      setRows(normalizeList(res?.data));
      setPagination(normalizePagination(res?.pagination));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to load campaigns list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(1); }, []);
  useEffect(() => { localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); }, [isMinimized]);

  // Handle action menu control triggers (Pause, Resume, Cancel)
  const handleCampaignAction = async (campaignId, actionType) => {
    const payload = { broadcast_id: campaignId };
    try {
      if (actionType === 'pause') {
        await smsApi.pauseBroadcast(payload);
        toast.success('Campaign paused successfully');
      } else if (actionType === 'resume') {
        await smsApi.resumeBroadcast(payload);
        toast.success('Campaign resumed successfully');
      } else if (actionType === 'cancel') {
        if (window.confirm('Are you sure you want to cancel this campaign?')) {
          await smsApi.cancelBroadcast(payload);
          toast.success('Campaign cancelled successfully');
        } else {
          return;
        }
      }
      fetchData();
      setOpenMenuId(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to ${actionType} campaign`);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

      <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="p-4 md:p-6 lg:p-8">
          
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                SMS Campaigns
              </h1>
              <p className="text-slate-500 mt-1 text-sm">
                Create, monitor, and manage your text broadcast campaigns
              </p>
            </div>
            <button
              onClick={() => navigate('/broadcast/sms/create')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-sm"
            >
              <FiPlus className="w-4 h-4" />
              Launch New Broadcast
            </button>
          </div>

          {/* Main Card grid */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiLayers className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-800">Broadcast Campaigns</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Campaign history and background dispatcher status</p>
                </div>
              </div>
              <button
                onClick={() => fetchData()}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center"
                title="Refresh campaigns list"
              >
                <FiRefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-slate-500 font-medium">Loading campaigns list...</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="p-4 bg-slate-100 rounded-full mb-4">
                    <FiDatabase className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-600 text-center font-medium">No SMS broadcasts launched yet</p>
                  <p className="text-slate-400 text-sm text-center mt-1">Get started by creating your very first campaign campaign.</p>
                  <button
                    onClick={() => navigate('/broadcast/sms/create')}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-lg transition-all text-sm"
                  >
                    <FiPlus className="w-4 h-4" />
                    Launch Broadcast
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Campaign Name</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Template Message</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Delivery Stats</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date Sent</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((row) => (
                          <tr key={row.broadcast_id} className="hover:bg-slate-50/50 transition-colors">
                            
                            {/* Campaign Name */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 rounded-lg">
                                  <FiSend className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-slate-900 block">{row.broadcast_name}</span>
                                  <span className="text-[10px] font-mono text-slate-400">ID: {row.broadcast_id}</span>
                                </div>
                              </div>
                            </td>

                            {/* Template Message Snippet */}
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-600 font-mono line-clamp-1 truncate max-w-[280px]" title={row.message_snapshot}>
                                {row.message_snapshot}
                              </span>
                            </td>

                            {/* Status badge */}
                            <td className="px-6 py-4 text-center">
                              {row.status === 'completed' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-600/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                  Completed
                                </span>
                              )}
                              {row.status === 'processing' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                                  Processing
                                </span>
                              )}
                              {row.status === 'scheduled' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-600/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  Scheduled
                                </span>
                              )}
                              {row.status === 'paused' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 ring-1 ring-slate-600/10">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                  Paused
                                </span>
                              )}
                              {row.status === 'cancelled' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-600/10">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                  Cancelled
                                </span>
                              )}
                              {['failed', 'partially_failed'].includes(row.status) && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-600/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                  Failed
                                </span>
                              )}
                            </td>

                            {/* Delivery Stats Bar representation */}
                            <td className="px-6 py-4">
                              <div className="w-[120px] mx-auto space-y-1">
                                <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                                  <span>{row.total_sent} sent</span>
                                  <span>{row.total_recipients} total</span>
                                </div>
                                {/* Stacked progress bar */}
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                  <div style={{ width: `${(row.total_sent / row.total_recipients) * 100}%` }} className="bg-emerald-500 h-full"></div>
                                  <div style={{ width: `${(row.total_failed / row.total_recipients) * 100}%` }} className="bg-red-500 h-full"></div>
                                  <div style={{ width: `${(row.total_skipped / row.total_recipients) * 100}%` }} className="bg-slate-300 h-full"></div>
                                </div>
                              </div>
                            </td>

                            {/* Creation/Trigger Date */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <FiCalendar size={12} />
                                <span>
                                  {row.started_at 
                                    ? new Date(row.started_at).toLocaleDateString() 
                                    : (row.create_date ? new Date(row.create_date).toLocaleDateString() : '-')}
                                </span>
                              </div>
                            </td>

                            {/* Action popover menu */}
                            <td className="px-6 py-4 text-center">
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === row.broadcast_id ? null : row.broadcast_id);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center justify-center"
                                >
                                  <FiMenu className="w-4 h-4 text-slate-600" />
                                </button>

                                {openMenuId === row.broadcast_id && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-[999]">
                                    <div className="py-1">
                                      <button
                                        onClick={() => navigate(`/broadcast/sms/details/${row.broadcast_id}`)}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                      >
                                        <FiEye className="w-4 h-4" />
                                        View Details
                                      </button>
                                      {row.status === 'processing' && (
                                        <button
                                          onClick={() => handleCampaignAction(row.broadcast_id, 'pause')}
                                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                        >
                                          <FiPause className="w-4 h-4" />
                                          Pause Campaign
                                        </button>
                                      )}
                                      {row.status === 'paused' && (
                                        <button
                                          onClick={() => handleCampaignAction(row.broadcast_id, 'resume')}
                                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
                                        >
                                          <FiPlay className="w-4 h-4" />
                                          Resume Campaign
                                        </button>
                                      )}
                                      {['scheduled', 'processing', 'paused'].includes(row.status) && (
                                        <button
                                          onClick={() => handleCampaignAction(row.broadcast_id, 'cancel')}
                                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                                        >
                                          <FiX className="w-4 h-4 text-red-500" />
                                          Cancel Campaign
                                        </button>
                                      )}
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
                  <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-slate-600">
                      Showing <span className="font-semibold text-slate-800">{rows.length}</span> of{' '}
                      <span className="font-semibold text-slate-800">{pagination.total}</span> campaigns
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchData(pagination.page_no - 1)}
                        disabled={pagination.page_no <= 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <FiChevronLeft size={14} />
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-600">Page</span>
                        <span className="text-xs font-semibold text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-300">
                          {pagination.page_no}
                        </span>
                        <span className="text-xs text-slate-600">of {pagination.total_pages}</span>
                      </div>
                      <button
                        onClick={() => fetchData(pagination.page_no + 1)}
                        disabled={pagination.page_no >= pagination.total_pages}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                        <FiChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SmsBroadcastList;
