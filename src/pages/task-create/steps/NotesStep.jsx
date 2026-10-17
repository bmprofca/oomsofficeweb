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
            className={`flex h-full w-full min-h-[220px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:min-h-[300px] ${className}`}
        >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                        <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
                    </div>
                    <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
                </div>
                {action}
            </div>
            <div className="flex-1 min-h-0 p-3 overflow-y-auto task-scrollbar-hide">{children}</div>
        </div>
    );
}

const addBtnClass =
    'inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700';

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
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="flex w-full min-w-0 flex-col">
            <NotePanel
                icon={FiFileText}
                iconClass="text-indigo-600"
                iconBg="bg-indigo-100"
                title="Text notes"
                action={
                    <motion.button
                        type="button"
                        onClick={addTextNote}
                        className={addBtnClass}
                    >
                        <FiPlus className="w-3.5 h-3.5" />
                        Add
                    </motion.button>
                }
            >
                {(form.text_notes || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
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
                                    className="flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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

            <div className="flex w-full min-w-0 flex-col">
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
                            className={addBtnClass}
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
                    <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                        No files attached.
                    </div>
                )}
            </NotePanel>
            </div>

            <div className="flex w-full min-w-0 flex-col">
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
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700'
                            }`}
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
                        <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                            No voice notes yet.
                        </div>
                    )}
                </div>
            </NotePanel>
            </div>
        </div>
    );
}
