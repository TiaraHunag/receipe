import React, { useId } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  /** 第一個選項文字，例如「全部類型」，不會被當成實際選取值 */
  placeholder?: string;
}

/**
 * App 內唯一的下拉選單元件，用於列表頁「依類型/食材篩選」等情境。
 */
export function Select({
  label,
  error,
  options,
  placeholder,
  id,
  className,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id || autoId;

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={[styles.select, error ? styles.selectError : '', className || '']
          .filter(Boolean)
          .join(' ')}
        aria-invalid={!!error}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
