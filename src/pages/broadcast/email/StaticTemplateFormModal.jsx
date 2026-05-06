// StaticTemplateFormModal.js - COMPLETELY FIXED PREVIEW

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { emailApi } from './emailApi';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';

const StaticTemplateFormModal = ({ show, onHide, editData, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('visual');
  const [variables, setVariables] = useState([]);
  const [availableVariables, setAvailableVariables] = useState([]);
  const [previewData, setPreviewData] = useState({});
  const [htmlCode, setHtmlCode] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [previewContent, setPreviewContent] = useState('');
  
  const previewContainerRef = useRef(null);
  const htmlTextareaRef = useRef(null);

  const [formData, setFormData] = useState({
    template_id: null,
    template_type: '',
    template_name: '',
    subject: '',
    html_body: '',
    text_body: '',
    status: 'active',
    is_default: 0
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: 'Write your email content here... Click on variables below to insert them.',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
    ],
    content: formData.html_body,
    onUpdate: ({ editor }) => {
      if (!isSyncing) {
        const html = editor.getHTML();
        setFormData(prev => ({
          ...prev,
          html_body: html
        }));
        setHtmlCode(html);
        extractVariables(html);
        generatePreview(html);
      }
    },
  });

  // Generate preview HTML with proper styling
  const generatePreview = (htmlContent = null) => {
    const htmlToRender = htmlContent || formData.html_body;
    if (!htmlToRender) return;
    
    // Replace variables with test values
    let processedHtml = htmlToRender;
    Object.keys(previewData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedHtml = processedHtml.replace(regex, previewData[key] || `[${key}]`);
    });
    
    // Create a temporary container to properly load styles
    const fullHtml = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Preview</title>
      <style>
        /* Reset styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #e9ecef;
          padding: 20px;
          margin: 0;
        }
        .preview-wrapper {
          max-width: ${previewMode === 'mobile' ? '480px' : '100%'};
          margin: 0 auto;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
      </style>
      ${extractStylesFromHtml(processedHtml)}
    </head>
    <body>
      <div class="preview-wrapper">
        ${removeStylesFromHtml(processedHtml)}
      </div>
    </body>
    </html>`;
    
    setPreviewContent(fullHtml);
    
    // Update iframe using srcdoc
    if (previewContainerRef.current) {
      const iframe = previewContainerRef.current;
      iframe.srcdoc = fullHtml;
    }
  };

  // Extract styles from HTML
  const extractStylesFromHtml = (html) => {
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatch) {
      return styleMatch.join('\n');
    }
    return '';
  };

  // Remove style tags from HTML body
  const removeStylesFromHtml = (html) => {
    return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  };

  // Update preview when dependencies change
  useEffect(() => {
    if (isInitialized && formData.html_body) {
      generatePreview();
    }
  }, [formData.html_body, previewData, isInitialized, previewMode]);

  // Sync editor content
  useEffect(() => {
    if (editor && formData.html_body !== editor.getHTML() && !isSyncing) {
      setIsSyncing(true);
      editor.commands.setContent(formData.html_body);
      setTimeout(() => setIsSyncing(false), 100);
    }
  }, [formData.html_body, editor]);

  // Fetch template on mount
  useEffect(() => {
    if (show) {
      if (editData && editData.template_id) {
        fetchTemplateDetails(editData.template_id);
      } else {
        resetForm();
      }
    }
  }, [editData, show]);

  // Fetch variables when template type changes
  useEffect(() => {
    if (formData.template_type) {
      fetchAvailableVariables(formData.template_type);
    }
  }, [formData.template_type]);

  const fetchTemplateDetails = async (templateId) => {
    setLoading(true);
    try {
      const response = await emailApi.staticTemplateDetails(templateId);
      const template = response.data;
      
      const htmlContent = template.html_body || getDefaultTemplate();
      
      setFormData({
        template_id: template.template_id,
        template_type: template.template_type || '',
        template_name: template.template_name || '',
        subject: template.subject || '',
        html_body: htmlContent,
        text_body: template.text_body || '',
        status: template.status || 'active',
        is_default: template.is_default || 0
      });
      
      setHtmlCode(htmlContent);
      
      const vars = template.variables_json || extractVariablesFromHtml(htmlContent);
      setVariables(vars);
      
      const initialData = {};
      vars.forEach(varName => {
        initialData[varName] = getExampleValue(varName);
      });
      setPreviewData(initialData);
      setIsInitialized(true);
      
      // Generate preview after setting data
      setTimeout(() => generatePreview(htmlContent), 200);
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast.error('Failed to load template details');
    } finally {
      setLoading(false);
    }
  };

  const getExampleValue = (varName) => {
    const examples = {
      'task_name': 'Complete Project Report',
      'due_date': '2024-12-31',
      'customer_name': 'John Doe',
      'invoice_no': 'INV-2024-001',
      'amount_due': '5,000.00',
      'days_overdue': '5',
      'payment_link': 'https://example.com/pay',
      'contact_number': '+91-9876543210',
      'user_name': 'John Doe',
      'company_name': 'Acme Inc.'
    };
    return examples[varName] || `[${varName}]`;
  };

  const fetchAvailableVariables = async (templateType) => {
    try {
      const response = await emailApi.getTemplateVariables(templateType);
      setAvailableVariables(response.data || []);
    } catch (error) {
      console.error('Error fetching variables:', error);
      setAvailableVariables(commonVariables);
    }
  };

  const commonVariables = [
    { name: 'task_name', label: 'Task Name', description: 'Name of the task', example: 'Complete Report', category: 'Task' },
    { name: 'due_date', label: 'Due Date', description: 'Task due date', example: '2024-12-31', category: 'Task' },
    { name: 'customer_name', label: 'Customer Name', description: 'Name of the customer', example: 'John Doe', category: 'Customer' },
    { name: 'invoice_no', label: 'Invoice Number', description: 'Invoice reference number', example: 'INV-2024-001', category: 'Invoice' },
    { name: 'amount_due', label: 'Amount Due', description: 'Amount to be paid', example: '₹5,000.00', category: 'Payment' },
    { name: 'contact_number', label: 'Contact Number', description: 'Support contact number', example: '+91-9876543210', category: 'Contact' },
    { name: 'company_name', label: 'Company Name', description: 'Name of the company', example: 'Acme Inc.', category: 'Company' },
    { name: 'user_name', label: 'User Name', description: 'Full name of the user', example: 'John Doe', category: 'User' },
  ];

  const resetForm = () => {
    const defaultHtml = getDefaultTemplate();
    const vars = extractVariablesFromHtml(defaultHtml);
    
    setFormData({
      template_id: null,
      template_type: '',
      template_name: '',
      subject: '',
      html_body: defaultHtml,
      text_body: '',
      status: 'active',
      is_default: 0
    });
    setHtmlCode(defaultHtml);
    setVariables(vars);
    setAvailableVariables(commonVariables);
    setIsInitialized(true);
    
    const initialData = {};
    vars.forEach(varName => {
      initialData[varName] = getExampleValue(varName);
    });
    setPreviewData(initialData);
    setTimeout(() => generatePreview(defaultHtml), 100);
  };

  const extractVariablesFromHtml = (html) => {
    if (!html) return [];
    const regex = /{{(\w+)}}/g;
    const foundVariables = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (!foundVariables.includes(match[1])) {
        foundVariables.push(match[1]);
      }
    }
    return foundVariables;
  };

  const extractVariables = (html) => {
    const vars = extractVariablesFromHtml(html);
    setVariables(vars);
    
    const initialPreviewData = { ...previewData };
    vars.forEach(varName => {
      if (!initialPreviewData[varName]) {
        initialPreviewData[varName] = getExampleValue(varName);
      }
    });
    setPreviewData(initialPreviewData);
  };

  const getDefaultTemplate = () => {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Created</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: #28a745;
            padding: 20px;
            text-align: center;
            color: white;
        }
        .content {
            padding: 30px;
        }
        .task-detail {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .button {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>✅ New Task Created</h2>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>A new task has been assigned to you:</p>
            <div class="task-detail">
                <strong>Task:</strong> {{task_name}}<br>
                <strong>Due Date:</strong> {{due_date}}
            </div>
            <p>Please complete this task before the due date.</p>
            <div style="text-align: center;">
                <a href="#" class="button">View Task</a>
            </div>
        </div>
        <div class="footer">
            <p>This is an automated notification. Please do not reply.</p>
        </div>
    </div>
</body>
</html>`;
  };

  const insertVariable = (variableName) => {
    if (editor) {
      editor.commands.insertContent(`{{${variableName}}}`);
      editor.commands.focus();
    } else {
      const textarea = htmlTextareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + `{{${variableName}}}` + text.substring(end);
        handleHtmlCodeChange(newText);
      }
    }
  };

  const handleVariableChange = (varName, value) => {
    const newPreviewData = { ...previewData, [varName]: value };
    setPreviewData(newPreviewData);
  };

  const handleHtmlCodeChange = (newHtml) => {
    setHtmlCode(newHtml);
    setFormData(prev => ({
      ...prev,
      html_body: newHtml
    }));
    extractVariables(newHtml);
    generatePreview(newHtml);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? (checked ? 1 : 0) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.template_type.trim()) {
      toast.error('Template type is required');
      return;
    }
    if (!formData.template_name.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!formData.subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!formData.html_body.trim()) {
      toast.error('HTML body is required');
      return;
    }

    setLoading(true);
    try {
      if (formData.template_id) {
        await emailApi.updateStaticTemplate(formData);
        toast.success('Static template updated successfully');
      } else {
        await emailApi.createStaticTemplate(formData);
        toast.success('Static template created successfully');
      }
      onSuccess();
      onHide();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const ToolbarButton = ({ onClick, children, active = false, title = '' }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onHide}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full mx-auto max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {formData.template_id ? 'Edit Static Template' : 'Create Static Template'}
                </h3>
                {variables.length > 0 && (
                  <span className="inline-flex items-center px-2 py-1 mt-1 text-xs bg-blue-100 text-blue-700 rounded">
                    {variables.length} variable{variables.length !== 1 ? 's' : ''} found
                  </span>
                )}
              </div>
              <button onClick={onHide} className="text-gray-400 hover:text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Template Type *</label>
                <input
                  type="text"
                  name="template_type"
                  value={formData.template_type}
                  onChange={handleChange}
                  placeholder="e.g., task_create"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Template Name *</label>
                <input
                  type="text"
                  name="template_name"
                  value={formData.template_name}
                  onChange={handleChange}
                  placeholder="e.g., Task Created"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Subject Line *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Email subject line"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  required
                />
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="flex -mb-px space-x-8">
                <button
                  onClick={() => setActiveTab('visual')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'visual'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Visual Editor
                </button>
                <button
                  onClick={() => setActiveTab('html')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'html'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  HTML Editor
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'preview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Live Preview
                </button>
              </nav>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Visual Editor Tab */}
              {activeTab === 'visual' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-4">
                    {editor && (
                      <div className="border border-gray-300 rounded-md p-2 bg-gray-50 flex flex-wrap gap-1">
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>B</ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>I</ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>S</ToolbarButton>
                        <div className="w-px h-6 bg-gray-300 mx-1"></div>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>H1</ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>• List</ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1. List</ToolbarButton>
                        <div className="w-px h-6 bg-gray-300 mx-1"></div>
                        <ToolbarButton onClick={() => {
                          const url = window.prompt('Enter URL:');
                          if (url) editor.chain().focus().setLink({ href: url }).run();
                        }}>🔗 Link</ToolbarButton>
                        <ToolbarButton onClick={() => {
                          const url = window.prompt('Enter image URL:');
                          if (url) editor.chain().focus().setImage({ src: url }).run();
                        }}>🖼️ Image</ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>↩️ Undo</ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>↪️ Redo</ToolbarButton>
                      </div>
                    )}
                    
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                      <EditorContent editor={editor} className="tiptap min-h-[500px] p-4" />
                    </div>
                  </div>

                  {/* Variables Panel */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Available Variables</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {(availableVariables.length > 0 ? availableVariables : commonVariables).map(variable => (
                          <button
                            key={variable.name}
                            type="button"
                            onClick={() => insertVariable(variable.name)}
                            className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300"
                          >
                            <code className="text-blue-600 font-mono">{`{{${variable.name}}}`}</code>
                            <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Settings</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-700">Status</label>
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="is_default"
                            checked={formData.is_default === 1}
                            onChange={handleChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">Set as default</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* HTML Editor Tab */}
              {activeTab === 'html' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">HTML Code</label>
                    <textarea
                      ref={htmlTextareaRef}
                      value={htmlCode}
                      onChange={(e) => handleHtmlCodeChange(e.target.value)}
                      rows={25}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2 font-mono text-sm"
                      placeholder="<div>Your HTML code here...</div>"
                    />
                    <p className="mt-2 text-sm text-gray-500">Use {'{{variable_name}}'} syntax for dynamic content</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Variables</label>
                    <div className="bg-gray-50 rounded-lg p-4 h-[calc(100%-2rem)] overflow-y-auto">
                      {(availableVariables.length > 0 ? availableVariables : commonVariables).map(variable => (
                        <button
                          key={variable.name}
                          type="button"
                          onClick={() => insertVariable(variable.name)}
                          className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-300 rounded-md mb-2 hover:bg-blue-50"
                        >
                          <code className="text-blue-600">{`{{${variable.name}}}`}</code>
                          <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Live Preview Tab - FIXED USING srcdoc */}
              {activeTab === 'preview' && (
                <div>
                  {/* Preview Controls */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">Preview Mode:</span>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('desktop')}
                        className={`px-3 py-1 text-sm rounded-md ${
                          previewMode === 'desktop' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('mobile')}
                        className={`px-3 py-1 text-sm rounded-md ${
                          previewMode === 'mobile' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Mobile
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => generatePreview()}
                      className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Refresh Preview
                    </button>
                  </div>

                  {/* Subject Preview */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Subject: </span>
                    <span className="text-sm text-gray-900">
                      {formData.subject && formData.subject.replace(/{{(\w+)}}/g, (match, varName) => previewData[varName] || match)}
                    </span>
                  </div>

                  {/* Variable Test Values */}
                  {variables.length > 0 && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Test Values (Edit to see real-time changes)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {variables.map(varName => (
                          <div key={varName}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              <code className="text-blue-600 bg-blue-50 px-1 rounded">{`{{${varName}}}`}</code>
                            </label>
                            <input
                              type="text"
                              value={previewData[varName] || ''}
                              onChange={(e) => handleVariableChange(varName, e.target.value)}
                              placeholder={`Enter ${varName}`}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border px-3 py-1.5"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-blue-600">✨ Changes above reflect instantly in the preview below</p>
                    </div>
                  )}

                  {/* REAL HTML PREVIEW - Using iframe with srcdoc for proper rendering */}
                  <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white transition-all duration-300 ${
                    previewMode === 'mobile' ? 'max-w-md mx-auto' : 'w-full'
                  }`}>
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-600 ml-2">📧 Email Preview - Live HTML with all styles</span>
                      </div>
                    </div>
                    <div style={{ height: '550px', overflow: 'auto', background: '#e9ecef' }}>
                      <iframe
                        ref={previewContainerRef}
                        title="Email Preview"
                        srcDoc={previewContent}
                        style={{ width: '100%', height: '100%', border: 'none', background: '#e9ecef' }}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                      />
                    </div>
                  </div>

                  {/* Debug Info - Show what's being rendered */}
                  <details className="mt-4">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      📄 View HTML Source (Debug)
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto max-h-60 font-mono whitespace-pre-wrap">
                      {formData.html_body || 'No HTML content'}
                    </pre>
                  </details>
                </div>
              )}

              {/* Plain Text Version */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <details className="group">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                    Plain Text Version (Optional)
                  </summary>
                  <div className="mt-3">
                    <textarea
                      name="text_body"
                      value={formData.text_body}
                      onChange={handleChange}
                      rows={6}
                      placeholder="Enter plain text version for email clients that don't support HTML"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2 font-mono"
                    />
                  </div>
                </details>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onHide}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (formData.template_id ? 'Update Template' : 'Create Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaticTemplateFormModal;