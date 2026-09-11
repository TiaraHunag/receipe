import { Tag } from './Tag/Tag';
import { normalizeTagColor } from './Tag/colors';

/**
 * 食材/分類標籤的專用包裝:外部只需要傳「名稱」跟「可能來自資料庫的顏色字串」,
 * 顏色正規化與實際渲染都交給共用的 Tag 元件處理,確保跟食譜頁、菜色詳細頁看到的
 * 標籤樣式與顏色來源完全一致。
 */
function IngredientTag({ name, colorKey }: { name: string; colorKey?: string | null }) {
  return <Tag color={normalizeTagColor(colorKey)}>{name}</Tag>;
}

export default IngredientTag;