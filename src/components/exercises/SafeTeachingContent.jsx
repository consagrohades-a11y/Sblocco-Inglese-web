import React from 'react';

const TAG_PATTERN = /(<\/?(?:b|strong|i|em|br|p|ul|ol|li)\s*\/?>)/gi;
const TAG_NAME = /^<\/?\s*([a-z]+).*?>$/i;
const ELEMENT_MAP = { b: 'strong', strong: 'strong', i: 'em', em: 'em', p: 'p', ul: 'ul', ol: 'ol', li: 'li' };

function element(frame, key) {
  const tag = ELEMENT_MAP[frame.tag] || 'span';
  const className = tag === 'p' ? 'my-2 first:mt-0 last:mb-0' : tag === 'ul' ? 'my-2 list-disc pl-6' : tag === 'ol' ? 'my-2 list-decimal pl-6' : undefined;
  return React.createElement(tag, { key, className }, frame.children);
}

export function parseSafeTeachingContent(value) {
  const tokens = String(value || '').split(TAG_PATTERN).filter(Boolean);
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
