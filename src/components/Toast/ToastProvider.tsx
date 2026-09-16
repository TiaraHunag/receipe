import React, { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

type ToastKind = 'success' | 'error' | 'info';

/** 選填的動作按鈕（例如「復原」），以及自訂顯示時長。 */
interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  /** 顯示時長(ms)。預設 1900ms；帶動作按鈕的提示(如復原)建議給久一點，例如 5000。 */
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  /** 顯示一則短暫提示，例如「儲存失敗，請檢查儲存空間」；
   *  第三個參數可加「復原」等動作按鈕，並拉長顯示時長。 */
  showToast: (message: string, kind?: ToastKind, options?: ToastOptions) => void;
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

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'info', options?: ToastOptions) => {
      const id = ++idCounter;
      setToasts((prev) => [
        ...prev,
        { id, message, kind, actionLabel: options?.actionLabel, onAction: options?.onAction },
      ]);
      window.setTimeout(() => {
        dismiss(id);
      }, options?.duration ?? 1900);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className={styles.stack}>
          {toasts.map((t) => (
            <div key={t.id} className={[styles.toast, styles[t.kind]].join(' ')}>
              <span>{t.message}</span>
              {t.actionLabel && t.onAction && (
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => {
                    t.onAction?.();
                    dismiss(t.id);
                  }}
                >
                  {t.actionLabel}
                </button>
              )}
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
