import React, { useState } from 'react';
import styles from './Input.module.css';
import { useAutoId } from '../useAutoId';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 欄位標籤，例如「名稱」 */
  label?: string;
  /** 中文錯誤訊息，例如「名稱為必填」 */
  error?: string;
  /** 輔助說明文字（無錯誤時顯示） */
  hint?: string;
  /**
   * 自動建議清單，例如類型、食材欄位根據歷史資料跳出下拉選項。
   * 用自己刻的下拉清單呈現（不用原生 <datalist>）——iOS Safari / WKWebView
   * 對 <datalist> 的支援極差，常常完全不會跳出建議，所以不能用它。
   * 傳入後，輸入框聚焦或輸入時，會顯示符合目前輸入內容的建議；
   * 點擊建議項目會呼叫 onSuggestionSelect（若未提供則直接寫入 value 並觸發 onChange）。
   */
  suggestions?: string[];
  /** 點擊建議項目時呼叫。不提供的話，元件會自己組一個符合 onChange 型別的合成事件。 */
  onSuggestionSelect?: (value: string) => void;
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
  onSuggestionSelect,
  value,
  onChange,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const autoId = useAutoId('input');
  const inputId = id || autoId;
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputValue = typeof value === 'string' ? value : '';
  const filtered = (suggestions || []).filter((s) =>
    s.toLowerCase().includes(inputValue.trim().toLowerCase())
  );

  const selectSuggestion = (s: string) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(s);
    } else if (onChange) {
      const fakeEvent = {
        target: { value: s },
        currentTarget: { value: s },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onChange(fakeEvent);
    }
    setShowSuggestions(false);
  };

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrap}>
        <input
          id={inputId}
          value={value}
          onChange={onChange}
          onFocus={(e) => {
            setShowSuggestions(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            // 延遲關閉，讓建議項目的 onMouseDown 能先觸發
            window.setTimeout(() => setShowSuggestions(false), 150);
            onBlur?.(e);
          }}
          className={[styles.input, error ? styles.inputError : '', className || '']
            .filter(Boolean)
            .join(' ')}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
        {suggestions && showSuggestions && filtered.length > 0 && (
          <ul className={styles.suggestions} role="listbox">
            {filtered.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className={styles.suggestionItem}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(s);
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
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
