import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import s from './ui.module.css';

type Toast = { id: number; text: string; error?: boolean };
const Ctx = createContext<(text: string, error?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, error?: boolean) => {
    const id = Date.now() + Math.random();
    setItems((v) => [...v, { id, text, error }]);
    setTimeout(() => setItems((v) => v.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className={s.toastWrap} role="status">
        {items.map((t) => (
          <div key={t.id} className={`${s.toast} ${t.error ? s.toastError : ''}`}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
