import React from 'react';
import styles from './Checkbox.module.css';
import { useAutoId } from '../useAutoId';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  /** 'square'(預設，多選清單用) 或 'circle'(README 採買清單/常備品用的圓形勾選圈)。 */
  shape?: 'square' | 'circle';
  /** 名稱已經在列的別處顯示時，不重複顯示文字(仍保留給螢幕閱讀器用)。 */
  hideLabel?: boolean;
}

/**
 * 打勾多選項。方形用於菜單規劃「選菜」這類多選清單；
 * 圓形(shape="circle")用於採買清單/冰箱常備品這類「勾了就代表狀態改變」的情境。
 */
export function Checkbox({ label, shape = 'square', hideLabel = false, id, className, ...rest }: CheckboxProps) {
  const autoId = useAutoId('checkbox');
  const checkboxId = id || autoId;

  return (
    <label
      htmlFor={checkboxId}
      className={[styles.row, shape === 'circle' ? styles.hitArea : '', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      <input type="checkbox" id={checkboxId} className={styles.input} {...rest} />
      <span
        className={[styles.box, shape === 'circle' ? styles.circle : ''].filter(Boolean).join(' ')}
        aria-hidden="true"
      />
      <span className={[styles.label, hideLabel ? styles.srOnly : ''].filter(Boolean).join(' ')}>
        {label}
      </span>
    </label>
  );
}
