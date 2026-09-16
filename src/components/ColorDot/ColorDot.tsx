import styles from './ColorDot.module.css';

/** ColorDot 只需要這三個欄位,不綁定任何特定色盤——
 *  舊版九色 ColorOption(Tag/colors.ts)跟新版六色 IngredientCategoryColorOption
 *  (ingredientCategoryColors.ts)都符合這個形狀,可以直接傳進來用。 */
export interface ColorSwatch {
  key: string;
  label: string;
  bg: string;
}

export interface ColorDotProps {
  /** 要顯示的顏色選項 */
  color: ColorSwatch;
  /** 目前是否為已選中的顏色,會加上外框標示 */
  selected?: boolean;
  onClick: () => void;
  /** 圓點直徑。表單裡內嵌的小選色器用預設 20px；
   *  「食材分類」畫面獨立一排的色票用 30px。 */
  size?: number;
}

/**
 * 顏色選擇用的圓點按鈕。視覺上維持小巧的圓點,但實際點擊區撐滿 44×44pt
 * (iOS 最小觸控標準),不要在頁面上直接刻 <button style={{ width: 20, height: 20 }}>
 * 這種小按鈕——ProfilePage、DishFormPage、IngredientManagementPage 的
 * 「選顏色新增分類」都要用這個元件。
 */
export function ColorDot({ color, selected = false, onClick, size = 20 }: ColorDotProps) {
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
          width: size,
          height: size,
          background: color.bg,
          borderColor: selected ? 'var(--text)' : 'var(--border)',
          borderWidth: selected ? 2.5 : 1.5,
        }}
      />
    </button>
  );
}
