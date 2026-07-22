import React from 'react';

const TAG_PATTERN = /(<\/?(?:b|strong|i|em|br|p|ul|ol|li|h2|h3|table|thead|tbody|tr|th|td)\s*\/?>)/gi;
const TAG_NAME = /^<\/?\s*([a-z0-9]+).*?>$/i;
const ELEMENT_MAP = { b: 'strong', strong: 'strong', i: 'em', em: 'em', p: 'p', ul: 'ul', ol: 'ol', li: 'li', h2: 'h2', h3: 'h3', table: 'table', thead: 'thead', tbody: 'tbody', tr: 'tr', th: 'th', td: 'td' };

function element(frame, key) {
  const tag = ELEMENT_MAP[frame.tag] || 'span';
  if (tag === 'table') {
    return (
      <div key={key} className="my-5 overflow-x-auto rounded-xl border border-ink/15 bg-white shadow-sm dark:border-white/15 dark:bg-white/[0.04]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          {frame.children}
        </table>
      </div>
    );
  }
  const className = tag === 'p'
    ? 'my-2 first:mt-0 last:mb-0'
    : tag === 'ul'
      ? 'my-2 list-disc pl-6'
      : tag === 'ol'
        ? 'my-2 list-decimal pl-6'
        : tag === 'h2'
          ? 'mb-3 mt-7 text-2xl font-black leading-tight first:mt-0'
          : tag === 'h3'
            ? 'mb-2 mt-5 text-lg font-black leading-snug first:mt-0'
            : tag === 'thead'
              ? 'bg-cyan-100/80 text-ink dark:bg-cyan-300/10 dark:text-white'
              : tag === 'tr'
                ? 'border-b border-ink/10 last:border-b-0 odd:bg-linen/20 dark:border-white/10 dark:odd:bg-white/[0.025]'
                : tag === 'th'
                  ? 'border-r border-ink/10 px-3 py-3 font-black last:border-r-0 dark:border-white/10'
                  : tag === 'td'
                    ? 'border-r border-ink/10 px-3 py-2.5 align-top font-semibold leading-6 last:border-r-0 dark:border-white/10'
                    : undefined;
  return React.createElement(tag, { key, className }, frame.children);
}

function tableCells(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableSeparator(line) {
  const cells = tableCells(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function normalizeMarkdownTables(value) {
  const lines = String(value || '').split(/\r?\n/);
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const headerCells = tableCells(lines[index]);
    if (
      index + 1 < lines.length
      && headerCells.length > 1
      && lines[index].includes('|')
      && isTableSeparator(lines[index + 1])
    ) {
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        const cells = tableCells(lines[index]).slice(0, headerCells.length);
        while (cells.length < headerCells.length) cells.push('');
        rows.push(cells);
        index += 1;
      }
      output.push(
        `<table><thead><tr>${headerCells.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
      );
      continue;
    }
    output.push(lines[index]);
    index += 1;
  }

  return output.join('\n');
}

export function parseSafeTeachingContent(value) {
  const normalized = normalizeMarkdownTables(value)
    .replace(/^###\s+([^\r\n]+)\r?$/gm, '<h3>$1</h3>')
    .replace(/^##\s+([^\r\n]+)\r?$/gm, '<h2>$1</h2>');
  const tokens = normalized.split(TAG_PATTERN).filter(Boolean);
  const root = { tag: null, children: [] };
  const stack = [root];
  let key = 0;

  const append = (child) => stack.at(-1).children.push(child);
  const appendText = (text) => {
    String(text)
      .split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g)
      .filter(Boolean)
      .forEach((part) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          append(<strong key={`rich-${key++}`}>{part.slice(2, -2)}</strong>);
        } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          append(<em key={`rich-${key++}`}>{part.slice(1, -1)}</em>);
        } else {
          append(part);
        }
      });
  };
  const closeTop = () => {
    if (stack.length <= 1) return;
    const frame = stack.pop();
    append(element(frame, `rich-${key++}`));
  };

  tokens.forEach((token) => {
    const match = token.match(TAG_NAME);
    if (!match) {
      appendText(token);
      return;
    }
    const tag = match[1].toLowerCase();
    const closing = /^<\//.test(token);
    if (tag === 'br') {
      append(<br key={`rich-${key++}`} />);
      return;
    }
    if (closing) {
      const matchingIndex = stack.map((frame) => frame.tag).lastIndexOf(tag);
      if (matchingIndex <= 0) return;
      while (stack.length - 1 >= matchingIndex) closeTop();
      return;
    }
    stack.push({ tag, children: [] });
  });

  while (stack.length > 1) closeTop();
  return root.children;
}

export default function SafeTeachingContent({ children }) {
  return <>{parseSafeTeachingContent(children)}</>;
}
