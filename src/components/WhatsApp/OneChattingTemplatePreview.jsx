import React from "react";
import { FiCornerUpLeft, FiPhone, FiPlay } from "react-icons/fi";
import {
  getDocumentTypeMeta,
  getFileExtension,
  WhatsAppFormattedText,
} from "../../utils/oneChattingChatUtils";

const PREVIEW_WIDTH_CLASS = "w-full max-w-[330px]";
const HEADER_MEDIA_CLASS =
  "relative w-full h-[180px] shrink-0 overflow-hidden rounded-t-md bg-[#dfe5e7]";

const TemplateActionButton = ({ button, isOutgoing }) => {
  const baseClass = isOutgoing
    ? "flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-white border-t border-white/20 hover:bg-green-700/40 transition-colors"
    : "flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-[#008069] border-t border-gray-200 hover:bg-gray-50 transition-colors";

  if (button.type === "PHONE_NUMBER" && button.phone_number) {
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

  if (button.type === "URL" && button.url) {
    const href = button.url.startsWith("http")
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

const openHeaderMedia = (onOpenHeaderMedia, url, type, name) => {
  if (!onOpenHeaderMedia) return;
  onOpenHeaderMedia(url, type, name);
};

const TemplateHeaderMedia = ({
  header,
  templateName,
  onOpenHeaderMedia,
  isOutgoing,
}) => {
  if (!header) return null;

  const canOpen = Boolean(onOpenHeaderMedia);
  const mediaName = header.fileName || templateName || "Media";

  if (header.format === "IMAGE") {
    if (!header.mediaUrl) return null;

    const image = (
      <img
        src={header.mediaUrl}
        alt={templateName || "Template header"}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    );

    if (!canOpen) {
      return <div className={HEADER_MEDIA_CLASS}>{image}</div>;
    }

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          openHeaderMedia(onOpenHeaderMedia, header.mediaUrl, "image", mediaName);
        }}
        className={`block ${HEADER_MEDIA_CLASS} text-left focus:outline-none focus:ring-2 focus:ring-green-400/50`}
      >
        {image}
      </button>
    );
  }

  if (header.format === "VIDEO") {
    if (!header.mediaUrl) return null;

    const video = (
      <>
        <video
          src={header.mediaUrl}
          className="w-full h-full object-cover bg-black pointer-events-none"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
          <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <FiPlay className="w-5 h-5 text-gray-800 ml-0.5" />
          </span>
        </span>
      </>
    );

    if (!canOpen) {
      return <div className={HEADER_MEDIA_CLASS}>{video}</div>;
    }

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          openHeaderMedia(onOpenHeaderMedia, header.mediaUrl, "video", mediaName);
        }}
        className={`block ${HEADER_MEDIA_CLASS} text-left focus:outline-none focus:ring-2 focus:ring-green-400/50`}
      >
        {video}
      </button>
    );
  }

  if (header.format === "DOCUMENT") {
    const fileName = header.fileName || "Document";
    const extension = getFileExtension(fileName, header.mediaUrl);
    const meta = getDocumentTypeMeta(extension);
    const chip = (
      <div
        className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
          isOutgoing
            ? `bg-green-700/40 ${canOpen ? "hover:bg-green-700/55 cursor-pointer" : ""}`
            : `border border-gray-200 bg-gray-50 ${canOpen ? "hover:bg-gray-100 cursor-pointer" : ""}`
        }`}
      >
        <div
          className={`w-11 h-12 rounded-md flex items-center justify-center shrink-0 ${meta.bg}`}
        >
          <span className={`text-[10px] font-bold uppercase ${meta.color}`}>
            {meta.label}
          </span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p
            className={`text-sm truncate m-0 leading-tight ${
              isOutgoing ? "text-white" : "text-gray-800"
            }`}
          >
            {fileName}
          </p>
          <p
            className={`text-[11px] m-0 mt-0.5 leading-tight ${
              isOutgoing ? "text-green-100" : "text-gray-500"
            }`}
          >
            {extension ? `${extension.toUpperCase()} file` : "Document"}
          </p>
        </div>
      </div>
    );

    if (!canOpen) {
      return <div className="px-1 pt-1">{chip}</div>;
    }

    return (
      <div className="px-1 pt-1">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openHeaderMedia(
              onOpenHeaderMedia,
              header.mediaUrl,
              "document",
              fileName,
            );
          }}
          className="block w-full text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400/50"
        >
          {chip}
        </button>
      </div>
    );
  }

  return null;
};

const OneChattingTemplatePreview = ({
  content,
  onOpenHeaderMedia,
  className = "",
  variant = "card",
  isOutgoing = false,
}) => {
  if (!content) return null;

  const { header, bodyText, footerText, buttons, templateName } = content;
  const isMessage = variant === "message";
  const outgoing = isMessage && isOutgoing;
  const padX = isMessage ? "px-0" : "px-3";
  const linkClassName = outgoing
    ? "text-green-50 hover:text-white underline"
    : "text-[#027eb5] hover:underline";
  const hasHeaderMedia = ["IMAGE", "VIDEO", "DOCUMENT"].includes(
    header?.format,
  );

  return (
    <div
      className={`${PREVIEW_WIDTH_CLASS} shrink-0 overflow-hidden ${
        isMessage
          ? ""
          : "rounded-md border border-gray-200 bg-white shadow-sm"
      } ${className}`}
    >
      {hasHeaderMedia ? (
        <TemplateHeaderMedia
          header={header}
          templateName={templateName}
          onOpenHeaderMedia={onOpenHeaderMedia}
          isOutgoing={outgoing}
        />
      ) : null}

      {header?.format === "TEXT" && header.text ? (
        <p
          className={`text-sm font-semibold ${padX} ${
            isMessage ? "pt-0 pb-1" : "pt-3 pb-1"
          } m-0 ${outgoing ? "text-white" : "text-gray-900"}`}
        >
          {header.text}
        </p>
      ) : null}

      {bodyText ? (
        <div
          className={`${padX} ${
            header?.format === "TEXT"
              ? isMessage
                ? "pt-0 pb-1"
                : "pt-1 pb-2"
              : hasHeaderMedia
                ? "py-2"
                : isMessage
                  ? "pt-0 pb-1"
                  : "pt-3 pb-2"
          }`}
        >
          <WhatsAppFormattedText
            text={bodyText}
            className={`text-sm ${outgoing ? "text-white" : "text-gray-800"}`}
            linkClassName={linkClassName}
          />
        </div>
      ) : null}

      {footerText ? (
        <div className={`${padX} pb-1`}>
          <WhatsAppFormattedText
            text={footerText}
            className={`text-xs block ${
              outgoing ? "text-green-100" : "text-gray-500"
            }`}
            linkClassName={linkClassName}
          />
        </div>
      ) : null}

      {buttons?.length ? (
        <div
          className={
            outgoing
              ? "border-t border-white/20"
              : "border-t border-gray-200 bg-white"
          }
        >
          {buttons.map((button, index) => (
            <TemplateActionButton
              key={`${button.text}-${index}`}
              button={button}
              isOutgoing={outgoing}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default OneChattingTemplatePreview;
