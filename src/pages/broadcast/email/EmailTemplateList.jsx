// EmailTemplateList.js (updated with tabs for Static Templates)

import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Form, Spinner, Table, Tabs, Tab } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../../components/header';
import EmailTemplateFormModal from './EmailTemplateFormModal';
import StaticTemplateFormModal from './StaticTemplateFormModal';
import { emailApi, normalizeList, normalizePagination } from './emailApi';

const EmailTemplateList = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [activeTab, setActiveTab] = useState('email-templates');
  
  // Email Templates State
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  
  // Static Templates State
  const [staticLoading, setStaticLoading] = useState(false);
  const [staticRows, setStaticRows] = useState([]);
  const [staticPagination, setStaticPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });
  const [showStaticModal, setShowStaticModal] = useState(false);
  const [staticEditData, setStaticEditData] = useState(null);
  const [staticSearch, setStaticSearch] = useState('');
  const [templateTypeFilter, setTemplateTypeFilter] = useState('');
  const [templateTypes, setTemplateTypes] = useState([]);

  // Fetch Email Templates
  const fetchTemplates = async (page = 1) => {
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

  // Fetch Static Templates
  const fetchStaticTemplates = async (page = 1) => {
    setStaticLoading(true);
    try {
      const params = { 
        page_no: page, 
        limit: staticPagination.limit,
        ...(staticSearch && { search: staticSearch }),
        ...(templateTypeFilter && { template_type: templateTypeFilter })
      };
      const res = await emailApi.listStaticTemplates(params);
      const data = normalizeList(res?.data);
      setStaticRows(data);
      setStaticPagination(normalizePagination(res?.pagination));
      
      // Extract unique template types for filter
      const types = [...new Set(data.map(item => item.template_type))];
      setTemplateTypes(types);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to load static templates');
    } finally {
      setStaticLoading(false);
    }
  };

  useEffect(() => { 
    if (activeTab === 'email-templates') {
      fetchTemplates(); 
    } else {
      fetchStaticTemplates();
    }
  }, [activeTab]);
  
  useEffect(() => { 
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); 
  }, [isMinimized]);

  // Email Template Actions
  const changeStatus = async (row) => {
    try {
      await emailApi.changeTemplateStatus({ template_id: row.template_id, status: row.status === 'active' ? 'inactive' : 'active' });
      toast.success('Template status updated');
      fetchTemplates(pagination.page_no);
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'Failed to change status'); 
    }
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
    } catch (e) { 
      toast.error(e?.response?.data?.message || 'Preview failed'); 
    }
  };

  // Static Template Actions
  const deleteStaticTemplate = async (row) => {
    if (!window.confirm(`Are you sure you want to delete template "${row.template_name}"?`)) return;
    try {
      await emailApi.deleteStaticTemplate({ template_id: row.template_id });
      toast.success('Static template deleted successfully');
      fetchStaticTemplates(staticPagination.page_no);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete template');
    }
  };

  const setDefaultStaticTemplate = async (row) => {
    try {
      await emailApi.setDefaultStaticTemplate({ template_id: row.template_id });
      toast.success('Default template set successfully');
      fetchStaticTemplates(staticPagination.page_no);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to set default template');
    }
  };

  const handleStaticSearch = () => {
    fetchStaticTemplates(1);
  };

  return (
    <div className="min-h-screen bg-light">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <div className={`pt-16 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="container-fluid py-4">
          <Card>
            <Card.Header>
              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-0">
                <Tab eventKey="email-templates" title="Email Templates">
                  <div className="d-flex justify-content-end mb-3 mt-3">
                    <Button onClick={() => { setEditData(null); setShowModal(true); }}>Add Template</Button>
                  </div>
                </Tab>
                <Tab eventKey="static-templates" title="Static Templates">
                  <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
                    <div className="d-flex gap-2">
                      <Form.Control
                        type="text"
                        placeholder="Search by name, subject, or type..."
                        value={staticSearch}
                        onChange={(e) => setStaticSearch(e.target.value)}
                        style={{ width: 300 }}
                      />
                      <Button variant="outline-primary" onClick={handleStaticSearch}>Search</Button>
                      {templateTypeFilter && (
                        <Button variant="outline-secondary" onClick={() => { setTemplateTypeFilter(''); setStaticSearch(''); fetchStaticTemplates(1); }}>
                          Clear Filters
                        </Button>
                      )}
                    </div>
                    <Button onClick={() => { setStaticEditData(null); setShowStaticModal(true); }}>Add Static Template</Button>
                  </div>
                </Tab>
              </Tabs>
            </Card.Header>
            <Card.Body>
              {activeTab === 'email-templates' && (
                <>
                  {loading ? <div className="text-center py-5"><Spinner /></div> : (
                    <>
                      <Table bordered hover responsive>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Subject</th>
                            <th>Variables JSON</th>
                            <th>Status</th>
                            <th>Create Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-4 text-muted">No templates found</td></tr>
                          ) : rows.map((row) => (
                            <tr key={row.template_id}>
                              <td>{row.template_name}</td>
                              <td>{row.subject}</td>
                              <td>
                                <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
                                  {JSON.stringify(row.variables_json || {}, null, 2)}
                                </pre>
                              </td>
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
                          <Button size="sm" disabled={pagination.page_no <= 1} onClick={() => fetchTemplates(pagination.page_no - 1)}>Prev</Button>
                          <Form.Control size="sm" readOnly value={`Page ${pagination.page_no} / ${pagination.total_pages}`} style={{ width: 140 }} />
                          <Button size="sm" disabled={pagination.page_no >= pagination.total_pages} onClick={() => fetchTemplates(pagination.page_no + 1)}>Next</Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {activeTab === 'static-templates' && (
                <>
                  {staticLoading ? <div className="text-center py-5"><Spinner /></div> : (
                    <>
                      <Table bordered hover responsive>
                        <thead>
                          <tr>
                            <th>Template Type</th>
                            <th>Template Name</th>
                            <th>Subject</th>
                            <th>Variables</th>
                            <th>Status</th>
                            <th>Default</th>
                            <th>Create Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staticRows.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-4 text-muted">No static templates found</td></tr>
                          ) : staticRows.map((row) => (
                            <tr key={row.template_id}>
                              <td><Badge bg="info">{row.template_type}</Badge></td>
                              <td>{row.template_name}</td>
                              <td>{row.subject}</td>
                              <td>
                                <span className="badge bg-secondary">
                                  {row.total_variables || row.variables_json?.length || 0} variables
                                </span>
                              </td>
                              <td><Badge bg={row.status === 'active' ? 'success' : 'secondary'}>{row.status}</Badge></td>
                              <td>
                                {row.is_default === 1 ? (
                                  <Badge bg="primary">Default</Badge>
                                ) : (
                                  <Button size="sm" variant="outline-primary" onClick={() => setDefaultStaticTemplate(row)}>
                                    Set Default
                                  </Button>
                                )}
                              </td>
                              <td>{row.create_date ? new Date(row.create_date).toLocaleString() : '-'}</td>
                              <td className="d-flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline-primary" onClick={() => { setStaticEditData(row); setShowStaticModal(true); }}>Edit</Button>
                                <Button size="sm" variant="outline-danger" onClick={() => deleteStaticTemplate(row)}>Delete</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      <div className="d-flex justify-content-between align-items-center">
                        <small>Total: {staticPagination.total}</small>
                        <div className="d-flex align-items-center gap-2">
                          <Button size="sm" disabled={staticPagination.page_no <= 1} onClick={() => fetchStaticTemplates(staticPagination.page_no - 1)}>Prev</Button>
                          <Form.Control size="sm" readOnly value={`Page ${staticPagination.page_no} / ${staticPagination.total_pages}`} style={{ width: 140 }} />
                          <Button size="sm" disabled={staticPagination.page_no >= staticPagination.total_pages} onClick={() => fetchStaticTemplates(staticPagination.page_no + 1)}>Next</Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
      
      {/* Email Template Modal */}
      <EmailTemplateFormModal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        editData={editData} 
        onSuccess={() => fetchTemplates(pagination.page_no)} 
      />
      
      {/* Static Template Modal */}
      <StaticTemplateFormModal 
        show={showStaticModal} 
        onHide={() => setShowStaticModal(false)} 
        editData={staticEditData} 
        onSuccess={() => fetchStaticTemplates(staticPagination.page_no)} 
      />
    </div>
  );
};

export default EmailTemplateList;