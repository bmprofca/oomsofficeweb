import {
  getMessageCaption,
  getMessageIdCandidates,
  getMessageMediaName,
  isDocumentMessage,
} from './oneChattingChatUtils';

export { isDocumentMessage };

export const buildChatMediaLookupMap = (items = []) => {
  const map = new Map();

  const register = (key, entry) => {
    const normalized = String(key || '').trim();
    if (normalized) map.set(normalized, entry);
  };

  items.forEach((item) => {
    if (!item?.media_url) return;

    const entry = {
      url: item.media_url,
      name: item.media_name || '',
      create_date: item.create_date || '',
      message_type: item.message_type || '',
    };

    getMessageIdCandidates(item).forEach((id) => register(id, entry));

    const name = String(item.media_name || '').trim();
    const date = String(item.create_date || '').trim();
    if (name && date) register(`dt:${date}|${name}`, entry);
    if (name) register(`name:${name.toLowerCase()}`, entry);
  });

  return map;
};

export const findMediaListItemForMessage = (message, items = []) => {
  if (!message || !Array.isArray(items) || !items.length) return null;

  const messageIds = new Set(getMessageIdCandidates(message));
  if (messageIds.size) {
    const idMatch = items.find((item) =>
      getMessageIdCandidates(item).some((id) => messageIds.has(id)),
    );
    if (idMatch?.media_url) return idMatch;
  }

  const targetName = String(
    getMessageMediaName(message) ||
      getMessageCaption(message) ||
      message?.media_name ||
      '',
  )
    .trim()
    .toLowerCase();
  const targetDate = String(message?.create_date || '').trim();

  if (targetName) {
    const nameMatches = items.filter(
      (item) =>
        String(item?.media_name || '')
          .trim()
          .toLowerCase() === targetName,
    );

    if (nameMatches.length === 1) return nameMatches[0];

    if (targetDate && nameMatches.length > 1) {
      const dated = nameMatches.find(
        (item) => String(item?.create_date || '').trim() === targetDate,
      );
      if (dated?.media_url) return dated;
    }
  }

  return null;
};
