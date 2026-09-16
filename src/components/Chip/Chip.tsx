import React from 'react';
import styles from './Chip.module.css';

/**
 * 固定語意色的小標籤/角標，對齊 design_handoff_receipe_ui/README.md
 * 的 Design Tokens——跟舊版 Tag 元件的「九色雜湊上色」是兩套不同邏輯：
 * Chip 的顏色由「這是什麼種類的資訊」決定（分類/餐點類型/自訂標籤/
 * 各種狀態），同一種類永遠同一個顏色，不看文字內容雜湊。
 *
 * - category：餐點分類（灰綠底）
 * - course：餐點類型（主色淺底）
 * - tag：自訂標籤 #tag（強調色淺底）
 * - recipe / prepAhead：菜色列表、詳情頁的「食譜」「可先做」角標
 * - inStock / staple / needBuy：食材的「冰箱有／常備／要買」狀態
 * - selected / outline：篩選用的可點擊 chip 的選中／未選中樣式
 */
export type ChipTone =
  | 'category'
  | 'course'
  | 'tag'
  | 'recipe'
  | 'prepAhead'
  | 'inStock'
  | 'staple'
  | 'needBuy'
  | 'selected'
  | 'outline';

export interface ChipProps {
  tone: ChipTone;
  /** chip：一般分類/標籤（10.5px/600）。badge：角標（10.5px/700，padding 稍窄）。 */
  variant?: 'chip' | 'badge';
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function Chip({
  tone,
  variant = 'chip',
  icon,
  children,
  onClick,
  className,
}: ChipProps) {
  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[styles.base, styles[variant], styles[tone], onClick ? styles.clickable : '', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      {icon}
      {children}
    </Component>
  );
}
