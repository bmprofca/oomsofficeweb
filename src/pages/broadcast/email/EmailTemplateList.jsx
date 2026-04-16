import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import EmailTemplateFormModal from './EmailTemplateFormModal';
import { emailApi, normalizeList, normalizePagination } from './emailApi';

const EmailTemplateList = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await emailApi.listTemplates({ page_no: page, limit: pagination.limit });
      setRows(normalizeList(res?.data));
      setPagination(normalizePagination(res?.pagination));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); }, [isMinimized]);

  const changeStatus = async (row) => {
    try {
      await emailApi.changeTemplateStatus({ template_id: row.template_id, status: row.status === 'active' ? 'inactive' : 'active' });
      toast.success('Template status updated');
      fetchData(pagination.page_no);
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to change status'); }
  };

  const preview = async (row) => {
    try {
      const res = await emailApi.previewTemplate({
        subject: row.subject,
        html_body: row.html_body || '',
        text_body: row.text_body || '',
        variables: {},
      });
      toast.success('Preview generated');
      console.log('Template preview', res);
    } catch (e) { toast.error(e?.response?.data?.message || 'Preview failed'); }
  };

  return (
    <div className="min-h-screen bg-light">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <div className={`pt-16 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="container-fluid py-4">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Email Templates</h5>
              <Button onClick={() => { setEditData(null); setShowModal(true); }}>Add Template</Button>
            </Card.Header>
            <Card.Body>
              {loading ? <div className="text-center py-5"><Spinner /></div> : (
                <>
                  <Table bordered hover responsive>
                    <thead><tr><th>Name</th><th>Subject</th><th>Variables JSON</th><th>Status</th><th>Create Date</th><th>Actions</th></tr></thead>
                    <tbody>
                      {rows.length === 0 ? <tr><td colSpan={6} className="text-center py-4 text-muted">No templates found</td></tr> : rows.map((row) => (
                        <tr key={row.template_id}>
                          <td>{row.template_name}</td>
                          <td>{row.subject}</td>
                          <td><pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(row.variables_json || {}, null, 2)}</pre></td>
                          <td><Badge bg={row.status === 'active' ? 'success' : 'secondary'}>{row.status}</Badge></td>
                          <td>{row.create_date ? new Date(row.create_date).toLocaleString() : '-'}</td>
                          <td className="d-flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline-primary" onClick={() => { setEditData(row); setShowModal(true); }}>Edit</Button>
                            <Button size="sm" variant="outline-info" onClick={() => preview(row)}>Preview</Button>
                            <Button size="sm" variant="outline-warning" onClick={() => changeStatus(row)}>Toggle Status</Button>
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
      <EmailTemplateFormModal show={showModal} onHide={() => setShowModal(false)} editData={editData} onSuccess={() => fetchData(pagination.page_no)} />
    </div>
  );
};

export default EmailTemplateList;
