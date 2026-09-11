// ============================================================================
// src/pages/ShoppingListPage.tsx (完整覆蓋 — 額外項目改右下角 + FAB 新增、左滑「編輯／刪除」)
// ============================================================================
import { useEffect, useState } from 'react';
import {
  getShoppingListForRange,
  getShoppingExtraItems,
  addShoppingExtraItem,
  renameShoppingExtraItem,
  toggleShoppingExtraItem,
  deleteShoppingExtraItem,
  clearCheckedShoppingExtraItems,
  addFridgeItem,
  removeFridgeItem,
  getWeekStartDay,
  ShoppingListItem,
  ShoppingExtraItem,
} from '../db';
import { Card, DateSwitcher, Checkbox, Input, Button, Fab, SwipeableRow, Modal, EmptyState, Spinner, useToast } from '../components';
import IngredientTag from '../components/IngredientTag';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 依「一週起始日」設定計算某天所在週的第一天,weekStartDay 0-6 對應 Date.getDay() */
function startOfWeek(d: Date, weekStartDay: number): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const diff = (copy.getDay() - weekStartDay + 7) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

interface ShoppingItemRowProps {
  item: ShoppingListItem;
  onToggleStock: (name: string, inStock: boolean) => void;
  muted?: boolean;
}

/** 單一食材列:名稱(套用分類顏色)、用到這項食材的菜色、冰箱庫存切換
 *  這份清單是從菜單規劃自動算出來的,不是使用者手動新增/刪除的項目,維持原本互動方式。 */
function ShoppingItemRow({ item, onToggleStock, muted }: ShoppingItemRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) 0',
        borderBottom: '1px solid var(--color-surface-sunken)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, opacity: muted ? 0.6 : 1 }}>
        <IngredientTag name={item.name} colorKey={item.color} />
        <span
          style={{
            font: 'var(--font-caption)',
            color: 'var(--color-text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          用於:{item.dishNames.join('、')}
        </span>
      </div>
      <Checkbox
        label="冰箱有"
        checked={item.inStock}
        onChange={(e) => onToggleStock(item.name, e.target.checked)}
      />
    </div>
  );
}

