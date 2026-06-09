import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import { emailApi, normalizeList } from './emailApi';
import {
  FiArrowLeft, FiMail, FiClock, FiSend, FiAlertCircle, FiCheckCircle,
  FiX, FiPause, FiPlay, FiRefreshCw, FiUsers, FiCalendar, FiEye,
  FiZap, FiHash, FiInfo, FiUser, FiAtSign, FiActivity, FiHome, FiChevronRight
} from 'react-icons/fi';

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  .ebd-root * { font-family: 'Plus Jakarta Sans', sans-serif; }
  .ebd-root { background: #f0f2f7; min-height: 100vh; }
  .ebd-page { max-width: 1200px; margin: 0 auto; padding: 28px 20px 48px; }

  /* Back + title bar */
  .ebd-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .ebd-topbar-left { display: flex; align-items: center; gap: 12px; }
  .ebd-back-btn {
    width: 34px; height: 34px;
    border: 1.5px solid #e5e7eb;
    border-radius: 9px;
    background: #fff;
    display: flex; align-items: center; justify-content: center;
    color: #6b7280; cursor: pointer;
    transition: all 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ebd-back-btn:hover { border-color: #93c5fd; background: #eff6ff; color: #2563eb; }
  .ebd-page-title { font-size: 1.1rem; font-weight: 800; color: #111827; letter-spacing: -0.3px; }
  .ebd-page-sub   { font-size: 0.75rem; color: #6b7280; margin-top: 1px; }

  /* Section card */
  .ebd-section {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    margin-bottom: 20px;
  }
  .ebd-section-header {
    padding: 15px 22px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }
  .ebd-section-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .ebd-icon-box {
    width: 27px; height: 27px;
    border-radius: 8px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 0.68rem; flex-shrink: 0;
  }
  .ebd-section-body { padding: 20px 22px; }

  /* Meta grid */
  .ebd-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
  .ebd-meta-item {}
  .ebd-meta-label { font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .ebd-meta-value { font-size: 0.845rem; font-weight: 600; color: #111827; display: flex; align-items: center; gap: 6px; }
  .ebd-meta-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: #374151; }

  /* Status badge */
  .ebd-status {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 20px;
    font-size: 0.72rem; font-weight: 700; white-space: nowrap;
  }
  .ebd-status-running   { background: #ecfdf5; color: #065f46; }
  .ebd-status-paused    { background: #fffbeb; color: #92400e; }
  .ebd-status-completed { background: #eff6ff; color: #1e40af; }
  .ebd-status-cancelled { background: #fef2f2; color: #991b1b; }
  .ebd-status-pending   { background: #f3f4f6; color: #374151; }
  .ebd-status-failed    { background: #fef2f2; color: #991b1b; }

  /* Stat cards */
  .ebd-stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  @media (max-width: 768px) { .ebd-stats-row { grid-template-columns: repeat(2, 1fr); } }
  .ebd-stat-card {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 14px 16px;
    text-align: center;
  }
  .ebd-stat-val { font-size: 1.5rem; font-weight: 800; color: #111827; line-height: 1; }
  .ebd-stat-lbl { font-size: 0.7rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 5px; }
  .ebd-stat-card.blue   .ebd-stat-val { color: #2563eb; }
  .ebd-stat-card.amber  .ebd-stat-val { color: #d97706; }
  .ebd-stat-card.green  .ebd-stat-val { color: #059669; }
  .ebd-stat-card.red    .ebd-stat-val { color: #dc2626; }
  .ebd-stat-card.gray   .ebd-stat-val { color: #6b7280; }

  /* Action buttons */
  .ebd-actions { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 18px; }
  .ebd-btn {
    height: 34px;
    padding: 0 16px;
    border-radius: 9px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex; align-items: center; gap: 7px;
    border: 1.5px solid transparent;
    transition: all 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
    white-space: nowrap;
  }
  .ebd-btn-warning { background: #fffbeb; color: #92400e; border-color: #fde68a; }
  .ebd-btn-warning:hover { background: #fef3c7; }
  .ebd-btn-success { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
  .ebd-btn-success:hover { background: #d1fae5; }
  .ebd-btn-danger  { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
  .ebd-btn-danger:hover  { background: #fee2e2; }
  .ebd-btn-secondary { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
  .ebd-btn-secondary:hover { background: #e5e7eb; }

  /* Template preview */
  .ebd-subject-box {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 11px 16px;
    margin-bottom: 16px;
  }
  .ebd-subject-label { font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .ebd-subject-value { font-size: 0.88rem; font-weight: 600; color: #111827; }
  .ebd-html-preview {
    border: 1.5px solid #e5e7eb;
    border-radius: 10px;
    padding: 16px;
    background: #fff;
    min-height: 80px;
  }

  /* Recipients table */
  .ebd-table-wrap { border: 1.5px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
  .ebd-table { width: 100%; border-collapse: separate; border-spacing: 0; }
  .ebd-table thead tr th {
    background: #f8fafc;
    font-size: 0.7rem;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 14px;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }
  .ebd-table tbody tr td {
    padding: 11px 14px;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.81rem;
    vertical-align: middle;
    color: #374151;
  }
  .ebd-table tbody tr:last-child td { border-bottom: none; }
  .ebd-table tbody tr:hover td { background: #fafbff; }

  /* Recipient status pill */
  .ebd-rpill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 20px;
    font-size: 0.7rem; font-weight: 700; white-space: nowrap;
  }
  .ebd-rpill-sent     { background: #ecfdf5; color: #065f46; }
  .ebd-rpill-failed   { background: #fef2f2; color: #991b1b; }
  .ebd-rpill-pending  { background: #fffbeb; color: #92400e; }
  .ebd-rpill-skipped  { background: #f3f4f6; color: #6b7280; }
  .ebd-rpill-default  { background: #f3f4f6; color: #374151; }

  /* JSON pre */
  .ebd-json-pre {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 6px 9px;
    margin: 0;
    max-width: 180px;
    max-height: 80px;
    overflow: auto;
    white-space: pre-wrap;
    color: #374151;
  }

  /* Error text */
  .ebd-error-text { font-size: 0.75rem; color: #dc2626; max-width: 160px; }

  /* Empty recipients */
  .ebd-empty-row td { text-align: center; padding: 48px 20px !important; color: #9ca3af; font-size: 0.82rem; }

  /* Loading */
  .ebd-loading { text-align: center; padding: 80px 20px; color: #6b7280; }
  .ebd-loading p { font-size: 0.82rem; margin-top: 12px; }
  
  /* Divider */
  .ebd-divider { border: none; border-top: 1px solid #f3f4f6; margin: 16px 0; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatusBadge = (status) => {
  const map = {
    running:   { cls: 'ebd-status-running',   icon: <FiPlay size={10} />,        text: 'Running'   },
    paused:    { cls: 'ebd-status-paused',    icon: <FiPause size={10} />,       text: 'Paused'    },
    completed: { cls: 'ebd-status-completed', icon: <FiCheckCircle size={10} />, text: 'Completed' },
    cancelled: { cls: 'ebd-status-cancelled', icon: <FiX size={10} />,           text: 'Cancelled' },
    pending:   { cls: 'ebd-status-pending',   icon: <FiClock size={10} />,       text: 'Pending'   },
    failed:    { cls: 'ebd-status-failed',    icon: <FiAlertCircle size={10} />, text: 'Failed'    },
  };
  const cfg = map[status?.toLowerCase()] || map.pending;
  return <span className={`ebd-status ${cfg.cls}`}>{cfg.icon} {cfg.text}</span>;
};

const getRecipientPill = (status) => {
  const map = {
    sent:    { cls: 'ebd-rpill-sent',    icon: <FiCheckCircle size={9} /> },
    failed:  { cls: 'ebd-rpill-failed',  icon: <FiAlertCircle size={9} /> },
    pending: { cls: 'ebd-rpill-pending', icon: <FiClock size={9} /> },
    skipped: { cls: 'ebd-rpill-skipped', icon: <FiX size={9} /> },
  };
  const cfg = map[status?.toLowerCase()] || { cls: 'ebd-rpill-default', icon: null };
  return <span className={`ebd-rpill ${cfg.cls}`}>{cfg.icon} {status || '—'}</span>;
};

// ─── Section Card Helper ──────────────────────────────────────────────────────
const Section = ({ icon, title, badge, children }) => (
  <div className="ebd-section">
    <div className="ebd-section-header">
      <div className="ebd-section-title">
        <span className="ebd-icon-box">{icon}</span>
        {title}
      </div>
      {badge}
    </div>
    <div className="ebd-section-body">{children}</div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const EmailBroadcastDetails = () => {
  const { broadcast_id } = useParams();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [recipients, setRecipients] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        emailApi.broadcastDetails(broadcast_id),
        emailApi.recipientList(broadcast_id, { page_no: 1, limit: 500 }),
      ]);
      setDetail(d?.data || d);
      setRecipients(normalizeList(r?.data));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [broadcast_id]);
  useEffect(() => { localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); }, [isMinimized]);

  const doAction = async (type) => {
    try {
      const payload = { broadcast_id };
      if (type === 'pause')  await emailApi.pauseBroadcast(payload);
      if (type === 'resume') await emailApi.resumeBroadcast(payload);
      if (type === 'cancel') await emailApi.cancelBroadcast(payload);
      if (type === 'retry')  await emailApi.retryFailed(payload);
      toast.success(`Broadcast ${type} success`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to ${type} broadcast`);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="ebd-root">
        <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

        <div className={`pt-16 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
          <div className="ebd-page">

            {/* Breadcrumbs */}
            <div className="mb-4">
              <nav className="flex items-center text-sm text-gray-600">
                <Link to="/" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <FiHome className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                <Link to="/broadcast/email-channel" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <FiSend className="w-4 h-4" />
                  <span>Broadcast</span>
                </Link>
                <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                <Link to="/broadcast/email" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <span>Email</span>
                </Link>
                <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                <span className="text-gray-900 font-medium">Details</span>
              </nav>
            </div>

            {/* ── Top bar ── */}
            <div className="ebd-topbar">
              <div className="ebd-topbar-left">
                <button className="ebd-back-btn" onClick={() => navigate('/broadcast/email')}>
                  <FiArrowLeft size={15} />
                </button>
                <div>
                  <div className="ebd-page-title">Broadcast Details</div>
                  <div className="ebd-page-sub">View stats, template snapshot and recipient log</div>
                </div>
              </div>
              {detail && getStatusBadge(detail.status)}
            </div>

            {loading ? (
              <div className="ebd-loading">
                <Spinner animation="border" variant="primary" style={{ width: 28, height: 28, borderWidth: 3 }} />
                <p>Loading broadcast details…</p>
              </div>
            ) : (
              <>
                {/* ── Overview ── */}
                <Section icon={<FiInfo size={12} />} title="Overview">
                  <div className="ebd-meta-grid">
                    <div className="ebd-meta-item">
                      <div className="ebd-meta-label">Broadcast Name</div>
                      <div className="ebd-meta-value"><FiMail size={13} style={{ color: '#2563eb' }} />{detail?.broadcast_name || '—'}</div>
                    </div>
                    <div className="ebd-meta-item">
                      <div className="ebd-meta-label">Broadcast ID</div>
                      <div className="ebd-meta-value mono"><FiHash size={12} />{detail?.broadcast_id || broadcast_id}</div>
                    </div>
                    <div className="ebd-meta-item">
                      <div className="ebd-meta-label">Status</div>
                      <div className="ebd-meta-value">{getStatusBadge(detail?.status)}</div>
                    </div>
                    <div className="ebd-meta-item">
                      <div className="ebd-meta-label">Schedule Type</div>
                      <div className="ebd-meta-value">
                        {detail?.schedule_type?.toLowerCase() === 'now' || detail?.schedule_type?.toLowerCase() === 'immediate'
                          ? <><FiZap size={13} style={{ color: '#d97706' }} /> Immediate</>
                          : <><FiClock size={13} style={{ color: '#2563eb' }} /> {detail?.schedule_type || '—'}</>}
                      </div>
                    </div>
                    {detail?.scheduled_at && (
                      <div className="ebd-meta-item">
                        <div className="ebd-meta-label">Scheduled At</div>
                        <div className="ebd-meta-value"><FiCalendar size={13} style={{ color: '#6b7280' }} />{new Date(detail.scheduled_at).toLocaleString()}</div>
                      </div>
                    )}
                    <div className="ebd-meta-item">
                      <div className="ebd-meta-label">Daily Limit</div>
                      <div className="ebd-meta-value mono">{detail?.daily_limit ?? '—'}</div>
                    </div>
                    <div className="ebd-meta-item">
                      <div className="ebd-meta-label">Time Zone</div>
                      <div className="ebd-meta-value"><FiActivity size={13} style={{ color: '#6b7280' }} />{detail?.timezone || '—'}</div>
                    </div>
                  </div>

                  <hr className="ebd-divider" />

                  {/* Stats */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                    Delivery Statistics
                  </div>
                  <div className="ebd-stats-row">
                    <div className="ebd-stat-card blue">
                      <div className="ebd-stat-val">{detail?.total_recipients || 0}</div>
                      <div className="ebd-stat-lbl">Total</div>
                    </div>
                    <div className="ebd-stat-card amber">
                      <div className="ebd-stat-val">{detail?.total_pending || 0}</div>
                      <div className="ebd-stat-lbl">Pending</div>
                    </div>
                    <div className="ebd-stat-card green">
                      <div className="ebd-stat-val">{detail?.total_sent || 0}</div>
                      <div className="ebd-stat-lbl">Sent</div>
                    </div>
                    <div className="ebd-stat-card red">
                      <div className="ebd-stat-val">{detail?.total_failed || 0}</div>
                      <div className="ebd-stat-lbl">Failed</div>
                    </div>
                    <div className="ebd-stat-card gray">
                      <div className="ebd-stat-val">{detail?.total_skipped || 0}</div>
                      <div className="ebd-stat-lbl">Skipped</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="ebd-actions">
                    <button className="ebd-btn ebd-btn-warning" onClick={() => doAction('pause')}>
                      <FiPause size={13} /> Pause
                    </button>
                    <button className="ebd-btn ebd-btn-success" onClick={() => doAction('resume')}>
                      <FiPlay size={13} /> Resume
                    </button>
                    <button className="ebd-btn ebd-btn-danger" onClick={() => doAction('cancel')}>
                      <FiX size={13} /> Cancel
                    </button>
                    <button className="ebd-btn ebd-btn-secondary" onClick={() => doAction('retry')}>
                      <FiRefreshCw size={13} /> Retry Failed
                    </button>
                  </div>
                </Section>

                {/* ── Template Snapshot ── */}
                <Section icon={<FiEye size={12} />} title="Template Snapshot Preview">
                  <div className="ebd-subject-box">
                    <div className="ebd-subject-label">Subject Line</div>
                    <div className="ebd-subject-value">{detail?.subject_snapshot || '—'}</div>
                  </div>
                  <div
                    className="ebd-html-preview"
                    dangerouslySetInnerHTML={{ __html: detail?.html_body_snapshot || '<span style="color:#9ca3af;font-size:0.82rem">No HTML preview available</span>' }}
                  />
                </Section>

                {/* ── Recipients ── */}
                <Section
                  icon={<FiUsers size={12} />}
                  title="Recipients"
                  badge={
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                      {recipients.length} recipients
                    </span>
                  }
                >
                  <div className="ebd-table-wrap">
                    <div style={{ overflowX: 'auto' }}>
                      <table className="ebd-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Variables</th>
                            <th>Status</th>
                            <th>Attempts</th>
                            <th>Error</th>
                            <th>Provider Msg ID</th>
                            <th>Sent At</th>
                            <th>Last Attempt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipients.length === 0 ? (
                            <tr className="ebd-empty-row">
                              <td colSpan={9}>No recipients found</td>
                            </tr>
                          ) : recipients.map((r, idx) => (
                            <tr key={r.recipient_id || idx}>
                              <td>
                                <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.82rem' }}>{r.recipient_name || '—'}</div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6b7280', fontSize: '0.8rem' }}>
                                  <FiAtSign size={11} />
                                  {r.recipient_email}
                                </div>
                              </td>
                              <td>
                                <pre className="ebd-json-pre">{JSON.stringify(r.variable_values_json || {}, null, 2)}</pre>
                              </td>
                              <td>{getRecipientPill(r.status)}</td>
                              <td>
                                <span style={{ background: '#f3f4f6', borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>
                                  {r.attempt_count || 0}
                                </span>
                              </td>
                              <td>
                                {r.error_message
                                  ? <div className="ebd-error-text">{r.error_message}</div>
                                  : <span style={{ color: '#9ca3af' }}>—</span>}
                              </td>
                              <td>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: '#6b7280' }}>
                                  {r.provider_message_id || '—'}
                                </span>
                              </td>
                              <td style={{ color: '#6b7280', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                {r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}
                              </td>
                              <td style={{ color: '#6b7280', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                {r.last_attempt_at ? new Date(r.last_attempt_at).toLocaleString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Section>

              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailBroadcastDetails;