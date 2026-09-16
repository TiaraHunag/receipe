import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 寬度，可傳數字(px)或任何 CSS 長度字串，預設撐滿容器 */
  width?: number | string;
  /** 高度，可傳數字(px)或任何 CSS 長度字串，預設 16px(貼近一行文字) */
  height?: number | string;
  /** 圓角，預設用 --radius-control；圓形頭像/圖示可傳 --radius-pill */
  radius?: string;
}

/**
 * 載入中佔位色塊，用於組成各頁面的骨架屏(貼近實際內容外型的灰色色塊 + 閃動效果)。
 * 不要單獨用轉圈圈 Spinner 取代整頁內容 — 骨架屏請用這個元件組出對應版面的形狀，
 * 參考 DishListPage / MenuPage / ShoppingListPage 內的 xxxSkeleton() 寫法。
 */
export function Skeleton({ width = '100%', height = 16, radius, style, className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[styles.skeleton, className || ''].filter(Boolean).join(' ')}
      style={{
        width,
        height,
        borderRadius: radius || 'var(--radius-control)',
        ...style,
      }}
      {...rest}
    />
  );
}