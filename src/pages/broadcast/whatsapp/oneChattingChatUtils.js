import React from 'react';

const MEDIA_LABELS = {
  image: '📷 Image',
  document: '📄 Document',
  video: '🎬 Video',
  audio: '🎵 Audio',
  location: '📍 Location',
  template: '📋 Template',
};

export const getDisplayName = (contact) => contact?.name || contact?.number || 'Unknown';

export const getMessagePreview = (lastMessage) => {
  if (!lastMessage) return '';

  const { message_type: messageType, message, type } = lastMessage;
  let preview = message;

  if (messageType !== 'text' && !message) {
    preview = MEDIA_LABELS[messageType] || `[${messageType}]`;
  }

  if (type === 'out') {
    return `You: ${preview}`;
  }

  return preview;
};

export const getAssigneeLabel = (assigned) => {
  if (assigned === false) return 'Unassigned';
  if (assigned?.is_me) return 'Assigned to you';
  return assigned?.staff?.name || assigned?.staff?.username || 'Assigned';
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

  return MEDIA_LABELS[messageType] || `[${messageType}]`;
};

export const isPdfMedia = (url, name) => {
  const value = `${name || ''} ${url || ''}`.toLowerCase();
  return value.includes('.pdf');
};

export const getMediaPreviewType = (messageType, url, name) => {
  if (messageType === 'image') return 'image';
  if (messageType === 'video') return 'video';
  if (messageType === 'audio') return 'audio';
  if (messageType === 'document' && isPdfMedia(url, name)) return 'pdf';
  return null;
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
