import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

function normalizeOptions(options = []) {
  return options.map((option) => {
    if (Array.isArray(option)) return { value: String(option[0]), label: String(option[1]) };
    if (option && typeof option === 'object') return {
      value: String(option.value ?? ''),
      label: String(option.label ?? option.value ?? ''),
    };
    return { value: String(option), label: String(option) };
  });
}

export default function StudioSelect({
  value = '',
  options = [],
  onChange,
  disabled = false,
  ariaLabel = 'Choose an option',
  placeholder = 'Choose…',
  className = '',
}) {
  const normalized = useMemo(() => normalizeOptions(options), [options]);
  const selectedIndex = normalized.findIndex((option) => option.value === String(value ?? ''));
  const selected = selectedIndex >= 0 ? normalized[selectedIndex] : null;
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const [menuStyle, setMenuStyle] = useState(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const listboxId = useId();

  function measure() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 8;
    const availableBelow = window.innerHeight - rect.bottom - gap;
    const estimatedHeight = Math.min(320, Math.max(80, normalized.length * 48 + 16));
    const openAbove = availableBelow < Math.min(220, estimatedHeight) && rect.top > availableBelow;
    const top = openAbove
      ? Math.max(gap, rect.top - estimatedHeight - gap)
      : Math.min(window.innerHeight - gap - Math.min(estimatedHeight, availableBelow || estimatedHeight), rect.bottom + gap);

    setMenuStyle({
      position: 'fixed',
      left: Math.max(gap, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 220) - gap)),
      top,
      width: Math.min(Math.max(rect.width, 220), window.innerWidth - gap * 2),
      maxHeight: Math.max(96, openAbove ? rect.top - gap * 2 : window.innerHeight - top - gap),
      zIndex: 9999,
    });
  }

  useEffect(() => {
    if (!open) return undefined;
    measure();
    const update = () => measure();
    const close = (event) => {
      if (!triggerRef.current?.contains(event.target) && !event.target.closest?.(`[data-studio-select-menu="${listboxId}"]`)) {
        setOpen(false);
      }
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    document.addEventListener('mousedown', close);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      document.removeEventListener('mousedown', close);
    };
  }, [open, listboxId, normalized.length]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function focusOption(index) {
    if (!normalized.length) return;
    const next = Math.max(0, Math.min(index, normalized.length - 1));
    setHighlighted(next);
    window.requestAnimationFrame(() => optionRefs.current[next]?.focus());
  }

  function openMenu() {
    if (disabled || !normalized.length) return;
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
    window.requestAnimationFrame(measure);
  }

  function choose(option) {
    onChange?.(option.value);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function triggerKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openMenu();
      window.requestAnimationFrame(() => focusOption(selectedIndex >= 0 ? selectedIndex : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu();
      window.requestAnimationFrame(() => focusOption(selectedIndex >= 0 ? selectedIndex : normalized.length - 1));
    }
  }

  function optionKeyDown(event, index) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(normalized.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(normalized[index]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const menu = open && menuStyle && typeof document !== 'undefined'
    ? createPortal(
      <div
        id={listboxId}
        data-studio-select-menu={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        style={menuStyle}
        className="overflow-y-auto rounded-2xl border border-orange-200/80 bg-[#fffdf8] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.28)] dark:border-orange-300/20 dark:bg-[#17201d]"
      >
        {normalized.map((option, index) => {
          const isSelected = option.value === String(value ?? '');
          const isHighlighted = index === highlighted;
          return (
            <button
              key={option.value + '-' + index}
              ref={(node) => { optionRefs.current[index] = node; }}
              type="button"
              role="option"
              aria-selected={isSelected}
              onFocus={() => setHighlighted(index)}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => choose(option)}
              onKeyDown={(event) => optionKeyDown(event, index)}
              className={`focus-ring flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left text-sm font-black leading-5 transition ${
                isSelected
                  ? 'bg-orange-100 text-orange-950 dark:bg-orange-300/15 dark:text-orange-50'
                  : isHighlighted
                    ? 'bg-[#f5efe4] text-ink dark:bg-white/10 dark:text-white'
                    : 'text-ink/75 hover:bg-[#f5efe4] dark:text-white/75 dark:hover:bg-white/10'
              }`}
            >
              <span className="min-w-0 whitespace-normal">{option.label}</span>
              {isSelected ? <Check className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={triggerKeyDown}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className={`focus-ring flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-left text-sm font-black normal-case tracking-normal text-ink shadow-sm transition hover:border-orange-300 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.05] dark:text-white ${open ? 'border-orange-400 ring-4 ring-orange-100 dark:border-orange-300/50 dark:ring-orange-300/10' : ''} ${className}`}
      >
        <span className={`min-w-0 truncate ${selected ? '' : 'text-ink/45 dark:text-white/45'}`}>{selected?.label || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-orange-600 transition dark:text-orange-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {menu}
    </>
  );
}
