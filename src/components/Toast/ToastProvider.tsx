import React, { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  /** 顯示一則短暫提示，例如「儲存失敗，請檢查儲存空間」 */
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

/**
 * 全域提示訊息 Provider。請在 App 最外層包一次：
 *   <ToastProvider><App /></ToastProvider>
 * 頁面內任何「錯誤訊息中文提示」都應該透過 useToast() 呼叫，
 * 不要各自 alert() 或畫自己的提示框。
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className={styles.stack}>
          {toasts.map((t) => (
            <div key={t.id} className={[styles.toast, styles[t.kind]].join(' ')}>
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast 必須在 <ToastProvider> 內使用');
  }
  return ctx;
}
