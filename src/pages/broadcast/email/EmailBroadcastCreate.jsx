import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import { emailApi, normalizeList } from './emailApi';

const newRecipient = () => ({ recipient_name: '', recipient_email: '', variable_values_json: '{}' });
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmailBroadcastCreate = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    config_id: '',
    template_id: '',
    broadcast_name: '',
    schedule_type: 'now',
    scheduled_at: '',
    timezone: 'Asia/Kolkata',
    global_variables_json: '{}',
  });
  const [recipients, setRecipients] = useState([newRecipient()]);
  const [bulkInput, setBulkInput] = useState('');

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    (async () => {
      try {
        const [c, t] = await Promise.all([emailApi.listConfigs({ page_no: 1, limit: 100 }), emailApi.listTemplates({ page_no: 1, limit: 100 })]);
        setConfigs(normalizeList(c?.data).filter((x) => x.status === 'active'));
        setTemplates(normalizeList(t?.data).filter((x) => x.status === 'active'));
      } catch (e) {
        toast.error(e?.response?.data?.message || 'Failed to load dropdown data');
      }
    })();
  }, []);

  const formErrors = useMemo(() => {
    const err = {};
    if (!form.config_id) err.config_id = 'SMTP config required';
    if (!form.template_id) err.template_id = 'Template required';
    if (!form.broadcast_name) err.broadcast_name = 'Broadcast name required';
    if (form.schedule_type === 'scheduled' && !form.scheduled_at) err.scheduled_at = 'Scheduled time required';
    recipients.forEach((r, i) => {
      if (!r.recipient_name) err[`recipient_name_${i}`] = true;
      if (!emailRegex.test(r.recipient_email || '')) err[`recipient_email_${i}`] = true;
      try { JSON.parse(r.variable_values_json || '{}'); } catch { err[`recipient_json_${i}`] = true; }
    });
    try { JSON.parse(form.global_variables_json || '{}'); } catch { err.global_variables_json = 'Invalid JSON'; }
    return err;
  }, [form, recipients]);

  const addFromText = () => {
    if (!bulkInput.trim()) return;
    const lines = bulkInput.trim().split('\n');
    const mapped = lines.map((line) => {
      const [recipient_name, recipient_email] = line.split(',').map((x) => x.trim());
      return { recipient_name: recipient_name || '', recipient_email: recipient_email || '', variable_values_json: '{}' };
    });
    setRecipients((prev) => [...prev, ...mapped]);
    setBulkInput('');
  };

  const submit = async () => {
    if (Object.keys(formErrors).length) {
      toast.error('Please fix validation errors');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        config_id: form.config_id,
        template_id: form.template_id,
        broadcast_name: form.broadcast_name,
        schedule_type: form.schedule_type,
        scheduled_at: form.schedule_type === 'scheduled' ? form.scheduled_at : null,
        timezone: form.timezone || 'Asia/Kolkata',
        global_variables_json: JSON.parse(form.global_variables_json || '{}'),
        recipients: recipients.map((r) => ({
          recipient_name: r.recipient_name,
          recipient_email: r.recipient_email,
          variable_values_json: JSON.parse(r.variable_values_json || '{}'),
        })),
      };
      const res = await emailApi.createBroadcast(payload);
      toast.success(res?.message || 'Broadcast created');
      navigate('/broadcast/email');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to create broadcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <div className={`pt-16 ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
        <div className="container-fluid py-4">
          <Card className="mb-3"><Card.Header><strong>Section A: Basic</strong></Card.Header><Card.Body>
            <Row className="g-3">
              <Col md={4}><Form.Label>SMTP Config</Form.Label><Form.Select value={form.config_id} onChange={(e) => setForm({ ...form, config_id: e.target.value })} isInvalid={!!formErrors.config_id}><option value="">Select</option>{configs.map((c) => <option key={c.config_id} value={c.config_id}>{c.config_name}</option>)}</Form.Select></Col>
              <Col md={4}><Form.Label>Template</Form.Label><Form.Select value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })} isInvalid={!!formErrors.template_id}><option value="">Select</option>{templates.map((t) => <option key={t.template_id} value={t.template_id}>{t.template_name}</option>)}</Form.Select></Col>
              <Col md={4}><Form.Label>Broadcast Name</Form.Label><Form.Control value={form.broadcast_name} onChange={(e) => setForm({ ...form, broadcast_name: e.target.value })} isInvalid={!!formErrors.broadcast_name} /></Col>
            </Row>
          </Card.Body></Card>

          <Card className="mb-3"><Card.Header><strong>Section B: Schedule & Variables</strong></Card.Header><Card.Body>
            <Row className="g-3">
              <Col md={3}><Form.Label>Schedule Type</Form.Label><Form.Select value={form.schedule_type} onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}><option value="now">Now</option><option value="scheduled">Scheduled</option></Form.Select></Col>
              <Col md={4}><Form.Label>Scheduled At</Form.Label><Form.Control type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} disabled={form.schedule_type === 'now'} isInvalid={!!formErrors.scheduled_at} /></Col>
              <Col md={3}><Form.Label>Timezone</Form.Label><Form.Control value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></Col>
              <Col md={12}><Form.Label>Global Variables JSON</Form.Label><Form.Control as="textarea" rows={3} value={form.global_variables_json} onChange={(e) => setForm({ ...form, global_variables_json: e.target.value })} isInvalid={!!formErrors.global_variables_json} /></Col>
            </Row>
          </Card.Body></Card>

          <Card><Card.Header className="d-flex justify-content-between align-items-center"><strong>Section C: Recipients</strong><Button size="sm" onClick={() => setRecipients((p) => [...p, newRecipient()])}>Add Row</Button></Card.Header><Card.Body>
            <Row className="g-2 mb-3">
              <Col md={10}><Form.Control as="textarea" rows={2} placeholder="Optional import: name,email per line" value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} /></Col>
              <Col md={2}><Button className="w-100 h-100" variant="outline-primary" onClick={addFromText}>Import</Button></Col>
            </Row>
            <Table responsive bordered>
              <thead><tr><th>Name</th><th>Email</th><th>Variable Values JSON</th><th>Action</th></tr></thead>
              <tbody>
                {recipients.map((r, idx) => (
                  <tr key={idx}>
                    <td><Form.Control value={r.recipient_name} isInvalid={!!formErrors[`recipient_name_${idx}`]} onChange={(e) => { const next = [...recipients]; next[idx].recipient_name = e.target.value; setRecipients(next); }} /></td>
                    <td><Form.Control value={r.recipient_email} isInvalid={!!formErrors[`recipient_email_${idx}`]} onChange={(e) => { const next = [...recipients]; next[idx].recipient_email = e.target.value; setRecipients(next); }} /></td>
                    <td><Form.Control value={r.variable_values_json} isInvalid={!!formErrors[`recipient_json_${idx}`]} onChange={(e) => { const next = [...recipients]; next[idx].variable_values_json = e.target.value; setRecipients(next); }} /></td>
                    <td><Button size="sm" variant="outline-danger" onClick={() => setRecipients((p) => p.filter((_, i) => i !== idx))}>Remove</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" onClick={() => navigate('/broadcast/email')}>Cancel</Button>
              <Button onClick={submit} disabled={loading}>{loading ? <Spinner size="sm" /> : 'Create Broadcast'}</Button>
            </div>
          </Card.Body></Card>
        </div>
      </div>
    </div>
  );
};

export default EmailBroadcastCreate;
