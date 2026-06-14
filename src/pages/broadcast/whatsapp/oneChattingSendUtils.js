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

export const buildWhatsAppNumber = (countryCode, mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return '';

  const code = String(countryCode || '91').replace(/\D/g, '') || '91';
  if (digits.startsWith(code)) return digits;

  return `${code}${digits}`;
};

export const enrichSentMessage = (response, replyToMessage) => {
  if (!response) return response;

  const publicMessageId = response.message_id || response.unique_id;
  const enriched = {
    ...response,
    ...(publicMessageId
      ? {
          message_id: publicMessageId,
          unique_id: response.unique_id || publicMessageId,
        }
      : {}),
  };

  if (!replyToMessage) return enriched;

  return {
    ...enriched,
    is_reply: true,
    reply_to_message: replyToMessage,
    reply_wamid: enriched.reply_wamid || replyToMessage.wamid,
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

const getSentTemplateComponents = (message) => {
  if (Array.isArray(message?.component)) return message.component;
  if (Array.isArray(message?.components)) return message.components;
  return [];
};

const findSentTemplateComponent = (sentComponents, type) =>
  sentComponents.find(
    (item) => (item.type || '').toLowerCase() === type.toLowerCase(),
  );

const findTemplateDefinitionComponent = (templateDef, type) =>
  (templateDef?.components || []).find(
    (item) => (item.type || '').toUpperCase() === type.toUpperCase(),
  );

const applyBodyPlaceholders = (text, parameters = [], exampleRow = []) => {
  if (!text) return '';

  let resolved = text;
  parameters.forEach((value, index) => {
    if (value == null || value === '') return;
    resolved = resolved.replace(
      new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'),
      String(value),
    );
  });

  if (resolved.includes('{{') && Array.isArray(exampleRow)) {
    exampleRow.forEach((value, index) => {
      if (value == null || value === '') return;
      resolved = resolved.replace(
        new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'),
        String(value),
      );
    });
  }

  return resolved;
};

export const resolveTemplateMessage = (message) => {
  const templateDef = message?.template;
  if (!templateDef?.components?.length) return null;

  const sentComponents = getSentTemplateComponents(message);
  const headerDef = findTemplateDefinitionComponent(templateDef, 'HEADER');
  const bodyDef = findTemplateDefinitionComponent(templateDef, 'BODY');
  const footerDef = findTemplateDefinitionComponent(templateDef, 'FOOTER');
  const buttonsDef = findTemplateDefinitionComponent(templateDef, 'BUTTONS');
  const headerSent = findSentTemplateComponent(sentComponents, 'header');
  const bodySent = findSentTemplateComponent(sentComponents, 'body');

  let header = null;
  if (headerDef) {
    const format = (headerDef.format || 'TEXT').toUpperCase();
    const parameters = headerSent?.parameters || [];
    header = { format };

    if (format === 'TEXT') {
      header.text =
        parameters.find((item) => item.type === 'text')?.text ||
        headerDef.text ||
        headerDef.example?.header_text?.[0] ||
        '';
    } else if (format === 'IMAGE') {
      header.mediaUrl =
        parameters.find((item) => item.type === 'image')?.image?.link ||
        headerDef.example?.header_handle?.[0] ||
        headerDef.example?.header_url?.[0] ||
        '';
    } else if (format === 'VIDEO') {
      header.mediaUrl =
        parameters.find((item) => item.type === 'video')?.video?.link ||
        headerDef.example?.header_handle?.[0] ||
        headerDef.example?.header_url?.[0] ||
        '';
    } else if (format === 'DOCUMENT') {
      header.mediaUrl =
        parameters.find((item) => item.type === 'document')?.document?.link ||
        headerDef.example?.header_handle?.[0] ||
        headerDef.example?.header_url?.[0] ||
        '';
      header.fileName =
        parameters.find((item) => item.type === 'document')?.document
          ?.filename || 'Document';
    }
  }

  const bodyParameters = (bodySent?.parameters || [])
    .filter((item) => item.type === 'text')
    .map((item) => item.text);
  const bodyText = applyBodyPlaceholders(
    bodyDef?.text || '',
    bodyParameters,
    bodyDef?.example?.body_text?.[0] || [],
  );

  const buttons = (buttonsDef?.buttons || []).map((button, index) => {
    const buttonSent = sentComponents.find(
      (item) =>
        (item.type || '').toLowerCase() === 'button' &&
        String(item.index ?? item.button_index) === String(index),
    );
    const urlSuffix = buttonSent?.parameters?.find(
      (item) => item.type === 'text',
    )?.text;
    let url = button.url || '';

    if (urlSuffix && url.includes('{{')) {
      url = url.replace(/\{\{\d+\}\}/g, urlSuffix);
    }

    return {
      type: (button.type || '').toUpperCase(),
      text: button.text || '',
      phone_number: button.phone_number || '',
      url,
    };
  });

  return {
    templateName: templateDef.name || '',
    category: templateDef.category || '',
    language: templateDef.language || '',
    header,
    bodyText,
    footerText: footerDef?.text || '',
    buttons,
  };
};

export const getTemplateMessageSummary = (message) => {
  const resolved = resolveTemplateMessage(message);
  if (!resolved) return '';

  const firstLine =
    resolved.bodyText
      ?.split('\n')
      .map((line) => line.trim())
      .find(Boolean) || '';

  if (firstLine) {
    return firstLine.length > 96 ? `${firstLine.slice(0, 96)}…` : firstLine;
  }

  return resolved.templateName
    ? resolved.templateName.replace(/_/g, ' ')
    : 'Template message';
};

export const buildTemplatePreviewContent = (templateDef, variableValues = {}) => {
  if (!templateDef?.components?.length) return null;

  const component = buildTemplateComponents(templateDef, variableValues);

  return resolveTemplateMessage({
    message_type: 'template',
    is_template: true,
    template: templateDef,
    component,
  });
};
