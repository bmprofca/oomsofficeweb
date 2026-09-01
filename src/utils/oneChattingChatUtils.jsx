import React from 'react';
import { getTemplateMessageSummary } from './oneChattingSendUtils';

const MEDIA_LABELS = {
  image: '📷 Image',
  document: '📄 Document',
  video: '🎬 Video',
  audio: '🎵 Audio',
  location: '📍 Location',
  template: '📋 Template',
};

export const getDisplayName = (contact) => contact?.name || contact?.number || 'Unknown';

export const parseCoordinate = (value) => {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const DIRECTION_MESSAGE_TYPES = new Set(['in', 'out', 'incoming', 'outgoing']);

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

export const normalizeMessageType = (message) => {
  if (!message) return '';

  const explicitFields = [
    message.message_type,
    message.msg_type,
    message.messageType,
  ];

  for (const field of explicitFields) {
    const normalized = String(field || '').trim().toLowerCase();
    if (normalized) return normalized;
  }

  const fallbackType = String(message.type || '').trim().toLowerCase();
  if (fallbackType && !DIRECTION_MESSAGE_TYPES.has(fallbackType)) {
    return fallbackType;
  }

  return '';
};

export const getMessageId = (message) =>
  getMessageIdCandidates(message)[0] || '';

export const getMessageIdCandidates = (message) => {
  if (!message || typeof message !== 'object') return [];

  const ids = new Set();
  ['message_id', 'id', 'wamid', 'unique_id'].forEach((field) => {
    const value = String(message[field] ?? '').trim();
    if (value) ids.add(value);
  });
  return [...ids];
};

const extractDirectMediaUrl = (message) => {
  if (!message || typeof message !== 'object') return '';

  const candidates = [
    message.media_url,
    message.mediaUrl,
    message.file_url,
    message.fileUrl,
    message.document_url,
    message.documentUrl,
    message.url,
    message.link,
    message.media?.url,
    message.media?.link,
    message.document?.url,
    message.document?.link,
    message.attachment?.url,
    message.attachment?.link,
  ];

  const caption = String(message.message || '').trim();
  if (isHttpUrl(caption)) candidates.push(caption);

  for (const value of candidates) {
    const url = String(value || '').trim();
    if (url) return url;
  }

  return '';
};

const lookupMediaEntry = (message, mediaLookup) => {
  if (!message || !(mediaLookup instanceof Map)) return null;

  for (const id of getMessageIdCandidates(message)) {
    const hit = mediaLookup.get(id);
    if (hit?.url) return hit;
  }

  const rawName = String(
    message.media_name ||
      message.mediaName ||
      message.file_name ||
      message.fileName ||
      message.filename ||
      message.document_name ||
      message.documentName ||
      message.document?.filename ||
      message.document?.name ||
      message.media?.name ||
      message.media?.filename ||
      message.message ||
      '',
  ).trim();
  const name = rawName && !isHttpUrl(rawName) ? rawName : '';
  const date = String(message?.create_date || '').trim();

  if (date && name) {
    const hit = mediaLookup.get(`dt:${date}|${name}`);
    if (hit?.url) return hit;
  }

  if (name) {
    const hit = mediaLookup.get(`name:${name.toLowerCase()}`);
    if (hit?.url) return hit;
  }

  return null;
};

export const getMessageMediaUrl = (message, mediaLookup) => {
  const directUrl = extractDirectMediaUrl(message);
  if (directUrl) return directUrl;

  const hit = lookupMediaEntry(message, mediaLookup);
  return hit?.url || '';
};

export const getMessageMediaName = (message, mediaLookup) => {
  if (!message || typeof message !== 'object') return '';

  const hit = lookupMediaEntry(message, mediaLookup);
  if (hit?.name) return hit.name;

  const messageType = normalizeMessageType(message);
  if (messageType === 'document' || messageType === 'file') {
    const caption = String(message.message || '').trim();
    if (caption && !isHttpUrl(caption)) return caption;
  }

  const candidates = [
    message.media_name,
    message.mediaName,
    message.file_name,
    message.fileName,
    message.filename,
    message.document_name,
    message.documentName,
    message.document?.filename,
    message.document?.name,
    message.media?.name,
    message.media?.filename,
  ];

  for (const value of candidates) {
    const name = String(value || '').trim();
    if (name) return name;
  }

  return '';
};

const DOCUMENT_MESSAGE_TYPES = new Set([
  'document',
  'file',
  'attachment',
  'documents',
]);

const MEDIA_MESSAGE_TYPES = new Set([
  'image',
  'video',
  'audio',
  'sticker',
  'location',
  'template',
  'text',
  'reaction',
  'contacts',
  'interactive',
]);

const DOCUMENT_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'zip',
  'rar',
  '7z',
]);

