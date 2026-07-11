export const formatActivityType = (type) => {
  if (!type) return '';
  return String(type)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const getExampleHeaderUrl = (example) => {
  if (!Array.isArray(example)) return null;
  const header = example.find(
    (item) => item?.type === 'HEADER' && String(item?.format || '').toUpperCase() === 'IMAGE',
  );
  return header?.example?.header_handle?.[0] || null;
};

export const getExampleBodyText = (example) => {
  if (!Array.isArray(example)) return '';
  const body = example.find((item) => item?.type === 'BODY');
  const text = body?.text || '';
  const samples = body?.example?.body_text?.[0];
  if (!Array.isArray(samples)) return text;

  return samples.reduce((result, sample, index) => {
    const placeholder = new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g');
    return result.replace(placeholder, sample);
  }, text);
};

export const buildOomsSystemPreviewContent = (template) => {
  if (!template) return null;

  const headerUrl = getExampleHeaderUrl(template.example);

  return {
    templateName: template.template_name,
    header: headerUrl
      ? {
          format: 'IMAGE',
          mediaUrl: headerUrl,
        }
      : null,
    bodyText: getExampleBodyText(template.example),
    footerText: '',
    buttons: [],
  };
};

export const normalizeOomsSystemVariables = (variables) => {
  if (!Array.isArray(variables)) return [];
  return variables.filter((item) => item?.key || item?.label);
};
