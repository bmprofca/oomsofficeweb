import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, Card } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { emailApi } from './emailApi';

const emptyForm = {
  template_id: '',
  template_name: '',
  subject: '',
  html_body: '',
  text_body: '',
  status: 'active',
  preview_variables_json: '{}',
};

const EmailTemplateFormModal = ({ show, onHide, editData, onSuccess }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);
  const isEdit = Boolean(editData?.template_id);

  useEffect(() => {
    if (!show) return;
    setForm({
      ...emptyForm,
      ...editData,
      preview_variables_json: '{}',
      status: editData?.status || 'active',
    });
    setPreview(null);
  }, [show, editData]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const parseVars = () => {
    try {
      return JSON.parse(form.preview_variables_json || '{}');
    } catch {
      throw new Error('Preview variables must be valid JSON');
    }
  };

  const handleSave = async () => {
    if (!form.template_name || !form.subject) {
      toast.error('Template name and subject are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        template_id: form.template_id || undefined,
        template_name: form.template_name,
        subject: form.subject,
        html_body: form.html_body,
        text_body: form.text_body,
        status: form.status,
      };
      if (isEdit) await emailApi.updateTemplate(payload);
      else await emailApi.createTemplate(payload);
      toast.success(isEdit ? 'Template updated' : 'Template created');
      onSuccess?.();
      onHide?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const variables = parseVars();
      const res = await emailApi.previewTemplate({
        subject: form.subject,
        html_body: form.html_body,
        text_body: form.text_body,
        variables,
      });
      setPreview(res?.data || res);
      toast.success('Preview generated');
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEdit ? 'Edit Email Template' : 'Create Email Template'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3">
          <Col md={6}><Form.Group><Form.Label>Template Name *</Form.Label><Form.Control name="template_name" value={form.template_name} onChange={onChange} /></Form.Group></Col>
          <Col md={6}><Form.Group><Form.Label>Status</Form.Label><Form.Select name="status" value={form.status} onChange={onChange}><option value="active">Active</option><option value="inactive">Inactive</option></Form.Select></Form.Group></Col>
          <Col md={12}><Form.Group><Form.Label>Subject *</Form.Label><Form.Control name="subject" value={form.subject} onChange={onChange} /></Form.Group></Col>
          <Col md={12}><Form.Group><Form.Label>HTML Body</Form.Label><Form.Control as="textarea" rows={6} name="html_body" value={form.html_body} onChange={onChange} /></Form.Group></Col>
          <Col md={12}><Form.Group><Form.Label>Text Body</Form.Label><Form.Control as="textarea" rows={4} name="text_body" value={form.text_body} onChange={onChange} /></Form.Group></Col>
          <Col md={12}><Form.Group><Form.Label>Preview Variables JSON</Form.Label><Form.Control as="textarea" rows={3} name="preview_variables_json" value={form.preview_variables_json} onChange={onChange} /></Form.Group></Col>
        </Row>

        {preview && (
          <Card className="mt-4">
            <Card.Header><strong>Preview Result</strong></Card.Header>
            <Card.Body>
              <p><strong>Rendered Subject:</strong> {preview.rendered_subject || '-'}</p>
              <p><strong>Rendered Text:</strong> {preview.rendered_text || '-'}</p>
              <div><strong>Rendered HTML:</strong><div className="border rounded p-2 mt-1" dangerouslySetInnerHTML={{ __html: preview.rendered_html || '' }} /></div>
              <pre className="mt-2 bg-light p-2 rounded">{JSON.stringify(preview.variables_json || {}, null, 2)}</pre>
            </Card.Body>
          </Card>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>Close</Button>
        <Button variant="outline-primary" onClick={handlePreview} disabled={previewing}>
          {previewing ? <Spinner size="sm" /> : 'Preview'}
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" /> : isEdit ? 'Update' : 'Save'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EmailTemplateFormModal;