export const isDocumentMessage = (message) => {
  const messageType = normalizeMessageType(message);

  if (DOCUMENT_MESSAGE_TYPES.has(messageType)) return true;
  if (MEDIA_MESSAGE_TYPES.has(messageType) && messageType !== 'text') {
    return false;
  }

  const caption = String(message?.message || '').trim();
  const name =
    getMessageMediaName(message) ||
    (caption && !isHttpUrl(caption) ? caption : '');
  const url = extractDirectMediaUrl(message);
  const ext = getFileExtension(name, url);

  if (ext && DOCUMENT_EXTENSIONS.has(ext)) return true;
  if (isPdfMedia(url, name)) return true;

  if (name && /\.[a-z0-9]{2,8}$/i.test(name)) {
    const mediaExts = new Set([
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'bmp',
      'mp4',
      'mov',
      'avi',
      'webm',
      'mp3',
      'ogg',
      'wav',
      'm4a',
      'aac',
    ]);
    if (!mediaExts.has(ext)) return true;
  }

  return false;
};

export const getLocationFromMessage = (message) => {
  if (!message || message.message_type !== 'location') return null;

  const source = message.location || message;
  const latitude = parseCoordinate(source.latitude ?? message.latitude);
  const longitude = parseCoordinate(source.longitude ?? message.longitude);

  if (latitude == null || longitude == null) return null;

  return {
    latitude,
    longitude,
    name: (source.name ?? message.name ?? '').trim(),
    address: (source.address ?? message.address ?? '').trim(),
  };
};

export const getGoogleMapsLink = ({ latitude, longitude }) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

export const getGoogleMapsEmbedUrl = ({ latitude, longitude }) =>
  `https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=15&output=embed`;

export const getLocationPreviewLabel = (message) => {
  const location = getLocationFromMessage(message);
  if (!location) return MEDIA_LABELS.location;

  const title = location.name || location.address;
  return title ? `📍 ${title}` : MEDIA_LABELS.location;
};

export const isTemplateMessage = (message) =>
  Boolean(
    message &&
      (message.message_type === 'template' ||
        message.is_template ||
        message.template?.components?.length),
  );

export const getTemplatePreviewLabel = (message) => {
  const summary = getTemplateMessageSummary(message);
  return summary ? `📋 ${summary}` : MEDIA_LABELS.template;
};

export const getMessagePreview = (lastMessage) => {
  if (!lastMessage) return '';

  const { message_type: messageType, message, type } = lastMessage;
  let preview = message;

  if (messageType !== 'text' && !message) {
    preview =
      messageType === 'location'
        ? getLocationPreviewLabel(lastMessage)
        : messageType === 'template' || lastMessage.is_template
          ? getTemplatePreviewLabel(lastMessage)
          : MEDIA_LABELS[messageType] || `[${messageType}]`;
  }

  if (type === 'out') {
    return `You: ${preview}`;
  }

  return preview;
};

export const isChatAssignedToMe = (assigned) => Boolean(assigned?.is_me);

export const getAssigneeLabel = (assigned) => {
  if (assigned === false) return 'Unassigned';
  if (assigned?.is_me) return 'Assigned to you';
  return assigned?.staff?.name || assigned?.staff?.username || 'Assigned';
};

export const getSendBlockedMessage = (assigned) => {
  if (assigned === false) {
    return 'This chat is unassigned. You cannot send messages.';
  }
  if (!isChatAssignedToMe(assigned)) {
    return 'This chat is assigned to another agent. You cannot send messages.';
  }
  return '';
};

