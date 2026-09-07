import React from 'react';
import styles from './Tag.module.css';
import { TagColorKey } from './colors';

export interface TagProps {
  children: React.ReactNode;
  /** 對應 colors.ts 裡的九色 key；不傳則使用預設灰色 */
  color?: TagColorKey;
  /** 是否顯示為可點擊（例如篩選用途） */
  onClick?: () => void;
  className?: string;
}

/**
 * 食材/分類彩色標籤，顏色一律來自 colors.ts 的九色色盤（IngredientTag 的通用版本）。
 * 不要在頁面上用內聯樣式自己配色來畫標籤。
 */
export function Tag({ children, color = 'grey', onClick, className }: TagProps) {
  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      onClick={onClick}
      className={[styles.tag, styles[color], onClick ? styles.clickable : '', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Component>
  );
}
