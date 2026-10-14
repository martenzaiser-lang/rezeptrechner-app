// Generischer Modal-Rahmen: Overlay-Klick + Escape schliessen,
// Header mit Titel + ✕, Footer fuer Aktions-Buttons.

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, footer, maxWidth = 560 }) {
  const titleId = useId();
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length);
    if (!panel.current.contains(document.activeElement)) focusable()[0]?.focus();
    const onKey = (e) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== panel.current) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key === 'Tab') {
        const elements = focusable(), first = elements[0], last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; if (previous?.isConnected) previous.focus(); };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="modal" style={{ maxWidth, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id={titleId} style={{ margin: 0 }}>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && (
          <div className="modal-footer">{footer}</div>
        )}
      </div>
    </div>
  );
}
