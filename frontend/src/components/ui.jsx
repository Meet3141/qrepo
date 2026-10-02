import React from 'react';
import Modal from './Modal';

/** Shared form/control styles used by management pages. */
export const inputClass =
  'w-full h-10 px-3 bg-surface-container-high border border-outline rounded-lg text-sm text-on-surface focus:border-primary outline-none transition-colors placeholder:text-outline disabled:opacity-60';
export const textareaClass =
  'w-full px-3 py-2 bg-surface-container-high border border-outline rounded-lg text-sm text-on-surface focus:border-primary outline-none transition-colors resize-none placeholder:text-outline';
export const primaryButton =
  'px-4 py-2 text-[13px] bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2';
export const secondaryButton =
  'px-4 py-2 text-[13px] text-secondary bg-surface-container-lowest border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2';
export const dangerButton =
  'px-4 py-2 text-[13px] bg-error text-on-error rounded-lg font-medium hover:bg-error/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2';

export function Field({ label, hint, children }) {
  // Wrapping <label> gives the control its accessible name
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-on-surface mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-on-surface-variant mt-1">{hint}</span>}
    </label>
  );
}

/** For fields made of several controls (each with its own label): a group, not a <label>. */
export function FieldGroup({ label, hint, children }) {
  return (
    <div role="group" aria-label={typeof label === 'string' ? label : undefined}>
      <span className="block text-[11px] font-semibold text-on-surface mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-on-surface-variant mt-1">{hint}</span>}
    </div>
  );
}

export function Banner({ kind = 'error', children, onDismiss }) {
  if (!children) return null;
  const styles = {
    error: 'bg-error-container text-on-error-container',
    success: 'bg-primary-container text-on-primary-container',
    info: 'bg-secondary-container text-on-secondary-container',
    warning: 'bg-tertiary-container text-on-tertiary-container',
  };
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`p-3 rounded-lg text-[13px] flex items-start gap-2 ${styles[kind]}`}>
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-70 hover:opacity-100" aria-label="Dismiss">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}

/** Error state for a view whose data failed to load (the toast already explained why). */
export function LoadError({ what = 'this page', onRetry }) {
  return (
    <div role="alert" className="p-4 rounded-xl border border-error/30 bg-error-container/40 flex flex-col sm:flex-row sm:items-center gap-3">
      <span className="material-symbols-outlined text-error">cloud_off</span>
      <p className="flex-1 text-[13px] text-on-surface">Couldn't load {what}.</p>
      {onRetry && <button onClick={onRetry} className={secondaryButton}>Try again</button>}
    </div>
  );
}

export function Dialog({ title, onClose, children, width = 'max-w-md' }) {
  return (
    <Modal onClose={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className={`bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-outline-variant shrink-0">
          <h3 className="text-[15px] font-semibold text-on-surface">{title}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full" aria-label="Close">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </Modal>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = true, busy, onConfirm, onClose }) {
  return (
    <Dialog title={title} onClose={onClose} width="max-w-sm">
      <div className="p-5 flex flex-col gap-4">
        <p className="text-[13px] text-on-surface">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={secondaryButton}>Cancel</button>
          <button onClick={onConfirm} disabled={busy} className={danger ? dangerButton : primaryButton}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function StatusPill({ status }) {
  const styles = {
    DRAFT: 'bg-surface-variant text-on-surface-variant',
    PENDING_REVIEW: 'bg-tertiary-container text-on-tertiary-container',
    CHANGES_REQUESTED: 'bg-secondary-container text-on-secondary-container',
    APPROVED: 'bg-primary-container text-on-primary-container',
    REJECTED: 'bg-error-container text-on-error-container',
  };
  const labels = {
    DRAFT: 'Draft', PENDING_REVIEW: 'Pending Review', CHANGES_REQUESTED: 'Changes Requested',
    APPROVED: 'Approved', REJECTED: 'Rejected',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[status] || styles.DRAFT}`}>
      {labels[status] || status}
    </span>
  );
}

export function initials(nameOrEmail = '') {
  const base = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0].replace(/[._-]+/g, ' ') : nameOrEmail;
  return base.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export function timeAgo(iso) {
  if (!iso) return '';
  // The API stores UTC; timestamps without an offset (e.g. from SQLite) must not be read as local time
  const utc = /([zZ]|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`;
  const seconds = Math.max(0, (Date.now() - new Date(utc).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const units = [[86400 * 365, 'y'], [86400 * 30, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return 'just now';
}

export function formatBytes(bytes) {
  if (bytes == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export const enumLabel = (value = '') =>
  value.toLowerCase().split('_').map((w, i) => (i === 0 ? w[0]?.toUpperCase() + w.slice(1) : w)).join(' ');
