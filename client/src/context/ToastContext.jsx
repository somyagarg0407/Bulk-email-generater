import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const value = useMemo(() => ({
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
  }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-md border px-4 py-3 text-sm shadow-lg ${t.tone === 'error' ? 'border-red-200 bg-white text-red-800' : 'border-nitd-200 bg-white text-ink'}`}>
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${t.tone === 'error' ? 'bg-red-600' : 'bg-nitd-600'}`} aria-hidden="true" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