export const formatChatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${date.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${time}`;
};

export const getStatusIndicator = (status) => {
  switch (status) {
    case 'pending':
      return { label: 'Sending', className: 'text-gray-400' };
    case 'sent':
      return { label: 'Sent', className: 'text-gray-500' };
    case 'delivered':
      return { label: 'Delivered', className: 'text-gray-500' };
    case 'read':
      return { label: 'Read', className: 'text-blue-500' };
    case 'failed':
      return { label: 'Failed', className: 'text-red-500' };
    default:
      return null;
  }
};

export const getMessageCaption = (message) => message?.message?.trim() || '';

export const getMessageContentLabel = (message) => {
  if (!message) return '';

  const { message_type: messageType, message: text } = message;
  const caption = getMessageCaption(message);

  if (messageType === 'text') return caption;
  if (caption) return caption;
  if (messageType === 'location') return getLocationPreviewLabel(message);
  if (isTemplateMessage(message)) return getTemplatePreviewLabel(message);

  return MEDIA_LABELS[messageType] || `[${messageType}]`;
};

export const isPdfMedia = (url, name) => {
  const value = `${name || ''} ${url || ''}`.toLowerCase();
  return value.includes('.pdf');
};

export const getFileExtension = (name, url) => {
  const fromName = (name || '').trim();
  if (fromName.includes('.')) {
    const ext = fromName.split('.').pop()?.toLowerCase();
    if (ext && /^[a-z0-9]{1,8}$/.test(ext)) return ext;
  }

  try {
    const pathname = new URL(url).pathname;
    const segment = decodeURIComponent(pathname.split('/').pop() || '');
    if (segment.includes('.')) {
      const ext = segment.split('.').pop()?.toLowerCase();
      if (ext && /^[a-z0-9]{1,8}$/.test(ext)) return ext;
    }
  } catch {
    /* ignore invalid url */
  }

  return '';
};

const DOCUMENT_TYPE_META = {
  pdf: { label: 'PDF', color: 'text-red-600', bg: 'bg-red-50' },
  doc: { label: 'DOC', color: 'text-blue-700', bg: 'bg-blue-50' },
  docx: { label: 'DOC', color: 'text-blue-700', bg: 'bg-blue-50' },
  xls: { label: 'XLS', color: 'text-green-700', bg: 'bg-green-50' },
  xlsx: { label: 'XLS', color: 'text-green-700', bg: 'bg-green-50' },
  ppt: { label: 'PPT', color: 'text-orange-700', bg: 'bg-orange-50' },
  pptx: { label: 'PPT', color: 'text-orange-700', bg: 'bg-orange-50' },
  txt: { label: 'TXT', color: 'text-gray-700', bg: 'bg-gray-100' },
  zip: { label: 'ZIP', color: 'text-amber-700', bg: 'bg-amber-50' },
  rar: { label: 'RAR', color: 'text-amber-700', bg: 'bg-amber-50' },
};

export const getDocumentTypeMeta = (extension) => {
  const ext = (extension || '').toLowerCase();
  if (DOCUMENT_TYPE_META[ext]) return DOCUMENT_TYPE_META[ext];
  return {
    label: ext ? ext.slice(0, 4).toUpperCase() : 'FILE',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
  };
};

export const formatAudioDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getMediaPreviewType = (messageType, url, name) => {
  if (messageType === 'image') return 'image';
  if (messageType === 'video') return 'video';
  if (messageType === 'audio') return 'audio';
  if (messageType === 'document' && isPdfMedia(url, name)) return 'pdf';
  return null;
};

/** Modal display type — documents open modal without inline preview */
export const getMediaModalType = (messageType, url, name) => {
  const previewType = getMediaPreviewType(messageType, url, name);
  if (previewType === 'image' || previewType === 'video' || previewType === 'audio') {
    return previewType;
  }
  if (
    messageType === 'document' ||
    previewType === 'pdf' ||
    (url && ['document', 'file'].includes(String(messageType || '').toLowerCase()))
  ) {
    return 'file';
  }
  return previewType || messageType || 'file';
};

export const canPreviewMedia = (messageType, url, name) =>
  Boolean(getMediaPreviewType(messageType, url, name));

const URL_REGEX =
  /https?:\/\/[^\s<]+[^<.,:;"')\]\s]*|www\.[^\s<]+[^<.,:;"')\]\s]*/gi;

const FORMAT_TOKEN_REGEX =
  /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|```[^`]+```)/g;

const wrapFormattedToken = (token, key) => {
  if (token.startsWith('```') && token.endsWith('```')) {
    return (
      <code
        key={key}
        className="font-mono text-[0.92em] bg-black/10 px-1 py-px rounded"
      >
        {token.slice(3, -3)}
      </code>
    );
  }
  if (token.startsWith('*') && token.endsWith('*')) {
    return <strong key={key}>{token.slice(1, -1)}</strong>;
  }
  if (token.startsWith('_') && token.endsWith('_')) {
    return <em key={key}>{token.slice(1, -1)}</em>;
  }
  if (token.startsWith('~') && token.endsWith('~')) {
    return <del key={key}>{token.slice(1, -1)}</del>;
  }
  return token;
};

const parseFormattedSegment = (segment, keyRef, linkClassName) => {
  if (!segment) return [];

  const nodes = [];
  let lastIndex = 0;
  let match;

  FORMAT_TOKEN_REGEX.lastIndex = 0;
  while ((match = FORMAT_TOKEN_REGEX.exec(segment)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(segment.slice(lastIndex, match.index));
    }
    nodes.push(wrapFormattedToken(match[0], keyRef.current++));
    lastIndex = FORMAT_TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < segment.length) {
    nodes.push(segment.slice(lastIndex));
  }

  return nodes.length ? nodes : [segment];
};

export const parseWhatsAppText = (text, linkClassName = '') => {
  if (!text) return [];

  const nodes = [];
  let lastIndex = 0;
  let match;
  const keyRef = { current: 0 };

  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        ...parseFormattedSegment(
          text.slice(lastIndex, match.index),
          keyRef,
          linkClassName,
        ),
      );
    }

    const url = match[0];
    const href = url.startsWith('http') ? url : `https://${url}`;
    nodes.push(
      <a
        key={`url-${keyRef.current++}`}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={`cursor-pointer underline break-all ${linkClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    lastIndex = URL_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(
      ...parseFormattedSegment(text.slice(lastIndex), keyRef, linkClassName),
    );
  }

  return nodes.length ? nodes : [text];
};

export const WhatsAppFormattedText = ({
  text,
  className = '',
  linkClassName = '',
}) => {
  if (!text) return null;

  return (
    <span className={`whitespace-pre-wrap break-words ${className}`}>
      {parseWhatsAppText(text, linkClassName)}
    </span>
  );
};
