// StaticTemplateFormModal.js - Using TipTap (React 19 compatible)

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { emailApi } from './emailApi';

const StaticTemplateFormModal = ({ show, onHide, editData, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  const [previewHtml, setPreviewHtml] = useState('');
  const [variables, setVariables] = useState([]);
  const [previewData, setPreviewData] = useState({});
  
  const [formData, setFormData] = useState({
    template_type: '',
    template_name: '',
    subject: '',
    html_body: '',
    text_body: '',
    status: 'active',
    is_default: 0
  });

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
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
      Image,
    ],
    content: formData.html_body,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setFormData(prev => ({
        ...prev,
        html_body: html
      }));
      extractVariables(html);
      updatePreview(html, previewData);
    },
  });

  // Update editor content when formData changes
  useEffect(() => {
    if (editor && formData.html_body !== editor.getHTML()) {
      editor.commands.setContent(formData.html_body);
    }
  }, [formData.html_body, editor]);

  // Common variables that can be used in templates
  const commonVariables = [
    { name: 'user_name', label: 'User Name', description: 'Full name of the user', example: 'John Doe' },
    { name: 'user_email', label: 'User Email', description: 'Email address of the user', example: 'john@example.com' },
    { name: 'company_name', label: 'Company Name', description: 'Name of the company', example: 'Acme Inc.' },
    { name: 'company_logo', label: 'Company Logo', description: 'URL to company logo', example: 'https://example.com/logo.png' },
    { name: 'task_title', label: 'Task Title', description: 'Title of the task', example: 'Complete Project Report' },
    { name: 'task_due_date', label: 'Task Due Date', description: 'Due date of the task', example: '2024-12-31' },
    { name: 'task_status', label: 'Task Status', description: 'Current status of the task', example: 'In Progress' },
    { name: 'payment_amount', label: 'Payment Amount', description: 'Amount to be paid', example: '$1,000.00' },
    { name: 'payment_date', label: 'Payment Date', description: 'Date of payment', example: '2024-01-15' },
    { name: 'invoice_number', label: 'Invoice Number', description: 'Invoice reference number', example: 'INV-2024-001' },
    { name: 'reset_link', label: 'Reset Link', description: 'Password reset link', example: 'https://example.com/reset/123' },
    { name: 'verification_link', label: 'Verification Link', description: 'Email verification link', example: 'https://example.com/verify/123' },
    { name: 'current_year', label: 'Current Year', description: 'Current year', example: '2024' },
    { name: 'support_email', label: 'Support Email', description: 'Support contact email', example: 'support@example.com' },
    { name: 'support_phone', label: 'Support Phone', description: 'Support phone number', example: '+1-555-123-4567' }
  ];

  useEffect(() => {
    if (editData) {
      setFormData({
        template_id: editData.template_id,
        template_type: editData.template_type || '',
        template_name: editData.template_name || '',
        subject: editData.subject || '',
        html_body: editData.html_body || '',
        text_body: editData.text_body || '',
        status: editData.status || 'active',
        is_default: editData.is_default || 0
      });
      
      // Extract variables from template
      extractVariables(editData.html_body || '');
    } else {
      setFormData({
        template_type: '',
        template_name: '',
        subject: '',
        html_body: getDefaultTemplate(),
        text_body: '',
        status: 'active',
        is_default: 0
      });
      setVariables([]);
      setPreviewData({});
    }
  }, [editData, show]);

  const extractVariables = (html) => {
    const regex = /{{(\w+)}}/g;
    const foundVariables = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (!foundVariables.includes(match[1])) {
        foundVariables.push(match[1]);
      }
    }
    setVariables(foundVariables);
    
    // Initialize preview data with example values
    const initialPreviewData = {};
    foundVariables.forEach(varName => {
      const varInfo = commonVariables.find(v => v.name === varName);
      initialPreviewData[varName] = varInfo ? varInfo.example : `[${varName}]`;
    });
    setPreviewData(initialPreviewData);
    updatePreview(html, initialPreviewData);
  };

  const getDefaultTemplate = () => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1>Welcome to {{company_name}}</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
          <h2>Hello {{user_name}},</h2>
          <p>Thank you for choosing {{company_name}}. We're excited to have you on board!</p>
          <p>Your account has been successfully created. You can now access all our features.</p>
          <a href="{{verification_link}}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Verify Your Email</a>
          <p>If the button doesn't work, copy and paste this link:</p>
          <p><a href="{{verification_link}}">{{verification_link}}</a></p>
          <p>Best regards,<br>The {{company_name}} Team</p>
        </div>
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
          <p>© {{current_year}} {{company_name}}. All rights reserved.</p>
          <p>Need help? Contact us at {{support_email}}</p>
        </div>
      </div>
    `;
  };

  const insertVariable = (variableName) => {
    if (editor) {
      editor.commands.insertContent(`{{${variableName}}}`);
      editor.commands.focus();
    }
  };

  const updatePreview = (html, data) => {
    let preview = html;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      preview = preview.replace(regex, data[key]);
    });
    setPreviewHtml(preview);
  };

  const handleVariableChange = (varName, value) => {
    const newPreviewData = { ...previewData, [varName]: value };
    setPreviewData(newPreviewData);
    updatePreview(formData.html_body, newPreviewData);
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
      if (editData) {
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

  // Toolbar button component
  const ToolbarButton = ({ onClick, children, active = false }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded text-sm ${
        active 
          ? 'bg-gray-200 text-gray-900' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onHide}></div>
        
        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="px-6 pt-6 pb-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {editData ? 'Edit Static Template' : 'Create Static Template'}
                {variables.length > 0 && (
                  <span className="ml-2 text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    Found {variables.length} variables
                  </span>
                )}
              </h3>
              <button
                onClick={onHide}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-b border-gray-200">
              <nav className="flex -mb-px space-x-8">
                {['edit', 'preview', 'text'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab === 'edit' ? 'Edit Template' : tab === 'preview' ? 'Live Preview' : 'Plain Text Version'}
                  </button>
                ))}
              </nav>
            </div>

            <form onSubmit={handleSubmit} className="mt-6">
              {activeTab === 'edit' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Template Type *
                      </label>
                      <input
                        type="text"
                        name="template_type"
                        value={formData.template_type}
                        onChange={handleChange}
                        placeholder="e.g., welcome_email, task_notification, payment_receipt"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Unique identifier for this template purpose
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        name="template_name"
                        value={formData.template_name}
                        onChange={handleChange}
                        placeholder="e.g., Welcome Email, Task Assignment Notification"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Subject Line *
                      </label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Email subject line (supports variables like {{user_name}})"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Content (HTML) *
                      </label>
                      
                      {/* Toolbar */}
                      {editor && (
                        <div className="border border-gray-300 rounded-t-md p-2 bg-gray-50 flex flex-wrap gap-1">
                          <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            active={editor.isActive('bold')}
                          >
                            <strong>B</strong>
                          </ToolbarButton>
                          <ToolbarButton
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            active={editor.isActive('italic')}
                          >
                            <em>I</em>
                          </ToolbarButton>
                          <ToolbarButton
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            active={editor.isActive('strike')}
                          >
                            <s>S</s>
                          </ToolbarButton>
                          <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            active={editor.isActive('heading', { level: 1 })}
                          >
                            H1
                          </ToolbarButton>
                          <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            active={editor.isActive('heading', { level: 2 })}
                          >
                            H2
                          </ToolbarButton>
                          <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            active={editor.isActive('bulletList')}
                          >
                            • List
                          </ToolbarButton>
                          <ToolbarButton
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            active={editor.isActive('orderedList')}
                          >
                            1. List
                          </ToolbarButton>
                          <div className="w-px h-6 bg-gray-300 mx-1"></div>
                          <ToolbarButton onClick={() => {
                            const url = window.prompt('Enter URL:');
                            if (url) editor.chain().focus().setLink({ href: url }).run();
                          }}>
                            🔗 Link
                          </ToolbarButton>
                          <ToolbarButton onClick={() => {
                            const url = window.prompt('Enter image URL:');
                            if (url) editor.chain().focus().setImage({ src: url }).run();
                          }}>
                            🖼️ Image
                          </ToolbarButton>
                        </div>
                      )}
                      
                      <div className="border border-t-0 border-gray-300 rounded-b-md overflow-hidden">
                        <EditorContent editor={editor} className="tiptap min-h-[400px] p-4" />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Use the toolbar to format your email. Click on variables below to insert them.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Available Variables</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {commonVariables.map(variable => (
                          <button
                            key={variable.name}
                            type="button"
                            onClick={() => insertVariable(variable.name)}
                            className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            <code className="text-blue-600">{`{{${variable.name}}}`}</code>
                            <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
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
                      <label className="ml-2 block text-sm text-gray-700">
                        Set as default template for this type
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preview' && (
                <div>
                  {variables.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Test Values for Variables
                        </h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {variables.map(varName => {
                            const varInfo = commonVariables.find(v => v.name === varName);
                            return (
                              <div key={varName}>
                                <label className="block text-sm font-medium text-gray-700">
                                  <code className="text-blue-600">{`{{${varName}}}`}</code>
                                  {varInfo && (
                                    <span className="text-xs text-gray-500 ml-2">{varInfo.description}</span>
                                  )}
                                </label>
                                <input
                                  type="text"
                                  value={previewData[varName] || ''}
                                  onChange={(e) => handleVariableChange(varName, e.target.value)}
                                  placeholder={`Enter value for ${varName}`}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Email Preview
                        </h4>
                        <div className="text-sm text-gray-500 mb-2">
                          Subject: {formData.subject}
                        </div>
                        <div className="max-h-96 overflow-y-auto bg-white rounded-lg shadow-inner">
                          <div 
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                            className="p-4"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            No variables found in your template. Add variables like {'{{user_name}}'} to see them here.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Plain Text Version (Optional)
                  </label>
                  <textarea
                    name="text_body"
                    value={formData.text_body}
                    onChange={handleChange}
                    rows={15}
                    placeholder="Enter plain text version of your email for email clients that don't support HTML"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2 font-mono"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    If left empty, a plain text version will be automatically generated from the HTML
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onHide}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 inline mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : null}
                  {editData ? 'Update Template' : 'Create Template'}
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