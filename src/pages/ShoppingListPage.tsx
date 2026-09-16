import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Refrigerator, Pencil, Trash2, Plus } from 'lucide-react';
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
  getAllIngredientCategories,
  ShoppingListItem,
  ShoppingExtraItem,
  IngredientCategory,
} from '../db';
import { Checkbox, EmptyState, Skeleton, useToast } from '../components';
import { resolveIngredientCategoryColor } from '../ingredientCategoryColors';
import styles from './ShoppingListPage.module.css';

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

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

interface ItemGroup {
  key: string;
  label: string;
  color: string | null;
  items: ShoppingListItem[];
}

/** 首次載入骨架屏:貼近「進度條 + 幾個分類段落」的外型 */
function ShoppingListSkeleton() {
  return (
    <div className={styles.body}>
      <div style={{ marginBottom: 18 }}>
        <Skeleton width={64} height={13} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <Skeleton width="50%" height={16} />
            <div style={{ marginTop: 6 }}>
              <Skeleton width="30%" height={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShoppingListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [weekStartDayNum, setWeekStartDayNum] = useState(0);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), 0));
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [extraItems, setExtraItems] = useState<ShoppingExtraItem[]>([]);
  const [newExtraName, setNewExtraName] = useState('');
  const [addingExtra, setAddingExtra] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const weekEnd = addDays(weekStart, 6);

  const loadExtraItems = async () => {
    const list = await getShoppingExtraItems();
    setExtraItems(list);
  };

  useEffect(() => {
    getWeekStartDay().then((day) => {
      setWeekStartDayNum(day);
      setWeekStart(startOfWeek(new Date(), day));
    });
    getAllIngredientCategories().then(setCategories);
    loadExtraItems();
  }, []);

  useEffect(() => {
    setLoadingList(true);
    getShoppingListForRange(formatDate(weekStart), formatDate(addDays(weekStart, 6)))
      .then(setItems)
      .finally(() => setLoadingList(false));
  }, [weekStart]);

  const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} – ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}（週${
    WEEKDAY_LABELS[weekStartDayNum]
  }起）`;

  const inStockCount = items.filter((it) => it.inStock).length;
  const progressPct = items.length === 0 ? 0 : Math.round((inStockCount / items.length) * 100);

  // 依 ingredient_categories 的既有順序分段,items 本身已經照
  // getShoppingListForRange 的規則排好序(inStock 排後、其餘 localeCompare),
  // 用 filter 分組不會打亂那個順序。
  const groups: ItemGroup[] = useMemo(() => {
    const known = categories
      .map((cat) => ({
        key: cat.id,
        label: cat.name,
        color: cat.color,
        items: items.filter((it) => it.categoryId === cat.id),
      }))
      .filter((g) => g.items.length > 0);
    const uncategorized = items.filter((it) => !it.categoryId);
    return uncategorized.length > 0
      ? [...known, { key: '__none__', label: '未分類', color: null, items: uncategorized }]
      : known;
  }, [items, categories]);

  const handleToggleStock = async (name: string, inStock: boolean) => {
    setItems((prev) => prev.map((it) => (it.name === name ? { ...it, inStock } : it)));
    try {
      if (inStock) {
        await addFridgeItem(name);
        showToast(`${name} 已記進冰箱`, 'success');
      } else {
        await removeFridgeItem(name);
        showToast(`${name} 已從冰箱移除`, 'success');
      }
    } catch (err) {
      showToast('更新冰箱狀態失敗:' + String(err), 'error');
    }
  };

  const handleAddExtra = async () => {
    const trimmed = newExtraName.trim();
    if (!trimmed) {
      showToast('先打上要買的東西', 'error');
      return;
    }
    setAddingExtra(true);
    try {
      await addShoppingExtraItem(trimmed);
      showToast(`${trimmed} 已加入清單`, 'success');
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

  const handleDeleteExtra = async (id: string, name: string) => {
    setExtraItems((prev) => prev.filter((it) => it.id !== id));
    await deleteShoppingExtraItem(id);
    showToast(`${name} 已刪除`, 'success');
  };

  const openEditItem = (item: ShoppingExtraItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const cancelEditItem = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    const trimmed = editValue.trim();
    if (!editingId || !trimmed) return;
    setSavingEdit(true);
    try {
      await renameShoppingExtraItem(editingId, trimmed);
      await loadExtraItems();
      cancelEditItem();
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

  const hasCheckedExtra = extraItems.some((it) => it.checked);
  const noMenuThisWeek = !loadingList && items.length === 0;

  return (
    <div className={styles.page}>
      <div className={styles.stickyTop}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.pageTitle}>採買</h1>
            <div className={styles.weekRange}>{weekLabel}</div>
          </div>
          <Link to="/ingredients" className={styles.fridgeBtn}>
            <Refrigerator size={16} strokeWidth={2.5} />
            冰箱
          </Link>
        </div>

        {!loadingList && items.length > 0 && (
          <>
            <div className={styles.progressRow}>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
              </div>
              <span className={styles.progressCount}>
                {inStockCount} / {items.length}
              </span>
            </div>
            <p className={styles.hintLine}>勾選＝記進冰箱庫存,會排到分類最後面。</p>
          </>
        )}
      </div>

      <div className={styles.body}>
        {loadingList ? (
          <ShoppingListSkeleton />
        ) : noMenuThisWeek ? (
          <EmptyState
            title="這週還沒排菜單"
            description="排好菜單後,食材會自動彙整到這裡。"
            action={
              <button type="button" className={styles.primaryBtn} onClick={() => navigate('/menu')}>
                去排菜單
              </button>
            }
          />
        ) : (
          groups.map((group) => (
            <div key={group.key} className={styles.section}>
              <div className={styles.sectionHeader}>
                {group.color && (
                  <span className={styles.categoryDot} style={{ background: resolveIngredientCategoryColor(group.color) }} />
                )}
                <span className={styles.sectionLabel}>{group.label}</span>
                <span className={styles.sectionLine} />
              </div>
              {group.items.map((item) => (
                <div key={item.name} className={styles.itemRow}>
                  <Checkbox
                    shape="circle"
                    hideLabel
                    label={item.name}
                    checked={item.inStock}
                    onChange={(e) => handleToggleStock(item.name, e.target.checked)}
                  />
                  <div className={styles.itemInfo}>
                    <div className={[styles.itemName, item.inStock ? styles.itemNameChecked : ''].join(' ')}>
                      {item.name}
                    </div>
                    {item.dishNames.length > 0 && (
                      <div className={styles.itemDishes}>{item.dishNames.join('、')}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>其他要買的</span>
            <span className={styles.sectionLine} />
            {hasCheckedExtra && (
              <button type="button" className={styles.clearCheckedBtn} onClick={handleClearChecked}>
                清除已勾選
              </button>
            )}
          </div>

          {extraItems.length === 0 ? (
            <div className={styles.emptyExtra}>還沒有額外項目</div>
          ) : (
            extraItems.map((item) =>
              editingId === item.id ? (
                <div key={item.id} className={styles.editRow}>
                  <input
                    className={styles.editInput}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSaveEdit())}
                    autoFocus
                  />
                  <button
                    type="button"
                    className={styles.editDoneBtn}
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !editValue.trim()}
                  >
                    完成
                  </button>
                </div>
              ) : (
                <div key={item.id} className={styles.extraRow}>
                  <Checkbox
                    shape="circle"
                    hideLabel
                    label={item.name}
                    checked={item.checked}
                    onChange={(e) => handleToggleExtra(item.id, e.target.checked)}
                  />
                  <span className={[styles.extraName, item.checked ? styles.extraNameChecked : ''].join(' ')}>
                    {item.name}
                  </span>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => openEditItem(item)}
                    aria-label={`改名${item.name}`}
                  >
                    <Pencil size={17} strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => handleDeleteExtra(item.id, item.name)}
                    aria-label={`刪除${item.name}`}
                  >
                    <Trash2 size={17} strokeWidth={2.25} />
                  </button>
                </div>
              )
            )
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <input
          className={styles.footerInput}
          value={newExtraName}
          onChange={(e) => setNewExtraName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExtra())}
          placeholder="加一項:衛生紙、醬油…"
        />
        <button
          type="button"
          className={styles.footerAddBtn}
          onClick={handleAddExtra}
          disabled={addingExtra}
          aria-label="新增項目"
        >
          <Plus size={20} strokeWidth={2.75} />
        </button>
      </div>
    </div>
  );
}

export default ShoppingListPage;
