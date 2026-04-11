import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import { emailApi, normalizeList, normalizePagination } from './emailApi';

const EmailBroadcastList = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });

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
      if (type === 'pause') await emailApi.pauseBroadcast(payload);
      if (type === 'resume') await emailApi.resumeBroadcast(payload);
      if (type === 'cancel') await emailApi.cancelBroadcast(payload);
      if (type === 'retry') await emailApi.retryFailed(payload);
      toast.success(`Broadcast ${type} success`);
      fetchData(pagination.page_no);
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to ${type} broadcast`);
    }
  };

  return (
    <div className="min-h-screen bg-light">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <div className={`pt-16 ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
        <div className="container-fluid py-4">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Email Broadcasts</h5>
              <Button onClick={() => navigate('/broadcast/email/create')}>Create Broadcast</Button>
            </Card.Header>
            <Card.Body>
              {loading ? <div className="text-center py-5"><Spinner /></div> : (
                <>
                  <Table responsive bordered hover>
                    <thead><tr><th>Name</th><th>Config</th><th>Template</th><th>Schedule</th><th>Scheduled At</th><th>Status</th><th>Counts</th><th>Create Date</th><th>Actions</th></tr></thead>
                    <tbody>
                      {rows.length === 0 ? <tr><td colSpan={9} className="text-center text-muted py-4">No broadcasts found</td></tr> : rows.map((row) => (
                        <tr key={row.broadcast_id}>
                          <td>{row.broadcast_name}</td>
                          <td>{row.config_id}</td>
                          <td>{row.template_id}</td>
                          <td>{row.schedule_type}</td>
                          <td>{row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : '-'}</td>
                          <td><Badge bg={row.status === 'running' ? 'success' : 'secondary'}>{row.status}</Badge></td>
                          <td>
                            T:{row.total_recipients || 0} P:{row.total_pending || 0} S:{row.total_sent || 0}
                            <br />F:{row.total_failed || 0} K:{row.total_skipped || 0}
                          </td>
                          <td>{row.create_date ? new Date(row.create_date).toLocaleString() : '-'}</td>
                          <td className="d-flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline-primary" onClick={() => navigate(`/broadcast/email/details/${row.broadcast_id}`)}>Details</Button>
                            <Button size="sm" variant="outline-warning" onClick={() => doAction('pause', row)}>Pause</Button>
                            <Button size="sm" variant="outline-success" onClick={() => doAction('resume', row)}>Resume</Button>
                            <Button size="sm" variant="outline-danger" onClick={() => doAction('cancel', row)}>Cancel</Button>
                            <Button size="sm" variant="outline-secondary" onClick={() => doAction('retry', row)}>Retry Failed</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="d-flex justify-content-between align-items-center">
                    <small>Total: {pagination.total}</small>
                    <div className="d-flex align-items-center gap-2">
                      <Button size="sm" disabled={pagination.page_no <= 1} onClick={() => fetchData(pagination.page_no - 1)}>Prev</Button>
                      <Form.Control size="sm" readOnly value={`Page ${pagination.page_no} / ${pagination.total_pages}`} style={{ width: 140 }} />
                      <Button size="sm" disabled={pagination.page_no >= pagination.total_pages} onClick={() => fetchData(pagination.page_no + 1)}>Next</Button>
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
