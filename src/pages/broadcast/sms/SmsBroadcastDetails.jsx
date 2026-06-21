import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import { smsApi } from './smsApi';
import { 
  FiArrowLeft,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertCircle,
  FiRefreshCw,
  FiSearch,
  FiCalendar,
  FiUser,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiCornerDownLeft,
  FiLock
} from 'react-icons/fi';
import { useUserPermissions } from '../../../utils/permission-helper';

const RecipientsTableSkeleton = ({ cols = 5, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, rIdx) => (
      <tr key={rIdx} className="animate-pulse border-b border-slate-100">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <td key={cIdx} className="px-4 py-3">
            <div className={`h-3 bg-slate-200 rounded ${
              cIdx === 0 ? 'w-2/3' :
              cIdx === 1 ? 'w-3/4 font-mono' :
              cIdx === 2 ? 'w-1/2 mx-auto' :
              cIdx === 3 ? 'w-1/4 mx-auto' :
              'w-5/6'
            }`}></div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

const SmsBroadcastDetails = () => {
  const { check } = useUserPermissions();
  const { broadcast_id } = useParams();
  const navigate = useNavigate();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState(null);
  
  // Recipients states
  const [recipients, setRecipients] = useState([]);
  const [recipientsPagination, setRecipientsPagination] = useState({ page_no: 1, limit: 15, total: 0, total_pages: 1 });
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jumpPage, setJumpPage] = useState('');
  
  const [retrying, setRetrying] = useState(false);

  // Fetch campaign summary details
  const fetchCampaignDetails = async () => {
    setLoading(true);
    try {
      const res = await smsApi.broadcastDetails(broadcast_id);
      setCampaign(res?.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to fetch campaign summary');
    } finally {
      setLoading(false);
    }
  };

  // Fetch recipients list
  const fetchRecipients = async (page = 1, limit = recipientsPagination.limit) => {
    setRecipientsLoading(true);
    try {
      const params = {
        page_no: page,
        limit: limit,
        ...(searchFilter && { search: searchFilter }),
        ...(statusFilter && { status: statusFilter })
      };
      const res = await smsApi.recipientList(broadcast_id, params);
      setRecipients(res?.data || []);
      setRecipientsPagination({
        page_no: Number(res?.pagination?.page_no || page),
        limit: Number(res?.pagination?.limit || limit),
        total: Number(res?.pagination?.total || 0),
        total_pages: Number(res?.pagination?.total_pages || 1)
      });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to fetch recipient records');
    } finally {
      setRecipientsLoading(false);
    }
  };

  const handleLimitChange = (newLimit) => {
    const val = Number(newLimit);
    setRecipientsPagination(prev => ({ ...prev, limit: val, page_no: 1 }));
    fetchRecipients(1, val);
  };

  useEffect(() => {
    fetchCampaignDetails();
  }, [broadcast_id]);

  useEffect(() => {
    fetchRecipients(1, recipientsPagination.limit);
  }, [broadcast_id, searchFilter, statusFilter]);

  const handleRetryFailed = async () => {
    if (!check('broadcast_config_edit')) {
      toast.error('You do not have permission to retry failed campaign messages.');
      return;
    }
    setRetrying(true);
    try {
      await smsApi.retryFailed({ broadcast_id });
      toast.success('Failed SMS entries reset to pending successfully!');
      fetchCampaignDetails();
      fetchRecipients(1, recipientsPagination.limit);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to queue retries');
    } finally {
      setRetrying(false);
    }
  };

  if (!check('broadcast_send') && !check('broadcast_config_edit')) {
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

  if (loading && !campaign) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-500 font-medium">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

      <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          
          {/* Header Action Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/broadcast/sms')} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                <FiArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">SMS Broadcast Dashboard</span>
                <h1 className="text-xl md:text-2xl font-black text-slate-800">{campaign?.broadcast_name || 'Campaign Details'}</h1>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => { fetchCampaignDetails(); fetchRecipients(recipientsPagination.page_no, recipientsPagination.limit); }}
                className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
                title="Refresh stats"
              >
                <FiRefreshCw className="w-4 h-4" />
              </button>
              {campaign?.total_failed > 0 && (
                <button
                  onClick={handleRetryFailed}
                  disabled={retrying}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-md transition-all text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FiRefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                  Retry Failed ({campaign?.total_failed})
                </button>
              )}
            </div>
          </div>

          {/* Stat Metrics Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FiUser className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipients</span>
                <span className="text-xl font-extrabold text-slate-800">{campaign?.total_recipients || 0}</span>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><FiClock className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
                <span className="text-xl font-extrabold text-slate-800">{campaign?.total_pending || 0}</span>
              </div>
            </div>

            {/* Sent */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><FiCheckCircle className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivered</span>
                <span className="text-xl font-extrabold text-slate-800">{campaign?.total_sent || 0}</span>
              </div>
            </div>

            {/* Failed */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl"><FiXCircle className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Failed</span>
                <span className="text-xl font-extrabold text-slate-800">{campaign?.total_failed || 0}</span>
              </div>
            </div>

            {/* Skipped */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-slate-50 text-slate-500 rounded-xl"><FiAlertCircle className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Skipped</span>
                <span className="text-xl font-extrabold text-slate-800">{campaign?.total_skipped || 0}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: Campaign specifications */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <FiActivity className="text-blue-500" />
                Campaign Specifications
              </h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="font-semibold text-blue-600 uppercase">{campaign?.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timezone</span>
                  <span className="text-slate-800">{campaign?.timezone}</span>
                </div>
                {campaign?.dlt_template_id_snapshot && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">DLT Template ID</span>
                    <span className="font-mono text-slate-800">{campaign.dlt_template_id_snapshot}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Created At</span>
                  <span className="text-slate-800">
                    {campaign?.create_date ? new Date(campaign.create_date).toLocaleString() : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Triggered At</span>
                  <span className="text-slate-800">
                    {campaign?.started_at ? new Date(campaign.started_at).toLocaleString() : 'Pending Queue'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Completed At</span>
                  <span className="text-slate-800">
                    {campaign?.completed_at ? new Date(campaign.completed_at).toLocaleString() : 'Processing / Scheduled'}
                  </span>
                </div>
              </div>

              {/* Template Body snapshot */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <FiFileText />
                  Template Message Snapshot
                </span>
                <p className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs text-slate-700 whitespace-pre-wrap">
                  {campaign?.message_snapshot}
                </p>
              </div>
            </div>

            {/* Right side: Recipient Status logs */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
              
              {/* Table header & filters */}
              <div>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Recipient Delivery Logs
                  </h3>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    {/* Local search filter */}
                    <div className="relative flex-1 sm:flex-none">
                      <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Search number/name..."
                        className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    {/* Status filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white"
                    >
                      <option value="">All status</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="sent">Delivered</option>
                      <option value="failed">Failed</option>
                      <option value="skipped">Skipped</option>
                    </select>
                  </div>
                </div>

                {/* Recipients Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-500 uppercase">Recipient</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-500 uppercase">Mobile</th>
                        <th className="px-4 py-2 text-center font-semibold text-slate-500 uppercase w-20">Status</th>
                        <th className="px-4 py-2 text-center font-semibold text-slate-500 uppercase w-12">Try</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-500 uppercase">Error/Delivery info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {recipientsLoading ? (
                        <RecipientsTableSkeleton cols={5} rows={5} />
                      ) : recipients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                            No recipient logs found matching filters
                          </td>
                        </tr>
                      ) : (
                        recipients.map(r => (
                          <tr key={r.recipient_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-700 block">{r.recipient_name}</span>
                            </td>
                            <td className="px-4 py-3 font-mono">{r.recipient_mobile}</td>
                            <td className="px-4 py-3 text-center">
                              {r.status === 'sent' && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold uppercase text-[9px]">Delivered</span>}
                              {r.status === 'pending' && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold uppercase text-[9px]">Pending</span>}
                              {r.status === 'processing' && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold uppercase text-[9px] animate-pulse">Sending</span>}
                              {r.status === 'failed' && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold uppercase text-[9px]">Failed</span>}
                              {r.status === 'skipped' && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold uppercase text-[9px]">Skipped</span>}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-600">{r.attempt_count}</td>
                            <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={r.error_message || r.provider_message_id}>
                              {r.status === 'failed' && <span className="text-red-500">{r.error_message || 'Unknown network error'}</span>}
                              {r.status === 'sent' && <span className="text-slate-500 font-mono">Req ID: {r.provider_message_id?.substring(0,10)}...</span>}
                              {r.status === 'skipped' && <span className="text-slate-400">Gateway daily limit exceeded or duplicate</span>}
                              {r.status === 'pending' && <span className="text-slate-400">Awaiting cron queue...</span>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recipients Pagination */}
              {recipients.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  {/* Range & Limit */}
                  <div className="flex flex-wrap items-center gap-3 text-slate-500">
                    <div>
                      Showing <span className="font-semibold text-slate-800">{recipientsPagination.total === 0 ? 0 : (recipientsPagination.page_no - 1) * recipientsPagination.limit + 1}</span> to{' '}
                      <span className="font-semibold text-slate-800">{Math.min(recipientsPagination.page_no * recipientsPagination.limit, recipientsPagination.total)}</span> of{' '}
                      <span className="font-semibold text-slate-800">{recipientsPagination.total}</span> entries
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>Show</span>
                      <select
                        value={recipientsPagination.limit}
                        onChange={(e) => handleLimitChange(e.target.value)}
                        className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                      </select>
                      <span>per page</span>
                    </div>
                  </div>

                  {/* Controls & Jump */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => fetchRecipients(1, recipientsPagination.limit)}
                        disabled={recipientsPagination.page_no <= 1 || recipientsLoading}
                        className="p-1 text-xs rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        title="First Page"
                      >
                        <FiChevronsLeft size={12} />
                      </button>
                      <button
                        onClick={() => fetchRecipients(recipientsPagination.page_no - 1, recipientsPagination.limit)}
                        disabled={recipientsPagination.page_no <= 1 || recipientsLoading}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <FiChevronLeft size={12} />
                        <span>Prev</span>
                      </button>

                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                        {recipientsPagination.page_no} / {recipientsPagination.total_pages}
                      </span>

                      <button
                        onClick={() => fetchRecipients(recipientsPagination.page_no + 1, recipientsPagination.limit)}
                        disabled={recipientsPagination.page_no >= recipientsPagination.total_pages || recipientsLoading}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <span>Next</span>
                        <FiChevronRight size={12} />
                      </button>
                      <button
                        onClick={() => fetchRecipients(recipientsPagination.total_pages, recipientsPagination.limit)}
                        disabled={recipientsPagination.page_no >= recipientsPagination.total_pages || recipientsLoading}
                        className="p-1 text-xs rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        title="Last Page"
                      >
                        <FiChevronsRight size={12} />
                      </button>
                    </div>

                    {/* Jump to page */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const pageNum = parseInt(jumpPage, 10);
                        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= recipientsPagination.total_pages) {
                          fetchRecipients(pageNum, recipientsPagination.limit);
                          setJumpPage('');
                        } else {
                          toast.error(`Please enter a valid page number between 1 and ${recipientsPagination.total_pages}`);
                        }
                      }}
                      className="flex items-center gap-1"
                    >
                      <input
                        type="number"
                        min={1}
                        max={recipientsPagination.total_pages}
                        placeholder="Go..."
                        value={jumpPage}
                        onChange={(e) => setJumpPage(e.target.value)}
                        className="w-12 px-1.5 py-1 text-xs border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white text-center"
                      />
                      <button
                        type="submit"
                        className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center justify-center shadow"
                        title="Jump to Page"
                      >
                        <FiCornerDownLeft size={10} />
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SmsBroadcastDetails;
