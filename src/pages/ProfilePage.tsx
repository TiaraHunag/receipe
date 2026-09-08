import { useRef, useState } from 'react';
import { exportDishesToJSON, importDishesFromJSON } from '../db';
import { Card, Button, ConfirmDialog, useToast } from '../components';

function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { showToast } = useToast();

  const handleExport = async () => {
    setExporting(true);
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
      showToast('備份檔案已下載', 'success');
    } catch (err) {
      showToast('匯出失敗:' + String(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
  };

  const runImport = async () => {
    const file = pendingFile;
    setPendingFile(null);
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const count = await importDishesFromJSON(text);
      showToast(`成功匯入 ${count} 筆資料`, 'success');
    } catch (err) {
      showToast('匯入失敗,請確認檔案格式是否正確:' + String(err), 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const cancelImport = () => {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 480, margin: '0 auto', paddingBottom: 96 }}>
      <h1 style={{ font: 'var(--font-title)', color: 'var(--color-text)', margin: '12px 0' }}>個人</h1>

      <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)' }}>
        帳號與雲端備份功能還在規劃中。目前資料完全存在你的裝置本地,建議定期使用下方功能手動備份。
      </p>

      <Card style={{ padding: 'var(--space-4)' }}>
        <h2 style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)', margin: '0 0 var(--space-3)' }}>資料備份</h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button type="button" variant="secondary" onClick={handleExport} loading={exporting}>
            ⬇ 匯出備份
          </Button>
          <Button type="button" variant="secondary" onClick={handleImportClick} loading={importing}>
            ⬆ 匯入還原
          </Button>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-3)' }}>
          匯出會產生一個 JSON 檔,可存到雲端硬碟；換手機或重灌 App 前,建議先匯出一份保存。
        </p>
      </Card>

      <ConfirmDialog
        open={!!pendingFile}
        title="匯入備份"
        description="匯入會覆蓋內容相同(同一道菜)的資料,確定要繼續嗎?"
        confirmLabel="匯入"
        onConfirm={runImport}
        onCancel={cancelImport}
      />
    </div>
  );
}

export default ProfilePage;