function ShoppingListPage() {
  const [weekStartDayNum, setWeekStartDayNum] = useState(0);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), 0));
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [extraItems, setExtraItems] = useState<ShoppingExtraItem[]>([]);
  const [newExtraName, setNewExtraName] = useState('');
  const [addingExtra, setAddingExtra] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingExtraItem | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const { showToast } = useToast();

  const weekEnd = addDays(weekStart, 6);
  const todayStr = formatDate(new Date());
  const isCurrentWeek = Array.from({ length: 7 }, (_, i) => formatDate(addDays(weekStart, i))).includes(
    todayStr
  );

  const loadExtraItems = async () => {
    const list = await getShoppingExtraItems();
    setExtraItems(list);
  };

  useEffect(() => {
    getWeekStartDay().then((day) => {
      setWeekStartDayNum(day);
      setWeekStart(startOfWeek(new Date(), day));
    });
    loadExtraItems();
  }, []);

  useEffect(() => {
    setLoadingList(true);
    getShoppingListForRange(formatDate(weekStart), formatDate(addDays(weekStart, 6)))
      .then(setItems)
      .finally(() => setLoadingList(false));
  }, [weekStart]);

  const goPrevWeek = () => setWeekStart((d) => addDays(d, -7));
  const goNextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goThisWeek = () => setWeekStart(startOfWeek(new Date(), weekStartDayNum));

  const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} – ${
    weekEnd.getMonth() + 1
  }/${weekEnd.getDate()}`;

  const handleToggleStock = async (name: string, inStock: boolean) => {
    // 先更新畫面(讓項目立刻在「需採買/冰箱已有」兩區之間移動),再寫回真正的冰箱庫存表
    setItems((prev) => prev.map((it) => (it.name === name ? { ...it, inStock } : it)));
    try {
      if (inStock) {
        await addFridgeItem(name);
      } else {
        await removeFridgeItem(name);
      }
    } catch (err) {
      showToast('更新冰箱狀態失敗:' + String(err), 'error');
    }
  };

  const handleAddExtra = async () => {
    const trimmed = newExtraName.trim();
    if (!trimmed) return;
    setAddingExtra(true);
    try {
      await addShoppingExtraItem(trimmed);
      setNewExtraName('');
      await loadExtraItems();
    } catch (err) {
      showToast('新增失敗:' + String(err), 'error');
    } finally {
      setAddingExtra(false);
    }
  };

  const handleToggleExtra = async (id: string, checked: boolean) => {
    setExtraItems((prev) => prev.map((it) => (it.id === id ? { ...it, checked } : it)));
    await toggleShoppingExtraItem(id, checked);
  };

  const handleDeleteExtra = async (id: string) => {
    setExtraItems((prev) => prev.filter((it) => it.id !== id));
    await deleteShoppingExtraItem(id);
  };

  const openEditItem = (item: ShoppingExtraItem) => {
    setEditingItem(item);
    setEditValue(item.name);
  };

  const closeEditItem = () => {
    setEditingItem(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    const trimmed = editValue.trim();
    if (!editingItem || !trimmed) return;
    setSavingEdit(true);
    try {
      await renameShoppingExtraItem(editingItem.id, trimmed);
      await loadExtraItems();
      closeEditItem();
    } catch (err) {
      showToast('更新失敗:' + String(err), 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleClearChecked = async () => {
    await clearCheckedShoppingExtraItems();
    await loadExtraItems();
  };

  const needToBuy = items.filter((it) => !it.inStock);
  const haveStock = items.filter((it) => it.inStock);
  const hasCheckedExtra = extraItems.some((it) => it.checked);

  return (
    <div
      style={{
        padding: 'var(--space-4)',
        maxWidth: 480,
        margin: '0 auto',
        paddingBottom: 96,
        position: 'relative',
        minHeight: '100vh',
      }}
    >

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <DateSwitcher
          label={weekLabel}
          onPrev={goPrevWeek}
          onNext={goNextWeek}
          isToday={isCurrentWeek}
          onToday={goThisWeek}
        />
      </div>

      <h2 style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)', margin: '0 0 var(--space-2)' }}>
        🛒 本週菜單需要的食材
      </h2>

      {loadingList ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5) 0' }}>
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="📅"
          title="這週還沒安排菜單"
          description="先到「菜單規劃」排這週的餐點,這裡就會自動列出需要採買的食材。"
        />
      ) : (
        <>
          <Card style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <p style={{ font: 'var(--font-label)', color: 'var(--color-text)', margin: '0 0 var(--space-2)' }}>
              需採買({needToBuy.length})
            </p>
            {needToBuy.length === 0 ? (
              <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-placeholder)' }}>
                這週用到的食材冰箱都有,不用買
              </p>
            ) : (
              needToBuy.map((item) => (
                <ShoppingItemRow key={item.name} item={item} onToggleStock={handleToggleStock} />
              ))
            )}
          </Card>

          {haveStock.length > 0 && (
            <Card style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <p
                style={{
                  font: 'var(--font-label)',
                  color: 'var(--color-text-secondary)',
                  margin: '0 0 var(--space-2)',
                }}
              >
                ✅ 冰箱已有,可略過({haveStock.length})
              </p>
              {haveStock.map((item) => (
                <ShoppingItemRow key={item.name} item={item} onToggleStock={handleToggleStock} muted />
              ))}
            </Card>
          )}
        </>
      )}

      <h2 style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)', margin: 'var(--space-2) 0 var(--space-2)' }}>
        🔖 其他要買的東西
      </h2>
      <Card style={{ padding: 'var(--space-4)', overflow: 'hidden' }}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <Input
            value={newExtraName}
            onChange={(e) => setNewExtraName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExtra())}
            placeholder="例如:衛生紙、醬油(輸入後按右下角 + 新增)"
          />
        </div>

        {extraItems.length === 0 ? (
          <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-placeholder)' }}>
            還沒有額外項目
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {extraItems.map((item) => (
                <SwipeableRow
                key={item.id}
                actions={[
                  { label: '編輯', onClick: () => openEditItem(item) },
                  { label: '刪除', danger: true, onClick: () => handleDeleteExtra(item.id) },
                ]}
              >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 'var(--space-2) 0',
                      borderBottom: '1px solid var(--color-surface-sunken)',
                    }}
                  >
                    <Checkbox
                      label={item.name}
                      checked={item.checked}
                      onChange={(e) => handleToggleExtra(item.id, e.target.checked)}
                    />
                  </div>
                </SwipeableRow>
              ))}
            </div>
            {hasCheckedExtra && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChecked}
                style={{ marginTop: 'var(--space-2)' }}
              >
                清除已買的項目
              </Button>
            )}
          </>
        )}
      </Card>

      <p
        style={{
          font: 'var(--font-caption)',
          color: 'var(--color-text-placeholder)',
          textAlign: 'center',
          marginTop: 'var(--space-4)',
        }}
      >
        食材不記數量,清單僅供勾選提醒;冰箱庫存也可以到「冰箱管理」統一設定。
      </p>

      <Modal open={!!editingItem} onClose={closeEditItem} title="編輯項目">
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSaveEdit())}
            placeholder="項目名稱"
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="secondary" fullWidth onClick={closeEditItem}>
            取消
          </Button>
          <Button fullWidth onClick={handleSaveEdit} loading={savingEdit} disabled={!editValue.trim()}>
            儲存
          </Button>
        </div>
      </Modal>

      <Fab
        label="新增項目"
        onClick={handleAddExtra}
        disabled={addingExtra || !newExtraName.trim()}
      />
    </div>
  );
}

export default ShoppingListPage;