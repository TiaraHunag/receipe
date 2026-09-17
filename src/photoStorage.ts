// ============================================================================
// src/photoStorage.ts(新檔案)
// 食譜照片(封面照、步驟圖)的本機儲存工具。
// 照片不進 SQLite——資料表欄位只存「相對路徑」(例如 dish-photos/xxx.jpg),
// 實際的圖片位元組交給 @capacitor/filesystem 管理,存在裝置的 App 私有資料夾
// (Directory.Data)。這個套件在 StackBlitz 這種瀏覽器開發環境也能動(底層用
// IndexedDB),原生 App 上則是真的寫進裝置檔案系統,兩邊共用同一套程式碼。
//
// 存檔前一律先用 <canvas> 做等比縮放(長邊最多 1600px)+ JPEG 壓縮(quality 0.75),
// 避免手機原圖(常 3–8MB)整張存進裝置——這是這個檔案存在的主要理由。
// ============================================================================
import { Filesystem, Directory } from '@capacitor/filesystem';

const PHOTO_DIR = 'dish-photos';
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.75;

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('圖片讀取失敗'));
    };
    img.src = url;
  });
}

/**
 * 把使用者選的圖片檔案等比縮放+壓縮成 JPEG,回傳「不含 data: 前綴」的純
 * base64 字串,供 Filesystem.writeFile 直接使用。
 * 優先用 createImageBitmap(imageOrientation: 'from-image') 解碼——這個選項能
 * 正確處理手機直向拍照常見的 EXIF 旋轉問題,不然畫到 canvas 上可能會變橫的。
 * 不支援 createImageBitmap 的環境(舊版瀏覽器)退回用 <img> 元素讀取。
 */
async function compressImageFile(file: File): Promise<string> {
  let bitmap: ImageBitmap | null = null;
  if (typeof createImageBitmap === 'function') {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' as ImageOrientation });
    } catch {
      bitmap = null;
    }
  }

  let source: CanvasImageSource;
  let width: number;
  let height: number;

  if (bitmap) {
    source = bitmap;
    width = bitmap.width;
    height = bitmap.height;
  } else {
    const img = await loadImageElement(file);
    source = img;
    width = img.naturalWidth;
    height = img.naturalHeight;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('無法建立畫布');
  ctx.drawImage(source, 0, 0, outW, outH);
  bitmap?.close();

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return dataUrl.split(',')[1] || '';
}

/** 把不含前綴的 base64 資料寫進本機檔案,回傳存進資料庫用的相對路徑。 */
export async function savePhotoFile(base64Data: string): Promise<string> {
  const path = `${PHOTO_DIR}/${crypto.randomUUID()}.jpg`;
  await Filesystem.writeFile({
    path,
    data: base64Data,
    directory: Directory.Data,
    recursive: true,
  });
  return path;
}

/** 選圖的完整流程:壓縮 → 寫入本機檔案 → 回傳相對路徑,表單頁直接呼叫這個就好。 */
export async function compressAndSavePhoto(file: File): Promise<string> {
  const base64 = await compressImageFile(file);
  return savePhotoFile(base64);
}

/**
 * 讀出本機照片檔案,組成可以直接放進 <img src> 的 data URL。
 * path 為空、檔案不存在或讀取失敗時回傳 null,呼叫端(LocalPhoto 元件)自行
 * 處理「沒有照片」的顯示。
 */
export async function readPhotoAsDataUrl(path: string): Promise<string | null> {
  if (!path) return null;
  // 相容舊架構(改用 Filesystem 之前,coverPhotoPath 存的就是完整 dataURL 本身)——
  // 這種值不是檔案路徑,不用也不能拿去問 Filesystem,直接沿用即可。
  if (path.startsWith('data:')) return path;
  try {
    const res = await Filesystem.readFile({ path, directory: Directory.Data });
    const data = typeof res.data === 'string' ? res.data : '';
    return data ? `data:image/jpeg;base64,${data}` : null;
  } catch {
    return null;
  }
}

/**
 * 刪除本機照片檔案(刪食譜、換照片、匯入覆蓋舊資料前清舊檔用)。
 * 找不到檔案就靜默略過——本來就是要確保它不存在,失敗了目的也達成。
 */
export async function deletePhotoFile(path: string): Promise<void> {
  if (!path || path.startsWith('data:')) return;
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Data });
  } catch {
    // 檔案本來就不存在,忽略
  }
}
