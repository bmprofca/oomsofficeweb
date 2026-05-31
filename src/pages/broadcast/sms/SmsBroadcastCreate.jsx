import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Header, Sidebar } from '../../../components/header';
import { smsApi, normalizeList } from './smsApi';
import API_BASE_URL from '../../../utils/api-controller';
import getHeaders from '../../../utils/get-headers';
import {
  FiSend,
  FiFileText,
  FiSettings,
  FiUsers,
  FiPlus,
  FiTrash2,
  FiActivity,
  FiArrowLeft,
  FiCheck,
  FiCalendar,
  FiInfo,
  FiAlertCircle,
  FiClock,
  FiPlay,
  FiLayers,
  FiDatabase,
  FiHelpCircle,
  FiX,
  FiEdit,
  FiUser
} from 'react-icons/fi';

const newRecipient = () => ({ recipient_name: '', recipient_mobile: '', variable_values_json: '{}' });

const SmsBroadcastCreate = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('manual'); // manual, clients, groups

  // Config and Templates lists
  const [configs, setConfigs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);

  // Client Selection states
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  
  // Group selection states
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Form states
  const [form, setForm] = useState({
    config_id: '',
    template_id: '',
    broadcast_name: '',
    schedule_type: 'now',
    scheduled_at: '',
    timezone: 'Asia/Kolkata',
    global_variables_json: '{}',
    daily_limit: 1000,
  });

  // Selected template information
  const [templateText, setTemplateText] = useState('');
  const [templateVariables, setTemplateVariables] = useState([]);
  const [loadingTemplateVars, setLoadingTemplateVars] = useState(false);
  const [selectedTemplateObj, setSelectedTemplateObj] = useState(null);

  // Recipients input states
  const [recipients, setRecipients] = useState([newRecipient()]);
  const [bulkInput, setBulkInput] = useState('');
  
  // Preview Campaign states
  const [showPreview, setShowPreview] = useState(false);
  const [previewRendered, setPreviewRendered] = useState('');
  const [previewDltSnapshot, setPreviewDltSnapshot] = useState('');
  const [previewDltParams, setPreviewDltParams] = useState('');

  useEffect(() => { localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); }, [isMinimized]);
  useEffect(() => { loadInitialData(); }, []);

  // Fetch configs, templates, and client groups
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      const [c, t, g] = await Promise.all([
        smsApi.listConfigs({ page_no: 1, limit: 100 }),
        smsApi.listTemplates({ page_no: 1, limit: 100 }),
        axios.get(`${API_BASE_URL}/group/groups/all?limit=100`, { headers }).catch(() => ({ data: { data: { groups: [] } } }))
      ]);

      setConfigs(normalizeList(c?.data).filter(x => x.status === 'active'));
      setTemplates(normalizeList(t?.data).filter(x => x.status === 'active'));
      setGroups(g?.data?.data?.groups || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load initial form data');
    } finally {
      setLoading(false);
    }
  };

  // Search clients dynamically
  const searchClients = useCallback(async () => {
    if (!clientSearch.trim()) { setClients([]); return; }
    setLoadingClients(true);
    try {
      const headers = getHeaders();
      const res = await axios.get(`${API_BASE_URL}/client/search?search=${encodeURIComponent(clientSearch)}`, { headers });
      // Only keep clients with mobile numbers
      setClients((res?.data?.data || []).filter(c => c.mobile));
    } catch (e) { 
      toast.error('Failed to search clients'); 
      setClients([]); 
    } finally { 
      setLoadingClients(false); 
    }
  }, [clientSearch]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (clientSearch) searchClients();
      else setClients([]);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [clientSearch, searchClients]);

  // Load template details and extract placeholders
  const handleTemplateChange = async (templateId) => {
    setForm(prev => ({ ...prev, template_id: templateId }));
    if (!templateId) {
      setTemplateText('');
      setTemplateVariables([]);
      setSelectedTemplateObj(null);
      return;
    }

    setLoadingTemplateVars(true);
    try {
      const res = await smsApi.templateDetails(templateId);
      const text = res?.data?.message || '';
      setTemplateText(text);
      setSelectedTemplateObj(res?.data || null);

      // Parse placeholders like {{name}}
      const regex = /{{([a-zA-Z0-9_]+)}}/g;
      const extracted = new Set();
      let match;
      while ((match = regex.exec(text)) !== null) {
        extracted.add(match[1]);
      }
      const varList = Array.from(extracted);
      setTemplateVariables(varList);

      // Setup default global variables in JSON
      const globalVars = {};
      const globalDefaults = ['company', 'website', 'support_phone'];
      varList.forEach(v => {
        if (globalDefaults.includes(v)) {
          globalVars[v] = `OneSaaS Solutions`;
        }
      });
      setForm(prev => ({
        ...prev,
        global_variables_json: JSON.stringify(globalVars, null, 2)
      }));

    } catch (e) {
      toast.error('Failed to load template variables');
    } finally {
      setLoadingTemplateVars(false);
    }
  };

  // Manual Recipients Actions
  const addRecipientRow = () => {
    setRecipients(prev => [...prev, newRecipient()]);
  };

  const removeRecipientRow = (index) => {
    if (recipients.length === 1) {
      setRecipients([newRecipient()]);
    } else {
      setRecipients(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateRecipientField = (index, field, value) => {
    setRecipients(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateRecipientVariable = (index, varName, value) => {
    setRecipients(prev => {
      const next = [...prev];
      let vars = {};
      try {
        vars = JSON.parse(next[index].variable_values_json || '{}');
      } catch {
        vars = {};
      }
      vars[varName] = value;
      next[index].variable_values_json = JSON.stringify(vars);
      return next;
    });
  };

  // Bulk input parser
  const handleBulkImport = () => {
    if (!bulkInput.trim()) return;
    const lines = bulkInput.trim().split('\n');
    const parsed = [];

    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const mobile = parts[1];
        const varsObj = {};
        
        // Map any extra columns to variables in order
        templateVariables.forEach((v, i) => {
          if (parts[i + 2] !== undefined) {
            varsObj[v] = parts[i + 2];
          } else {
            varsObj[v] = '';
          }
        });

        parsed.push({
          recipient_name: name,
          recipient_mobile: mobile,
          variable_values_json: JSON.stringify(varsObj)
        });
      }
    });

    if (parsed.length > 0) {
      setRecipients(prev => [...prev.filter(r => r.recipient_mobile || r.recipient_name), ...parsed]);
      setBulkInput('');
      toast.success(`Imported ${parsed.length} recipients`);
    } else {
      toast.error('Invalid format. Use: Name, Mobile, var1, var2...');
    }
  };

  // Client Selection Actions
  const toggleSelectClient = (client) => {
    setSelectedClients(prev => {
      const isSelected = prev.some(c => c.username === client.username);
      if (isSelected) {
        return prev.filter(c => c.username !== client.username);
      } else {
        return [...prev, client];
      }
    });
  };

  // Group Selection Actions
  const toggleSelectGroup = (group) => {
    setSelectedGroups(prev => {
      const isSelected = prev.some(g => g.group_id === group.group_id);
      if (isSelected) {
        return prev.filter(g => g.group_id !== group.group_id);
      } else {
        return [...prev, group];
      }
    });
  };

  // Validate form inputs
  const validationErrors = useMemo(() => {
    const errors = {};
    if (!form.broadcast_name) errors.broadcast_name = 'Campaign Name is required';
    if (!form.template_id) errors.template_id = 'SMS template is required';
    if (form.schedule_type === 'scheduled' && !form.scheduled_at) errors.scheduled_at = 'Scheduled date/time is required';
    
    // Global variable json validation
    try {
      JSON.parse(form.global_variables_json || '{}');
    } catch {
      errors.global_variables_json = 'Invalid JSON object format';
    }

    if (activeTab === 'manual') {
      const filled = recipients.filter(r => r.recipient_mobile);
      if (filled.length === 0) errors.recipients = 'Add at least one recipient with a mobile number';
      
      recipients.forEach((r, idx) => {
        if (r.recipient_mobile && !/^\d{10,15}$/.test(r.recipient_mobile)) {
          errors[`mobile_${idx}`] = 'Invalid mobile number';
        }
      });
    } else if (activeTab === 'clients') {
      if (selectedClients.length === 0) errors.recipients = 'Select at least one recipient';
    } else if (activeTab === 'groups') {
      if (selectedGroups.length === 0) errors.recipients = 'Select at least one client group';
    }

    return errors;
  }, [form, recipients, activeTab, selectedClients, selectedGroups]);

  // Build API payload
  const buildPayload = async () => {
    let globalVars = {};
    try {
      globalVars = JSON.parse(form.global_variables_json || '{}');
    } catch {
      globalVars = {};
    }

    const payload = {
      config_id: form.config_id || "default_fast2sms",
      template_id: form.template_id,
      broadcast_name: form.broadcast_name,
      schedule_type: form.schedule_type,
      timezone: form.timezone,
      daily_limit: Number(form.daily_limit || 1000),
      global_variables_json: globalVars,
      message_snapshot: selectedTemplateObj?.message || "",
      dlt_template_id_snapshot: selectedTemplateObj?.dlt_template_id || null,
    };

    if (form.schedule_type === 'scheduled') {
      payload.scheduled_at = form.scheduled_at;
    }

    let recipientsList = [];

    if (activeTab === 'manual') {
      recipientsList = recipients
        .filter(r => r.recipient_mobile)
        .map(r => {
          let varValues = {};
          try {
            varValues = JSON.parse(r.variable_values_json || '{}');
          } catch {
            varValues = {};
          }
          return {
            recipient_name: r.recipient_name || 'Recipient',
            recipient_mobile: r.recipient_mobile,
            variable_values_json: varValues,
          };
        });
    } else if (activeTab === 'clients') {
      recipientsList = selectedClients.map(c => ({
        recipient_username: c.username,
        recipient_name: c.name || c.username,
        recipient_mobile: c.mobile,
        variable_values_json: {},
      }));
    } else if (activeTab === 'groups') {
      setLoading(true);
      try {
        const headers = getHeaders();
        const promises = selectedGroups.map(g => 
          axios.get(`${API_BASE_URL}/group/groups/all?group_id=${g.group_id}`, { headers })
        );
        const results = await Promise.all(promises);
        
        // Extract clients from all groups
        const clientMap = new Map();
        results.forEach(res => {
          const groupData = res?.data?.data;
          const firms = groupData?.firms || [];
          firms.forEach(firm => {
            const client = firm.client;
            if (client?.username) {
              clientMap.set(client.username, client);
            }
          });
        });

        recipientsList = Array.from(clientMap.values()).map(c => ({
          recipient_username: c.username,
          recipient_name: c.name || c.username,
          recipient_mobile: c.mobile,
          variable_values_json: {},
        }));

      } catch (e) {
        toast.error('Failed to load group recipients');
        setLoading(false);
        return null;
      }
    }

    payload.recipients = recipientsList;
    return payload;
  };

  // Compile local preview substituting variables
  const handleOpenPreview = async () => {
    if (!form.template_id) {
      toast.error('Select an SMS Template to preview');
      return;
    }

    let globalVars = {};
    try {
      globalVars = JSON.parse(form.global_variables_json || '{}');
    } catch {
      globalVars = {};
    }

    // Get the first recipient variable values
    let firstRecipientVars = {};
    if (activeTab === 'manual') {
      const active = recipients.filter(r => r.recipient_mobile)[0];
      if (active) {
        try { firstRecipientVars = JSON.parse(active.variable_values_json || '{}'); } catch {}
      }
    } else if (activeTab === 'clients') {
      const active = selectedClients[0];
      if (active) {
        firstRecipientVars = { name: active.name || active.username, mobile: active.mobile };
      }
    } else if (activeTab === 'groups') {
      const active = groups.find(g => selectedGroups.some(sg => sg.group_id === g.group_id))?.firms?.[0]?.client;
      if (active) {
        firstRecipientVars = { name: active.name || active.username, mobile: active.mobile };
      }
    }

    // Combine global variables with recipient-specific variables
    const vars = { ...globalVars, ...firstRecipientVars };

    // 1. Render transactional/plain output
    let rendered = templateText;
    templateVariables.forEach(v => {
      const val = vars[v] || `[${v}]`;
      rendered = rendered.replaceAll(`{{${v}}}`, val);
    });
    setPreviewRendered(rendered);

    // 2. Render DLT snapshot and joined parameters preview
    let dltSnap = templateText;
    const pipeValues = [];
    templateVariables.forEach(v => {
      dltSnap = dltSnap.replaceAll(`{{${v}}}`, `{#var#}`);
      pipeValues.push(vars[v] || `[${v}]`);
    });
    setPreviewDltSnapshot(dltSnap);
    setPreviewDltParams(pipeValues.length > 0 ? pipeValues.join('|') + '|' : '');

    setShowPreview(true);
  };

  // Submit and create campaign
  const handleLaunchCampaign = async () => {
    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please resolve form validation errors first');
      return;
    }

    setLoading(true);
    try {
      const payload = await buildPayload();
      if (!payload) return;

      const res = await smsApi.createBroadcast(payload);
      toast.success(res?.message || 'SMS Broadcast created successfully!');
      
      if (form.schedule_type === 'now') {
        toast.success('Campaign processing started in the background.');
      } else {
        toast.success(`Scheduled campaign for: ${form.scheduled_at}`);
      }

      navigate('/broadcast/sms');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to trigger campaign');
    } finally {
      setLoading(false);
    }
  };

  const selectedGateway = configs.find(c => c.config_id === form.config_id);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

      <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/broadcast/sms')} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
              <FiArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-800">Launch SMS Broadcast</h1>
              <p className="text-slate-500 text-xs md:text-sm">Create and launch dynamic text campaigns instantly or schedule them</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form inputs side */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Campaign settings card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="p-1 bg-blue-100 rounded-lg text-blue-600"><FiActivity className="w-3.5 h-3.5" /></span>
                  Campaign Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campaign Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Campaign Broadcast Name *</label>
                    <input
                      type="text"
                      value={form.broadcast_name}
                      onChange={(e) => setForm({ ...form, broadcast_name: e.target.value })}
                      placeholder="e.g., GST Return Reminders June"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${validationErrors.broadcast_name ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {validationErrors.broadcast_name && <p className="text-xs text-red-500 mt-1">{validationErrors.broadcast_name}</p>}
                  </div>

                  {/* SMS Gateway Config */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">SMS Gateway Configuration</label>
                    <select
                      value={form.config_id}
                      onChange={(e) => setForm({ ...form, config_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">System Default Gateway (Our Service)</option>
                      {configs.map(c => (
                        <option key={c.config_id} value={c.config_id}>
                          {c.config_name} ({c.route.toUpperCase()} Route)
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {selectedGateway 
                        ? `Using custom gateway with ${selectedGateway.route.toUpperCase()} route routing.` 
                        : "Using fallback system defaults (Fast2SMS API)."}
                    </p>
                  </div>

                  {/* SMS Template */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">SMS Template *</label>
                    <select
                      value={form.template_id}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 ${validationErrors.template_id ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">-- Select Template --</option>
                      {templates.map(t => (
                        <option key={t.template_id} value={t.template_id}>{t.template_name}</option>
                      ))}
                    </select>
                    {validationErrors.template_id && <p className="text-xs text-red-500 mt-1">{validationErrors.template_id}</p>}
                  </div>
                </div>

                {/* Template body read-only snapshot */}
                {templateText && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Template Message Snapshot</span>
                      {selectedTemplateObj?.dlt_template_id && (
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                          DLT ID: {selectedTemplateObj.dlt_template_id}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 font-mono whitespace-pre-wrap">{templateText}</p>
                    {templateVariables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-[10px] font-semibold text-slate-400">Placeholders:</span>
                        {templateVariables.map(v => (
                          <span key={v} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold">{"{{"}{v}{"}}"}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Target recipients block */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 bg-blue-100 rounded-lg text-blue-600"><FiUsers className="w-3.5 h-3.5" /></span>
                    Target Recipients
                  </h3>
                  
                  {/* Tabs selector */}
                  <div className="flex bg-slate-100/80 p-1 rounded-xl text-xs font-semibold gap-1">
                    <button
                      onClick={() => setActiveTab('manual')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${activeTab === 'manual' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      <FiEdit className="w-3.5 h-3.5" />
                      Direct Input
                    </button>
                    <button
                      onClick={() => setActiveTab('clients')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${activeTab === 'clients' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      <FiUser className="w-3.5 h-3.5" />
                      Select Clients
                    </button>
                    <button
                      onClick={() => setActiveTab('groups')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${activeTab === 'groups' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      <FiUsers className="w-3.5 h-3.5" />
                      Client Groups
                    </button>
                  </div>
                </div>

                {/* Tab Content 1: Manual/Direct Table */}
                {activeTab === 'manual' && (
                  <div className="space-y-4">
                    {/* Bulk parser drawer */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Fast Bulk Paste</span>
                      <p className="text-[10px] text-slate-400">Paste comma-separated rows. Format: Name, Mobile, variable1_val, variable2_val...</p>
                      <div className="flex gap-2">
                        <textarea
                          rows={2}
                          value={bulkInput}
                          onChange={(e) => setBulkInput(e.target.value)}
                          placeholder="Aria, 9999999990, Aria, 4321&#10;Jon, 9999999999, Jon, 5678"
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 font-mono resize-none"
                        />
                        <button
                          onClick={handleBulkImport}
                          className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                        >
                          Import
                        </button>
                      </div>
                    </div>

                    {/* Table of manual entries */}
                    <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[300px]">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Recipient Name</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Mobile Number</th>
                            {templateVariables.map(v => (
                              <th key={v} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{"{{"}{v}{"}}"}</th>
                            ))}
                            <th className="px-3 py-2 text-center w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {recipients.map((row, idx) => {
                            let vars = {};
                            try {
                              vars = JSON.parse(row.variable_values_json || '{}');
                            } catch {}

                            return (
                              <tr key={idx}>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={row.recipient_name}
                                    onChange={(e) => updateRecipientField(idx, 'recipient_name', e.target.value)}
                                    placeholder="Jane Doe"
                                    className="px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="tel"
                                    value={row.recipient_mobile}
                                    onChange={(e) => updateRecipientField(idx, 'recipient_mobile', e.target.value)}
                                    placeholder="9999999990"
                                    className={`px-2 py-1 border rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 w-full ${validationErrors[`mobile_${idx}`] ? 'border-red-500' : 'border-slate-300'}`}
                                  />
                                </td>
                                {templateVariables.map(v => (
                                  <td key={v} className="p-2">
                                    <input
                                      type="text"
                                      value={vars[v] || ''}
                                      onChange={(e) => updateRecipientVariable(idx, v, e.target.value)}
                                      placeholder={`Enter ${v}`}
                                      className="px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                    />
                                  </td>
                                ))}
                                <td className="p-2 text-center">
                                  <button onClick={() => removeRecipientRow(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-all">
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <button
                      onClick={addRecipientRow}
                      className="px-3 py-1.5 border border-dashed border-slate-300 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all flex items-center gap-1"
                    >
                      <FiPlus /> Add Recipient Row
                    </button>
                  </div>
                )}

                {/* Tab Content 2: Select Clients */}
                {activeTab === 'clients' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search clients by name, mobile, etc..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {loadingClients && (
                        <div className="absolute right-3 top-2.5 flex items-center space-x-1">
                          <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>

                    {/* Search results */}
                    {clients.length > 0 && (
                      <div className="border border-slate-200 rounded-xl max-h-[180px] overflow-y-auto bg-slate-50/50 p-2 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase px-1 tracking-wider">Search Results</span>
                        {clients.map(c => {
                          const isSelected = selectedClients.some(sc => sc.username === c.username);
                          return (
                            <div
                              key={c.username}
                              onClick={() => toggleSelectClient(c)}
                              className={`flex justify-between items-center p-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-white hover:bg-slate-100 text-slate-700'}`}
                            >
                              <div className="text-xs">
                                <span className="font-semibold">{c.name || c.username}</span>
                                <span className="text-slate-400 mx-2">•</span>
                                <span className="font-mono">{c.mobile}</span>
                              </div>
                              {isSelected && <FiCheck className="w-4 h-4 text-blue-600" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Selected Clients Pills */}
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Selected Clients ({selectedClients.length})</span>
                      {selectedClients.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No clients selected. Search above and select clients to add them.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                          {selectedClients.map(c => (
                            <div
                              key={c.username}
                              onClick={() => toggleSelectClient(c)}
                              className="px-2.5 py-1 bg-white text-slate-700 hover:text-red-600 rounded-full border border-slate-300 text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5"
                            >
                              <span>{c.name || c.username}</span>
                              <span className="text-[10px] font-mono text-slate-400">{c.mobile}</span>
                              <span className="text-red-400 font-bold hover:text-red-600">×</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab Content 3: Select Groups */}
                {activeTab === 'groups' && (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Client Groups</span>
                    {groups.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No client groups available in the branch.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto">
                        {groups.map(g => {
                          const isSelected = selectedGroups.some(sg => sg.group_id === g.group_id);
                          return (
                            <div
                              key={g.group_id}
                              onClick={() => toggleSelectGroup(g)}
                              className={`p-3 border rounded-xl cursor-pointer transition-all flex justify-between items-center ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}
                            >
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">{g.group_name}</h4>
                                <p className="text-[10px] text-slate-400 mt-1">{g.firms?.length || 0} enrolled client firms</p>
                              </div>
                              {isSelected && <div className="p-1 bg-blue-100 text-blue-600 rounded-full"><FiCheck className="w-3.5 h-3.5" /></div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Campaign Options Side */}
            <div className="space-y-6">
              
              {/* Variable fallbacks and limit */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="p-1 bg-blue-100 rounded-lg text-blue-600"><FiDatabase className="w-3.5 h-3.5" /></span>
                  Global Fallbacks
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    Global Variables (JSON)
                    <FiHelpCircle className="text-slate-400 cursor-help" title="Enter backup default values for placeholders if they're empty per recipient" />
                  </label>
                  <textarea
                    rows={4}
                    value={form.global_variables_json}
                    onChange={(e) => setForm({ ...form, global_variables_json: e.target.value })}
                    placeholder='{ "company": "OneSaaS Solutions" }'
                    className={`w-full px-3 py-2 border rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 ${validationErrors.global_variables_json ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {validationErrors.global_variables_json && <p className="text-xs text-red-500 mt-1">{validationErrors.global_variables_json}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Campaign Daily limit</label>
                  <input
                    type="number"
                    value={form.daily_limit}
                    onChange={(e) => setForm({ ...form, daily_limit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Schedule and Launch */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="p-1 bg-blue-100 rounded-lg text-blue-600"><FiClock className="w-3.5 h-3.5" /></span>
                  Scheduling Options
                </h3>

                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full">
                  <button
                    onClick={() => setForm({ ...form, schedule_type: 'now' })}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${form.schedule_type === 'now' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    Send Now
                  </button>
                  <button
                    onClick={() => setForm({ ...form, schedule_type: 'scheduled' })}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${form.schedule_type === 'scheduled' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    Schedule Later
                  </button>
                </div>

                {form.schedule_type === 'scheduled' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Scheduled Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={form.scheduled_at}
                        onChange={(e) => setForm({ ...form, scheduled_at: e.target.value.replace('T', ' ') + ':00' })}
                        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${validationErrors.scheduled_at ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {validationErrors.scheduled_at && <p className="text-xs text-red-500 mt-1">{validationErrors.scheduled_at}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Timezone</label>
                      <select
                        value={form.timezone}
                        onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    onClick={handleOpenPreview}
                    disabled={!form.template_id}
                    className="w-full px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FiSend /> Preview rendering
                  </button>
                  <button
                    onClick={handleLaunchCampaign}
                    disabled={loading || Object.keys(validationErrors).length > 0}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-md disabled:opacity-55"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Launching Campaign...
                      </>
                    ) : (
                      <>
                        <FiPlay />
                        {form.schedule_type === 'now' ? 'Launch Campaign' : 'Schedule Campaign'}
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Preview rendering modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={() => setShowPreview(false)}></div>

          {/* Modal Panel */}
          <div className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col border border-slate-200">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FiSend className="text-blue-500" />
                Substitute Variable Output
              </h3>
              <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-slate-100 rounded-lg"><FiX /></button>
            </div>

            {/* Scrollable Body */}
            <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4">
              {/* Standard text representation */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fully substitution message output</span>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                  {previewRendered}
                </div>
              </div>

              {/* DLT snapshot representation */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DLT Route payload representation</span>
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-semibold text-slate-400 uppercase">API "template_id" Parameter (DLT Template ID):</span>
                    <p className="font-mono text-xs text-indigo-900 bg-white p-2 rounded border border-indigo-100">
                      {selectedTemplateObj?.dlt_template_id || '[No DLT Template ID defined]'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-semibold text-slate-400 uppercase">API "variables_values" Parameter:</span>
                    <p className="font-mono text-xs text-indigo-950 bg-white p-2 rounded border border-indigo-100">{previewDltParams}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex justify-end px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button onClick={() => setShowPreview(false)} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-all">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsBroadcastCreate;
