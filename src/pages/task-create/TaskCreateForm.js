import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { FaCheckCircle } from 'react-icons/fa';
import { FiArrowLeft, FiArrowRight, FiCheck, FiLoader, FiPlus, FiX } from 'react-icons/fi';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import useTaskCreateResources from './useTaskCreateResources';
import ClientsStep from './steps/ClientsStep';
import ServiceStep from './steps/ServiceStep';
import SubtasksStep from './steps/SubtasksStep';
import TeamStep from './steps/TeamStep';
import NotesStep from './steps/NotesStep';

const STEPS = [
    { n: 1, title: 'Firms & Groups', subtitle: 'Select clients' },
    { n: 2, title: 'Services', subtitle: 'Fees & due date' },
    { n: 3, title: 'Sub tasks', subtitle: 'Add sub tasks' },
    { n: 4, title: 'CA & Team', subtitle: 'Agent & employees' },
    { n: 5, title: 'Notes', subtitle: 'Attachments' },
];

const initialForm = {
    firm_ids: [],
    group_ids: [],
    service_id: '',
    has_ay: '0',
    has_fy: '0',
    ay: [],
    fy: [],
    fees: '',
    due_date: '',
    ca: '',
    agent: '',
    employees: [],
    text_notes: [],
};

function validateStep(step, form) {
    switch (step) {
        case 1: {
            if (!form.firm_ids?.length && !form.group_ids?.length) {
                return { valid: false, message: 'Please select at least one firm or one group.' };
            }
            return { valid: true };
        }
        case 2: {
            if (!form.service_id?.trim()) return { valid: false, message: 'Please select a service.' };
            const feesStr = String(form.fees || '').trim();
            if (!feesStr) return { valid: false, message: 'Please enter fees.' };
            const feesNum = parseFloat(feesStr);
            if (Number.isNaN(feesNum) || feesNum < 0) {
                return { valid: false, message: 'Please enter a valid fee amount.' };
            }
            if (!form.due_date?.trim()) return { valid: false, message: 'Please select a due date.' };
            if (form.has_ay === '1' && !form.ay?.length) {
                return { valid: false, message: 'Please select at least one assessment year.' };
            }
            if (form.has_fy === '1' && !form.fy?.length) {
                return { valid: false, message: 'Please select at least one financial year.' };
            }
            return { valid: true };
        }
        default:
            return { valid: true };
    }
}

async function uploadFile(fileOrBlob, filename = 'file') {
    const headers = getHeaders();
    if (!headers) throw new Error('Authentication required');
    const uploadHeaders = { ...headers };
    delete uploadHeaders['Content-Type'];
    const fd = new FormData();
    const file =
        fileOrBlob instanceof File
            ? fileOrBlob
            : new File([fileOrBlob], filename, { type: fileOrBlob.type || 'audio/wav' });
    fd.append('file', file);
    const res = await axios.post(`${API_BASE_URL}/upload`, fd, {
        headers: uploadHeaders,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    });
    if (!res.data?.success || !res.data?.data?.url) {
        throw new Error(res.data?.message || 'Upload failed');
    }
    return res.data.data.url;
}

const formatCurrency = (n) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        Number.isFinite(Number(n)) ? Number(n) : 0
    );

const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
};

const getFileIcon = (fileType) => {
    if (!fileType) return '📎';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    return '📎';
};

