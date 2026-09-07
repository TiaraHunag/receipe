/**
 * 九色標籤色盤 —— 唯一來源。
 *
 * 這份清單就是模組四（食材/分類管理）裡「新增分類」時可選的顏色，
 * 也是 Tag 元件的合法 color 值。新增分類時只能從這 9 個 key 裡選，
 * 不要在別的地方另外定義顏色或 hex 值。
 */
export const TAG_COLOR_KEYS = [
  'grey',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
] as const;

export type TagColorKey = (typeof TAG_COLOR_KEYS)[number];

export const TAG_COLOR_LABELS: Record<TagColorKey, string> = {
  grey: '灰',
  brown: '棕',
  orange: '橘',
  yellow: '黃',
  green: '綠',
  blue: '藍',
  purple: '紫',
  pink: '粉',
  red: '紅',
};
