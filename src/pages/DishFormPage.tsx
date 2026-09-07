import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  getDishById,
  insertDish,
  updateDish,
  getAllCategories,
  getAllIngredients,
  getAllIngredientCategories,
  getIngredientCategoryMap,
  setIngredientCategory,
  createIngredientCategory,
  IngredientCategory,
  IngredientWithCategory,
} from '../db';
import { CATEGORY_COLORS, getColor } from '../colors';
import IngredientTag from '../components/IngredientTag';

interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  path?: string;
}

function DishFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [name, setName] = useState('');
  const [prepAhead, setPrepAhead] = useState(false);
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  const [category, setCategory] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState('');

  const [hasRecipe, setHasRecipe] = useState(false);
  const [content, setContent] = useState<ContentBlock[]>([]);

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<string[]>([]);

  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategory[]>([]);
  const [ingredientCategoryMap, setIngredientCategoryMap] = useState<Record<string, IngredientWithCategory>>({});
  const [pendingIngredient, setPendingIngredient] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0].key);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  const loadIngredientMeta = async () => {
    const [cats, map] = await Promise.all([getAllIngredientCategories(), getIngredientCategoryMap()]);
    setIngredientCategories(cats);
    setIngredientCategoryMap(map);
  };

  useEffect(() => {
    getAllCategories().then(setCategoryOptions);
    getAllIngredients().then(setIngredientOptions);
    loadIngredientMeta();
  }, []);

  useEffect(() => {
    if (!isEditMode || !id) return;
    const fetchData = async () => {
      const data = await getDishById(id);
      if (data) {
        setName(data.name);
        setCategory(data.category);
        setIngredients(data.ingredients);
        setPrepAhead(data.prepAhead);
        setSource(data.source);
        setNotes(data.notes);
        setHasRecipe(data.hasRecipe);
        setContent(data.recipe?.content || []);
      }
      setLoadingData(false);
    };
    fetchData();
  }, [id, isEditMode]);

  const addCategory = () => {
    const trimmed = categoryInput.trim();
    if (trimmed && !category.includes(trimmed)) setCategory([...category, trimmed]);
    setCategoryInput('');
  };
  const removeCategory = (index: number) => setCategory(category.filter((_, i) => i !== index));

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed) {
      setIngredients([...ingredients, trimmed]);
      if (!ingredientCategoryMap[trimmed]) {
        setPendingIngredient(trimmed);
      }
    }
    setIngredientInput('');
  };
  const removeIngredient = (index: number) => setIngredients(ingredients.filter((_, i) => i !== index));

  const assignCategory = async (categoryId: string | null) => {
    if (!pendingIngredient) return;
    await setIngredientCategory(pendingIngredient, categoryId);
    await loadIngredientMeta();
    setPendingIngredient(null);
    setShowNewCategoryInput(false);
  };

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const newId = await createIngredientCategory(trimmed, newCategoryColor);
    setNewCategoryName('');
    await assignCategory(newId);
  };

  const addTextBlock = () => setContent([...content, { type: 'text', text: '' }]);
  const addImageBlock = () => setContent([...content, { type: 'image', path: '' }]);
  const updateBlock = (index: number, value: string) => {
    const updated = [...content];
    updated[index] = updated[index].type === 'text'
      ? { ...updated[index], text: value }
      : { ...updated[index], path: value };
    setContent(updated);
  };
  const removeBlock = (index: number) => setContent(content.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('請輸入菜名'); return; }
    if (ingredients.length === 0) { setError('請至少新增一項食材'); return; }
    if (hasRecipe && content.length === 0) {
      setError('已勾選「有詳細食譜」,請至少新增一段文字或圖片內容,或取消勾選');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        ingredients,
        prepAhead,
        source,
        notes,
        hasRecipe,
        recipe: hasRecipe ? { coverPhotoPath: '', content } : null,
      };

      if (isEditMode && id) {
        await updateDish(id, payload);
        navigate(`/dish/${id}`);
      } else {
        const newId = await insertDish(payload);
        navigate(`/dish/${newId}`);
      }
    } catch (err) {
      setError('儲存失敗,可能是本地儲存空間不足,請稍後再試');
      setSaving(false);
    }
  };

  if (loadingData) return <div style={{ padding: 20 }}>讀取中...</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 600 }}>
      <Link to="/">← 返回列表</Link>
      <h1>{isEditMode ? '編輯菜色' : '新增菜色'}</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>名稱 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            placeholder="例如:番茄炒蛋"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>類型</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              style={{ flex: 1, padding: 8 }}
              placeholder="例如:蛋類,按 Enter 新增"
              list="category-options"
            />
            <datalist id="category-options">
              {categoryOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <button type="button" onClick={addCategory}>新增</button>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {category.map((c, i) => (
              <span key={i} style={{ background: '#eee', padding: '4px 8px', borderRadius: 4 }}>
                {c}{' '}
                <button type="button" onClick={() => removeCategory(i)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>食材</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
              style={{ flex: 1, padding: 8 }}
              placeholder="例如:番茄,按 Enter 新增"
              list="ingredient-options"
            />
            <datalist id="ingredient-options">
              {ingredientOptions.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
            <button type="button" onClick={addIngredient}>新增</button>
          </div>

          <ul style={{ marginTop: 8, paddingLeft: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ingredients.map((ing, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IngredientTag name={ing} colorKey={ingredientCategoryMap[ing]?.color} />
                <button type="button" onClick={() => removeIngredient(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12 }}>×</button>
              </li>
            ))}
          </ul>

          {pendingIngredient && (
            <div style={{ marginTop: 8, padding: 8, border: '1px dashed #999', borderRadius: 6 }}>
              <p style={{ fontSize: 13, marginBottom: 6 }}>
                「{pendingIngredient}」是新食材,幫它選個分類(之後可在食材管理頁調整):
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' }}>
                {ingredientCategories.map((c) => {
                  const color = getColor(c.color);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => assignCategory(c.id)}
                      style={{ background: color.bg, color: color.text, border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}
                    >
                      {c.name}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setShowNewCategoryInput(!showNewCategoryInput)} style={{ fontSize: 13 }}>
                  + 新分類
                </button>
                <button type="button" onClick={() => assignCategory(null)} style={{ fontSize: 13, color: '#999' }}>
                  先跳過
                </button>
              </div>
              {showNewCategoryInput && (
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
                  <button type="button" onClick={handleCreateCategory}>建立並套用</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>
            <input type="checkbox" checked={prepAhead} onChange={(e) => setPrepAhead(e.target.checked)} /> 可預先製作
          </label>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>來源</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>備註</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: 8, minHeight: 60 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>
            <input type="checkbox" checked={hasRecipe} onChange={(e) => setHasRecipe(e.target.checked)} /> 這道菜有詳細食譜
          </label>
        </div>

        {hasRecipe && (
          <div style={{ marginBottom: 16, border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>食譜內容</label>
            {content.map((block, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 12, color: '#666', minWidth: 40 }}>
                  {block.type === 'text' ? '文字' : '圖片'}
                </span>
                {block.type === 'text' ? (
                  <textarea
                    value={block.text}
                    onChange={(e) => updateBlock(i, e.target.value)}
                    style={{ flex: 1, padding: 8, minHeight: 50 }}
                  />
                ) : (
                  <input
                    type="text"
                    value={block.path}
                    onChange={(e) => updateBlock(i, e.target.value)}
                    style={{ flex: 1, padding: 8 }}
                    placeholder="本地圖片選取功能尚未完成,暫用文字路徑代替"
                  />
                )}
                <button type="button" onClick={() => removeBlock(i)}>刪除</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" onClick={addTextBlock}>+ 新增文字段落</button>
              <button type="button" onClick={addImageBlock}>+ 新增圖片(暫用路徑)</button>
            </div>
          </div>
        )}

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={saving} style={{ padding: '10px 20px', fontWeight: 'bold' }}>
          {saving ? '儲存中...' : isEditMode ? '更新菜色' : '儲存菜色'}
        </button>
      </form>
    </div>
  );
}

export default DishFormPage;