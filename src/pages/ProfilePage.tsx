import { useEffect, useRef, useState } from 'react';
import { Download, Upload, ChevronRight } from 'lucide-react';
import {
  exportAllDataToJSON,
  importAllDataFromJSON,
  getWeekStartDay,
  setWeekStartDay,
  WEEKDAY_LABELS,
} from '../db';
import { ConfirmDialog, useToast } from '../components';
import styles from './ProfilePage.module.css';

function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [weekStartDay, setWeekStartDayState] = useState(0);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    getWeekStartDay()
      .then(setWeekStartDayState)
      .finally(() => setLoadingSettings(false));
  }, []);

  const handleChangeWeekStartDay = async (day: number) => {
    setWeekStartDayState(day);
    try {
      await setWeekStartDay(day);
      showToast('已更新一週起始日', 'success');
    } catch (err) {
      showToast('更新失敗:' + String(err), 'error');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const json = await exportAllDataToJSON();
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
      const summary = await importAllDataFromJSON(text);
      const parts = [
        `${summary.dishes} 道食譜`,
        `${summary.menus} 天菜單`,
        `${summary.categories} 個食材分類`,
        `${summary.fridgeItems} 項冰箱庫存`,
        `${summary.shoppingExtraItems} 項採買項目`,
      ];
      showToast(`匯入完成:${parts.join('、')}`, 'success', { duration: 3200 });
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
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>我的</h1>

      <p className={styles.disclaimer}>
        帳號與雲端備份功能還在規劃中。目前資料完全存在你的裝置本地,建議定期使用下方功能手動備份。
      </p>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>一週起始日</h2>
        <div className={styles.weekdayGrid}>
          {WEEKDAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              className={[styles.weekdayBtn, weekStartDay === i ? styles.weekdayBtnActive : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleChangeWeekStartDay(i)}
              disabled={loadingSettings}
            >
              週{label}
            </button>
          ))}
        </div>
        <p className={styles.sectionDesc}>會套用到「菜單」與「採買」裡「一週」的計算方式。</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>資料備份</h2>
        <button type="button" className={styles.listBtn} onClick={handleExport} disabled={exporting}>
          <span className={styles.listBtnIcon}>
            <Download size={19} strokeWidth={2.25} />
          </span>
          <span className={styles.listBtnLabel}>{exporting ? '匯出中...' : '匯出備份'}</span>
          <span className={styles.listBtnChevron}>
            <ChevronRight size={18} strokeWidth={2.25} />
          </span>
        </button>
        <button type="button" className={styles.listBtn} onClick={handleImportClick} disabled={importing}>
          <span className={styles.listBtnIcon}>
            <Upload size={19} strokeWidth={2.25} />
          </span>
          <span className={styles.listBtnLabel}>{importing ? '匯入中...' : '匯入還原'}</span>
          <span className={styles.listBtnChevron}>
            <ChevronRight size={18} strokeWidth={2.25} />
          </span>
        </button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <p className={styles.sectionDesc}>
          匯出會產生一個 JSON 檔,可存到雲端硬碟；換手機或重灌 App 前,建議先匯出一份保存。
        </p>
      </div>

      <ConfirmDialog
        open={!!pendingFile}
        title="匯入備份"
        description="匯入會覆蓋內容相同的資料(同一道菜、同一天菜單、同一個食材分類等),涵蓋食譜、菜單規劃、食材分類、冰箱庫存與採買項目,確定要繼續嗎?"
        confirmLabel="匯入"
        onConfirm={runImport}
        onCancel={cancelImport}
      />
    </div>
  );
}

export default ProfilePage;
