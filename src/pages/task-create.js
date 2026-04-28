import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Sidebar, Header } from '../components/header';
import SelectInput from '../components/SelectInput';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import { useNavigate } from 'react-router-dom';
import {
    FiUsers,
    FiBriefcase,
    FiCalendar,
    FiUserCheck,
    FiUserPlus,
    FiFileText,
    FiPlus,
    FiSearch,
    FiRefreshCw,
    FiPaperclip,
    FiX,
    FiMic,
    FiStopCircle,
    FiDownload,
    FiTrash2,
    FiArrowRight,
    FiArrowLeft,
    FiUser,
    FiCheck,
    FiEdit,
    FiClock,
    FiLayers,
    FiEye
} from 'react-icons/fi';
import { FaCheckCircle } from "react-icons/fa";
import { motion, AnimatePresence } from 'framer-motion';
import { DatePickerField } from '../components/PortalDatePicker';
import { Toaster, toast } from 'react-hot-toast';

const TaskCreate = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [currentStep, setCurrentStep] = useState(1);
    const [transitionDirection, setTransitionDirection] = useState('next');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [taskCreateResultModalOpen, setTaskCreateResultModalOpen] = useState(false);
    const [taskCreateResult, setTaskCreateResult] = useState(null);

    const [formData, setFormData] = useState({
        firm_ids: [],
        group_ids: [],
        service_id: '',
        has_ay: '0',   // Assessment year applicable (client-side toggle)
        has_fy: '0',   // Financial year applicable (client-side toggle)
        ay: [],        // Selected assessment years (from API)
        fy: [],        // Selected financial years (from API)
        fees: '',
        due_date: '',
        ca: '',
        agent: '',
        employees: [],
        text_notes: []   // multiple text notes (array of strings)
    });

    // Subtask states
    const [subTasks, setSubTasks] = useState([]);
    const [subTaskForm, setSubTaskForm] = useState({
        type: 'service', // 'service' or 'manual'
        service_id: '',
        manual_text: ''
    });
    const [showSubTaskForm, setShowSubTaskForm] = useState(false);

    // Services (fetched from API)
    const [services, setServices] = useState([]);


    useEffect(() => {
        const fetchServices = async () => {
            const headers = getHeaders();
            if (!headers) return;
            try {
                const res = await axios.get(`${API_BASE_URL}/service/list`, { headers });
                if (res.data?.success && Array.isArray(res.data.data)) {
                    setServices(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch services:', err);
            }
        };
        fetchServices();
    }, []);

    // Selected firms for multi-select (value + label for display)
    const [selectedFirmOptions, setSelectedFirmOptions] = useState([]);
    const [selectedGroupOptions, setSelectedGroupOptions] = useState([]);

    // Groups from API (fetched with pagination: limit=100 until is_last_page)
    const [groups, setGroups] = useState([]);
    const [groupsLoading, setGroupsLoading] = useState(false);

    // Firm search for two-panel UI (search left, selected right)
    const [firmSearchQuery, setFirmSearchQuery] = useState('');
    const [firmSearchResults, setFirmSearchResults] = useState([]);
    const [firmSearchLoading, setFirmSearchLoading] = useState(false);

    useEffect(() => {
        const fetchAllGroups = async () => {
            setGroupsLoading(true);
            const all = [];
            let page = 1;
            const limit = 100;
            const base = API_BASE_URL.replace(/\/$/, '');
            try {
                for (; ;) {
                    const url = `${base}/group/list?search=&page=${page}&limit=${limit}`;
                    const res = await fetch(url, { headers: getHeaders() });
                    const data = await res.json();
                    const list = data?.data && Array.isArray(data.data) ? data.data : [];
                    all.push(...list);
                    const pagination = data?.pagination;
                    if (pagination?.is_last_page) break;
                    page += 1;
                }
                setGroups(all);
            } catch (err) {
                console.error('Failed to fetch groups:', err);
            } finally {
                setGroupsLoading(false);
            }
        };
        fetchAllGroups();
    }, []);

    // Staff list from API – paginate with empty search until is_last_page (same pattern as groups)
    useEffect(() => {
        const fetchAllStaff = async () => {
            setStaffLoading(true);
            const all = [];
            let page = 1;
            const limit = 100;
            const base = API_BASE_URL.replace(/\/$/, '');
            const headers = getHeaders();
            if (!headers) {
                setStaffLoading(false);
                return;
            }
            try {
                for (; ;) {
                    const url = `${base}/settings/staff/list?search=&page=${page}&limit=${limit}`;
                    const res = await fetch(url, { headers });
                    const json = await res.json();
                    const list = json?.data && Array.isArray(json.data) ? json.data : [];
                    all.push(...list);
                    const meta = json?.meta;
                    if (meta?.is_last_page) break;
                    page += 1;
                }
                const mapped = all.map((item) => ({
                    username: item.username,
                    name: item.profile?.name ?? item.username,
                    mobile: item.profile?.mobile ?? '',
                    email: item.profile?.email ?? '',
                    department: item.designation ?? ''
                }));
                setFullStaffList(mapped);
                setAllEmployees(mapped);
            } catch (err) {
                console.error('Failed to fetch staff list:', err);
            } finally {
                setStaffLoading(false);
            }
        };
        fetchAllStaff();
    }, []);

    // Assessment years and financial years from API (GET)
    const [assessmentYearsList, setAssessmentYearsList] = useState([]);
    const [financialYearsList, setFinancialYearsList] = useState([]);

    useEffect(() => {
        const headers = getHeaders();
        if (!headers) return;
        const base = API_BASE_URL.replace(/\/$/, '');
        Promise.all([
            fetch(`${base}/utils/assisment-years`, { headers }).then(r => r.json()),
            fetch(`${base}/utils/financial-years`, { headers }).then(r => r.json())
        ]).then(([ayRes, fyRes]) => {
            if (ayRes?.success && Array.isArray(ayRes.data)) setAssessmentYearsList(ayRes.data);
            if (fyRes?.success && Array.isArray(fyRes.data)) setFinancialYearsList(fyRes.data);
        }).catch(err => console.error('Failed to fetch years:', err));
    }, []);

    // CA search (min 3 chars) – {{ENDPOINT}}/ca/search?search=...
    const [caSearchQuery, setCaSearchQuery] = useState('');
    const [caSearchResults, setCaSearchResults] = useState([]);
    const [caSearchLoading, setCaSearchLoading] = useState(false);
    const [selectedCaDisplay, setSelectedCaDisplay] = useState(null); // { username, name } for display when formData.ca is set

    // Agent search (min 3 chars) – {{ENDPOINT}}/agent/search?search=...
    const [agentSearchQuery, setAgentSearchQuery] = useState('');
    const [agentSearchResults, setAgentSearchResults] = useState([]);
    const [agentSearchLoading, setAgentSearchLoading] = useState(false);
    const [selectedAgentDisplay, setSelectedAgentDisplay] = useState(null);

    // Staff (employees) from API – fetch all via pagination until is_last_page
    const [fullStaffList, setFullStaffList] = useState([]); // full list from API, used for reset
    const [allEmployees, setAllEmployees] = useState([]);   // available (not selected)
    const [staffLoading, setStaffLoading] = useState(false);
    const [employeeSearchQuery, setEmployeeSearchQuery] = useState(''); // frontend filter

    const [selectedEmployees, setSelectedEmployees] = useState([]);
    // Show years section when user enables Assessment Year or Financial Year (client-side; API no longer returns has_ay/has_fy)
    const showYearsDiv = formData.has_ay === '1' || formData.has_fy === '1';

    // Staff for subtasks
    const [availableStaff, setAvailableStaff] = useState([
        { id: 'staff1', name: 'Alex Thompson', role: 'Developer', selected: false },
        { id: 'staff2', name: 'Maria Garcia', role: 'Designer', selected: false },
        { id: 'staff3', name: 'James Wilson', role: 'Manager', selected: false },
        { id: 'staff4', name: 'Lisa Chen', role: 'Analyst', selected: false },
        { id: 'staff5', name: 'Robert Brown', role: 'Tester', selected: false }
    ]);

    // Voice recording states (current recording in progress)
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingIntervalRef = useRef(null);
    const recordingTimeRef = useRef(0);
    // Multiple voice notes (saved list)
    const [voiceNotesList, setVoiceNotesList] = useState([]);

    // File attachment states
    const [attachedFiles, setAttachedFiles] = useState([]);
    const fileInputRef = useRef(null);
    // Prevent submit from firing when the same click that advanced from step 4→5 is delivered to the Create Task button after re-render
    const nextStepJustClickedRef = useRef(false);

    // Step configurations (5 steps)
    const steps = [
        { number: 1, title: 'Firms & Groups', subtitle: 'Select clients' },
        { number: 2, title: 'Services', subtitle: 'Fees & due date' },
        { number: 3, title: 'Sub tasks', subtitle: 'Add sub tasks' },
        { number: 4, title: 'CA & Team', subtitle: 'Agent & employees' },
        { number: 5, title: 'Notes', subtitle: 'Attachments' }
    ];
    const totalSteps = 5;

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    // Prevent horizontal scroll on this page (body can scroll horizontally from layout/children)
    useEffect(() => {
        const prev = document.body.style.overflowX;
        document.body.style.overflowX = 'hidden';
        return () => {
            document.body.style.overflowX = prev;
        };
    }, []);

    // Permanently reserve the scrollbar gutter so it never pops in/out and
    // shifts the layout. overflowY:'scroll' keeps the gutter space constant;
    // scrollbar-width:none / webkit display:none makes the track invisible.
    useEffect(() => {
        const html = document.documentElement;
        const prev = {
            overflowY:       html.style.overflowY,
            overflowX:       html.style.overflowX,
            scrollbarWidth:  html.style.scrollbarWidth,
            msOverflowStyle: html.style.msOverflowStyle,
        };
        html.style.overflowY       = 'scroll';
        html.style.overflowX       = 'hidden';
        html.style.scrollbarWidth  = 'none';
        html.style.msOverflowStyle = 'none';
        const styleTag = document.createElement('style');
        styleTag.id = 'task-create-hide-scrollbar';
        styleTag.textContent = 'html::-webkit-scrollbar { display: none !important; width: 0 !important; }';
        document.head.appendChild(styleTag);
        return () => {
            html.style.overflowY       = prev.overflowY;
            html.style.overflowX       = prev.overflowX;
            html.style.scrollbarWidth  = prev.scrollbarWidth;
            html.style.msOverflowStyle = prev.msOverflowStyle;
            document.getElementById('task-create-hide-scrollbar')?.remove();
        };
    }, []);


    // Step validation – returns { valid, message } for current step
    const validateStep = (step) => {
        switch (step) {
            case 1: {
                const hasFirms = formData.firm_ids && formData.firm_ids.length > 0;
                const hasGroups = formData.group_ids && formData.group_ids.length > 0;
                if (!hasFirms && !hasGroups) {
                    return { valid: false, message: 'Please select at least one firm or one group.' };
                }
                return { valid: true };
            }
            case 2: {
                if (!formData.service_id || !String(formData.service_id).trim()) {
                    return { valid: false, message: 'Please select a service.' };
                }
                const feesStr = String(formData.fees || '').trim();
                if (!feesStr) {
                    return { valid: false, message: 'Please enter fees.' };
                }
                const feesNum = parseFloat(feesStr);
                if (isNaN(feesNum) || feesNum < 0) {
                    return { valid: false, message: 'Please enter a valid fee amount.' };
                }
                if (!formData.due_date || !String(formData.due_date).trim()) {
                    return { valid: false, message: 'Please select a due date.' };
                }
                if (formData.has_ay === '1' && (!formData.ay || formData.ay.length === 0)) {
                    return { valid: false, message: 'Please select at least one assessment year.' };
                }
                if (formData.has_fy === '1' && (!formData.fy || formData.fy.length === 0)) {
                    return { valid: false, message: 'Please select at least one financial year.' };
                }
                return { valid: true };
            }
            case 3:
                return { valid: true };
            case 4:
                return { valid: true };
            case 5:
                return { valid: true };
            default:
                return { valid: true };
        }
    };

    // Navigation functions
    const nextStep = () => {
        const { valid, message } = validateStep(currentStep);
        if (!valid) {
            toast.error(message);
            return;
        }
        if (currentStep < totalSteps) {
            nextStepJustClickedRef.current = true;
            setTimeout(() => { nextStepJustClickedRef.current = false; }, 300);
            setTransitionDirection('next');
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setTransitionDirection('prev');
            setCurrentStep(currentStep - 1);
        }
    };

    // Assessment Year (AY) – selection stored in formData.ay
    const toggleAssessmentYear = (yearValue) => {
        setFormData(prev => {
            const current = [...prev.ay];
            const idx = current.indexOf(yearValue);
            if (idx >= 0) current.splice(idx, 1);
            else current.push(yearValue);
            return { ...prev, ay: current };
        });
    };

    const selectAllAssessmentYears = () => {
        setFormData(prev => ({ ...prev, ay: [...assessmentYearsList] }));
    };

    const clearAllAssessmentYears = () => {
        setFormData(prev => ({ ...prev, ay: [] }));
    };

    // Financial Year (FY) – selection stored in formData.fy
    const toggleFinancialYear = (yearValue) => {
        setFormData(prev => {
            const current = [...prev.fy];
            const idx = current.indexOf(yearValue);
            if (idx >= 0) current.splice(idx, 1);
            else current.push(yearValue);
            return { ...prev, fy: current };
        });
    };

    const selectAllFinancialYears = () => {
        setFormData(prev => ({ ...prev, fy: [...financialYearsList] }));
    };

    const clearAllFinancialYears = () => {
        setFormData(prev => ({ ...prev, fy: [] }));
    };

    // Subtask Functions
    const handleSubTaskInputChange = (e) => {
        const { name, value } = e.target;
        setSubTaskForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const toggleStaffSelection = (staffId) => {
        setAvailableStaff(prev =>
            prev.map(staff =>
                staff.id === staffId
                    ? { ...staff, selected: !staff.selected }
                    : staff
            )
        );

    };

    const addSubTask = () => {
        if ((subTaskForm.type === 'service' && !subTaskForm.service_id) ||
            (subTaskForm.type === 'manual' && !subTaskForm.manual_text)) {
            alert('Please fill all required fields');
            return;
        }

        const newSubTask = {
            id: Math.random().toString(36).substr(2, 9),
            type: subTaskForm.type,
            description: subTaskForm.type === 'service'
                ? services.find(s => s.service_id === subTaskForm.service_id)?.name
                : subTaskForm.manual_text,
            ...(subTaskForm.type === 'service' ? { service_id: subTaskForm.service_id } : { content: subTaskForm.manual_text })
        };

        setSubTasks(prev => [...prev, newSubTask]);
        setSubTaskForm({
            type: 'service',
            service_id: '',
            manual_text: ''
        });
        setShowSubTaskForm(false);
    };

    const removeSubTask = (subTaskId) => {
        setSubTasks(prev => prev.filter(task => task.id !== subTaskId));
    };

    const cancelSubTask = () => {
        setSubTaskForm({
            type: 'service',
            service_id: '',
            manual_text: ''
        });
        setShowSubTaskForm(false);
    };

    // Voice recording functions
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
                setRecordedAudio(null);
                setAudioBlob(null);
                setRecordingTime(0);
                const tempId = Math.random().toString(36).substr(2, 9);
                setVoiceNotesList(prev => [...prev, { id: tempId, url: null, duration, uploading: true }]);
                (async () => {
                    try {
                        const { url } = await uploadFile(blob, `voice-${Date.now()}.wav`);
                        setVoiceNotesList(prev => prev.map(v => v.id === tempId ? { ...v, url, uploading: false } : v));
                    } catch (err) {
                        const msg = err.response?.data?.message || err.message || 'Voice note upload failed';
                        toast.error(msg);
                        setVoiceNotesList(prev => prev.filter(v => v.id !== tempId));
                    }
                })();
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimeRef.current = 0;

            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
                recordingTimeRef.current += 1;
            }, 1000);

        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Error accessing microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            clearInterval(recordingIntervalRef.current);
        }
    };

    const deleteRecording = () => {
        if (recordedAudio) URL.revokeObjectURL(recordedAudio);
        setRecordedAudio(null);
        setAudioBlob(null);
        setRecordingTime(0);
    };

    const removeVoiceNote = (id) => {
        setVoiceNotesList(prev => {
            const item = prev.find(v => v.id === id);
            if (item?.url && typeof item.url === 'string' && item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
            return prev.filter(v => v.id !== id);
        });
    };

    // Multiple text notes
    const addTextNote = () => {
        setFormData(prev => ({ ...prev, text_notes: [...(prev.text_notes || []), ''] }));
    };

    const updateTextNote = (index, value) => {
        setFormData(prev => {
            const next = [...(prev.text_notes || [])];
            next[index] = value;
            return { ...prev, text_notes: next };
        });
    };

    const removeTextNote = (index) => {
        setFormData(prev => ({
            ...prev,
            text_notes: (prev.text_notes || []).filter((_, i) => i !== index)
        }));
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const downloadRecording = () => {
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `task-note-${new Date().toISOString().slice(0, 10)}.wav`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    };

    // Upload file or blob to API; returns { url } or throws with message
    const uploadFile = async (fileOrBlob, filename = 'file') => {
        const headers = getHeaders();
        if (!headers) throw new Error('Authentication required');
        const uploadHeaders = { ...headers };
        delete uploadHeaders['Content-Type'];
        const formData = new FormData();
        const file = fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], filename, { type: fileOrBlob.type || 'audio/wav' });
        formData.append('file', file);
        const res = await axios.post(`${API_BASE_URL}/upload`, formData, {
            headers: uploadHeaders,
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });
        if (!res.data?.success || !res.data?.data?.url) {
            throw new Error(res.data?.message || 'Upload failed');
        }
        return { url: res.data.data.url };
    };

    // File attachment: add with blank name, upload immediately, store url on success
    const handleFileAttach = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication required');
            return;
        }
        for (const file of files) {
            const id = Math.random().toString(36).substr(2, 9);
            const previewUrl = URL.createObjectURL(file);
            setAttachedFiles(prev => [...prev, {
                id,
                file,
                name: '',
                remark: '',
                url: null,
                uploading: true,
                uploadError: null,
                size: file.size,
                type: file.type,
                previewUrl
            }]);
            try {
                const { url } = await uploadFile(file);
                setAttachedFiles(prev => prev.map(f => f.id === id ? { ...f, url, uploading: false, uploadError: null } : f));
            } catch (err) {
                const msg = err.response?.data?.message || err.message || 'Upload failed';
                toast.error(msg);
                setAttachedFiles(prev => prev.filter(f => f.id !== id));
                URL.revokeObjectURL(previewUrl);
            }
        }
    };

    const updateAttachmentName = (fileId, value) => {
        setAttachedFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: value } : f));
    };

    const updateAttachmentRemark = (fileId, value) => {
        setAttachedFiles(prev => prev.map(f => f.id === fileId ? { ...f, remark: value } : f));
    };

    const removeFile = (fileId) => {
        setAttachedFiles(prev => {
            const item = prev.find(f => f.id === fileId);
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
            return prev.filter(f => f.id !== fileId);
        });
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileType) => {
        if (fileType.includes('image')) return '🖼️';
        if (fileType.includes('pdf')) return '📄';
        if (fileType.includes('word') || fileType.includes('document')) return '📝';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
        return '📎';
    };

    // Employee selection functions
    const addEmployee = (employee) => {
        setSelectedEmployees(prev => [...prev, employee]);
        setAllEmployees(prev => prev.filter(emp => emp.username !== employee.username));
        setFormData(prev => ({
            ...prev,
            employees: [...prev.employees, employee.username]
        }));
    };

    const removeEmployee = (employee) => {
        setAllEmployees(prev => [...prev, employee]);
        setSelectedEmployees(prev => prev.filter(emp => emp.username !== employee.username));
        setFormData(prev => ({
            ...prev,
            employees: prev.employees.filter(username => username !== employee.username)
        }));
    };

    const addAllEmployees = () => {
        const toAdd = filteredAvailableEmployees;
        setSelectedEmployees(prev => [...prev, ...toAdd]);
        setFormData(prev => ({
            ...prev,
            employees: [...prev.employees, ...toAdd.map(emp => emp.username)]
        }));
        setAllEmployees(prev => prev.filter(emp => !toAdd.some(e => e.username === emp.username)));
    };

    const removeAllEmployees = () => {
        setAllEmployees(prev => [...prev, ...selectedEmployees]);
        setFormData(prev => ({
            ...prev,
            employees: []
        }));
        setSelectedEmployees([]);
    };

    // Frontend filter for available employees (by name, mobile, email, department)
    const filteredAvailableEmployees = React.useMemo(() => {
        const q = (employeeSearchQuery || '').trim().toLowerCase();
        if (!q) return allEmployees;
        return allEmployees.filter((emp) => {
            const name = (emp.name || '').toLowerCase();
            const mobile = (emp.mobile || '').toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const dept = (emp.department || '').toLowerCase();
            return name.includes(q) || mobile.includes(q) || email.includes(q) || dept.includes(q);
        });
    }, [allEmployees, employeeSearchQuery]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'service_id') {
            const selectedService = services.find(service => service.service_id === value);
            if (selectedService) {
                setFormData(prev => ({
                    ...prev,
                    fees: selectedService.fees ?? prev.fees
                }));
            }
        }

    };

    // For searchable selects: same logic as handleInputChange but with (name, value)
    const handleFormSelectChange = (name, value) => {
        if (name === 'service_id') {
            const selectedService = services.find(service => String(service.service_id) === String(value));
            setFormData(prev => {
                const next = { ...prev, [name]: value };
                if (selectedService) {
                    next.fees = selectedService.fees ?? prev.fees;
                }
                return next;
            });
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Options for SelectInput
    const mainServiceOptions = services.map((s) => ({
        value: s.service_id,
        label: `${s.name} - ₹${s.fees}`,
        searchText: s.name || ''
    }));
    const getSubtaskServiceOptions = () => {
        return services.map((s) => ({ value: s.service_id, label: s.name, searchText: s.name || '' }));
    };

    const formatCurrency = (amount) => {
        const num = Number(amount);
        if (!Number.isFinite(num)) return '0.00';
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };


    // Add/remove single firm (for two-panel UI)
    const addFirm = (option) => {
        if (selectedFirmOptions.some(o => o.value === option.value)) return;
        const next = [...selectedFirmOptions, option];
        setSelectedFirmOptions(next);
        setFormData(prev => ({ ...prev, firm_ids: next.map(o => o.value) }));
    };
    const removeFirm = (option) => {
        const next = selectedFirmOptions.filter(o => o.value !== option.value);
        setSelectedFirmOptions(next);
        setFormData(prev => ({ ...prev, firm_ids: next.map(o => o.value) }));
    };
    const addAllFirmsFromResults = () => {
        const ids = new Set(selectedFirmOptions.map(o => o.value));
        const toAdd = firmSearchResults.filter(o => !ids.has(o.value));
        if (toAdd.length === 0) return;
        const next = [...selectedFirmOptions, ...toAdd];
        setSelectedFirmOptions(next);
        setFormData(prev => ({ ...prev, firm_ids: next.map(o => o.value) }));
    };
    const removeAllFirms = () => {
        setSelectedFirmOptions([]);
        setFormData(prev => ({ ...prev, firm_ids: [] }));
    };

    // Add/remove groups (for two-panel UI)
    const addGroup = (option) => {
        if (option.firm_count === 0) return;
        if (selectedGroupOptions.some(o => o.value === option.value)) return;
        const next = [...selectedGroupOptions, option];
        setSelectedGroupOptions(next);
        setFormData(prev => ({ ...prev, group_ids: next.map(o => o.value) }));
    };
    const removeGroup = (option) => {
        const next = selectedGroupOptions.filter(o => o.value !== option.value);
        setSelectedGroupOptions(next);
        setFormData(prev => ({ ...prev, group_ids: next.map(o => o.value) }));
    };

    // Firm search for two-panel: when user types, fetch and set firmSearchResults (debounced)
    const firmSearchAbortRef = useRef(null);
    const firmSearchTimeoutRef = useRef(null);

    useEffect(() => {
        const term = (firmSearchQuery || '').trim();
        if (term.length < 3) {
            setFirmSearchResults([]);
            setFirmSearchLoading(false);
            return;
        }
        const t = setTimeout(() => {
            setFirmSearchLoading(true);
            firmSearchAbortRef.current?.abort();
            const controller = new AbortController();
            firmSearchAbortRef.current = controller;
            const url = `${API_BASE_URL.replace(/\/$/, '')}/firm/search?search=${encodeURIComponent(term)}`;
            fetch(url, { headers: getHeaders(), signal: controller.signal })
                .then(res => res.json())
                .then((data) => {
                    const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                    const options = list.map(f => ({
                        value: f.firm_id,
                        label: f.client ? `${f.firm_name} – ${f.client.name}` : (f.firm_name || ''),
                        __firm: f
                    }));
                    setFirmSearchResults(options);
                })
                .catch((err) => {
                    if (err?.name !== 'AbortError') setFirmSearchResults([]);
                })
                .finally(() => setFirmSearchLoading(false));
        }, 400);
        return () => {
            clearTimeout(t);
            firmSearchAbortRef.current?.abort();
        };
    }, [firmSearchQuery]);

    // CA search: debounced, min 3 chars – GET /ca/search?search=...
    const caSearchAbortRef = useRef(null);
    const caSearchTimeoutRef = useRef(null);
    useEffect(() => {
        const term = (caSearchQuery || '').trim();
        if (term.length < 3) {
            setCaSearchResults([]);
            setCaSearchLoading(false);
            return;
        }
        const t = setTimeout(() => {
            setCaSearchLoading(true);
            caSearchAbortRef.current?.abort();
            const controller = new AbortController();
            caSearchAbortRef.current = controller;
            const url = `${API_BASE_URL.replace(/\/$/, '')}/ca/search?search=${encodeURIComponent(term)}`;
            fetch(url, { headers: getHeaders(), signal: controller.signal })
                .then(res => res.json())
                .then((data) => {
                    const list = Array.isArray(data?.data) ? data.data : [];
                    setCaSearchResults(list);
                })
                .catch((err) => {
                    if (err?.name !== 'AbortError') setCaSearchResults([]);
                })
                .finally(() => setCaSearchLoading(false));
        }, 400);
        return () => {
            clearTimeout(t);
            caSearchAbortRef.current?.abort();
        };
    }, [caSearchQuery]);

    // Agent search: debounced, min 3 chars – GET /agent/search?search=...
    const agentSearchAbortRef = useRef(null);
    useEffect(() => {
        const term = (agentSearchQuery || '').trim();
        if (term.length < 3) {
            setAgentSearchResults([]);
            setAgentSearchLoading(false);
            return;
        }
        const t = setTimeout(() => {
            setAgentSearchLoading(true);
            agentSearchAbortRef.current?.abort();
            const controller = new AbortController();
            agentSearchAbortRef.current = controller;
            const url = `${API_BASE_URL.replace(/\/$/, '')}/agent/search?search=${encodeURIComponent(term)}`;
            fetch(url, { headers: getHeaders(), signal: controller.signal })
                .then(res => res.json())
                .then((data) => {
                    const list = Array.isArray(data?.data) ? data.data : [];
                    setAgentSearchResults(list);
                })
                .catch((err) => {
                    if (err?.name !== 'AbortError') setAgentSearchResults([]);
                })
                .finally(() => setAgentSearchLoading(false));
        }, 400);
        return () => {
            clearTimeout(t);
            agentSearchAbortRef.current?.abort();
        };
    }, [agentSearchQuery]);

    const handleGroupMultiChange = (selectedOptions) => {
        const opts = selectedOptions || [];
        setSelectedGroupOptions(opts);
        setFormData(prev => ({
            ...prev,
            group_ids: opts.map(o => o.value)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (currentStep !== totalSteps) return;
        if (nextStepJustClickedRef.current) return;

        const attachmentsWithUrl = attachedFiles.filter(a => a.url);
        const missingName = attachmentsWithUrl.find(a => !(a.name || '').trim());
        if (missingName) {
            toast.error('Please enter a name for every attachment.');
            return;
        }

        setSubmitting(true);

        const feesNum = parseFloat(String(formData.fees || '0').trim()) || 0;
        const dueDateForPayload = formData.due_date ? String(formData.due_date).trim() : '';

        const payload = {
            firms: formData.firm_ids || [],
            groups: formData.group_ids || [],
            service: {
                service_id: formData.service_id || '',
                fees: feesNum,
                due_date: dueDateForPayload,
                has_financial_year: formData.has_fy === '1',
                financial_years: formData.has_fy === '1' ? (formData.fy || []) : [],
                has_assisment_year: formData.has_ay === '1',
                assisment_years: formData.has_ay === '1' ? (formData.ay || []) : []
            },
            subtasks: subTasks.map((t) =>
                t.type === 'service'
                    ? { type: 'service', service_id: t.service_id }
                    : { type: 'text', content: t.content || '' }
            ),
            assignment: {
                staff: formData.employees || [],
                ca: formData.ca || '',
                agent: formData.agent || ''
            },
            notes: {
                text: (formData.text_notes || []).filter((t) => (t || '').trim()),
                attachments: attachmentsWithUrl.map((a) => ({
                    name: (a.name || '').trim(),
                    remark: (a.remark || '').trim(),
                    url: a.url
                })),
                voice: voiceNotesList.filter((v) => v.url && !v.uploading).map((v) => v.url)
            }
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

            const createdTasks = Array.isArray(res.data?.data) ? res.data.data : [];
            const count = typeof res.data?.count === 'number' ? res.data.count : createdTasks.length;

            const totals = createdTasks.reduce((acc, t) => {
                acc.fees += Number(t?.fees ?? 0) || 0;
                acc.taxValue += Number(t?.tax_value ?? 0) || 0;
                acc.total += Number(t?.total ?? 0) || 0;
                return acc;
            }, { fees: 0, taxValue: 0, total: 0 });

            const serviceNameById = new Map((services || []).map((s) => [s.service_id, s.name || '']));
            const firmNameById = new Map(
                (selectedFirmOptions || [])
                    .filter((opt) => opt?.value)
                    .map((opt) => [opt.value, opt?.__firm?.firm_name || opt?.label || ''])
            );
            const displayTasks = createdTasks.map((t) => ({
                ...t,
                task_name: serviceNameById.get(t?.service_id) || 'N/A',
                firm_name: firmNameById.get(t?.firm_id) || 'N/A'
            }));

            setTaskCreateResult({
                message: res.data?.message || 'Tasks created successfully',
                count,
                tasks: displayTasks,
                stats: { totals }
            });
            setTaskCreateResultModalOpen(true);

            toast.success(res.data?.message || 'Task created successfully!');
            setFormData({
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
                text_notes: []
            });
            setSelectedFirmOptions([]);
            setSelectedGroupOptions([]);
            setSubTasks([]);
            deleteRecording();
            setVoiceNotesList([]);
            attachedFiles.forEach(a => { if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl); });
            setAttachedFiles([]);
            setCaSearchQuery('');
            setCaSearchResults([]);
            setSelectedCaDisplay(null);
            setAgentSearchQuery('');
            setAgentSearchResults([]);
            setSelectedAgentDisplay(null);
            setAllEmployees([...fullStaffList]);
            setSelectedEmployees([]);
            setEmployeeSearchQuery('');
            setCurrentStep(1);
        } catch (error) {
            console.error('Error creating task:', error);
            const msg = error.response?.data?.message || error.message || 'Failed to create task. Please try again.';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // Estimate tasks to be created based on selected firms + selected groups' firm_count
    const selectedFirmCount = selectedFirmOptions.length;
    const selectedGroupCount = selectedGroupOptions.length;
    const selectedGroupFirmCount = selectedGroupOptions.reduce((sum, g) => {
        const n = Number(g?.firm_count ?? 0);
        return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const estimatedTaskCreateCount = selectedFirmCount + selectedGroupFirmCount;

    // Prepare options for react-select (groups from API; firm_count=0 options are disabled)
    const groupOptions = groups.map(group => ({
        value: group.group_id,
        label: group.remark ? `${group.name} – ${group.remark}` : group.name,
        firm_count: group.firm_count ?? 0
    }));

    return (
        <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full max-w-full box-border">
            <style>{`
                .task-scrollbar-hide {
                    scrollbar-width: none;
                    scrollbar-gutter: stable;
                    -ms-overflow-style: none;
                }
                .task-scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
            <Header
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />
            <Sidebar
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isMinimized={isMinimized}
                setIsMinimized={setIsMinimized}
            />

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'} overflow-x-hidden min-w-0 w-full max-w-full flex-1`}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 min-w-0 w-full box-border">
                    {/* Page header */}
                    <div className="mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create New Task</h1>
                            <p className="text-gray-500 text-sm mt-1">Complete the steps below to create a task for firms and groups</p>
                        </div>
                    </div>

                    {/* Main Card */}
                    <motion.div
                        className="bg-white rounded-2xl shadow-sm border border-gray-200 min-w-0 w-full"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Compact 5-step stepper */}
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/80">
                            <div className="flex items-center justify-between gap-1">
                                {steps.map((step, index) => (
                                    <React.Fragment key={step.number}>
                                        <div className="flex flex-col items-center min-w-0 flex-1">
                                            <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold border-2 transition-all ${step.number === currentStep
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                : step.number < currentStep
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : 'bg-white border-gray-300 text-gray-400'
                                                }`}>
                                                {step.number < currentStep ? <FiCheck className="w-4 h-4" /> : step.number}
                                            </div>
                                            <span className={`mt-2 text-xs font-medium truncate max-w-full px-0.5 text-center ${step.number === currentStep ? 'text-indigo-600' : step.number < currentStep ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                {step.title}
                                            </span>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-1 rounded-full min-w-[12px] max-w-[24px] sm:max-w-none ${step.number < currentStep ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        <div className="p-6">

                            <form onSubmit={handleSubmit} className="overflow-x-hidden max-w-full">
                                {/* Step Content with Smooth Transitions - min-h-0 + overflow-hidden so height collapses when going back to a shorter step */}
                                <div className="relative min-h-0 min-w-0 overflow-hidden max-w-full">
                                    {/* Step 1: Client & Services */}
                                    <div className={`transition-all duration-500 ease-in-out ${currentStep === 1
                                        ? 'opacity-100 translate-x-0 block'
                                        : transitionDirection === 'next'
                                            ? 'opacity-0 -translate-x-full absolute inset-0 overflow-hidden'
                                            : 'opacity-0 translate-x-full absolute inset-0 overflow-hidden'
                                        }`}>
                                        <div className="space-y-6">
                                            {/* Firms: search left, selected right (like employees) */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                    <FiUser className="w-4 h-4 text-indigo-600" />
                                                    Firms
                                                </label>
                                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                                                    <div className="lg:col-span-2 min-w-0">
                                                        <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex flex-col h-72">
                                                            <div className="p-3 border-b border-gray-200 bg-white">
                                                                <div className="relative">
                                                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                                    <input
                                                                        type="text"
                                                                        value={firmSearchQuery}
                                                                        onChange={(e) => setFirmSearchQuery(e.target.value)}
                                                                        placeholder="Search firms (min 3 characters)..."
                                                                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 overflow-y-auto task-scrollbar-hide p-2 space-y-1.5">
                                                                {firmSearchLoading && (
                                                                    <div className="text-center text-gray-500 text-sm py-6">Searching...</div>
                                                                )}
                                                                {!firmSearchLoading && firmSearchQuery.trim().length < 3 && (
                                                                    <div className="text-center text-gray-400 text-sm py-6">Search firms...</div>
                                                                )}
                                                                {!firmSearchLoading && firmSearchQuery.trim().length >= 3 && firmSearchResults.filter(f => !selectedFirmOptions.some(s => s.value === f.value)).length === 0 && (
                                                                    <div className="text-center text-gray-400 text-sm py-6">No firms found</div>
                                                                )}
                                                                {!firmSearchLoading && firmSearchResults.filter(f => !selectedFirmOptions.some(s => s.value === f.value)).map((opt) => {
                                                                    const f = opt.__firm;
                                                                    const c = f?.client || {};
                                                                    return (
                                                                        <div
                                                                            key={opt.value}
                                                                            onClick={() => addFirm(opt)}
                                                                            className="p-2.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                                                                        >
                                                                            <div className="font-medium text-sm text-gray-900 truncate">{f?.firm_name || opt.label}</div>
                                                                            {c.name && <div className="text-xs text-gray-600 truncate">{c.name}</div>}
                                                                            <div className="flex flex-wrap gap-x-2 mt-0.5 text-xs text-gray-500">
                                                                                {(f?.pan_no || c.pan_number) && <span>PAN: {f?.pan_no || c.pan_number}</span>}
                                                                                {f?.branch_id && <span>Branch: {f.branch_id}</span>}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="lg:col-span-1 flex lg:flex-col justify-center items-center gap-2 lg:gap-3">
                                                        <motion.button
                                                            type="button"
                                                            onClick={addAllFirmsFromResults}
                                                            disabled={firmSearchResults.filter(f => !selectedFirmOptions.some(s => s.value === f.value)).length === 0}
                                                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FiArrowRight className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            type="button"
                                                            onClick={removeAllFirms}
                                                            disabled={selectedFirmOptions.length === 0}
                                                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FiArrowLeft className="w-4 h-4" />
                                                        </motion.button>
                                                    </div>
                                                    <div className="lg:col-span-2 min-w-0">
                                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-72 overflow-hidden flex flex-col">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-sm font-medium text-gray-700">Selected Firms</span>
                                                                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">{selectedFirmOptions.length}</span>
                                                            </div>
                                                            <div className="flex-1 overflow-y-auto task-scrollbar-hide space-y-1.5">
                                                                {selectedFirmOptions.map((opt) => {
                                                                    const f = opt.__firm;
                                                                    const c = f?.client || {};
                                                                    return (
                                                                        <div
                                                                            key={opt.value}
                                                                            onClick={() => removeFirm(opt)}
                                                                            className="p-2.5 bg-white border border-indigo-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
                                                                        >
                                                                            <div className="font-medium text-sm text-gray-900 truncate">{f?.firm_name || opt.label}</div>
                                                                            {c.name && <div className="text-xs text-gray-600 truncate">{c.name}</div>}
                                                                        </div>
                                                                    );
                                                                })}
                                                                {selectedFirmOptions.length === 0 && (
                                                                    <div className="text-center text-gray-400 text-sm py-8">No firms selected</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Groups: available left, selected right (click to add/remove only) */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                    <FiUsers className="w-4 h-4 text-indigo-600" />
                                                    Groups
                                                </label>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                    <div className="min-w-0">
                                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-72 overflow-hidden flex flex-col">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <h3 className="text-sm font-medium text-gray-700">Available Groups</h3>
                                                                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                                                    {groupOptions.filter(g => !selectedGroupOptions.some(s => s.value === g.value)).length}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 overflow-y-auto task-scrollbar-hide space-y-1.5">
                                                                {groupsLoading && (
                                                                    <div className="text-center text-gray-500 text-sm py-6">Loading...</div>
                                                                )}
                                                                {!groupsLoading && groupOptions.filter(g => !selectedGroupOptions.some(s => s.value === g.value)).map((opt) => (
                                                                    <div
                                                                        key={opt.value}
                                                                        onClick={() => addGroup(opt)}
                                                                        className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${opt.firm_count === 0
                                                                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                                            : 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-200'
                                                                            }`}
                                                                    >
                                                                        <div className="font-medium text-sm text-gray-800 truncate">{opt.label}</div>
                                                                        <span className="text-xs text-gray-500">{opt.firm_count ?? 0} firm{(opt.firm_count ?? 0) !== 1 ? 's' : ''}</span>
                                                                    </div>
                                                                ))}
                                                                {!groupsLoading && groupOptions.filter(g => !selectedGroupOptions.some(s => s.value === g.value)).length === 0 && (
                                                                    <div className="text-center text-gray-400 text-sm py-8">No groups available</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-72 overflow-hidden flex flex-col">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-sm font-medium text-gray-700">Selected Groups</span>
                                                                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">{selectedGroupOptions.length}</span>
                                                            </div>
                                                            <div className="flex-1 overflow-y-auto task-scrollbar-hide space-y-1.5">
                                                                {selectedGroupOptions.map((opt) => (
                                                                    <div
                                                                        key={opt.value}
                                                                        onClick={() => removeGroup(opt)}
                                                                        className="p-2.5 bg-white border border-indigo-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
                                                                    >
                                                                        <div className="font-medium text-sm text-gray-800 truncate">{opt.label}</div>
                                                                        <span className="text-xs text-gray-500">{opt.firm_count ?? 0} firm{(opt.firm_count ?? 0) !== 1 ? 's' : ''}</span>
                                                                    </div>
                                                                ))}
                                                                {selectedGroupOptions.length === 0 && (
                                                                    <div className="text-center text-gray-400 text-sm py-8">No groups selected</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Estimate (Firms & Groups) */}
                                    {currentStep === 1 && (
                                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm mt-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                                        <FiUsers className="w-5 h-5 text-indigo-700" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-indigo-900">Estimated tasks to create</p>
                                                        <p className="text-xs text-indigo-700 mt-0.5">Based on your selected firms and groups</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-3xl font-extrabold text-indigo-700 leading-none">
                                                        {estimatedTaskCreateCount}
                                                    </div>
                                                    <div className="text-xs text-indigo-600 mt-1 font-medium">tasks</div>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-indigo-800">
                                                <span>Firms selected: <span className="font-semibold">{selectedFirmCount}</span></span>
                                                <span>Groups selected: <span className="font-semibold">{selectedGroupCount}</span></span>
                                                <span>Firms in groups: <span className="font-semibold">{selectedGroupFirmCount}</span></span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Services, fees & due date */}
                                    <div className={`transition-all duration-500 ease-in-out ${currentStep === 2
                                        ? 'opacity-100 translate-x-0 block'
                                        : transitionDirection === 'next'
                                            ? 'opacity-0 -translate-x-full absolute inset-0 overflow-hidden'
                                            : 'opacity-0 translate-x-full absolute inset-0 overflow-hidden'
                                        }`}>
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2 md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700">Service <span className="text-red-500">*</span></label>
                                                    <SelectInput
                                                        options={mainServiceOptions}
                                                        value={formData.service_id}
                                                        onChange={(val) => handleFormSelectChange('service_id', val)}
                                                        placeholder="Select service..."
                                                    />
                                                </div>
                                            </div>
                                            {/* Fees | Due Date — same row, same input styling */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">Fees (₹) <span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-base font-medium">₹</span>
                                                        <input
                                                            type="number"
                                                            name="fees"
                                                            value={formData.fees}
                                                            onChange={handleInputChange}
                                                            className="w-full pl-12 pr-3 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                                                            placeholder="Enter amount"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">Due Date <span className="text-red-500">*</span></label>
                                                    <DatePickerField
                                                        value={formData.due_date}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, due_date: val || '' }))}
                                                        placeholder="Select due date"
                                                        mode="single"
                                                        initialTab="single"
                                                        quickOptionKeys={['td', 'tom', 'n7', 'eom']}
                                                        buttonClassName="w-full pl-3 pr-3 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                                                    />
                                                </div>
                                            </div>
                                            {/* Assessment Year / Financial Year toggles (client-side; API no longer returns has_ay/has_fy) */}
                                            <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                                                <p className="text-sm font-semibold text-gray-900 mb-2">Applicable for</p>
                                                <div className="flex flex-wrap gap-6">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={formData.has_ay === '1'}
                                                            onClick={() => setFormData(prev => ({ ...prev, has_ay: prev.has_ay === '1' ? '0' : '1' }))}
                                                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData.has_ay === '1' ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                        >
                                                            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${formData.has_ay === '1' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                        </button>
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900">Assessment Year (AY)</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={formData.has_fy === '1'}
                                                            onClick={() => setFormData(prev => ({ ...prev, has_fy: prev.has_fy === '1' ? '0' : '1' }))}
                                                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData.has_fy === '1' ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                        >
                                                            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${formData.has_fy === '1' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                        </button>
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900">Financial Year (FY)</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {formData.has_ay === '1' && (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <label className="block text-sm font-medium text-gray-700">Assessment Years (AY) <span className="text-red-500">*</span></label>
                                                        <div className="flex space-x-2">
                                                            <motion.button type="button" onClick={selectAllAssessmentYears} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Select All</motion.button>
                                                            <motion.button type="button" onClick={clearAllAssessmentYears} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Clear All</motion.button>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2">
                                                            {assessmentYearsList.map((year) => (
                                                                <motion.button
                                                                    key={year}
                                                                    type="button"
                                                                    onClick={() => toggleAssessmentYear(year)}
                                                                    className={`p-3 text-sm font-medium rounded-lg border transition-all ${formData.ay.includes(year) ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                                                                    whileHover={{ scale: 1.02 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                >
                                                                    AY {year}
                                                                </motion.button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {formData.has_fy === '1' && (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <label className="block text-sm font-medium text-gray-700">Financial Years (FY) <span className="text-red-500">*</span></label>
                                                        <div className="flex space-x-2">
                                                            <motion.button type="button" onClick={selectAllFinancialYears} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Select All</motion.button>
                                                            <motion.button type="button" onClick={clearAllFinancialYears} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Clear All</motion.button>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2">
                                                            {financialYearsList.map((year) => (
                                                                <motion.button
                                                                    key={year}
                                                                    type="button"
                                                                    onClick={() => toggleFinancialYear(year)}
                                                                    className={`p-3 text-sm font-medium rounded-lg border transition-all ${formData.fy.includes(year) ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                                                                    whileHover={{ scale: 1.02 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                >
                                                                    FY {year}
                                                                </motion.button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Step 3: Sub tasks */}
                                    <div className={`transition-all duration-500 ease-in-out ${currentStep === 3
                                        ? 'opacity-100 translate-x-0 block'
                                        : transitionDirection === 'next'
                                            ? 'opacity-0 -translate-x-full absolute inset-0 overflow-hidden'
                                            : 'opacity-0 translate-x-full absolute inset-0 overflow-hidden'
                                        }`}>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="block text-sm font-medium text-gray-700">Sub tasks</label>
                                                <motion.button
                                                    type="button"
                                                    onClick={() => setShowSubTaskForm(true)}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <FiPlus className="w-4 h-4" />
                                                    Add Subtask
                                                </motion.button>
                                            </div>

                                            <AnimatePresence>
                                                {showSubTaskForm && (
                                                    <motion.div
                                                        className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white shadow-sm overflow-visible"
                                                        initial={{ opacity: 0, y: -8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -8 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        {/* Type toggle tabs */}
                                                        <div className="px-5 pt-4 pb-3 border-b border-indigo-100">
                                                            <div className="inline-flex rounded-xl bg-white border border-gray-200 shadow-sm p-1 gap-1">
                                                                {[
                                                                    { id: 'service', label: 'Service', icon: <FiBriefcase className="w-3.5 h-3.5" /> },
                                                                    { id: 'manual', label: 'Manual Text', icon: <FiEdit className="w-3.5 h-3.5" /> },
                                                                ].map((tab) => (
                                                                    <button
                                                                        key={tab.id}
                                                                        type="button"
                                                                        onClick={() => setSubTaskForm(prev => ({ ...prev, type: tab.id, service_id: '', manual_text: '' }))}
                                                                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                                                                            subTaskForm.type === tab.id
                                                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                                        }`}
                                                                    >
                                                                        {tab.icon}
                                                                        {tab.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Input area */}
                                                        <div className="px-5 py-4">
                                                            {subTaskForm.type === 'service' ? (
                                                                <div className="space-y-1.5">
                                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                                        Select Service <span className="text-red-400">*</span>
                                                                    </label>
                                                                    <SelectInput
                                                                        options={getSubtaskServiceOptions()}
                                                                        value={subTaskForm.service_id}
                                                                        onChange={(val) => setSubTaskForm(prev => ({ ...prev, service_id: val }))}
                                                                        placeholder="Search and select a service..."
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                                        Description <span className="text-red-400">*</span>
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        name="manual_text"
                                                                        value={subTaskForm.manual_text}
                                                                        onChange={handleSubTaskInputChange}
                                                                        autoFocus
                                                                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-shadow"
                                                                        placeholder="Enter subtask description..."
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="px-5 pb-4 flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={cancelSubTask}
                                                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <motion.button
                                                                type="button"
                                                                onClick={addSubTask}
                                                                disabled={
                                                                    subTaskForm.type === 'service'
                                                                        ? !subTaskForm.service_id
                                                                        : !subTaskForm.manual_text.trim()
                                                                }
                                                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm disabled:shadow-none"
                                                                whileTap={{ scale: 0.97 }}
                                                            >
                                                                <FiPlus className="w-3.5 h-3.5" />
                                                                Add Subtask
                                                            </motion.button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Subtasks Table */}
                                            {subTasks.length > 0 && (
                                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                                <th className="text-left p-4 text-sm font-medium text-gray-600 uppercase">Description</th>
                                                                <th className="text-left p-4 text-sm font-medium text-gray-600 uppercase">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {subTasks.map((task) => (
                                                                <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                                    <td className="p-4 text-sm text-gray-800">
                                                                        <div className="flex items-center space-x-2">
                                                                            <span>{task.description}</span>
                                                                            {task.type === 'service' && (
                                                                                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs">Service</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeSubTask(task.id)}
                                                                            className="text-red-500 hover:text-red-700 p-1 transition-colors duration-200"
                                                                        >
                                                                            <FiTrash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Step 4: CA, agent, employees */}
                                <div className={`transition-all duration-500 ease-in-out ${currentStep === 4
                                    ? 'opacity-100 translate-x-0 block'
                                    : currentStep > 4
                                        ? 'opacity-0 -translate-x-full absolute inset-0 overflow-hidden'
                                        : 'opacity-0 translate-x-full absolute inset-0 overflow-hidden'
                                    }`}>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* CA – Select2-style: single input, clear button inside when selected */}
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">CA</label>
                                                <div className="relative flex items-center w-full bg-white border border-gray-300 rounded-xl overflow-visible focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 min-h-[42px]">
                                                    <FiUserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0 pointer-events-none z-10" />
                                                    {formData.ca ? (
                                                        <>
                                                            <span className="flex-1 pl-9 pr-9 py-2.5 text-sm text-gray-900 truncate">
                                                                {selectedCaDisplay?.name ?? formData.ca}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => { handleFormSelectChange('ca', ''); setSelectedCaDisplay(null); }}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="Clear"
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
                                                                placeholder="Search CA (min 3 characters)..."
                                                                className="flex-1 min-w-0 pl-9 pr-3 py-2.5 text-sm border-0 bg-transparent focus:ring-0 focus:outline-none placeholder-gray-400"
                                                            />
                                                            {caSearchQuery.trim().length >= 3 && (
                                                                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto task-scrollbar-hide">
                                                                    {caSearchLoading && <div className="p-3 text-sm text-gray-500">Searching...</div>}
                                                                    {!caSearchLoading && caSearchResults.length === 0 && <div className="p-3 text-sm text-gray-500">No results</div>}
                                                                    {!caSearchLoading && caSearchResults.map((item) => (
                                                                        <button
                                                                            key={item.username}
                                                                            type="button"
                                                                            onClick={() => { handleFormSelectChange('ca', item.username); setSelectedCaDisplay({ username: item.username, name: item.name }); setCaSearchQuery(''); setCaSearchResults([]); }}
                                                                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-indigo-50 flex flex-col border-b border-gray-100 last:border-0"
                                                                        >
                                                                            <span className="font-medium text-gray-900">{item.name}</span>
                                                                            {(item.mobile || item.email) && <span className="text-xs text-gray-500">{[item.mobile, item.email].filter(Boolean).join(' · ')}</span>}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Agent – Select2-style: single input, clear button inside when selected */}
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Agent</label>
                                                <div className="relative flex items-center w-full bg-white border border-gray-300 rounded-xl overflow-visible focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 min-h-[42px]">
                                                    <FiUserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0 pointer-events-none z-10" />
                                                    {formData.agent ? (
                                                        <>
                                                            <span className="flex-1 pl-9 pr-9 py-2.5 text-sm text-gray-900 truncate">
                                                                {selectedAgentDisplay?.name ?? formData.agent}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => { handleFormSelectChange('agent', ''); setSelectedAgentDisplay(null); }}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="Clear"
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
                                                                placeholder="Search Agent (min 3 characters)..."
                                                                className="flex-1 min-w-0 pl-9 pr-3 py-2.5 text-sm border-0 bg-transparent focus:ring-0 focus:outline-none placeholder-gray-400"
                                                            />
                                                            {agentSearchQuery.trim().length >= 3 && (
                                                                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto task-scrollbar-hide">
                                                                    {agentSearchLoading && <div className="p-3 text-sm text-gray-500">Searching...</div>}
                                                                    {!agentSearchLoading && agentSearchResults.length === 0 && <div className="p-3 text-sm text-gray-500">No results</div>}
                                                                    {!agentSearchLoading && agentSearchResults.map((item) => (
                                                                        <button
                                                                            key={item.username}
                                                                            type="button"
                                                                            onClick={() => { handleFormSelectChange('agent', item.username); setSelectedAgentDisplay({ username: item.username, name: item.name }); setAgentSearchQuery(''); setAgentSearchResults([]); }}
                                                                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-indigo-50 flex flex-col border-b border-gray-100 last:border-0"
                                                                        >
                                                                            <span className="font-medium text-gray-900">{item.name}</span>
                                                                            {(item.mobile || item.email) && <span className="text-xs text-gray-500">{[item.mobile, item.email].filter(Boolean).join(' · ')}</span>}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Employee Selection - Two Box Layout (staff from API, frontend search) */}
                                        <div className="space-y-3">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Employees
                                            </label>
                                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                                                {/* Available Employees */}
                                                <div className="lg:col-span-2">
                                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[420px] flex flex-col overflow-hidden">
                                                        <div className="flex justify-between items-center mb-3 shrink-0">
                                                            <h3 className="text-sm font-medium text-gray-700">Available Employees</h3>
                                                            <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                                                                {allEmployees.length}
                                                            </span>
                                                        </div>
                                                        <div className="relative mb-2 shrink-0">
                                                            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                            <input
                                                                type="text"
                                                                value={employeeSearchQuery}
                                                                onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                                                                placeholder="Search by name, mobile, email, designation..."
                                                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                                                            {staffLoading && (
                                                                <div className="text-center text-gray-500 text-sm py-8">Loading staff...</div>
                                                            )}
                                                            {!staffLoading && filteredAvailableEmployees.length === 0 && (
                                                                <div className="text-center text-gray-400 text-sm py-8">
                                                                    {employeeSearchQuery.trim() ? 'No matching employees' : 'No employees available'}
                                                                </div>
                                                            )}
                                                            {!staffLoading && filteredAvailableEmployees.map(employee => (
                                                                <div
                                                                    key={employee.username}
                                                                    onClick={() => addEmployee(employee)}
                                                                    className="p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors duration-200"
                                                                >
                                                                    <div className="font-medium text-sm text-gray-800">{employee.name}</div>
                                                                    <div className="text-sm text-gray-400">
                                                                        {[employee.department, employee.mobile].filter(Boolean).join(' • ') || '—'}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Transfer Controls */}
                                                <div className="lg:col-span-1 flex lg:flex-col justify-center items-center space-y-3 lg:space-y-3 space-x-3 lg:space-x-0">
                                                    <motion.button
                                                        type="button"
                                                        onClick={addAllEmployees}
                                                        disabled={filteredAvailableEmployees.length === 0}
                                                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <FiArrowRight className="w-4 h-4" />
                                                    </motion.button>
                                                    <motion.button
                                                        type="button"
                                                        onClick={removeAllEmployees}
                                                        disabled={selectedEmployees.length === 0}
                                                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <FiArrowLeft className="w-4 h-4" />
                                                    </motion.button>
                                                </div>

                                                {/* Selected Employees */}
                                                <div className="lg:col-span-2">
                                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[420px] flex flex-col overflow-hidden">
                                                        <div className="flex justify-between items-center mb-3 shrink-0">
                                                            <h3 className="text-sm font-medium text-gray-700">Selected Employees</h3>
                                                            <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                                                                {selectedEmployees.length}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                                                            {selectedEmployees.map(employee => (
                                                                <div
                                                                    key={employee.username}
                                                                    onClick={() => removeEmployee(employee)}
                                                                    className="p-3 bg-white border border-indigo-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors duration-200"
                                                                >
                                                                    <div className="font-medium text-sm text-gray-800">{employee.name}</div>
                                                                    <div className="text-sm text-gray-400">
                                                                        {[employee.department, employee.mobile].filter(Boolean).join(' • ') || '—'}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {selectedEmployees.length === 0 && (
                                                                <div className="text-center text-gray-400 text-sm py-8">
                                                                    No employees selected
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 5: Notes & Attachments */}
                                <div className={`transition-all duration-500 ease-in-out ${currentStep === 5
                                    ? 'opacity-100 translate-x-0 block'
                                    : 'opacity-0 translate-x-full absolute inset-0 overflow-hidden'
                                    }`}>
                                    <div className="space-y-8">
                                        {/* 1. Text notes – multiple */}
                                        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 overflow-hidden shadow-sm">
                                            <div className="px-5 py-4 border-b border-gray-100 bg-white/80 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                                        <FiFileText className="w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-900">Text notes</h3>
                                                    </div>
                                                </div>
                                                <motion.button
                                                    type="button"
                                                    onClick={addTextNote}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <FiPlus className="w-4 h-4" />
                                                    Add note
                                                </motion.button>
                                            </div>
                                            <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
                                                {(formData.text_notes || []).length === 0 ? (
                                                    <div className="text-center py-8 text-gray-400 text-sm rounded-xl border-2 border-dashed border-gray-200">
                                                        No text notes yet. Click &quot;Add note&quot; to add one.
                                                    </div>
                                                ) : (
                                                    (formData.text_notes || []).map((text, index) => (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="group flex gap-3 items-start"
                                                        >
                                                            <textarea
                                                                value={text}
                                                                onChange={(e) => updateTextNote(index, e.target.value)}
                                                                placeholder={`Note ${index + 1}...`}
                                                                rows={3}
                                                                className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none resize-none transition-shadow"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTextNote(index)}
                                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                                                title="Remove note"
                                                            >
                                                                <FiTrash2 className="w-4 h-4" />
                                                            </button>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* 2. Voice notes – multiple */}
                                        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 overflow-hidden shadow-sm">
                                            <div className="px-5 py-4 border-b border-gray-100 bg-white/80 flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                                    <FiMic className="w-5 h-5 text-violet-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-900">Voice notes</h3>
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                {/* Record new voice note */}
                                                <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
                                                    <motion.button
                                                        type="button"
                                                        onClick={isRecording ? stopRecording : startRecording}
                                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium shadow-sm ${isRecording ? "bg-red-500 hover:bg-red-600 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"}`}
                                                        whileHover={{ scale: 1.03 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        {isRecording ? (
                                                            <><FiStopCircle className="w-5 h-5" /> Stop recording</>
                                                        ) : (
                                                            <><FiMic className="w-5 h-5" /> Start recording</>
                                                        )}
                                                    </motion.button>
                                                    {isRecording && (
                                                        <div className="flex items-center gap-2 mt-3 text-red-600 text-sm font-medium">
                                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                            {formatTime(recordingTime)}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* List of saved voice notes */}
                                                {voiceNotesList.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Saved ({voiceNotesList.length})</p>
                                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                                            {voiceNotesList.map((v) => (
                                                                <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                                                                    {v.uploading ? (
                                                                        <div className="flex items-center gap-2 flex-1 text-gray-500 text-sm">
                                                                            <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                                            </svg>
                                                                            Uploading…
                                                                        </div>
                                                                    ) : (
                                                                        <audio controls className="flex-1 max-h-9 min-w-0" src={v.url} />
                                                                    )}
                                                                    <span className="text-xs text-gray-500 font-mono shrink-0">{formatTime(v.duration)}</span>
                                                                    <button type="button" onClick={() => removeVoiceNote(v.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                                        <FiTrash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. Attachments – multiple (unchanged behavior) */}
                                        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 overflow-hidden shadow-sm">
                                            <div className="px-5 py-4 border-b border-gray-100 bg-white/80 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                        <FiPaperclip className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
                                                    </div>
                                                </div>
                                                <motion.button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <FiPlus className="w-4 h-4" />
                                                    Add file
                                                </motion.button>
                                                <input type="file" ref={fileInputRef} onChange={handleFileAttach} multiple className="hidden" />
                                            </div>
                                            <div className="p-4 min-h-[120px]">
                                                {attachedFiles.length > 0 ? (
                                                    <ul className="space-y-4 max-h-[400px] overflow-y-auto">
                                                        {attachedFiles.map(att => (
                                                            <li key={att.id} className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm space-y-3">
                                                                <div className="flex items-start gap-3">
                                                                    <span className="text-2xl shrink-0">{getFileIcon(att.type)}</span>
                                                                    <div className="flex-1 min-w-0 space-y-2">
                                                                        {att.uploading && (
                                                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                                <svg className="animate-spin h-4 w-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                                                </svg>
                                                                                Uploading…
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-gray-500 mb-0.5">Name <span className="text-red-500">*</span></label>
                                                                            <input
                                                                                type="text"
                                                                                value={att.name}
                                                                                onChange={(e) => updateAttachmentName(att.id, e.target.value)}
                                                                                placeholder="Type attachment name"
                                                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                                                required
                                                                                disabled={att.uploading}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-gray-500 mb-0.5">Remark (optional)</label>
                                                                            <input
                                                                                type="text"
                                                                                value={att.remark || ''}
                                                                                onChange={(e) => updateAttachmentRemark(att.id, e.target.value)}
                                                                                placeholder="Optional remark"
                                                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                                                disabled={att.uploading}
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs text-gray-400">{att.file?.name} · {formatFileSize(att.size)}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        {!att.uploading && att.previewUrl && (
                                                                            <button type="button" onClick={() => window.open(att.previewUrl, '_blank')} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Preview">
                                                                                <FiEye className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                        <button type="button" onClick={() => removeFile(att.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Remove">
                                                                            <FiTrash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="text-center py-8 text-gray-400 text-sm rounded-xl border-2 border-dashed border-gray-200">
                                                        No files attached. Click &quot;Add file&quot; to attach.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex justify-between pt-6 border-t border-gray-200 mt-6">
                                    {currentStep > 1 ? (
                                        <motion.button
                                            type="button"
                                            onClick={prevStep}
                                            className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiArrowLeft className="w-4 h-4" />
                                            <span>Previous</span>
                                        </motion.button>
                                    ) : (
                                        <div></div>
                                    )}

                                    {currentStep < totalSteps ? (
                                        <motion.button
                                            type="button"
                                            onClick={nextStep}
                                            disabled={!validateStep(currentStep).valid || showSubTaskForm}
                                            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200 disabled:shadow-none"
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <span>Next Step</span>
                                            <FiArrowRight className="w-4 h-4" />
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            type="submit"
                                            disabled={submitting || !validateStep(currentStep).valid}
                                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-200"
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {submitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Creating Task...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FiPlus className="w-4 h-4" />
                                                    <span>Create Task</span>
                                                </>
                                            )}
                                        </motion.button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Task Create Result Modal */}
            <AnimatePresence>
                {taskCreateResultModalOpen && taskCreateResult && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setTaskCreateResultModalOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            className="relative w-full max-w-4xl max-h-[78vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 px-6 py-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-xl">
                                            <FaCheckCircle className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Tasks created successfully</h2>
                                            <p className="text-indigo-100 text-sm mt-0.5">
                                                {taskCreateResult?.message || ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setTaskCreateResultModalOpen(false)}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                        aria-label="Close"
                                    >
                                        <FiX className="w-6 h-6 text-white" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-5 overflow-y-auto flex-1">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                                        <p className="text-xs font-semibold text-violet-700">Total Tasks</p>
                                        <p className="text-2xl font-extrabold text-violet-800 mt-1">{taskCreateResult.count}</p>
                                    </div>
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                        <p className="text-xs font-semibold text-blue-700">Total Fees</p>
                                        <p className="text-2xl font-extrabold text-blue-800 mt-1">₹{formatCurrency(taskCreateResult.stats?.totals?.fees ?? 0)}</p>
                                    </div>
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                        <p className="text-xs font-semibold text-amber-700">Total Tax</p>
                                        <p className="text-2xl font-extrabold text-amber-800 mt-1">₹{formatCurrency(taskCreateResult.stats?.totals?.taxValue ?? 0)}</p>
                                    </div>
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                        <p className="text-xs font-semibold text-emerald-700">Total Amount</p>
                                        <p className="text-2xl font-extrabold text-emerald-800 mt-1">₹{formatCurrency(taskCreateResult.stats?.totals?.total ?? 0)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setTaskCreateResultModalOpen(false)}
                                        className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTaskCreateResultModalOpen(false);
                                            navigate('/task/view');
                                        }}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Go to Task List
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TaskCreate;