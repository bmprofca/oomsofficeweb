import React, { useEffect, useState, useRef } from 'react';
import { Badge, Button, Card, Form, Spinner, Table, Overlay, Popover } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  FiPlus, FiMoreVertical, FiEye, FiPause, FiPlay, FiX, FiRefreshCw, 
  FiChevronLeft, FiChevronRight, FiMail, FiCalendar, FiUsers,
  FiSend, FiClock, FiAlertCircle, FiCheckCircle, FiZap
} from 'react-icons/fi';
import { Header, Sidebar } from '../../../components/header';
import { emailApi, normalizeList, normalizePagination } from './emailApi';

const EmailBroadcastList = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => 
    JSON.parse(localStorage.getItem('sidebarMinimized') || 'false')
  );
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ 
    page_no: 1, limit: 10, total: 0, total_pages: 1 
  });
  const [actionMenuId, setActionMenuId] = useState(null);
  const actionRefs = useRef({});

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
  useEffect(() => { 
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); 
  }, [isMinimized]);

  const doAction = async (type, row) => {
    try {
      const payload = { broadcast_id: row.broadcast_id };
      const actions = {
        pause: () => emailApi.pauseBroadcast(payload),
        resume: () => emailApi.resumeBroadcast(payload),
        cancel: () => emailApi.cancelBroadcast(payload),
        retry: () => emailApi.retryFailed(payload)
      };
      
      if (actions[type]) {
        await actions[type]();
        toast.success(`Broadcast ${type}d successfully`);
        fetchData(pagination.page_no);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to ${type} broadcast`);
    } finally {
      setActionMenuId(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      running: { bg: 'success', Icon: FiPlay, text: 'Running' },
      paused: { bg: 'warning', Icon: FiPause, text: 'Paused' },
      completed: { bg: 'info', Icon: FiCheckCircle, text: 'Completed' },
      cancelled: { bg: 'danger', Icon: FiX, text: 'Cancelled' },
      pending: { bg: 'secondary', Icon: FiClock, text: 'Pending' },
      failed: { bg: 'danger', Icon: FiAlertCircle, text: 'Failed' }
    };
    
    const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;
    const IconComponent = config.Icon;
    
    return (
      <Badge bg={config.bg} className="d-flex align-items-center gap-1 py-1 px-2" style={{ width: 'fit-content' }}>
        <IconComponent size={12} />
        <span>{config.text}</span>
      </Badge>
    );
  };

  const getScheduleInfo = (row) => {
    const scheduleConfig = {
      immediate: { Icon: FiZap, color: 'warning', label: 'Immediate' },
      scheduled: { Icon: FiClock, color: 'primary', label: 'Scheduled' },
      recurring: { Icon: FiRefreshCw, color: 'info', label: 'Recurring' }
    };
    
    const config = scheduleConfig[row.schedule_type?.toLowerCase()] || scheduleConfig.immediate;
    const IconComponent = config.Icon;
    
    return (
      <div className="d-flex align-items-center gap-2">
        <div className={`text-${config.color}`}>
          <IconComponent size={14} />
        </div>
        <div>
          <div className="text-capitalize small fw-medium">{config.label}</div>
          {row.scheduled_at && (
            <small className="text-muted d-flex align-items-center gap-1">
              <FiCalendar size={10} />
              {new Date(row.scheduled_at).toLocaleDateString()}
            </small>
          )}
        </div>
      </div>
    );
  };

  const ActionMenu = ({ row }) => (
    <Overlay
      show={actionMenuId === row.broadcast_id}
      target={actionRefs.current[row.broadcast_id]}
      placement="left"
      container={actionRefs.current[row.broadcast_id]}
      rootClose
      onHide={() => setActionMenuId(null)}
    >
      <Popover id={`action-popover-${row.broadcast_id}`} className="shadow-sm border-0">
        <Popover.Body className="p-1">
          <div className="d-flex flex-column" style={{ minWidth: '150px' }}>
            <button 
              className="btn btn-ghost btn-sm text-start d-flex align-items-center gap-2 py-2 px-3"
              onClick={() => {
                navigate(`/broadcast/email/details/${row.broadcast_id}`);
                setActionMenuId(null);
              }}
            >
              <FiEye size={16} /> View Details
            </button>
            
            {row.status === 'running' && (
              <button 
                className="btn btn-ghost btn-sm text-start d-flex align-items-center gap-2 py-2 px-3 text-warning"
                onClick={() => doAction('pause', row)}
              >
                <FiPause size={16} /> Pause Broadcast
              </button>
            )}
            
            {row.status === 'paused' && (
              <button 
                className="btn btn-ghost btn-sm text-start d-flex align-items-center gap-2 py-2 px-3 text-success"
                onClick={() => doAction('resume', row)}
              >
                <FiPlay size={16} /> Resume Broadcast
              </button>
            )}
            
            {['running', 'paused'].includes(row.status) && (
              <button 
                className="btn btn-ghost btn-sm text-start d-flex align-items-center gap-2 py-2 px-3 text-danger"
                onClick={() => doAction('cancel', row)}
              >
                <FiX size={16} /> Cancel Broadcast
              </button>
            )}
            
            {row.total_failed > 0 && (
              <button 
                className="btn btn-ghost btn-sm text-start d-flex align-items-center gap-2 py-2 px-3"
                onClick={() => doAction('retry', row)}
              >
                <FiRefreshCw size={16} /> Retry Failed
              </button>
            )}
          </div>
        </Popover.Body>
      </Popover>
    </Overlay>
  );

  return (
    <div className="min-h-screen bg-light">
      <Header 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
        isMinimized={isMinimized} 
        setIsMinimized={setIsMinimized} 
      />
      <Sidebar 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
        isMinimized={isMinimized} 
        setIsMinimized={setIsMinimized} 
      />
      
      <div className={`pt-16 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="container-fluid py-3 px-2 px-md-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center py-3">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-primary bg-opacity-10 p-2 rounded">
                  <FiMail className="text-primary" size={18} />
                </div>
                <h5 className="mb-0 fw-semibold">Email Broadcasts</h5>
                <Badge bg="light" text="dark" className="ms-2 py-1 px-2">
                  {pagination.total}
                </Badge>
              </div>
              <Button 
                variant="primary" 
                size="sm"
                className="d-flex align-items-center gap-2 px-3"
                onClick={() => navigate('/broadcast/email/create')}
              >
                <FiPlus size={16} /> Create Broadcast
              </Button>
            </Card.Header>
            
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2 text-muted">Loading broadcasts...</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table hover className="mb-0" style={{ fontSize: '0.875rem' }}>
                      <thead className="bg-light">
                        <tr>
                          <th className="ps-4" style={{ width: '20%' }}>Broadcast</th>
                          <th style={{ width: '10%' }}>Template</th>
                          <th style={{ width: '12%' }}>Schedule</th>
                          <th style={{ width: '12%' }}>Status</th>
                          <th style={{ width: '22%' }}>Statistics</th>
                          <th style={{ width: '12%' }}>Created</th>
                          <th style={{ width: '5%' }} className="text-end pe-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center text-muted py-5">
                              <div className="bg-light rounded-circle d-inline-flex p-3 mb-3">
                                <FiSend size={32} />
                              </div>
                              <p className="mb-1 fw-medium">No broadcasts found</p>
                              <small>Create your first email broadcast to get started</small>
                            </td>
                          </tr>
                        ) : (
                          rows.map((row) => (
                            <tr key={row.broadcast_id} className="align-middle">
                              <td className="ps-4">
                                <div className="fw-medium text-truncate" style={{ maxWidth: '200px' }}>
                                  {row.broadcast_name}
                                </div>
                                <small className="text-muted">ID: {row.broadcast_id}</small>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border">
                                  {row.template_id || 'N/A'}
                                </span>
                              </td>
                              <td>
                                {getScheduleInfo(row)}
                              </td>
                              <td>
                                {getStatusBadge(row.status)}
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-3">
                                  <div className="d-flex align-items-center gap-1" title="Total Recipients">
                                    <FiUsers size={12} className="text-primary" />
                                    <span className="fw-medium">{row.total_recipients || 0}</span>
                                  </div>
                                  <div className="d-flex align-items-center gap-1" title="Sent">
                                    <FiSend size={12} className="text-success" />
                                    <span className="text-success fw-medium">{row.total_sent || 0}</span>
                                  </div>
                                  <div className="d-flex align-items-center gap-1" title="Pending">
                                    <FiClock size={12} className="text-warning" />
                                    <span className="text-warning fw-medium">{row.total_pending || 0}</span>
                                  </div>
                                  {row.total_failed > 0 && (
                                    <div className="d-flex align-items-center gap-1" title="Failed">
                                      <FiAlertCircle size={12} className="text-danger" />
                                      <span className="text-danger fw-medium">{row.total_failed}</span>
                                    </div>
                                  )}
                                  {row.total_skipped > 0 && (
                                    <div className="d-flex align-items-center gap-1" title="Skipped">
                                      <FiX size={12} className="text-muted" />
                                      <span className="text-muted">{row.total_skipped}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-1 text-muted">
                                  <FiCalendar size={12} />
                                  <small>
                                    {row.create_date ? new Date(row.create_date).toLocaleDateString() : '-'}
                                  </small>
                                </div>
                              </td>
                              <td className="text-end pe-4">
                                <div 
                                  ref={el => actionRefs.current[row.broadcast_id] = el}
                                  className="d-inline-block"
                                >
                                  <Button
                                    variant="light"
                                    size="sm"
                                    className="p-1 rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: '32px', height: '32px' }}
                                    onClick={() => setActionMenuId(
                                      actionMenuId === row.broadcast_id ? null : row.broadcast_id
                                    )}
                                  >
                                    <FiMoreVertical size={18} />
                                  </Button>
                                </div>
                                <ActionMenu row={row} />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center p-3 border-top bg-light">
                    <small className="text-muted d-flex align-items-center gap-1">
                      <FiUsers size={14} />
                      Showing {((pagination.page_no - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page_no * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} results
                    </small>
                    
                    <div className="d-flex align-items-center gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="d-flex align-items-center gap-1"
                        disabled={pagination.page_no <= 1}
                        onClick={() => fetchData(pagination.page_no - 1)}
                      >
                        <FiChevronLeft size={16} /> Prev
                      </Button>
                      
                      <Form.Select
                        size="sm"
                        value={pagination.page_no}
                        onChange={(e) => fetchData(Number(e.target.value))}
                        style={{ width: 'auto', minWidth: '100px' }}
                        className="text-center"
                      >
                        {[...Array(pagination.total_pages)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Page {i + 1} of {pagination.total_pages}
                          </option>
                        ))}
                      </Form.Select>
                      
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="d-flex align-items-center gap-1"
                        disabled={pagination.page_no >= pagination.total_pages}
                        onClick={() => fetchData(pagination.page_no + 1)}
                      >
                        Next <FiChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
      
      <style jsx>{`
        .btn-ghost {
          background: transparent;
          border: none;
          transition: all 0.2s;
        }
        .btn-ghost:hover {
          background: rgba(0,0,0,0.05);
        }
        .badge {
          font-weight: 500;
          font-size: 0.75rem;
        }
        .table th {
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.5px;
          color: #6c757d;
        }
      `}</style>
    </div>
  );
};

export default EmailBroadcastList;