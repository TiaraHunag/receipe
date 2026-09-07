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

function IngredientManagementPage() {
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [ingredientMap, setIngredientMap] = useState<Record<string, IngredientWithCategory>>({});
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0].key);

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

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('刪除這個分類後,原本屬於這個分類的食材會變成「未分類」,確定要刪除嗎?')) return;
    await deleteIngredientCategory(id);
    await load();
  };

  const handleChangeCategory = async (ingredientName: string, categoryId: string) => {
    await setIngredientCategory(ingredientName, categoryId || null);
    await load();
  };

  if (loading) return <div style={{ padding: 20 }}>讀取中...</div>;

  const ingredientNames = Object.keys(ingredientMap).sort();

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 700 }}>
      <Link to="/">← 返回菜色列表</Link>
      <h1>食材管理</h1>

      <div style={{ marginBottom: 24, border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>分類管理</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {categories.map((c) => {
            const color = getColor(c.color);
            return (
              <span
                key={c.id}
                style={{
                  background: color.bg,
                  color: color.text,
                  padding: '4px 10px',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {c.name}
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c.id)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: color.text }}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="新分類名稱,例如:蔬菜"
            style={{ padding: 6 }}
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
                border: newCategoryColor === c.key ? '2px solid #333' : '1px solid #ccc',
                cursor: 'pointer',
              }}
              title={c.label}
            />
          ))}
          <button type="button" onClick={handleCreateCategory}>新增分類</button>
        </div>
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 8 }}>食材清單({ingredientNames.length})</h2>
      {ingredientNames.length === 0 ? (
        <p>目前還沒有任何食材紀錄</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {ingredientNames.map((name) => {
            const info = ingredientMap[name];
            const color = getColor(info.color);
            return (
              <li
                key={name}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #eee' }}
              >
                <span style={{ background: color.bg, color: color.text, padding: '2px 8px', borderRadius: 4, minWidth: 80, textAlign: 'center' }}>
                  {name}
                </span>
                <select
                  value={info.categoryId || ''}
                  onChange={(e) => handleChangeCategory(name, e.target.value)}
                  style={{ padding: 4 }}
                >
                  <option value="">未分類</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default IngredientManagementPage;