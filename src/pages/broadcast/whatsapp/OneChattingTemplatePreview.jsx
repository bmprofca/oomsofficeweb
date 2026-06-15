import React from 'react';
import { FiCornerUpLeft, FiPhone, FiPlay } from 'react-icons/fi';
import { WhatsAppFormattedText } from './oneChattingChatUtils';

const PREVIEW_WIDTH_CLASS = 'w-full max-w-[330px]';
const HEADER_MEDIA_CLASS = 'relative w-full h-[180px] shrink-0 overflow-hidden rounded-t-md bg-[#dfe5e7]';

const TemplateActionButton = ({ button }) => {
  const baseClass =
    'flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-[#008069] border-t border-gray-200 hover:bg-gray-50 transition-colors';

  if (button.type === 'PHONE_NUMBER' && button.phone_number) {
    return (
      <a
        href={`tel:${button.phone_number}`}
        className={baseClass}
        onClick={(event) => event.stopPropagation()}
      >
        <FiPhone className="w-4 h-4 shrink-0" />
        <span>{button.text}</span>
      </a>
    );
  }

  if (button.type === 'URL' && button.url) {
    const href = button.url.startsWith('http')
      ? button.url
      : `https://${button.url}`;

    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={baseClass}
        onClick={(event) => event.stopPropagation()}
      >
        <FiCornerUpLeft className="w-4 h-4 shrink-0 rotate-90" />
        <span>{button.text}</span>
      </a>
    );
  }

  return (
    <div className={`${baseClass} cursor-default`}>
      <span>{button.text}</span>
    </div>
  );
};

const TemplateHeaderMedia = ({ header, templateName, onOpenHeaderMedia }) => {
  if (!header?.mediaUrl) return null;

  if (header.format === 'IMAGE') {
    const image = (
      <img
        src={header.mediaUrl}
        alt={templateName || 'Template header'}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    );

    if (!onOpenHeaderMedia) {
      return <div className={HEADER_MEDIA_CLASS}>{image}</div>;
    }

    return (
      <button
        type="button"
        onClick={() => onOpenHeaderMedia(header.mediaUrl, 'image')}
        className={`block ${HEADER_MEDIA_CLASS} text-left focus:outline-none focus:ring-2 focus:ring-green-400/50`}
      >
        {image}
      </button>
    );
  }

  if (header.format === 'VIDEO') {
    return (
      <div className={HEADER_MEDIA_CLASS}>
        <video
          src={header.mediaUrl}
          className="w-full h-full object-cover bg-black pointer-events-none"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
          <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <FiPlay className="w-5 h-5 text-gray-800 ml-0.5" />
          </span>
        </span>
      </div>
    );
  }

  if (header.format === 'DOCUMENT') {
    return (
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="text-[10px] font-bold uppercase text-red-600">DOC</span>
          <span className="text-sm text-gray-800 truncate">
            {header.fileName || 'Document'}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

const OneChattingTemplatePreview = ({
  content,
  onOpenHeaderMedia,
  className = '',
}) => {
  if (!content) return null;

  const { header, bodyText, footerText, buttons, templateName } = content;
  const linkClassName = 'text-[#027eb5] hover:underline';
  const hasHeaderMedia = ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header?.format);

  return (
    <div
      className={`${PREVIEW_WIDTH_CLASS} shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {hasHeaderMedia ? (
        <TemplateHeaderMedia
          header={header}
          templateName={templateName}
          onOpenHeaderMedia={onOpenHeaderMedia}
        />
      ) : null}

      {header?.format === 'TEXT' && header.text ? (
        <p className="text-sm font-semibold text-gray-900 px-3 pt-3 pb-1 m-0">
          {header.text}
        </p>
      ) : null}

      {bodyText ? (
        <div
          className={`px-3 ${
            header?.format === 'TEXT'
              ? 'pt-1 pb-2'
              : hasHeaderMedia
                ? 'py-2'
                : 'pt-3 pb-2'
          }`}
        >
          <WhatsAppFormattedText
            text={bodyText}
            className="text-sm text-gray-800"
            linkClassName={linkClassName}
          />
        </div>
      ) : null}

      {footerText ? (
        <div className="px-3 pb-2">
          <WhatsAppFormattedText
            text={footerText}
            className="text-xs text-gray-500 block"
            linkClassName={linkClassName}
          />
        </div>
      ) : null}

      {buttons?.length ? (
        <div className="border-t border-gray-200 bg-white">
          {buttons.map((button, index) => (
            <TemplateActionButton
              key={`${button.text}-${index}`}
              button={button}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default OneChattingTemplatePreview;
