import React from 'react';
import { useEffect } from 'react';

function upsertMeta(selector, attributes) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertCanonical(href) {
  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export default function SEO({ title, description, image = '/assets/sblocco-hero-poster-v6.png' }) {
  useEffect(() => {
    document.title = title;

    const canonical = `${window.location.origin}${window.location.pathname}`;

    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'it_IT' });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: `${window.location.origin}${image}` });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertCanonical(canonical);
  }, [title, description, image]);

  return null;
}
