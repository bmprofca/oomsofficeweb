import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import { emailApi, normalizeList } from './emailApi';

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
      if (type === 'pause') await emailApi.pauseBroadcast(payload);
      if (type === 'resume') await emailApi.resumeBroadcast(payload);
      if (type === 'cancel') await emailApi.cancelBroadcast(payload);
      if (type === 'retry') await emailApi.retryFailed(payload);
      toast.success(`Broadcast ${type} success`);
      load();
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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Broadcast Details</h5>
            <Button variant="outline-secondary" onClick={() => navigate('/broadcast/email')}>Back</Button>
          </div>
          {loading ? <div className="text-center py-5"><Spinner /></div> : (
            <>
              <Card className="mb-3">
                <Card.Body>
                  <Row>
                    <Col md={4}><strong>Name:</strong> {detail?.broadcast_name || '-'}</Col>
                    <Col md={4}><strong>Status:</strong> <Badge bg="info">{detail?.status || '-'}</Badge></Col>
                    <Col md={4}><strong>Schedule:</strong> {detail?.schedule_type || '-'} {detail?.scheduled_at ? `(${new Date(detail.scheduled_at).toLocaleString()})` : ''}</Col>
                  </Row>
                  <Row className="mt-3">
                    <Col md={2}><Card className="text-center"><Card.Body>Total<br /><strong>{detail?.total_recipients || 0}</strong></Card.Body></Card></Col>
                    <Col md={2}><Card className="text-center"><Card.Body>Pending<br /><strong>{detail?.total_pending || 0}</strong></Card.Body></Card></Col>
                    <Col md={2}><Card className="text-center"><Card.Body>Sent<br /><strong>{detail?.total_sent || 0}</strong></Card.Body></Card></Col>
                    <Col md={2}><Card className="text-center"><Card.Body>Failed<br /><strong>{detail?.total_failed || 0}</strong></Card.Body></Card></Col>
                    <Col md={2}><Card className="text-center"><Card.Body>Skipped<br /><strong>{detail?.total_skipped || 0}</strong></Card.Body></Card></Col>
                  </Row>
                  <div className="d-flex gap-2 mt-3">
                    <Button size="sm" variant="outline-warning" onClick={() => doAction('pause')}>Pause</Button>
                    <Button size="sm" variant="outline-success" onClick={() => doAction('resume')}>Resume</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => doAction('cancel')}>Cancel</Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => doAction('retry')}>Retry Failed</Button>
                  </div>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header><strong>Template Snapshot Preview</strong></Card.Header>
                <Card.Body>
                  <p><strong>Subject:</strong> {detail?.subject_snapshot || '-'}</p>
                  <div className="border rounded p-2" dangerouslySetInnerHTML={{ __html: detail?.html_body_snapshot || '' }} />
                </Card.Body>
              </Card>

              <Card>
                <Card.Header><strong>Recipients</strong></Card.Header>
                <Card.Body>
                  <Table responsive bordered hover>
                    <thead><tr><th>Name</th><th>Email</th><th>Variables</th><th>Status</th><th>Attempt</th><th>Error</th><th>Provider Message ID</th><th>Sent At</th><th>Last Attempt</th></tr></thead>
                    <tbody>
                      {recipients.length === 0 ? <tr><td colSpan={9} className="text-center text-muted py-4">No recipients found</td></tr> : recipients.map((r, idx) => (
                        <tr key={r.recipient_id || idx}>
                          <td>{r.recipient_name}</td>
                          <td>{r.recipient_email}</td>
                          <td><pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(r.variable_values_json || {}, null, 2)}</pre></td>
                          <td>{r.status}</td>
                          <td>{r.attempt_count || 0}</td>
                          <td>{r.error_message || '-'}</td>
                          <td>{r.provider_message_id || '-'}</td>
                          <td>{r.sent_at ? new Date(r.sent_at).toLocaleString() : '-'}</td>
                          <td>{r.last_attempt_at ? new Date(r.last_attempt_at).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailBroadcastDetails;
