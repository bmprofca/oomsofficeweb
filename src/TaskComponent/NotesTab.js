import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiPlus, FiEdit2, FiTrash2, FiX, FiMessageSquare, FiUser, FiCalendar,
    FiTag, FiSearch, FiEye, FiChevronLeft, FiChevronRight, FiPaperclip,
    FiAlertCircle, FiFile, FiCheck, FiMic, FiVolume2, FiDownload,
    FiExternalLink, FiImage, FiMusic, FiUpload, FiClock, FiBell,
    FiMoreVertical, FiArchive, FiStar, FiFolder, FiFilter
} from 'react-icons/fi';
import axios from 'axios';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import { uploadOneSaasFileUrl } from '../utils/onesaas-upload';

const NotesTab = ({ task_id }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: true
    });

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const [newNote, setNewNote] = useState({
        type: 'text',
        textNotes: [''],
        attachments: [],
        voiceNotes: []
    });

    // File upload states
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const fileInputRef = useRef(null);

    // Voice recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioURL, setAudioURL] = useState('');
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // Audio playback tracking
    const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
    const audioRefs = useRef({});

    // Get note title based on type
    const getNoteTitle = (note) => {
        if (note.subject && note.subject !== 'Untitled Note') {
            return note.subject;
        }

        switch (note.type) {
            case 'file':
                return 'File Attachment';
            case 'voice':
                return 'Voice Recording';
            case 'text':
            default:
                return 'Text Note';
        }
    };

    // Get note description based on type
    const getNoteDescription = (note) => {
        if (note.note && note.note.trim()) {
            return note.note;
        }

        switch (note.type) {
            case 'file':
                return note.file_name || 'Attached file';
            case 'voice':
                return 'Voice recording';
            case 'text':
            default:
                return 'No content';
        }
    };

    // Fetch notes
    const fetchNotes = async (page = 1, search = '') => {
        if (!task_id) {
            setError('Task ID is required');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const headers = getHeaders();
            if (!headers) throw new Error('Authentication failed');

            const response = await axios.get(`${API_BASE_URL}/task/details/note/list`, {
                params: { task_id, page_no: page, limit: 20, search },
                headers
            });

            if (response.data?.success) {
                const apiNotes = response.data.data.map(note => ({
                    id: note.note_id,
                    note_id: note.note_id,
                    note: note.note,
                    subject: note.subject,
                    author: note.create_by?.name || 'Unknown',
                    priority: note.priority,
                    status: note.status,
                    create_date: note.create_date,
                    type: note.type || 'text',
                    file: note.file || null,
                    attachments: note.attachments || [],
                    formatted_date: new Date(note.create_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    file_name: note.file ? note.file.split('/').pop() : null
                }));

                setNotes(apiNotes);
                setPagination(response.data.pagination || { page: 1, total_pages: 1 });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Load notes when task or search changes (debounce search only; avoids double fetch on mount)
    useEffect(() => {
        if (!task_id) {
            setError('Please select a task');
            setLoading(false);
            return;
        }
        const debounceMs = searchTerm ? 500 : 0;
        const timer = setTimeout(() => fetchNotes(1, searchTerm), debounceMs);
        return () => clearTimeout(timer);
    }, [task_id, searchTerm]);

    // Filter notes by type
    const filteredNotes = activeFilter === 'all'
        ? notes
        : notes.filter(note => note.type === activeFilter);

    // Upload file
    const uploadFileToServer = async (file) => {
        if (!file) return null;

        try {
            const url = await uploadOneSaasFileUrl(file, (progress) => {
                setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            });
            return url;
        } catch (error) {
            console.error('Error uploading file:', error);
            alert(`Upload failed: ${error.message}`);
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

    // Text note handlers
    const handleTextNoteChange = (index, value) => {
        const updated = [...newNote.textNotes];
        updated[index] = value;
        setNewNote({ ...newNote, textNotes: updated });
    };

    const addTextNote = () => setNewNote({ ...newNote, textNotes: [...newNote.textNotes, ''] });

    const removeTextNote = (index) => {
        if (newNote.textNotes.length > 1) {
            setNewNote({ ...newNote, textNotes: newNote.textNotes.filter((_, i) => i !== index) });
        }
    };

    // Attachment handlers
    const handleAttachmentFileSelect = async (index, file) => {
        const updated = [...newNote.attachments];
        updated[index] = { ...updated[index], file, name: file.name };
        setNewNote({ ...newNote, attachments: updated });

        setUploadingAttachment(true);
        const url = await uploadFileToServer(file);
        if (url) {
            updated[index].url = url;
            setNewNote({ ...newNote, attachments: updated });
        }
        setUploadingAttachment(false);
    };

    const addAttachment = () => setNewNote({
        ...newNote,
        attachments: [...newNote.attachments, { name: '', remark: '', url: '' }]
    });

    const removeAttachment = (index) => setNewNote({
        ...newNote,
        attachments: newNote.attachments.filter((_, i) => i !== index)
    });

    // Convert WebM to WAV
    const convertWebMToWav = async (webmBlob) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await webmBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const numberOfChannels = audioBuffer.numberOfChannels;
            const sampleRate = audioBuffer.sampleRate;
            const length = audioBuffer.length;

            const wavSize = 44 + length * numberOfChannels * 2;
            const wavBuffer = new ArrayBuffer(wavSize);
            const view = new DataView(wavBuffer);

            // Write WAV header
            writeString(view, 0, 'RIFF');
            view.setUint32(4, 36 + length * numberOfChannels * 2, true);
            writeString(view, 8, 'WAVE');
            writeString(view, 12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, numberOfChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * numberOfChannels * 2, true);
            view.setUint16(32, numberOfChannels * 2, true);
            view.setUint16(34, 16, true);
            writeString(view, 36, 'data');
            view.setUint32(40, length * numberOfChannels * 2, true);

            let offset = 44;
            for (let i = 0; i < length; i++) {
                for (let channel = 0; channel < numberOfChannels; channel++) {
                    const sample = audioBuffer.getChannelData(channel)[i];
                    const int16 = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
                    view.setInt16(offset, int16, true);
                    offset += 2;
                }
            }

            return new Blob([wavBuffer], { type: 'audio/wav' });

        } catch (error) {
            console.error('Error converting to WAV:', error);
            throw error;
        }
    };

    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    // Voice recording functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

                const previewUrl = URL.createObjectURL(webmBlob);
                setAudioURL(previewUrl);
                setAudioBlob(webmBlob);

                try {
                    setUploadingAttachment(true);

                    const conversionMsg = document.createElement('div');
                    conversionMsg.className = 'text-sm text-purple-600 text-center mb-2';
                    conversionMsg.innerText = 'Converting audio format...';
                    document.getElementById('voice-recording-area')?.appendChild(conversionMsg);

                    const wavBlob = await convertWebMToWav(webmBlob);

                    conversionMsg.remove();

                    const timestamp = new Date().getTime();
                    const audioFile = new File([wavBlob], `voice-note-${timestamp}.wav`, {
                        type: 'audio/wav'
                    });

                    const fileUrl = await uploadFileToServer(audioFile);

                    if (fileUrl) {
                        setNewNote(prev => ({
                            ...prev,
                            voiceNotes: [...prev.voiceNotes, { url: fileUrl }]
                        }));
                    }

                } catch (error) {
                    console.error('Error processing audio:', error);
                    alert('Failed to process audio. Please try again.');
                } finally {
                    setUploadingAttachment(false);
                }

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Error accessing microphone. Please check permissions.');
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
        }
    };

    const formatRecordingTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const removeVoiceNote = (index) => {
        const updated = newNote.voiceNotes.filter((_, i) => i !== index);
        setNewNote({ ...newNote, voiceNotes: updated });
        if (updated.length === 0) {
            setAudioBlob(null);
            setAudioURL('');
        }
    };

    const getEmptyNoteForm = (noteType = 'text') => {
        const type = noteType === 'file' || noteType === 'voice' ? noteType : 'text';
        return {
            type,
            textNotes: [''],
            attachments: type === 'file' ? [{ name: '', remark: '', url: '' }] : [],
            voiceNotes: []
        };
    };

    const clearRecordingState = () => {
        setAudioBlob(null);
        setAudioURL('');
        setIsRecording(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const resetForm = () => {
        setNewNote(getEmptyNoteForm('text'));
        clearRecordingState();
    };

    const openAddModal = () => {
        const preset =
            activeFilter === 'file' ? 'file' :
                activeFilter === 'voice' ? 'voice' :
                    'text';
        clearRecordingState();
        setNewNote(getEmptyNoteForm(preset));
        setShowAddModal(true);
    };

    const handleAddNote = async () => {
        if (!task_id) return alert('Task ID required');

        const payload = {
            task_id,
            notes: { text: [], attachments: [], voice: [] }
        };

        if (newNote.type === 'text') {
            payload.notes.text = newNote.textNotes.filter(t => t.trim());
            if (!payload.notes.text.length) return alert('Enter at least one note');
        } else if (newNote.type === 'file') {
            payload.notes.attachments = newNote.attachments
                .filter(a => a.url)
                .map(a => ({ name: a.name, remark: a.remark || '', url: a.url }));
            if (!payload.notes.attachments.length) return alert('Upload at least one file');
        } else if (newNote.type === 'voice') {
            payload.notes.voice = newNote.voiceNotes.map(v => v.url);
            if (!payload.notes.voice.length) return alert('Record at least one voice note');
        }

        try {
            setSubmitting(true);
            const headers = getHeaders();
            const response = await axios.post(
                `${API_BASE_URL}/task/details/note/create`,
                payload,
                { headers: { ...headers, 'Content-Type': 'application/json' } }
            );

            if (response.data?.success) {
                fetchNotes(1, searchTerm);
                setShowAddModal(false);
                resetForm();
            } else {
                alert(`Failed to create note: ${response.data?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating note:', error);
            alert(`Error: ${error.response?.data?.message || error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const deleteNote = async () => {
        if (!selectedNote) return;

        try {
            const headers = getHeaders();
            await axios.delete(
                `${API_BASE_URL}/task/details/note/delete/${selectedNote.id}`,
                { headers, data: { task_id } }
            );
            setNotes(notes.filter(n => n.id !== selectedNote.id));
            setShowDeleteModal(false);
        } catch (error) {
            alert('Error deleting note');
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'voice': return <FiVolume2 className="w-4 h-4" />;
            case 'file': return <FiFile className="w-4 h-4" />;
            default: return <FiMessageSquare className="w-4 h-4" />;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'voice': return 'purple';
            case 'file': return 'green';
            default: return 'blue';
        }
    };

    const getFileIcon = (fileName) => {
        const ext = fileName?.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FiImage className="w-4 h-4 text-blue-600" />;
        if (['mp3', 'wav', 'ogg', 'm4a', 'webm'].includes(ext)) return <FiMusic className="w-4 h-4 text-purple-600" />;
        if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return <FiFile className="w-4 h-4 text-green-600" />;
        return <FiPaperclip className="w-4 h-4 text-gray-600" />;
    };

    const isImageFile = (url) => {
        const ext = url?.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
    };

    const isAudioFile = (url) => {
        const ext = url?.split('.').pop().toLowerCase();
        return ['mp3', 'wav', 'ogg', 'm4a', 'webm'].includes(ext);
    };

    const isPdfFile = (url) => {
        const ext = url?.split('.').pop().toLowerCase();
        return ext === 'pdf';
    };

    const handlePlayAudio = (noteId) => {
        if (currentlyPlaying === noteId) {
            if (audioRefs.current[noteId]) {
                audioRefs.current[noteId].pause();
                setCurrentlyPlaying(null);
            }
        } else {
            if (currentlyPlaying && audioRefs.current[currentlyPlaying]) {
                audioRefs.current[currentlyPlaying].pause();
            }
            if (audioRefs.current[noteId]) {
                audioRefs.current[noteId].play()
                    .then(() => setCurrentlyPlaying(noteId))
                    .catch(err => console.error('Error playing audio:', err));
            }
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (audioURL) {
                URL.revokeObjectURL(audioURL);
            }
            Object.values(audioRefs.current).forEach(audio => {
                if (audio) {
                    audio.pause();
                    audio.src = '';
                }
            });
        };
    }, [audioURL]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FiMessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Notes & Attachments</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {notes.length} {notes.length === 1 ? 'note' : 'notes'} • Last updated {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
                >
                    <FiPlus className="w-4 h-4" />
                    New Note
                </button>
            </div>

            {/* Search and Filters */}
            <div className="p-4 border-b border-gray-200">
                <div className="relative mb-3">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search notes by content, author, or date..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder:text-gray-400"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                        {[
                            { value: 'all', label: 'All', icon: FiFolder },
                            { value: 'text', label: 'Text', icon: FiMessageSquare },
                            { value: 'file', label: 'Files', icon: FiFile },
                            { value: 'voice', label: 'Voice', icon: FiVolume2 }
                        ].map((filter) => (
                            <button
                                key={filter.value}
                                onClick={() => setActiveFilter(filter.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeFilter === filter.value
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <filter.icon className="w-3.5 h-3.5" />
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiFilter className="w-4 h-4" />
                    </button>
                </div>

                {/* Advanced Filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-3 mt-3 border-t border-gray-200">
                                <div className="flex gap-3">
                                    <select className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                                        <option>All priorities</option>
                                        <option>High</option>
                                        <option>Medium</option>
                                        <option>Low</option>
                                    </select>
                                    <select className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                                        <option>All status</option>
                                        <option>Active</option>
                                        <option>Archived</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Loading/Error */}
            {loading && (
                <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                        <FiMessageSquare className="w-5 h-5 text-gray-400 animate-pulse" />
                    </div>
                    <p className="text-sm text-gray-500">Loading notes...</p>
                </div>
            )}

            {error && !loading && (
                <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                        <FiAlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-sm text-red-600 mb-2">{error}</p>
                    <button
                        onClick={() => fetchNotes(1, '')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Notes List */}
            {!loading && !error && (
                <div className="divide-y divide-gray-100">
                    {filteredNotes.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                                <FiMessageSquare className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-500 mb-2">No notes found</p>
                            <p className="text-xs text-gray-400 mb-4">Get started by creating your first note</p>
                            <button
                                onClick={openAddModal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <FiPlus className="w-4 h-4" />
                                Add your first note
                            </button>
                        </div>
                    ) : (
                        filteredNotes.map((note, index) => {
                            const typeColor = getTypeColor(note.type);
                            return (
                                <motion.div
                                    key={note.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group relative p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => { setSelectedNote(note); setShowViewModal(true); }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${note.type === 'text' ? 'bg-blue-50' :
                                                note.type === 'file' ? 'bg-green-50' :
                                                    'bg-purple-50'
                                            }`}>
                                            <span className={
                                                note.type === 'text' ? 'text-blue-600' :
                                                    note.type === 'file' ? 'text-green-600' :
                                                        'text-purple-600'
                                            }>
                                                {getTypeIcon(note.type)}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-sm font-medium text-gray-900">
                                                            {getNoteTitle(note)}
                                                        </h4>
                                                        {note.priority && (
                                                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${note.priority === 'high' ? 'bg-red-50 text-red-600' :
                                                                    note.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                                                                        'bg-green-50 text-green-600'
                                                                }`}>
                                                                {note.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                                                        {getNoteDescription(note)}
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex items-center gap-1 text-xs text-gray-400">
                                                            <FiUser className="w-3 h-3" />
                                                            {note.author}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-xs text-gray-400">
                                                            <FiCalendar className="w-3 h-3" />
                                                            {note.formatted_date}
                                                        </span>
                                                        {note.type === 'file' && note.file_name && (
                                                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                                                {getFileIcon(note.file_name)}
                                                                {note.file_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedNote(note); setShowViewModal(true); }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View note"
                                                    >
                                                        <FiEye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedNote(note); setShowDeleteModal(true); }}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete note"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
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

            {/* Pagination */}
            {pagination.total_pages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        Showing page {pagination.page} of {pagination.total_pages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchNotes(pagination.page - 1, searchTerm)}
                            disabled={pagination.page === 1}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FiChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => fetchNotes(pagination.page + 1, searchTerm)}
                            disabled={pagination.is_last_page}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FiChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* View Note Modal */}
            <AnimatePresence>
                {showViewModal && selectedNote && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowViewModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedNote.type === 'text' ? 'bg-blue-50' :
                                            selectedNote.type === 'file' ? 'bg-green-50' :
                                                'bg-purple-50'
                                        }`}>
                                        <span className={
                                            selectedNote.type === 'text' ? 'text-blue-600' :
                                                selectedNote.type === 'file' ? 'text-green-600' :
                                                    'text-purple-600'
                                        }>
                                            {getTypeIcon(selectedNote.type)}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {getNoteTitle(selectedNote)}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500">
                                                Added by {selectedNote.author}
                                            </span>
                                            <span className="text-xs text-gray-400">•</span>
                                            <span className="text-xs text-gray-500">
                                                {selectedNote.formatted_date}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                                {/* Metadata */}
                                {(selectedNote.priority || selectedNote.status) && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {selectedNote.priority && (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${selectedNote.priority === 'high' ? 'bg-red-50 text-red-600' :
                                                    selectedNote.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                                                        'bg-green-50 text-green-600'
                                                }`}>
                                                <FiTag className="w-3.5 h-3.5" />
                                                {selectedNote.priority} priority
                                            </span>
                                        )}
                                        {selectedNote.status && (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${selectedNote.status === 'completed' ? 'bg-green-50 text-green-600' :
                                                    selectedNote.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                                                        'bg-gray-50 text-gray-600'
                                                }`}>
                                                <FiClock className="w-3.5 h-3.5" />
                                                {selectedNote.status}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Text Content */}
                                {selectedNote.type === 'text' && selectedNote.note && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                            {selectedNote.note}
                                        </p>
                                    </div>
                                )}

                                {/* File Content */}
                                {selectedNote.type === 'file' && selectedNote.file && (
                                    <div className="space-y-4">
                                        {selectedNote.file_name && (
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">File Name</h4>
                                                <div className="flex items-center gap-2">
                                                    {getFileIcon(selectedNote.file_name)}
                                                    <span className="text-sm text-gray-900 font-medium">{selectedNote.file_name}</span>
                                                </div>
                                            </div>
                                        )}

                                        {selectedNote.note && (
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                                                <p className="text-sm text-gray-800">{selectedNote.note}</p>
                                            </div>
                                        )}

                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Preview</h4>
                                            {isImageFile(selectedNote.file) && (
                                                <img
                                                    src={selectedNote.file}
                                                    alt={selectedNote.file_name}
                                                    className="max-w-full max-h-96 mx-auto object-contain rounded-lg border border-gray-200"
                                                />
                                            )}

                                            {isPdfFile(selectedNote.file) && (
                                                <iframe
                                                    src={`${selectedNote.file}#toolbar=0`}
                                                    className="w-full h-96 border border-gray-200 rounded-lg"
                                                    title="PDF Preview"
                                                />
                                            )}

                                            {isAudioFile(selectedNote.file) && (
                                                <audio
                                                    ref={el => audioRefs.current[selectedNote.id] = el}
                                                    controls
                                                    className="w-full"
                                                    onPlay={() => setCurrentlyPlaying(selectedNote.id)}
                                                    onPause={() => setCurrentlyPlaying(null)}
                                                    onEnded={() => setCurrentlyPlaying(null)}
                                                >
                                                    <source src={selectedNote.file} />
                                                </audio>
                                            )}

                                            {!isImageFile(selectedNote.file) &&
                                                !isPdfFile(selectedNote.file) &&
                                                !isAudioFile(selectedNote.file) && (
                                                    <div className="text-center py-8">
                                                        <FiFile className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                        <p className="text-sm text-gray-500">Preview not available for this file type</p>
                                                    </div>
                                                )}
                                        </div>

                                        <div className="flex items-center justify-end gap-2">
                                            <a
                                                href={selectedNote.file}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <FiExternalLink className="w-4 h-4" />
                                                Open
                                            </a>
                                            <a
                                                href={selectedNote.file}
                                                download={selectedNote.file_name}
                                                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <FiDownload className="w-4 h-4" />
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* Voice Content */}
                                {selectedNote.type === 'voice' && selectedNote.file && (
                                    <div className="space-y-4">
                                        <div className="bg-purple-50 rounded-lg p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                                    <FiVolume2 className="w-6 h-6 text-purple-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-900">Voice Recording</h4>
                                                    <p className="text-xs text-gray-500">{selectedNote.file_name || 'Voice note'}</p>
                                                </div>
                                            </div>

                                            <audio
                                                ref={el => audioRefs.current[selectedNote.id] = el}
                                                controls
                                                className="w-full mb-4"
                                                onPlay={() => setCurrentlyPlaying(selectedNote.id)}
                                                onPause={() => setCurrentlyPlaying(null)}
                                                onEnded={() => setCurrentlyPlaying(null)}
                                            >
                                                <source src={selectedNote.file} />
                                            </audio>

                                            <div className="flex justify-end gap-2">
                                                <a
                                                    href={selectedNote.file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                                >
                                                    <FiExternalLink className="w-4 h-4" />
                                                </a>
                                                <a
                                                    href={selectedNote.file}
                                                    download={selectedNote.file_name || 'voice-note.wav'}
                                                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                                >
                                                    <FiDownload className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </div>

                                        {selectedNote.note && (
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                                                <p className="text-sm text-gray-800">{selectedNote.note}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                                >
                                    Close
                                </button>
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
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <FiPlus className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900">Add New Note</h3>
                                        <p className="text-xs text-gray-500">Create a new note for this task</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        resetForm();
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-6">
                                {/* Note Type Selection */}
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    {[
                                        { type: 'text', label: 'Text Note', icon: FiMessageSquare, color: 'blue' },
                                        { type: 'file', label: 'File Attachment', icon: FiFile, color: 'green' },
                                        { type: 'voice', label: 'Voice Note', icon: FiVolume2, color: 'purple' }
                                    ].map(item => (
                                        <button
                                            key={item.type}
                                            onClick={() => setNewNote({ ...newNote, type: item.type })}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${newNote.type === item.type
                                                    ? `border-${item.color}-500 bg-${item.color}-50`
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${newNote.type === item.type ? `bg-${item.color}-100` : 'bg-gray-100'
                                                }`}>
                                                <item.icon className={`w-5 h-5 ${newNote.type === item.type ? `text-${item.color}-600` : 'text-gray-600'
                                                    }`} />
                                            </div>
                                            <span className={`text-xs font-medium ${newNote.type === item.type ? `text-${item.color}-600` : 'text-gray-600'
                                                }`}>
                                                {item.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Text Notes */}
                                {newNote.type === 'text' && (
                                    <div className="space-y-3">
                                        {newNote.textNotes.map((text, i) => (
                                            <div key={i} className="flex gap-2">
                                                <textarea
                                                    value={text}
                                                    onChange={(e) => handleTextNoteChange(i, e.target.value)}
                                                    className="flex-1 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[120px] resize-none"
                                                    placeholder="Write your note here..."
                                                />
                                                {newNote.textNotes.length > 1 && (
                                                    <button
                                                        onClick={() => removeTextNote(i)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg h-fit transition-colors"
                                                    >
                                                        <FiX className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={addTextNote}
                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Add another note
                                        </button>
                                    </div>
                                )}

                                {/* File Attachments */}
                                {newNote.type === 'file' && (
                                    <div className="space-y-4">
                                        {newNote.attachments.map((att, i) => (
                                            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-700">Attachment {i + 1}</span>
                                                    <button
                                                        onClick={() => removeAttachment(i)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <FiX className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        onChange={(e) => handleAttachmentFileSelect(i, e.target.files[0])}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                                                        <FiUpload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                                                        <p className="text-sm text-gray-600">
                                                            {att.file ? att.file.name : 'Click to upload or drag and drop'}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            Maximum file size: 10MB
                                                        </p>
                                                    </div>
                                                </div>

                                                <input
                                                    type="text"
                                                    value={att.name}
                                                    onChange={(e) => {
                                                        const updated = [...newNote.attachments];
                                                        updated[i].name = e.target.value;
                                                        setNewNote({ ...newNote, attachments: updated });
                                                    }}
                                                    placeholder="File name (optional)"
                                                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                />

                                                <input
                                                    type="text"
                                                    value={att.remark}
                                                    onChange={(e) => {
                                                        const updated = [...newNote.attachments];
                                                        updated[i].remark = e.target.value;
                                                        setNewNote({ ...newNote, attachments: updated });
                                                    }}
                                                    placeholder="Add a remark or description..."
                                                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                />

                                                {uploadProgress[att.file?.name] && (
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-gray-600">Uploading...</span>
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
                                            onClick={addAttachment}
                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Add another attachment
                                        </button>
                                    </div>
                                )}

                                {/* Voice Notes */}
                                {newNote.type === 'voice' && (
                                    <div id="voice-recording-area" className="space-y-4">
                                        {!isRecording && newNote.voiceNotes.length === 0 && (
                                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                                                <div className="w-16 h-16 mx-auto mb-4 bg-purple-50 rounded-full flex items-center justify-center">
                                                    <FiMic className="w-6 h-6 text-purple-600" />
                                                </div>
                                                <h4 className="text-sm font-medium text-gray-900 mb-2">Record a voice note</h4>
                                                <p className="text-xs text-gray-500 mb-4">Click the button below to start recording</p>
                                                <button
                                                    onClick={startRecording}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                                                >
                                                    <FiMic className="w-4 h-4" />
                                                    Start Recording
                                                </button>
                                            </div>
                                        )}

                                        {isRecording && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                                                <div className="w-16 h-16 mx-auto mb-4 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                                                    <FiMic className="w-6 h-6 text-white" />
                                                </div>
                                                <p className="text-sm text-red-600 font-medium mb-2">Recording... {formatRecordingTime(recordingTime)}</p>
                                                <div className="flex justify-center gap-3">
                                                    <button
                                                        onClick={stopRecording}
                                                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                                                    >
                                                        Stop Recording
                                                    </button>
                                                    <button
                                                        onClick={cancelRecording}
                                                        className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {newNote.voiceNotes.map((voice, i) => (
                                            <div key={i} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center gap-3">
                                                    <audio controls src={voice.url} className="flex-1" />
                                                    <button
                                                        onClick={() => removeVoiceNote(i)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                                    >
                                                        <FiX className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {!isRecording && newNote.voiceNotes.length > 0 && (
                                            <button
                                                onClick={startRecording}
                                                className="text-sm text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1"
                                            >
                                                <FiPlus className="w-4 h-4" />
                                                Add another recording
                                            </button>
                                        )}

                                        {uploadingAttachment && (
                                            <div className="text-sm text-purple-600 text-center">
                                                <div className="inline-flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                                    Processing audio...
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddNote}
                                    disabled={submitting || uploadingAttachment || isRecording}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Creating...
                                        </>
                                    ) : uploadingAttachment ? (
                                        'Processing...'
                                    ) : isRecording ? (
                                        'Recording...'
                                    ) : (
                                        'Create Note'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Modal */}
            <AnimatePresence>
                {showDeleteModal && selectedNote && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                        <FiAlertCircle className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900">Delete Note</h3>
                                        <p className="text-xs text-gray-500">This action cannot be undone</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-600 mb-6">
                                    Are you sure you want to delete "{getNoteTitle(selectedNote)}"? This will permanently remove this note and all its contents.
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={deleteNote}
                                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Delete Note
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotesTab;