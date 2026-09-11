/**
 * 九色標籤色盤 —— 全 App 唯一來源。
 *
 * 這份清單同時是:
 *  1. Tag 元件的合法 color 值
 *  2. 「食材分類」「新增分類」時可選的顏色
 *  3. IngredientTag(食材/分類標籤)實際渲染顏色的依據
 * 不要在其他地方(例如頁面裡)另外定義顏色 hex 值或另一份 key 清單。
 * 實際顏色數值一律引用 tokens.css 的 CSS 變數,tokens.css 才是顏色的真正定義處,
 * 這裡只是把「九色的 key、中文標籤、對應的 CSS 變數」包成好用的介面。
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

/** 每個顏色實際的背景/文字顏色,一律引用 tokens.css 的 CSS 變數(--tag-*-bg / --tag-*-text) */
const TAG_COLOR_VALUES: Record<TagColorKey, { bg: string; text: string }> = {
  grey: { bg: 'var(--tag-grey-bg)', text: 'var(--tag-grey-text)' },
  brown: { bg: 'var(--tag-brown-bg)', text: 'var(--tag-brown-text)' },
  orange: { bg: 'var(--tag-orange-bg)', text: 'var(--tag-orange-text)' },
  yellow: { bg: 'var(--tag-yellow-bg)', text: 'var(--tag-yellow-text)' },
  green: { bg: 'var(--tag-green-bg)', text: 'var(--tag-green-text)' },
  blue: { bg: 'var(--tag-blue-bg)', text: 'var(--tag-blue-text)' },
  purple: { bg: 'var(--tag-purple-bg)', text: 'var(--tag-purple-text)' },
  pink: { bg: 'var(--tag-pink-bg)', text: 'var(--tag-pink-text)' },
  red: { bg: 'var(--tag-red-bg)', text: 'var(--tag-red-text)' },
};

/** 給「顏色選擇器」這類需要 .map() 畫出九個選項的地方用(取代原本的 CATEGORY_COLORS) */
export interface ColorOption {
  key: TagColorKey;
  label: string;
  bg: string;
  text: string;
}

export const TAG_COLOR_OPTIONS: ColorOption[] = TAG_COLOR_KEYS.map((key) => ({
  key,
  label: TAG_COLOR_LABELS[key],
  bg: TAG_COLOR_VALUES[key].bg,
  text: TAG_COLOR_VALUES[key].text,
}));

/** 舊資料相容:早期版本曾經用 'gray'(美式拼法)存過分類顏色,這裡統一轉換成 'grey' */
const LEGACY_KEY_ALIASES: Record<string, TagColorKey> = {
  gray: 'grey',
};

/**
 * 把任何可能來自資料庫的顏色字串(含 null/undefined/舊拼法/未知值)
 * 安全轉成合法的 TagColorKey,轉不出來一律 fallback 成 grey。
 * 所有「顯示食材/分類顏色」的地方都應該透過這個函式,不要自己比對字串。
 */
export function normalizeTagColor(key: string | null | undefined): TagColorKey {
  if (!key) return 'grey';
  const normalized = LEGACY_KEY_ALIASES[key] ?? key;
  return (TAG_COLOR_KEYS as readonly string[]).includes(normalized)
    ? (normalized as TagColorKey)
    : 'grey';
}

/** 依 key 取得完整顏色選項(含中文標籤、bg/text),找不到就回傳灰色預設。取代原本 colors.ts 的 getColor */
export function getColor(key: string | null | undefined): ColorOption {
  const normalized = normalizeTagColor(key);
  return TAG_COLOR_OPTIONS.find((c) => c.key === normalized)!;
}

/**
 * 自由文字(例如菜色的「類型」欄位)沒有像食材分類一樣手動指定顏色,
 * 用簡單雜湊固定映射到色盤裡的其中一色,確保同一個名稱每次算出來的顏色都一樣。
 * 不用 grey,grey 保留給「未分類」的語意。
 * 食譜列表頁、菜色詳細頁都要用這個函式上色,不要各自寫一份雜湊邏輯。
 */
const LABEL_COLOR_POOL: TagColorKey[] = ['brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
export function colorForLabel(name: string): TagColorKey {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_COLOR_POOL[hash % LABEL_COLOR_POOL.length];
}