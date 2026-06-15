import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import debounce from "lodash.debounce";
import { toast } from "react-hot-toast";
import { Document, Page, pdfjs } from "react-pdf";
import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiCornerUpLeft,
  FiDownload,
  FiFile,
  FiFileText,
  FiImage,
  FiLayout,
  FiLoader,
  FiMapPin,
  FiMaximize2,
  FiMessageCircle,
  FiMic,
  FiMinimize2,
  FiPaperclip,
  FiPause,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiStar,
  FiUser,
  FiVideo,
  FiX,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import OneChattingAttachModal from "./OneChattingAttachModal";
import OneChattingMediaModal from "./OneChattingMediaModal";
import OneChattingTemplateModal from "./OneChattingTemplateModal";
import OneChattingTemplatePreview from "./OneChattingTemplatePreview";
import { whatsappApi } from "./whatsappApi";
import {
  buildReplyPayload,
  enrichSentMessage,
  extractApiError,
  normalizeRecipientNumber,
  resolveTemplateMessage,
} from "./oneChattingSendUtils";
import {
  canPreviewMedia,
  formatAudioDuration,
  formatChatDate,
  getAssigneeLabel,
  getDisplayName,
  getSendBlockedMessage,
  isChatAssignedToMe,
  getDocumentTypeMeta,
  getFileExtension,
  getGoogleMapsEmbedUrl,
  getGoogleMapsLink,
  getLocationFromMessage,
  getMediaPreviewType,
  getMessageCaption,
  getMessageContentLabel,
  getMessagePreview,
  isPdfMedia,
  isTemplateMessage,
  WhatsAppFormattedText,
} from "./oneChattingChatUtils";
import {
  clearChatUnreadCount,
  normalizeSocketAssignment,
  updateChatListForMessage,
  updateChatListLastMessageStatus,
  updateMessageStatus,
  upsertMessage,
} from "./oneChattingSocketUtils";
import { extractDeveloperToken } from "./developerSocket";
import useDeveloperSocket from "./useDeveloperSocket";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const LIVE_CHAT_PATH = "/broadcast/whatsapp/onechatting/live-chat";
const LIVE_CHAT_FULLSCREEN_KEY = "oneChattingLiveChatFullScreen";
const CHAT_LIST_LIMIT = 20;
const HISTORY_LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 500;
const SCROLL_TO_BOTTOM_THRESHOLD = 120;
const MESSAGE_DRAFT_MAX_LENGTH = 4096;
const BUBBLE_MAX_WIDTH_CLASS = "max-w-[65%]";
const MEDIA_PREVIEW_WIDTH_CLASS = "w-[330px] max-w-full";
const MEDIA_PREVIEW_HEIGHT_CLASS = "h-[200px]";
const MEDIA_PREVIEW_BOX_CLASS = `relative ${MEDIA_PREVIEW_WIDTH_CLASS} ${MEDIA_PREVIEW_HEIGHT_CLASS} shrink-0 rounded-md overflow-hidden bg-[#dfe5e7]`;

const ChatListSkeleton = ({ rows = 8 }) => (
  <>
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="px-3 py-2 border-b border-gray-100 animate-pulse"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <div className="h-3.5 bg-gray-200 rounded w-2/5" />
              <div className="h-2.5 bg-gray-200 rounded w-8 shrink-0" />
            </div>
            <div className="h-2.5 bg-gray-200 rounded w-1/3 mt-0.5" />
            <div className="h-3 bg-gray-200 rounded w-4/5 mt-1" />
          </div>
        </div>
      </div>
    ))}
  </>
);

const ConversationSkeleton = () => (
  <div className="p-4 space-y-4 animate-pulse overflow-y-auto h-full">
    <div className="flex justify-start">
      <div className="h-14 w-[55%] bg-white/80 rounded-2xl rounded-bl-md" />
    </div>
    <div className="flex justify-end">
      <div className="h-10 w-[45%] bg-green-200/80 rounded-2xl rounded-br-md" />
    </div>
    <div className="flex justify-start">
      <div className="h-20 w-[60%] bg-white/80 rounded-2xl rounded-bl-md" />
    </div>
    <div className="flex justify-end">
      <div className="h-12 w-[50%] bg-green-200/80 rounded-2xl rounded-br-md" />
    </div>
    <div className="flex justify-start">
      <div className="h-10 w-[40%] bg-white/80 rounded-2xl rounded-bl-md" />
    </div>
    <div className="flex justify-end">
      <div className="h-16 w-[55%] bg-green-200/80 rounded-2xl rounded-br-md" />
    </div>
  </div>
);

const MessageDeliveryStatus = ({ status, lightBackground = false }) => {
  if (!status || status === "received") return null;

  if (status === "pending") {
    return (
      <FiClock
        className={`w-3 h-3 shrink-0 ${lightBackground ? "text-gray-400" : "opacity-80"}`}
        aria-label="Sending"
      />
    );
  }

  if (status === "failed") {
    return (
      <span
        className={`text-[10px] font-semibold shrink-0 ${
          lightBackground ? "text-red-500" : "text-red-200"
        }`}
        aria-label="Failed"
      >
        !
      </span>
    );
  }

  const isDouble = status === "delivered" || status === "read";
  const tickColor = lightBackground
    ? status === "read"
      ? "text-sky-500"
      : "text-gray-400"
    : status === "read"
      ? "text-sky-300"
      : "text-green-100";

  return (
    <span
      className={`inline-flex items-center shrink-0 ${tickColor}`}
      aria-label={status}
    >
      <FiCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
      {isDouble && <FiCheck className="w-3.5 h-3.5 -ml-2" strokeWidth={2.5} />}
    </span>
  );
};

