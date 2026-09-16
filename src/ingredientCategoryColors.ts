import { getColor } from './components/Tag/colors';

/**
 * 食材分類色盤 —— 對齊 design_handoff_receipe_ui/README.md 的六色設計
 * （肉類/海鮮/蔬菜/豆製品/調味料/乾貨）。這是全新的一套,跟 Tag/colors.ts
 * 那份「九色標籤盤」是兩個獨立系統：九色盤是舊版拿來幫食譜的「分類/餐點
 * 類型」雜湊上色用的,這份六色盤專門給「食材分類」用,而且直接存 hex 到
 * ingredient_categories.color,不像九色盤存的是 key 字串。
 *
 * 新建立的分類一律從這裡選、直接存 hex；「顯示」時要相容舊資料可能還是
 * 存著九色 key 字串,所以顯示一律呼叫 resolveIngredientCategoryColor()。
 */
export interface IngredientCategoryColorOption {
  key: string;
  label: string;
  bg: string;
}

export const INGREDIENT_CATEGORY_COLORS: IngredientCategoryColorOption[] = [
  { key: '#b4552f', label: '肉類', bg: '#b4552f' },
  { key: '#4f7d8c', label: '海鮮', bg: '#4f7d8c' },
  { key: '#6d7d51', label: '蔬菜', bg: '#6d7d51' },
  { key: '#a8823c', label: '豆製品', bg: '#a8823c' },
  { key: '#8b6f4e', label: '調味料', bg: '#8b6f4e' },
  { key: '#7a6a8a', label: '乾貨', bg: '#7a6a8a' },
];

/** 對應 tokens.css 的 --ing-cat-none,「未分類」的圓點顏色 */
export const INGREDIENT_CATEGORY_NONE_COLOR = '#cfd2bc';

/**
 * 把 ingredient_categories.color 欄位的值(可能是新的 hex、舊的九色 key 字串,
 * 或 null/undefined)轉成一個能直接當 CSS 顏色用的 hex 字串。
 * 所有要畫「分類色點」的地方都應該呼叫這個函式,不要自己判斷格式。
 */
export function resolveIngredientCategoryColor(color: string | null | undefined): string {
  if (!color) return INGREDIENT_CATEGORY_NONE_COLOR;
  if (color.startsWith('#')) return color;
  // 舊資料還是存九色 key(例如 'green'):借用該色的「深字色」當實心圓點顏色,
  // 等使用者重新指定分類顏色後就會換成新的 hex。
  return getColor(color).text;
}
