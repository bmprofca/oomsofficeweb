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

function NotePanel({ icon: Icon, iconClass, iconBg, title, action, children, className = '' }) {
    return (
        <div
            className={`flex flex-col w-full h-full min-h-[240px] lg:min-h-[280px] rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm ${className}`}
        >
            <div className="shrink-0 px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-2 bg-gray-50/50">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                        <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
                    </div>
                    <h3 className="text-xs font-semibold text-gray-900">{title}</h3>
                </div>
                {action}
            </div>
            <div className="flex-1 min-h-0 p-3 overflow-y-auto task-scrollbar-hide">{children}</div>
        </div>
    );
}

const addBtnClass =
    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-white shadow-sm';

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full">
            <div className="lg:col-span-4 w-full min-w-0 flex flex-col">
            <NotePanel
                icon={FiFileText}
                iconClass="text-indigo-600"
                iconBg="bg-indigo-100"
                title="Text notes"
                action={
                    <motion.button
                        type="button"
                        onClick={addTextNote}
                        className={`${addBtnClass} bg-indigo-600 hover:bg-indigo-700`}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiPlus className="w-3.5 h-3.5" />
                        Add
                    </motion.button>
                }
            >
                {(form.text_notes || []).length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs rounded-lg border border-dashed border-gray-200">
                        No text notes yet.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {(form.text_notes || []).map((text, index) => (
                            <div key={index} className="group flex gap-2 items-start">
                                <textarea
                                    value={text}
                                    onChange={(e) => updateTextNote(index, e.target.value)}
                                    placeholder={`Note ${index + 1}...`}
                                    rows={2}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none resize-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeTextNote(index)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md shrink-0"
                                >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </NotePanel>
            </div>

            <div className="lg:col-span-4 w-full min-w-0 flex flex-col">
            <NotePanel
                icon={FiPaperclip}
                iconClass="text-emerald-600"
                iconBg="bg-emerald-100"
                title="Attachments"
                action={
                    <>
                        <motion.button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`${addBtnClass} bg-emerald-600 hover:bg-emerald-700`}
                            whileTap={{ scale: 0.98 }}
                        >
                            <FiPlus className="w-3.5 h-3.5" />
                            Add
                        </motion.button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileAttach}
                            multiple
                            className="hidden"
                        />
                    </>
                }
            >
                {attachedFiles.length > 0 ? (
                    <ul className="space-y-2">
                        {attachedFiles.map((att) => (
                            <li
                                key={att.id}
                                className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 space-y-2"
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-lg shrink-0">{getFileIcon(att.type)}</span>
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        {att.uploading && (
                                            <div className="text-xs text-gray-500">Uploading…</div>
                                        )}
                                        <input
                                            type="text"
                                            value={att.name}
                                            onChange={(e) => updateAttachmentName(att.id, e.target.value)}
                                            placeholder="Name *"
                                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none"
                                            disabled={att.uploading}
                                        />
                                        <input
                                            type="text"
                                            value={att.remark || ''}
                                            onChange={(e) => updateAttachmentRemark(att.id, e.target.value)}
                                            placeholder="Remark (optional)"
                                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none"
                                            disabled={att.uploading}
                                        />
                                        <p className="text-[10px] text-gray-400 truncate">
                                            {att.file?.name} · {formatFileSize(att.size)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-0.5 shrink-0">
                                        {!att.uploading && att.previewUrl && (
                                            <button
                                                type="button"
                                                onClick={() => window.open(att.previewUrl, '_blank')}
                                                className="p-1 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md"
                                            >
                                                <FiEye className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeFile(att.id)}
                                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                                        >
                                            <FiTrash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-6 text-gray-400 text-xs rounded-lg border border-dashed border-gray-200">
                        No files attached.
                    </div>
                )}
            </NotePanel>
            </div>

            <div className="lg:col-span-4 w-full min-w-0 flex flex-col">
            <NotePanel
                icon={FiMic}
                iconClass="text-violet-600"
                iconBg="bg-violet-100"
                title="Voice notes"
            >
                <div className="space-y-3">
                    <div className="flex flex-col items-center justify-center py-4 px-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                        <motion.button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium shadow-sm ${
                                isRecording
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-violet-600 hover:bg-violet-700 text-white'
                            }`}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isRecording ? (
                                <>
                                    <FiStopCircle className="w-4 h-4" /> Stop
                                </>
                            ) : (
                                <>
                                    <FiMic className="w-4 h-4" /> Record
                                </>
                            )}
                        </motion.button>
                        {isRecording && (
                            <div className="flex items-center gap-1.5 mt-2 text-red-600 text-xs font-medium">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                {formatTime(recordingTime)}
                            </div>
                        )}
                    </div>
                    {voiceNotesList.length > 0 ? (
                        <div className="space-y-2">
                            {voiceNotesList.map((v) => (
                                <div
                                    key={v.id}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100"
                                >
                                    {v.uploading ? (
                                        <span className="text-xs text-gray-500">Uploading…</span>
                                    ) : (
                                        <audio controls className="flex-1 max-h-8 min-w-0" src={v.url} />
                                    )}
                                    <span className="text-[10px] text-gray-500 font-mono shrink-0">
                                        {formatTime(v.duration)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeVoiceNote(v.id)}
                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md shrink-0"
                                    >
                                        <FiTrash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-400 text-xs rounded-lg border border-dashed border-gray-200">
                            No voice notes yet.
                        </div>
                    )}
                </div>
            </NotePanel>
            </div>
        </div>
    );
}