const ChatVisualMediaPreview = ({
  type,
  src,
  alt,
  onClick,
  clickable = true,
  showPlayOverlay = false,
}) => {
  const [loadState, setLoadState] = useState("loading");

  const isLoading = loadState === "loading";
  const isError = loadState === "error";
  const isLoaded = loadState === "loaded";

  const markLoaded = useCallback(() => {
    setLoadState("loaded");
  }, []);

  const markError = useCallback(() => {
    setLoadState("error");
  }, []);

  const handleImageRef = useCallback(
    (node) => {
      if (!node) return;
      if (node.complete && node.naturalWidth > 0) {
        markLoaded();
      }
    },
    [src, markLoaded],
  );

  const handleVideoRef = useCallback(
    (node) => {
      if (!node) return;
      if (node.readyState >= 2) {
        markLoaded();
      }
    },
    [src, markLoaded],
  );

  const preview = (
    <div className={MEDIA_PREVIEW_BOX_CLASS}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#cfd4d6] via-[#e9edef] to-[#cfd4d6]" />
          <FiLoader className="relative w-6 h-6 animate-spin text-gray-500" />
        </div>
      )}

      {isError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-3 text-center text-xs text-gray-500">
          Failed to load {type}
        </div>
      )}

      {type === "image" ? (
        <img
          key={src}
          ref={handleImageRef}
          src={src}
          alt={alt}
          className={`block w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          referrerPolicy="no-referrer"
          onLoad={markLoaded}
          onError={markError}
        />
      ) : (
        <>
          <video
            key={src}
            ref={handleVideoRef}
            src={src}
            className={`block w-full h-full object-cover bg-black transition-opacity duration-300 pointer-events-none ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoadedData={markLoaded}
            onError={markError}
          />
          {showPlayOverlay && !isError && (
            <span className="absolute inset-0 z-[1] flex items-center justify-center bg-black/25 pointer-events-none">
              <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                <FiPlay className="w-5 h-5 text-gray-800 ml-0.5" />
              </span>
            </span>
          )}
        </>
      )}
    </div>
  );

  if (!clickable) return preview;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block ${MEDIA_PREVIEW_WIDTH_CLASS} shrink-0 text-left rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-green-400/50`}
    >
      {preview}
    </button>
  );
};

const isPdfPasswordError = (error) => {
  if (!error) return false;
  return (
    error.name === "PasswordException" ||
    error.code === 1 ||
    error.code === 2 ||
    /password/i.test(error.message || "")
  );
};

const ChatPdfPreview = ({
  src,
  name,
  isOutgoing,
  onClick,
  clickable = true,
}) => {
  const [loadState, setLoadState] = useState("loading");
  const [numPages, setNumPages] = useState(null);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);

  const markPasswordProtected = () => {
    setIsPasswordProtected(true);
    setLoadState("password-protected");
  };

  if (isPasswordProtected) {
    return (
      <ChatDocumentFilePreview url={src} name={name} isOutgoing={isOutgoing} />
    );
  }

  const preview = (
    <div className={`relative ${MEDIA_PREVIEW_BOX_CLASS}`}>
      {loadState === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#cfd4d6] via-[#e9edef] to-[#cfd4d6]" />
          <FiLoader className="relative w-6 h-6 animate-spin text-gray-500" />
        </div>
      )}

      {loadState === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-3 text-center">
          <FiFileText className="w-8 h-8 text-red-500" />
          <span className="text-xs text-gray-500">PDF preview unavailable</span>
        </div>
      )}

      <Document
        file={src}
        onLoadSuccess={({ numPages: pages }) => {
          setNumPages(pages);
          setLoadState("loaded");
        }}
        onLoadError={(error) => {
          if (isPdfPasswordError(error)) {
            markPasswordProtected();
            return;
          }
          setLoadState("error");
        }}
        onPassword={(updatePassword) => {
          markPasswordProtected();
          updatePassword(null);
        }}
        loading=""
        className={loadState === "loaded" ? "flex justify-center" : "hidden"}
      >
        <Page
          pageNumber={1}
          height={158}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>

      <div className="absolute bottom-0 left-0 right-0 z-[2] flex items-center gap-2 bg-[#f0f2f5]/95 px-2.5 py-1.5 border-t border-black/5">
        <span className="w-7 h-7 rounded bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
          PDF
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-800 truncate m-0 leading-tight">
            {name || "Document"}
          </p>
          {numPages ? (
            <p className="text-[10px] text-gray-500 m-0 leading-tight">
              {numPages} {numPages === 1 ? "page" : "pages"}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!clickable) return preview;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block ${MEDIA_PREVIEW_WIDTH_CLASS} shrink-0 text-left rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-green-400/50`}
    >
      {preview}
    </button>
  );
};

const ChatDocumentFilePreview = ({ url, name, isOutgoing }) => {
  const extension = getFileExtension(name, url);
  const meta = getDocumentTypeMeta(extension);

  const handleDownload = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const filename = name?.trim() || `document.${extension || "file"}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  return (
    <div className="flex items-center gap-3 min-w-[240px] max-w-[320px] py-1">
      <div
        className={`w-11 h-12 rounded-md flex items-center justify-center shrink-0 ${meta.bg}`}
      >
        <span className={`text-[10px] font-bold uppercase ${meta.color}`}>
          {meta.label}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate m-0 leading-tight ${isOutgoing ? "text-white" : "text-gray-800"}`}
        >
          {name || "Document"}
        </p>
        <p
          className={`text-[11px] m-0 mt-0.5 leading-tight ${isOutgoing ? "text-green-100" : "text-gray-500"}`}
        >
          {extension ? `${extension.toUpperCase()} file` : "Document"}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        className={`p-2 rounded-full shrink-0 transition-colors ${
          isOutgoing
            ? "text-green-100 hover:bg-green-700/50"
            : "text-gray-500 hover:bg-gray-100"
        }`}
        title="Download"
        aria-label="Download document"
      >
        <FiDownload className="w-4 h-4" />
      </button>
    </div>
  );
};

const ChatAudioPreview = ({ src, name, isOutgoing, onOpenModal }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = (event) => {
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        onOpenModal?.();
      });
    }
  };

  const handleSeek = (event) => {
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    audio.currentTime = ratio * duration;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const displayTime = formatAudioDuration(
    playing || currentTime > 0 ? currentTime : duration,
  );

  return (
    <div className="flex items-center gap-2.5 min-w-[240px] max-w-[320px] py-1">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white ${
          isOutgoing
            ? "bg-green-700 hover:bg-green-800"
            : "bg-green-600 hover:bg-green-700"
        }`}
        aria-label={playing ? "Pause audio" : "Play audio"}
      >
        {playing ? (
          <FiPause className="w-4 h-4" />
        ) : (
          <FiPlay className="w-4 h-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={handleSeek}
          className="relative w-full h-1.5 rounded-full overflow-hidden bg-black/10"
          aria-label="Seek audio"
        >
          <span
            className={`absolute inset-y-0 left-0 rounded-full ${
              isOutgoing ? "bg-green-200" : "bg-green-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </button>
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span
            className={`text-[11px] truncate ${
              isOutgoing ? "text-green-100" : "text-gray-600"
            }`}
          >
            {name || "Audio"}
          </span>
          <span
            className={`text-[10px] shrink-0 ${
              isOutgoing ? "text-green-100" : "text-gray-500"
            }`}
          >
            {displayTime}
          </span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) =>
          setDuration(event.currentTarget.duration || 0)
        }
      />
    </div>
  );
};

