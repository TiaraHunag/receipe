import React from 'react';
import styles from './Card.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 是否可點擊（例如列表項可整塊點入詳細頁），加上 hover/active 回饋 */
  interactive?: boolean;
}

/**
 * 通用內容卡片：食譜列表項、詳細頁區塊等都用這個包裝。
 * 用邊框而非陰影表現層次，避免整頁到處都是同一種灰色陰影卡片。
 */
export function Card({ interactive = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={[styles.card, interactive ? styles.interactive : '', className || '']
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
