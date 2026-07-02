import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', title = '') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type, title }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  }, []);

  const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));

  const ICONS = { danger: '⚡', success: '✓', warning: '⚠', info: 'ℹ' };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span style={{ fontSize: 18 }}>{ICONS[t.type]}</span>
            <div style={{ flex: 1 }}>
              {t.title && <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: t.title ? 2 : 0 }}>{t.message}</div>
            </div>
            <button onClick={() => removeToast(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: 0 }}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
