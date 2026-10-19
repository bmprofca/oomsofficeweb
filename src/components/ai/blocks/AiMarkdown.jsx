import React from 'react';

/**
 * Minimal, safe Markdown renderer for assistant replies.
 * Builds React elements only (never dangerouslySetInnerHTML), so HTML or scripts inside a
 * reply render as plain text. Supports paragraphs, headings, bullet / numbered lists,
 * **bold**, *italic*, `code` and [links](https://…) (http/https only).
 */

const INLINE_RE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\s\n][^*\n]*\*|_[^_\s\n][^_\n]*_)/g;

function safeHref(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch (_) {
    return null;
  }
}

export function renderInline(text, keyPrefix = 'i') {
  const parts = String(text).split(INLINE_RE);
  return parts.map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={key} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">{part.slice(1, -1)}</code>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      return href ? (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700">
          {link[1]}
        </a>
      ) : (
        <span key={key}>{link[1]}</span>
      );
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      if (part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export default function AiMarkdown({ text }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let para = [];
  let list = null; // { ordered, items }

  const flushPara = () => {
    if (para.length) {
      const k = `p-${out.length}`;
      out.push(
        <p key={k} className="leading-relaxed">
          {para.map((l, i) => (
            <React.Fragment key={`${k}-${i}`}>
              {i > 0 && <br />}
              {renderInline(l, `${k}-${i}`)}
            </React.Fragment>
          ))}
        </p>
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const k = `l-${out.length}`;
      const Tag = list.ordered ? 'ol' : 'ul';
      out.push(
        <Tag key={k} className={`${list.ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5`}>
          {list.items.map((item, i) => (
            <li key={`${k}-${i}`} className="leading-relaxed">{renderInline(item, `${k}-${i}`)}</li>
          ))}
        </Tag>
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,4}\s+(.*)$/);

    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (heading) {
      flushPara();
      flushList();
      out.push(
        <h4 key={`h-${out.length}`} className="pt-1 text-sm font-semibold text-slate-900">
          {renderInline(heading[1], `h-${out.length}`)}
        </h4>
      );
    } else if (bullet || numbered) {
      flushPara();
      const ordered = Boolean(numbered && !bullet);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet || numbered)[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div className="space-y-2 text-[13.5px] text-slate-700">{out}</div>;
}