const ChatLocationPreview = ({ latitude, longitude, name, address }) => {
  const location = { latitude, longitude };
  const mapsLink = getGoogleMapsLink(location);
  const embedUrl = getGoogleMapsEmbedUrl(location);
  const title = name || address || "Shared location";

  const openMaps = () => {
    window.open(mapsLink, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={openMaps}
      className={`block w-full text-left ${MEDIA_PREVIEW_WIDTH_CLASS} shrink-0 rounded-md overflow-hidden bg-white focus:outline-none focus:ring-2 focus:ring-green-400/50`}
    >
      <div className={`relative ${MEDIA_PREVIEW_BOX_CLASS} bg-[#e9edef]`}>
        <iframe
          title={title}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
        />
        <span className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
          <FiMapPin className="w-4 h-4 text-red-500" />
        </span>
      </div>
      <div className="px-2.5 py-2 border-t border-black/5">
        <p className="text-sm font-medium text-gray-800 truncate m-0">
          {name || "Location"}
        </p>
        {address ? (
          <p className="text-xs text-gray-500 m-0 mt-0.5 line-clamp-2">
            {address}
          </p>
        ) : null}
        <p className="text-[11px] text-green-700 m-0 mt-1.5 font-medium">
          View on Google Maps
        </p>
      </div>
    </button>
  );
};

const OneChattingLiveChat = ({
  embedded = false,
  clientNumber: fixedClientNumber = "",
  clientName: fixedClientName = "",
} = {}) => {
  const { number: numberParam } = useParams();
  const navigate = useNavigate();
  const urlNumber =
    !embedded && numberParam ? decodeURIComponent(numberParam) : null;
  const resolvedNumber = embedded
    ? normalizeRecipientNumber(fixedClientNumber)
    : urlNumber;

  const buildContact = useCallback(
    (number, name = "") => {
      if (!number) return null;
      return {
        number,
        ...(name ? { name } : {}),
      };
    },
    [],
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [chats, setChats] = useState([]);
  const [chatListLoading, setChatListLoading] = useState(false);
  const [chatListLoadingMore, setChatListLoadingMore] = useState(false);
  const [chatPagination, setChatPagination] = useState({
    page_no: 1,
    limit: CHAT_LIST_LIMIT,
    total: 0,
    total_pages: 1,
    has_more: false,
  });

  const [selectedContact, setSelectedContact] = useState(() =>
    buildContact(resolvedNumber, fixedClientName),
  );
  const [messages, setMessages] = useState([]);
  const [assigned, setAssigned] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({
    last_id: 0,
    has_more: false,
    total: 0,
  });
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return JSON.parse(
        localStorage.getItem(LIVE_CHAT_FULLSCREEN_KEY) || "false",
      );
    } catch {
      return false;
    }
  });
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [attachModalType, setAttachModalType] = useState(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [developerToken, setDeveloperToken] = useState("");

  const messagesContainerRef = useRef(null);
  const selectedContactRef = useRef(selectedContact);
  const messageInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const chatListContainerRef = useRef(null);
  const savedChatListScrollTop = useRef(0);
  const skipScrollRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const canLoadOlderRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const stickToBottomRef = useRef(false);
  const stickScrollTimerRef = useRef(null);
  const stickBottomEndTimerRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const pendingMarkAsReadRef = useRef(null);

  selectedContactRef.current = selectedContact;

  const isPageVisible = useCallback(
    () =>
      typeof document === "undefined" || document.visibilityState === "visible",
    [],
  );

  const scrollToBottomInstant = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    isProgrammaticScrollRef.current = true;
    container.scrollTop = container.scrollHeight;
    lastScrollTopRef.current = container.scrollTop;
    setShowScrollToBottom(false);
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  }, []);

  const scheduleStickToBottom = useCallback(() => {
    if (!stickToBottomRef.current) return;
    if (stickScrollTimerRef.current) {
      clearTimeout(stickScrollTimerRef.current);
    }
    stickScrollTimerRef.current = setTimeout(() => {
      scrollToBottomInstant();
    }, 80);
  }, [scrollToBottomInstant]);

  const activateStickToBottom = useCallback(() => {
    stickToBottomRef.current = true;
    if (stickBottomEndTimerRef.current) {
      clearTimeout(stickBottomEndTimerRef.current);
    }
    stickBottomEndTimerRef.current = setTimeout(() => {
      stickToBottomRef.current = false;
    }, 1500);
  }, []);

  const clearStickScrollTimers = useCallback(() => {
    if (stickScrollTimerRef.current) {
      clearTimeout(stickScrollTimerRef.current);
      stickScrollTimerRef.current = null;
    }
    if (stickBottomEndTimerRef.current) {
      clearTimeout(stickBottomEndTimerRef.current);
      stickBottomEndTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (embedded) return;
    localStorage.setItem(
      LIVE_CHAT_FULLSCREEN_KEY,
      JSON.stringify(isFullScreen),
    );
  }, [embedded, isFullScreen]);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (embedded) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
      clearStickScrollTimers();
    };
  }, [embedded, clearStickScrollTimers]);

  useEffect(() => {
    if (!embedded) return;
    return () => clearStickScrollTimers();
  }, [embedded, clearStickScrollTimers]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !selectedContact?.number) return undefined;

    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        scheduleStickToBottom();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [selectedContact?.number, scheduleStickToBottom]);

  const storeDeveloperToken = useCallback((response) => {
    const token = extractDeveloperToken(response);
    if (!token) return;
    setDeveloperToken((prev) => (prev === token ? prev : token));
  }, []);

  const fetchChatList = useCallback(
    async (page = 1, append = false, searchTerm = "") => {
      if (append) {
        setChatListLoadingMore(true);
      } else {
        setChatListLoading(true);
      }

      try {
        const params = { page_no: page, limit: CHAT_LIST_LIMIT };
        if (searchTerm.trim()) params.search = searchTerm.trim();

        const res = await whatsappApi.getChatList(params);
        storeDeveloperToken(res);
        const items = Array.isArray(res?.data) ? res.data : [];
        setChats((prev) => (append ? [...prev, ...items] : items));
        setChatPagination({
          page_no: Number(res?.pagination?.page_no || page),
          limit: Number(res?.pagination?.limit || CHAT_LIST_LIMIT),
          total: Number(res?.pagination?.total || 0),
          total_pages: Number(res?.pagination?.total_pages || 1),
          has_more: Boolean(res?.pagination?.has_more),
        });
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error.message ||
            "Failed to load chat list",
        );
        if (!append) setChats([]);
      } finally {
        setChatListLoading(false);
        setChatListLoadingMore(false);
      }
    },
    [storeDeveloperToken],
  );

  const debouncedSearch = useCallback(
    debounce((value) => {
      const term = value.trim();
      setActiveSearch(term);
      fetchChatList(1, false, term);
    }, SEARCH_DEBOUNCE_MS),
    [fetchChatList],
  );

  useEffect(() => {
    if (embedded) return undefined;
    fetchChatList(1, false, "");
    return () => debouncedSearch.cancel();
  }, [embedded, fetchChatList, debouncedSearch]);

  useEffect(() => {
    if (!embedded) return;

    const number = normalizeRecipientNumber(fixedClientNumber);
    if (!number) {
      setSelectedContact(null);
      return;
    }

    setSelectedContact((prev) => ({
      number,
      name: fixedClientName || prev?.name || "",
    }));
  }, [embedded, fixedClientNumber, fixedClientName]);

  const markChatAsRead = useCallback(async (number) => {
    const normalizedNumber = normalizeRecipientNumber(number);
    if (!normalizedNumber) return;

    try {
      const res = await whatsappApi.markAsRead({ number: normalizedNumber });
      if (res?.error) return;

      pendingMarkAsReadRef.current = null;
      setChats((prev) => clearChatUnreadCount(prev, number));
      setMessages((prev) =>
        prev.map((message) =>
          message.type === "in" && !message.is_read
            ? { ...message, is_read: true }
            : message,
        ),
      );
    } catch {
      // Keep unread state if mark-as-read fails
    }
  }, []);

  const scheduleMarkAsReadIfVisible = useCallback(
    (number) => {
      if (!number) return;

      if (!isPageVisible()) {
        pendingMarkAsReadRef.current = number;
        return;
      }

      markChatAsRead(number);
    },
    [isPageVisible, markChatAsRead],
  );

  const handleSocketChat = useCallback(
    (payload) => {
      const activeNumber = selectedContactRef.current?.number;
      setChats((prev) => updateChatListForMessage(prev, payload, activeNumber));

      const number = payload?.contact?.number;
      if (!number || activeNumber !== number || !payload?.message) return;

      setMessages((prev) => upsertMessage(prev, payload.message));
      activateStickToBottom();
      requestAnimationFrame(() => scrollToBottomInstant());

      if (payload.message.type === "in") {
        scheduleMarkAsReadIfVisible(number);
      }
    },
    [activateStickToBottom, scheduleMarkAsReadIfVisible, scrollToBottomInstant],
  );

  const handleSocketMessageStatus = useCallback((payload) => {
    setMessages((prev) => updateMessageStatus(prev, payload));
    setChats((prev) => updateChatListLastMessageStatus(prev, payload));
  }, []);

  const handleSocketChatAssigned = useCallback((payload) => {
    const number =
      payload?.number ||
      payload?.contact?.number ||
      selectedContactRef.current?.number;
    if (!number || selectedContactRef.current?.number !== number) return;

    setAssigned(normalizeSocketAssignment(payload?.assigning));
  }, []);

  const handleSocketCaseStatus = useCallback((payload) => {
    const number = payload?.number;
    if (!number) return;

    setChats((prev) =>
      prev.map((item) =>
        item.contact?.number === number
          ? { ...item, case_open_count: payload.case_open_count }
          : item,
      ),
    );
  }, []);

  const { authenticated: socketAuthenticated, connecting: socketConnecting } =
    useDeveloperSocket(developerToken, {
      onChat: handleSocketChat,
      onMessageStatus: handleSocketMessageStatus,
      onChatAssigned: handleSocketChatAssigned,
      onCaseStatus: handleSocketCaseStatus,
    });

  useEffect(() => {
    if (embedded || !urlNumber) {
      if (!embedded) setSelectedContact(null);
      return;
    }

    const match = chats.find((item) => item.contact?.number === urlNumber);
    setSelectedContact((prev) => {
      if (match) return match.contact;
      if (prev?.number === urlNumber) return prev;
      return { number: urlNumber };
    });
  }, [embedded, urlNumber, chats]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleClearSearch = () => {
    debouncedSearch.cancel();
    setSearchInput("");
    setActiveSearch("");
    fetchChatList(1, false, "");
  };

  const fetchChatHistory = useCallback(
    async (number, lastId = 0, append = false) => {
      if (!number) return;

      if (append) {
        setHistoryLoadingMore(true);
      } else {
        setHistoryLoading(true);
      }

      try {
        const res = await whatsappApi.getChatHistory({
          number,
          last_id: lastId,
          limit: HISTORY_LIMIT,
        });
        storeDeveloperToken(res);

        const pageMessages = Array.isArray(res?.data)
          ? [...res.data].reverse()
          : [];

        setMessages((prev) =>
          append ? [...pageMessages, ...prev] : pageMessages,
        );
        setAssigned(res?.assigned ?? false);
        setHistoryPagination({
          last_id: Number(res?.pagination?.last_id || 0),
          has_more: Boolean(res?.pagination?.has_more),
          total: Number(res?.pagination?.total || 0),
        });

        if (!append) {
          skipScrollRef.current = false;
        }
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error.message ||
            "Failed to load chat history",
        );
        if (!append) {
          setMessages([]);
          setAssigned(false);
        }
      } finally {
        setHistoryLoading(false);
        setHistoryLoadingMore(false);
      }
    },
    [storeDeveloperToken],
  );

  useEffect(() => {
    setMessageDraft("");
    setReplyToMessage(null);
    setAttachMenuOpen(false);
    setAttachModalType(null);
    setTemplateModalOpen(false);
    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
    }
  }, [selectedContact?.number]);

  useEffect(() => {
    if (!attachMenuOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target)
      ) {
        setAttachMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [attachMenuOpen]);

  useEffect(() => {
    if (!selectedContact?.number) return;
    setMessages([]);
    activateStickToBottom();
    canLoadOlderRef.current = false;
    lastScrollTopRef.current = 0;
    skipScrollRef.current = false;
    loadingOlderRef.current = false;
    setHistoryPagination({ last_id: 0, has_more: false, total: 0 });
    fetchChatHistory(selectedContact.number, 0, false);
  }, [selectedContact?.number, fetchChatHistory, activateStickToBottom]);

  useEffect(() => {
    if (!selectedContact?.number || historyLoading) return;

    if (embedded) {
      scheduleMarkAsReadIfVisible(selectedContact.number);
      return;
    }

    const chat = chats.find(
      (item) => item.contact?.number === selectedContact.number,
    );
    if (Number(chat?.unread_count) > 0) {
      scheduleMarkAsReadIfVisible(selectedContact.number);
    }
  }, [
    embedded,
    selectedContact?.number,
    historyLoading,
    chats,
    scheduleMarkAsReadIfVisible,
  ]);

  useEffect(() => {
    const handlePageVisible = () => {
      if (!isPageVisible()) return;

      const number =
        pendingMarkAsReadRef.current || selectedContactRef.current?.number;
      if (!number) return;

      pendingMarkAsReadRef.current = null;
      scheduleMarkAsReadIfVisible(number);
    };

    document.addEventListener("visibilitychange", handlePageVisible);
    window.addEventListener("focus", handlePageVisible);

    return () => {
      document.removeEventListener("visibilitychange", handlePageVisible);
      window.removeEventListener("focus", handlePageVisible);
    };
  }, [isPageVisible, scheduleMarkAsReadIfVisible]);

  useEffect(() => {
    if (
      !selectedContact?.number ||
      historyLoading ||
      !isChatAssignedToMe(assigned)
    ) {
      return;
    }

    const focusTimer = requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(focusTimer);
  }, [assigned, historyLoading, selectedContact?.number]);

  useLayoutEffect(() => {
    const chatListEl = chatListContainerRef.current;
    if (chatListEl) {
      chatListEl.scrollTop = savedChatListScrollTop.current;
    }
  }, [selectedContact?.number, historyLoading]);

  useLayoutEffect(() => {
    if (skipScrollRef.current || historyLoading || messages.length === 0)
      return;
    if (!stickToBottomRef.current) return;

    scrollToBottomInstant();
    canLoadOlderRef.current = false;
    const enableOlderTimer = setTimeout(() => {
      canLoadOlderRef.current = true;
    }, 400);

    return () => clearTimeout(enableOlderTimer);
  }, [
    historyLoading,
    messages.length,
    selectedContact?.number,
    scrollToBottomInstant,
  ]);

  const handleSelectChat = (item) => {
    if (embedded) return;
    if (chatListContainerRef.current) {
      savedChatListScrollTop.current = chatListContainerRef.current.scrollTop;
    }
    skipScrollRef.current = false;
    loadingOlderRef.current = false;
    activateStickToBottom();
    canLoadOlderRef.current = false;
    lastScrollTopRef.current = 0;
    setSelectedContact(item.contact);
    navigate(`${LIVE_CHAT_PATH}/${encodeURIComponent(item.contact.number)}`);
  };

  const handleCloseChat = () => {
    if (embedded) return;
    setSelectedContact(null);
    navigate(LIVE_CHAT_PATH);
  };

  const handleLoadMoreChats = () => {
    if (!chatPagination.has_more || chatListLoadingMore || chatListLoading)
      return;
    fetchChatList(chatPagination.page_no + 1, true, activeSearch);
  };

  const handleRefreshChatList = () => {
    if (chatListContainerRef.current) {
      chatListContainerRef.current.scrollTop = 0;
    }
    savedChatListScrollTop.current = 0;
    fetchChatList(1, false, activeSearch);
  };

  const handleRefreshConversation = () => {
    if (!selectedContact?.number || historyLoading) return;
    activateStickToBottom();
    canLoadOlderRef.current = false;
    lastScrollTopRef.current = 0;
    setMessages([]);
    setHistoryPagination({ last_id: 0, has_more: false, total: 0 });
    fetchChatHistory(selectedContact.number, 0, false);
  };

  const handleToggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  const handleChatListScroll = (e) => {
    const container = e.currentTarget;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 80) {
      handleLoadMoreChats();
    }
  };

  const handleLoadOlderMessages = () => {
    if (
      !canLoadOlderRef.current ||
      !historyPagination.has_more ||
      historyLoadingMore ||
      loadingOlderRef.current ||
      !selectedContact?.number
    ) {
      return;
    }
    loadingOlderRef.current = true;
    skipScrollRef.current = true;
    const container = messagesContainerRef.current;
    const previousHeight = container?.scrollHeight || 0;

    fetchChatHistory(
      selectedContact.number,
      historyPagination.last_id,
      true,
    ).then(() => {
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - previousHeight;
        }
        loadingOlderRef.current = false;
        skipScrollRef.current = false;
      });
    });
  };

  const handleMessagesScroll = (e) => {
    if (isProgrammaticScrollRef.current) return;

    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom > SCROLL_TO_BOTTOM_THRESHOLD) {
      stickToBottomRef.current = false;
    }

    const shouldShowScrollButton =
      distanceFromBottom > SCROLL_TO_BOTTOM_THRESHOLD &&
      scrollHeight > clientHeight + 1;
    setShowScrollToBottom((prev) =>
      prev === shouldShowScrollButton ? prev : shouldShowScrollButton,
    );

    if (!canLoadOlderRef.current || historyLoading || historyLoadingMore) {
      return;
    }

    const isScrollingUp = scrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;

    const isScrollable = scrollHeight > clientHeight + 1;
    if (isScrollingUp && isScrollable && scrollTop < 80) {
      handleLoadOlderMessages();
    }
  };

  const handleScrollToEnd = () => {
    activateStickToBottom();
    scrollToBottomInstant();
    setShowScrollToBottom(false);
  };

  const handleMessageDraftChange = (e) => {
    setMessageDraft(e.target.value.slice(0, MESSAGE_DRAFT_MAX_LENGTH));
    const input = e.target;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  };

  const appendSentMessage = useCallback(
    (sentMessage) => {
      if (!sentMessage) return;
      setMessages((prev) => upsertMessage(prev, sentMessage));
      activateStickToBottom();
    },
    [activateStickToBottom],
  );

  const handleSendSuccess = useCallback(
    (sentMessage) => {
      appendSentMessage(sentMessage);
      setReplyToMessage(null);
      requestAnimationFrame(() => scrollToBottomInstant());
    },
    [appendSentMessage, scrollToBottomInstant],
  );

  const sendWithHandler = useCallback(
    async (handler, payload) => {
      if (
        !selectedContact?.number ||
        sendingMessage ||
        !isChatAssignedToMe(assigned)
      ) {
        return false;
      }

      setSendingMessage(true);
      try {
        const response = await handler({
          number: normalizeRecipientNumber(selectedContact.number),
          ...buildReplyPayload(replyToMessage),
          ...payload,
        });
        handleSendSuccess(enrichSentMessage(response, replyToMessage));
        return true;
      } catch (error) {
        toast.error(extractApiError(error, "Failed to send message"));
        return false;
      } finally {
        setSendingMessage(false);
      }
    },
    [
      assigned,
      handleSendSuccess,
      replyToMessage,
      selectedContact?.number,
      sendingMessage,
    ],
  );

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = messageDraft.trim();
    if (!text || !selectedContact?.number || sendingMessage) return;

    const sent = await sendWithHandler(whatsappApi.sendTextMessage, {
      message: text,
    });

    if (!sent) return;

    setMessageDraft("");
    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
    }
  };

  const handleSendAttachMessage = async (payload) => {
    const sendHandlers = {
      image: whatsappApi.sendImageMessage,
      video: whatsappApi.sendVideoMessage,
      document: whatsappApi.sendDocumentMessage,
      audio: whatsappApi.sendAudioMessage,
    };
    const handler = sendHandlers[attachModalType];
    if (!handler) return;

    const sent = await sendWithHandler(handler, payload);
    if (sent) {
      setAttachModalType(null);
      setAttachMenuOpen(false);
    }
  };

  const handleSendTemplateMessage = async (payload) => {
    const sent = await sendWithHandler(
      whatsappApi.sendTemplateMessage,
      payload,
    );
    if (sent) {
      setTemplateModalOpen(false);
      setAttachMenuOpen(false);
    }
  };

  const handleMessageKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReplyToMessage = (message) => {
    if (!isChatAssignedToMe(assigned)) return;
    setReplyToMessage(message);
    messageInputRef.current?.focus();
  };

  const handleClearReply = () => {
    setReplyToMessage(null);
  };

  const handleOpenAttachOption = (type) => {
    if (!isChatAssignedToMe(assigned)) return;
    setAttachMenuOpen(false);
    if (type === "template") {
      setTemplateModalOpen(true);
      return;
    }
    setAttachModalType(type);
  };

  const canSendToChat = isChatAssignedToMe(assigned);
  const sendBlockedMessage = getSendBlockedMessage(assigned);

  const canSendMessage = Boolean(
    canSendToChat &&
    messageDraft.trim() &&
    selectedContact?.number &&
    !sendingMessage,
  );

  const replyPreviewText = replyToMessage
    ? getMessageContentLabel(replyToMessage)
    : "";

  const openMediaPreview = (message) => {
    const previewType = getMediaPreviewType(
      message.message_type,
      message.media_url,
      message.media_name,
    );
    if (!previewType) return;
    setMediaPreview({
      url: message.media_url,
      type: previewType,
      name: message.media_name || message.message_type,
    });
  };

  const renderMediaAttachment = (
    message,
    isOutgoing,
    { mediaOnly, timestamp },
  ) => {
    const {
      message_type: messageType,
      media_url: mediaUrl,
      media_name: mediaName,
    } = message;

    const mediaTimestampOverlay =
      mediaOnly && timestamp ? (
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 bg-black/50 text-white text-[11px] leading-none shadow-sm">
          {timestamp}
        </div>
      ) : null;

    if (messageType === "location") {
      const location = getLocationFromMessage(message);
      if (!location) return null;

      return (
        <div className={`relative ${MEDIA_PREVIEW_WIDTH_CLASS} shrink-0`}>
          <ChatLocationPreview
            latitude={location.latitude}
            longitude={location.longitude}
            name={location.name}
            address={location.address}
          />
          {mediaTimestampOverlay}
        </div>
      );
    }

    if (!mediaUrl) return null;

    const previewable = canPreviewMedia(messageType, mediaUrl, mediaName);

    if (messageType === "image") {
      return (
        <div className={`relative ${MEDIA_PREVIEW_WIDTH_CLASS} shrink-0`}>
          <ChatVisualMediaPreview
            key={mediaUrl}
            type="image"
            src={mediaUrl}
            alt={mediaName || "Image"}
            onClick={() => openMediaPreview(message)}
          />
          {mediaTimestampOverlay}
        </div>
      );
    }

    if (messageType === "video") {
      return (
        <div className={`relative ${MEDIA_PREVIEW_WIDTH_CLASS} shrink-0`}>
          <ChatVisualMediaPreview
            key={mediaUrl}
            type="video"
            src={mediaUrl}
            alt={mediaName || "Video"}
            onClick={() => previewable && openMediaPreview(message)}
            clickable={previewable}
            showPlayOverlay={previewable}
          />
          {mediaTimestampOverlay}
        </div>
      );
    }

    if (messageType === "audio") {
      return (
        <ChatAudioPreview
          src={mediaUrl}
          name={mediaName}
          isOutgoing={isOutgoing}
          onOpenModal={() => previewable && openMediaPreview(message)}
        />
      );
    }

    if (messageType === "document") {
      if (isPdfMedia(mediaUrl, mediaName)) {
        return (
          <div className={`relative ${MEDIA_PREVIEW_WIDTH_CLASS} shrink-0`}>
            <ChatPdfPreview
              src={mediaUrl}
              name={mediaName}
              isOutgoing={isOutgoing}
              onClick={() => openMediaPreview(message)}
            />
            {mediaTimestampOverlay}
          </div>
        );
      }

      return (
        <ChatDocumentFilePreview
          url={mediaUrl}
          name={mediaName}
          isOutgoing={isOutgoing}
        />
      );
    }

    return null;
  };

  const renderMessageBubble = (message) => {
    const isOutgoing = message.type === "out";
    const mediaCaption = getMessageCaption(message);
    const hasMediaCaption = Boolean(mediaCaption);
    const templateContent = isTemplateMessage(message)
      ? resolveTemplateMessage(message)
      : null;
    const hasTemplateCard = Boolean(templateContent);
    const isPdfDocument =
      message.message_type === "document" &&
      Boolean(message.media_url) &&
      isPdfMedia(message.media_url, message.media_name);
    const locationData = getLocationFromMessage(message);
    const hasLocationMap = Boolean(locationData);
    const usesWhiteCard = hasLocationMap || hasTemplateCard;
    const isVisualMedia =
      (["image", "video"].includes(message.message_type) &&
        Boolean(message.media_url)) ||
      isPdfDocument ||
      hasLocationMap;
    const hasAudioMedia =
      message.message_type === "audio" && Boolean(message.media_url);
    const hasFileDocument =
      message.message_type === "document" &&
      Boolean(message.media_url) &&
      !isPdfDocument;
    const hasRichMedia = isVisualMedia || hasAudioMedia || hasFileDocument;
    const isMediaOnly = isVisualMedia && !hasMediaCaption && !message.is_reply;
    const showVisualCaption = isVisualMedia && hasMediaCaption;
    const showAttachedCaption =
      hasMediaCaption &&
      !showVisualCaption &&
      (hasAudioMedia || hasFileDocument);
    const fallbackLabel = getMessageContentLabel(message);
    const showTextContent =
      !hasTemplateCard &&
      !hasLocationMap &&
      !showVisualCaption &&
      !isVisualMedia &&
      !hasAudioMedia &&
      !hasFileDocument &&
      Boolean(
        message.message_type === "text"
          ? fallbackLabel
          : hasMediaCaption
            ? mediaCaption
            : ![
                "image",
                "video",
                "audio",
                "document",
                "location",
                "template",
              ].includes(message.message_type) && fallbackLabel,
      );

    const timestampNode = (
      <>
        <span>{formatChatDate(message.create_date)}</span>
        {isOutgoing && (
          <MessageDeliveryStatus
            status={message.status}
            lightBackground={usesWhiteCard}
          />
        )}
      </>
    );

    const timestampRowClass = `flex items-center justify-end gap-1 text-[10px] ${
      usesWhiteCard ? "text-gray-500" : isOutgoing ? "text-green-100" : "text-gray-400"
    }`;

    return (
      <div
        key={`${message.id}-${message.wamid}`}
        className={`group flex items-end gap-1 ${
          isOutgoing ? "justify-end" : "justify-start"
        }`}
      >
        <button
          type="button"
          onClick={() => handleReplyToMessage(message)}
          className={`p-1.5 rounded-full text-gray-500 bg-white/90 border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
            isOutgoing ? "order-2" : "order-1"
          }`}
          title="Reply"
          aria-label="Reply to message"
        >
          <FiCornerUpLeft className="w-3.5 h-3.5" />
        </button>

        <div
          className={`rounded-lg shadow-sm ${
            isOutgoing ? "order-1" : "order-2"
          } ${
            usesWhiteCard
              ? `${MEDIA_PREVIEW_WIDTH_CLASS} shrink-0 p-1 bg-white text-gray-800 border border-gray-200 ${
                  isOutgoing ? "rounded-br-sm" : "rounded-bl-sm"
                }`
              : isVisualMedia
                ? `${MEDIA_PREVIEW_WIDTH_CLASS} shrink-0 p-1`
                : hasAudioMedia || hasFileDocument
                  ? `w-fit min-w-0 max-w-[320px] px-2.5 py-2`
                  : `w-fit min-w-0 ${BUBBLE_MAX_WIDTH_CLASS} px-3 py-2`
          } ${
            usesWhiteCard
              ? ""
              : isOutgoing
                ? "bg-green-600 text-white rounded-br-sm"
                : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
          }`}
        >
          {message.is_reply && message.reply_to_message && (
            <div
              className={`mb-1.5 mx-0.5 px-2 py-1 rounded-md text-xs border-l-2 ${
                isOutgoing
                  ? "bg-green-700/40 border-green-200 text-green-50"
                  : "bg-gray-50 border-green-500 text-gray-600"
              }`}
            >
              <WhatsAppFormattedText
                text={getMessageContentLabel(message.reply_to_message)}
                className="text-xs"
                linkClassName={
                  isOutgoing
                    ? "text-green-50 hover:text-white"
                    : "text-blue-600 hover:text-blue-800"
                }
              />
            </div>
          )}

          {hasTemplateCard ? (
            <>
              <OneChattingTemplatePreview
                content={templateContent}
                className="max-w-full"
                onOpenHeaderMedia={(url, type) =>
                  setMediaPreview({ url, type, name: templateContent.templateName })
                }
              />
              <div className={`${timestampRowClass} px-2 pb-1 pt-1`}>
                {timestampNode}
              </div>
            </>
          ) : hasRichMedia ? (
            <>
              {renderMediaAttachment(message, isOutgoing, {
                mediaOnly: isMediaOnly,
                timestamp: timestampNode,
              })}

              {showVisualCaption && (
                <WhatsAppFormattedText
                  text={mediaCaption}
                  className="text-sm px-2 pt-1.5 pb-0.5 block"
                  linkClassName={
                    isOutgoing
                      ? "text-green-50 hover:text-white"
                      : "text-blue-600 hover:text-blue-800"
                  }
                />
              )}

              {showAttachedCaption && (
                <WhatsAppFormattedText
                  text={mediaCaption}
                  className="text-sm px-0.5 pt-1.5 pb-0.5 block"
                  linkClassName={
                    isOutgoing
                      ? "text-green-50 hover:text-white"
                      : "text-blue-600 hover:text-blue-800"
                  }
                />
              )}

              {!isMediaOnly && (
                <div className={`${timestampRowClass} px-2 pb-1`}>
                  {timestampNode}
                </div>
              )}
            </>
          ) : message.message_type === "location" ? (
            <div className="text-sm max-w-[280px]">
              <p className="font-medium m-0">{message.name || "Location"}</p>
              {message.address ? (
                <p className="opacity-90 m-0 mt-0.5">{message.address}</p>
              ) : null}
            </div>
          ) : null}

          {showTextContent && (
            <WhatsAppFormattedText
              text={
                message.message_type === "text" ? fallbackLabel : mediaCaption
              }
              className="text-sm"
              linkClassName={
                isOutgoing
                  ? "text-green-50 hover:text-white"
                  : "text-blue-600 hover:text-blue-800"
              }
            />
          )}

          {!hasRichMedia && !hasTemplateCard && (
            <div className={`${timestampRowClass} mt-1`}>{timestampNode}</div>
          )}

          {message.status === "failed" && message.failed_reason && (
            <p
              className={`text-xs mt-1 m-0 px-2 ${isOutgoing ? "text-red-200" : "text-red-500"}`}
            >
              {message.failed_reason}
            </p>
          )}
        </div>
      </div>
    );
  };

  const showChatPanel = Boolean(selectedContact);
  const showSocketStatus = Boolean(developerToken);
  const assigneeLabel = getAssigneeLabel(assigned);

  return (
    <div
      className={
        embedded
          ? "h-[600px] overflow-hidden bg-gray-100"
          : `${isFullScreen ? "fixed inset-0 z-[100]" : "h-screen"} overflow-hidden bg-gray-100`
      }
    >
      {!embedded && !isFullScreen && (
        <Header
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMinimized={isMinimized}
          setIsMinimized={setIsMinimized}
        />
      )}
      {!embedded && !isFullScreen && (
        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMinimized={isMinimized}
          setIsMinimized={setIsMinimized}
        />
      )}

      <div
        className={
          embedded
            ? "h-full overflow-hidden"
            : `fixed inset-0 overflow-hidden transition-all duration-300 ${
                isFullScreen ? "top-0" : "top-16"
              } ${isFullScreen ? "left-0" : isMinimized ? "md:pl-20" : "md:pl-[260px]"}`
        }
      >
        <div className={`h-full ${embedded ? "" : isFullScreen ? "p-0" : "p-2 sm:p-3 md:p-4"}`}>
          <div
            className={`h-full bg-white overflow-hidden flex ${
              embedded ? "" : "border border-gray-200 shadow-sm"
            } ${embedded || isFullScreen ? "rounded-none" : "rounded-xl"}`}
          >
            {!embedded && (
            <div
              className={`${
                showChatPanel ? "hidden md:flex" : "flex"
              } w-full md:w-[360px] lg:w-[400px] flex-col border-r border-gray-200 bg-white shrink-0 min-h-0`}
            >
              <div className="shrink-0 px-3 py-2 border-b border-gray-200 bg-green-600 text-white flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold leading-none">
                      Live Chats
                    </h1>
                    {showSocketStatus ? (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          socketAuthenticated
                            ? "bg-green-200 animate-pulse"
                            : socketConnecting
                              ? "bg-amber-200"
                              : "bg-red-200"
                        }`}
                        title={
                          socketAuthenticated
                            ? "Live updates connected"
                            : socketConnecting
                              ? "Connecting to live updates..."
                              : "Live updates disconnected"
                        }
                      />
                    ) : null}
                  </div>
                  <p className="text-[10px] text-green-100 leading-none mt-0.5 truncate">
                    OneChatting WhatsApp conversations
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleRefreshChatList}
                    disabled={chatListLoading}
                    className="p-1.5 rounded-lg text-green-50 hover:bg-green-700/60 transition-colors disabled:opacity-50"
                    title="Refresh chat list"
                  >
                    <FiRefreshCw
                      className={`w-4 h-4 ${chatListLoading ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleFullScreen}
                    className="p-1.5 rounded-lg text-green-50 hover:bg-green-700/60 transition-colors"
                    title={isFullScreen ? "Exit full screen" : "Full screen"}
                  >
                    {isFullScreen ? (
                      <FiMinimize2 className="w-4 h-4" />
                    ) : (
                      <FiMaximize2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="shrink-0 p-3 border-b border-gray-100 bg-white">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={handleSearchChange}
                    placeholder="Search by name or number..."
                    className={`w-full pl-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${
                      searchInput ? "pr-9" : "pr-3"
                    }`}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      aria-label="Clear search"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div
                ref={chatListContainerRef}
                onScroll={handleChatListScroll}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain [overflow-anchor:none]"
              >
                {chatListLoading ? (
                  <ChatListSkeleton />
                ) : chats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500 px-4 text-center">
                    <FiMessageCircle className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-sm font-medium text-gray-600">
                      No chats found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activeSearch
                        ? "Try a different search term"
                        : "Your conversations will appear here"}
                    </p>
                  </div>
                ) : (
                  <>
                    {chats.map((item) => {
                      const contact = item.contact;
                      const isActive =
                        selectedContact?.number === contact?.number;
                      const hasSavedName = Boolean(contact?.name?.trim());
                      const displayName = hasSavedName
                        ? contact.name
                        : contact.number;
                      const preview = getMessagePreview(item.last_message);
                      const previewText =
                        item.last_message?.status === "failed"
                          ? `Failed · ${preview}`
                          : preview;

                      return (
                        <button
                          key={contact.number}
                          type="button"
                          onClick={() => handleSelectChat(item)}
                          className={`w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            isActive ? "bg-green-50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                              <FiUser className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <span className="flex items-center gap-1 min-w-0">
                                    {contact.is_favorite && (
                                      <FiStar className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500" />
                                    )}
                                    <span className="font-normal text-[15px] text-gray-900 truncate leading-5">
                                      {displayName}
                                    </span>
                                  </span>
                                  {hasSavedName && (
                                    <span className="block text-[11px] text-gray-500 truncate leading-[15px] mt-0.5">
                                      {contact.number}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col items-end shrink-0 self-start">
                                  <span className="text-[11px] text-gray-500 leading-[14px] whitespace-nowrap">
                                    {formatChatDate(
                                      item.last_message?.create_date,
                                    )}
                                  </span>
                                  {item.unread_count > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 mt-0.5 rounded-full bg-green-600 text-white text-[11px] font-medium leading-none">
                                      {item.unread_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="block text-[13px] text-gray-500 truncate leading-[18px] mt-1">
                                {previewText}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {chatListLoadingMore && (
                      <div className="flex justify-center py-3">
                        <FiLoader className="w-4 h-4 animate-spin text-green-600" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            )}

            <div
              className={`${
                embedded || showChatPanel ? "flex" : "hidden md:flex"
              } flex-1 flex-col bg-[#e5ddd5] min-w-0 min-h-0`}
            >
              {!selectedContact ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                    <FiMessageCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-700">
                    OneChatting Live Chat
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm">
                    Select a conversation from the list to view message history
                  </p>
                </div>
              ) : (
                <>
                  <div className="shrink-0 px-3 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
                    {!embedded ? (
                      <button
                        type="button"
                        onClick={handleCloseChat}
                        className="md:hidden p-1.5 rounded-lg hover:bg-gray-200 text-gray-600"
                      >
                        <FiArrowLeft className="w-4 h-4" />
                      </button>
                    ) : null}
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
                      <FiUser className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate leading-tight m-0">
                          {getDisplayName(selectedContact)}
                        </p>
                        {embedded && showSocketStatus ? (
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              socketAuthenticated
                                ? "bg-green-500 animate-pulse"
                                : socketConnecting
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                            }`}
                            title={
                              socketAuthenticated
                                ? "Live updates connected"
                                : socketConnecting
                                  ? "Connecting to live updates..."
                                  : "Live updates disconnected"
                            }
                          />
                        ) : null}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate leading-tight m-0">
                        {selectedContact.number}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 shrink-0 max-w-[120px] truncate">
                      {assigneeLabel}
                    </span>
                    <button
                      type="button"
                      onClick={handleRefreshConversation}
                      disabled={historyLoading}
                      className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 shrink-0"
                      title="Refresh conversation"
                    >
                      <FiRefreshCw
                        className={`w-4 h-4 ${historyLoading ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="relative flex-1 min-h-0 overflow-hidden">
                      {historyLoading && (
                        <div className="absolute inset-0 z-10 overflow-hidden bg-[#e5ddd5]">
                          <ConversationSkeleton />
                        </div>
                      )}

                      <div
                        ref={messagesContainerRef}
                        onScroll={handleMessagesScroll}
                        className="absolute inset-0 overflow-y-auto overscroll-contain p-4 space-y-3"
                      >
                        {historyLoadingMore && (
                          <div className="flex justify-center py-2">
                            <FiLoader className="w-5 h-5 animate-spin text-gray-500" />
                          </div>
                        )}

                        {!historyLoading && messages.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <p className="text-sm">No messages yet</p>
                          </div>
                        )}

                        {!historyLoading &&
                          messages.map((message) =>
                            renderMessageBubble(message),
                          )}
                      </div>

                      {showScrollToBottom && !historyLoading && (
                        <button
                          type="button"
                          onClick={handleScrollToEnd}
                          className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-white text-gray-600 shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                          title="Scroll to latest messages"
                          aria-label="Scroll to latest messages"
                        >
                          <FiChevronDown className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {!historyLoading && !canSendToChat ? (
                      <div className="relative z-20 shrink-0 px-4 py-3 bg-[#f0f2f5] border-t border-gray-200 text-center">
                        <p className="text-sm text-gray-500 m-0">
                          {sendBlockedMessage}
                        </p>
                      </div>
                    ) : !historyLoading ? (
                      <form
                        onSubmit={handleSendMessage}
                        className="relative z-20 shrink-0 px-3 py-2.5 bg-[#f0f2f5] border-t border-gray-200"
                      >
                        {replyToMessage ? (
                          <div className="mb-2 flex items-start gap-2 rounded-xl bg-white border border-green-200 px-3 py-2 shadow-sm">
                            <div className="w-1 self-stretch rounded-full bg-green-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-green-700 m-0">
                                Replying to
                              </p>
                              <p className="text-xs text-gray-600 truncate m-0 mt-0.5">
                                {replyPreviewText}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleClearReply}
                              className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
                              aria-label="Cancel reply"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : null}

                        <div className="flex items-center gap-2">
                          <div
                            className="relative shrink-0"
                            ref={attachMenuRef}
                          >
                            <button
                              type="button"
                              onClick={() => setAttachMenuOpen((prev) => !prev)}
                              disabled={sendingMessage || !canSendToChat}
                              className="p-2 rounded-full text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                              title="Attach"
                              aria-label="Attach"
                            >
                              <FiPaperclip className="w-5 h-5" />
                            </button>

                            {attachMenuOpen ? (
                              <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl bg-white border border-gray-200 shadow-lg py-1 z-30">
                                {[
                                  {
                                    type: "template",
                                    label: "Template",
                                    icon: FiLayout,
                                  },
                                  {
                                    type: "image",
                                    label: "Image",
                                    icon: FiImage,
                                  },
                                  {
                                    type: "video",
                                    label: "Video",
                                    icon: FiVideo,
                                  },
                                  {
                                    type: "document",
                                    label: "Document",
                                    icon: FiFile,
                                  },
                                  {
                                    type: "audio",
                                    label: "Audio",
                                    icon: FiMic,
                                  },
                                ].map(({ type, label, icon: Icon }) => (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleOpenAttachOption(type)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Icon className="w-4 h-4 text-gray-500" />
                                    {label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex-1 min-w-0 flex items-center min-h-[40px] bg-white rounded-2xl border border-gray-200 shadow-sm px-3 py-1.5">
                            <textarea
                              ref={messageInputRef}
                              value={messageDraft}
                              onChange={handleMessageDraftChange}
                              onKeyDown={handleMessageKeyDown}
                              rows={1}
                              placeholder="Type a message"
                              disabled={sendingMessage || !canSendToChat}
                              className="w-full resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none leading-5 py-0.5 max-h-[120px] disabled:opacity-60 block"
                              aria-label="Message"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={!canSendMessage}
                            className={`p-2.5 rounded-full shrink-0 transition-colors ${
                              canSendMessage
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                            title="Send message"
                            aria-label="Send message"
                          >
                            {sendingMessage ? (
                              <FiLoader className="w-5 h-5 animate-spin" />
                            ) : (
                              <FiSend className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <OneChattingMediaModal
        media={mediaPreview}
        onClose={() => setMediaPreview(null)}
      />

      <OneChattingAttachModal
        type={attachModalType}
        isOpen={Boolean(attachModalType)}
        onClose={() => setAttachModalType(null)}
        onSend={handleSendAttachMessage}
        sending={sendingMessage}
        replyPreview={replyPreviewText}
      />

      <OneChattingTemplateModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSend={handleSendTemplateMessage}
        sending={sendingMessage}
        replyPreview={replyPreviewText}
      />
    </div>
  );
};

export default OneChattingLiveChat;
