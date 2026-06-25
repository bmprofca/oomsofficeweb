import React from 'react';
import { motion } from 'framer-motion';
import {
    FiEye,
    FiFileText,
    FiMic,
    FiPaperclip,
    FiPlus,
    FiStopCircle,
    FiTrash2,
} from 'react-icons/fi';

export default function NotesStep({
    form,
    addTextNote,
    updateTextNote,
    removeTextNote,
    fileInputRef,
    handleFileAttach,
    attachedFiles,
    updateAttachmentName,
    updateAttachmentRemark,
    removeFile,
    formatFileSize,
    getFileIcon,
    isRecording,
    startRecording,
    stopRecording,
    recordingTime,
    formatTime,
    voiceNotesList,
    removeVoiceNote,
}) {
    return (
        <div className="space-y-8">
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 bg-white/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <FiFileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">Text notes</h3>
                    </div>
                    <motion.button
                        type="button"
                        onClick={addTextNote}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm"
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiPlus className="w-4 h-4" />
                        Add note
                    </motion.button>
                </div>
                <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
                    {(form.text_notes || []).length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm rounded-xl border-2 border-dashed border-gray-200">
                            No text notes yet. Click &quot;Add note&quot; to add one.
                        </div>
                    ) : (
                        (form.text_notes || []).map((text, index) => (
                            <div key={index} className="group flex gap-3 items-start">
                                <textarea
                                    value={text}
                                    onChange={(e) => updateTextNote(index, e.target.value)}
                                    placeholder={`Note ${index + 1}...`}
                                    rows={3}
                                    className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none resize-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeTextNote(index)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                                >
                                    <FiTrash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 bg-white/80 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <FiMic className="w-5 h-5 text-violet-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Voice notes</h3>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
                        <motion.button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium shadow-sm ${
                                isRecording
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-violet-600 hover:bg-violet-700 text-white'
                            }`}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isRecording ? (
                                <>
                                    <FiStopCircle className="w-5 h-5" /> Stop recording
                                </>
                            ) : (
                                <>
                                    <FiMic className="w-5 h-5" /> Start recording
                                </>
                            )}
                        </motion.button>
                        {isRecording && (
                            <div className="flex items-center gap-2 mt-3 text-red-600 text-sm font-medium">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                {formatTime(recordingTime)}
                            </div>
                        )}
                    </div>
                    {voiceNotesList.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {voiceNotesList.map((v) => (
                                <div
                                    key={v.id}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm"
                                >
                                    {v.uploading ? (
                                        <span className="text-sm text-gray-500">Uploading…</span>
                                    ) : (
                                        <audio controls className="flex-1 max-h-9 min-w-0" src={v.url} />
                                    )}
                                    <span className="text-xs text-gray-500 font-mono shrink-0">{formatTime(v.duration)}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeVoiceNote(v.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <FiTrash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 bg-white/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <FiPaperclip className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
                    </div>
                    <motion.button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm"
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
                            {attachedFiles.map((att) => (
                                <li key={att.id} className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm space-y-3">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl shrink-0">{getFileIcon(att.type)}</span>
                                        <div className="flex-1 min-w-0 space-y-2">
                                            {att.uploading && <div className="text-sm text-gray-500">Uploading…</div>}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-0.5">
                                                    Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={att.name}
                                                    onChange={(e) => updateAttachmentName(att.id, e.target.value)}
                                                    placeholder="Type attachment name"
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    disabled={att.uploading}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-0.5">Remark (optional)</label>
                                                <input
                                                    type="text"
                                                    value={att.remark || ''}
                                                    onChange={(e) => updateAttachmentRemark(att.id, e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    disabled={att.uploading}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {att.file?.name} · {formatFileSize(att.size)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {!att.uploading && att.previewUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(att.previewUrl, '_blank')}
                                                    className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                                >
                                                    <FiEye className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeFile(att.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                            >
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
    );
}
