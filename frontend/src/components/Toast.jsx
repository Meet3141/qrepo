import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Minimal toast system. `toast.success/error/info(message)` can be called from anywhere,
 * including non-React code such as the axios interceptors; <Toaster /> renders them.
 */
const DURATION = { success: 4000, info: 5000, error: 7000 };
const DEDUPE_MS = 3000;
const MAX_VISIBLE = 4;

let toasts = [];
let nextId = 1;
const listeners = new Set();
const recent = new Map();

const emit = () => listeners.forEach((listener) => listener(toasts));

function dismiss(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function show(kind, message) {
  if (!message) return;
  // The same failure reported by several layers (or a double click) shows once
  const key = `${kind}:${message}`;
  const now = Date.now();
  if (now - (recent.get(key) || 0) < DEDUPE_MS) return;
  recent.set(key, now);

  const id = nextId++;
  toasts = [...toasts, { id, kind, message }].slice(-MAX_VISIBLE);
  emit();
  setTimeout(() => dismiss(id), DURATION[kind]);
}

export const toast = {
  success: (message) => show('success', message),
  error: (message) => show('error', message),
  info: (message) => show('info', message),
};

const STYLES = {
  success: { icon: 'check_circle', className: 'border-primary/30', iconClass: 'text-primary' },
  error: { icon: 'error', className: 'border-error/40', iconClass: 'text-error' },
  info: { icon: 'info', className: 'border-outline-variant', iconClass: 'text-secondary' },
};

export function Toaster() {
  const [items, setItems] = useState(toasts);

  useEffect(() => {
    listeners.add(setItems);
    // Toasts raised by effects that ran before this one (e.g. on first page load)
    setItems(toasts);
    return () => listeners.delete(setItems);
  }, []);

  return createPortal(
    // Top-centre so toasts never cover the action buttons at the bottom of dialogs
    <div className="fixed z-[10000] top-3 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex flex-col gap-2 sm:w-96 pointer-events-none">
      {items.map((t) => {
        const style = STYLES[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 p-3 rounded-lg border bg-surface-container-lowest shadow-lg text-[13px] text-on-surface ${style.className}`}
          >
            <span className={`material-symbols-outlined text-[20px] shrink-0 ${style.iconClass}`}>{style.icon}</span>
            <p className="flex-1 leading-snug break-words">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-on-surface-variant hover:text-on-surface shrink-0"
              aria-label="Dismiss notification"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
