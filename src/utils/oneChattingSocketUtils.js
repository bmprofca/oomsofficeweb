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

export const STATUS_RANK = {
  pending: 0,
  received: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 99,
};

export const shouldApplyStatus = (current, incoming) => {
  if (!incoming) return false;
  if (incoming === 'failed') return current !== 'read';
  if (current === 'failed') return false;
  return (STATUS_RANK[incoming] ?? 0) >= (STATUS_RANK[current] ?? 0);
};

export const getMessageStatusPatch = (payload) => {
  const { changes, failed_reason: failedReason, last_id: lastId } = payload;
  const status =
    typeof changes === 'string' ? changes : changes?.status;

  if (!status) return null;

  return {
    status,
    ...(lastId != null ? { id: lastId } : {}),
    ...(status === 'failed' && failedReason
      ? { failed_reason: failedReason }
      : {}),
  };
};

export const updateMessageStatus = (messages, payload) => {
  const { message_id: messageId, last_id: lastId } = payload;
  const patch = getMessageStatusPatch(payload);
  if (!patch?.status) return messages;

  return messages.map((message) => {
    if (!messageMatchesId(message, messageId, lastId)) return message;
    if (!shouldApplyStatus(message.status, patch.status)) return message;
    return { ...message, ...patch };
  });
};

export const updateChatListLastMessageStatus = (chats, payload) => {
  const { message_id: messageId, last_id: lastId } = payload;
  const patch = getMessageStatusPatch(payload);
  if (!patch?.status) return chats;

  return chats.map((item) => {
    const lastMessage = item.last_message;
    if (!lastMessage) return item;
    if (!messageMatchesId(lastMessage, messageId, lastId)) return item;
    if (!shouldApplyStatus(lastMessage.status, patch.status)) return item;

    return {
      ...item,
      last_message: { ...lastMessage, ...patch },
    };
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
  if (!assigning || typeof assigning !== 'object') return false;
  if (!assigning.assigned) return false;

  return {
    is_me: Boolean(assigning.assigned_to_me),
    staff: assigning.assigned_user || null,
  };
};

/**
 * Flatten OneChatting chat-assign-permission payload.
 * API shape: { error, data: { can_assign, assigning, ... } }
 */
export const unwrapChatAssignPermission = (response) => {
  if (!response || typeof response !== 'object') return null;

  const nested =
    response.data &&
    typeof response.data === 'object' &&
    !Array.isArray(response.data) &&
    ('can_assign' in response.data ||
      'can_manage' in response.data ||
      'can_unassign' in response.data ||
      'assigning' in response.data ||
      'can_assign_others' in response.data ||
      'can_self_assign_open' in response.data)
      ? response.data
      : null;

  const flat = nested ? { ...response, ...nested } : { ...response };

  if (!flat.assigning && nested?.assigning) {
    flat.assigning = nested.assigning;
  }

  return flat;
};

/** Normalize assignment from permission / assign / socket payloads. */
export const normalizeAssignApiState = (payload) => {
  const unwrapped = unwrapChatAssignPermission(payload) || payload;
  if (!unwrapped || typeof unwrapped !== 'object') return false;

  if (unwrapped.assigning && typeof unwrapped.assigning === 'object') {
    return normalizeSocketAssignment(unwrapped.assigning);
  }

  if (unwrapped.assigned === false) return false;

  if (
    unwrapped.assigned_user ||
    unwrapped.assigned_to_me === true ||
    unwrapped.assigned === true
  ) {
    return {
      is_me: Boolean(unwrapped.assigned_to_me),
      staff: unwrapped.assigned_user || null,
    };
  }

  return false;
};

/** Team list lives on assigning.users (permission + assign responses). */
export const extractAssignTeamMembers = (permissionOrAssign) => {
  const unwrapped =
    unwrapChatAssignPermission(permissionOrAssign) || permissionOrAssign || {};
  const assigning =
    unwrapped.assigning && typeof unwrapped.assigning === 'object'
      ? unwrapped.assigning
      : {};

  const raw = Array.isArray(assigning.users)
    ? assigning.users
    : Array.isArray(unwrapped.users)
      ? unwrapped.users
      : [];

  return raw
    .map((member) => {
      if (!member || typeof member !== 'object') return null;
      const username = String(
        member.username || member.user_name || member.target || '',
      ).trim();
      if (!username) return null;
      return {
        username,
        name: member.name || member.full_name || username,
        mobile: member.mobile || '',
        email: member.email || '',
        status: member.status,
        is_me: Boolean(member.is_me),
      };
    })
    .filter(Boolean);
};

export const clearChatUnreadCount = (chats, number) => {
  if (!number) return chats;

  return chats.map((item) =>
    item.contact?.number === number ? { ...item, unread_count: 0 } : item,
  );
};
