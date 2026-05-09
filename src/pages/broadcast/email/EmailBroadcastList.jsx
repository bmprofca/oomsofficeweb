import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Form, Spinner, Table, Dropdown, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  FiPlus, 
  FiPlay, 
  FiPause, 
  FiRotateCw, 
  FiXCircle, 
  FiEye, 
  FiChevronLeft, 
  FiChevronRight,
  FiSend,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiBarChart2,
  FiCalendar,
  FiTarget,
  FiMail,
  FiUsers
} from 'react-icons/fi';
import { Header, Sidebar } from '../../../components/header';
import { emailApi, normalizeList, normalizePagination } from './emailApi';

const EmailBroadcastList = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await emailApi.listBroadcasts({ page_no: page, limit: pagination.limit });
      setRows(normalizeList(res?.data));
      setPagination(normalizePagination(res?.pagination));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(1); }, []);
  useEffect(() => { localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); }, [isMinimized]);

  const doAction = async (type, row) => {
    setActionLoading({ type, id: row.broadcast_id });
    try {
      const payload = { broadcast_id: row.broadcast_id };
      const actions = {
        pause: () => emailApi.pauseBroadcast(payload),
        resume: () => emailApi.resumeBroadcast(payload),
        cancel: () => emailApi.cancelBroadcast(payload),
        retry: () => emailApi.retryFailed(payload)
      };
      await actions[type]();
      toast.success(`Broadcast ${type === 'retry' ? 'retry initiated' : type + 'd'} successfully`);
      fetchData(pagination.page_no);
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to ${type} broadcast`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      running: { variant: 'success', icon: FiPlay, text: 'Running' },
      scheduled: { variant: 'info', icon: FiClock, text: 'Scheduled' },
      paused: { variant: 'warning', icon: FiPause, text: 'Paused' },
      completed: { variant: 'secondary', icon: FiCheckCircle, text: 'Completed' },
      failed: { variant: 'danger', icon: FiAlertCircle, text: 'Failed' },
      cancelled: { variant: 'dark', icon: FiXCircle, text: 'Cancelled' }
    };
    return configs[status] || { variant: 'secondary', icon: FiAlertCircle, text: status };
  };

  const getScheduleTypeLabel = (type) => {
    const types = {
      immediate: 'Immediate',
      scheduled: 'Scheduled',
      recurring: 'Recurring'
    };
    return types[type] || type;
  };

  const TooltipButton = ({ tooltip, ...props }) => (
    <OverlayTrigger overlay={<Tooltip>{tooltip}</Tooltip>}>
      <Button {...props} />
    </OverlayTrigger>
  );

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );

  const StatRow = () => {
    const stats = {
      total: rows.reduce((acc, row) => acc + (row.total_recipients || 0), 0),
      sent: rows.reduce((acc, row) => acc + (row.total_sent || 0), 0),
      pending: rows.reduce((acc, row) => acc + (row.total_pending || 0), 0),
      failed: rows.reduce((acc, row) => acc + (row.total_failed || 0), 0)
    };
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Recipients" value={stats.total.toLocaleString()} icon={FiUsers} color="#3B82F6" />
        <StatCard title="Total Sent" value={stats.sent.toLocaleString()} icon={FiSend} color="#10B981" />
        <StatCard title="Pending" value={stats.pending.toLocaleString()} icon={FiClock} color="#F59E0B" />
        <StatCard title="Failed" value={stats.failed.toLocaleString()} icon={FiAlertCircle} color="#EF4444" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      
      <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="p-4 md:p-6">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FiMail className="text-blue-600" />
                  Email Broadcasts
                </h1>
                <p className="text-gray-500 text-sm mt-1">Manage and monitor your email broadcast campaigns</p>
              </div>
              <Button 
                onClick={() => navigate('/broadcast/email/create')}
                className="bg-blue-600 hover:bg-blue-700 border-0 px-4 py-2 flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Create Broadcast
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          {!loading && rows.length > 0 && <StatRow />}

          {/* Main Card */}
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="text-gray-500 mt-2">Loading broadcasts...</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center py-5">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiMail className="w-8 h-8 text-gray-400" />
                  </div>
                  <h6 className="text-gray-600 mb-2">No Broadcasts Found</h6>
                  <p className="text-gray-400 text-sm mb-4">Create your first email broadcast to get started</p>
                  <Button 
                    onClick={() => navigate('/broadcast/email/create')}
                    variant="outline-primary"
                    className="flex items-center gap-2 mx-auto"
                  >
                    <FiPlus className="w-4 h-4" />
                    Create Broadcast
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table responsive hover className="mb-0">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Broadcast Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Schedule</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Schedule Time</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Progress</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stats</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {rows.map((row) => {
                          const StatusIcon = getStatusConfig(row.status).icon;
                          const statusConfig = getStatusConfig(row.status);
                          const total = row.total_recipients || 1;
                          const sent = row.total_sent || 0;
                          const progress = Math.round((sent / total) * 100);
                          
                          return (
                            <tr key={row.broadcast_id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <div>
                                  <div className="font-medium text-gray-800">{row.broadcast_name}</div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    Template: {row.template_id} • Config: {row.config_id}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge bg="light" text="dark" className="px-2 py-1">
                                  {getScheduleTypeLabel(row.schedule_type)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge 
                                  bg={statusConfig.variant} 
                                  className="px-2 py-1 flex items-center gap-1 w-fit"
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  {statusConfig.text}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="w-32">
                                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Progress</span>
                                    <span>{progress}%</span>
                                  </div>
                                  <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-2">
                                    <FiTarget className="w-3 h-3 text-gray-400" />
                                    <span>Total: <strong>{row.total_recipients || 0}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FiCheckCircle className="w-3 h-3 text-green-500" />
                                    <span>Sent: <strong>{row.total_sent || 0}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FiClock className="w-3 h-3 text-yellow-500" />
                                    <span>Pending: <strong>{row.total_pending || 0}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FiAlertCircle className="w-3 h-3 text-red-500" />
                                    <span>Failed: <strong>{row.total_failed || 0}</strong></span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {row.create_date ? new Date(row.create_date).toLocaleDateString() : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <TooltipButton
                                    tooltip="View Details"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(`/broadcast/email/details/${row.broadcast_id}`)}
                                    className="text-blue-600 hover:text-blue-700 p-1"
                                  >
                                    <FiEye className="w-4 h-4" />
                                  </TooltipButton>
                                  
                                  {row.status === 'running' && (
                                    <TooltipButton
                                      tooltip="Pause"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => doAction('pause', row)}
                                      disabled={actionLoading?.id === row.broadcast_id}
                                      className="text-yellow-600 hover:text-yellow-700 p-1"
                                    >
                                      {actionLoading?.type === 'pause' && actionLoading?.id === row.broadcast_id ? 
                                        <Spinner as="span" animation="border" size="sm" /> : 
                                        <FiPause className="w-4 h-4" />
                                      }
                                    </TooltipButton>
                                  )}
                                  
                                  {row.status === 'paused' && (
                                    <TooltipButton
                                      tooltip="Resume"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => doAction('resume', row)}
                                      disabled={actionLoading?.id === row.broadcast_id}
                                      className="text-green-600 hover:text-green-700 p-1"
                                    >
                                      {actionLoading?.type === 'resume' && actionLoading?.id === row.broadcast_id ? 
                                        <Spinner as="span" animation="border" size="sm" /> : 
                                        <FiPlay className="w-4 h-4" />
                                      }
                                    </TooltipButton>
                                  )}
                                  
                                  {(row.status === 'running' || row.status === 'paused') && (
                                    <TooltipButton
                                      tooltip="Cancel"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => doAction('cancel', row)}
                                      disabled={actionLoading?.id === row.broadcast_id}
                                      className="text-red-600 hover:text-red-700 p-1"
                                    >
                                      {actionLoading?.type === 'cancel' && actionLoading?.id === row.broadcast_id ? 
                                        <Spinner as="span" animation="border" size="sm" /> : 
                                        <FiXCircle className="w-4 h-4" />
                                      }
                                    </TooltipButton>
                                  )}
                                  
                                  {row.total_failed > 0 && (
                                    <TooltipButton
                                      tooltip="Retry Failed"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => doAction('retry', row)}
                                      disabled={actionLoading?.id === row.broadcast_id}
                                      className="text-orange-600 hover:text-orange-700 p-1"
                                    >
                                      {actionLoading?.type === 'retry' && actionLoading?.id === row.broadcast_id ? 
                                        <Spinner as="span" animation="border" size="sm" /> : 
                                        <FiRotateCw className="w-4 h-4" />
                                      }
                                    </TooltipButton>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="px-4 py-3 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="text-sm text-gray-500">
                      Showing <strong>{((pagination.page_no - 1) * pagination.limit) + 1}</strong> to{' '}
                      <strong>{Math.min(pagination.page_no * pagination.limit, pagination.total)}</strong> of{' '}
                      <strong>{pagination.total}</strong> broadcasts
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        disabled={pagination.page_no <= 1}
                        onClick={() => fetchData(pagination.page_no - 1)}
                        className="flex items-center gap-1"
                      >
                        <FiChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <div className="px-3 py-1 bg-white border rounded text-sm">
                        Page {pagination.page_no} of {pagination.total_pages}
                      </div>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        disabled={pagination.page_no >= pagination.total_pages}
                        onClick={() => fetchData(pagination.page_no + 1)}
                        className="flex items-center gap-1"
                      >
                        Next
                        <FiChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmailBroadcastList;