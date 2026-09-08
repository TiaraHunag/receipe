import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllIngredientCategories,
  createIngredientCategory,
  deleteIngredientCategory,
  getIngredientCategoryMap,
  setIngredientCategory,
  IngredientCategory,
  IngredientWithCategory,
} from '../db';
import { CATEGORY_COLORS, getColor } from '../colors';
import { Card, Select, Button, ConfirmDialog, EmptyState, Spinner } from '../components';

function IngredientManagementPage() {
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [ingredientMap, setIngredientMap] = useState<Record<string, IngredientWithCategory>>({});
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0].key);
  const [deletingCategory, setDeletingCategory] = useState<IngredientCategory | null>(null);

  const load = async () => {
    const [cats, map] = await Promise.all([getAllIngredientCategories(), getIngredientCategoryMap()]);
    setCategories(cats);
    setIngredientMap(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    await createIngredientCategory(trimmed, newCategoryColor);
    setNewCategoryName('');
    await load();
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    await deleteIngredientCategory(deletingCategory.id);
    setDeletingCategory(null);
    await load();
  };

  const handleChangeCategory = async (ingredientName: string, categoryId: string) => {
    await setIngredientCategory(ingredientName, categoryId || null);
    await load();
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    );
  }

  const ingredientNames = Object.keys(ingredientMap).sort();

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 700, margin: '0 auto', paddingBottom: 96 }}>
      <Link to="/" style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>← 返回菜色列表</Link>
      <h1 style={{ font: 'var(--font-title)', color: 'var(--color-text)', margin: 'var(--space-3) 0 var(--space-4)' }}>食材管理</h1>

      <Card style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)' }}>
        <h2 style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)', margin: '0 0 var(--space-3)' }}>分類管理</h2>
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

      <h2 style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)', margin: '0 0 var(--space-3)' }}>
        食材清單({ingredientNames.length})
      </h2>
      {ingredientNames.length === 0 ? (
        <EmptyState icon="🧊" title="目前還沒有任何食材紀錄" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ingredientNames.map((name) => {
            const info = ingredientMap[name];
            const color = getColor(info.color);
            return (
              <div
                key={name}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}
              >
                <span style={{ background: color.bg, color: color.text, padding: '2px var(--space-2)', borderRadius: 'var(--radius-control)', minWidth: 80, textAlign: 'center', font: 'var(--font-caption)' }}>
                  {name}
                </span>
                <div style={{ width: 140 }}>
                  <Select
                    aria-label={`${name} 的分類`}
                    value={info.categoryId || ''}
                    onChange={(e) => handleChangeCategory(name, e.target.value)}
                    placeholder="未分類"
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  />
                </div>
              </div>
            );
          })}
        </div>
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
