import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirmBtnRef = useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState({
        title: opts.title || 'Bestätigen',
        message: opts.message || '',
        confirmText: opts.confirmText || 'Ja',
        cancelText: opts.cancelText || 'Abbrechen',
        danger: !!opts.danger,
        resolve,
      });
    });
  }, []);

  const close = useCallback((result) => {
    setState((s) => {
      if (s) s.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!state) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    confirmBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => close(false)}
        >
          <div className="modal confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 id="confirm-title">{state.title}</h2>
            {state.message && <p className="confirm-message">{state.message}</p>}
            <div className="confirm-actions">
              <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
                {state.cancelText}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className={'btn ' + (state.danger ? 'btn-danger' : 'btn-primary')}
                onClick={() => close(true)}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm muss innerhalb von <ConfirmProvider> genutzt werden');
  return ctx;
}
