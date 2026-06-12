import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiLoader, FiUpload, FiX } from 'react-icons/fi';
import { extractApiError } from './oneChattingSendUtils';
import { uploadOneSaasFile } from './oneChattingUpload';

const ATTACH_CONFIG = {
  image: {
    title: 'Send image',
    linkField: 'image_link',
    accept: 'image/jpeg,image/png,image/webp,image/gif',
    showCaption: true,
  },
  video: {
    title: 'Send video',
    linkField: 'video_link',
    accept: 'video/mp4,video/3gpp,video/quicktime',
    showCaption: true,
  },
  document: {
    title: 'Send document',
    linkField: 'document_link',
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar',
    showCaption: true,
    showDocumentName: true,
  },
  audio: {
    title: 'Send audio',
    linkField: 'audio_link',
    accept: 'audio/*',
    showCaption: false,
    showVoiceToggle: true,
  },
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const OneChattingAttachModal = ({
  type,
  isOpen,
  onClose,
  onSend,
  sending,
  replyPreview,
}) => {
  const config = ATTACH_CONFIG[type];
  const fileInputRef = useRef(null);
  const [inputMode, setInputMode] = useState('file');
  const [link, setLink] = useState('');
  const [caption, setCaption] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [isVoice, setIsVoice] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    setInputMode('file');
    setLink('');
    setCaption('');
    setDocumentName('');
    setIsVoice(false);
    setSelectedFile(null);
    setPreviewUrl('');
    setUploading(false);
    setUploadProgress(0);
  }, [isOpen, type]);

  if (!isOpen || !config) return null;

  const isBusy = sending || uploading;

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    setLink('');

    if (config.showDocumentName && !documentName.trim()) {
      setDocumentName(file.name);
    }

    if (type === 'image' && file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl('');
    }
  };

  const clearSelectedFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const resolveMediaLink = async () => {
    if (inputMode === 'url') {
      return link.trim();
    }

    if (!selectedFile) return '';
    setUploading(true);
    setUploadProgress(0);

    try {
      const { url } = await uploadOneSaasFile(selectedFile, setUploadProgress);
      return url;
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to upload file'));
      return '';
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBusy) return;

    const mediaLink = await resolveMediaLink();
    if (!mediaLink) {
      if (inputMode === 'file' && !selectedFile) {
        toast.error('Please choose a file to upload');
      } else if (inputMode === 'url') {
        toast.error('Please enter a valid HTTPS URL');
      }
      return;
    }

    const payload = {
      [config.linkField]: mediaLink,
    };

    if (config.showCaption) {
      payload.message = caption.trim();
    }

    if (config.showDocumentName) {
      payload.document_name =
        documentName.trim() || selectedFile?.name || 'Document';
    }

    if (config.showVoiceToggle) {
      payload.is_voice = isVoice;
    }

    onSend(payload);
  };

  const canSubmit =
    !isBusy &&
    (inputMode === 'url' ? Boolean(link.trim()) : Boolean(selectedFile));

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isBusy ? undefined : onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-800 m-0">
            {config.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-50"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {replyPreview ? (
            <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-100 text-xs text-gray-600">
              <span className="font-medium text-green-700">Replying to: </span>
              <span className="line-clamp-2">{replyPreview}</span>
            </div>
          ) : null}

          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            {[
              { id: 'file', label: 'Upload file' },
              { id: 'url', label: 'Paste URL' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setInputMode(option.id)}
                disabled={isBusy}
                className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  inputMode === option.id
                    ? 'bg-white text-green-700 font-medium shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {inputMode === 'file' ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={config.accept}
                onChange={handleFileChange}
                className="hidden"
              />

              {!selectedFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-green-400 hover:bg-green-50/40 transition-colors disabled:opacity-50"
                >
                  <FiUpload className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium">Choose file</span>
                  <span className="text-xs text-gray-500">
                    File will be uploaded to a public HTTPS URL
                  </span>
                </button>
              ) : (
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-h-40 object-contain rounded-lg mb-3 bg-white"
                    />
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate m-0">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500 m-0 mt-0.5">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      disabled={isBusy}
                      className="text-xs text-red-600 hover:text-red-700 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {uploading ? (
                <div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-green-600 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 m-0">
                    Uploading… {uploadProgress}%
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Public HTTPS URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com/file.jpg"
                disabled={isBusy}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be publicly accessible over HTTPS.
              </p>
            </div>
          )}

          {config.showDocumentName ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document name
              </label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Invoice_March.pdf"
                disabled={isBusy}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-60"
              />
            </div>
          ) : null}

          {config.showCaption ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Optional caption"
                disabled={isBusy}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none disabled:opacity-60"
              />
            </div>
          ) : null}

          {config.showVoiceToggle ? (
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isVoice}
                onChange={(e) => setIsVoice(e.target.checked)}
                disabled={isBusy}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              Send as voice note
            </label>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
            >
              {isBusy ? <FiLoader className="w-4 h-4 animate-spin" /> : null}
              {uploading ? 'Uploading…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OneChattingAttachModal;
