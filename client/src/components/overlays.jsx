// Toast notifications and a confirm dialog, replacing window.alert / window.confirm.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const dialogRef = useRef(null);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((list) => [...list.slice(-2), { id, type, message }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  // confirm({ title, message, confirmLabel, cancelLabel, tone: 'danger' }) → Promise<boolean>
  const confirm = useCallback((options) => new Promise((resolve) => setDialog({ ...options, resolve })), []);

  useEffect(() => {
    if (dialog && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [dialog]);

  const close = (result) => {
    dialogRef.current?.close();
    dialog?.resolve(result);
    setDialog(null);
  };

  const value = useMemo(() => ({
    toast: { success: (m) => push('success', m), error: (m) => push('error', m) },
    confirm,
  }), [push, confirm]);

  return (
    <UIContext.Provider value={value}>
      {children}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            {t.type === 'success' ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
            <span>{t.message}</span>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {dialog && (
        <dialog
          ref={dialogRef}
          className="dialog"
          aria-labelledby="dialog-title"
          onCancel={(e) => { e.preventDefault(); close(false); }}
          onClick={(e) => { if (e.target === e.currentTarget) close(false); }}
        >
          <div className="dialog-body">
            <h2 id="dialog-title">{dialog.title}</h2>
            {dialog.message && <p className="muted">{dialog.message}</p>}
            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button type="button" autoFocus className={`btn ${dialog.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
