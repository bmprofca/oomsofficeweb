import React, { useState, useCallback, useRef } from 'react';
import { Button, Card, Row, Col, Spinner, Table, Badge, Modal, Alert, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FaUpload, FaFileExcel, FaFileCsv, FaCheck, FaTimes, 
  FaEye, FaPaperPlane, FaArrowLeft, FaInfoCircle, 
  FaExclamationTriangle, FaTrash, FaDownload, FaDatabase,
  FaEnvelope,FaUsers, FaCalendarAlt, FaClock,FaGlobe, FaServer
} from 'react-icons/fa';
import { emailApi } from './emailApi';

const BulkEmailImport = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  
  // Broadcast form state
  const [form, setForm] = useState({
    config_id: '',
    fallback_config_id: '',
    template_id: '',
    broadcast_name: '',
    schedule_type: 'now',
    scheduled_at: '',
    timezone: 'Asia/Kolkata',
    daily_limit: 1000,
    global_variables_json: '{}'
  });
  
  const [configs, setConfigs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Load configs and templates on mount
  React.useEffect(() => {
    loadConfigsAndTemplates();
    checkUploadedRecipients();
  }, []);
  
  const loadConfigsAndTemplates = async () => {
    setLoadingConfigs(true);
    setLoadingTemplates(true);
    try {
      const [configRes, templateRes] = await Promise.all([
        emailApi.listConfigs({ page_no: 1, limit: 100 }),
        emailApi.listTemplates({ page_no: 1, limit: 100 })
      ]);
      
      const configList = configRes?.data || [];
      const templateList = templateRes?.data || [];
      
      setConfigs(configList.filter(c => c.status === 'active'));
      setTemplates(templateList.filter(t => t.status === 'active'));
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load configurations');
    } finally {
      setLoadingConfigs(false);
      setLoadingTemplates(false);
    }
  };
  
  const checkUploadedRecipients = async () => {
    try {
      const res = await emailApi.getUploadedRecipientsInfo();
      if (res?.data?.has_upload) {
        setUploadedData(res.data);
        toast.success(`Found ${res.data.total_recipients} recipients from previous upload`);
      }
    } catch (error) {
      console.error('Failed to check uploaded recipients:', error);
    }
  };
  
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const validTypes = ['.csv', '.xls', '.xlsx'];
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(extension)) {
      toast.error('Please upload CSV or Excel file only');
      return;
    }
    
    setSelectedFile(file);
    setFileName(file.name);
  };
  
  const handleUpload = async (preview = false) => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }
    
    setUploading(true);
    try {
      const res = await emailApi.uploadRecipients(selectedFile, preview);
      
      if (preview) {
        setPreviewData(res.data);
        setShowPreviewModal(true);
      } else {
        setUploadedData(res.data);
        toast.success(res.message || 'File uploaded successfully');
        // Clear file input
        if (fileInputRef.current) fileInputRef.current.value = '';
        setSelectedFile(null);
        setFileName('');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };
  
  const handleClearUpload = async () => {
    try {
      await emailApi.clearUploadedRecipients();
      setUploadedData(null);
      toast.success('Uploaded recipients cleared');
    } catch (error) {
      toast.error('Failed to clear');
    }
  };
  
  const handleCreateBroadcast = async () => {
    // Validation
    if (!form.config_id) {
      toast.error('Please select SMTP configuration');
      return;
    }
    if (!form.template_id) {
      toast.error('Please select email template');
      return;
    }
    if (!form.broadcast_name) {
      toast.error('Please enter broadcast name');
      return;
    }
    if (!uploadedData?.total_recipients) {
      toast.error('No recipients uploaded. Please upload a file first.');
      return;
    }
    if (form.schedule_type === 'scheduled' && !form.scheduled_at) {
      toast.error('Please select scheduled date and time');
      return;
    }
    
    // Validate global variables JSON
    try {
      JSON.parse(form.global_variables_json);
    } catch (e) {
      toast.error('Invalid JSON in global variables');
      return;
    }
    
    setCreating(true);
    try {
      const payload = {
        config_id: form.config_id,
        template_id: form.template_id,
        broadcast_name: form.broadcast_name,
        schedule_type: form.schedule_type,
        daily_limit: form.daily_limit,
        timezone: form.timezone,
        global_variables_json: JSON.parse(form.global_variables_json)
      };
      
      if (form.fallback_config_id) payload.fallback_config_id = form.fallback_config_id;
      if (form.schedule_type === 'scheduled') payload.scheduled_at = form.scheduled_at;
      
      const res = await emailApi.createBroadcastFromUpload(payload);
      
      toast.success(res.message || 'Broadcast created successfully');
      if (form.schedule_type === 'now') {
        toast.success('Emails are being sent in the background');
      }
      
      // Clear uploaded data and navigate
      await emailApi.clearUploadedRecipients();
      navigate('/broadcast/email');
    } catch (error) {
      console.error('Failed to create broadcast:', error);
      toast.error(error?.response?.data?.message || 'Failed to create broadcast');
    } finally {
      setCreating(false);
    }
  };
  
  const downloadSampleCSV = () => {
    const sampleData = [
      ['Name', 'Email', 'amount', 'pending_amount', 'due_date'],
      ['John Doe', 'john@example.com', '5000', '2000', '2024-12-31'],
      ['Jane Smith', 'jane@example.com', '10000', '0', '2024-12-31'],
      ['Acme Corp', 'contact@acme.com', '25000', '5000', '2024-12-15']
    ];
    
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_recipients.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        color: '#fff',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
              <FaFileExcel size={28} /> Bulk Email Import
            </h1>
            <p style={{ opacity: 0.85, marginBottom: 0 }}>Import recipients from Excel/CSV and send bulk emails</p>
          </div>
          <button 
            onClick={() => navigate('/broadcast/email')}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, padding: '8px 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <FaArrowLeft /> Back to Broadcasts
          </button>
        </div>
      </div>
      
      <Row className="g-4">
        {/* File Upload Section */}
        <Col lg={5}>
          <Card style={{ border: 'none', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <Card.Body style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#e8f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaUpload color="#2563eb" size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 2 }}>Upload Recipients File</h3>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 0 }}>Supported: CSV, Excel (.xls, .xlsx)</p>
                </div>
              </div>
              
              <div 
                style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: 12,
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <FaFileExcel size={48} color="#9ca3af" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: 4 }}>
                  {fileName || 'Click to select file'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  CSV or Excel file with email column
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <Button 
                  variant="outline-primary"
                  onClick={() => handleUpload(true)}
                  disabled={!selectedFile || uploading}
                  style={{ flex: 1, borderRadius: 10, padding: '10px' }}
                >
                  {uploading ? <Spinner size="sm" /> : <FaEye />} Preview
                </Button>
                <Button 
                  variant="primary"
                  onClick={() => handleUpload(false)}
                  disabled={!selectedFile || uploading}
                  style={{ flex: 1, borderRadius: 10, padding: '10px' }}
                >
                  {uploading ? <Spinner size="sm" /> : <FaUpload />} Upload
                </Button>
              </div>
              
              <Button 
                variant="link"
                onClick={downloadSampleCSV}
                style={{ marginTop: 16, padding: 0, fontSize: '0.8rem', textDecoration: 'none' }}
              >
                <FaDownload size={12} /> Download sample CSV template
              </Button>
            </Card.Body>
          </Card>
          
          {/* Uploaded Recipients Summary */}
          {uploadedData && (
            <Card style={{ border: 'none', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: 20 }}>
              <Card.Body style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaDatabase color="#059669" size={18} />
                    <span style={{ fontWeight: 700 }}>Uploaded Recipients</span>
                  </div>
                  <button 
                    onClick={handleClearUpload}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                  >
                    <FaTrash size={14} /> Clear
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{uploadedData.total_recipients || 0}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Valid Recipients</div>
                  </div>
                  <div style={{ background: '#fef2f2', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626' }}>{uploadedData.invalid_entries || 0}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Invalid Entries</div>
                  </div>
                </div>
                
                {uploadedData.detected_mappings && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: 6 }}>Detected Columns:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <Badge bg="info">Email: {uploadedData.detected_mappings.email_column}</Badge>
                      {uploadedData.detected_mappings.name_column && (
                        <Badge bg="secondary">Name: {uploadedData.detected_mappings.name_column}</Badge>
                      )}
                      {uploadedData.detected_mappings.variable_columns?.slice(0, 3).map(col => (
                        <Badge key={col} bg="light" text="dark">Var: {col}</Badge>
                      ))}
                      {uploadedData.detected_mappings.variable_columns?.length > 3 && (
                        <Badge bg="light" text="dark">+{uploadedData.detected_mappings.variable_columns.length - 3}</Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {uploadedData.sample_recipients && uploadedData.sample_recipients.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: 6 }}>Sample Recipients:</div>
                    <div style={{ fontSize: '0.75rem', maxHeight: 120, overflowY: 'auto' }}>
                      {uploadedData.sample_recipients.map((r, idx) => (
                        <div key={idx} style={{ padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                          {r.name && <strong>{r.name}</strong>} {r.name && ' • '}
                          <span style={{ color: '#6b7280' }}>{r.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
        
        {/* Broadcast Configuration Section */}
        <Col lg={7}>
          <Card style={{ border: 'none', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <Card.Body style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#e8f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaPaperPlane color="#2563eb" size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 2 }}>Broadcast Configuration</h3>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 0 }}>Configure email settings for this campaign</p>
                </div>
              </div>
              
              {/* SMTP Config */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  <FaServer size={12} style={{ marginRight: 6 }} /> SMTP Configuration <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select 
                  className="form-select"
                  value={form.config_id}
                  onChange={e => setForm({ ...form, config_id: e.target.value })}
                  style={{ borderRadius: 10, padding: '10px 12px' }}
                  disabled={loadingConfigs}
                >
                  <option value="">Select SMTP configuration...</option>
                  {configs.map(c => (
                    <option key={c.config_id} value={c.config_id}>{c.config_name} ({c.from_email})</option>
                  ))}
                </select>
              </div>
              
              {/* Fallback Config */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Fallback Configuration <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>(optional)</span>
                </label>
                <select 
                  className="form-select"
                  value={form.fallback_config_id}
                  onChange={e => setForm({ ...form, fallback_config_id: e.target.value })}
                  style={{ borderRadius: 10, padding: '10px 12px' }}
                >
                  <option value="">No fallback</option>
                  {configs.filter(c => c.config_id !== form.config_id).map(c => (
                    <option key={c.config_id} value={c.config_id}>{c.config_name}</option>
                  ))}
                </select>
              </div>
              
              {/* Template */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  <FaEnvelope size={12} style={{ marginRight: 6 }} /> Email Template <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select 
                  className="form-select"
                  value={form.template_id}
                  onChange={e => setForm({ ...form, template_id: e.target.value })}
                  style={{ borderRadius: 10, padding: '10px 12px' }}
                  disabled={loadingTemplates}
                >
                  <option value="">Select template...</option>
                  {templates.map(t => (
                    <option key={t.template_id} value={t.template_id}>{t.template_name}</option>
                  ))}
                </select>
              </div>
              
              {/* Broadcast Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Broadcast Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="e.g., Tax Filing Reminder - March 2026"
                  value={form.broadcast_name}
                  onChange={e => setForm({ ...form, broadcast_name: e.target.value })}
                  style={{ borderRadius: 10, padding: '10px 12px' }}
                />
              </div>
              
              {/* Schedule */}
              <Row className="g-3" style={{ marginBottom: 20 }}>
                <Col md={6}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                    <FaClock size={12} style={{ marginRight: 6 }} /> Schedule Type
                  </label>
                  <select 
                    className="form-select"
                    value={form.schedule_type}
                    onChange={e => setForm({ ...form, schedule_type: e.target.value })}
                    style={{ borderRadius: 10, padding: '10px 12px' }}
                  >
                    <option value="now">🚀 Send Now</option>
                    <option value="scheduled">📅 Schedule for Later</option>
                  </select>
                </Col>
                <Col md={6}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                    <FaCalendarAlt size={12} style={{ marginRight: 6 }} /> Daily Limit
                  </label>
                  <input 
                    type="number"
                    className="form-control"
                    value={form.daily_limit}
                    onChange={e => setForm({ ...form, daily_limit: parseInt(e.target.value) || 1000 })}
                    min="1"
                    max="100000"
                    style={{ borderRadius: 10, padding: '10px 12px' }}
                  />
                </Col>
              </Row>
              
              {form.schedule_type === 'scheduled' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                    <FaCalendarAlt size={12} style={{ marginRight: 6 }} /> Schedule Date & Time
                  </label>
                  <input 
                    type="datetime-local"
                    className="form-control"
                    value={form.scheduled_at}
                    onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                    style={{ borderRadius: 10, padding: '10px 12px' }}
                  />
                </div>
              )}
              
              {/* Global Variables */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Global Variables <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>(optional JSON)</span>
                </label>
                <textarea 
                  className="form-control"
                  rows={4}
                  value={form.global_variables_json}
                  onChange={e => setForm({ ...form, global_variables_json: e.target.value })}
                  placeholder='{"company_name": "Acme Corp", "support_email": "help@acme.com"}'
                  style={{ borderRadius: 10, padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 4 }}>
                  💡 Variables from your file will be available as {'{{column_name}}'} in the template
                </div>
              </div>
              
              {/* Timezone */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  <FaGlobe size={12} style={{ marginRight: 6 }} /> Time Zone
                </label>
                <select 
                  className="form-select"
                  value={form.timezone}
                  onChange={e => setForm({ ...form, timezone: e.target.value })}
                  style={{ borderRadius: 10, padding: '10px 12px' }}
                >
                  <option value="Asia/Kolkata">🇮🇳 IST (Asia/Kolkata)</option>
                  <option value="America/New_York">🇺🇸 EST (New York)</option>
                  <option value="Europe/London">🇬🇧 GMT (London)</option>
                  <option value="Asia/Dubai">🇦🇪 GST (Dubai)</option>
                  <option value="Australia/Sydney">🇦🇺 AEST (Sydney)</option>
                </select>
              </div>
              
              {/* Summary Alert */}
              {uploadedData && (
                <Alert variant="success" style={{ borderRadius: 12, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FaUsers size={18} />
                    <div>
                      <strong>{uploadedData.total_recipients || 0} recipients</strong> ready to receive this broadcast
                    </div>
                  </div>
                </Alert>
              )}
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                <Button 
                  variant="outline-secondary"
                  onClick={() => navigate('/broadcast/email')}
                  style={{ borderRadius: 10, padding: '10px 20px' }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="success"
                  onClick={handleCreateBroadcast}
                  disabled={!uploadedData || creating}
                  style={{ borderRadius: 10, padding: '10px 28px', background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', border: 'none' }}
                >
                  {creating ? <Spinner size="sm" /> : <FaPaperPlane />}
                  {form.schedule_type === 'now' ? ' Send Now' : ' Schedule Broadcast'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="xl" centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #e5e7eb' }}>
          <Modal.Title>
            <FaEye className="me-2 text-primary" /> File Preview
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 24 }}>
          {previewData && (
            <>
              {/* Column Mappings */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <h6 style={{ fontWeight: 700, marginBottom: 12 }}>📋 Detected Column Mappings</h6>
                <Row className="g-3">
                  <Col md={4}>
                    <Badge bg="info" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                      Email: {previewData.detected_mappings?.email_column}
                    </Badge>
                  </Col>
                  {previewData.detected_mappings?.name_column && (
                    <Col md={4}>
                      <Badge bg="secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                        Name: {previewData.detected_mappings.name_column}
                      </Badge>
                    </Col>
                  )}
                  <Col md={4}>
                    <Badge bg="light" text="dark" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                      Variables: {previewData.detected_mappings?.variable_columns?.length || 0} columns
                    </Badge>
                  </Col>
                </Row>
              </div>
              
              {/* Summary Stats */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 20px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>{previewData.summary?.valid_recipients || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Valid Recipients</div>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: 10, padding: '12px 20px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626' }}>{previewData.summary?.invalid_entries || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Invalid Entries</div>
                </div>
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 20px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>{previewData.summary?.total_rows || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Rows</div>
                </div>
              </div>
              
              {/* Sample Data Table */}
              <h6 style={{ fontWeight: 700, marginBottom: 12 }}>📊 Sample Recipients (First 10)</h6>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
                <Table bordered hover size="sm" style={{ marginBottom: 0 }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Variables</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewData.preview || []).map((recipient, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{recipient.name || '-'}</td>
                        <td>{recipient.email}</td>
                        <td style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                          {Object.keys(recipient.variables || {}).slice(0, 3).join(', ')}
                          {Object.keys(recipient.variables || {}).length > 3 && '...'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {/* Errors */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h6 style={{ fontWeight: 700, marginBottom: 12, color: '#dc2626' }}>
                    <FaExclamationTriangle /> Invalid Entries ({previewData.errors.length})
                  </h6>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                    <Table bordered size="sm" style={{ marginBottom: 0 }}>
                      <thead style={{ background: '#fef2f2' }}>
                        <tr>
                          <th>Row</th>
                          <th>Email</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.errors.slice(0, 10).map((err, idx) => (
                          <tr key={idx}>
                            <td>{err.row}</td>
                            <td>{err.email}</td>
                            <td style={{ color: '#dc2626' }}>{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowPreviewModal(false)}>Close</Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setShowPreviewModal(false);
              handleUpload(false);
            }}
          >
            Upload This File
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BulkEmailImport;