import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FaCode, FaCopy, FaInfoCircle, FaTags, FaEye, FaEdit, FaSave, 
  FaTrash, FaPlus, FaPalette, FaMobile, FaDesktop, FaMagic, 
  FaFileAlt, FaEnvelope, FaUsers, FaBuilding, FaGift, FaChartLine,
  FaCheckCircle, FaClock, FaDollarSign, FaFileInvoice, FaBell,
  FaStar, FaHeart, FaSmile, FaRocket, FaArrowRight, FaRegSave,
  FaUndo, FaRedo, FaBold, FaItalic, FaUnderline, FaAlignLeft,
  FaAlignCenter, FaAlignRight, FaListUl, FaListOl, FaLink, FaImage,
  FaChevronDown, FaTimes, FaCrown
} from 'react-icons/fa';
import { emailApi } from './emailApi';

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
const RichTextEditor = ({ value, onChange, placeholder, id, onVariableInsert }) => {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const dropdownRef = useRef(null);

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

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      setCursorPosition(range.startOffset);
    }
  };

  const insertVariableIntoHtml = (variableName) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, `{{${variableName}}}`);
      const newHtml = editorRef.current.innerHTML;
      onChange(newHtml);
      setShowVariableDropdown(false);
      toast.success(`Added {{${variableName}}} to HTML body`);
    }
  };

  return (
    <div className="relative">
      <div className="border border-blue-200 rounded-xl overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-blue-50 to-white p-2 border-b border-blue-200 flex flex-wrap gap-1">
          <button type="button" onClick={() => execCommand('bold')} className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600" title="Bold"><FaBold size={12} /></button>
          <button type="button" onClick={() => execCommand('italic')} className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600" title="Italic"><FaItalic size={12} /></button>
          <button type="button" onClick={() => execCommand('underline')} className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600" title="Underline"><FaUnderline size={12} /></button>
          <div className="w-px h-5 bg-blue-200 mx-1" />
          <button type="button" onClick={() => execCommand('justifyLeft')} className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600" title="Align Left"><FaAlignLeft size={12} /></button>
          <button type="button" onClick={() => execCommand('justifyCenter')} className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600" title="Align Center"><FaAlignCenter size={12} /></button>
          <button type="button" onClick={() => execCommand('justifyRight')} className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600" title="Align Right"><FaAlignRight size={12} /></button>
          <div className="w-px h-5 bg-blue-200 mx-1" />
          <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600" title="Bullet List"><FaListUl size={12} /></button>
          <button type="button" onClick={() => execCommand('insertOrderedList')} className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600" title="Numbered List"><FaListOl size={12} /></button>
          <div className="w-px h-5 bg-blue-200 mx-1" />
          <button type="button" onClick={() => { const url = prompt('Enter URL:', 'https://'); if (url) execCommand('createLink', url); }} className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600" title="Insert Link"><FaLink size={12} /></button>
          <button type="button" onClick={() => { const url = prompt('Enter image URL:', 'https://'); if (url) execCommand('insertImage', url); }} className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600" title="Insert Image"><FaImage size={12} /></button>
          <div className="flex-1" />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVariableDropdown(!showVariableDropdown)}
              className="p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 text-xs"
            >
              <FaCode size={12} />
              Variables
              <FaChevronDown size={10} />
            </button>
            {showVariableDropdown && (
              <div ref={dropdownRef} className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-blue-200 z-50 overflow-hidden">
                <div className="p-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700 flex items-center gap-2">
                      <FaCode /> Insert Variable
                    </span>
                    <button onClick={() => setShowVariableDropdown(false)} className="text-blue-400 hover:text-blue-600">
                      <FaTimes size={12} />
                    </button>
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Click on any variable to insert at cursor position</p>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {onVariableInsert && (
                    <div className="space-y-0.5">
                      {/* Variables will be passed from parent */}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
          onMouseUp={handleMouseUp}
          className={`min-h-[200px] p-4 overflow-y-auto outline-none font-sans text-sm leading-relaxed ${isFocused ? 'ring-2 ring-blue-500/20' : ''}`}
          style={{ fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif" }}
          placeholder={placeholder}
          data-placeholder={placeholder}
        />
      </div>
      <style jsx>{`
        [contentEditable=true]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
};

// Text Input with Variable Dropdown Component
const TextInputWithVariables = ({ value, onChange, placeholder, label, required, onVariableInsert, variables }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const filteredVariables = variables.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const insertVariable = (variableName) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart;
      const end = inputRef.current.selectionEnd;
      const variableText = `{{${variableName}}}`;
      const newValue = value.substring(0, start) + variableText + value.substring(end);
      onChange({ target: { name: 'subject', value: newValue } });
      
      setTimeout(() => {
        inputRef.current.focus();
        const newCursorPos = start + variableText.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }, 10);
      
      setShowDropdown(false);
      toast.success(`Added {{${variableName}}} to ${label.toLowerCase()}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name="subject"
          value={value}
          onChange={onChange}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
        />
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
        >
          <FaCode size={12} />
        </button>
      </div>
      
      {showDropdown && (
        <div ref={dropdownRef} className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl border border-blue-200 overflow-hidden">
          <div className="p-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 flex items-center gap-2">
                <FaCode /> Insert Variable
              </span>
              <button onClick={() => setShowDropdown(false)} className="text-blue-400 hover:text-blue-600">
                <FaTimes size={12} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2 w-full px-3 py-1.5 text-xs border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredVariables.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">No variables found</div>
            ) : (
              filteredVariables.map((v) => (
                <button
                  key={v.name}
                  onClick={() => insertVariable(v.name)}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-blue-50 last:border-0 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <code className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {v.example}
                      </code>
                      <p className="text-xs text-slate-500 mt-0.5">{v.description}</p>
                    </div>
                    <FaCopy size={10} className="text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Predefined Templates
const predefinedTemplates = {
  welcome: {
    name: 'Welcome Email',
    icon: <FaSmile />,
    color: '#3b82f6',
    subject: 'Welcome to {{company}}, {{name}}!',
    html: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Welcome aboard!</h1>
        </div>
        <div style="padding: 30px 20px; background: #ffffff;">
          <h2 style="color: #1f2937;">Hello {{name}},</h2>
          <p style="color: #4b5563; line-height: 1.6;">Thank you for joining <strong>{{company}}</strong>! We're excited to have you with us.</p>
          <p style="color: #4b5563; line-height: 1.6;">{{welcome_message}}</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="{{getting_started_link}}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Get Started →</a>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px;">Need help? Contact us at <a href="mailto:{{support_email}}" style="color: #3b82f6;">{{support_email}}</a></p>
        </div>
      </div>`
  },
  birthday: {
    name: 'Birthday Wishes',
    icon: <FaGift />,
    color: '#3b82f6',
    subject: '🎂 Happy Birthday {{name}}! Special offer inside',
    html: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎂 Happy Birthday!</h1>
        </div>
        <div style="padding: 30px 20px; background: #ffffff; text-align: center;">
          <h2 style="color: #1f2937;">Dear {{name}},</h2>
          <p style="color: #4b5563;">Wishing you a fantastic birthday from all of us at <strong>{{company}}</strong>!</p>
          <div style="background: #eff6ff; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin: 0 0 10px 0;">🎁 Your Birthday Gift</h3>
            <p style="font-size: 32px; font-weight: bold; color: #3b82f6; margin: 10px 0;">{{discount}}% OFF</p>
            <p style="color: #4b5563;">on your next purchase</p>
            <p style="margin-top: 10px;"><strong style="background: #fff; padding: 5px 10px; border-radius: 5px;">Code: BIRTHDAY{{current_year}}</strong></p>
          </div>
          <a href="{{offer_link}}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Claim Your Gift →</a>
        </div>
      </div>`
  },
  invoice: {
    name: 'Invoice Reminder',
    icon: <FaFileInvoice />,
    color: '#3b82f6',
    subject: 'Invoice #{{invoice_no}} - Payment Reminder',
    html: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; padding: 30px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0;">{{company}}</h2>
          <p style="margin: 5px 0 0;">Invoice Reminder</p>
        </div>
        <div style="padding: 30px 20px; background: #ffffff;">
          <p style="color: #4b5563;">Dear <strong>{{name}}</strong>,</p>
          <p style="color: #4b5563;">This is a reminder for invoice <strong>#{{invoice_no}}</strong> of amount <strong>₹{{amount}}</strong>.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <table style="width: 100%;"><tr><td style="padding: 8px;"><strong>Invoice No:</strong></td><td>{{invoice_no}}</td></tr>
            <tr><td style="padding: 8px;"><strong>Amount:</strong></td><td>₹{{amount}}</td></tr>
            <tr><td style="padding: 8px;"><strong>Due Date:</strong></td><td>{{due_date}}</td></tr>
            <tr><td style="padding: 8px;"><strong>Status:</strong></td><td><span style="color: #ef4444;">{{invoice_status}}</span></td></tr>
            </table>
          </div>
          <div style="text-align: center;">
            <a href="{{payment_link}}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Pay Now</a>
          </div>
        </div>
      </div>`
  },
  newsletter: {
    name: 'Newsletter',
    icon: <FaEnvelope />,
    color: '#3b82f6',
    subject: '{{newsletter_title}} - {{current_date}}',
    html: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">{{company}}</h1>
          <p style="margin: 10px 0 0;">{{newsletter_title}}</p>
        </div>
        <div style="padding: 30px 20px; background: #ffffff;">
          <h2 style="color: #1f2937;">Hello {{name}},</h2>
          <p style="color: #4b5563;">{{featured_article}}</p>
          <div style="margin: 30px 0;">
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <h3 style="color: #2563eb; margin: 0 0 10px 0;">📰 Latest Updates</h3>
              <p style="color: #4b5563;">{{update_1}}</p>
            </div>
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px;">
              <h3 style="color: #2563eb; margin: 0 0 10px 0;">🚀 Upcoming Events</h3>
              <p style="color: #4b5563;">{{update_2}}</p>
            </div>
          </div>
          <hr style="margin: 30px 0;" />
          <p style="text-align: center;"><a href="{{unsubscribe_link}}" style="color: #6b7280; font-size: 12px;">Unsubscribe</a></p>
        </div>
      </div>`
  },
  reminder: {
    name: 'Task Reminder',
    icon: <FaBell />,
    color: '#3b82f6',
    subject: 'Reminder: {{task_name}} due in {{days_left}} days',
    html: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; padding: 30px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0;">⏰ Task Reminder</h2>
        </div>
        <div style="padding: 30px 20px; background: #ffffff;">
          <p style="color: #4b5563;">Dear <strong>{{name}}</strong>,</p>
          <p style="color: #4b5563;">This is a reminder for your pending task:</p>
          <div style="background: #eff6ff; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #3b82f6;">{{task_name}}</h3>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> {{due_date}}</p>
            <p style="margin: 5px 0;"><strong>Days Left:</strong> {{days_left}} days</p>
          </div>
          <div style="text-align: center;">
            <a href="{{task_link}}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">View Task</a>
          </div>
        </div>
      </div>`
  },
  sale: {
    name: 'Sale/Promotion',
    icon: <FaRocket />,
    color: '#3b82f6',
    subject: '🔥 {{discount}}% OFF - Limited Time Offer!',
    html: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 32px;">🔥 SALE 🔥</h1>
          <p style="font-size: 48px; font-weight: bold; margin: 20px 0;">{{discount}}% OFF</p>
        </div>
        <div style="padding: 30px 20px; background: #ffffff; text-align: center;">
          <h2 style="color: #1f2937;">Hey {{name}}!</h2>
          <p style="color: #4b5563;">Don't miss out on our amazing offer!</p>
          <div style="margin: 20px 0;">
            <p style="font-size: 20px;"><s style="color: #9ca3af;">₹{{original_price}}</s> <strong style="color: #3b82f6; font-size: 32px;">₹{{sale_price}}</strong></p>
          </div>
          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Use Code:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 5px; font-weight: bold;">{{coupon_code}}</code></p>
            <p><strong>Valid till:</strong> {{offer_end_date}}</p>
          </div>
          <a href="{{offer_link}}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Shop Now →</a>
        </div>
      </div>`
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
    { value: 'general', label: 'General', icon: <FaFileAlt />, color: '#3b82f6', description: 'Standard email template' },
    { value: 'welcome', label: 'Welcome', icon: <FaSmile />, color: '#3b82f6', description: 'Onboarding and welcome emails' },
    { value: 'birthday', label: 'Birthday', icon: <FaGift />, color: '#3b82f6', description: 'Birthday wishes and offers' },
    { value: 'sale', label: 'Sale', icon: <FaChartLine />, color: '#3b82f6', description: 'Promotional and sales emails' },
    { value: 'invoice', label: 'Invoice', icon: <FaFileInvoice />, color: '#3b82f6', description: 'Billing and invoice emails' },
    { value: 'reminder', label: 'Reminder', icon: <FaBell />, color: '#3b82f6', description: 'Task and event reminders' },
    { value: 'newsletter', label: 'Newsletter', icon: <FaEnvelope />, color: '#3b82f6', description: 'Newsletter campaigns' }
  ];

  if (!show) return null;

  const currentType = templateTypesList.find(t => t.value === form.template_type);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onHide}></div>
        
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl transform transition-all">
          {/* Header - Fixed at top */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <FaTags className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {isEdit ? 'Edit Email Template' : 'Create Email Template'}
                  </h2>
                  <p className="text-blue-100 text-sm mt-0.5">
                    Design professional email templates with dynamic variables
                  </p>
                </div>
              </div>
              <button onClick={onHide} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <FaTimes className="text-white" size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(100vh-240px)]">
            {/* Template Type Selection with Dropdown */}
            <div className="mb-6">
              <div className="bg-blue-50/30 rounded-xl border border-blue-200 p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FaCrown className="text-blue-500" size={16} />
                      <h3 className="font-semibold text-slate-800">Template Configuration</h3>
                    </div>
                    <p className="text-xs text-slate-500">Select template type and configure basic settings</p>
                  </div>
                  <button
                    onClick={() => setShowPredefined(!showPredefined)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                  >
                    <FaStar size={14} />
                    Predefined Templates
                  </button>
                </div>
                
                {showPredefined && (
                  <div className="mb-5">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Choose a Predefined Template</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {Object.entries(predefinedTemplates).map(([key, template]) => (
                        <div
                          key={key}
                          onClick={() => {
                            loadVariablesByType(key);
                            setForm({
                              ...form,
                              template_name: template.name,
                              subject: template.subject,
                              html_body: template.html,
                              template_type: key
                            });
                            setSelectedType(key);
                            setShowPredefined(false);
                            toast.success(`Loaded ${template.name} template`);
                          }}
                          className="cursor-pointer bg-white border-2 border-blue-200 rounded-xl p-3 text-center hover:shadow-lg transition-all hover:border-blue-400 group"
                        >
                          <div className="text-3xl mb-2" style={{ color: template.color }}>{template.icon}</div>
                          <p className="text-xs font-semibold text-slate-700">{template.name}</p>
                        </div>
                      ))}
                    </div>
                    <hr className="my-4 border-blue-200" />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Template Type <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={form.template_type}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white appearance-none cursor-pointer font-medium"
                      >
                        {templateTypesList.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label} - {type.description}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <FaChevronDown className="text-blue-400" size={14} />
                      </div>
                    </div>
                    {currentType && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <p className="text-xs text-slate-500">{currentType.description}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="template_name"
                      value={form.template_name}
                      onChange={onChange}
                      placeholder="e.g., Birthday Greeting, Welcome Email"
                      className="w-full px-4 py-2.5 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <FaCheckCircle className="inline mr-2 text-blue-500" size={14} />
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={onChange}
                  className="w-full px-4 py-2.5 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="active">✅ Active</option>
                  <option value="inactive">⭕ Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <FaPalette className="inline mr-2 text-blue-500" size={14} />
                  Template Type
                </label>
                <input
                  type="text"
                  value={templateTypesList.find(t => t.value === form.template_type)?.label || 'General'}
                  disabled
                  className="w-full px-4 py-2.5 border-2 border-blue-200 rounded-xl bg-blue-50 text-slate-600"
                />
              </div>
            </div>

            {/* Variables Panel */}
            <div className="mb-4">
              <div className="bg-blue-50/50 rounded-xl border border-blue-200 overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-blue-100/50">
                  <div className="flex items-center gap-2">
                    <FaCode className="text-blue-600" size={16} />
                    <span className="font-semibold text-blue-800 text-sm">
                      Available Variables for {form.template_type} Template
                    </span>
                  </div>
                  <button
                    onClick={() => setShowVariables(!showVariables)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showVariables ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showVariables && (
                  <div className="p-3 max-h-48 overflow-y-auto">
                    {loadingVariables ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {availableVariables.map(v => (
                          <div
                            key={v.name}
                            className="group relative"
                          >
                            <button
                              onClick={() => {
                                toast.error('Click in subject or text body field first to insert variable');
                              }}
                              className="px-2 py-1 bg-white border border-blue-200 rounded-lg text-xs font-mono text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              {v.example}
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                              {v.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-1 bg-white/50 p-2 rounded-lg">
                      <FaInfoCircle size={10} className="text-blue-500" />
                      Click in subject or text body field first to insert variable
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Edit/Preview Tabs */}
            <div className="border-b border-blue-200">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveView('edit')}
                  className={`px-4 py-2 text-sm font-medium transition-all ${
                    activeView === 'edit'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FaEdit className="inline mr-2" size={14} />
                  Edit Template
                </button>
                <button
                  onClick={() => setActiveView('preview')}
                  className={`px-4 py-2 text-sm font-medium transition-all ${
                    activeView === 'preview'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FaEye className="inline mr-2" size={14} />
                  Preview
                </button>
              </div>
            </div>

            {activeView === 'edit' && (
              <div className="mt-4 space-y-4">
                {/* Subject with Variable Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <FaEnvelope className="inline mr-2 text-blue-500" size={14} />
                    Subject Line <span className="text-red-500">*</span>
                  </label>
                  <TextInputWithVariables
                    value={form.subject}
                    onChange={onChange}
                    placeholder="Email subject with variables like {{name}}"
                    label="Subject"
                    required
                    onVariableInsert={() => {}}
                    variables={availableVariables}
                  />
                </div>

                {/* HTML Body */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <FaCode className="inline mr-2 text-blue-500" size={14} />
                    HTML Body (Rich Text Editor)
                  </label>
                  <RichTextEditor
                    id="html_body_editor"
                    value={form.html_body}
                    onChange={(html) => setForm({ ...form, html_body: html })}
                    placeholder="Start writing your email here..."
                    onVariableInsert={() => toast.error('Click in subject or text body field first to insert variable')}
                  />
                </div>

                {/* Plain Text Body */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <FaFileAlt className="inline mr-2 text-blue-500" size={14} />
                    Plain Text Body (Optional)
                  </label>
                  <textarea
                    id="text_body"
                    name="text_body"
                    rows={4}
                    value={form.text_body}
                    onChange={onChange}
                    placeholder="Plain text version for email clients that don't support HTML"
                    className="w-full px-4 py-2.5 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {activeView === 'preview' && (
              <div className="mt-4">
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <FaCode className="inline mr-2 text-blue-500" size={14} />
                    Test Variables JSON
                  </label>
                  <textarea
                    name="preview_variables_json"
                    rows={5}
                    value={form.preview_variables_json}
                    onChange={onChange}
                    placeholder='{"name": "John Doe", "company": "ACME Corp", "discount": "50"}'
                    className="w-full px-4 py-2.5 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Enter sample values to preview your email
                  </p>
                </div>
                
                <button
                  onClick={handlePreview}
                  disabled={previewing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all mb-4 disabled:opacity-50"
                >
                  {previewing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <FaEye size={14} />
                  )}
                  {previewing ? ' Generating...' : ' Generate Preview'}
                </button>

                {preview && (
                  <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-white p-3 border-b border-blue-200">
                      <strong className="text-sm text-blue-700">📧 Email Preview</strong>
                    </div>
                    <div className="p-4">
                      <div className="mb-3">
                        <strong className="text-sm text-slate-700">Subject:</strong>
                        <p className="text-slate-700 mt-1">{preview.rendered_subject || '-'}</p>
                      </div>
                      <div>
                        <strong className="text-sm text-slate-700">HTML Preview:</strong>
                        <div className="border rounded-lg p-4 mt-2 bg-slate-50 overflow-auto max-h-96">
                          <div dangerouslySetInnerHTML={{ __html: preview.rendered_html || '' }} />
                        </div>
                      </div>
                      {preview.rendered_text && (
                        <div className="mt-3">
                          <strong className="text-sm text-slate-700">Plain Text Preview:</strong>
                          <pre className="border rounded-lg p-4 mt-2 bg-slate-50 text-xs whitespace-pre-wrap font-mono max-h-64 overflow-auto">
                            {preview.rendered_text}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - Fixed at bottom always visible */}
          <div className="border-t border-blue-200 px-6 py-4 bg-blue-50/30 rounded-b-2xl flex justify-end gap-3">
            <button
              onClick={onHide}
              className="px-4 py-2 text-slate-700 bg-white border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => setActiveView('preview')}
              className="px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors font-medium flex items-center gap-2"
            >
              <FaEye size={14} />
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <FaRegSave size={14} />
              )}
              {saving ? ' Saving...' : isEdit ? ' Update Template' : ' Save Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateFormModal;