import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** Wrap the app in this once; then call `useToast()` anywhere to show a message. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((message) => {
    const id = ++nextId.current;
    setToast({ id, message });
    setTimeout(() => setToast((current) => (current?.id === id ? null : current)), 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast &&
        createPortal(
          <div key={toast.id} className="glass glass-strong toast" role="status">
            {toast.message}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

/** Returns a function that shows a short message at the top of the screen. */
export const useToast = () => useContext(ToastContext);
