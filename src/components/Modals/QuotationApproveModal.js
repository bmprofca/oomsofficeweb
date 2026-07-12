import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft,
    FiArrowRight,
    FiBriefcase,
    FiEdit,
    FiMic,
    FiPlus,
    FiSearch,
    FiStopCircle,
    FiTrash2,
    FiUserCheck,
    FiUserPlus,
    FiX,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import { uploadOneSaasFile } from '../../utils/onesaas-upload';
import CustomSelect from '../CustomSelect';
import { optionByValue } from '../../utils/customSelectHelpers';
import { DatePickerField } from '../PortalDatePicker';

const formatMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
};

const getQuotationItems = (row) => {
    if (Array.isArray(row?.items)) return row.items;
    if (Array.isArray(row?.quotation_items)) return row.quotation_items;
    if (Array.isArray(row?.item_list)) return row.item_list;
    return [];
};

const getServiceNameFromItem = (item) =>
    item?.service?.name || item?.service_name || item?.item_name || item?.name || item?.description || 'N/A';

const getQuotationId = (row) =>
    row?.quotation_id || row?.id || row?.quotation_no || row?.quote_no || row?.quoteNo;

const ToggleSwitch = ({ checked, onChange, label }) => (
    <div className="flex items-center gap-2.5">
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                checked ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
        <span className="text-sm font-medium text-slate-800">{label}</span>
    </div>
);

const initialFormState = () => ({
    due_date: '',
    has_fy: '0',
    has_ay: '0',
    financial_years: [],
    assisment_years: [],
    staff: [],
    ca_id: '',
    agent_id: '',
    text_notes: [],
});

