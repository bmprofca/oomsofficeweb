import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiFile,
  FiFileText,
  FiFolderPlus,
  FiImage,
  FiLoader,
  FiMapPin,
  FiMic,
  FiSearch,
  FiVideo,
  FiX,
} from "react-icons/fi";
import TablePagination from "../TablePagination";
import { DateRangePickerField } from "../PortalDatePicker";
import { whatsappApi, normalizePagination } from "../../services/whatsappApi";
import {
  formatChatDate,
  getMediaModalType,
  getMediaPreviewType,
} from "../../utils/oneChattingChatUtils";

const MEDIA_FILTERS = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "document", label: "Documents" },
  { value: "audio", label: "Audio" },
];

const MEDIA_SEARCH_INPUT =
  "w-full pl-9 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 placeholder:text-gray-400";

const getMediaIcon = (messageType) => {
  const type = String(messageType || "").toLowerCase();
  if (type === "image") return FiImage;
  if (type === "video") return FiVideo;
  if (type === "audio") return FiMic;
  if (type === "location") return FiMapPin;
  if (type === "document") return FiFileText;
  return FiFile;
};

const MediaTile = ({ item, onOpen, onSaveToDocuments }) => {
  const messageType = String(item.message_type || "").toLowerCase();
  const previewType = getMediaPreviewType(
    messageType,
    item.media_url,
    item.media_name,
  );
  const Icon = getMediaIcon(messageType);
  const label = item.media_name || messageType || "Media";
  const isIncoming = String(item.direction || item.type || "").toLowerCase() === "incoming"
    || String(item.type || "").toLowerCase() === "in";
  const canSave =
    Boolean(onSaveToDocuments) &&
    Boolean(item.media_url) &&
    messageType !== "location";

  const handleClick = () => {
    if (!item.media_url && messageType !== "location") return;
    onOpen?.({
      url: item.media_url,
      type: getMediaModalType(messageType, item.media_url, item.media_name),
      name: item.media_name,
      message: item,
    });
  };

  const handleSave = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!canSave) return;
    onSaveToDocuments?.({
      url: item.media_url,
      type: previewType || messageType,
      name: item.media_name,
      message: item,
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:border-green-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500/30 cursor-pointer"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {previewType === "image" && item.media_url ? (
          <img
            src={item.media_url}
            alt={label}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : previewType === "video" && item.media_url ? (
          <>
            <video
              src={item.media_url}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/25">
              <FiVideo className="h-8 w-8 text-white drop-shadow" />
            </span>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-gray-500">
            <Icon className="h-8 w-8 text-gray-400" />
            <span className="line-clamp-2 text-center text-[11px] font-medium text-gray-600">
              {label}
            </span>
          </div>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            isIncoming
              ? "bg-white/90 text-gray-700"
              : "bg-green-600/90 text-white"
          }`}
        >
          {isIncoming ? "In" : "Out"}
        </span>
        {canSave ? (
          <button
            type="button"
            onClick={handleSave}
            title="Save to client documents"
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-blue-700 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-white"
          >
            <FiFolderPlus className="h-3 w-3" />
            Save
          </button>
        ) : null}
      </div>
      <div className="min-w-0 border-t border-gray-100 px-2.5 py-2">
        <p className="m-0 truncate text-xs font-medium text-gray-800">{label}</p>
        <p className="m-0 mt-0.5 truncate text-[10px] text-gray-500">
          {formatChatDate(item.create_date)}
        </p>
      </div>
    </div>
  );
};

const MediaGridSkeleton = ({ count = 8 }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="overflow-hidden rounded-xl border border-gray-200 bg-white animate-pulse"
      >
        <div className="aspect-square bg-gray-200" />
        <div className="space-y-2 p-2.5">
          <div className="h-3 rounded bg-gray-200" />
          <div className="h-2 w-2/3 rounded bg-gray-100" />
        </div>
      </div>
    ))}
  </div>
);

export default function OneChattingChatMediaPanel({
  contactNumber,
  contactName = "",
  onOpenMedia,
  onSaveToDocuments,
}) {
  const [filter, setFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchMedia = useCallback(async () => {
    if (!contactNumber) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        filter,
        page_no: page,
        limit,
        number: String(contactNumber).trim(),
      };
      if (search) payload.search = search;
      if (dateRange.start) payload.date_from = dateRange.start;
      if (dateRange.end) payload.date_to = dateRange.end;

      const res = await whatsappApi.getMediaList(payload);
      const list = Array.isArray(res?.data) ? res.data : [];
      setItems(list);
      setPagination(
        normalizePagination(res?.pagination, {
          page_no: page,
          limit,
          itemCount: list.length,
        }),
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load media files",
      );
      setItems([]);
      setPagination({
        page_no: page,
        limit,
        total: 0,
        total_pages: 1,
        has_more: false,
      });
    } finally {
      setLoading(false);
    }
  }, [contactNumber, filter, page, limit, search, dateRange.start, dateRange.end]);

  useEffect(() => {
    setPage(1);
  }, [contactNumber, filter, search, dateRange.start, dateRange.end, limit]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const subtitle = useMemo(() => {
    if (contactName && contactNumber) {
      return `${contactName} · ${contactNumber}`;
    }
    return contactNumber || "";
  }, [contactName, contactNumber]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f0f2f5]">
      <div className="shrink-0 space-y-2 border-b border-gray-200 bg-white px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-semibold text-gray-900">Media, docs & links</p>
            {subtitle ? (
              <p className="m-0 mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {MEDIA_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                  filter === option.value
                    ? "bg-green-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-row items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search file name…"
              className={`${MEDIA_SEARCH_INPUT} ${searchInput ? "pr-9" : "pr-3"}`}
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Clear search"
              >
                <FiX className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="w-[min(100%,17.5rem)] shrink-0">
            <DateRangePickerField
              value={dateRange}
              onChange={(range) =>
                setDateRange({
                  start: range?.start || "",
                  end: range?.end || "",
                })
              }
              placeholder="Date range"
              mode="range"
              initialTab="quick"
              defaultQuickKey="tm"
              quickOptionKeys={["tw", "lw", "lm", "tm", "lf", "fy"]}
              showRangeHint={false}
              showResetButton
              truncateRangeLabel={false}
              buttonClassName="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-green-400 focus:outline-none transition-all"
              wrapperClassName="w-full"
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <MediaGridSkeleton />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
            <FiImage className="mb-3 h-10 w-10 text-gray-300" />
            <p className="m-0 text-sm font-medium text-gray-600">No media found</p>
            <p className="m-0 mt-1 max-w-xs text-xs text-gray-400">
              Images, videos, documents, and audio shared in this chat will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <MediaTile
                key={`${item.message_id || item.id}-${item.create_date}`}
                item={item}
                onOpen={onOpenMedia}
                onSaveToDocuments={onSaveToDocuments}
              />
            ))}
          </div>
        )}
      </div>

      {!loading && pagination.total > 0 ? (
        <TablePagination
          page={pagination.page_no}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.total_pages}
          isLastPage={!pagination.has_more && pagination.page_no >= pagination.total_pages}
          rowOptions={[10, 20, 30, 50]}
          defaultRows={20}
          onPageChange={setPage}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          className="shrink-0 border-t border-gray-200 bg-white"
        />
      ) : null}
    </div>
  );
}
