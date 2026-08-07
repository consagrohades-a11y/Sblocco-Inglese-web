import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function SbloccoSelect({
  value = '',
  options = [],
  onChange,
  disabled = false,
  ariaLabel,
  ariaLabelledby,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const listboxId = useId();
  const selectedIndex = options.findIndex((option) => option === value);

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function focusOption(index) {
    if (!options.length) return;
    const nextIndex = Math.max(0, Math.min(index, options.length - 1));
    setHighlightedIndex(nextIndex);
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  }

  function openAt(index) {
    if (disabled || !options.length) return;
    setOpen(true);
    focusOption(index);
  }

  function choose(option) {
    onChange(option);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleTriggerKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openAt(selectedIndex >= 0 ? selectedIndex : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(selectedIndex >= 0 ? selectedIndex : options.length - 1);
    }
  }

  function handleOptionKeyDown(event, index) {
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
      focusOption(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(options[index]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <span ref={rootRef} className={`relative ${compact ? 'mx-1 my-1 inline-block max-w-full align-baseline' : 'block w-full'}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openAt(selectedIndex >= 0 ? selectedIndex : 0)}
        onKeyDown={handleTriggerKeyDown}
        className={`focus-ring inline-flex min-h-11 items-center justify-between gap-3 rounded-xl border-2 bg-white text-left text-base font-black text-ink shadow-sm transition hover:border-moss disabled:cursor-not-allowed disabled:opacity-55 dark:bg-surface-800 dark:text-white ${open ? 'border-moss ring-4 ring-mint/70 dark:border-emerald-300 dark:ring-emerald-300/10' : 'border-moss/25 dark:border-emerald-300/25'} ${compact ? 'min-w-40 max-w-full px-3 py-2' : 'w-full px-4 py-3'}`}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
      >
        <span className={value ? '' : 'text-ink/55 dark:text-white/60'}>{value || 'Scegli...'}</span>
        <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-moss transition dark:text-mint ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled ? (
        <span
          id={listboxId}
          role="listbox"
          aria-label={ariaLabelledby ? undefined : ariaLabel || 'Scegli una risposta'}
          aria-labelledby={ariaLabelledby}
          className="absolute left-0 top-full z-40 mt-2 grid max-h-64 w-max min-w-full max-w-[min(24rem,calc(100vw-2rem))] gap-1 overflow-y-auto rounded-2xl border border-moss/20 bg-paper p-2 shadow-[0_18px_50px_rgba(24,34,31,0.20)] dark:border-white/15 dark:bg-surface-900 dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
        >
          {options.map((option, index) => {
            const selected = option === value;
            const highlighted = index === highlightedIndex;
            return (
              <button
                key={`${option}-${index}`}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="option"
                aria-selected={selected}
                onFocus={() => setHighlightedIndex(index)}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => choose(option)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={`focus-ring flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left text-sm font-black leading-5 transition ${selected ? 'bg-mint text-ink dark:bg-emerald-400/20 dark:text-white' : highlighted ? 'bg-linen text-ink dark:bg-white/10 dark:text-white' : 'text-ink/80 hover:bg-linen dark:text-white/80 dark:hover:bg-white/10'}`}
              >
                <span className="whitespace-normal">{option}</span>
                {selected ? <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-moss dark:text-mint" /> : null}
              </button>
            );
          })}
        </span>
      ) : null}
    </span>
  );
}