const QuotationApproveModal = ({ isOpen, quotation, onClose, onSuccess }) => {
    const [form, setForm] = useState(initialFormState);
    const [submitting, setSubmitting] = useState(false);

    const [services, setServices] = useState([]);
    const [assessmentYearsList, setAssessmentYearsList] = useState([]);
    const [financialYearsList, setFinancialYearsList] = useState([]);

    const [subTasks, setSubTasks] = useState([]);
    const [showSubTaskForm, setShowSubTaskForm] = useState(false);
    const [subTaskForm, setSubTaskForm] = useState({ type: 'text', service_id: '', manual_text: '' });

    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

    const [caSearchQuery, setCaSearchQuery] = useState('');
    const [caSearchResults, setCaSearchResults] = useState([]);
    const [caSearchLoading, setCaSearchLoading] = useState(false);
    const [selectedCaDisplay, setSelectedCaDisplay] = useState(null);

    const [agentSearchQuery, setAgentSearchQuery] = useState('');
    const [agentSearchResults, setAgentSearchResults] = useState([]);
    const [agentSearchLoading, setAgentSearchLoading] = useState(false);
    const [selectedAgentDisplay, setSelectedAgentDisplay] = useState(null);

    const [attachedFiles, setAttachedFiles] = useState([]);
    const fileInputRef = useRef(null);

    const [voiceNotesList, setVoiceNotesList] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingIntervalRef = useRef(null);
    const recordingTimeRef = useRef(0);

    const items = useMemo(() => getQuotationItems(quotation), [quotation]);
    const primaryItem = items[0] || null;
    const firm = quotation?.firm || {};
    const client = quotation?.client || {};
    const amount = quotation?.amount || {};

    const resetState = useCallback(() => {
        setForm(initialFormState());
        setSubTasks([]);
        setShowSubTaskForm(false);
        setSubTaskForm({ type: 'text', service_id: '', manual_text: '' });
        setAllEmployees([]);
        setSelectedEmployees([]);
        setEmployeeSearchQuery('');
        setCaSearchQuery('');
        setCaSearchResults([]);
        setSelectedCaDisplay(null);
        setAgentSearchQuery('');
        setAgentSearchResults([]);
        setSelectedAgentDisplay(null);
        setAttachedFiles((prev) => {
            prev.forEach((a) => {
                if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl);
            });
            return [];
        });
        setVoiceNotesList([]);
        setIsRecording(false);
        setRecordingTime(0);
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            resetState();
        }
    }, [isOpen, resetState]);

    useEffect(() => {
        if (!isOpen) return;
        const headers = getHeaders();
        if (!headers) return;
        const base = API_BASE_URL.replace(/\/$/, '');

        axios.get(`${base}/service/list`, { headers }).then((res) => {
            if (res.data?.success && Array.isArray(res.data.data)) {
                setServices(res.data.data);
            }
        }).catch(() => {});

        Promise.all([
            fetch(`${base}/utils/assisment-years`, { headers }).then((r) => r.json()),
            fetch(`${base}/utils/financial-years`, { headers }).then((r) => r.json()),
        ]).then(([ayRes, fyRes]) => {
            if (Array.isArray(ayRes?.data)) setAssessmentYearsList(ayRes.data);
            if (Array.isArray(fyRes?.data)) setFinancialYearsList(fyRes.data);
        }).catch(() => {});

        const fetchAllStaff = async () => {
            setStaffLoading(true);
            const all = [];
            let page = 1;
            const limit = 100;
            try {
                for (;;) {
                    const res = await fetch(`${base}/settings/staff/list?search=&page=${page}&limit=${limit}`, { headers });
                    const json = await res.json();
                    const list = json?.data && Array.isArray(json.data) ? json.data : [];
                    all.push(...list);
                    if (json?.meta?.is_last_page) break;
                    page += 1;
                }
                const mapped = all.map((item) => ({
                    username: item.username,
                    name: item.profile?.name ?? item.username,
                    mobile: item.profile?.mobile ?? '',
                    email: item.profile?.email ?? '',
                    department: item.designation ?? '',
                }));
                setAllEmployees(mapped);
            } catch (err) {
                console.error('Failed to fetch staff:', err);
            } finally {
                setStaffLoading(false);
            }
        };
        fetchAllStaff();
    }, [isOpen]);

    useEffect(() => {
        const term = caSearchQuery.trim();
        if (term.length < 3) {
            setCaSearchResults([]);
            return undefined;
        }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setCaSearchLoading(true);
            try {
                const url = `${API_BASE_URL.replace(/\/$/, '')}/ca/search?search=${encodeURIComponent(term)}`;
                const res = await fetch(url, { headers: getHeaders(), signal: controller.signal });
                const json = await res.json();
                setCaSearchResults(Array.isArray(json?.data) ? json.data : []);
            } catch (err) {
                if (err.name !== 'AbortError') setCaSearchResults([]);
            } finally {
                setCaSearchLoading(false);
            }
        }, 300);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [caSearchQuery]);

    useEffect(() => {
        const term = agentSearchQuery.trim();
        if (term.length < 3) {
            setAgentSearchResults([]);
            return undefined;
        }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setAgentSearchLoading(true);
            try {
                const url = `${API_BASE_URL.replace(/\/$/, '')}/agent/search?search=${encodeURIComponent(term)}`;
                const res = await fetch(url, { headers: getHeaders(), signal: controller.signal });
                const json = await res.json();
                setAgentSearchResults(Array.isArray(json?.data) ? json.data : []);
            } catch (err) {
                if (err.name !== 'AbortError') setAgentSearchResults([]);
            } finally {
                setAgentSearchLoading(false);
            }
        }, 300);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [agentSearchQuery]);

    const filteredAvailableEmployees = useMemo(() => {
        const q = employeeSearchQuery.trim().toLowerCase();
        if (!q) return allEmployees;
        return allEmployees.filter((emp) => {
            const name = (emp.name || '').toLowerCase();
            const mobile = (emp.mobile || '').toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const dept = (emp.department || '').toLowerCase();
            return name.includes(q) || mobile.includes(q) || email.includes(q) || dept.includes(q);
        });
    }, [allEmployees, employeeSearchQuery]);

    const serviceOptions = useMemo(
        () => services.map((s) => ({ value: s.service_id, label: s.name || s.service_name || 'Unnamed', searchText: s.name || '' })),
        [services]
    );

    const addEmployee = (employee) => {
        setSelectedEmployees((prev) => [...prev, employee]);
        setAllEmployees((prev) => prev.filter((emp) => emp.username !== employee.username));
        setForm((prev) => ({ ...prev, staff: [...prev.staff, employee.username] }));
    };

    const removeEmployee = (employee) => {
        setAllEmployees((prev) => [...prev, employee]);
        setSelectedEmployees((prev) => prev.filter((emp) => emp.username !== employee.username));
        setForm((prev) => ({ ...prev, staff: prev.staff.filter((u) => u !== employee.username) }));
    };

    const addAllEmployees = () => {
        const toAdd = filteredAvailableEmployees;
        setSelectedEmployees((prev) => [...prev, ...toAdd]);
        setForm((prev) => ({ ...prev, staff: [...prev.staff, ...toAdd.map((e) => e.username)] }));
        setAllEmployees((prev) => prev.filter((emp) => !toAdd.some((e) => e.username === emp.username)));
    };

    const removeAllEmployees = () => {
        setAllEmployees((prev) => [...prev, ...selectedEmployees]);
        setSelectedEmployees([]);
        setForm((prev) => ({ ...prev, staff: [] }));
    };

    const toggleAssessmentYear = (yearValue) => {
        setForm((prev) => {
            const current = [...prev.assisment_years];
            const idx = current.indexOf(yearValue);
            if (idx >= 0) current.splice(idx, 1);
            else current.push(yearValue);
            return { ...prev, assisment_years: current };
        });
    };

    const toggleFinancialYear = (yearValue) => {
        setForm((prev) => {
            const current = [...prev.financial_years];
            const idx = current.indexOf(yearValue);
            if (idx >= 0) current.splice(idx, 1);
            else current.push(yearValue);
            return { ...prev, financial_years: current };
        });
    };

    const selectAllAssessmentYears = () => {
        setForm((prev) => ({ ...prev, assisment_years: [...assessmentYearsList] }));
    };

    const clearAllAssessmentYears = () => {
        setForm((prev) => ({ ...prev, assisment_years: [] }));
    };

    const selectAllFinancialYears = () => {
        setForm((prev) => ({ ...prev, financial_years: [...financialYearsList] }));
    };

    const clearAllFinancialYears = () => {
        setForm((prev) => ({ ...prev, financial_years: [] }));
    };

    const addTextNote = () => setForm((prev) => ({ ...prev, text_notes: [...prev.text_notes, ''] }));
    const updateTextNote = (index, value) => {
        setForm((prev) => {
            const next = [...prev.text_notes];
            next[index] = value;
            return { ...prev, text_notes: next };
        });
    };
    const removeTextNote = (index) => {
        setForm((prev) => ({ ...prev, text_notes: prev.text_notes.filter((_, i) => i !== index) }));
    };

    const uploadFile = async (fileOrBlob, filename = 'file') => {
        const file = fileOrBlob instanceof File
            ? fileOrBlob
            : new File([fileOrBlob], filename, { type: fileOrBlob.type || 'audio/wav' });
        const { url } = await uploadOneSaasFile(file);
        return { url };
    };

    const handleFileAttach = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length || !getHeaders()) {
            if (!getHeaders()) toast.error('Authentication required');
            return;
        }
        for (const file of files) {
            const id = Math.random().toString(36).slice(2, 11);
            const previewUrl = URL.createObjectURL(file);
            setAttachedFiles((prev) => [...prev, {
                id, file, name: '', remark: '', url: null, uploading: true, previewUrl,
            }]);
            try {
                const { url } = await uploadFile(file);
                setAttachedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, url, uploading: false } : f)));
            } catch (err) {
                toast.error(err.response?.data?.message || err.message || 'Upload failed');
                setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
                URL.revokeObjectURL(previewUrl);
            }
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const duration = recordingTimeRef.current;
                setRecordingTime(0);
                const tempId = Math.random().toString(36).slice(2, 11);
                setVoiceNotesList((prev) => [...prev, { id: tempId, url: null, duration, uploading: true }]);
                (async () => {
                    try {
                        const { url } = await uploadFile(blob, `voice-${Date.now()}.wav`);
                        setVoiceNotesList((prev) => prev.map((v) => (v.id === tempId ? { ...v, url, uploading: false } : v)));
                    } catch (err) {
                        toast.error(err.response?.data?.message || err.message || 'Voice upload failed');
                        setVoiceNotesList((prev) => prev.filter((v) => v.id !== tempId));
                    }
                })();
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimeRef.current = 0;
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
                recordingTimeRef.current += 1;
            }, 1000);
        } catch {
            toast.error('Microphone access denied or unavailable');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
            setIsRecording(false);
            clearInterval(recordingIntervalRef.current);
        }
    };

    const removeVoiceNote = (id) => {
        setVoiceNotesList((prev) => prev.filter((v) => v.id !== id));
    };

    const addSubTask = () => {
        if (subTaskForm.type === 'service' && !subTaskForm.service_id) {
            toast.error('Select a service for the subtask');
            return;
        }
        if (subTaskForm.type === 'text' && !subTaskForm.manual_text.trim()) {
            toast.error('Enter subtask description');
            return;
        }
        const newSubTask = {
            id: Math.random().toString(36).slice(2, 11),
            type: subTaskForm.type === 'service' ? 'service' : 'text',
            description: subTaskForm.type === 'service'
                ? services.find((s) => String(s.service_id) === String(subTaskForm.service_id))?.name
                : subTaskForm.manual_text.trim(),
            ...(subTaskForm.type === 'service'
                ? { service_id: subTaskForm.service_id }
                : { content: subTaskForm.manual_text.trim() }),
        };
        setSubTasks((prev) => [...prev, newSubTask]);
        setSubTaskForm({ type: 'text', service_id: '', manual_text: '' });
        setShowSubTaskForm(false);
    };

    const buildPayload = () => {
        const attachmentsWithUrl = attachedFiles.filter((a) => a.url);
        const missingName = attachmentsWithUrl.find((a) => !(a.name || '').trim());
        if (missingName) {
            throw new Error('Please enter a name for every attachment');
        }
        if (attachedFiles.some((a) => a.uploading) || voiceNotesList.some((v) => v.uploading)) {
            throw new Error('Please wait for uploads to finish');
        }

        const dueDate = String(form.due_date || '').trim();
        if (!dueDate) throw new Error('Due date is required');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('Invalid due date format');

        const quotationId = String(getQuotationId(quotation) || '').trim();
        if (!quotationId) throw new Error('Quotation id is missing');

        const payload = {
            quotation_id: quotationId,
            status: 'approved',
            due_date: dueDate,
        };

        payload.assignment = {
            staff: form.staff || [],
            ca_id: form.ca_id || null,
            agent_id: form.agent_id || null,
        };

        if (subTasks.length > 0) {
            payload.subtasks = subTasks.map((t) =>
                t.type === 'service'
                    ? { type: 'service', service_id: t.service_id }
                    : { type: 'text', content: t.content || '' }
            );
        }

        const textNotes = (form.text_notes || []).map((t) => (t || '').trim()).filter(Boolean);
        const voiceUrls = voiceNotesList.filter((v) => v.url && !v.uploading).map((v) => v.url);
        const attachments = attachmentsWithUrl.map((a) => ({
            name: (a.name || '').trim(),
            remark: (a.remark || '').trim(),
            url: a.url,
        }));

        if (textNotes.length || attachments.length || voiceUrls.length) {
            payload.notes = {
                text: textNotes,
                attachments,
                voice: voiceUrls,
            };
        }

        const meta = {};
        if (form.has_fy === '1' && form.financial_years.length) {
            meta.financial_years = form.financial_years;
        }
        if (form.has_ay === '1' && form.assisment_years.length) {
            meta.assisment_years = form.assisment_years;
        }
        if (Object.keys(meta).length) payload.meta = meta;

        return payload;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication headers are missing. Please sign in again.');
            return;
        }

        let payload;
        try {
            payload = buildPayload();
        } catch (err) {
            toast.error(err.message || 'Please complete required fields');
            return;
        }

        setSubmitting(true);
        const loadingToast = toast.loading('Approving quotation...');
        try {
            const response = await axios.put(`${API_BASE_URL}/quotation/change-status`, payload, { headers });
            const result = response.data || {};
            toast.dismiss(loadingToast);
            if (!result.success) {
                throw new Error(result.message || 'Failed to approve quotation');
            }
            toast.success(result.message || 'Quotation approved and task created successfully');
            onSuccess?.(result);
            onClose?.();
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.message || err.message || 'Failed to approve quotation');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !quotation) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-start justify-center p-2 sm:p-3 z-[60] backdrop-blur-sm overflow-y-auto"
            onClick={() => {
                if (submitting) return;
                onClose?.();
            }}
        >
            <motion.div
                initial={{ scale: 0.95, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 12 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-1 max-h-[calc(100vh-0.5rem)] sm:max-h-[calc(100vh-1rem)] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-4 py-2.5 text-white flex items-center justify-between gap-3 shrink-0">
                    <h3 className="text-sm font-bold text-white truncate">Approve Quotation</h3>
                    <button
                        type="button"
                        onClick={() => { if (!submitting) onClose?.(); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                        aria-label="Close"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden bg-slate-50/80">
                    <div className="px-4 py-3 overflow-y-auto flex-1 space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/80">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Quotation summary</h4>
                            </div>
                            <div className="p-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Client</p>
                                    <p className="text-sm font-semibold text-slate-800 truncate">{client?.name || quotation?.username || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Firm</p>
                                    <p className="text-sm font-semibold text-slate-800 truncate">{firm?.firm_name || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Service</p>
                                    <p className="text-sm font-semibold text-slate-800 truncate">{primaryItem ? getServiceNameFromItem(primaryItem) : 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-600/80 mb-0.5">Total</p>
                                    <p className="text-sm font-bold text-indigo-900">{formatMoney(amount?.total ?? primaryItem?.total)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/80">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Task setup</h4>
                            </div>
                            <div className="p-3 space-y-3">
                                <div className="max-w-sm space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">
                                        Due date <span className="text-red-500">*</span>
                                    </label>
                                    <DatePickerField
                                        value={form.due_date}
                                        onChange={(val) => setForm((prev) => ({ ...prev, due_date: val || '' }))}
                                        placeholder="Select due date"
                                        mode="single"
                                        initialTab="single"
                                        quickOptionKeys={['td', 'tom', 'n7', 'eom']}
                                        wrapperClassName="w-full"
                                        buttonClassName="w-full pl-3 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none text-slate-700"
                                    />
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Applicable for</p>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                                        <ToggleSwitch
                                            checked={form.has_ay === '1'}
                                            label="Assessment Year (AY)"
                                            onChange={() => setForm((prev) => ({
                                                ...prev,
                                                has_ay: prev.has_ay === '1' ? '0' : '1',
                                                assisment_years: prev.has_ay === '1' ? [] : prev.assisment_years,
                                            }))}
                                        />
                                        <ToggleSwitch
                                            checked={form.has_fy === '1'}
                                            label="Financial Year (FY)"
                                            onChange={() => setForm((prev) => ({
                                                ...prev,
                                                has_fy: prev.has_fy === '1' ? '0' : '1',
                                                financial_years: prev.has_fy === '1' ? [] : prev.financial_years,
                                            }))}
                                        />
                                    </div>
                                </div>

                                {form.has_ay === '1' && (
                                    <div className="space-y-2">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5">
                                            <label className="block text-sm font-medium text-slate-700">Assessment Years (AY)</label>
                                            <div className="flex gap-1.5">
                                                <motion.button type="button" onClick={selectAllAssessmentYears} className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Select all</motion.button>
                                                <motion.button type="button" onClick={clearAllAssessmentYears} className="px-2.5 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Clear all</motion.button>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                            {assessmentYearsList.length === 0 ? (
                                                <p className="text-sm text-slate-500 text-center py-3">No assessment years available</p>
                                            ) : (
                                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
                                                    {assessmentYearsList.map((year) => (
                                                        <motion.button
                                                            key={year}
                                                            type="button"
                                                            onClick={() => toggleAssessmentYear(year)}
                                                            className={`py-2 px-2 text-xs font-medium rounded-md border transition-all ${form.assisment_years.includes(year) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            AY {year}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {form.has_fy === '1' && (
                                    <div className="space-y-2">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5">
                                            <label className="block text-sm font-medium text-slate-700">Financial Years (FY)</label>
                                            <div className="flex gap-1.5">
                                                <motion.button type="button" onClick={selectAllFinancialYears} className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Select all</motion.button>
                                                <motion.button type="button" onClick={clearAllFinancialYears} className="px-2.5 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Clear all</motion.button>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                            {financialYearsList.length === 0 ? (
                                                <p className="text-sm text-slate-500 text-center py-3">No financial years available</p>
                                            ) : (
                                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
                                                    {financialYearsList.map((year) => (
                                                        <motion.button
                                                            key={year}
                                                            type="button"
                                                            onClick={() => toggleFinancialYear(year)}
                                                            className={`py-2 px-2 text-xs font-medium rounded-md border transition-all ${form.financial_years.includes(year) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            FY {year}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/80">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Assignment</h4>
                            </div>
                            <div className="p-3 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">CA</label>
                                        <div className="relative flex items-center w-full bg-white border border-slate-200 rounded-lg min-h-[38px] focus-within:ring-2 focus-within:ring-indigo-500/30">
                                            <FiUserCheck className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                                            {form.ca_id ? (
                                                <>
                                                    <span className="flex-1 pl-9 pr-9 py-2 text-sm truncate">{selectedCaDisplay?.name ?? form.ca_id}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setForm((prev) => ({ ...prev, ca_id: '' }));
                                                            setSelectedCaDisplay(null);
                                                        }}
                                                        className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-600"
                                                    >
                                                        <FiX className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={caSearchQuery}
                                                        onChange={(e) => setCaSearchQuery(e.target.value)}
                                                        placeholder="Search CA (min 3 characters)"
                                                        className="flex-1 pl-9 pr-3 py-2 text-sm border-0 bg-transparent focus:outline-none"
                                                    />
                                                    {caSearchQuery.trim().length >= 3 && (
                                                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                            {caSearchLoading && <div className="p-3 text-sm text-slate-500">Searching...</div>}
                                                            {!caSearchLoading && caSearchResults.map((item) => (
                                                                <button
                                                                    key={item.username}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setForm((prev) => ({ ...prev, ca_id: item.username }));
                                                                        setSelectedCaDisplay({ username: item.username, name: item.name });
                                                                        setCaSearchQuery('');
                                                                        setCaSearchResults([]);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"
                                                                >
                                                                    {item.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">Agent</label>
                                        <div className="relative flex items-center w-full bg-white border border-slate-200 rounded-lg min-h-[38px] focus-within:ring-2 focus-within:ring-indigo-500/30">
                                            <FiUserPlus className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                                            {form.agent_id ? (
                                                <>
                                                    <span className="flex-1 pl-9 pr-9 py-2 text-sm truncate">{selectedAgentDisplay?.name ?? form.agent_id}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setForm((prev) => ({ ...prev, agent_id: '' }));
                                                            setSelectedAgentDisplay(null);
                                                        }}
                                                        className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-600"
                                                    >
                                                        <FiX className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={agentSearchQuery}
                                                        onChange={(e) => setAgentSearchQuery(e.target.value)}
                                                        placeholder="Search agent (min 3 characters)"
                                                        className="flex-1 pl-9 pr-3 py-2 text-sm border-0 bg-transparent focus:outline-none"
                                                    />
                                                    {agentSearchQuery.trim().length >= 3 && (
                                                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                            {agentSearchLoading && <div className="p-3 text-sm text-slate-500">Searching...</div>}
                                                            {!agentSearchLoading && agentSearchResults.map((item) => (
                                                                <button
                                                                    key={item.username}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setForm((prev) => ({ ...prev, agent_id: item.username }));
                                                                        setSelectedAgentDisplay({ username: item.username, name: item.name });
                                                                        setAgentSearchQuery('');
                                                                        setAgentSearchResults([]);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"
                                                                >
                                                                    {item.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                                    <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 min-h-[220px] flex flex-col">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-slate-800">Available staff</span>
                                            <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">{allEmployees.length}</span>
                                        </div>
                                        <div className="relative mb-2">
                                            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={employeeSearchQuery}
                                                onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                                                placeholder="Search staff..."
                                                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                                            {staffLoading && <p className="text-sm text-slate-500 text-center py-6">Loading...</p>}
                                            {!staffLoading && filteredAvailableEmployees.map((employee) => (
                                                <button
                                                    key={employee.username}
                                                    type="button"
                                                    onClick={() => addEmployee(employee)}
                                                    className="w-full p-2 text-left bg-white border border-slate-200 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
                                                >
                                                    <div className="text-sm font-medium text-slate-800">{employee.name}</div>
                                                    <div className="text-xs text-slate-500">{employee.department || employee.mobile || '—'}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="lg:col-span-1 flex lg:flex-col justify-center items-center gap-2">
                                        <button type="button" onClick={addAllEmployees} disabled={!filteredAvailableEmployees.length} className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                            <FiArrowRight className="w-4 h-4" />
                                        </button>
                                        <button type="button" onClick={removeAllEmployees} disabled={!selectedEmployees.length} className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                            <FiArrowLeft className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 min-h-[220px] flex flex-col">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-slate-800">Assigned staff</span>
                                            <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">{selectedEmployees.length}</span>
                                        </div>
                                        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                                            {selectedEmployees.length === 0 && (
                                                <p className="text-sm text-slate-400 text-center py-6">No staff selected</p>
                                            )}
                                            {selectedEmployees.map((employee) => (
                                                <button
                                                    key={employee.username}
                                                    type="button"
                                                    onClick={() => removeEmployee(employee)}
                                                    className="w-full p-2 text-left bg-white border border-indigo-200 rounded-lg hover:border-red-200 hover:bg-red-50/50 transition-colors"
                                                >
                                                    <div className="text-sm font-medium text-slate-800">{employee.name}</div>
                                                    <div className="text-xs text-slate-500">{employee.department || employee.mobile || '—'}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/80">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Subtasks</h4>
                                <button
                                    type="button"
                                    onClick={() => setShowSubTaskForm(true)}
                                    className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                                >
                                    <FiPlus className="h-3.5 w-3.5" />
                                    Add
                                </button>
                            </div>
                            <div className="p-3 space-y-2">
                                <AnimatePresence>
                                    {showSubTaskForm && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 space-y-2"
                                        >
                                            <div className="inline-flex rounded-lg bg-white border border-slate-200 p-1 gap-1">
                                                {[
                                                    { id: 'text', label: 'Text', icon: <FiEdit className="w-3.5 h-3.5" /> },
                                                    { id: 'service', label: 'Service', icon: <FiBriefcase className="w-3.5 h-3.5" /> },
                                                ].map((tab) => (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() => setSubTaskForm({ type: tab.id, service_id: '', manual_text: '' })}
                                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold ${
                                                            subTaskForm.type === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-600'
                                                        }`}
                                                    >
                                                        {tab.icon}
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {subTaskForm.type === 'service' ? (
                                                <CustomSelect
                                                    options={serviceOptions}
                                                    value={optionByValue(serviceOptions, subTaskForm.service_id || null)}
                                                    onChange={(opt) => setSubTaskForm((prev) => ({ ...prev, service_id: opt ? opt.value : '' }))}
                                                    getOptionLabel={(opt) => opt.label}
                                                    getOptionValue={(opt) => opt.value}
                                                    placeholder="Select service"
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={subTaskForm.manual_text}
                                                    onChange={(e) => setSubTaskForm((prev) => ({ ...prev, manual_text: e.target.value }))}
                                                    placeholder="Subtask description"
                                                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                                                />
                                            )}
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => setShowSubTaskForm(false)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg">Cancel</button>
                                                <button type="button" onClick={addSubTask} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg">Add</button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {subTasks.length > 0 && (
                                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                                        {subTasks.map((task) => (
                                            <div key={task.id} className="flex items-center justify-between px-3 py-2.5 bg-white">
                                                <span className="text-sm text-slate-700">{task.description}</span>
                                                <button type="button" onClick={() => setSubTasks((prev) => prev.filter((t) => t.id !== task.id))} className="text-red-500 p-1">
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/80">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Notes</h4>
                            </div>
                            <div className="p-3 space-y-3">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-700">Text notes</span>
                                        <button type="button" onClick={addTextNote} className="text-xs text-indigo-600 font-medium">+ Add note</button>
                                    </div>
                                    {(form.text_notes || []).map((text, index) => (
                                        <div key={index} className="flex gap-2 mb-2">
                                            <textarea
                                                value={text}
                                                onChange={(e) => updateTextNote(index, e.target.value)}
                                                rows={2}
                                                placeholder={`Note ${index + 1}`}
                                                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:outline-none resize-none"
                                            />
                                            <button type="button" onClick={() => removeTextNote(index)} className="text-slate-400 hover:text-red-500 p-2">
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center">
                                    <button
                                        type="button"
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white ${isRecording ? 'bg-red-500' : 'bg-violet-600'}`}
                                    >
                                        {isRecording ? <><FiStopCircle /> Stop</> : <><FiMic /> Record voice</>}
                                    </button>
                                    {isRecording && <p className="mt-2 text-sm text-red-600">{formatTime(recordingTime)}</p>}
                                    {voiceNotesList.length > 0 && (
                                        <div className="mt-3 space-y-2 text-left">
                                            {voiceNotesList.map((v) => (
                                                <div key={v.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                                    {v.uploading ? (
                                                        <span className="text-sm text-slate-500">Uploading...</span>
                                                    ) : (
                                                        <audio controls className="flex-1 min-w-0 h-8" src={v.url} />
                                                    )}
                                                    <button type="button" onClick={() => removeVoiceNote(v.id)} className="text-slate-400 hover:text-red-500">
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-700">Attachments</span>
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-indigo-600 font-medium">+ Attach file</button>
                                    </div>
                                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileAttach} />
                                    {attachedFiles.map((att) => (
                                        <div key={att.id} className="mb-2 p-2.5 border border-slate-200 rounded-lg space-y-1.5">
                                            <div className="flex items-center justify-between text-sm text-slate-600">
                                                <span>{att.file?.name || 'File'}</span>
                                                <button type="button" onClick={() => {
                                                    if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
                                                    setAttachedFiles((prev) => prev.filter((f) => f.id !== att.id));
                                                }} className="text-red-500">
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={att.name}
                                                onChange={(e) => setAttachedFiles((prev) => prev.map((f) => (f.id === att.id ? { ...f, name: e.target.value } : f)))}
                                                placeholder="File name *"
                                                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg"
                                            />
                                            <input
                                                type="text"
                                                value={att.remark}
                                                onChange={(e) => setAttachedFiles((prev) => prev.map((f) => (f.id === att.id ? { ...f, remark: e.target.value } : f)))}
                                                placeholder="Remark (optional)"
                                                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg"
                                            />
                                            {att.uploading && <p className="text-xs text-slate-500">Uploading...</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex justify-end gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => { if (!submitting) onClose?.(); }}
                            disabled={submitting}
                            className="px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !form.due_date}
                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                        >
                            {submitting ? 'Approving...' : 'Approve & create task'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default QuotationApproveModal;
