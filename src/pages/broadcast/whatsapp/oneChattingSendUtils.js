export const extractApiError = (error, fallback = 'Request failed') =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export const normalizeRecipientNumber = (number) =>
  String(number || '')
    .trim()
    .replace(/^\+/, '')
    .replace(/\s/g, '');

export const enrichSentMessage = (response, replyToMessage) => {
  if (!response) return response;
  if (!replyToMessage) return response;

  return {
    ...response,
    is_reply: true,
    reply_to_message: replyToMessage,
    reply_wamid: response.reply_wamid || replyToMessage.wamid,
  };
};

export const buildReplyPayload = (replyToMessage) => {
  const wamid = replyToMessage?.wamid?.trim();
  if (!wamid) {
    return { is_reply: false, reply_wamid: null };
  }
  return { is_reply: true, reply_wamid: wamid };
};

const collectBodyPlaceholders = (text, exampleRows = []) => {
  if (!text) return [];

  const indices = [
    ...new Set(
      [...text.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1])),
    ),
  ].sort((a, b) => a - b);

  return indices.map((index) => ({
    key: `body_${index}`,
    componentType: 'body',
    index,
    label: `Body variable {{${index}}}`,
    example: exampleRows?.[0]?.[index - 1] || '',
    required: true,
  }));
};

const collectHeaderPlaceholder = (component) => {
  const format = (component.format || 'TEXT').toUpperCase();

  if (format === 'TEXT' && component.text?.includes('{{')) {
    return [
      {
        key: 'header_text',
        componentType: 'header',
        format: 'TEXT',
        label: 'Header text',
        example: component.example?.header_text?.[0] || '',
        required: true,
      },
    ];
  }

  if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) {
    const exampleLink =
      component.example?.header_handle?.[0] ||
      component.example?.header_url?.[0] ||
      '';
    return [
      {
        key: `header_${format.toLowerCase()}`,
        componentType: 'header',
        format,
        label: `Header ${format.toLowerCase()} URL`,
        example: exampleLink,
        required: true,
        inputType: 'url',
      },
    ];
  }

  return [];
};

const collectButtonPlaceholders = (buttons = []) =>
  buttons.flatMap((button, buttonIndex) => {
    if (button.type === 'URL' && button.url?.includes('{{')) {
      return [
        {
          key: `button_url_${buttonIndex}`,
          componentType: 'button',
          buttonIndex,
          subType: 'url',
          label: `Button "${button.text}" URL suffix`,
          example: button.example?.[0] || '',
          required: true,
        },
      ];
    }
    return [];
  });

export const getTemplatePlaceholders = (templateDef) => {
  const components = templateDef?.components || [];
  const placeholders = [];

  components.forEach((component) => {
    const type = (component.type || '').toUpperCase();

    if (type === 'HEADER') {
      placeholders.push(...collectHeaderPlaceholder(component));
    }

    if (type === 'BODY') {
      placeholders.push(
        ...collectBodyPlaceholders(
          component.text,
          component.example?.body_text,
        ),
      );
    }

    if (type === 'BUTTONS') {
      placeholders.push(...collectButtonPlaceholders(component.buttons));
    }
  });

  return placeholders;
};

export const buildTemplateComponents = (templateDef, values) => {
  const components = [];
  const templateComponents = templateDef?.components || [];

  templateComponents.forEach((component) => {
    const type = (component.type || '').toUpperCase();

    if (type === 'HEADER') {
      const format = (component.format || 'TEXT').toUpperCase();

      if (format === 'TEXT' && component.text?.includes('{{')) {
        const text = values.header_text?.trim();
        if (text) {
          components.push({
            type: 'header',
            parameters: [{ type: 'text', text }],
          });
        }
        return;
      }

      if (format === 'IMAGE') {
        const link = values.header_image?.trim();
        if (link) {
          components.push({
            type: 'header',
            parameters: [{ type: 'image', image: { link } }],
          });
        }
        return;
      }

      if (format === 'VIDEO') {
        const link = values.header_video?.trim();
        if (link) {
          components.push({
            type: 'header',
            parameters: [{ type: 'video', video: { link } }],
          });
        }
        return;
      }

      if (format === 'DOCUMENT') {
        const link = values.header_document?.trim();
        if (link) {
          components.push({
            type: 'header',
            parameters: [{ type: 'document', document: { link } }],
          });
        }
      }
    }

    if (type === 'BODY') {
      const indices = [
        ...new Set(
          [...(component.text?.matchAll(/\{\{(\d+)\}\}/g) || [])].map((match) =>
            Number(match[1]),
          ),
        ),
      ].sort((a, b) => a - b);

      if (!indices.length) return;

      components.push({
        type: 'body',
        parameters: indices.map((index) => ({
          type: 'text',
          text: values[`body_${index}`]?.trim() || '',
        })),
      });
    }

    if (type === 'BUTTONS') {
      component.buttons?.forEach((button, buttonIndex) => {
        if (button.type === 'URL' && button.url?.includes('{{')) {
          const suffix = values[`button_url_${buttonIndex}`]?.trim();
          if (suffix) {
            components.push({
              type: 'button',
              sub_type: 'url',
              index: String(buttonIndex),
              parameters: [{ type: 'text', text: suffix }],
            });
          }
        }
      });
    }
  });

  return components;
};

export const getTemplatePreviewText = (templateDef) => {
  const body = templateDef?.components?.find(
    (component) => (component.type || '').toUpperCase() === 'BODY',
  );
  return body?.text || templateDef?.name || 'Template message';
};
