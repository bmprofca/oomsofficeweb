import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Spinner, Table, Badge } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import EmailConfigFormModal from './EmailConfigFormModal';
import { emailApi, normalizeList, normalizePagination } from './emailApi';

const EmailConfigList = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchData = async (page = pagination.page_no) => {
    setLoading(true);
    try {
      const res = await emailApi.listConfigs({ page_no: page, limit: pagination.limit });
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
      toast.success('Status updated');
      fetchData();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to update status'); }
  };

  const setDefault = async (row) => {
    try {
      await emailApi.setDefaultConfig({ config_id: row.config_id });
      toast.success('Default config updated');
      fetchData();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to set default'); }
  };

  const testSmtp = async (row) => {
    try {
      await emailApi.testConfig({
        host: row.host,
        port: Number(row.port),
        secure: Number(row.secure) ? 1 : 0,
        username: row.username || row.smtp_username,
        password: row.password,
      });
      toast.success('SMTP test successful');
    } catch (e) { toast.error(e?.response?.data?.message || 'SMTP test failed'); }
  };

  return (
    <div className="min-h-screen bg-light">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <div className={`pt-16 ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
        <div className="container-fluid py-4">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">SMTP Configs</h5>
              <Button onClick={() => { setEditData(null); setShowModal(true); }}>Add New</Button>
            </Card.Header>
            <Card.Body>
              {loading ? <div className="text-center py-5"><Spinner /></div> : (
                <>
                  <Table responsive bordered hover>
                    <thead><tr><th>Name</th><th>Host</th><th>Port</th><th>Username</th><th>From Email</th><th>Default</th><th>Status</th><th>Create Date</th><th>Actions</th></tr></thead>
                    <tbody>
                      {rows.length === 0 ? <tr><td colSpan={9} className="text-center py-4 text-muted">No SMTP configs found</td></tr> : rows.map((row) => (
                        <tr key={row.config_id}>
                          <td>{row.config_name}</td><td>{row.host}</td><td>{row.port}</td><td>{row.username || row.smtp_username}</td><td>{row.from_email}</td>
                          <td>{row.is_default ? <Badge bg="success">Yes</Badge> : <Badge bg="secondary">No</Badge>}</td>
                          <td><Badge bg={row.status === 'active' ? 'success' : 'secondary'}>{row.status}</Badge></td>
                          <td>{row.create_date ? new Date(row.create_date).toLocaleString() : '-'}</td>
                          <td className="d-flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline-primary" onClick={() => { setEditData(row); setShowModal(true); }}>Edit</Button>
                            <Button size="sm" variant="outline-info" onClick={() => testSmtp(row)}>Test</Button>
                            <Button size="sm" variant="outline-success" onClick={() => setDefault(row)}>Set Default</Button>
                            <Button size="sm" variant="outline-warning" onClick={() => updateStatus(row)}>Toggle Status</Button>
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
      <EmailConfigFormModal show={showModal} onHide={() => setShowModal(false)} editData={editData} onSuccess={() => fetchData()} />
    </div>
  );
};

export default EmailConfigList;
