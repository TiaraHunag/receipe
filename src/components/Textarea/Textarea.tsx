import React from 'react';
import styles from './Textarea.module.css';
import { useAutoId } from '../useAutoId';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * App 內唯一的多行文字輸入元件，用於備註、食譜內容文字區塊等。
 */
export function Textarea({
  label,
  error,
  hint,
  id,
  className,
  rows = 4,
  ...rest
}: TextareaProps) {
  const autoId = useAutoId('textarea');
  const areaId = id || autoId;

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={areaId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        rows={rows}
        className={[styles.textarea, error ? styles.textareaError : '', className || '']
          .filter(Boolean)
          .join(' ')}
        aria-invalid={!!error}
        {...rest}
      />
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : hint ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
}
