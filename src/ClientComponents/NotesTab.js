import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiPlus, FiEdit, FiTrash2, FiX, FiMessageSquare, FiUser, FiCalendar,
    FiTag, FiSearch, FiCheckCircle, FiEye,
    FiClock, FiPaperclip, FiBell, FiDownload, FiUpload,
    FiAlertCircle, FiFile, FiType, FiCheck,
    FiAlertTriangle, FiInfo, FiMic, FiVolume2, FiFolder
} from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import { uploadOneSaasFileUrl } from '../utils/onesaas-upload';
import TablePagination from "../components/TablePagination";
import SelectInput from "../components/SelectInput";

const NotesTab = ({ clientUsername }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: true
    });

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityListFilter, setPriorityListFilter] = useState('all');
    const [createNoteType, setCreateNoteType] = useState('text');

    // Updated newNote state - removed attachments
    const [newNote, setNewNote] = useState({
        subject: '',
        note: '',
        priority: 'high',
        status: 'pending',
        reminder_date: null,
        type: 'text', // text, file, or voice
        file: null // For file/voice upload
    });

    // Voice recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioURL, setAudioURL] = useState('');
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const recordingCancelledRef = useRef(false);

    // Audio playback tracking
    const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
    const audioRefs = useRef({});

    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const fileInputRef = useRef(null);
    const attachmentInputRefs = useRef({});
    const [creatingNote, setCreatingNote] = useState(false);
    const [createValidationErrors, setCreateValidationErrors] = useState({});
    const [createForm, setCreateForm] = useState({
        textNotes: [''],
        attachments: [],
        voiceNotes: [],
        priority: 'low',
        status: 'pending',
    });


    const fetchNotes = async (page = 1, search = '', limit = null) => {
        if (!clientUsername) {
            setError('Client username is required');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const headers = getHeaders();
            if (!headers) {
                throw new Error('Missing authentication headers. Please login again.');
            }

            const apiUrl = `${API_BASE_URL}/client/details/notes/list`;
            const pageLimit = limit ?? pagination.limit;
            const params = {
                username: clientUsername,
                page_no: page,
                limit: pageLimit,
                search: search
            };

            const response = await axios.get(apiUrl, {
                params,
                headers,
                timeout: 15000
            });

            if (response.data && response.data.success) {
                const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }) : null;

                const apiNotes = response.data.data.map(note => ({
                    id: note.note_id,
                    note: note.note || '',
                    subject: note.subject || '',
                    author: note.create_by?.name || 'Unknown',
                    priority: note.priority || 'low',
                    status: note.status || 'pending',
                    create_date: note.create_date,
                    modify_date: note.modify_date,
                    type: note.type || 'text',
                    file: note.file || note.voice || null,
                    attachments: note.attachments || [],
                    formatted_create_date: fmt(note.create_date),
                    formatted_modify_date: fmt(note.modify_date),
                    created_by_name: note.create_by?.name || 'Unknown',
                    modified_by_name: note.modify_by?.name || null,
                }));

                setNotes(apiNotes);
                setPagination(response.data.pagination || {
                    page,
                    limit: pageLimit,
                    total: apiNotes.length,
                    total_pages: 1,
                    is_last_page: true
                });
                setError(null);
            } else {
                throw new Error(response.data?.message || 'Failed to fetch notes');
            }
        } catch (err) {
            console.error('Error fetching notes:', err);
            if (err.response?.status === 401) {
                setError('Authentication failed. Please login again.');
            } else if (err.response?.status === 404) {
                setError('API endpoint not found.');
            } else if (err.response?.status === 500) {
                setError('Server error. Please try again later.');
            } else if (err.code === 'ECONNABORTED') {
                setError('Request timeout. Please try again.');
            } else {
                setError(err.response?.data?.message || err.message || 'Error loading notes. Please try again.');
            }

            setNotes([]);
            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                total_pages: 1,
                is_last_page: true
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clientUsername) {
            fetchNotes(1, '');
        } else {
            setError('Please select a client first.');
            setLoading(false);
        }
    }, [clientUsername]);

    useEffect(() => {
        if (!clientUsername) return;
        const timer = setTimeout(() => fetchNotes(1, searchTerm), searchTerm ? 400 : 0);
        return () => clearTimeout(timer);
    }, [searchTerm, clientUsername]);

    // Open View Modal
    const openViewModal = (note) => {
        setSelectedNote(note);
        setShowViewModal(true);
    };

    // Open Edit Modal
    const openEditModal = (note) => {
        setSelectedNote(note);

        // Map the displayed status to API status values
        let apiStatus = 'pending';
        const displayStatus = note.status.toLowerCase();

        if (displayStatus === 'complete' || displayStatus === 'completed') {
            apiStatus = 'complete';
        } else if (displayStatus === 'cancel' || displayStatus === 'cancelled') {
            apiStatus = 'cancel';
        } else if (displayStatus === 'active') {
            apiStatus = 'pending';
        } else {
            apiStatus = displayStatus;
        }

        setNewNote({
            subject: note.subject || '',
            note: note.note || '',
            priority: note.priority.toLowerCase() || 'high',
            status: apiStatus,
            reminder_date: note.reminder_date || null,
            type: note.type || 'text',
            file: note.file || null
        });
        setShowEditModal(true);
    };

    const uploadFileToServer = async (file) => {
        if (!file) return null;

        try {
            let uploadFile = file;

            if (file.type === 'audio/wav' && !file.name.toLowerCase().endsWith('.wav')) {
                uploadFile = new File([file], `${file.name.replace(/\.[^/.]+$/, "")}.wav`, {
                    type: 'audio/wav'
                });
            }

            const url = await uploadOneSaasFileUrl(uploadFile, (progress) => {
                setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            });

            return url;
        } catch (error) {
            console.error('Error uploading file:', error);
            const msg = error.response?.data?.message || error.message || 'Upload failed';
            toast.error(msg);
            return null;
        } finally {
            setTimeout(() => {
                setUploadProgress(prev => {
                    const newProgress = { ...prev };
                    delete newProgress[file.name];
                    return newProgress;
                });
            }, 2000);
        }
    };

    // Handle file selection for file type notes
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes

        if (file.size > maxSize) {
            toast.error('File exceeds the 10MB limit. Please upload a smaller file.');
            return;
        }

        setUploadingAttachment(true);

        // Upload file to server
        const fileUrl = await uploadFileToServer(file);

        if (fileUrl) {
            setNewNote(prev => ({
                ...prev,
                type: 'file',
                file: fileUrl,
                note: `File uploaded: ${file.name}`,
                subject: prev.subject || file.name
            }));
        }

        setUploadingAttachment(false);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Voice recording functions - FIXED TO CONVERT TO WAV FORMAT
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 44100,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // Use audio/webm for recording (most compatible with browsers)
            const mimeType = 'audio/webm';
            const mediaRecorder = new MediaRecorder(stream, { mimeType });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Create WebM blob from recorded chunks
                const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

                // Convert WebM to WAV format for server compatibility
                const wavBlob = await convertWebMToWav(webmBlob);

                // Create audio file with correct WAV format
                const timestamp = new Date().getTime();
                const audioFile = new File([wavBlob], `voice-note-${timestamp}.wav`, {
                    type: 'audio/wav'
                });

                // Update audio preview (still use original for playback)
                setAudioBlob(webmBlob); // Keep original for preview
                const audioUrl = URL.createObjectURL(webmBlob);
                setAudioURL(audioUrl);

                // Upload the WAV file (server will accept this)
                setUploadingAttachment(true);
                const fileUrl = await uploadFileToServer(audioFile);

                if (fileUrl) {
                    setNewNote(prev => ({
                        ...prev,
                        type: 'voice',
                        file: fileUrl,
                        note: `Voice note (${formatRecordingTime(recordingTime)})`,
                        subject: prev.subject || 'Voice Note'
                    }));
                    toast.success('Voice note uploaded successfully!');
                } else {
                    toast.error('Failed to upload voice note. Please try again.');
                }

                setUploadingAttachment(false);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error starting recording:', error);
            toast.error('Error accessing microphone. Please check permissions.');
        }
    };

    // Add this helper function to convert WebM to WAV
    const convertWebMToWav = async (webmBlob) => {
        try {
            // Create an audio context to process the audio
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Convert blob to array buffer
            const arrayBuffer = await webmBlob.arrayBuffer();

            // Decode the WebM audio data
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Get audio parameters
            const numberOfChannels = audioBuffer.numberOfChannels;
            const sampleRate = audioBuffer.sampleRate;
            const length = audioBuffer.length;

            // Calculate WAV file size
            const wavSize = 44 + length * numberOfChannels * 2; // 44 bytes header + PCM data

            // Create array buffer for WAV file
            const wavBuffer = new ArrayBuffer(wavSize);
            const view = new DataView(wavBuffer);

            // Write WAV header
            // RIFF identifier
            writeString(view, 0, 'RIFF');
            // File length minus RIFF identifier length and file description length
            view.setUint32(4, 36 + length * numberOfChannels * 2, true);
            // RIFF type
            writeString(view, 8, 'WAVE');
            // Format chunk identifier
            writeString(view, 12, 'fmt ');
            // Format chunk length
            view.setUint32(16, 16, true);
            // Sample format (PCM)
            view.setUint16(20, 1, true);
            // Channel count
            view.setUint16(22, numberOfChannels, true);
            // Sample rate
            view.setUint32(24, sampleRate, true);
            // Byte rate (sample rate * block align)
            view.setUint32(28, sampleRate * numberOfChannels * 2, true);
            // Block align (channel count * bytes per sample)
            view.setUint16(32, numberOfChannels * 2, true);
            // Bits per sample
            view.setUint16(34, 16, true);
            // Data chunk identifier
            writeString(view, 36, 'data');
            // Data chunk length
            view.setUint32(40, length * numberOfChannels * 2, true);

            // Write PCM audio data
            let offset = 44;
            for (let i = 0; i < length; i++) {
                for (let channel = 0; channel < numberOfChannels; channel++) {
                    const sample = audioBuffer.getChannelData(channel)[i];
                    // Convert to 16-bit PCM
                    const int16 = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
                    view.setInt16(offset, int16, true);
                    offset += 2;
                }
            }

            // Create WAV blob
            const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

            return wavBlob;

        } catch (error) {
            console.error('Error converting WebM to WAV:', error);
            return new Blob([webmBlob], { type: 'audio/wav' });
        }
    };

    // Helper function to write strings to DataView
    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setAudioBlob(null);
            setAudioURL('');
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            // Reset note type to text
            setNewNote(prev => ({
                ...prev,
                type: 'text',
                file: null
            }));
        }
    };

    // Format recording time
    const formatRecordingTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Remove file/voice
    const removeFile = () => {
        setNewNote(prev => ({
            ...prev,
            type: 'text',
            file: null,
            note: '',
            subject: prev.type === 'file' ? '' : prev.subject
        }));
        setAudioBlob(null);
        setAudioURL('');
    };

    const resetCreateForm = () => {
        setCreateForm({ textNotes: [''], attachments: [], voiceNotes: [], priority: 'low', status: 'pending' });
        setCreateNoteType('text');
        setCreateValidationErrors({});
        attachmentInputRefs.current = {};
    };

    const openAddModal = () => {
        resetCreateForm();
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        if (creatingNote) return;
        setShowAddModal(false);
        resetCreateForm();
    };

    const updateTextNote = (index, value) => {
        setCreateForm((prev) => {
            const next = [...prev.textNotes];
            next[index] = value;
            return { ...prev, textNotes: next };
        });
    };

    const addTextNoteRow = () => {
        setCreateForm((prev) => ({ ...prev, textNotes: [...prev.textNotes, ''] }));
    };

    const removeTextNoteRow = (index) => {
        setCreateForm((prev) => {
            const next = prev.textNotes.filter((_, idx) => idx !== index);
            return { ...prev, textNotes: next.length ? next : [''] };
        });
    };

    const addAttachmentRow = () => {
        setCreateForm((prev) => ({
            ...prev,
            attachments: [...prev.attachments, { name: '', remark: '', file: null, url: '', previewName: '' }],
        }));
    };

    const updateAttachmentRow = (index, patch) => {
        setCreateForm((prev) => {
            const next = [...prev.attachments];
            next[index] = { ...next[index], ...patch };
            return { ...prev, attachments: next };
        });
    };

    const removeAttachmentRow = (index) => {
        setCreateForm((prev) => ({
            ...prev,
            attachments: prev.attachments.filter((_, idx) => idx !== index),
        }));
        delete attachmentInputRefs.current[index];
    };

    const removeVoiceRow = (index) => {
        setCreateForm((prev) => ({
            ...prev,
            voiceNotes: prev.voiceNotes.filter((_, idx) => idx !== index),
        }));
    };

    const startCreateRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, sampleRate: 44100, echoCancellation: true, noiseSuppression: true }
            });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            recordingCancelledRef.current = false;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());

                if (recordingCancelledRef.current) {
                    chunksRef.current = [];
                    return;
                }

                const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const previewUrl = URL.createObjectURL(webmBlob);
                setAudioURL(previewUrl);
                setAudioBlob(webmBlob);

                try {
                    setUploadingAttachment(true);
                    const wavBlob = await convertWebMToWav(webmBlob);
                    const timestamp = Date.now();
                    const audioFile = new File([wavBlob], `voice-note-${timestamp}.wav`, { type: 'audio/wav' });
                    const fileUrl = await uploadFileToServer(audioFile);
                    if (fileUrl) {
                        setCreateForm(prev => ({
                            ...prev,
                            voiceNotes: [...prev.voiceNotes, { url: fileUrl }],
                        }));
                    } else {
                        toast.error('Failed to upload voice note. Please try again.');
                    }
                } catch (err) {
                    console.error('Error processing audio:', err);
                    toast.error('Failed to process audio. Please try again.');
                } finally {
                    setUploadingAttachment(false);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
            toast.error('Error accessing microphone. Please check permissions.');
        }
    };

    const cancelCreateRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            recordingCancelledRef.current = true;
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setAudioBlob(null);
            setAudioURL('');
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const handleAttachmentFileSelect = (index, event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('Attachment exceeds 10MB limit');
            return;
        }
        updateAttachmentRow(index, {
            file,
            previewName: file.name,
            name: createForm.attachments[index]?.name || file.name,
            url: '',
        });
    };


    // Create new note
    const handleAddNote = async () => {
        if (!clientUsername) {
            toast.error('Client username is required');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication headers');
            return;
        }

        const payload = {
            username: clientUsername,
            priority: createForm.priority || 'low',
            status: createForm.status || 'pending',
            notes: { text: [], attachments: [], voice: [] },
        };

        if (createNoteType === 'text') {
            payload.notes.text = createForm.textNotes.filter(t => t.trim());
            if (!payload.notes.text.length) {
                setCreateValidationErrors({ general: 'Enter at least one text note.' });
                return;
            }
        } else if (createNoteType === 'file') {
            const hasCandidate = createForm.attachments.some(a => a.file || String(a.url || '').trim());
            if (!hasCandidate) {
                setCreateValidationErrors({ general: 'Upload or link at least one file.' });
                return;
            }
        } else if (createNoteType === 'voice') {
            const hasCandidate = createForm.voiceNotes.some(v => v.file || String(v.url || '').trim());
            if (!hasCandidate) {
                setCreateValidationErrors({ general: 'Upload or link at least one voice note.' });
                return;
            }
        }

        try {
            setCreatingNote(true);
            setCreateValidationErrors({});

            if (createNoteType === 'file') {
                for (const row of createForm.attachments) {
                    const remark = String(row.remark || '').trim();
                    const displayName = String(row.name || row.previewName || '').trim();
                    let url = String(row.url || '').trim();
                    if (!url && row.file) {
                        setUploadingAttachment(true);
                        const uploadedUrl = await uploadFileToServer(row.file);
                        setUploadingAttachment(false);
                        if (!uploadedUrl) throw new Error(`Failed to upload: ${row.file.name}`);
                        url = uploadedUrl;
                    }
                    if (url) payload.notes.attachments.push({ name: displayName || 'Attachment', remark, url });
                }
                if (!payload.notes.attachments.length) {
                    setCreateValidationErrors({ general: 'No valid attachments to submit.' });
                    return;
                }
            }

            if (createNoteType === 'voice') {
                for (const row of createForm.voiceNotes) {
                    let url = String(row.url || '').trim();
                    if (!url && row.file) {
                        setUploadingAttachment(true);
                        const uploadedUrl = await uploadFileToServer(row.file);
                        setUploadingAttachment(false);
                        if (!uploadedUrl) throw new Error(`Failed to upload: ${row.file.name}`);
                        url = uploadedUrl;
                    }
                    if (url) payload.notes.voice.push(url);
                }
                if (!payload.notes.voice.length) {
                    setCreateValidationErrors({ general: 'No valid voice notes to submit.' });
                    return;
                }
            }

            const response = await axios.post(
                `${API_BASE_URL}/client/details/notes/create`,
                payload,
                { headers }
            );

            if (response.data && response.data.success) {
                await fetchNotes(1, searchTerm);
                setShowAddModal(false);
                resetCreateForm();
                toast.success(response.data?.message || 'Notes created successfully');
            } else {
                throw new Error(response.data?.message || 'Failed to create notes');
            }
        } catch (error) {
            console.error('Error creating note:', error);
            toast.error(error.response?.data?.message || error.message || 'Error creating notes');
        } finally {
            setCreatingNote(false);
            setUploadingAttachment(false);
        }
    };

    // Edit note
    const handleEditNote = async () => {
        if (!selectedNote?.id || !clientUsername) {
            toast.error('No note selected for editing');
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication headers');
            return;
        }

        if (!newNote.subject.trim()) {
            toast.error('Please enter a subject for the note');
            return;
        }

        if (newNote.type === 'text' && !newNote.note.trim()) {
            toast.error('Please enter note content');
            return;
        }

        try {
            const requestBody = {
                username: clientUsername,
                note_id: selectedNote.id,
                subject: newNote.subject,
                priority: newNote.priority,
                status: newNote.status,
                type: newNote.type,
                reminder_date: newNote.reminder_date ? new Date(newNote.reminder_date).toISOString() : null,
                note: newNote.note,
                ...(newNote.type !== 'text' && { file: newNote.file }),
                ...(newNote.type === 'voice' && { file_type: 'voice' }),
            };

            const response = await axios.post(
                `${API_BASE_URL}/client/details/notes/edit`,
                requestBody,
                { headers }
            );

            if (response.data?.success) {
                fetchNotes(1, searchTerm);
                setShowEditModal(false);
                setAudioBlob(null);
                setAudioURL('');
                toast.success(response.data?.message || 'Note updated successfully');
            } else {
                toast.error(response.data?.message || 'Failed to update note');
            }
        } catch (error) {
            console.error('Error updating note:', error);
            toast.error(error.response?.data?.message || error.message || 'Error updating note');
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            fetchNotes(newPage, searchTerm);
        }
    };

    const handleLimitChange = (newLimit) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
        fetchNotes(1, searchTerm, newLimit);
    };


    const filteredNotes = notes.filter(note => {
        if (activeFilter !== 'all' && note.type !== activeFilter) return false;
        if (statusFilter !== 'all' && note.status?.toLowerCase() !== statusFilter) return false;
        if (priorityListFilter !== 'all' && note.priority?.toLowerCase() !== priorityListFilter) return false;
        return true;
    });

    const deleteNote = async () => {
        if (!selectedNote) return;

        const headers = getHeaders();
        if (!headers) {
            toast.error('Missing authentication headers');
            return;
        }

        try {
            const response = await axios.delete(
                `${API_BASE_URL}/client/details/notes/delete/${selectedNote.id}`,
                { headers, data: { username: clientUsername } }
            );

            if (response.data?.success) {
                setNotes(notes.filter(note => note.id !== selectedNote.id));
                setShowDeleteModal(false);
                toast.success(response.data?.message || 'Note deleted successfully');
            } else {
                toast.error(response.data?.message || 'Failed to delete note');
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            toast.error(error.response?.data?.message || error.message || 'Error deleting note');
        }
    };

    const openDeleteModal = (note) => {
        setSelectedNote(note);
        setShowDeleteModal(true);
    };


    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High':
                return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200';
            case 'Medium':
                return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200';
            case 'Low':
                return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200';
            default:
                return 'bg-gradient-to-r from-gray-100 to-slate-100 text-slate-800 border border-gray-200';
        }
    };

    const getStatusColor = (status) => {
        const statusLower = status.toLowerCase();
        switch (statusLower) {
            case 'complete':
            case 'completed':
                return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200';
            case 'active':
            case 'pending':
                return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200';
            case 'cancel':
            case 'cancelled':
                return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200';
            default:
                return 'bg-gradient-to-r from-gray-100 to-slate-100 text-slate-800 border border-gray-200';
        }
    };

    const getReminderStatus = (reminderDate) => {
        if (!reminderDate) return null;

        const now = new Date();
        const reminder = new Date(reminderDate);
        const diffTime = reminder - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffTime < 0) {
            return { color: 'text-red-600 bg-red-50 border-red-200', text: 'Overdue', icon: FiAlertTriangle };
        } else if (diffDays <= 1) {
            return { color: 'text-orange-600 bg-orange-50 border-orange-200', text: 'Due today', icon: FiAlertCircle };
        } else if (diffDays <= 3) {
            return { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', text: 'Upcoming', icon: FiBell };
        } else {
            return { color: 'text-blue-600 bg-blue-50 border-blue-200', text: 'Scheduled', icon: FiCalendar };
        }
    };


    const getNoteTitle = (note) => {
        if (note.subject && note.subject !== 'Untitled Note') return note.subject;
        switch (note.type) {
            case 'file': return 'File Attachment';
            case 'voice': return 'Voice Recording';
            default: return 'Text Note';
        }
    };

    const getNoteDescription = (note) => {
        if (note.note && note.note.trim()) return note.note;
        switch (note.type) {
            case 'file': return note.file_name || 'Attached file';
            case 'voice': return 'Voice recording';
            default: return 'No content';
        }
    };

    // Get file icon based on file type
    const getFileIcon = (fileName) => {
        const extension = fileName?.split('.').pop().toLowerCase() || '';
        switch (extension) {
            case 'pdf':
                return <FiFile className="w-5 h-5 text-red-600" />;
            case 'doc':
            case 'docx':
                return <FiFile className="w-5 h-5 text-blue-600" />;
            case 'xls':
            case 'xlsx':
                return <FiFile className="w-5 h-5 text-green-600" />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return <FiFile className="w-5 h-5 text-purple-600" />;
            case 'mp3':
            case 'wav':
            case 'ogg':
            case 'webm':
                return <FiVolume2 className="w-5 h-5 text-orange-600" />;
            default:
                return <FiPaperclip className="w-5 h-5 text-slate-600" />;
        }
    };


    // Get note type badge color
    const getTypeBadgeColor = (type) => {
        switch (type) {
            case 'text':
                return 'bg-blue-50 text-blue-700 border border-blue-100';
            case 'file':
                return 'bg-green-50 text-green-700 border border-green-100';
            case 'voice':
                return 'bg-purple-50 text-purple-700 border border-purple-100';
            default:
                return 'bg-gray-50 text-slate-700 border border-gray-100';
        }
    };

    // Get note type icon
    const getTypeIcon = (type) => {
        switch (type) {
            case 'text':
                return <FiMessageSquare className="w-4 h-4" />;
            case 'file':
                return <FiFile className="w-4 h-4" />;
            case 'voice':
                return <FiMic className="w-4 h-4" />;
            default:
                return <FiMessageSquare className="w-4 h-4" />;
        }
    };

    // Handle audio playback
    const handlePlayAudio = (noteId) => {
        if (currentlyPlaying === noteId) {
            // Pause if currently playing
            if (audioRefs.current[noteId]) {
                audioRefs.current[noteId].pause();
                setCurrentlyPlaying(null);
            }
        } else {
            // Pause any currently playing audio
            if (currentlyPlaying && audioRefs.current[currentlyPlaying]) {
                audioRefs.current[currentlyPlaying].pause();
            }

            // Play new audio
            if (audioRefs.current[noteId]) {
                audioRefs.current[noteId].play()
                    .then(() => setCurrentlyPlaying(noteId))
                    .catch(err => console.error('Error playing audio:', err));
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (audioURL) {
                URL.revokeObjectURL(audioURL);
            }
            // Cleanup audio refs
            Object.values(audioRefs.current).forEach(audio => {
                if (audio) {
                    audio.pause();
                    audio.src = '';
                }
            });
        };
    }, [audioURL]);

    const isCreateFormValid = useMemo(() => {
        if (createNoteType === 'text') {
            return createForm.textNotes.length > 0 &&
                createForm.textNotes.every(t => t.trim() !== '');
        }
        if (createNoteType === 'file') {
            return createForm.attachments.length > 0 &&
                createForm.attachments.every(a => a.file || String(a.url || '').trim());
        }
        if (createNoteType === 'voice') {
            return !isRecording && !uploadingAttachment &&
                createForm.voiceNotes.length > 0 &&
                createForm.voiceNotes.every(v => String(v.url || '').trim() !== '');
        }
        return false;
    }, [createNoteType, createForm]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm"
        >
            {/* Header Section */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FiMessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">Client Notes & Communication</h3>
                </div>
                <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
                >
                    <FiPlus className="w-4 h-4" />
                    Add Note
                </button>
            </div>

            {/* Error State */}
            {error && !loading && (
                <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                        <FiAlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-sm text-red-600 mb-2">{error}</p>
                    {clientUsername ? (
                        <button onClick={() => fetchNotes(1, '')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Try again</button>
                    ) : (
                        <p className="text-sm text-slate-500">Please select a client to view notes</p>
                    )}
                </div>
            )}

            {/* Search + Filters */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-3">
                {/* Search */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search notes by content, author, or date…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder:text-slate-400 transition-colors"
                    />
                    {loading && searchTerm && (
                        <span className="absolute inset-y-0 right-3 flex items-center">
                            <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        </span>
                    )}
                </div>

                {/* Type tabs + Status/Priority on the same row */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    {/* Type tabs */}
                    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                        {[
                            { value: 'all', label: 'All', icon: FiFolder },
                            { value: 'text', label: 'Text', icon: FiMessageSquare },
                            { value: 'file', label: 'Files', icon: FiFile },
                            { value: 'voice', label: 'Voice', icon: FiVolume2 },
                        ].map((f) => (
                            <button
                                key={f.value}
                                onClick={() => setActiveFilter(f.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeFilter === f.value
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                                    }`}
                            >
                                <f.icon className="w-3.5 h-3.5" />
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Status + Priority selects */}
                    <div className="flex items-center gap-2">
                        <div style={{ width: 148 }}>
                            <SelectInput
                                options={[
                                    { value: 'all', label: 'All Status' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'complete', label: 'Complete' },
                                    { value: 'cancel', label: 'Cancel' },
                                ]}
                                value={statusFilter}
                                onChange={(v) => setStatusFilter(v ?? 'all')}
                                placeholder="All Status"
                                searchPlaceholder="Search status…"
                                clearable={false}
                            />
                        </div>
                        <div style={{ width: 148 }}>
                            <SelectInput
                                options={[
                                    { value: 'all', label: 'All Priority' },
                                    { value: 'high', label: 'High' },
                                    { value: 'medium', label: 'Medium' },
                                    { value: 'low', label: 'Low' },
                                ]}
                                value={priorityListFilter}
                                onChange={(v) => setPriorityListFilter(v ?? 'all')}
                                placeholder="All Priority"
                                searchPlaceholder="Search priority…"
                                clearable={false}
                            />
                        </div>
                        {(statusFilter !== 'all' || priorityListFilter !== 'all' || activeFilter !== 'all') && (
                            <button
                                onClick={() => { setStatusFilter('all'); setPriorityListFilter('all'); setActiveFilter('all'); }}
                                className="px-2.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200 h-10 whitespace-nowrap"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Skeleton Loading */}
            {loading && (
                <div className="divide-y divide-gray-100">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-4 animate-pulse">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-200" />
                                <div className="flex-1 space-y-2 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3.5 bg-gray-200 rounded-full w-40" />
                                        <div className="h-3.5 bg-gray-200 rounded-full w-14" />
                                        <div className="h-3.5 bg-gray-200 rounded-full w-14" />
                                    </div>
                                    <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                                    <div className="flex items-center gap-3">
                                        <div className="h-3 bg-gray-200 rounded-full w-20" />
                                        <div className="h-3 bg-gray-200 rounded-full w-28" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Notes List */}
            {!loading && !error && (
                <div className="divide-y divide-gray-100">
                    {filteredNotes.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-4">
                                <FiMessageSquare className="w-6 h-6 text-blue-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-700 mb-1">No notes found</p>
                            <p className="text-xs text-slate-400 mb-4">
                                {notes.length === 0 ? 'Get started by creating your first note.' : 'Try adjusting your filters.'}
                            </p>
                            {notes.length === 0 && (
                                <button
                                    onClick={openAddModal}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    Add first note
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredNotes.map((note, index) => {
                            const p = note.priority?.toLowerCase();
                            const s = note.status?.toLowerCase();
                            return (
                                <motion.div
                                    key={note.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className="group relative p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => openViewModal(note)}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Type icon tile */}
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${note.type === 'text' ? 'bg-blue-50 ring-1 ring-blue-100' :
                                            note.type === 'file' ? 'bg-emerald-50 ring-1 ring-emerald-100' :
                                                'bg-violet-50 ring-1 ring-violet-100'
                                            }`}>
                                            <span className={
                                                note.type === 'text' ? 'text-blue-500' :
                                                    note.type === 'file' ? 'text-emerald-500' : 'text-violet-500'
                                            }>
                                                {getTypeIcon(note.type)}
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    {/* Title */}
                                                    <h4 className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                                                        {getNoteTitle(note)}
                                                    </h4>
                                                    {/* Description */}
                                                    <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                                                        {getNoteDescription(note)}
                                                    </p>
                                                    {/* Badges row */}
                                                    <div className="flex items-center gap-1.5 mb-1.5">
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${p === 'high' ? 'bg-red-50 text-red-600 border-red-200' :
                                                            p === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                                'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                            }`}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                            {p ? p.charAt(0).toUpperCase() + p.slice(1) : '—'}
                                                        </span>
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${s === 'complete' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            s === 'cancel' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                                'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                            }`}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                            {s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'}
                                                        </span>
                                                    </div>
                                                    {/* Meta */}
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                                            <FiUser className="w-3 h-3" />
                                                            {note.author}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                                            <FiCalendar className="w-3 h-3" />
                                                            {note.formatted_create_date}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Action buttons (hover reveal) */}
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openViewModal(note); }}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                        title="View"
                                                    >
                                                        <FiEye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEditModal(note); }}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <FiEdit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openDeleteModal(note); }}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            )}

            {/* TablePagination */}
            {!loading && !error && pagination.total > 0 && (
                <TablePagination
                    page={pagination.page}
                    limit={pagination.limit}
                    total={pagination.total}
                    totalPages={pagination.total_pages}
                    isLastPage={pagination.is_last_page}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                    showRange
                    showRows
                    showJump
                    showFirstLast
                    rowOptions={[5, 10, 20, 50, 100]}
                    defaultRows={20}
                />
            )}

            {/* Professional View Note Modal - UPDATED FOR VOICE PLAYBACK */}
            <AnimatePresence>
                {showViewModal && selectedNote && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
                        onClick={(e) => e.target === e.currentTarget && setShowViewModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className={`shrink-0 px-5 py-3.5 ${selectedNote.type === 'text' ? 'bg-gradient-to-r from-blue-600 to-indigo-700' :
                                selectedNote.type === 'file' ? 'bg-gradient-to-r from-green-600 to-emerald-700' :
                                    'bg-gradient-to-r from-purple-600 to-pink-700'
                                } text-white`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                                            {getTypeIcon(selectedNote.type)}
                                        </div>
                                        <h2 className="text-base font-semibold text-white">Note Details</h2>
                                    </div>
                                    <motion.button
                                        onClick={() => setShowViewModal(false)}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <FiX className="w-5 h-5 text-white" />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                <div className="space-y-8">
                                    {/* Note Header Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</label>
                                            <div className="text-sm font-semibold text-slate-800">{selectedNote.subject || 'No Subject'}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</label>
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${getPriorityColor(selectedNote.priority)}`}>
                                                <FiTag className="w-4 h-4" />
                                                {selectedNote.priority} Priority
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${getStatusColor(selectedNote.status)}`}>
                                                <FiCheckCircle className="w-4 h-4" />
                                                {selectedNote.status}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Type Display */}
                                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedNote.type === 'text' ? 'bg-gradient-to-r from-blue-100 to-indigo-100' :
                                                    selectedNote.type === 'file' ? 'bg-gradient-to-r from-green-100 to-emerald-100' :
                                                        'bg-gradient-to-r from-purple-100 to-pink-100'
                                                    }`}>
                                                    {getTypeIcon(selectedNote.type)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-800">Note Type</h3>
                                                    <p className="text-sm text-slate-600">
                                                        {selectedNote.type === 'text' ? 'Text Note' :
                                                            selectedNote.type === 'file' ? 'File Attachment' :
                                                                'Voice Recording'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`px-4 py-2 rounded-lg font-medium ${getTypeBadgeColor(selectedNote.type)}`}>
                                                {selectedNote.type === 'text' ? 'TEXT' :
                                                    selectedNote.type === 'file' ? 'FILE' :
                                                        'VOICE'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reminder Section */}
                                    {selectedNote.reminder_date && (
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                                                        <FiBell className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-800">Reminder</h3>
                                                        <p className="text-sm text-slate-600">{selectedNote.formatted_reminder_date}</p>
                                                    </div>
                                                </div>
                                                <div className={`px-4 py-2 rounded-lg font-medium ${getReminderStatus(selectedNote.reminder_date)?.color}`}>
                                                    {getReminderStatus(selectedNote.reminder_date)?.text}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Note Content */}
                                    <div className="space-y-4">
                                        <label className="text-sm font-semibold text-slate-700">Note Content</label>
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                                            {selectedNote.type === 'voice' ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                                                            <FiVolume2 className="w-8 h-8 text-purple-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-slate-800">Voice Recording</h4>
                                                            <p className="text-sm text-slate-600">{selectedNote.note}</p>
                                                        </div>
                                                    </div>
                                                    {selectedNote.file && (
                                                        <div className="mt-4 space-y-4">
                                                            <audio
                                                                controls
                                                                className="w-full"
                                                                preload="metadata"
                                                                onPlay={() => setCurrentlyPlaying(selectedNote.id)}
                                                                onPause={() => setCurrentlyPlaying(null)}
                                                                onEnded={() => setCurrentlyPlaying(null)}
                                                            >
                                                                <source src={selectedNote.file} type="audio/mpeg" />
                                                                <source src={selectedNote.file} type="audio/webm" />
                                                                <source src={selectedNote.file} type="audio/ogg" />
                                                                <source src={selectedNote.file} type="audio/wav" />
                                                                Your browser does not support the audio element.
                                                            </audio>
                                                            <div className="flex justify-end gap-3">
                                                                <motion.button
                                                                    onClick={() => window.open(selectedNote.file, '_blank')}
                                                                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-700 text-white rounded-lg hover:shadow-md transition-all duration-200 flex items-center gap-2"
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                >
                                                                    <FiDownload className="w-4 h-4" />
                                                                    Download Audio
                                                                </motion.button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : selectedNote.type === 'file' ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                                                            <FiFile className="w-8 h-8 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-slate-800">File Attachment</h4>
                                                            <p className="text-sm text-slate-600">{selectedNote.note}</p>
                                                        </div>
                                                    </div>
                                                    {selectedNote.file && (
                                                        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-12 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                                                                        {getFileIcon(selectedNote.file)}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-slate-800">
                                                                            {selectedNote.file.split('/').pop()}
                                                                        </div>
                                                                        <div className="text-sm text-slate-500">
                                                                            File attached
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <motion.button
                                                                    onClick={() => window.open(selectedNote.file, '_blank')}
                                                                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg hover:shadow-md transition-all duration-200 flex items-center gap-2"
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                >
                                                                    <FiDownload className="w-4 h-4" />
                                                                    Download File
                                                                </motion.button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedNote.note}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metadata Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                                <FiUser className="w-5 h-5 text-blue-600" />
                                                Created Information
                                            </h4>
                                            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                                                <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <FiUser className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-800">{selectedNote.created_by_name}</div>
                                                    <div className="text-sm text-slate-600">{selectedNote.formatted_create_date}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {selectedNote.modified_by_name && (
                                            <div className="space-y-4">
                                                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                                    <FiClock className="w-5 h-5 text-green-600" />
                                                    Last Updated
                                                </h4>
                                                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <FiUser className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800">{selectedNote.modified_by_name}</div>
                                                        <div className="text-sm text-slate-600">{selectedNote.formatted_modify_date}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="shrink-0 border-t px-5 py-3 bg-gray-50 flex justify-end gap-3">
                                <motion.button
                                    onClick={() => setShowViewModal(false)}
                                    className="px-4 py-2 border border-gray-300 text-slate-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2"
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiX className="w-4 h-4" />
                                    Close
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        openEditModal(selectedNote);
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 flex items-center gap-2"
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiEdit className="w-4 h-4" />
                                    Edit Note
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Note Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
                        onClick={(e) => e.target === e.currentTarget && closeAddModal()}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="shrink-0 px-5 py-3.5 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                        <FiPlus className="w-4 h-4 text-white" />
                                    </div>
                                    <h3 className="text-base font-semibold text-white">Add New Note</h3>
                                </div>
                                <button
                                    onClick={closeAddModal}
                                    className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {createValidationErrors.general && (
                                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                                        {createValidationErrors.general}
                                    </div>
                                )}

                                {/* Note Type Selection */}
                                <div className="grid grid-cols-3 gap-3 mb-5">
                                    {[
                                        { type: 'text', label: 'Text Note', icon: FiMessageSquare, color: 'blue' },
                                        { type: 'file', label: 'File Attachment', icon: FiFile, color: 'green' },
                                        { type: 'voice', label: 'Voice Note', icon: FiVolume2, color: 'purple' },
                                    ].map((item) => (
                                        <button
                                            key={item.type}
                                            onClick={() => setCreateNoteType(item.type)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${createNoteType === item.type
                                                ? item.color === 'blue' ? 'border-blue-500 bg-blue-50'
                                                    : item.color === 'green' ? 'border-green-500 bg-green-50'
                                                        : 'border-purple-500 bg-purple-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${createNoteType === item.type
                                                ? item.color === 'blue' ? 'bg-blue-100'
                                                    : item.color === 'green' ? 'bg-green-100'
                                                        : 'bg-purple-100'
                                                : 'bg-gray-100'
                                                }`}>
                                                <item.icon className={`w-5 h-5 ${createNoteType === item.type
                                                    ? item.color === 'blue' ? 'text-blue-600'
                                                        : item.color === 'green' ? 'text-green-600'
                                                            : 'text-purple-600'
                                                    : 'text-slate-600'
                                                    }`} />
                                            </div>
                                            <span className={`text-xs font-medium ${createNoteType === item.type
                                                ? item.color === 'blue' ? 'text-blue-600'
                                                    : item.color === 'green' ? 'text-green-600'
                                                        : 'text-purple-600'
                                                : 'text-slate-600'
                                                }`}>
                                                {item.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Priority + Status */}
                                <div className="grid grid-cols-2 gap-3 mb-5">
                                    <div>
                                        <SelectInput
                                            label="Priority"
                                            options={[
                                                { value: 'low', label: 'Low' },
                                                { value: 'medium', label: 'Medium' },
                                                { value: 'high', label: 'High' },
                                            ]}
                                            value={createForm.priority}
                                            onChange={(v) => setCreateForm(prev => ({ ...prev, priority: v ?? 'low' }))}
                                            placeholder="Select priority…"
                                            clearable={false}
                                        />
                                    </div>
                                    <div>
                                        <SelectInput
                                            label="Status"
                                            options={[
                                                { value: 'pending', label: 'Pending' },
                                                { value: 'complete', label: 'Complete' },
                                                { value: 'cancel', label: 'Cancel' },
                                            ]}
                                            value={createForm.status}
                                            onChange={(v) => setCreateForm(prev => ({ ...prev, status: v ?? 'pending' }))}
                                            placeholder="Select status…"
                                            clearable={false}
                                        />
                                    </div>
                                </div>

                                {/* Text Notes */}
                                {createNoteType === 'text' && (
                                    <div className="space-y-3">
                                        {createForm.textNotes.map((text, i) => (
                                            <div key={i} className="flex gap-2">
                                                <textarea
                                                    value={text}
                                                    onChange={(e) => updateTextNote(i, e.target.value)}
                                                    className="flex-1 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[120px] resize-none"
                                                    placeholder="Write your note here..."
                                                />
                                                {createForm.textNotes.length > 1 && (
                                                    <button
                                                        onClick={() => removeTextNoteRow(i)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg h-fit transition-colors"
                                                    >
                                                        <FiX className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={addTextNoteRow}
                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Add another note
                                        </button>
                                    </div>
                                )}

                                {/* File Attachments */}
                                {createNoteType === 'file' && (
                                    <div className="space-y-4">
                                        {createForm.attachments.map((att, i) => (
                                            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-slate-700">Attachment {i + 1}</span>
                                                    <button
                                                        onClick={() => removeAttachmentRow(i)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <FiX className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        ref={(el) => { attachmentInputRefs.current[i] = el; }}
                                                        type="file"
                                                        className="hidden"
                                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip,.rar"
                                                        onChange={(e) => handleAttachmentFileSelect(i, e)}
                                                    />
                                                    <div
                                                        className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition-colors cursor-pointer"
                                                        onClick={() => attachmentInputRefs.current[i]?.click()}
                                                    >
                                                        <FiUpload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                                                        <p className="text-sm text-slate-600">
                                                            {att.previewName ? att.previewName : 'Click to upload or drag and drop'}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-1">Maximum file size: 10MB</p>
                                                    </div>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={att.name}
                                                    onChange={(e) => updateAttachmentRow(i, { name: e.target.value })}
                                                    placeholder="File name (optional)"
                                                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={att.remark}
                                                    onChange={(e) => updateAttachmentRow(i, { remark: e.target.value })}
                                                    placeholder="Add a remark or description..."
                                                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                />
                                                {att.url && (
                                                    <a href={att.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                                                        Preview uploaded file
                                                    </a>
                                                )}
                                                {uploadProgress[att.file?.name] && (
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-600">Uploading...</span>
                                                            <span className="text-blue-600 font-medium">{uploadProgress[att.file.name]}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                            <div
                                                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                                                style={{ width: `${uploadProgress[att.file.name]}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={addAttachmentRow}
                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Add another attachment
                                        </button>
                                    </div>
                                )}

                                {/* Voice Notes */}
                                {createNoteType === 'voice' && (
                                    <div id="voice-recording-area" className="space-y-4">
                                        {/* Idle — no recordings yet, not recording */}
                                        {!isRecording && createForm.voiceNotes.length === 0 && (
                                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                                                <div className="w-16 h-16 mx-auto mb-4 bg-purple-50 rounded-full flex items-center justify-center">
                                                    <FiMic className="w-6 h-6 text-purple-600" />
                                                </div>
                                                <h4 className="text-sm font-medium text-slate-800 mb-1">Record a voice note</h4>
                                                <p className="text-xs text-slate-500 mb-4">Click the button below to start recording</p>
                                                <button
                                                    onClick={startCreateRecording}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                                                >
                                                    <FiMic className="w-4 h-4" />
                                                    Start Recording
                                                </button>
                                            </div>
                                        )}

                                        {/* Recording in progress */}
                                        {isRecording && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                                                <div className="w-16 h-16 mx-auto mb-4 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                                                    <FiMic className="w-6 h-6 text-white" />
                                                </div>
                                                <p className="text-sm font-medium text-red-600 mb-3">
                                                    Recording… {formatRecordingTime(recordingTime)}
                                                </p>
                                                <div className="flex justify-center gap-3">
                                                    <button
                                                        onClick={stopRecording}
                                                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                                    >
                                                        Stop Recording
                                                    </button>
                                                    <button
                                                        onClick={cancelCreateRecording}
                                                        className="px-4 py-2 border border-gray-200 text-slate-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Processing spinner */}
                                        {uploadingAttachment && !isRecording && (
                                            <div className="text-sm text-purple-600 text-center py-2">
                                                <div className="inline-flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                                    Processing audio…
                                                </div>
                                            </div>
                                        )}

                                        {/* Saved recordings list */}
                                        {createForm.voiceNotes.map((row, i) => (
                                            <div key={i} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center gap-3">
                                                    <audio controls src={row.url} className="flex-1" />
                                                    <button
                                                        onClick={() => removeVoiceRow(i)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                                    >
                                                        <FiX className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Add another recording */}
                                        {!isRecording && !uploadingAttachment && createForm.voiceNotes.length > 0 && (
                                            <button
                                                onClick={startCreateRecording}
                                                className="text-sm text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1"
                                            >
                                                <FiPlus className="w-4 h-4" />
                                                Add another recording
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="shrink-0 px-5 py-3 border-t border-blue-100 bg-blue-50/60 flex justify-end gap-3">
                                <button
                                    onClick={closeAddModal}
                                    disabled={creatingNote}
                                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddNote}
                                    disabled={creatingNote || uploadingAttachment || !isCreateFormValid}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                                >
                                    {creatingNote ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Creating...
                                        </>
                                    ) : uploadingAttachment ? 'Processing...' : 'Create Note'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Professional Edit Note Modal */}
            <AnimatePresence>
                {showEditModal && selectedNote && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"
                        onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                                            <FiEdit className="w-5 h-5 text-white" />
                                        </div>
                                        <h2 className="text-base font-semibold text-white">Edit Note</h2>
                                    </div>
                                    <motion.button
                                        onClick={() => {
                                            setShowEditModal(false);
                                            if (isRecording) {
                                                stopRecording();
                                            }
                                            setAudioBlob(null);
                                            setAudioURL('');
                                        }}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <FiX className="w-5 h-5 text-white" />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                <div className="space-y-8">
                                    {/* Note Type Selection */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <FiType className="w-4 h-4" />
                                            Note Type *
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <motion.button
                                                type="button"
                                                onClick={() => setNewNote(prev => ({ ...prev, type: 'text', file: null }))}
                                                className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center space-y-3 ${newNote.type === 'text'
                                                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md'
                                                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                                                    }`}
                                                whileHover={{ scale: 1.02, y: -2 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${newNote.type === 'text'
                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700'
                                                    : 'bg-gradient-to-r from-blue-100 to-indigo-100'
                                                    }`}>
                                                    <FiMessageSquare className={`w-8 h-8 ${newNote.type === 'text' ? 'text-white' : 'text-blue-600'}`} />
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="font-semibold text-slate-800">Text Note</h4>
                                                    <p className="text-sm text-slate-600 mt-1">Write a text note</p>
                                                </div>
                                                {newNote.type === 'text' && (
                                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                        <FiCheck className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                            </motion.button>

                                            <motion.button
                                                type="button"
                                                onClick={() => setNewNote(prev => ({ ...prev, type: 'file', file: null }))}
                                                className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center space-y-3 ${newNote.type === 'file'
                                                    ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md'
                                                    : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                                                    }`}
                                                whileHover={{ scale: 1.02, y: -2 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${newNote.type === 'file'
                                                    ? 'bg-gradient-to-r from-green-600 to-emerald-700'
                                                    : 'bg-gradient-to-r from-green-100 to-emerald-100'
                                                    }`}>
                                                    <FiFile className={`w-8 h-8 ${newNote.type === 'file' ? 'text-white' : 'text-green-600'}`} />
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="font-semibold text-slate-800">File Note</h4>
                                                    <p className="text-sm text-slate-600 mt-1">Upload a document/file</p>
                                                </div>
                                                {newNote.type === 'file' && (
                                                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                                                        <FiCheck className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                            </motion.button>

                                            <motion.button
                                                type="button"
                                                onClick={() => setNewNote(prev => ({ ...prev, type: 'voice', file: null }))}
                                                className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center space-y-3 ${newNote.type === 'voice'
                                                    ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 shadow-md'
                                                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                                                    }`}
                                                whileHover={{ scale: 1.02, y: -2 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${newNote.type === 'voice'
                                                    ? 'bg-gradient-to-r from-purple-600 to-pink-700'
                                                    : 'bg-gradient-to-r from-purple-100 to-pink-100'
                                                    }`}>
                                                    <FiMic className={`w-8 h-8 ${newNote.type === 'voice' ? 'text-white' : 'text-purple-600'}`} />
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="font-semibold text-slate-800">Voice Note</h4>
                                                    <p className="text-sm text-slate-600 mt-1">Record a voice message</p>
                                                </div>
                                                {newNote.type === 'voice' && (
                                                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                                                        <FiCheck className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                            </motion.button>
                                        </div>
                                    </div>

                                    {/* Basic Information */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                <FiType className="w-4 h-4" />
                                                Subject *
                                            </label>
                                            <input
                                                type="text"
                                                value={newNote.subject}
                                                onChange={(e) => setNewNote({ ...newNote, subject: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                                placeholder="Enter note subject"
                                            />
                                            {!newNote.subject && (
                                                <p className="text-xs text-red-500 flex items-center gap-1">
                                                    <FiAlertCircle className="w-3 h-3" />
                                                    Subject is required
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <SelectInput
                                                label="Priority *"
                                                options={[
                                                    { value: 'high', label: 'High Priority' },
                                                    { value: 'medium', label: 'Medium Priority' },
                                                    { value: 'low', label: 'Low Priority' },
                                                ]}
                                                value={newNote.priority}
                                                onChange={(v) => setNewNote({ ...newNote, priority: v ?? 'high' })}
                                                clearable={false}
                                            />
                                            <SelectInput
                                                label="Status *"
                                                options={[
                                                    { value: 'pending', label: 'Pending' },
                                                    { value: 'complete', label: 'Complete' },
                                                    { value: 'cancel', label: 'Cancel' },
                                                ]}
                                                value={newNote.status}
                                                onChange={(v) => setNewNote({ ...newNote, status: v ?? 'pending' })}
                                                clearable={false}
                                            />
                                        </div>
                                    </div>

                                    {/* Content based on type */}
                                    {newNote.type === 'text' && (
                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                <FiMessageSquare className="w-4 h-4" />
                                                Note Content *
                                            </label>
                                            <textarea
                                                value={newNote.note}
                                                onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300 min-h-[200px] resize-none"
                                                placeholder="Enter your note content here..."
                                            />
                                            {!newNote.note && (
                                                <p className="text-xs text-red-500 flex items-center gap-1">
                                                    <FiAlertCircle className="w-3 h-3" />
                                                    Note content is required
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {newNote.type === 'file' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                    <FiFile className="w-4 h-4" />
                                                    File Upload *
                                                </label>
                                                <span className="text-xs text-slate-500">
                                                    Max 10MB per file
                                                </span>
                                            </div>

                                            {/* File Upload Area */}
                                            {!newNote.file ? (
                                                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-green-500 transition-colors cursor-pointer"
                                                    onClick={() => fileInputRef.current?.click()}>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleFileSelect}
                                                        className="hidden"
                                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip,.rar"
                                                    />
                                                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl flex items-center justify-center">
                                                        <FiUpload className="w-8 h-8 text-green-600" />
                                                    </div>
                                                    <h4 className="font-semibold text-slate-800 mb-2">Click to upload file</h4>
                                                    <p className="text-sm text-slate-600">Supports PDF, Word, Excel, Images, and Text files</p>
                                                    {uploadingAttachment && (
                                                        <div className="mt-4">
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="bg-gradient-to-r from-green-600 to-emerald-700 h-2 rounded-full transition-all duration-300"
                                                                    style={{ width: `${Object.values(uploadProgress)[0] || 0}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-2">
                                                                Uploading... {Object.values(uploadProgress)[0] || 0}%
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                                                                <FiFile className="w-8 h-8 text-green-600" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-slate-800">File Selected</h4>
                                                                <p className="text-sm text-slate-600">
                                                                    {newNote.file.split('/').pop() || 'Uploaded file'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <motion.button
                                                                onClick={() => window.open(newNote.file, '_blank')}
                                                                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                title="Preview"
                                                            >
                                                                <FiEye className="w-4 h-4" />
                                                            </motion.button>
                                                            <motion.button
                                                                onClick={removeFile}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                title="Remove"
                                                            >
                                                                <FiX className="w-4 h-4" />
                                                            </motion.button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Note Description */}
                                            <div className="space-y-3">
                                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                    <FiMessageSquare className="w-4 h-4" />
                                                    Description
                                                </label>
                                                <textarea
                                                    value={newNote.note}
                                                    onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300 min-h-[100px] resize-none"
                                                    placeholder="Add a description for this file..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {newNote.type === 'voice' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                    <FiMic className="w-4 h-4" />
                                                    Voice Recording *
                                                </label>
                                            </div>

                                            {/* Voice Recording Area */}
                                            {!isRecording && !audioURL && !newNote.file ? (
                                                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-purple-500 transition-colors">
                                                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl flex items-center justify-center">
                                                        <FiMic className="w-8 h-8 text-purple-600" />
                                                    </div>
                                                    <h4 className="font-semibold text-slate-800 mb-2">Record a voice note</h4>
                                                    <p className="text-sm text-slate-600 mb-4">Click the record button to start recording</p>
                                                    <motion.button
                                                        onClick={startRecording}
                                                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-700 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center gap-2 mx-auto"
                                                        whileHover={{ scale: 1.05, y: -2 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FiMic className="w-5 h-5" />
                                                        Start Recording
                                                    </motion.button>
                                                    <p className="text-xs text-slate-500 mt-4">
                                                        Note: You'll need to allow microphone access
                                                    </p>
                                                </div>
                                            ) : isRecording ? (
                                                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-8 text-center">
                                                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-red-600 to-pink-700 rounded-full flex items-center justify-center animate-pulse">
                                                        <FiMic className="w-10 h-10 text-white" />
                                                    </div>
                                                    <h4 className="font-semibold text-slate-800 mb-2">Recording in progress...</h4>
                                                    <div className="text-base font-bold text-rose-700 mb-6">
                                                        {formatRecordingTime(recordingTime)}
                                                    </div>
                                                    <div className="flex justify-center gap-4">
                                                        <motion.button
                                                            onClick={stopRecording}
                                                            className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-700 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/25 transition-all duration-300 flex items-center gap-2"
                                                            whileHover={{ scale: 1.05, y: -2 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FiCheck className="w-5 h-5" />
                                                            Stop Recording
                                                        </motion.button>
                                                        <motion.button
                                                            onClick={cancelRecording}
                                                            className="px-6 py-3 border border-gray-300 text-slate-700 hover:bg-gray-100 rounded-xl font-medium transition-all duration-300"
                                                            whileHover={{ scale: 1.05, y: -2 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            Cancel
                                                        </motion.button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                                                                <FiVolume2 className="w-8 h-8 text-purple-600" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-slate-800">Recording Complete</h4>
                                                                <p className="text-sm text-slate-600">
                                                                    Duration: {formatRecordingTime(recordingTime)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {audioURL && (
                                                                <audio controls className="w-48">
                                                                    <source src={audioURL} type="audio/mpeg" />
                                                                    Your browser does not support the audio element.
                                                                </audio>
                                                            )}
                                                            <motion.button
                                                                onClick={removeFile}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                title="Re-record"
                                                            >
                                                                <FiX className="w-4 h-4" />
                                                            </motion.button>
                                                        </div>
                                                    </div>
                                                    {uploadingAttachment && (
                                                        <div className="mt-4">
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="bg-gradient-to-r from-purple-600 to-pink-700 h-2 rounded-full transition-all duration-300"
                                                                    style={{ width: `${Object.values(uploadProgress)[0] || 0}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-2 text-center">
                                                                Uploading audio... {Object.values(uploadProgress)[0] || 0}%
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Note Description */}
                                            <div className="space-y-3">
                                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                    <FiMessageSquare className="w-4 h-4" />
                                                    Description
                                                </label>
                                                <textarea
                                                    value={newNote.note}
                                                    onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300 min-h-[100px] resize-none"
                                                    placeholder="Add a description for this voice note..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="shrink-0 border-t px-5 py-3 bg-gray-50 flex justify-between items-center">
                                <div className="text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <FiInfo className="w-4 h-4" />
                                        Fields marked with * are required
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <motion.button
                                        onClick={() => {
                                            setShowEditModal(false);
                                            // Stop recording if in progress
                                            if (isRecording) {
                                                stopRecording();
                                            }
                                            setAudioBlob(null);
                                            setAudioURL('');
                                        }}
                                        className="px-6 py-3 border border-gray-300 text-slate-700 hover:bg-gray-100 rounded-xl font-medium transition-all duration-300"
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Cancel
                                    </motion.button>
                                    {(() => {
                                        const isEditDisabled = !newNote.subject ||
                                            (newNote.type === 'text' && !newNote.note) ||
                                            (newNote.type === 'file' && !newNote.file) ||
                                            (newNote.type === 'voice' && !newNote.file) ||
                                            uploadingAttachment || isRecording;
                                        return (
                                            <motion.button
                                                onClick={handleEditNote}
                                                disabled={isEditDisabled}
                                                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${isEditDisabled
                                                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:shadow-lg hover:shadow-blue-500/25'
                                                    }`}
                                                whileHover={isEditDisabled ? {} : { scale: 1.05, y: -2 }}
                                                whileTap={isEditDisabled ? {} : { scale: 0.95 }}
                                            >
                                                <FiCheck className="w-4 h-4" />
                                                {uploadingAttachment ? 'Uploading...' : isRecording ? 'Recording...' : 'Update Note'}
                                            </motion.button>
                                        );
                                    })()}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Professional Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && selectedNote && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-8 py-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        <FiTrash2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white">Delete Note</h2>
                                        <p className="text-red-100 text-sm mt-1">This action cannot be undone</p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8">
                                <div className="text-center space-y-6">
                                    <div className="w-20 h-20 mx-auto bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center">
                                        <FiAlertTriangle className="w-10 h-10 text-red-600" />
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-slate-800">Confirm Deletion</h3>
                                        <p className="text-slate-600">
                                            Are you sure you want to delete the note titled
                                            <span className="font-bold text-red-600"> "{selectedNote.subject}"</span>?
                                        </p>
                                        <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl text-left">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                                                {getTypeIcon(selectedNote.type)}
                                                <span>Type: {selectedNote.type === 'text' ? 'Text' : selectedNote.type === 'file' ? 'File' : 'Voice'}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 italic line-clamp-2">{selectedNote.note}</p>
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            This action is permanent and cannot be recovered.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="border-t px-8 py-6 bg-gray-50 flex justify-center gap-4">
                                <motion.button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-6 py-3 border border-gray-300 text-slate-700 hover:bg-gray-100 rounded-xl font-medium transition-all duration-300"
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    onClick={deleteNote}
                                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/25 transition-all duration-300 flex items-center gap-2"
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiTrash2 className="w-4 h-4" />
                                    Delete Note
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default NotesTab;