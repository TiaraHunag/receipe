import { useEffect, useState } from 'react';
import { readPhotoAsDataUrl } from '../../photoStorage';

export interface LocalPhotoProps {
  /** dishes 資料表存的相對路徑,例如 dish-photos/xxx.jpg */
  path: string | undefined;
  alt?: string;
  className?: string;
}

/**
 * 顯示存在本機檔案系統裡的食譜照片。照片本體由 Capacitor Filesystem 管理,
 * 資料庫/表單狀態只存路徑,這裡負責非同步讀出 base64 組成 data URL 再渲染。
 * 讀取中、path 是空字串,或檔案已經找不到(例如被清理過)時不顯示任何東西,
 * 呼叫端自行決定「沒有照片」時要顯示什麼佔位內容。
 */
export function LocalPhoto({ path, alt = '', className }: LocalPhotoProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (!path) return;
    readPhotoAsDataUrl(path).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}
