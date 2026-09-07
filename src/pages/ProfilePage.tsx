import { useRef, useState } from 'react';
import { exportDishesToJSON, importDishesFromJSON } from '../db';

function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setMessage(null);
    setError(null);
    try {
      const json = await exportDishesToJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `receipe_backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('備份檔案已下載');
    } catch (err) {
      setError('匯出失敗:' + String(err));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('匯入會覆蓋內容相同(同一道菜)的資料,確定要繼續嗎?')) {
      e.target.value = '';
      return;
    }

    setMessage(null);
    setError(null);
    try {
      const text = await file.text();
      const count = await importDishesFromJSON(text);
      setMessage(`成功匯入 ${count} 筆資料`);
    } catch (err) {
      setError('匯入失敗,請確認檔案格式是否正確:' + String(err));
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 80 }}>
      <h1 style={{ fontSize: 20, margin: '12px 0' }}>個人</h1>

      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        帳號與雲端備份功能還在規劃中。目前資料完全存在你的裝置本地,建議定期使用下方功能手動備份。
      </p>

      <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>資料備份</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={handleExport} style={{ padding: '10px 16px', fontSize: 14 }}>
            ⬇ 匯出備份
          </button>
          <button type="button" onClick={handleImportClick} style={{ padding: '10px 16px', fontSize: 14 }}>
            ⬆ 匯入還原
          </button>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
          匯出會產生一個 JSON 檔,可存到雲端硬碟；換手機或重灌 App 前,建議先匯出一份保存。
        </p>

        {message && (
          <p style={{ color: 'green', background: '#eefbee', padding: 8, borderRadius: 4, marginTop: 10, fontSize: 14 }}>
            {message}
          </p>
        )}
        {error && <p style={{ color: 'red', marginTop: 10, fontSize: 14 }}>{error}</p>}
      </div>
    </div>
  );
}

export default ProfilePage;