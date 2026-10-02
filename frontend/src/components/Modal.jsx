import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal renders its children into document.body via a React Portal,
 * bypassing any parent stacking context, overflow-hidden, or transform
 * that would otherwise clip fixed-position overlays.
 */
export default function Modal({ onClose, children }) {
  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {children}
    </div>,
    document.body
  );
}
