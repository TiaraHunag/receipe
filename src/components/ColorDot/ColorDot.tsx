import type { ColorOption } from '../Tag/colors';
import styles from './ColorDot.module.css';

export interface ColorDotProps {
  /** 要顯示的顏色選項(含 key/label/bg/text) */
  color: ColorOption;
  /** 目前是否為已選中的顏色,會加上外框標示 */
  selected?: boolean;
  onClick: () => void;
}

/**
 * 顏色選擇用的圓點按鈕。視覺上維持小巧的圓點,但實際點擊區撐滿 44×44pt
 * (iOS 最小觸控標準),不要在頁面上直接刻 <button style={{ width: 20, height: 20 }}>
 * 這種小按鈕——ProfilePage、DishFormPage 的「選顏色新增分類」都要用這個元件。
 */
export function ColorDot({ color, selected = false, onClick }: ColorDotProps) {
  return (
    <button
      type="button"
      aria-label={`選擇顏色:${color.label}`}
      aria-pressed={selected}
      title={color.label}
      onClick={onClick}
      className={styles.hitArea}
    >
      <span
        className={styles.dot}
        style={{
          background: color.bg,
          borderColor: selected ? 'var(--color-text)' : 'var(--color-border)',
          borderWidth: selected ? 2 : 1,
        }}
      />
    </button>
  );
}