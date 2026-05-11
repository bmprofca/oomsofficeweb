import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Button, Card, Col, Form, Row, Spinner, Table, Badge, Modal, Tab, Tabs, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaUsers, FaLayerGroup, FaTasks, FaPlus, FaTrash, FaFileImport, FaSearch, FaEnvelope, FaPaperPlane, FaCheckDouble } from 'react-icons/fa';
import { Header, Sidebar } from '../../../components/header';
import { emailApi, normalizeList } from './emailApi';
import axios from 'axios';
import API_BASE from '../../../utils/api-controller';
import getHeaders from '../../../utils/get-headers';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper function
const newRecipient = () => ({ recipient_name: '', recipient_email: '', variable_values_json: '{}' });

const EmailBroadcastCreate = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('manual'); // manual, clients, groups, services
  
  // Dropdown data
  const [configs, setConfigs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [services, setServices] = useState([]);
  
  // Search states
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectAllClients, setSelectAllClients] = useState(false);
  const [allClients, setAllClients] = useState([]);
  const [loadingAllClients, setLoadingAllClients] = useState(false);
  
  const [groupSearch, setGroupSearch] = useState('');
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  
  const [serviceSearch, setServiceSearch] = useState('');
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    config_id: '',
    fallback_config_id: '',
    template_id: '',
    broadcast_name: '',
    schedule_type: 'now',
    scheduled_at: '',
    timezone: 'Asia/Kolkata',
    daily_limit: 1000,
    global_variables_json: '{}',
  });
  
  const [recipients, setRecipients] = useState([newRecipient()]);
  const [bulkInput, setBulkInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Load initial data
  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const headers = getHeaders();
      const [c, t, g, s] = await Promise.all([
        emailApi.listConfigs({ page_no: 1, limit: 100 }),
        emailApi.listTemplates({ page_no: 1, limit: 100 }),
        axios.get(`${API_BASE}/group/list?page=1&limit=100`, { headers }),
        axios.get(`${API_BASE}/service/list?page_no=1&limit=100`, { headers })
      ]);
      setConfigs(normalizeList(c?.data).filter(x => x.status === 'active'));
      setTemplates(normalizeList(t?.data).filter(x => x.status === 'active'));
      setGroups(g?.data?.data || []);
      setFilteredGroups(g?.data?.data || []);
      setServices(s?.data?.data || []);
      setFilteredServices(s?.data?.data || []);
    } catch (e) {
      toast.error('Failed to load initial data');
    }
  };

  // Load all clients for select all
  const loadAllClients = async () => {
    setLoadingAllClients(true);
    try {
      const headers = getHeaders();
      let allClientData = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const res = await axios.get(`${API_BASE}/client/list?page=${page}&limit=100`, { headers });
        const clientsData = res?.data?.data || [];
        allClientData = [...allClientData, ...clientsData];
        hasMore = !res?.data?.pagination?.is_last_page;
        page++;
      }
      
      // Filter clients with email
      const clientsWithEmail = allClientData.filter(c => c.email && emailRegex.test(c.email));
      setAllClients(clientsWithEmail);
      
      if (selectAllClients) {
        setSelectedClients(clientsWithEmail);
      }
      
      toast.success(`Loaded ${clientsWithEmail.length} clients with email`);
    } catch (e) {
      toast.error('Failed to load all clients');
    } finally {
      setLoadingAllClients(false);
    }
  };

  // Handle select all clients
  const handleSelectAllClients = async () => {
    if (selectAllClients) {
      setSelectAllClients(false);
      setSelectedClients([]);
    } else {
      setSelectAllClients(true);
      if (allClients.length === 0) {
        await loadAllClients();
      } else {
        setSelectedClients(allClients);
      }
    }
  };

  // Search clients using /client/search endpoint
  const searchClients = useCallback(async () => {
    if (!clientSearch.trim()) {
      setClients([]);
      return;
    }
    setLoadingClients(true);
    try {
      const headers = getHeaders();
      const res = await axios.get(`${API_BASE}/client/search?search=${encodeURIComponent(clientSearch)}`, { headers });
      const searchResults = res?.data?.data || [];
      // Filter only clients with email
      const clientsWithEmail = searchResults.filter(c => c.email && emailRegex.test(c.email));
      setClients(clientsWithEmail);
    } catch (e) {
      toast.error('Failed to search clients');
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, [clientSearch]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (clientSearch) {
        searchClients();
      } else {
        setClients([]);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [clientSearch, searchClients]);

  // Load groups with pagination
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const headers = getHeaders();
      const res = await axios.get(`${API_BASE}/group/list?search=${encodeURIComponent(groupSearch)}&page=1&limit=100`, { headers });
      setGroups(res?.data?.data || []);
      setFilteredGroups(res?.data?.data || []);
    } catch (e) {
      toast.error('Failed to load groups');
    } finally {
      setLoadingGroups(false);
    }
  }, [groupSearch]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Filter groups locally
  useEffect(() => {
    if (groupSearch) {
      setFilteredGroups(groups.filter(g => g.name?.toLowerCase().includes(groupSearch.toLowerCase())));
    } else {
      setFilteredGroups(groups);
    }
  }, [groupSearch, groups]);

  // Load services with pagination
  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const headers = getHeaders();
      const res = await axios.get(`${API_BASE}/service/list?search=${encodeURIComponent(serviceSearch)}&page_no=1&limit=100`, { headers });
      setServices(res?.data?.data || []);
      setFilteredServices(res?.data?.data || []);
    } catch (e) {
      toast.error('Failed to load services');
    } finally {
      setLoadingServices(false);
    }
  }, [serviceSearch]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Filter services locally
  useEffect(() => {
    if (serviceSearch) {
      setFilteredServices(services.filter(s => s.name?.toLowerCase().includes(serviceSearch.toLowerCase())));
    } else {
      setFilteredServices(services);
    }
  }, [serviceSearch, services]);

  // Get valid recipients for manual tab
  const getValidRecipients = useCallback(() => {
    return recipients.filter(r => r.recipient_email && emailRegex.test(r.recipient_email));
  }, [recipients]);

  // Build recipients array from selected clients
  const buildRecipientsFromClients = useCallback(() => {
    return selectedClients.map(client => ({
      recipient_name: client.name || client.username,
      recipient_email: client.email,
      variable_values_json: JSON.stringify({
        name: client.name || client.username,
        username: client.username,
        mobile: client.mobile || '',
        city: client.city || '',
        state: client.state || '',
        firms: client.firms?.map(f => f.firm_name).join(', ') || ''
      })
    }));
  }, [selectedClients]);

  // Build recipients array from selected groups
  const buildRecipientsFromGroups = useCallback(() => {
    // For groups, we need to fetch all clients in the group
    // This would require an API call to get group members
    // For now, we'll just store group_ids and handle on backend
    return [];
  }, [selectedGroups]);

  // Validation
  const formErrors = useMemo(() => {
    const err = {};
    if (!form.config_id) err.config_id = 'SMTP config required';
    if (!form.template_id) err.template_id = 'Template required';
    if (!form.broadcast_name) err.broadcast_name = 'Broadcast name required';
    if (form.schedule_type === 'scheduled' && !form.scheduled_at) err.scheduled_at = 'Scheduled time required';
    if (form.daily_limit < 1 || form.daily_limit > 100000) err.daily_limit = 'Daily limit must be between 1 and 100000';
    
    if (activeTab === 'manual') {
      const validRecipients = getValidRecipients();
      if (validRecipients.length === 0) {
        err.recipients = 'At least one valid recipient with email is required';
      }
      recipients.forEach((r, i) => {
        if (!r.recipient_name) err[`recipient_name_${i}`] = true;
        if (r.recipient_email && !emailRegex.test(r.recipient_email)) err[`recipient_email_${i}`] = true;
        try { JSON.parse(r.variable_values_json || '{}'); } catch { err[`recipient_json_${i}`] = true; }
      });
    } else if (activeTab === 'clients' && selectedClients.length === 0) {
      err.recipients = 'Select at least one client';
    } else if (activeTab === 'groups' && selectedGroups.length === 0) {
      err.recipients = 'Select at least one group';
    } else if (activeTab === 'services' && selectedServices.length === 0) {
      err.recipients = 'Select at least one service';
    }
    
    try { JSON.parse(form.global_variables_json || '{}'); } catch { err.global_variables_json = 'Invalid JSON'; }
    return err;
  }, [form, recipients, activeTab, selectedClients, selectedGroups, selectedServices, getValidRecipients]);

  // Build payload for broadcast/create endpoint
  const buildPayload = () => {
    const payload = {
      config_id: form.config_id,
      template_id: form.template_id,
      broadcast_name: form.broadcast_name,
      schedule_type: form.schedule_type,
      daily_limit: form.daily_limit,
      timezone: form.timezone,
      global_variables_json: JSON.parse(form.global_variables_json || '{}'),
    };
    
    // Add optional fields
    if (form.fallback_config_id) payload.fallback_config_id = form.fallback_config_id;
    if (form.schedule_type === 'scheduled') payload.scheduled_at = form.scheduled_at;
    
    // Build recipients array based on active tab
    let recipientsList = [];
    
    if (activeTab === 'manual') {
      recipientsList = getValidRecipients().map(r => ({
        recipient_name: r.recipient_name,
        recipient_email: r.recipient_email,
        variable_values_json: JSON.parse(r.variable_values_json || '{}')
      }));
    } else if (activeTab === 'clients') {
      // Build recipients from selected clients
      recipientsList = selectedClients.map(client => ({
        recipient_name: client.name || client.username,
        recipient_email: client.email,
        variable_values_json: {
          name: client.name || client.username,
          username: client.username,
          mobile: client.mobile || '',
          city: client.city || '',
          state: client.state || '',
          firms: client.firms?.map(f => f.firm_name).join(', ') || ''
        }
      }));
    } else if (activeTab === 'groups') {
      // For groups, we need to get all clients in the group
      // This will be handled by backend when we pass group_ids
      // For now, we'll show a message
      toast.error('Group selection requires backend processing. Please use client selection for now.');
      return null;
    } else if (activeTab === 'services') {
      toast.error('Service selection requires backend processing. Please use client selection for now.');
      return null;
    }
    
    if (recipientsList.length === 0) {
      toast.error('No valid recipients selected');
      return null;
    }
    
    payload.recipients = recipientsList;
    
    return payload;
  };

  // Submit broadcast
  const submit = async () => {
    // Additional validation for manual tab
    if (activeTab === 'manual') {
      const validRecipients = getValidRecipients();
      if (validRecipients.length === 0) {
        toast.error('Please add at least one valid recipient with email address');
        return;
      }
    }
    
    if (activeTab === 'clients' && selectedClients.length === 0) {
      toast.error('Please select at least one client');
      return;
    }
    
    if (Object.keys(formErrors).length) {
      toast.error('Please fix validation errors');
      return;
    }
    
    setLoading(true);
    try {
      const payload = buildPayload();
      if (!payload) {
        setLoading(false);
        return;
      }
      
      console.log('Sending payload:', payload);
      
      const res = await emailApi.createBroadcast(payload);
      toast.success(res?.message || 'Broadcast created successfully');
      
      if (form.schedule_type === 'now') {
        toast.success('Emails are being sent in the background');
      } else {
        toast.success(`Broadcast scheduled for ${form.scheduled_at}`);
      }
      
      navigate('/broadcast/email');
    } catch (e) {
      console.error('Error:', e.response?.data);
      toast.error(e?.response?.data?.message || e.message || 'Failed to create broadcast');
    } finally {
      setLoading(false);
    }
  };

  // Preview
  const handlePreview = async () => {
    if (!form.template_id) {
      toast.error('Please select a template first');
      return;
    }
    try {
      const template = templates.find(t => t.template_id === form.template_id);
      setPreviewData({
        subject: template?.subject,
        html_body: template?.html_body,
        text_body: template?.text_body
      });
      setShowPreview(true);
    } catch (e) {
      toast.error('Failed to load preview');
    }
  };

  // Add from text
  const addFromText = () => {
    if (!bulkInput.trim()) return;
    const lines = bulkInput.trim().split('\n');
    const mapped = lines.map((line) => {
      const [recipient_name, recipient_email] = line.split(',').map((x) => x.trim());
      return { recipient_name: recipient_name || '', recipient_email: recipient_email || '', variable_values_json: '{}' };
    }).filter(r => r.recipient_email && emailRegex.test(r.recipient_email));
    
    if (mapped.length === 0) {
      toast.error('No valid email addresses found in import');
      return;
    }
    
    setRecipients((prev) => [...prev, ...mapped]);
    setBulkInput('');
    toast.success(`Added ${mapped.length} valid recipient(s)`);
  };

  // Get summary text
  const getRecipientSummary = () => {
    if (activeTab === 'manual') {
      const validCount = getValidRecipients().length;
      return `${validCount} valid recipient(s)${recipients.length !== validCount ? ` (${recipients.length - validCount} invalid)` : ''}`;
    }
    if (activeTab === 'clients') return `${selectedClients.length} client(s) selected`;
    if (activeTab === 'groups') return `${selectedGroups.length} group(s) selected`;
    if (activeTab === 'services') return `${selectedServices.length} service(s) selected`;
    return 'No recipients selected';
  };

  return (
    <div className="min-h-screen bg-light">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <div className={`pt-16 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="container-fluid py-4">
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong><FaEnvelope className="me-2" />Create Email Broadcast</strong>
              <div>
                <Badge bg="info" className="me-2">Email Broadcast API</Badge>
                <Badge bg="success">Send to Clients</Badge>
              </div>
            </Card.Header>
          </Card>

          {/* Basic Information */}
          <Card className="mb-3">
            <Card.Header><strong>📧 Basic Information</strong></Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label>SMTP Config <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    value={form.config_id} 
                    onChange={(e) => setForm({ ...form, config_id: e.target.value })} 
                    isInvalid={!!formErrors.config_id}
                  >
                    <option value="">Select Primary Config</option>
                    {configs.map((c) => <option key={c.config_id} value={c.config_id}>{c.config_name}</option>)}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label>Fallback Config</Form.Label>
                  <Form.Select 
                    value={form.fallback_config_id} 
                    onChange={(e) => setForm({ ...form, fallback_config_id: e.target.value })}
                  >
                    <option value="">No Fallback</option>
                    {configs.filter(c => c.config_id !== form.config_id).map((c) => 
                      <option key={c.config_id} value={c.config_id}>{c.config_name}</option>
                    )}
                  </Form.Select>
                  <Form.Text muted>Optional backup SMTP if primary fails</Form.Text>
                </Col>
                <Col md={4}>
                  <Form.Label>Template <span className="text-danger">*</span></Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Select 
                      value={form.template_id} 
                      onChange={(e) => setForm({ ...form, template_id: e.target.value })} 
                      isInvalid={!!formErrors.template_id}
                      className="flex-grow-1"
                    >
                      <option value="">Select Template</option>
                      {templates.map((t) => <option key={t.template_id} value={t.template_id}>{t.template_name}</option>)}
                    </Form.Select>
                    <Button variant="outline-secondary" onClick={handlePreview} disabled={!form.template_id}>
                      Preview
                    </Button>
                  </div>
                </Col>
              </Row>
              <Row className="g-3 mt-2">
                <Col md={6}>
                  <Form.Label>Broadcast Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    value={form.broadcast_name} 
                    onChange={(e) => setForm({ ...form, broadcast_name: e.target.value })} 
                    isInvalid={!!formErrors.broadcast_name}
                    placeholder="Enter broadcast name"
                  />
                </Col>
                <Col md={3}>
                  <Form.Label>Daily Limit</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={form.daily_limit} 
                    onChange={(e) => setForm({ ...form, daily_limit: parseInt(e.target.value) || 1000 })}
                    min="1"
                    max="100000"
                  />
                  <Form.Text muted>Max emails per day</Form.Text>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Schedule Section */}
          <Card className="mb-3">
            <Card.Header><strong>⏰ Schedule & Variables</strong></Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={3}>
                  <Form.Label>Schedule Type</Form.Label>
                  <Form.Select 
                    value={form.schedule_type} 
                    onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}
                  >
                    <option value="now">Send Now</option>
                    <option value="scheduled">Schedule for Later</option>
                  </Form.Select>
                </Col>
                {form.schedule_type === 'scheduled' && (
                  <>
                    <Col md={4}>
                      <Form.Label>Schedule Date & Time <span className="text-danger">*</span></Form.Label>
                      <Form.Control 
                        type="datetime-local" 
                        value={form.scheduled_at} 
                        onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                        isInvalid={!!formErrors.scheduled_at}
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Label>Timezone</Form.Label>
                      <Form.Select 
                        value={form.timezone} 
                        onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                      >
                        <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
                        <option value="America/New_York">EST (America/New_York)</option>
                        <option value="Europe/London">GMT (Europe/London)</option>
                        <option value="Asia/Dubai">GST (Asia/Dubai)</option>
                        <option value="Australia/Sydney">AEST (Australia/Sydney)</option>
                      </Form.Select>
                    </Col>
                  </>
                )}
                <Col md={12}>
                  <Form.Label>Global Variables JSON</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={2} 
                    value={form.global_variables_json} 
                    onChange={(e) => setForm({ ...form, global_variables_json: e.target.value })}
                    isInvalid={!!formErrors.global_variables_json}
                    placeholder='{"company": "ACME Corp", "year": "2026"}'
                  />
                  <Form.Text muted>These variables will be available in all emails</Form.Text>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Recipients Section with Tabs */}
          <Card className="mb-3">
            <Card.Header>
              <strong><FaUsers className="me-2" />Recipients Selection</strong>
              <Badge bg="secondary" className="ms-2">{getRecipientSummary()}</Badge>
            </Card.Header>
            <Card.Body>
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
              >
                {/* Manual Entry Tab */}
                <Tab eventKey="manual" title={<span><FaEnvelope className="me-1" /> Manual Entry</span>}>
                  <div className="mb-3">
                    <InputGroup>
                      <Form.Control 
                        as="textarea" 
                        rows={2} 
                        placeholder="Optional: Import multiple recipients (name,email per line)&#10;John Doe,john@example.com&#10;Jane Smith,jane@example.com" 
                        value={bulkInput} 
                        onChange={(e) => setBulkInput(e.target.value)} 
                      />
                      <Button variant="outline-primary" onClick={addFromText}>
                        <FaFileImport /> Import
                      </Button>
                    </InputGroup>
                    <Form.Text muted>CSV format: name,email (one per line)</Form.Text>
                  </div>
                  
                  {getValidRecipients().length === 0 && (
                    <div className="alert alert-warning">
                      <strong>No valid recipients!</strong> Please add at least one recipient with a valid email address.
                    </div>
                  )}
                  
                  <Table responsive bordered hover>
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Email <span className="text-danger">*</span></th>
                        <th>Variables JSON</th>
                        <th style={{ width: 50 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map((r, idx) => (
                        <tr key={idx} className={!r.recipient_email || !emailRegex.test(r.recipient_email) ? 'table-danger' : ''}>
                          <td>
                            <Form.Control 
                              size="sm"
                              value={r.recipient_name} 
                              isInvalid={!!formErrors[`recipient_name_${idx}`]} 
                              onChange={(e) => { 
                                const next = [...recipients]; 
                                next[idx].recipient_name = e.target.value; 
                                setRecipients(next); 
                              }} 
                              placeholder="Recipient name"
                            />
                          </td>
                          <td>
                            <Form.Control 
                              size="sm"
                              value={r.recipient_email} 
                              isInvalid={!!formErrors[`recipient_email_${idx}`] || (r.recipient_email && !emailRegex.test(r.recipient_email))} 
                              onChange={(e) => { 
                                const next = [...recipients]; 
                                next[idx].recipient_email = e.target.value; 
                                setRecipients(next); 
                              }} 
                              placeholder="email@example.com"
                            />
                            {r.recipient_email && !emailRegex.test(r.recipient_email) && (
                              <Form.Text className="text-danger">Invalid email format</Form.Text>
                            )}
                          </td>
                          <td>
                            <Form.Control 
                              size="sm"
                              value={r.variable_values_json} 
                              isInvalid={!!formErrors[`recipient_json_${idx}`]} 
                              onChange={(e) => { 
                                const next = [...recipients]; 
                                next[idx].variable_values_json = e.target.value; 
                                setRecipients(next); 
                              }} 
                              placeholder='{"name": "John"}'
                            />
                          </td>
                          <td>
                            <Button 
                              size="sm" 
                              variant="outline-danger" 
                              onClick={() => setRecipients((p) => p.filter((_, i) => i !== idx))}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <Button 
                    variant="outline-success" 
                    size="sm" 
                    onClick={() => setRecipients((p) => [...p, newRecipient()])}
                  >
                    <FaPlus /> Add Row
                  </Button>
                </Tab>

                {/* Clients Tab */}
                <Tab eventKey="clients" title={<span><FaUsers className="me-1" /> Clients</span>}>
                  <div className="mb-3">
                    <div className="d-flex gap-2 mb-2">
                      <Button 
                        variant={selectAllClients ? "success" : "outline-secondary"} 
                        size="sm"
                        onClick={handleSelectAllClients}
                        disabled={loadingAllClients}
                      >
                        <FaCheckDouble className="me-1" />
                        {selectAllClients ? 'Deselect All Clients' : 'Select All Clients'}
                      </Button>
                      {loadingAllClients && <Spinner size="sm" />}
                    </div>
                    
                    <InputGroup>
                      <InputGroup.Text><FaSearch /></InputGroup.Text>
                      <Form.Control 
                        type="text" 
                        placeholder="Search by name, username or email..." 
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                      />
                      <Button variant="primary" onClick={searchClients} disabled={loadingClients}>
                        {loadingClients ? <Spinner size="sm" /> : 'Search'}
                      </Button>
                    </InputGroup>
                  </div>
                  
                  {loadingClients && <div className="text-center py-3"><Spinner /></div>}
                  
                  {clients.length > 0 && (
                    <div className="border rounded mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <Table responsive hover size="sm" className="mb-0">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th style={{ width: 40 }}>Select</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Mobile</th>
                            <th>Firms</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clients.map(client => (
                            <tr key={client.username}>
                              <td style={{ width: 40 }}>
                                <Form.Check 
                                  type="checkbox"
                                  checked={selectedClients.some(c => c.username === client.username)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedClients([...selectedClients, client]);
                                      setSelectAllClients(false);
                                    } else {
                                      setSelectedClients(selectedClients.filter(c => c.username !== client.username));
                                    }
                                  }}
                                />
                              </td>
                              <td>{client.name || client.username}</td>
                              <td>{client.email}</td>
                              <td>{client.mobile}</td>
                              <td>
                                {client.firms?.map(f => f.firm_name).join(', ') || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                  
                  {clientSearch && clients.length === 0 && !loadingClients && (
                    <div className="alert alert-info">No clients found</div>
                  )}
                  
                  {selectedClients.length > 0 && (
                    <div className="mt-2">
                      <strong>Selected: {selectedClients.length} client(s)</strong>
                      <div className="d-flex flex-wrap gap-1 mt-2">
                        {selectedClients.slice(0, 10).map(c => (
                          <Badge 
                            key={c.username} 
                            bg="primary" 
                            className="d-flex align-items-center gap-1"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setSelectedClients(selectedClients.filter(sc => sc.username !== c.username));
                              setSelectAllClients(false);
                            }}
                          >
                            {c.name || c.username}
                            <span className="ms-1">×</span>
                          </Badge>
                        ))}
                        {selectedClients.length > 10 && (
                          <Badge bg="secondary">+{selectedClients.length - 10} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </Tab>

                {/* Groups Tab */}
                <Tab eventKey="groups" title={<span><FaLayerGroup className="me-1" /> Groups</span>}>
                  <div className="alert alert-info">
                    <strong>Note:</strong> Group selection will send emails to all clients in the selected groups.
                    Please use Client selection for now, or ensure your backend supports group_ids.
                  </div>
                  <div className="mb-3">
                    <InputGroup>
                      <InputGroup.Text><FaSearch /></InputGroup.Text>
                      <Form.Control 
                        type="text" 
                        placeholder="Search groups..." 
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                      />
                    </InputGroup>
                  </div>
                  
                  {loadingGroups && <div className="text-center py-3"><Spinner /></div>}
                  
                  <div className="row">
                    {filteredGroups.map(group => (
                      <Col md={6} lg={4} key={group.group_id} className="mb-2">
                        <Card 
                          className={`cursor-pointer ${selectedGroups.some(g => g.group_id === group.group_id) ? 'border-primary bg-primary-light' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (selectedGroups.some(g => g.group_id === group.group_id)) {
                              setSelectedGroups(selectedGroups.filter(g => g.group_id !== group.group_id));
                            } else {
                              setSelectedGroups([...selectedGroups, group]);
                              toast.info(`Group "${group.name}" will send to all members. Please use Client selection for immediate sending.`);
                            }
                          }}
                        >
                          <Card.Body className="py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <strong>{group.name}</strong>
                                <div className="small text-muted">{group.firm_count || 0} firms</div>
                                {group.remark && <div className="small text-muted">{group.remark}</div>}
                              </div>
                              <Form.Check 
                                type="checkbox"
                                checked={selectedGroups.some(g => g.group_id === group.group_id)}
                                onChange={() => {}}
                              />
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </div>
                  
                  {filteredGroups.length === 0 && !loadingGroups && (
                    <div className="alert alert-info">No groups found</div>
                  )}
                  
                  {selectedGroups.length > 0 && (
                    <div className="mt-3 p-2 bg-light rounded">
                      <strong>Selected Groups: {selectedGroups.length}</strong>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {selectedGroups.map(g => (
                          <Badge 
                            key={g.group_id} 
                            bg="success"
                            className="d-flex align-items-center gap-1"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedGroups(selectedGroups.filter(sg => sg.group_id !== g.group_id))}
                          >
                            {g.name}
                            <span className="ms-1">×</span>
                          </Badge>
                        ))}
                      </div>
                      <div className="small text-warning mt-2">
                        ⚠️ Group sending requires backend support. Please use Client selection for now.
                      </div>
                    </div>
                  )}
                </Tab>
              </Tabs>
              
              {formErrors.recipients && (
                <div className="text-danger mt-2">{formErrors.recipients}</div>
              )}
            </Card.Body>
          </Card>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end gap-2">
            <Button variant="outline-secondary" onClick={() => navigate('/broadcast/email')}>
              Cancel
            </Button>
            <Button 
              variant="success" 
              onClick={submit} 
              disabled={loading}
            >
              {loading ? <Spinner size="sm" className="me-1" /> : <FaPaperPlane className="me-1" />}
              {form.schedule_type === 'now' ? 'Send Now' : 'Schedule Broadcast'}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Email Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewData && (
            <>
              <h5>Subject: {previewData.subject}</h5>
              <hr />
              <div dangerouslySetInnerHTML={{ __html: previewData.html_body }} />
              {previewData.text_body && (
                <>
                  <hr />
                  <pre className="bg-light p-2 rounded">{previewData.text_body}</pre>
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmailBroadcastCreate;