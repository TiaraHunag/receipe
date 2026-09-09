/**
 * Instagram 貼文連結預覽工具。
 *
 * 範圍刻意限縮:只抓「帳號名稱」+「一小段 caption 預覽文字」,
 * 不抓完整內容、不抓圖片、不抓 hashtag/讚數。
 * 抓到的結果只作為使用者確認「有抓對貼文」用,不會自動寫入食譜內容欄位。
 *
 * 技術限制:必須透過 Capacitor 的原生 Http 攔截(CapacitorHttp)才能繞過
 * WebView 的 CORS 限制,對 instagram.com 發 GET 請求。這代表這支工具:
 * - 在 StackBlitz / 一般瀏覽器預覽環境完全無法運作(fetch 會被 CORS 擋下)
 * - 只有在 Xcode build 到實機或模擬器的原生 App 環境下才會生效
 * 記得在 capacitor.config.ts 裡設定 `CapacitorHttp: { enabled: true }`。
 *
 * 解析格式沒有官方保證,IG 隨時可能改變 HTML 結構,所以任何一步解析失敗
 * 都直接回傳 null,呼叫端要自己處理「抓不到」的情況(只留網址,不要卡住使用者)。
 */

import { CapacitorHttp } from '@capacitor/core';

export interface IgPreview {
  /** IG 帳號名稱,例如 babydaddy0513 */
  account: string;
  /** caption 前段預覽文字(已截斷) */
  snippet: string;
}

const PREVIEW_LENGTH = 36;

/** 判斷網址是否為 Instagram 貼文/限動/Reels 連結 */
export function isInstagramUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\//i.test(url.trim());
}

/**
 * 從 `<meta name="description" content="...">` 內容裡解析帳號名稱與 caption 預覽。
 *
 * 目前觀察到的格式(不保證永遠成立,故做嚴格比對,失敗就回傳 null):
 *   "3,732 likes, 88 comments - babydaddy0513 on March 17, 2025: "caption 內容..."
 * 也順手處理沒有讚數/留言數的簡化格式:
 *   "babydaddy0513 on Instagram: "caption 內容..."
 */
export function parseIgDescription(description: string): IgPreview | null {
  if (!description) return null;

  // 格式一:「X likes, Y comments - username on date: "caption"」
  let match = description.match(/-\s*([a-zA-Z0-9_.]+)\s+on\s+[^:]+:\s*"([\s\S]*)"?\s*$/);

  // 格式二:「username on Instagram: "caption"」
  if (!match) {
    match = description.match(/^([a-zA-Z0-9_.]+)\s+on\s+Instagram:\s*"([\s\S]*)"?\s*$/);
  }

  if (!match) return null;

  const account = match[1].trim();
  const captionRaw = match[2].replace(/"\s*$/, '').trim();
  if (!account || !captionRaw) return null;

  const snippet = captionRaw.length > PREVIEW_LENGTH
    ? captionRaw.slice(0, PREVIEW_LENGTH).trim() + '…'
    : captionRaw;

  return { account, snippet };
}

/**
 * 對 Instagram 貼文網址發出請求並解析預覽資訊。
 * 只能在原生 App(CapacitorHttp 生效)環境下成功;瀏覽器預覽環境會直接拋錯。
 * 任何失敗情況(網路錯誤、格式不符預期)一律回傳 null,不丟例外給呼叫端處理,
 * 讓 UI 可以單純用「有 / 沒有預覽」來決定要不要顯示,不需要額外包 try/catch。
 */
export async function fetchIgPreview(url: string): Promise<IgPreview | null> {
  if (!isInstagramUrl(url)) return null;

  try {
    const response = await CapacitorHttp.get({
      url,
      headers: {
        // 部分頁面在沒有瀏覽器 User-Agent 時會回傳精簡版 HTML,拿不到完整 meta tag
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });

    if (response.status < 200 || response.status >= 300) return null;

    const html: string = typeof response.data === 'string' ? response.data : '';
    if (!html) return null;

    const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    if (!metaMatch) return null;

    const decoded = decodeHtmlEntities(metaMatch[1]);
    return parseIgDescription(decoded);
  } catch {
    // 網路錯誤、CORS(瀏覽器預覽環境)、逾時等一律視為抓取失敗
    return null;
  }
}

/** 簡易 HTML entity 解碼,meta content 裡常見的幾種跳脫符號 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
