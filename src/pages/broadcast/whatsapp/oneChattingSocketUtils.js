export const emitDeveloperAuth = (socket, token) => {
  socket.emit('auth', {
    auth_type: 'developer',
    token,
  });
};

export const isMyProject = (projectId, myProjectId) =>
  !myProjectId || projectId === myProjectId;

export const messageMatchesId = (message, messageId, lastId) => {
  if (!message) return false;

  return (
    (messageId &&
      (message.message_id === messageId || message.unique_id === messageId)) ||
    (lastId != null && message.id === lastId)
  );
};

export const getMessageKey = (message) => {
  if (!message) return null;
  if (message.id != null) return `id:${message.id}`;
  if (message.wamid) return `wamid:${message.wamid}`;
  if (message.message_id) return `mid:${message.message_id}`;
  if (message.unique_id) return `uid:${message.unique_id}`;
  return null;
};

export const messagesAreSame = (left, right) => {
  if (!left || !right) return false;

  const leftKey = getMessageKey(left);
  const rightKey = getMessageKey(right);
  if (leftKey && rightKey && leftKey === rightKey) return true;
  if (left.id != null && left.id === right.id) return true;
  if (left.wamid && left.wamid === right.wamid) return true;

  const leftPublicId = left.message_id || left.unique_id;
  const rightPublicId = right.message_id || right.unique_id;
  return Boolean(leftPublicId && leftPublicId === rightPublicId);
};

export const upsertMessage = (messages, incoming) => {
  if (!incoming) return messages;

  const index = messages.findIndex((message) =>
    messagesAreSame(message, incoming),
  );

  if (index >= 0) {
    const next = [...messages];
    next[index] = { ...messages[index], ...incoming };
    return next;
  }

  return [...messages, incoming];
};

export const updateMessageStatus = (messages, payload) => {
  const { message_id: messageId, last_id: lastId, changes } = payload;
  if (!changes) return messages;

  return messages.map((message) =>
    messageMatchesId(message, messageId, lastId)
      ? { ...message, ...changes }
      : message,
  );
};

export const updateChatListLastMessageStatus = (chats, payload) => {
  const { message_id: messageId, last_id: lastId, changes } = payload;
  if (!changes) return chats;

  return chats.map((item) => {
    const lastMessage = item.last_message;
    if (!lastMessage) return item;

    return messageMatchesId(lastMessage, messageId, lastId)
      ? { ...item, last_message: { ...lastMessage, ...changes } }
      : item;
  });
};

export const updateChatListForMessage = (chats, payload, activeNumber) => {
  const { message, contact } = payload;
  const number = contact?.number;
  if (!number || !message) return chats;

  const isActive = activeNumber === number;
  const isInbound = message.type === 'in';
  const existingIndex = chats.findIndex(
    (item) => item.contact?.number === number,
  );

  if (existingIndex >= 0) {
    const item = chats[existingIndex];
    const unreadCount = isActive
      ? 0
      : isInbound
        ? Number(item.unread_count || 0) + 1
        : item.unread_count || 0;

    const updated = {
      ...item,
      contact: { ...item.contact, ...contact },
      last_message: message,
      unread_count: unreadCount,
    };

    return [updated, ...chats.filter((_, index) => index !== existingIndex)];
  }

  return [
    {
      contact,
      last_message: message,
      unread_count: isActive ? 0 : isInbound ? 1 : 0,
    },
    ...chats,
  ];
};

export const normalizeSocketAssignment = (assigning) => {
  if (!assigning?.assigned) return false;

  return {
    is_me: Boolean(assigning.assigned_to_me),
    staff: assigning.assigned_user || null,
  };
};

export const clearChatUnreadCount = (chats, number) => {
  if (!number) return chats;

  return chats.map((item) =>
    item.contact?.number === number ? { ...item, unread_count: 0 } : item,
  );
};
