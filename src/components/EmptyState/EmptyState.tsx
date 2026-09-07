import React from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** 圖示，可傳 emoji，例如採買清單頁用 🛒 */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** 例如「開發中」頁面可放一顆返回或了解更多的按鈕 */
  action?: React.ReactNode;
}

/**
 * 空清單／功能開發中的佔位畫面。ShoppingListPage 這類尚未開發的分頁，
 * 或食譜列表沒有資料時，都用這個元件呈現，維持文案與版面一致。
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.wrapper}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
