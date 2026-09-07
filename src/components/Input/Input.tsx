import React, { useId } from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 欄位標籤，例如「名稱」 */
  label?: string;
  /** 中文錯誤訊息，例如「名稱為必填」 */
  error?: string;
  /** 輔助說明文字（無錯誤時顯示） */
  hint?: string;
  /**
   * 自動建議清單（沿用 datalist 做法），例如類型、食材欄位根據歷史資料
   * 跳出下拉選項。傳入後元件會自動產生對應的 <datalist> 並掛上 list 屬性。
   */
  suggestions?: string[];
}

/**
 * App 內唯一的文字輸入框元件。表單頁（新增/編輯食譜等）一律用這個，
 * 不要另外寫 <input style={...}> 或不同的邊框/焦點樣式。
 */
export function Input({
  label,
  error,
  hint,
  id,
  className,
  suggestions,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const listId = suggestions ? `${inputId}-suggestions` : undefined;

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        list={listId}
        className={[styles.input, error ? styles.inputError : '', className || '']
          .filter(Boolean)
          .join(' ')}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
      {error ? (
        <p id={`${inputId}-error`} className={styles.error}>
          {error}
        </p>
      ) : hint ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
}
