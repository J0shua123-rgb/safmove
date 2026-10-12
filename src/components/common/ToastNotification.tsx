import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, Bike } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'ride';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  showToast: () => {},
  dismissToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: Toast = { ...toast, id, duration: toast.duration ?? 4000 };
    setToasts((prev) => [newToast, ...prev.slice(0, 3)]); // Max 4 toasts

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => dismissToast(id), newToast.duration);
    }
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
  error: <AlertTriangle className="w-5 h-5 text-rose-600" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-sky-600" />,
  ride: <Bike className="w-5 h-5 text-emerald-700" />,
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50',
  error: 'border-rose-200 bg-rose-50',
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-sky-200 bg-sky-50',
  ride: 'border-emerald-300 bg-white',
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-2xl border shadow-xl shadow-black/10 backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-300 ${TOAST_STYLES[toast.type]}`}
        >
          <div className="flex-shrink-0 mt-0.5">{TOAST_ICONS[toast.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-snug">{toast.title}</p>
            {toast.message && (
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="flex-shrink-0 p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-black/5 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
