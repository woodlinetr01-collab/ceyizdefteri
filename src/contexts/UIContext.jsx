import React, { createContext, useCallback, useContext, useRef, useState } from "react";

const UICtx = createContext(null);
export const useUI = () => useContext(UICtx);

export function UIProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null); // { title, message, danger, resolve }
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const confirm = useCallback(({ title, message, danger = false, confirmLabel = "Onayla", cancelLabel = "Vazgeç" }) => {
    return new Promise((resolve) => {
      setConfirmState({ title, message, danger, confirmLabel, cancelLabel, resolve });
    });
  }, []);

  const resolveConfirm = (result) => {
    confirmState?.resolve?.(result);
    setConfirmState(null);
  };

  const toast = useCallback((message, opts = {}) => {
    const id = Math.random().toString(36).slice(2, 9);
    const t = { id, message, actionLabel: opts.actionLabel, onAction: opts.onAction, tone: opts.tone || "default" };
    setToasts((prev) => [...prev, t]);
    const duration = opts.duration ?? 5000;
    timers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, duration);
    return id;
  }, []);

  const dismissToast = (id) => {
    clearTimeout(timers.current[id]);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <UICtx.Provider value={{ confirm, toast }}>
      {children}
      {confirmState && (
        <div className="modal-backdrop" onClick={() => resolveConfirm(false)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmState.title}</h3>
            <p>{confirmState.message}</p>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => resolveConfirm(false)}>{confirmState.cancelLabel}</button>
              <button className={confirmState.danger ? "btn-danger" : "btn-primary"} onClick={() => resolveConfirm(true)}>{confirmState.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <span>{t.message}</span>
            {t.actionLabel && (
              <button
                onClick={() => {
                  t.onAction?.();
                  dismissToast(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </UICtx.Provider>
  );
}
