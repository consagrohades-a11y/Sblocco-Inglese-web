import React from 'react';

const TAG_PATTERN = /(<\/?(?:b|strong|i|em|br|p|ul|ol|li|h2|h3)\s*\/?>)/gi;
const TAG_NAME = /^<\/?\s*([a-z0-9]+).*?>$/i;
const ELEMENT_MAP = { b: 'strong', strong: 'strong', i: 'em', em: 'em', p: 'p', ul: 'ul', ol: 'ol', li: 'li', h2: 'h2', h3: 'h3' };

function element(frame, key) {
  const tag = ELEMENT_MAP[frame.tag] || 'span';
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
            : undefined;
  return React.createElement(tag, { key, className }, frame.children);
}

export function parseSafeTeachingContent(value) {
  const normalized = String(value || '')
    .replace(/^###\s+([^\r\n]+)\r?$/gm, '<h3>$1</h3>')
    .replace(/^##\s+([^\r\n]+)\r?$/gm, '<h2>$1</h2>');
  const tokens = normalized.split(TAG_PATTERN).filter(Boolean);
  const root = { tag: null, children: [] };
  const stack = [root];
  let key = 0;

  const append = (child) => stack.at(-1).children.push(child);
  const appendText = (text) => {
    String(text)
      .split(/(\*\*[^*]+\*\*)/g)
      .filter(Boolean)
      .forEach((part) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          append(<strong key={`rich-${key++}`}>{part.slice(2, -2)}</strong>);
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
