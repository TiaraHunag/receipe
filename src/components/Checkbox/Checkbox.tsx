import React from 'react';
import styles from './Checkbox.module.css';
import { useAutoId } from '../useAutoId';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

/**
 * 打勾多選項，用於菜單規劃「選菜」畫面等需要多選的清單。
 */
export function Checkbox({ label, id, className, ...rest }: CheckboxProps) {
  const autoId = useAutoId('checkbox');
  const checkboxId = id || autoId;

  return (
    <label
      htmlFor={checkboxId}
      className={[styles.row, className || ''].filter(Boolean).join(' ')}
    >
      <input type="checkbox" id={checkboxId} className={styles.input} {...rest} />
      <span className={styles.box} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </label>
  );
}
