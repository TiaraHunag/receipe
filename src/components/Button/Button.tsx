import React from 'react';
import styles from './Button.module.css';
import { Spinner } from '../Spinner/Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 視覺樣式，決定顏色與強調程度 */
  variant?: ButtonVariant;
  /** 尺寸 */
  size?: ButtonSize;
  /** 是否撐滿容器寬度 */
  fullWidth?: boolean;
  /** 送出中狀態：顯示 loading 並自動 disable，避免重複送出 */
  loading?: boolean;
}

/**
 * App 內唯一允許使用的按鈕元件。
 * 任何頁面都不應該自己寫 <button style={...}> 或自訂顏色的按鈕，
 * 一律透過這裡的 variant / size 組合來取得需要的樣式。
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        styles.button,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
