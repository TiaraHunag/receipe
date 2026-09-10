// ============================================================================
// src/pages/ProfilePage.tsx (完整覆蓋 — 新增「食材分類(顏色標籤)」卡片)
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import {
  exportDishesToJSON,
  importDishesFromJSON,
  getWeekStartDay,
  setWeekStartDay,
  getAllIngredientCategories,
  createIngredientCategory,
  deleteIngredientCategory,
  WEEKDAY_LABELS,
  IngredientCategory,
} from '../db';
import { CATEGORY_COLORS, getColor } from '../colors';
import { Card, Button, Select, ConfirmDialog, useToast } from '../components';

function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [weekStartDay, setWeekStartDayState] = useState(0);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0].key);
  const [deletingCategory, setDeletingCategory] = useState<IngredientCategory | null>(null);
  const { showToast } = useToast();

  const loadCategories = async () => {
    const cats = await getAllIngredientCategories();
    setCategories(cats);
  };

  useEffect(() => {
    getWeekStartDay()
      .then(setWeekStartDayState)
      .finally(() => setLoadingSettings(false));
    loadCategories();
  }, []);

  const handleChangeWeekStartDay = async (value: string) => {
    const day = parseInt(value, 10);
    setWeekStartDayState(day);
    try {
      await setWeekStartDay(day);
      showToast('已更新一週起始日', 'success');
    } catch (err) {
      showToast('更新失敗:' + String(err), 'error');
    }
  };

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    await createIngredientCategory(trimmed, newCategoryColor);
    setNewCategoryName('');
    await loadCategories();
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    await deleteIngredientCategory(deletingCategory.id);
    setDeletingCategory(null);
    await loadCategories();
  };

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

  const weekStartOptions = WEEKDAY_LABELS.map((label, i) => ({
    value: String(i),
    label: `週${label}`,
  }));

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 480, margin: '0 auto', paddingBottom: 96 }}>
      <h1 style={{ font: 'var(--font-title)', color: 'var(--color-text)', margin: '12px 0' }}>個人</h1>

      <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)' }}>
        帳號與雲端備份功能還在規劃中。目前資料完全存在你的裝置本地,建議定期使用下方功能手動備份。
      </p>

      <Card style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)', margin: '0 0 var(--space-3)' }}>偏好設定</h2>
        <div style={{ maxWidth: 200 }}>
          <Select
            label="一週起始日"
            value={String(weekStartDay)}
            onChange={(e) => handleChangeWeekStartDay(e.target.value)}
            options={weekStartOptions}
            disabled={loadingSettings}
          />
        </div>
        <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-3)' }}>
          會套用到「菜單規劃」與「採買清單」裡「一週」的計算方式。
        </p>
      </Card>

      <Card style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)', margin: '0 0 var(--space-3)' }}>食材分類(顏色標籤)</h2>
        <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
          分類只用來決定食材標籤的顏色(食譜、採買清單顯示用),跟冰箱庫存無關。新食材的分類會在新增食譜時跳出視窗設定。
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
          {categories.map((c) => {
            const color = getColor(c.color);
            return (
              <span
                key={c.id}
                style={{
                  background: color.bg,
                  color: color.text,
                  padding: '4px var(--space-3)',
                  borderRadius: 'var(--radius-pill)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  font: 'var(--font-caption)',
                }}
              >
                {c.name}
                <button
                  type="button"
                  onClick={() => setDeletingCategory(c)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: color.text }}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="新分類名稱,例如:蔬菜"
            style={{ padding: 6, borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)', font: 'var(--font-body)' }}
          />
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setNewCategoryColor(c.key)}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: c.bg,
                border: newCategoryColor === c.key ? '2px solid var(--color-text)' : '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
              title={c.label}
            />
          ))}
          <Button type="button" size="sm" onClick={handleCreateCategory}>新增分類</Button>
        </div>
      </Card>

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

      <ConfirmDialog
        open={!!deletingCategory}
        title="刪除分類"
        description="刪除這個分類後,原本屬於這個分類的食材會變成「未分類」,確定要刪除嗎?"
        confirmLabel="刪除"
        danger
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
}

export default ProfilePage;