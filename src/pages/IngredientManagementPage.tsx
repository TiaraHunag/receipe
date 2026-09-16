import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import {
  getIngredientCategoryMap,
  getAllIngredients,
  getAllIngredientCategories,
  createIngredientCategory,
  deleteIngredientCategory,
  getFridgeItems,
  addFridgeItem,
  removeFridgeItem,
  IngredientWithCategory,
  IngredientCategory,
  FridgeItem,
} from '../db';
import { INGREDIENT_CATEGORY_COLORS, resolveIngredientCategoryColor } from '../ingredientCategoryColors';
import { ColorDot, ConfirmDialog, EmptyState, Input, SegmentedControl, Spinner, useToast } from '../components';
import styles from './IngredientManagementPage.module.css';

type Tab = 'fridge' | 'categories';

interface FridgeGroup {
  key: string;
  label: string;
  color: string | null;
  items: FridgeItem[];
}

function IngredientManagementPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>('fridge');
  const [ingredientMap, setIngredientMap] = useState<Record<string, IngredientWithCategory>>({});
  const [recipeIngredientNames, setRecipeIngredientNames] = useState<string[]>([]);
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [newFridgeItemName, setNewFridgeItemName] = useState('');
  const [addingFridgeItem, setAddingFridgeItem] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(INGREDIENT_CATEGORY_COLORS[0].key);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<IngredientCategory | null>(null);

  const load = async () => {
    const [map, names, fridge, cats] = await Promise.all([
      getIngredientCategoryMap(),
      getAllIngredients(),
      getFridgeItems(),
      getAllIngredientCategories(),
    ]);
    setIngredientMap(map);
    setRecipeIngredientNames(names);
    setFridgeItems(fridge);
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAddFridgeItem = async () => {
    const trimmed = newFridgeItemName.trim();
    if (!trimmed) return;
    setAddingFridgeItem(true);
    try {
      await addFridgeItem(trimmed);
      setNewFridgeItemName('');
      const fridge = await getFridgeItems();
      setFridgeItems(fridge);
    } catch (err) {
      showToast('新增失敗:' + String(err), 'error');
    } finally {
      setAddingFridgeItem(false);
    }
  };

  const handleRemoveFridgeItem = async (name: string) => {
    setFridgeItems((prev) => prev.filter((it) => it.name !== name));
    try {
      await removeFridgeItem(name);
      // 高頻輕量操作(用完了勾掉),不跳確認彈窗打斷手感,
      // 改用「已移除 + 5 秒內可復原」的 Toast,跟分類刪除(較高風險,用 ConfirmDialog)區分開。
      showToast(`${name} 已從冰箱移除`, 'success', {
        actionLabel: '復原',
        duration: 5000,
        onAction: async () => {
          try {
            await addFridgeItem(name);
            const fridge = await getFridgeItems();
            setFridgeItems(fridge);
          } catch (err) {
            showToast('復原失敗:' + String(err), 'error');
          }
        },
      });
    } catch (err) {
      showToast('移除失敗:' + String(err), 'error');
      const fridge = await getFridgeItems();
      setFridgeItems(fridge);
    }
  };

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCreatingCategory(true);
    try {
      await createIngredientCategory(trimmed, newCategoryColor);
      setNewCategoryName('');
      const cats = await getAllIngredientCategories();
      setCategories(cats);
    } catch (err) {
      showToast('新增分類失敗:' + String(err), 'error');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    await deleteIngredientCategory(deletingCategory.id);
    setDeletingCategory(null);
    const [cats, map] = await Promise.all([getAllIngredientCategories(), getIngredientCategoryMap()]);
    setCategories(cats);
    setIngredientMap(map);
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(ingredientMap).forEach((info) => {
      if (info.categoryId) counts[info.categoryId] = (counts[info.categoryId] || 0) + 1;
    });
    return counts;
  }, [ingredientMap]);

  const fridgeGroups: FridgeGroup[] = useMemo(() => {
    const known = categories
      .map((cat) => ({
        key: cat.id,
        label: cat.name,
        color: cat.color,
        items: fridgeItems.filter((f) => ingredientMap[f.name]?.categoryId === cat.id),
      }))
      .filter((g) => g.items.length > 0);
    const uncategorized = fridgeItems.filter((f) => !ingredientMap[f.name]?.categoryId);
    return uncategorized.length > 0
      ? [...known, { key: '__none__', label: '未分類', color: null, items: uncategorized }]
      : known;
  }, [fridgeItems, categories, ingredientMap]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/shopping')} aria-label="回到採買清單">
          <ArrowLeft size={19} strokeWidth={2.5} />
        </button>
        <h1 className={styles.pageTitle}>冰箱與食材</h1>
      </div>

      <SegmentedControl
        className={styles.tabSwitch}
        options={[
          { value: 'fridge', label: '冰箱有什麼' },
          { value: 'categories', label: '食材分類' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
      />

      {tab === 'fridge' ? (
        <>
          <div className={styles.addRow}>
            <Input
              value={newFridgeItemName}
              onChange={(e) => setNewFridgeItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFridgeItem())}
              placeholder="例如:雞蛋、青江菜"
              suggestions={recipeIngredientNames.filter((n) => !fridgeItems.some((f) => f.name === n))}
              onSuggestionSelect={(name) => setNewFridgeItemName(name)}
              style={{ minHeight: 44 }}
            />
            <button
              type="button"
              className={styles.roundAddBtn}
              onClick={handleAddFridgeItem}
              disabled={addingFridgeItem || !newFridgeItemName.trim()}
              aria-label="新增到冰箱"
            >
              <Plus size={18} strokeWidth={2.75} />
            </button>
          </div>

          {fridgeItems.length === 0 ? (
            <EmptyState title="冰箱是空的" description="新增一項,或去採買清單勾選也會自動加進來。" />
          ) : (
            fridgeGroups.map((group) => (
              <div key={group.key} className={styles.section}>
                <div className={styles.sectionHeader}>
                  {group.color && (
                    <span
                      className={styles.categoryDot}
                      style={{ background: resolveIngredientCategoryColor(group.color) }}
                    />
                  )}
                  <span className={styles.sectionLabel}>{group.label}</span>
                  <span className={styles.sectionLine} />
                </div>
                {group.items.map((item) => (
                  <div key={item.id} className={styles.itemRow}>
                    <span className={styles.itemName}>{item.name}</span>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleRemoveFridgeItem(item.name)}
                      aria-label={`${item.name} 用完了,從冰箱移除`}
                    >
                      <Trash2 size={17} strokeWidth={2.25} />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      ) : (
        <>
          {categories.length === 0 ? (
            <EmptyState title="還沒有任何分類" description="在下面建立第一個食材分類。" />
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className={styles.categoryRow}>
                <span
                  className={styles.itemDotBig}
                  style={{ background: resolveIngredientCategoryColor(cat.color) }}
                />
                <span className={styles.categoryName}>{cat.name}</span>
                <span className={styles.categoryCount}>{categoryCounts[cat.id] || 0} 項食材</span>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setDeletingCategory(cat)}
                  aria-label={`刪除分類${cat.name}`}
                >
                  <Trash2 size={17} strokeWidth={2.25} />
                </button>
              </div>
            ))
          )}

          <div className={styles.newCategoryCard}>
            <div className={styles.newCategoryRow}>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateCategory())}
                placeholder="新分類名稱,例如:蔬菜"
                className={styles.newCategoryInput}
                style={{ minHeight: 40 }}
              />
              {INGREDIENT_CATEGORY_COLORS.map((c) => (
                <ColorDot
                  key={c.key}
                  color={c}
                  size={30}
                  selected={newCategoryColor === c.key}
                  onClick={() => setNewCategoryColor(c.key)}
                />
              ))}
            </div>
            <button
              type="button"
              className={styles.createCategoryBtn}
              onClick={handleCreateCategory}
              disabled={creatingCategory || !newCategoryName.trim()}
            >
              新增分類
            </button>
          </div>
        </>
      )}

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

export default IngredientManagementPage;
