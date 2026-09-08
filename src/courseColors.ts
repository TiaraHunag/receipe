import { CourseType } from './db';
import type { TagColorKey } from './components';

/**
 * 課程分類(主食/主菜/副菜/蔬菜/湯品/附餐) → Tag 顏色的固定對應。
 * 純粹是 UI 上用來做分類辨識的視覺提示,跟模組四的食材分類色盤無關,
 * 只是借用同一份 9 色 Tag 元件。MenuPage(週總覽)跟 DishListPage
 * (食譜列表依餐點分類分組時)共用這份對照,顏色才會一致。
 */
export const COURSE_TAG_COLOR: Record<CourseType, TagColorKey> = {
  staple: 'yellow',
  main: 'red',
  side: 'orange',
  vegetable: 'green',
  soup: 'blue',
  extra: 'purple',
};
