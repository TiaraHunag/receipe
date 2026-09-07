import React from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 圖示內容，建議傳入 svg 或 emoji（App 目前 Tab Bar 是用 emoji 圖示） */
  icon: React.ReactNode;
  /** 一定要提供，供螢幕閱讀器使用，例如「刪除」「編輯」 */
  label: string;
  /** 是否為危險動作（例如刪除），套用警示色 */
  danger?: boolean;
}

/**
 * 純圖示的圓形按鈕，用於列表項的編輯/刪除、頁首返回鍵等。
 * 不要在頁面上直接寫 <button>🗑</button>，一律用這個元件維持點擊區與樣式一致。
 */
export function IconButton({
  icon,
  label,
  danger = false,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={[styles.iconButton, danger ? styles.danger : '', className || '']
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon}
    </button>
  );
}
