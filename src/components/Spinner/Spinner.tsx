import React from 'react';
import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: 'sm' | 'md';
  /** 淺色版本，用於深色背景（例如 primary 按鈕內） */
  inverse?: boolean;
}

/** 統一的載入中轉圈圖示，按鈕 loading 狀態、頁面資料載入中都用這個。 */
export function Spinner({ size = 'md', inverse = false }: SpinnerProps) {
  return (
    <span
      className={[styles.spinner, styles[size], inverse ? styles.inverse : '']
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-label="載入中"
    />
  );
}
