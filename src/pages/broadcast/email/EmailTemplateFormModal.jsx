import React, { useEffect, useState, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, Card, Badge, InputGroup, Alert, Tabs, Tab } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { 
  FaCode, FaCopy, FaInfoCircle, FaTags, FaEye, FaEdit, FaSave, 
  FaTrash, FaPlus, FaPalette, FaMobile, FaDesktop, FaMagic, 
  FaFileAlt, FaEnvelope, FaUsers, FaBuilding, FaGift, FaChartLine,
  FaCheckCircle, FaClock, FaDollarSign, FaFileInvoice, FaBell,
  FaStar, FaHeart, FaSmile, FaRocket, FaArrowRight, FaRegSave,
  FaUndo, FaRedo, FaBold, FaItalic, FaUnderline, FaAlignLeft,
  FaAlignCenter, FaAlignRight, FaListUl, FaListOl, FaLink, FaImage
} from 'react-icons/fa';
import { emailApi } from './emailApi';

// ✅ MOVED emptyForm HERE - BEFORE the component
const emptyForm = {
  template_id: '',
  template_name: '',
  subject: '',
  html_body: '',
  text_body: '',
  status: 'active',
  preview_variables_json: '{}',
  template_type: 'general'
};

// Rich Text Editor Component
const RichTextEditor = ({ value, onChange, placeholder, id }) => {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div className="rich-editor-container" style={{ border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
      <div className="rich-editor-toolbar" style={{ 
        background: '#f8f9fa', 
        padding: '8px', 
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px'
      }}>
        <Button size="sm" variant="light" onClick={() => execCommand('bold')} title="Bold"><FaBold /></Button>
        <Button size="sm" variant="light" onClick={() => execCommand('italic')} title="Italic"><FaItalic /></Button>
        <Button size="sm" variant="light" onClick={() => execCommand('underline')} title="Underline"><FaUnderline /></Button>
        <div className="vr mx-1" />
        <Button size="sm" variant="light" onClick={() => execCommand('justifyLeft')} title="Align Left"><FaAlignLeft /></Button>
        <Button size="sm" variant="light" onClick={() => execCommand('justifyCenter')} title="Align Center"><FaAlignCenter /></Button>
        <Button size="sm" variant="light" onClick={() => execCommand('justifyRight')} title="Align Right"><FaAlignRight /></Button>
        <div className="vr mx-1" />
        <Button size="sm" variant="light" onClick={() => execCommand('insertUnorderedList')} title="Bullet List"><FaListUl /></Button>
        <Button size="sm" variant="light" onClick={() => execCommand('insertOrderedList')} title="Numbered List"><FaListOl /></Button>
        <div className="vr mx-1" />
        <Button size="sm" variant="light" onClick={() => {
          const url = prompt('Enter URL:', 'https://');
          if (url) execCommand('createLink', url);
        }} title="Insert Link"><FaLink /></Button>
        <Button size="sm" variant="light" onClick={() => {
          const url = prompt('Enter image URL:', 'https://');
          if (url) execCommand('insertImage', url);
        }} title="Insert Image"><FaImage /></Button>
      </div>
      <div
        ref={editorRef}
        id={id}
        contentEditable
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onPaste={handlePaste}
        style={{
          minHeight: '300px',
          padding: '12px',
          background: '#fff',
          overflowY: 'auto',
          outline: 'none',
          fontFamily: "'Segoe UI', 'Roboto', sans-serif",
          fontSize: '14px',
          lineHeight: '1.6',
          borderTop: isFocused ? '2px solid #0d6efd' : 'none'
        }}
        placeholder={placeholder}
      />
    </div>
  );
};

// Predefined Templates
const predefinedTemplates = {
  welcome: {
    name: 'Welcome Email',
    icon: <FaSmile />,
    color: '#10b981',
    subject: 'Welcome to {{company}}, {{name}}!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">🎉 Welcome aboard!</h1>
        </div>
        <div style="padding: 30px 20px; background: #ffffff;">
          <h2>Hello {{name}},</h2>
          <p>Thank you for joining <strong>{{company}}</strong>! We're excited to have you with us.</p>
          <p>{{welcome_message}}</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="{{getting_started_link}}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Get Started →</a>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px;">Need help? Contact us at <a href="mailto:{{support_email}}">{{support_email}}</a></p>
        </div>
      </div>
    `
  },
  birthday: {
    name: 'Birthday Wishes',
    icon: <FaGift />,
    color: '#ef4444',
    subject: '🎂 Happy Birthday {{name}}! Special offer inside',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">🎂 Happy Birthday!</h1>
        </div>
        <div style="padding: 30px 20px; background: #ffffff; text-align: center;">
          <h2>Dear {{name}},</h2>
          <p>Wishing you a fantastic birthday from all of us at <strong>{{company}}</strong>!</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #ef4444; margin: 0 0 10px 0;">🎁 Your Birthday Gift</h3>
            <p style="font-size: 24px; font-weight: bold; color: #ef4444;">{{discount}}% OFF</p>
            <p>on your next purchase</p>
            <p><strong>Code: BIRTHDAY{{current_year}}</strong></p>
          </div>
          <a href="{{offer_link}}" style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Claim Your Gift →</a>
        </div>
      </div>
    `
  },
  invoice: {
    name: 'Invoice Reminder',
    icon: <FaFileInvoice />,
    color: '#3b82f6',
    subject: 'Invoice #{{invoice_no}} - Payment Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; padding: 30px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0;">{{company}}</h2>
          <p>Invoice Reminder</p>
        </div>
        <div style="padding: 30px 20px; background: #ffffff;">
          <p>Dear <strong>{{name}}</strong>,</p>
          <p>This is a reminder for invoice <strong>#{{invoice_no}}</strong> of amount <strong>₹{{amount}}</strong>.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr><td><strong>Invoice No:</strong></td><td>{{invoice_no}}</td></tr>
              <tr><td><strong>Amount:</strong></td><td>₹{{amount}}</td></tr>
              <tr><td><strong>Due Date:</strong></td><td>{{due_date}}</td></tr>
              <tr><td><strong>Status:</strong></td><td><span style="color: #ef4444;">{{invoice_status}}</span></td></tr>
            </table>
          </div>
          <div style="text-align: center;">
            <a href="{{payment_link}}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Pay Now</a>
          </div>
        </div>
      </div>
    `
  },
  newsletter: {
    name: 'Newsletter',
    icon: <FaEnvelope />,
    color: '#8b5cf6',
    subject: '{{newsletter_title}} - {{current_date}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 30px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">{{company}}</h1>
          <p style="margin: 10px 0 0;">{{newsletter_title}}</p>
        </div>
        <div style="padding: 30px 20px; background: #ffffff;">
          <h2>Hello {{name}},</h2>
          <p>{{featured_article}}</p>
          <div style="margin: 30px 0;">
            <div style="background: #f3e8ff; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <h3 style="color: #6d28d9; margin: 0 0 10px 0;">📰 Latest Updates</h3>
              <p>{{update_1}}</p>
            </div>
            <div style="background: #f3e8ff; padding: 15px; border-radius: 8px;">
              <h3 style="color: #6d28d9; margin: 0 0 10px 0;">🚀 Upcoming Events</h3>
              <p>{{update_2}}</p>
            </div>
          </div>
          <hr style="margin: 30px 0;" />
          <p style="text-align: center;">
            <a href="{{unsubscribe_link}}" style="color: #6b7280; font-size: 12px;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `
  },
  reminder: {
    name: 'Task Reminder',
    icon: <FaBell />,
    color: '#f59e0b',
    subject: 'Reminder: {{task_name}} due in {{days_left}} days',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 30px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0;">⏰ Task Reminder</h2>
        </div>
        <div style="padding: 30px 20px; background: #ffffff;">
          <p>Dear <strong>{{name}}</strong>,</p>
          <p>This is a reminder for your pending task:</p>
          <div style="background: #fffbeb; padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #f59e0b;">{{task_name}}</h3>
            <p><strong>Due Date:</strong> {{due_date}}</p>
            <p><strong>Days Left:</strong> {{days_left}} days</p>
          </div>
          <div style="text-align: center;">
            <a href="{{task_link}}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Task</a>
          </div>
        </div>
      </div>
    `
  },
  sale: {
    name: 'Sale/Promotion',
    icon: <FaRocket />,
    color: '#ec4899',
    subject: '🔥 {{discount}}% OFF - Limited Time Offer!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); padding: 40px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">🔥 SALE 🔥</h1>
          <p style="font-size: 48px; font-weight: bold; margin: 20px 0;">{{discount}}% OFF</p>
        </div>
        <div style="padding: 30px 20px; background: #ffffff; text-align: center;">
          <h2>Hey {{name}}!</h2>
          <p>Don't miss out on our amazing offer!</p>
          <div style="margin: 20px 0;">
            <p style="font-size: 20px;"><s>₹{{original_price}}</s> <strong style="color: #ec4899; font-size: 28px;">₹{{sale_price}}</strong></p>
          </div>
          <div style="background: #fdf2f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Use Code:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 5px;">{{coupon_code}}</code></p>
            <p><strong>Valid till:</strong> {{offer_end_date}}</p>
          </div>
          <a href="{{offer_link}}" style="background: #ec4899; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Shop Now →</a>
        </div>
      </div>
    `
  }
};

// Main Component
const EmailTemplateFormModal = ({ show, onHide, editData, onSuccess }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [availableVariables, setAvailableVariables] = useState([]);
  const [showVariables, setShowVariables] = useState(true);
  const [selectedType, setSelectedType] = useState('general');
  const [loadingVariables, setLoadingVariables] = useState(false);
  const [activeView, setActiveView] = useState('edit');
  const [showPredefined, setShowPredefined] = useState(false);

  const isEdit = Boolean(editData?.template_id);

  useEffect(() => {
    if (!show) return;
    setForm({
      ...emptyForm,
      ...editData,
      preview_variables_json: editData?.preview_variables_json || '{}',
      status: editData?.status || 'active',
      template_type: editData?.template_type || 'general'
    });
    setPreview(null);
    setSelectedType(editData?.template_type || 'general');
    setActiveView('edit');
    if (editData?.template_type) {
      loadVariablesByType(editData.template_type);
    } else {
      loadVariablesByType('general');
    }
  }, [show, editData]);

  const loadVariablesByType = async (type) => {
    setLoadingVariables(true);
    try {
      const res = await emailApi.getVariableKeys(type);
      console.log("Variables loaded:", res);
      
      // Fix: Handle the actual response structure
      const keys = res?.data?.keys || res?.keys || [];
      const formattedVars = keys.map(key => ({
        name: key,
        description: getVariableDescription(key),
        example: `{{${key}}}`
      }));
      setAvailableVariables(formattedVars);
    } catch (error) {
      console.error('Failed to load variables:', error);
      setAvailableVariables([]);
    } finally {
      setLoadingVariables(false);
    }
  };

  const getVariableDescription = (key) => {
    const descriptions = {
      name: "Client's full name",
      email: "Client's email address",
      mobile: "Client's mobile number",
      firm_name: "Client's firm/business name",
      company: "Your company name",
      welcome_message: "Personalized welcome message",
      getting_started_link: "Link to getting started guide",
      support_email: "Support email address",
      discount: "Discount percentage",
      coupon_code: "Coupon code for offer",
      current_date: "Current date",
      current_year: "Current year",
      invoice_no: "Invoice number",
      amount: "Invoice amount",
      due_date: "Due date for payment",
      invoice_status: "Current invoice status",
      payment_link: "Link to payment page",
      newsletter_title: "Newsletter title",
      featured_article: "Featured article content",
      unsubscribe_link: "Unsubscribe link",
      task_name: "Task name",
      days_left: "Days remaining for task",
      task_link: "Link to task",
      original_price: "Original price",
      sale_price: "Sale price",
      offer_end_date: "Offer end date",
      offer_link: "Link to offer",
      update_1: "First update content",
      update_2: "Second update content"
    };
    return descriptions[key] || "Dynamic value from database";
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setForm({ ...form, template_type: type });
    loadVariablesByType(type);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const insertVariable = (variableName) => {
    const activeElement = document.activeElement;
    const isSubjectField = activeElement && activeElement.id === 'subject';
    const isTextField = activeElement && activeElement.id === 'text_body';
    
    if (isSubjectField || isTextField) {
      const fieldName = activeElement.id;
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const text = form[fieldName];
      const variableText = `{{${variableName}}}`;
      const newText = text.substring(0, start) + variableText + text.substring(end);

      setForm({ ...form, [fieldName]: newText });

      setTimeout(() => {
        activeElement.focus();
        const newCursorPos = start + variableText.length;
        activeElement.setSelectionRange(newCursorPos, newCursorPos);
      }, 10);
      
      toast.success(`Added {{${variableName}}} to ${fieldName}`);
    } else {
      toast.error('Click in subject or text body field first to insert variable');
    }
  };

  const insertVariableIntoHtml = (variableName) => {
    const htmlField = document.getElementById('html_body_editor');
    if (htmlField) {
      document.execCommand('insertHTML', false, `{{${variableName}}}`);
      const newHtml = htmlField.innerHTML;
      setForm({ ...form, html_body: newHtml });
      toast.success(`Added {{${variableName}}} to HTML body`);
    } else {
      toast.error('Click in HTML editor first');
    }
  };

  const loadPredefinedTemplate = (templateKey) => {
    const template = predefinedTemplates[templateKey];
    if (template) {
      setForm({
        ...form,
        template_name: template.name,
        subject: template.subject,
        html_body: template.html,
        template_type: templateKey === 'welcome' ? 'welcome' : 
                       templateKey === 'birthday' ? 'birthday' :
                       templateKey === 'invoice' ? 'invoice' :
                       templateKey === 'newsletter' ? 'newsletter' :
                       templateKey === 'reminder' ? 'reminder' : 'sale'
      });
      setSelectedType(form.template_type);
      loadVariablesByType(form.template_type);
      setShowPredefined(false);
      toast.success(`Loaded ${template.name} template`);
    }
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
        template_type: form.template_type
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
      setActiveView('preview');
      toast.success('Preview generated');
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const templateTypesList = [
    { value: 'general', label: 'General', icon: <FaFileAlt />, color: '#6b7280' },
    { value: 'welcome', label: 'Welcome', icon: <FaSmile />, color: '#10b981' },
    { value: 'birthday', label: 'Birthday', icon: <FaGift />, color: '#ef4444' },
    { value: 'sale', label: 'Sale', icon: <FaChartLine />, color: '#ec4899' },
    { value: 'invoice', label: 'Invoice', icon: <FaFileInvoice />, color: '#3b82f6' },
    { value: 'reminder', label: 'Reminder', icon: <FaBell />, color: '#f59e0b' },
    { value: 'newsletter', label: 'Newsletter', icon: <FaEnvelope />, color: '#8b5cf6' }
  ];

  return (
    <Modal show={show} onHide={onHide} size="xl" centered className="template-modal">
      <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Modal.Title>
          <FaTags className="me-2" />
          {isEdit ? '✏️ Edit Email Template' : '✨ Create Email Template'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Template Type Selection */}
        <Row className="mb-4">
          <Col md={12}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0"><FaMagic className="me-2 text-primary" />Template Type</h6>
                  <Button size="sm" variant="outline-primary" onClick={() => setShowPredefined(!showPredefined)}>
                    <FaStar className="me-1" /> Predefined Templates
                  </Button>
                </div>
                
                {/* Predefined Templates */}
                {showPredefined && (
                  <div className="mb-4">
                    <h6 className="mb-3">📋 Choose a Predefined Template</h6>
                    <Row className="g-3">
                      {Object.entries(predefinedTemplates).map(([key, template]) => (
                        <Col md={4} key={key}>
                          <Card 
                            className="h-100 cursor-pointer"
                            style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                            onClick={() => loadPredefinedTemplate(key)}
                          >
                            <Card.Body className="text-center">
                              <div style={{ fontSize: '32px', color: template.color }}>{template.icon}</div>
                              <h6 className="mt-2 mb-1">{template.name}</h6>
                              <small className="text-muted">Click to load</small>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                    <hr className="my-3" />
                  </div>
                )}
                
                <div className="d-flex flex-wrap gap-2">
                  {templateTypesList.map(type => (
                    <Button
                      key={type.value}
                      variant={form.template_type === type.value ? 'primary' : 'outline-secondary'}
                      size="sm"
                      onClick={() => handleTypeChange(type.value)}
                      style={{ 
                        backgroundColor: form.template_type === type.value ? type.color : 'transparent',
                        borderColor: type.color,
                        color: form.template_type === type.value ? 'white' : type.color
                      }}
                    >
                      {type.icon} {type.label}
                    </Button>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label><FaFileAlt className="me-1" /> Template Name *</Form.Label>
              <Form.Control
                name="template_name"
                value={form.template_name}
                onChange={onChange}
                placeholder="e.g., Birthday Greeting, Welcome Email"
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label><FaCheckCircle className="me-1" /> Status</Form.Label>
              <Form.Select name="status" value={form.status} onChange={onChange}>
                <option value="active">✅ Active</option>
                <option value="inactive">⭕ Inactive</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label><FaPalette className="me-1" /> Template Type</Form.Label>
              <Form.Control
                value={templateTypesList.find(t => t.value === form.template_type)?.label || 'General'}
                disabled
              />
            </Form.Group>
          </Col>

          {/* Variables Panel */}
          <Col md={12}>
            <Card className="border-info mb-3">
              <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
                <span><FaCode className="me-2" />Available Variables for {form.template_type} Template</span>
                <Button size="sm" variant="light" onClick={() => setShowVariables(!showVariables)}>
                  {showVariables ? 'Hide' : 'Show'}
                </Button>
              </Card.Header>
              {showVariables && (
                <Card.Body style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {loadingVariables ? (
                    <div className="text-center py-3"><Spinner size="sm" /></div>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {availableVariables.map(v => (
                        <Badge
                          key={v.name}
                          bg="light"
                          text="dark"
                          className="p-2 cursor-pointer"
                          style={{ cursor: 'pointer', transition: 'all 0.2s', fontSize: '12px' }}
                          onClick={() => insertVariable(v.name)}
                          title={v.description}
                        >
                          <code>{v.example}</code>
                          <small className="text-muted ms-1">- {v.description}</small>
                          <FaCopy className="ms-1" size={10} />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="small text-muted mt-2">
                    💡 Click on any variable to insert it at cursor position
                  </div>
                </Card.Body>
              )}
            </Card>
          </Col>

          {/* Edit/Preview Tabs */}
          <Col md={12}>
            <Tabs
              activeKey={activeView}
              onSelect={(k) => setActiveView(k)}
              className="mb-3"
            >
              <Tab eventKey="edit" title={<><FaEdit /> Edit Template</>}>
                <div className="mt-3">
                  <Form.Group className="mb-3">
                    <Form.Label><FaEnvelope className="me-1" /> Subject Line *</Form.Label>
                    <InputGroup>
                      <Form.Control
                        id="subject"
                        name="subject"
                        value={form.subject}
                        onChange={onChange}
                        placeholder="Email subject with variables like {{name}}"
                      />
                      <Button variant="outline-secondary" onClick={() => document.getElementById('subject').focus()}>
                        <FaCode /> Insert Variable
                      </Button>
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label><FaCode className="me-1" /> HTML Body (Rich Text Editor)</Form.Label>
                    <RichTextEditor
                      id="html_body_editor"
                      value={form.html_body}
                      onChange={(html) => setForm({ ...form, html_body: html })}
                      placeholder="Start writing your email here..."
                    />
                  </Form.Group>

                  <Form.Group>
                    <Form.Label><FaFileAlt className="me-1" /> Plain Text Body (Optional)</Form.Label>
                    <Form.Control
                      id="text_body"
                      as="textarea"
                      rows={4}
                      name="text_body"
                      value={form.text_body}
                      onChange={onChange}
                      placeholder="Plain text version for email clients that don't support HTML"
                    />
                  </Form.Group>
                </div>
              </Tab>
              
              <Tab eventKey="preview" title={<><FaEye /> Preview</>}>
                <div className="mt-3">
                  <Form.Group className="mb-3">
                    <Form.Label><FaCode className="me-1" /> Test Variables JSON</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      name="preview_variables_json"
                      value={form.preview_variables_json}
                      onChange={onChange}
                      placeholder='{"name": "John Doe", "company": "ACME Corp", "discount": "50%"}'
                      style={{ fontFamily: 'monospace' }}
                    />
                    <Form.Text className="text-muted">
                      Enter sample values to preview your email
                    </Form.Text>
                  </Form.Group>
                  
                  <Button 
                    variant="primary" 
                    onClick={handlePreview} 
                    disabled={previewing}
                    className="mb-3"
                  >
                    {previewing ? <Spinner size="sm" /> : <FaEye className="me-1" />}
                    {previewing ? ' Generating...' : ' Generate Preview'}
                  </Button>

                  {preview && (
                    <Card>
                      <Card.Header>
                        <strong>📧 Email Preview</strong>
                      </Card.Header>
                      <Card.Body>
                        <div className="mb-3">
                          <strong>Subject:</strong> {preview.rendered_subject || '-'}
                        </div>
                        <div>
                          <strong>HTML Preview:</strong>
                          <div className="border rounded p-3 mt-2 bg-light" style={{ maxHeight: '500px', overflow: 'auto' }}>
                            <div dangerouslySetInnerHTML={{ __html: preview.rendered_html || '' }} />
                          </div>
                        </div>
                        {preview.rendered_text && (
                          <div className="mt-3">
                            <strong>Plain Text Preview:</strong>
                            <pre className="border rounded p-3 mt-2 bg-light" style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                              {preview.rendered_text}
                            </pre>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  )}
                </div>
              </Tab>
            </Tabs>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="outline-primary" onClick={() => setActiveView('preview')}>
          <FaEye className="me-1" /> Preview
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" /> : <FaRegSave className="me-1" />}
          {saving ? ' Saving...' : isEdit ? ' Update Template' : ' Save Template'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EmailTemplateFormModal;