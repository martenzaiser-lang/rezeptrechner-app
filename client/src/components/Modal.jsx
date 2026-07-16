// Generischer Modal-Rahmen: Overlay-Klick + Escape schliessen,
// Header mit Titel + ✕, Footer fuer Aktions-Buttons.

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, footer, maxWidth = 560 }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>{children}</div>
        {footer && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>{footer}</div>
        )}
      </div>
    </div>
  );
}
