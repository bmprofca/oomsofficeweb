import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { FiDownload, FiExternalLink, FiFolderPlus, FiLoader, FiX } from "react-icons/fi";
import { whatsappApi } from "../../services/whatsappApi";
import {
  getDocumentTypeMeta,
  getFileExtension,
} from "../../utils/oneChattingChatUtils";

const HEADER_CLASS =
  "shrink-0 h-14 px-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3";
const BODY_CLASS_PREVIEW =
  "shrink-0 h-[min(70vh,560px)] min-h-[280px] max-h-[70vh] p-4 overflow-hidden flex items-center justify-center bg-gray-100 relative";
const BODY_CLASS_FILE =
  "shrink-0 p-8 overflow-hidden flex items-center justify-center bg-gray-100 relative";
const FOOTER_CLASS =
  "shrink-0 h-14 px-4 border-t border-gray-200 bg-white flex items-center justify-end gap-2";

const MediaBodySkeleton = () => (
  <div
    className="absolute inset-4 rounded-lg bg-gray-200 animate-pulse overflow-hidden flex items-center justify-center"
    aria-hidden
  >
    <div className="flex flex-col items-center gap-3">
      <div className="w-16 h-16 rounded-2xl bg-gray-300" />
      <div className="h-2.5 w-28 rounded bg-gray-300" />
      <div className="h-2 w-20 rounded bg-gray-300/80" />
    </div>
  </div>
);

const getDownloadFilename = (url, name, type) => {
  if (name?.trim()) return name.trim();

  try {
    const pathname = new URL(url).pathname;
    const segment = decodeURIComponent(pathname.split("/").pop() || "");
    if (segment && segment.includes(".")) return segment;
  } catch {
    /* ignore invalid url */
  }

  const extensions = { image: "jpg", video: "mp4", audio: "mp3", pdf: "pdf" };
  return `download.${extensions[type] || "file"}`;
};

const triggerBlobDownload = (blob, filename) => {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Delay revoke so the browser can start the download
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
};

const MediaFilePlaceholder = ({ name, url }) => {
  const extension = getFileExtension(name, url);
  const meta = getDocumentTypeMeta(extension);

  return (
    <div className="flex flex-col items-center gap-4 text-center max-w-sm mx-auto">
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-2xl shadow-sm ${meta.bg}`}
      >
        <span className={`text-lg font-bold uppercase ${meta.color}`}>
          {meta.label}
        </span>
      </div>
      <div className="min-w-0">
        <p className="m-0 text-sm font-semibold text-gray-800 break-words">
          {name || "Document"}
        </p>
        <p className="m-0 mt-1 text-xs text-gray-500">
          {extension ? `${extension.toUpperCase()} file` : "Document file"}
        </p>
        <p className="m-0 mt-3 text-xs text-gray-500">
          Preview is not available. Download the file or save it to client documents.
        </p>
      </div>
    </div>
  );
};

const MediaPreviewContent = ({ media, onClose, onSaveToDocuments }) => {
  const [downloading, setDownloading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);

  const { url, type, name } = media;
  const title = name || type || "Media";
  const isFileModal = type === "file" || type === "document" || type === "pdf";
  const needsLoadGate =
    !isFileModal &&
    (type === "image" || type === "video" || type === "audio");

  useEffect(() => {
    setMediaLoading(needsLoadGate);
    setMediaError(false);
  }, [url, type, needsLoadGate]);

  const handleDownload = async () => {
    if (!url || downloading) return;
    setDownloading(true);
    const filename = getDownloadFilename(url, name, type);

    try {
      // Prefer same-origin/cors blob first
      try {
        const direct = await fetch(url, { mode: "cors", credentials: "omit" });
        if (direct.ok) {
          const blob = await direct.blob();
          if (blob && blob.size > 0) {
            triggerBlobDownload(blob, filename);
            return;
          }
        }
      } catch {
        // Cross-origin without CORS — fall through to authenticated proxy
      }

      const response = await whatsappApi.downloadChatMedia({ url, filename });
      const blob = response?.data;
      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error("Empty download");
      }

      // API errors may arrive as JSON blob
      if (blob.type && blob.type.includes("application/json")) {
        const text = await blob.text();
        let message = "Failed to download file";
        try {
          const parsed = JSON.parse(text);
          message = parsed?.message || parsed?.msg || message;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }

      triggerBlobDownload(blob, filename);
    } catch (error) {
      toast.error(error?.message || "Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  const markLoaded = () => {
    setMediaLoading(false);
    setMediaError(false);
  };

  const markError = () => {
    setMediaLoading(false);
    setMediaError(true);
  };

  const renderPreview = () => {
    if (isFileModal) {
      return <MediaFilePlaceholder name={name} url={url} />;
    }

    switch (type) {
      case "image":
        return (
          <img
            src={url}
            alt={title}
            onLoad={markLoaded}
            onError={markError}
            className={`max-h-full max-w-full object-contain rounded-lg mx-auto transition-opacity duration-200 ${
              mediaLoading ? "opacity-0 absolute" : "opacity-100"
            }`}
          />
        );
      case "video":
        return (
          <video
            src={url}
            controls
            autoPlay
            onLoadedData={markLoaded}
            onError={markError}
            className={`max-h-full max-w-full rounded-lg mx-auto bg-black transition-opacity duration-200 ${
              mediaLoading ? "opacity-0 absolute" : "opacity-100"
            }`}
          >
            Your browser does not support video playback.
          </video>
        );
      case "audio":
        return (
          <div className="w-full max-w-md mx-auto bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-800 mb-4 text-center truncate">
              {title}
            </p>
            <audio
              src={url}
              controls
              autoPlay
              onCanPlay={markLoaded}
              onError={markError}
              className="w-full"
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        );
      default:
        return <MediaFilePlaceholder name={name} url={url} />;
    }
  };

  return (
    <motion.div
      key={`media-overlay-${url}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
    >
      <motion.button
        type="button"
        aria-label="Close preview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onechatting-media-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-[1] w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={HEADER_CLASS}>
          <p
            id="onechatting-media-title"
            className="text-sm font-medium text-gray-800 truncate m-0"
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
            aria-label="Close preview"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className={isFileModal ? BODY_CLASS_FILE : BODY_CLASS_PREVIEW}>
          {needsLoadGate && mediaLoading ? <MediaBodySkeleton /> : null}

          {mediaError && !isFileModal ? (
            <div className="text-center text-gray-500 px-4 relative z-[1]">
              <p className="text-sm m-0">Failed to load preview.</p>
            </div>
          ) : (
            <div className="relative z-[1] w-full h-full flex items-center justify-center">
              {renderPreview()}
            </div>
          )}
        </div>

        <div className={FOOTER_CLASS}>
          {onSaveToDocuments ? (
            <button
              type="button"
              onClick={() => onSaveToDocuments(media)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors mr-auto"
            >
              <FiFolderPlus className="w-4 h-4" />
              Save to Documents
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <FiLoader className="w-4 h-4 animate-spin" />
            ) : (
              <FiDownload className="w-4 h-4" />
            )}
            Download
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors no-underline hover:no-underline focus:no-underline"
          >
            <FiExternalLink className="w-4 h-4" />
            Open
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
          >
            <FiX className="w-4 h-4" />
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const OneChattingMediaModal = ({ media, onClose, onSaveToDocuments }) => {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {media?.url ? (
        <MediaPreviewContent
          key={media.url}
          media={media}
          onClose={onClose}
          onSaveToDocuments={onSaveToDocuments}
        />
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default OneChattingMediaModal;
