// src/components/BulkEmailImportModal.js

import React, { useState, useRef, useCallback } from 'react';
import { Modal, Button, Spinner, Table, Alert, Row, Col, Badge } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { FaFileExcel, FaUpload, FaEye, FaTimes, FaCheck, FaDownload, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import API_BASE from '../../../utils/api-controller';
import getHeaders from '../../../utils/get-headers';

const BulkEmailImportModal = ({ show, onHide, onImportComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  // Get headers for API calls
  const getHeadersConfig = () => {
    const headers = getHeaders();
    return { headers: { ...headers } };
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
    setUploadedData(null);
  };

  // Upload recipients API call
  const uploadRecipients = async (file, preview = false) => {
    const formData = new FormData();
    formData.append('file', file);
    const url = preview 
      ? `${API_BASE}/bulkmail/upload-recipients?preview=true` 
      : `${API_BASE}/bulkmail/upload-recipients`;
    
    const headers = getHeaders();
    const response = await axios.post(url, formData, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  };

  const handleUpload = async (preview = false) => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }
    
    setUploading(true);
    try {
      const res = await uploadRecipients(selectedFile, preview);
      
      if (preview) {
        setPreviewData(res.data);
        setShowPreview(true);
      } else {
        setUploadedData(res.data);
        toast.success(res.message || 'File uploaded successfully');
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

  const handleConfirmImport = () => {
    if (uploadedData?.recipients?.length > 0) {
      onImportComplete(uploadedData.recipients);
      toast.success(`${uploadedData.recipients.length} recipients imported successfully`);
      handleClose();
    } else if (uploadedData?.sample_recipients?.length > 0) {
      // Convert sample_recipients format to recipients format
      const recipients = uploadedData.sample_recipients.map(r => ({
        recipient_name: r.name || '',
        recipient_email: r.email,
        variable_values_json: r.variables || {}
      }));
      onImportComplete(recipients);
      toast.success(`${recipients.length} recipients imported successfully`);
      handleClose();
    } else {
      toast.error('No valid recipients to import');
    }
  };

  const handleClose = () => {
    setUploadedData(null);
    setPreviewData(null);
    setSelectedFile(null);
    setFileName('');
    setShowPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onHide();
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['Name', 'Email', 'Amount', 'Pending Amount', 'Due Date'],
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
    <>
      <Modal show={show} onHide={handleClose} size="lg" centered className="ebc-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaFileExcel className="me-2 text-success" />
            Bulk Import from Excel/CSV
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '20px 24px' }}>
          {/* File Selection */}
          <div 
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: 12,
              padding: '32px 20px',
              textAlign: 'center',
              background: '#fafafa',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: 20
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <FaFileExcel size={48} color="#9ca3af" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: 4 }}>
              {fileName || 'Click to select Excel/CSV file'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Supported: .csv, .xls, .xlsx (Max 10MB)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Action Buttons */}
          {selectedFile && !uploadedData && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <Button 
                variant="outline-primary"
                onClick={() => handleUpload(true)}
                disabled={uploading}
                style={{ flex: 1, borderRadius: 10 }}
              >
                {uploading ? <Spinner size="sm" /> : <FaEye />} Preview
              </Button>
              <Button 
                variant="primary"
                onClick={() => handleUpload(false)}
                disabled={uploading}
                style={{ flex: 1, borderRadius: 10 }}
              >
                {uploading ? <Spinner size="sm" /> : <FaUpload />} Upload
              </Button>
            </div>
          )}

          {/* Uploaded Data Summary */}
          {uploadedData && (
            <div>
              <Alert variant="success" style={{ borderRadius: 10 }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>File uploaded successfully!</strong>
                    <div className="mt-1">
                      <Badge bg="success" className="me-2">{uploadedData.valid_recipients || uploadedData.total_recipients || 0} Valid Recipients</Badge>
                      <Badge bg="danger">{uploadedData.invalid_entries || 0} Invalid Entries</Badge>
                    </div>
                  </div>
                  <Button variant="link" size="sm" onClick={() => setUploadedData(null)} style={{ color: '#dc2626' }}>
                    <FaTrash /> Clear
                  </Button>
                </div>
              </Alert>

              {/* Detected Columns */}
              {uploadedData.detected_mappings && (
                <div className="mb-3">
                  <small className="text-muted">Detected Columns:</small>
                  <div className="mt-1">
                    <Badge bg="info" className="me-2">Email: {uploadedData.detected_mappings.email_column}</Badge>
                    {uploadedData.detected_mappings.name_column && (
                      <Badge bg="secondary" className="me-2">Name: {uploadedData.detected_mappings.name_column}</Badge>
                    )}
                    {uploadedData.detected_mappings.variable_columns?.slice(0, 3).map(col => (
                      <Badge key={col} bg="light" text="dark" className="me-1">Var: {col}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Recipients */}
              {uploadedData.sample_recipients && uploadedData.sample_recipients.length > 0 && (
                <div className="mt-3">
                  <small className="text-muted">Sample Recipients (First 5):</small>
                  <div className="border rounded mt-1" style={{ maxHeight: 200, overflow: 'auto' }}>
                    <Table size="sm" bordered style={{ marginBottom: 0 }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Variables</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadedData.sample_recipients.slice(0, 5).map((r, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{r.name || '-'}</td>
                            <td>{r.email}</td>
                            <td style={{ fontSize: '0.7rem' }}>
                              {Object.keys(r.variables || {}).slice(0, 2).join(', ')}
                              {Object.keys(r.variables || {}).length > 2 && '...'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help Text */}
          {!selectedFile && !uploadedData && (
            <div className="text-center">
              <Button variant="link" onClick={downloadSampleCSV} style={{ fontSize: '0.8rem' }}>
                <FaDownload size={12} /> Download Sample CSV Template
              </Button>
              <div className="mt-3 text-muted" style={{ fontSize: '0.75rem' }}>
                <strong>Instructions:</strong>
                <ul className="mt-1 mb-0 text-start">
                  <li>First column should contain email addresses</li>
                  <li>Second column can contain recipient names (optional)</li>
                  <li>Additional columns will be available as variables in your template</li>
                  <li>Supported formats: .csv, .xls, .xlsx</li>
                </ul>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            <FaTimes /> Cancel
          </Button>
          {uploadedData && (
            <Button variant="success" onClick={handleConfirmImport}>
              <FaCheck /> Import {uploadedData.valid_recipients || uploadedData.total_recipients || 0} Recipients
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaEye className="me-2" /> File Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '20px 24px' }}>
          {previewData && (
            <>
              {/* Summary Stats */}
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <div className="text-center p-3 bg-success bg-opacity-10 rounded">
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>{previewData.summary?.valid_recipients || 0}</div>
                    <div className="text-muted">Valid Recipients</div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-center p-3 bg-danger bg-opacity-10 rounded">
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>{previewData.summary?.invalid_entries || 0}</div>
                    <div className="text-muted">Invalid Entries</div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-center p-3 bg-primary bg-opacity-10 rounded">
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>{previewData.summary?.total_rows || 0}</div>
                    <div className="text-muted">Total Rows</div>
                  </div>
                </Col>
              </Row>

              {/* Detected Mappings */}
              <div className="mb-3">
                <strong>Detected Column Mappings:</strong>
                <div className="mt-2">
                  <Badge bg="info" className="me-2">Email: {previewData.detected_mappings?.email_column}</Badge>
                  {previewData.detected_mappings?.name_column && (
                    <Badge bg="secondary" className="me-2">Name: {previewData.detected_mappings.name_column}</Badge>
                  )}
                </div>
              </div>

              {/* Sample Data */}
              <strong>Sample Data (First 10 rows):</strong>
              <div className="border rounded mt-2" style={{ maxHeight: 300, overflow: 'auto' }}>
                <Table size="sm" bordered style={{ marginBottom: 0 }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Variables</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewData.preview || []).slice(0, 10).map((r, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{r.name || '-'}</td>
                        <td>{r.email}</td>
                        <td style={{ fontSize: '0.7rem' }}>
                          {Object.keys(r.variables || {}).slice(0, 3).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Errors */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div className="mt-3">
                  <strong className="text-danger">Invalid Entries:</strong>
                  <div className="border rounded mt-1" style={{ maxHeight: 150, overflow: 'auto' }}>
                    <Table size="sm" bordered style={{ marginBottom: 0 }}>
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
                            <td className="text-danger">{err.error}</td>
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
          <Button variant="secondary" onClick={() => setShowPreview(false)}>Close</Button>
          <Button variant="primary" onClick={() => {
            setShowPreview(false);
            handleUpload(false);
          }}>
            Upload This File
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default BulkEmailImportModal;