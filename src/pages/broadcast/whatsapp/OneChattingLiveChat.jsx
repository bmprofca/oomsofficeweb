import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import debounce from "lodash.debounce";
import { toast } from "react-hot-toast";
import {
  FiArrowLeft,
  FiCheck,
  FiClock,
  FiFileText,
  FiLoader,
  FiMaximize2,
  FiMessageCircle,
  FiMinimize2,
  FiMusic,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiStar,
  FiUser,
  FiX,
} from "react-icons/fi";
import { Header, Sidebar } from "../../../components/header";
import OneChattingMediaModal from "./OneChattingMediaModal";
import { whatsappApi } from "./whatsappApi";
import {
  canPreviewMedia,
  formatChatDate,
  getAssigneeLabel,
  getDisplayName,
  getMediaPreviewType,
  getMessageCaption,
  getMessageContentLabel,
  getMessagePreview,
  WhatsAppFormattedText,
} from "./oneChattingChatUtils";
const CHAT_LIST_LIMIT = 20;
const HISTORY_LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 500;
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
  <div className="p-4 space-y-4 animate-pulse h-full">
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

const MessageDeliveryStatus = ({ status }) => {
  if (!status || status === "received") return null;

  if (status === "pending") {
    return (
      <FiClock className="w-3 h-3 shrink-0 opacity-80" aria-label="Sending" />
    );
  }

  if (status === "failed") {
    return (
      <span
        className="text-[10px] font-semibold text-red-200 shrink-0"
        aria-label="Failed"
      >
        !
      </span>
    );
  }

  const isDouble = status === "delivered" || status === "read";
  const tickColor = status === "read" ? "text-sky-300" : "text-green-100";

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

const OneChattingLiveChat = () => {
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

  const [selectedContact, setSelectedContact] = useState(null);
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
  const [isFullScreen, setIsFullScreen] = useState(false);

  const messagesContainerRef = useRef(null);
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

  const scrollToBottomInstant = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    isProgrammaticScrollRef.current = true;
    container.scrollTop = container.scrollHeight;
    lastScrollTopRef.current = container.scrollTop;
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
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
      clearStickScrollTimers();
    };
  }, [clearStickScrollTimers]);

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
    [],
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
    fetchChatList(1, false, "");
    return () => debouncedSearch.cancel();
  }, [fetchChatList, debouncedSearch]);

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
    [],
  );

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

  useLayoutEffect(() => {
    const chatListEl = chatListContainerRef.current;
    if (chatListEl) {
      chatListEl.scrollTop = savedChatListScrollTop.current;
    }
  }, [selectedContact?.number, historyLoading]);

  useLayoutEffect(() => {
    if (skipScrollRef.current || historyLoading || messages.length === 0) return;
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
    if (chatListContainerRef.current) {
      savedChatListScrollTop.current = chatListContainerRef.current.scrollTop;
    }
    skipScrollRef.current = false;
    loadingOlderRef.current = false;
    activateStickToBottom();
    canLoadOlderRef.current = false;
    lastScrollTopRef.current = 0;
    setSelectedContact(item.contact);
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
    const distanceFromBottom =
      scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom > 120) {
      stickToBottomRef.current = false;
    }

    if (
      !canLoadOlderRef.current ||
      historyLoading ||
      historyLoadingMore
    ) {
      return;
    }

    const isScrollingUp = scrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;

    const isScrollable = scrollHeight > clientHeight + 1;
    if (isScrollingUp && isScrollable && scrollTop < 80) {
      handleLoadOlderMessages();
    }
  };

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

  const renderMediaAttachment = (message, isOutgoing, { mediaOnly, timestamp }) => {
    const {
      message_type: messageType,
      media_url: mediaUrl,
      media_name: mediaName,
    } = message;
    if (!mediaUrl) return null;

    const previewable = canPreviewMedia(messageType, mediaUrl, mediaName);
    const labelClass = isOutgoing
      ? "text-green-100 hover:text-white"
      : "text-blue-600 hover:text-blue-700";
    const mediaTimestampOverlay =
      mediaOnly && timestamp ? (
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 bg-black/50 text-white text-[11px] leading-none shadow-sm">
          {timestamp}
        </div>
      ) : null;

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
        <button
          type="button"
          onClick={() => previewable && openMediaPreview(message)}
          className={`flex items-center gap-2 text-sm max-w-[280px] ${mediaOnly ? "" : "mb-1"} ${labelClass}`}
        >
          <FiMusic className="w-4 h-4 shrink-0" />
          <span className="truncate">{mediaName || "Audio message"}</span>
        </button>
      );
    }

    if (messageType === "document") {
      if (previewable) {
        return (
          <button
            type="button"
            onClick={() => openMediaPreview(message)}
            className={`flex items-center gap-2 text-sm max-w-[280px] ${mediaOnly ? "" : "mb-1"} ${labelClass}`}
          >
            <FiFileText className="w-4 h-4 shrink-0" />
            <span className="truncate underline">
              {mediaName || "PDF document"}
            </span>
          </button>
        );
      }
      return (
        <a
          href={mediaUrl}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2 underline text-sm max-w-[280px] ${mediaOnly ? "" : "mb-1"} ${labelClass}`}
        >
          <FiFileText className="w-4 h-4 shrink-0" />
          <span className="truncate">{mediaName || "Document"}</span>
        </a>
      );
    }

    return null;
  };

  const renderMessageBubble = (message) => {
    const isOutgoing = message.type === "out";
    const mediaCaption = getMessageCaption(message);
    const hasMediaCaption = Boolean(mediaCaption);
    const isVisualMedia = ["image", "video"].includes(message.message_type);
    const hasVisualMedia = isVisualMedia && Boolean(message.media_url);
    const isMediaOnly =
      hasVisualMedia && !hasMediaCaption && !message.is_reply;
    const showVisualCaption = hasVisualMedia && hasMediaCaption;
    const fallbackLabel = getMessageContentLabel(message);
    const showTextContent =
      message.message_type !== "location" &&
      !showVisualCaption &&
      !hasVisualMedia &&
      Boolean(
        message.message_type === "text"
          ? fallbackLabel
          : hasMediaCaption
            ? mediaCaption
            : !["image", "video", "audio", "document"].includes(
                  message.message_type,
                ) && fallbackLabel,
      );

    const timestampNode = (
      <>
        <span>{formatChatDate(message.create_date)}</span>
        {isOutgoing && <MessageDeliveryStatus status={message.status} />}
      </>
    );

    const timestampRowClass = `flex items-center justify-end gap-1 text-[10px] ${
      isOutgoing ? "text-green-100" : "text-gray-400"
    }`;

    return (
      <div
        key={`${message.id}-${message.wamid}`}
        className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`rounded-lg shadow-sm ${
            hasVisualMedia
              ? `${MEDIA_PREVIEW_WIDTH_CLASS} shrink-0 p-1`
              : `w-fit min-w-0 ${BUBBLE_MAX_WIDTH_CLASS} px-3 py-2`
          } ${
            isOutgoing
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

          {hasVisualMedia ? (
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

              {!isMediaOnly && (
                <div className={`${timestampRowClass} px-2 pb-1`}>
                  {timestampNode}
                </div>
              )}
            </>
          ) : (
            renderMediaAttachment(message, isOutgoing, {
              mediaOnly: false,
              timestamp: null,
            })
          )}

          {message.message_type === "location" ? (
            <div className="text-sm max-w-[280px]">
              <p className="font-medium m-0">{message.name || "Location"}</p>
              {message.address && (
                <p className="opacity-90 m-0 mt-0.5">{message.address}</p>
              )}
              {message.latitude && message.longitude && (
                <p className="text-xs opacity-75 mt-1 m-0">
                  {message.latitude}, {message.longitude}
                </p>
              )}
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

          {!hasVisualMedia && (
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
  const assigneeLabel = getAssigneeLabel(assigned);

  return (
    <div
      className={`${isFullScreen ? "fixed inset-0 z-[100]" : "h-screen"} overflow-hidden bg-gray-100`}
    >
      {!isFullScreen && (
        <Header
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMinimized={isMinimized}
          setIsMinimized={setIsMinimized}
        />
      )}
      {!isFullScreen && (
        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMinimized={isMinimized}
          setIsMinimized={setIsMinimized}
        />
      )}

      <div
        className={`fixed inset-0 overflow-hidden transition-all duration-300 ${
          isFullScreen ? "top-0" : "top-16"
        } ${isFullScreen ? "left-0" : isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className={`h-full ${isFullScreen ? "p-0" : "p-2 sm:p-3 md:p-4"}`}>
          <div
            className={`h-full bg-white border border-gray-200 shadow-sm overflow-hidden flex ${
              isFullScreen ? "rounded-none" : "rounded-xl"
            }`}
          >
            {/* Chat list panel */}
            <div
              className={`${
                showChatPanel ? "hidden md:flex" : "flex"
              } w-full md:w-[360px] lg:w-[400px] flex-col border-r border-gray-200 bg-white shrink-0 min-h-0`}
            >
              <div className="shrink-0 px-3 py-2 border-b border-gray-200 bg-green-600 text-white flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold leading-none">Live Chats</h1>
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

            {/* Chat history panel */}
            <div
              className={`${
                showChatPanel ? "flex" : "hidden md:flex"
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
                    <button
                      type="button"
                      onClick={() => setSelectedContact(null)}
                      className="md:hidden p-1.5 rounded-lg hover:bg-gray-200 text-gray-600"
                    >
                      <FiArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
                      <FiUser className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <p className="font-semibold text-sm text-gray-900 truncate leading-tight m-0">
                        {getDisplayName(selectedContact)}
                      </p>
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

                  <div className="relative flex-1 min-h-0">
                    {historyLoading && (
                      <div className="absolute inset-0 z-10 bg-[#e5ddd5]">
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
                        messages.map((message) => renderMessageBubble(message))}
                    </div>
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
    </div>
  );
};

export default OneChattingLiveChat;
