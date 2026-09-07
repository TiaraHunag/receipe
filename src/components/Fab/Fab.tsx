import React from 'react';
import styles from './Fab.module.css';

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 螢幕閱讀器用的說明文字，例如「新增菜色」 */
  label: string;
  /** 圖示，預設為 + */
  icon?: React.ReactNode;
}

/**
 * 右下角浮動新增按鈕（Floating Action Button）。
 * 食譜列表頁等需要「新增」入口的頁面都用這個元件，不要各自定位/畫一個圓形按鈕。
 */
export function Fab({ label, icon = '+', className, ...rest }: FabProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={[styles.fab, className || ''].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon}
    </button>
  );
}
