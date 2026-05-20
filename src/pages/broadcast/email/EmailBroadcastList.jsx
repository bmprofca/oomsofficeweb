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

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  .ebl-root * { font-family: 'Plus Jakarta Sans', sans-serif; }

  .ebl-root {
    background: #f0f2f7;
    min-height: 100vh;
  }

  /* Page wrapper */
  .ebl-page { max-width: 1200px; margin: 0 auto; padding: 28px 20px 40px; }

  /* Header card */
  .ebl-header-card {
    background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 60%, #2563eb 100%);
    border-radius: 16px;
    padding: 18px 24px;
    color: #fff;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .ebl-header-title {
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.3px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ebl-header-sub { font-size: 0.78rem; color: rgba(255,255,255,0.65); margin-top: 3px; }
  .ebl-count-pill {
    background: rgba(255,255,255,0.18);
    color: #fff;
    border-radius: 20px;
    padding: 2px 10px;
    font-size: 0.76rem;
    font-weight: 700;
    margin-left: 8px;
    vertical-align: middle;
  }

  /* Create button */
  .ebl-btn-create {
    background: #fff;
    color: #1d4ed8;
    border: none;
    border-radius: 10px;
    padding: 8px 18px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: all 0.15s;
    white-space: nowrap;
    font-family: 'Plus Jakarta Sans', sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }
  .ebl-btn-create:hover { background: #eff6ff; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.15); }

  /* Main card */
  .ebl-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }

  /* Table */
  .ebl-table { width: 100%; border-collapse: separate; border-spacing: 0; }
  .ebl-table thead tr th {
    background: #f8fafc;
    font-size: 0.7rem;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 11px 14px;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }
  .ebl-table tbody tr td {
    padding: 13px 14px;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.83rem;
    vertical-align: middle;
    color: #374151;
  }
  .ebl-table tbody tr:last-child td { border-bottom: none; }
  .ebl-table tbody tr { transition: background 0.1s; }
  .ebl-table tbody tr:hover td { background: #fafbff; }

  /* Broadcast name cell */
  .ebl-broadcast-name {
    font-weight: 700;
    color: #111827;
    font-size: 0.845rem;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ebl-broadcast-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    color: #9ca3af;
    margin-top: 2px;
  }

  /* Status badges */
  .ebl-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .ebl-status-running  { background: #ecfdf5; color: #065f46; }
  .ebl-status-paused   { background: #fffbeb; color: #92400e; }
  .ebl-status-completed{ background: #eff6ff; color: #1e40af; }
  .ebl-status-cancelled{ background: #fef2f2; color: #991b1b; }
  .ebl-status-pending  { background: #f3f4f6; color: #374151; }
  .ebl-status-failed   { background: #fef2f2; color: #991b1b; }

  /* Schedule cell */
  .ebl-schedule-label { font-size: 0.82rem; font-weight: 600; color: #374151; text-transform: capitalize; }
  .ebl-schedule-date  { font-size: 0.72rem; color: #9ca3af; display: flex; align-items: center; gap: 4px; margin-top: 2px; }

  /* Stats row */
  .ebl-stats { display: flex; align-items: center; gap: 14px; }
  .ebl-stat-item { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; font-weight: 600; }

  /* Template badge */
  .ebl-template-badge {
    display: inline-flex;
    align-items: center;
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    padding: 3px 9px;
    font-size: 0.72rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Action button */
  .ebl-action-btn {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1.5px solid #e5e7eb;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ebl-action-btn:hover { border-color: #93c5fd; background: #eff6ff; color: #2563eb; }

  /* Popover menu */
  .ebl-popover .popover {
    border: 1.5px solid #e5e7eb !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    min-width: 170px;
  }
  .ebl-popover .popover-body { padding: 6px !important; }
  .ebl-menu-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border-radius: 8px;
    border: none;
    background: transparent;
    width: 100%;
    text-align: left;
    font-size: 0.82rem;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    transition: background 0.1s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ebl-menu-item:hover { background: #f3f4f6; }
  .ebl-menu-item.warning { color: #92400e; }
  .ebl-menu-item.warning:hover { background: #fffbeb; }
  .ebl-menu-item.success { color: #065f46; }
  .ebl-menu-item.success:hover { background: #ecfdf5; }
  .ebl-menu-item.danger { color: #991b1b; }
  .ebl-menu-item.danger:hover { background: #fef2f2; }
  .ebl-menu-divider { border: none; border-top: 1px solid #f3f4f6; margin: 4px 0; }

  /* Empty state */
  .ebl-empty {
    text-align: center;
    padding: 60px 20px;
    color: #6b7280;
  }
  .ebl-empty-icon {
    width: 56px;
    height: 56px;
    background: #f3f4f6;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    color: #9ca3af;
  }
  .ebl-empty-title { font-size: 0.9rem; font-weight: 700; color: #374151; margin-bottom: 4px; }
  .ebl-empty-sub   { font-size: 0.78rem; color: #9ca3af; }

  /* Pagination footer */
  .ebl-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px;
    border-top: 1px solid #f3f4f6;
    background: #fafafa;
    flex-wrap: wrap;
    gap: 10px;
  }
  .ebl-footer-info { font-size: 0.78rem; color: #6b7280; display: flex; align-items: center; gap: 6px; }
  .ebl-footer-controls { display: flex; align-items: center; gap: 8px; }
  .ebl-page-btn {
    height: 32px;
    padding: 0 12px;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    font-size: 0.78rem;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ebl-page-btn:hover:not(:disabled) { border-color: #93c5fd; background: #eff6ff; color: #2563eb; }
  .ebl-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .ebl-page-select {
    height: 32px;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 0 10px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #374151;
    background: #fff;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    outline: none;
  }
  .ebl-page-select:focus { border-color: #3b82f6; }

  /* Loading */
  .ebl-loading { text-align: center; padding: 60px 20px; color: #6b7280; }
  .ebl-loading p { font-size: 0.82rem; margin-top: 10px; }
`;

// ─── Status Badge ─────────────────────────────────────────────────────────────
const getStatusBadge = (status) => {
  const map = {
    running:   { cls: 'ebl-status-running',   Icon: FiPlay,        text: 'Running'   },
    paused:    { cls: 'ebl-status-paused',    Icon: FiPause,       text: 'Paused'    },
    completed: { cls: 'ebl-status-completed', Icon: FiCheckCircle, text: 'Completed' },
    cancelled: { cls: 'ebl-status-cancelled', Icon: FiX,           text: 'Cancelled' },
    pending:   { cls: 'ebl-status-pending',   Icon: FiClock,       text: 'Pending'   },
    failed:    { cls: 'ebl-status-failed',    Icon: FiAlertCircle, text: 'Failed'    },
  };
  const cfg = map[status?.toLowerCase()] || map.pending;
  const Icon = cfg.Icon;
  return (
    <span className={`ebl-status ${cfg.cls}`}>
      <Icon size={11} /> {cfg.text}
    </span>
  );
};

// ─── Schedule Info ────────────────────────────────────────────────────────────
const getScheduleInfo = (row) => {
  const map = {
    immediate: { Icon: FiZap,       color: '#d97706', label: 'Immediate' },
    scheduled: { Icon: FiClock,     color: '#2563eb', label: 'Scheduled' },
    recurring: { Icon: FiRefreshCw, color: '#0891b2', label: 'Recurring' },
    now:       { Icon: FiZap,       color: '#d97706', label: 'Immediate' },
  };
  const cfg = map[row.schedule_type?.toLowerCase()] || map.immediate;
  const Icon = cfg.Icon;
  return (
    <div>
      <div className="ebl-schedule-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={13} style={{ color: cfg.color, flexShrink: 0 }} />
        {cfg.label}
      </div>
      {row.scheduled_at && (
        <div className="ebl-schedule-date">
          <FiCalendar size={10} />
          {new Date(row.scheduled_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

// ─── Action Menu ──────────────────────────────────────────────────────────────
const ActionMenu = ({ row, actionMenuId, setActionMenuId, actionRefs, navigate, doAction }) => (
  <div className="ebl-popover">
    <Overlay
      show={actionMenuId === row.broadcast_id}
      target={actionRefs.current[row.broadcast_id]}
      placement="left"
      container={actionRefs.current[row.broadcast_id]}
      rootClose
      onHide={() => setActionMenuId(null)}
    >
      <Popover id={`action-popover-${row.broadcast_id}`}>
        <Popover.Body>
          <button className="ebl-menu-item" onClick={() => { navigate(`/broadcast/email/details/${row.broadcast_id}`); setActionMenuId(null); }}>
            <FiEye size={14} /> View Details
          </button>
          {row.status === 'running' && (
            <button className="ebl-menu-item warning" onClick={() => doAction('pause', row)}>
              <FiPause size={14} /> Pause Broadcast
            </button>
          )}
          {row.status === 'paused' && (
            <button className="ebl-menu-item success" onClick={() => doAction('resume', row)}>
              <FiPlay size={14} /> Resume Broadcast
            </button>
          )}
          {['running', 'paused'].includes(row.status) && (
            <>
              <hr className="ebl-menu-divider" />
              <button className="ebl-menu-item danger" onClick={() => doAction('cancel', row)}>
                <FiX size={14} /> Cancel Broadcast
              </button>
            </>
          )}
          {row.total_failed > 0 && (
            <button className="ebl-menu-item" onClick={() => doAction('retry', row)}>
              <FiRefreshCw size={14} /> Retry Failed
            </button>
          )}
        </Popover.Body>
      </Popover>
    </Overlay>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const EmailBroadcastList = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
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
  useEffect(() => { localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); }, [isMinimized]);

  const doAction = async (type, row) => {
    try {
      const payload = { broadcast_id: row.broadcast_id };
      const actions = {
        pause:  () => emailApi.pauseBroadcast(payload),
        resume: () => emailApi.resumeBroadcast(payload),
        cancel: () => emailApi.cancelBroadcast(payload),
        retry:  () => emailApi.retryFailed(payload),
      };
      if (actions[type]) { await actions[type](); toast.success(`Broadcast ${type}d successfully`); fetchData(pagination.page_no); }
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to ${type} broadcast`);
    } finally {
      setActionMenuId(null);
    }
  };

  const from = ((pagination.page_no - 1) * pagination.limit) + 1;
  const to   = Math.min(pagination.page_no * pagination.limit, pagination.total);

  return (
    <>
      <style>{styles}</style>
      <div className="ebl-root">
        <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

        <div className={`pt-16 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
          <div className="ebl-page">

            {/* ── Header ── */}
            <div className="ebl-header-card">
              <div>
                <div className="ebl-header-title">
                  <FiMail size={18} style={{ opacity: 0.9 }} />
                  Email Broadcasts
                  <span className="ebl-count-pill">{pagination.total}</span>
                </div>
                <div className="ebl-header-sub">Manage and monitor all your email broadcast campaigns</div>
              </div>
              <button className="ebl-btn-create" onClick={() => navigate('/broadcast/email/create')}>
                <FiPlus size={15} /> Create Broadcast
              </button>
            </div>

            {/* ── Table Card ── */}
            <div className="ebl-card">
              {loading ? (
                <div className="ebl-loading">
                  <Spinner animation="border" variant="primary" style={{ width: 28, height: 28, borderWidth: 3 }} />
                  <p>Loading broadcasts…</p>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="ebl-table">
                      <thead>
                        <tr>
                          <th style={{ paddingLeft: 20 }}>Broadcast</th>
                          <th>Template</th>
                          <th>Schedule</th>
                          <th>Status</th>
                          <th>Statistics</th>
                          <th>Created</th>
                          <th style={{ textAlign: 'right', paddingRight: 20 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ border: 'none' }}>
                              <div className="ebl-empty">
                                <div className="ebl-empty-icon"><FiSend size={22} /></div>
                                <div className="ebl-empty-title">No broadcasts found</div>
                                <div className="ebl-empty-sub">Create your first email broadcast to get started</div>
                              </div>
                            </td>
                          </tr>
                        ) : rows.map((row) => (
                          <tr key={row.broadcast_id}>
                            <td style={{ paddingLeft: 20 }}>
                              <div className="ebl-broadcast-name">{row.broadcast_name}</div>
                              <div className="ebl-broadcast-id">#{row.broadcast_id}</div>
                            </td>
                            <td>
                              <span className="ebl-template-badge">{row.template_id || 'N/A'}</span>
                            </td>
                            <td>{getScheduleInfo(row)}</td>
                            <td>{getStatusBadge(row.status)}</td>
                            <td>
                              <div className="ebl-stats">
                                <div className="ebl-stat-item" title="Total Recipients">
                                  <FiUsers size={12} style={{ color: '#2563eb' }} />
                                  <span style={{ color: '#374151' }}>{row.total_recipients || 0}</span>
                                </div>
                                <div className="ebl-stat-item" title="Sent">
                                  <FiSend size={12} style={{ color: '#059669' }} />
                                  <span style={{ color: '#059669' }}>{row.total_sent || 0}</span>
                                </div>
                                <div className="ebl-stat-item" title="Pending">
                                  <FiClock size={12} style={{ color: '#d97706' }} />
                                  <span style={{ color: '#d97706' }}>{row.total_pending || 0}</span>
                                </div>
                                {row.total_failed > 0 && (
                                  <div className="ebl-stat-item" title="Failed">
                                    <FiAlertCircle size={12} style={{ color: '#dc2626' }} />
                                    <span style={{ color: '#dc2626' }}>{row.total_failed}</span>
                                  </div>
                                )}
                                {row.total_skipped > 0 && (
                                  <div className="ebl-stat-item" title="Skipped">
                                    <FiX size={12} style={{ color: '#9ca3af' }} />
                                    <span style={{ color: '#9ca3af' }}>{row.total_skipped}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9ca3af', fontSize: '0.78rem' }}>
                                <FiCalendar size={11} />
                                {row.create_date ? new Date(row.create_date).toLocaleDateString() : '—'}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', paddingRight: 20 }}>
                              <div ref={el => actionRefs.current[row.broadcast_id] = el} style={{ display: 'inline-block' }}>
                                <button
                                  className="ebl-action-btn"
                                  onClick={() => setActionMenuId(actionMenuId === row.broadcast_id ? null : row.broadcast_id)}
                                >
                                  <FiMoreVertical size={15} />
                                </button>
                              </div>
                              <ActionMenu
                                row={row}
                                actionMenuId={actionMenuId}
                                setActionMenuId={setActionMenuId}
                                actionRefs={actionRefs}
                                navigate={navigate}
                                doAction={doAction}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Pagination ── */}
                  <div className="ebl-footer">
                    <div className="ebl-footer-info">
                      <FiUsers size={13} />
                      {pagination.total > 0 ? `Showing ${from}–${to} of ${pagination.total} results` : 'No results'}
                    </div>
                    <div className="ebl-footer-controls">
                      <button className="ebl-page-btn" disabled={pagination.page_no <= 1} onClick={() => fetchData(pagination.page_no - 1)}>
                        <FiChevronLeft size={14} /> Prev
                      </button>
                      <select
                        className="ebl-page-select"
                        value={pagination.page_no}
                        onChange={e => fetchData(Number(e.target.value))}
                      >
                        {[...Array(pagination.total_pages)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>Page {i + 1} of {pagination.total_pages}</option>
                        ))}
                      </select>
                      <button className="ebl-page-btn" disabled={pagination.page_no >= pagination.total_pages} onClick={() => fetchData(pagination.page_no + 1)}>
                        Next <FiChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default EmailBroadcastList;