export default function TaskCreateForm() {
    const navigate = useNavigate();
    const { loading, error, reload, services, groups, staff, assessmentYears, financialYears } =
        useTaskCreateResources();

    const [step, setStep] = useState(1);
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [resultOpen, setResultOpen] = useState(false);
    const [resultData, setResultData] = useState(null);

    const [firmSearchQuery, setFirmSearchQuery] = useState('');
    const [firmSearchResults, setFirmSearchResults] = useState([]);
    const [firmSearchLoading, setFirmSearchLoading] = useState(false);
    const [selectedFirmOptions, setSelectedFirmOptions] = useState([]);
    const firmAbortRef = useRef(null);

    const [selectedGroupOptions, setSelectedGroupOptions] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedCa, setSelectedCa] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState(null);

    const [subtasks, setSubtasks] = useState([]);
    const [subTaskForm, setSubTaskForm] = useState({ type: 'service', service_id: '', manual_text: '' });
    const [showSubTaskForm, setShowSubTaskForm] = useState(false);

    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

    const [attachedFiles, setAttachedFiles] = useState([]);
    const [voiceNotesList, setVoiceNotesList] = useState([]);
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    useEffect(() => {
        setAllEmployees(staff);
        setSelectedEmployees([]);
    }, [staff]);

    useEffect(() => {
        const term = firmSearchQuery.trim();
        if (term.length < 3) {
            setFirmSearchResults([]);
            setFirmSearchLoading(false);
            return;
        }
        const t = setTimeout(() => {
            firmAbortRef.current?.abort();
            const ac = new AbortController();
            firmAbortRef.current = ac;
            setFirmSearchLoading(true);
            fetch(
                `${API_BASE_URL.replace(/\/$/, '')}/firm/search?search=${encodeURIComponent(term)}`,
                { headers: getHeaders(), signal: ac.signal }
            )
                .then((r) => r.json())
                .then((data) => {
                    const list = Array.isArray(data?.data) ? data.data : [];
                    setFirmSearchResults(
                        list.map((f) => ({
                            value: f.firm_id,
                            label: f.client ? `${f.firm_name} – ${f.client.name}` : f.firm_name || '',
                            __firm: f,
                        }))
                    );
                })
                .catch((err) => {
                    if (err?.name !== 'AbortError') setFirmSearchResults([]);
                })
                .finally(() => setFirmSearchLoading(false));
        }, 400);
        return () => {
            clearTimeout(t);
            firmAbortRef.current?.abort();
        };
    }, [firmSearchQuery]);

    const groupOptions = useMemo(
        () =>
            groups.map((g) => ({
                value: g.group_id,
                label: g.remark ? `${g.name} – ${g.remark}` : g.name,
                firm_count: g.firm_count ?? 0,
            })),
        [groups]
    );

    const filteredAvailableEmployees = useMemo(() => {
        const q = employeeSearchQuery.trim().toLowerCase();
        if (!q) return allEmployees;
        return allEmployees.filter((e) =>
            [e.name, e.email, e.mobile, e.department].some((v) => (v || '').toLowerCase().includes(q))
        );
    }, [allEmployees, employeeSearchQuery]);

    const selectedFirmCount = selectedFirmOptions.length;
    const selectedGroupCount = selectedGroupOptions.length;
    const selectedGroupFirmCount = selectedGroupOptions.reduce(
        (s, g) => s + (Number(g.firm_count) || 0),
        0
    );

    const addFirm = (opt) => {
        if (selectedFirmOptions.some((o) => o.value === opt.value)) return;
        const next = [...selectedFirmOptions, opt];
        setSelectedFirmOptions(next);
        setForm((p) => ({ ...p, firm_ids: next.map((o) => o.value) }));
    };
    const removeFirm = (opt) => {
        const next = selectedFirmOptions.filter((o) => o.value !== opt.value);
        setSelectedFirmOptions(next);
        setForm((p) => ({ ...p, firm_ids: next.map((o) => o.value) }));
    };
    const addAllFirmsFromResults = () => {
        const ids = new Set(selectedFirmOptions.map((o) => o.value));
        const toAdd = firmSearchResults.filter((o) => !ids.has(o.value));
        if (!toAdd.length) return;
        const next = [...selectedFirmOptions, ...toAdd];
        setSelectedFirmOptions(next);
        setForm((p) => ({ ...p, firm_ids: next.map((o) => o.value) }));
    };
    const removeAllFirms = () => {
        setSelectedFirmOptions([]);
        setForm((p) => ({ ...p, firm_ids: [] }));
    };
    const addGroup = (opt) => {
        if (opt.firm_count === 0 || selectedGroupOptions.some((o) => o.value === opt.value)) return;
        const next = [...selectedGroupOptions, opt];
        setSelectedGroupOptions(next);
        setForm((p) => ({ ...p, group_ids: next.map((o) => o.value) }));
    };
    const removeGroup = (opt) => {
        const next = selectedGroupOptions.filter((o) => o.value !== opt.value);
        setSelectedGroupOptions(next);
        setForm((p) => ({ ...p, group_ids: next.map((o) => o.value) }));
    };

    const goToStep = (n) => {
        if (n <= step) {
            setStep(n);
            return;
        }
        for (let i = step; i < n; i++) {
            const v = validateStep(i, form);
            if (!v.valid) {
                toast.error(v.message);
                setStep(i);
                return;
            }
        }
        setStep(n);
    };

    const goNext = () => {
        const v = validateStep(step, form);
        if (!v.valid) {
            toast.error(v.message);
            return;
        }
        if (step < STEPS.length) setStep((s) => s + 1);
    };

    const toggleYear = (field, year) => {
        setForm((p) => {
            const list = [...(p[field] || [])];
            const idx = list.indexOf(year);
            if (idx >= 0) list.splice(idx, 1);
            else list.push(year);
            return { ...p, [field]: list };
        });
    };

    const addSubTask = () => {
        if (
            (subTaskForm.type === 'service' && !subTaskForm.service_id) ||
            (subTaskForm.type === 'manual' && !subTaskForm.manual_text.trim())
        ) {
            toast.error('Please fill all required fields');
            return;
        }
        const svc = services.find((s) => s.service_id === subTaskForm.service_id);
        setSubtasks((p) => [
            ...p,
            {
                id: Math.random().toString(36).slice(2, 9),
                type: subTaskForm.type,
                description: subTaskForm.type === 'service' ? svc?.name : subTaskForm.manual_text,
                service_id: subTaskForm.type === 'service' ? subTaskForm.service_id : undefined,
                content: subTaskForm.type === 'manual' ? subTaskForm.manual_text : undefined,
            },
        ]);
        setSubTaskForm({ type: 'service', service_id: '', manual_text: '' });
        setShowSubTaskForm(false);
    };

    const addEmployee = (emp) => {
        setSelectedEmployees((p) => [...p, emp]);
        setAllEmployees((p) => p.filter((e) => e.username !== emp.username));
        setForm((f) => ({ ...f, employees: [...f.employees, emp.username] }));
    };
    const removeEmployee = (emp) => {
        setAllEmployees((p) => [...p, emp]);
        setSelectedEmployees((p) => p.filter((e) => e.username !== emp.username));
        setForm((f) => ({ ...f, employees: f.employees.filter((u) => u !== emp.username) }));
    };
    const addAllEmployees = () => {
        const toAdd = filteredAvailableEmployees;
        setSelectedEmployees((p) => [...p, ...toAdd]);
        setForm((f) => ({ ...f, employees: [...f.employees, ...toAdd.map((e) => e.username)] }));
        setAllEmployees((p) => p.filter((e) => !toAdd.some((a) => a.username === e.username)));
    };
    const removeAllEmployees = () => {
        setAllEmployees((p) => [...p, ...selectedEmployees]);
        setSelectedEmployees([]);
        setForm((f) => ({ ...f, employees: [] }));
    };

    const addTextNote = () => setForm((p) => ({ ...p, text_notes: [...(p.text_notes || []), ''] }));
    const updateTextNote = (i, v) =>
        setForm((p) => {
            const next = [...p.text_notes];
            next[i] = v;
            return { ...p, text_notes: next };
        });
    const removeTextNote = (i) =>
        setForm((p) => ({ ...p, text_notes: p.text_notes.filter((_, idx) => idx !== i) }));

    const handleFileAttach = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        for (const file of files) {
            const id = Math.random().toString(36).slice(2, 9);
            const previewUrl = URL.createObjectURL(file);
            setAttachedFiles((p) => [
                ...p,
                { id, file, name: '', remark: '', url: null, uploading: true, size: file.size, type: file.type, previewUrl },
            ]);
            try {
                const url = await uploadFile(file);
                setAttachedFiles((p) => p.map((a) => (a.id === id ? { ...a, url, uploading: false } : a)));
            } catch (err) {
                toast.error(err.message || 'Upload failed');
                setAttachedFiles((p) => p.filter((a) => a.id !== id));
                URL.revokeObjectURL(previewUrl);
            }
        }
    };

    const updateAttachmentName = (id, v) =>
        setAttachedFiles((p) => p.map((a) => (a.id === id ? { ...a, name: v } : a)));
    const updateAttachmentRemark = (id, v) =>
        setAttachedFiles((p) => p.map((a) => (a.id === id ? { ...a, remark: v } : a)));
    const removeFile = (id) => {
        setAttachedFiles((p) => {
            const item = p.find((f) => f.id === id);
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
            return p.filter((f) => f.id !== id);
        });
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            recorder.ondataavailable = (ev) => audioChunksRef.current.push(ev.data);
            recorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const id = Math.random().toString(36).slice(2, 9);
                const duration = recordingTime;
                setVoiceNotesList((p) => [...p, { id, url: null, duration, uploading: true }]);
                try {
                    const url = await uploadFile(blob, `voice-${Date.now()}.wav`);
                    setVoiceNotesList((p) => p.map((v) => (v.id === id ? { ...v, url, uploading: false } : v)));
                } catch (err) {
                    toast.error(err.message || 'Voice upload failed');
                    setVoiceNotesList((p) => p.filter((v) => v.id !== id));
                }
            };
            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
        } catch {
            toast.error('Microphone access denied.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
        clearInterval(recordingTimerRef.current);
        setIsRecording(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (step !== STEPS.length) return;
        const v = validateStep(2, form);
        if (!v.valid) {
            toast.error(v.message);
            setStep(2);
            return;
        }
        const ready = attachedFiles.filter((a) => a.url && !a.uploading);
        if (ready.some((a) => !(a.name || '').trim())) {
            toast.error('Please enter a name for every attachment.');
            return;
        }

        setSubmitting(true);
        const payload = {
            firms: form.firm_ids,
            groups: form.group_ids,
            service: {
                service_id: form.service_id,
                fees: parseFloat(String(form.fees).trim()) || 0,
                due_date: form.due_date.trim(),
                has_financial_year: form.has_fy === '1',
                financial_years: form.has_fy === '1' ? form.fy : [],
                has_assisment_year: form.has_ay === '1',
                assisment_years: form.has_ay === '1' ? form.ay : [],
            },
            subtasks: subtasks.map((t) =>
                t.type === 'service'
                    ? { type: 'service', service_id: t.service_id }
                    : { type: 'text', content: t.content || '' }
            ),
            assignment: { staff: form.employees, ca: form.ca || '', agent: form.agent || '' },
            notes: {
                text: (form.text_notes || []).filter((t) => (t || '').trim()),
                attachments: ready.map((a) => ({
                    name: a.name.trim(),
                    remark: (a.remark || '').trim(),
                    url: a.url,
                })),
                voice: voiceNotesList.filter((v) => v.url && !v.uploading).map((v) => v.url),
            },
        };

        try {
            const headers = getHeaders();
            if (!headers) {
                toast.error('Authentication required');
                return;
            }
            const res = await axios.post(`${API_BASE_URL}/task/create`, payload, { headers });
            if (!res.data?.success) {
                toast.error(res.data?.message || 'Failed to create task');
                return;
            }
            const tasks = Array.isArray(res.data.data) ? res.data.data : [];
            const count = res.data.count ?? tasks.length;
            const totals = tasks.reduce(
                (acc, t) => {
                    acc.fees += Number(t?.fees ?? 0) || 0;
                    acc.taxValue += Number(t?.tax_value ?? 0) || 0;
                    acc.total += Number(t?.total ?? 0) || 0;
                    return acc;
                },
                { fees: 0, taxValue: 0, total: 0 }
            );
            const svcMap = new Map(services.map((s) => [s.service_id, s.name || '']));
            const firmMap = new Map(
                selectedFirmOptions.map((o) => [o.value, o.__firm?.firm_name || o.label || ''])
            );
            setResultData({
                message: res.data.message || 'Tasks created successfully',
                count,
                tasks: tasks.map((t) => ({
                    ...t,
                    task_name: svcMap.get(t?.service_id) || 'N/A',
                    firm_name: firmMap.get(t?.firm_id) || 'N/A',
                })),
                stats: { totals },
            });
            setResultOpen(true);
            toast.success(res.data.message || 'Task created successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to create task');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                <FiLoader className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                <p className="text-sm font-medium">Loading form data…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-lg mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
                <p className="text-red-700 mb-4">{error}</p>
                <button type="button" onClick={reload} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <>
            <style>{`.task-scrollbar-hide{scrollbar-width:none;-ms-overflow-style:none}.task-scrollbar-hide::-webkit-scrollbar{display:none}`}</style>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create New Task</h1>
                <p className="text-gray-500 text-sm mt-1">Complete the steps below to create a task for firms and groups</p>
            </div>

            <motion.div
                className="bg-white rounded-2xl shadow-sm border border-gray-200 min-w-0 w-full max-w-6xl mx-auto"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="px-4 sm:px-6 py-5 border-b border-gray-100 bg-gray-50/80 rounded-t-2xl">
                    <div className="flex items-center justify-between gap-1">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.n}>
                                <button type="button" onClick={() => goToStep(s.n)} className="flex flex-col items-center min-w-0 flex-1 p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500">
                                    <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold border-2 ${s.n === step ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : s.n < step ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                                        {s.n < step ? <FiCheck className="w-4 h-4" /> : s.n}
                                    </div>
                                    <span className={`mt-2 text-xs font-medium truncate ${s.n === step ? 'text-indigo-600' : s.n < step ? 'text-emerald-600' : 'text-gray-400'}`}>{s.title}</span>
                                </button>
                                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded-full min-w-[12px] ${s.n < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="p-4 sm:p-6">
                    <form onSubmit={handleCreate}>
                        {step === 1 && (
                            <ClientsStep
                                firmSearchQuery={firmSearchQuery}
                                setFirmSearchQuery={setFirmSearchQuery}
                                firmSearchLoading={firmSearchLoading}
                                firmSearchResults={firmSearchResults}
                                selectedFirmOptions={selectedFirmOptions}
                                addFirm={addFirm}
                                removeFirm={removeFirm}
                                addAllFirmsFromResults={addAllFirmsFromResults}
                                removeAllFirms={removeAllFirms}
                                groupOptions={groupOptions}
                                selectedGroupOptions={selectedGroupOptions}
                                addGroup={addGroup}
                                removeGroup={removeGroup}
                                estimatedTaskCreateCount={selectedFirmCount + selectedGroupFirmCount}
                                selectedFirmCount={selectedFirmCount}
                                selectedGroupCount={selectedGroupCount}
                                selectedGroupFirmCount={selectedGroupFirmCount}
                            />
                        )}
                        {step === 2 && (
                            <ServiceStep
                                form={form}
                                setForm={setForm}
                                selectedService={selectedService}
                                setSelectedService={setSelectedService}
                                assessmentYears={assessmentYears}
                                financialYears={financialYears}
                                toggleYear={toggleYear}
                            />
                        )}
                        {step === 3 && (
                            <SubtasksStep
                                subtasks={subtasks}
                                setSubtasks={setSubtasks}
                                subTaskForm={subTaskForm}
                                setSubTaskForm={setSubTaskForm}
                                showSubTaskForm={showSubTaskForm}
                                setShowSubTaskForm={setShowSubTaskForm}
                                addSubTask={addSubTask}
                            />
                        )}
                        {step === 4 && (
                            <TeamStep
                                form={form}
                                setForm={setForm}
                                selectedCa={selectedCa}
                                setSelectedCa={setSelectedCa}
                                selectedAgent={selectedAgent}
                                setSelectedAgent={setSelectedAgent}
                                allEmployees={allEmployees}
                                selectedEmployees={selectedEmployees}
                                employeeSearchQuery={employeeSearchQuery}
                                setEmployeeSearchQuery={setEmployeeSearchQuery}
                                filteredAvailableEmployees={filteredAvailableEmployees}
                                addEmployee={addEmployee}
                                removeEmployee={removeEmployee}
                                addAllEmployees={addAllEmployees}
                                removeAllEmployees={removeAllEmployees}
                                staffLoading={false}
                            />
                        )}
                        {step === 5 && (
                            <NotesStep
                                form={form}
                                addTextNote={addTextNote}
                                updateTextNote={updateTextNote}
                                removeTextNote={removeTextNote}
                                fileInputRef={fileInputRef}
                                handleFileAttach={handleFileAttach}
                                attachedFiles={attachedFiles}
                                updateAttachmentName={updateAttachmentName}
                                updateAttachmentRemark={updateAttachmentRemark}
                                removeFile={removeFile}
                                formatFileSize={formatFileSize}
                                getFileIcon={getFileIcon}
                                isRecording={isRecording}
                                startRecording={startRecording}
                                stopRecording={stopRecording}
                                recordingTime={recordingTime}
                                formatTime={formatTime}
                                voiceNotesList={voiceNotesList}
                                removeVoiceNote={(id) => setVoiceNotesList((p) => p.filter((v) => v.id !== id))}
                            />
                        )}

                        <div className="flex justify-between pt-6 border-t border-gray-200 mt-6">
                            {step > 1 ? (
                                <motion.button type="button" onClick={() => setStep((s) => s - 1)} className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-sm font-semibold" whileTap={{ scale: 0.98 }}>
                                    <FiArrowLeft className="w-4 h-4" /> Previous
                                </motion.button>
                            ) : (
                                <span />
                            )}
                            {step < STEPS.length ? (
                                <motion.button type="button" onClick={goNext} disabled={showSubTaskForm} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200" whileTap={{ scale: 0.98 }}>
                                    Next Step <FiArrowRight className="w-4 h-4" />
                                </motion.button>
                            ) : (
                                <motion.button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-200" whileTap={{ scale: 0.98 }}>
                                    {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating Task...</> : <><FiPlus className="w-4 h-4" /> Create Task</>}
                                </motion.button>
                            )}
                        </div>
                    </form>
                </div>
            </motion.div>

            <AnimatePresence>
                {resultOpen && resultData && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setResultOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="relative w-full max-w-4xl max-h-[78vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 px-6 py-5 flex justify-between items-start gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl"><FaCheckCircle className="w-6 h-6 text-white" /></div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Tasks created successfully</h2>
                                        <p className="text-indigo-100 text-sm mt-0.5">{resultData.message}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setResultOpen(false)} className="p-2 hover:bg-white/20 rounded-xl"><FiX className="w-6 h-6 text-white" /></button>
                            </div>
                            <div className="p-6 space-y-5 overflow-y-auto flex-1">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4"><p className="text-xs font-semibold text-violet-700">Total Tasks</p><p className="text-2xl font-extrabold text-violet-800 mt-1">{resultData.count}</p></div>
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-700">Total Fees</p><p className="text-2xl font-extrabold text-blue-800 mt-1">₹{formatCurrency(resultData.stats?.totals?.fees)}</p></div>
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-700">Total Tax</p><p className="text-2xl font-extrabold text-amber-800 mt-1">₹{formatCurrency(resultData.stats?.totals?.taxValue)}</p></div>
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-700">Total Amount</p><p className="text-2xl font-extrabold text-emerald-800 mt-1">₹{formatCurrency(resultData.stats?.totals?.total)}</p></div>
                                </div>
                                {resultData.tasks?.length > 0 && (
                                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50"><tr><th className="p-3 text-left">Firm</th><th className="p-3 text-left">Service</th><th className="p-3 text-right">Total</th></tr></thead>
                                            <tbody>
                                                {resultData.tasks.map((t, i) => (
                                                    <tr key={i} className="border-t border-gray-100"><td className="p-3">{t.firm_name}</td><td className="p-3">{t.task_name}</td><td className="p-3 text-right">₹{formatCurrency(t.total)}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
                                <button type="button" onClick={() => navigate('/task/view')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">View tasks</button>
                                <button type="button" onClick={() => { setResultOpen(false); setForm(initialForm); setStep(1); setSelectedFirmOptions([]); setSelectedGroupOptions([]); setSelectedService(null); setSelectedCa(null); setSelectedAgent(null); setSubtasks([]); setAttachedFiles([]); setVoiceNotesList([]); setSelectedEmployees([]); setAllEmployees(staff); }} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Create another</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
