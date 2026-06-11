import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiDownload, FiExternalLink, FiLoader, FiX } from 'react-icons/fi';

const getDownloadFilename = (url, name, type) => {
  if (name?.trim()) return name.trim();

  try {
    const pathname = new URL(url).pathname;
    const segment = decodeURIComponent(pathname.split('/').pop() || '');
    if (segment && segment.includes('.')) return segment;
  } catch {
    /* ignore invalid url */
  }

  const extensions = { image: 'jpg', video: 'mp4', audio: 'mp3', pdf: 'pdf' };
  return `download.${extensions[type] || 'file'}`;
};

const OneChattingMediaModal = ({ media, onClose }) => {
  const [downloading, setDownloading] = useState(false);

  if (!media?.url) return null;

  const { url, type, name } = media;
  const title = name || type || 'Media';

  const handleDownload = async () => {
    setDownloading(true);
    const filename = getDownloadFilename(url, name, type);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch {
        toast.error('Failed to download file');
      }
    } finally {
      setDownloading(false);
    }
  };

  const renderPreview = () => {
    switch (type) {
      case 'image':
        return (
          <img
            src={url}
            alt={title}
            className="max-h-[75vh] max-w-full object-contain rounded-lg mx-auto"
          />
        );
      case 'video':
        return (
          <video
            src={url}
            controls
            autoPlay
            className="max-h-[75vh] max-w-full rounded-lg mx-auto bg-black"
          >
            Your browser does not support video playback.
          </video>
        );
      case 'audio':
        return (
          <div className="w-full max-w-md mx-auto bg-gray-50 rounded-xl p-6">
            <p className="text-sm font-medium text-gray-800 mb-4 text-center truncate">{title}</p>
            <audio src={url} controls autoPlay className="w-full">
              Your browser does not support audio playback.
            </audio>
          </div>
        );
      case 'pdf':
        return (
          <iframe
            src={url}
            title={title}
            className="w-full h-[75vh] rounded-lg bg-white border border-gray-200"
          />
        );
      default:
        return (
          <div className="text-center text-gray-500 py-12">
            <p className="text-sm">Preview not available for this file type.</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
          <p className="text-sm font-medium text-gray-800 truncate">{title}</p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
              title="Download"
            >
              {downloading ? (
                <FiLoader className="w-4 h-4 animate-spin" />
              ) : (
                <FiDownload className="w-4 h-4" />
              )}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
              title="Open in new tab"
            >
              <FiExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Close preview"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-gray-100">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default OneChattingMediaModal;
