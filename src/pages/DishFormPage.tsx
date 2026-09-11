// ============================================================================
// src/pages/DishFormPage.tsx (完整覆蓋 — 返回鍵/更新後改用 navigate(-1) 回到相對路徑上一頁，不寫死路徑)
// ============================================================================
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getDishById,
  insertDish,
  updateDish,
  getAllCategories,
  getAllTags,
  getAllIngredients,
  getAllIngredientCategories,
  getIngredientCategoryMap,
  setIngredientCategory,
  createIngredientCategory,
  IngredientCategory,
  IngredientWithCategory,
  CourseType,
  COURSE_LABELS,
  COURSE_ORDER,
} from '../db';
import { CATEGORY_COLORS, getColor } from '../colors';
import IngredientTag from '../components/IngredientTag';
import { Input, Textarea, Checkbox, Button, Tag, Card, IconButton, useToast } from '../components';

interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  path?: string;
}

function DishFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [prepAhead, setPrepAhead] = useState(false);
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  const [category, setCategory] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');

  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState('');

  const [hasRecipe, setHasRecipe] = useState(false);
  const [content, setContent] = useState<ContentBlock[]>([]);
  const [recipeSourceUrl, setRecipeSourceUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [nameError, setNameError] = useState<string | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);

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
    getAllTags().then(setTagOptions);
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
        setCourseTypes(data.courseTypes || []);
        setTags(data.tags || []);
        setIngredients(data.ingredients);
        setPrepAhead(data.prepAhead);
        setSource(data.source);
        setNotes(data.notes);
        setHasRecipe(data.hasRecipe);
        setContent(data.recipe?.content || []);
        setRecipeSourceUrl(data.recipe?.sourceUrl || '');
      }
      setLoadingData(false);
    };
    fetchData();
  }, [id, isEditMode]);

  const addCategoryValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !category.includes(trimmed)) setCategory([...category, trimmed]);
    setCategoryInput('');
  };
  const addCategory = () => addCategoryValue(categoryInput);
  const removeCategory = (index: number) => setCategory(category.filter((_, i) => i !== index));

  const addTagValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) setTags([...tags, trimmed]);
    setTagInput('');
  };
  const addTag = () => addTagValue(tagInput);
  const removeTag = (index: number) => setTags(tags.filter((_, i) => i !== index));

  const toggleCourseType = (course: CourseType) => {
    setCourseTypes((prev) =>
      prev.includes(course) ? prev.filter((c) => c !== course) : [...prev, course]
    );
  };

  const addIngredientValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      setIngredients([...ingredients, trimmed]);
      if (!ingredientCategoryMap[trimmed]) {
        setPendingIngredient(trimmed);
      }
    }
    setIngredientInput('');
  };
  const addIngredient = () => addIngredientValue(ingredientInput);
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
    setNameError(null);
    setRecipeError(null);

    if (!name.trim()) { setNameError('請輸入菜名'); return; }
    if (hasRecipe && content.length === 0) {
      setRecipeError('已勾選「有詳細食譜」,請至少新增一段文字或圖片內容,或取消勾選');
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
        recipe: hasRecipe ? { coverPhotoPath: '', sourceUrl: recipeSourceUrl.trim(), content } : null,
        courseTypes,
        tags,
      };

      if (isEditMode && id) {
        await updateDish(id, payload);
        navigate(-1);
      } else {
        const newId = await insertDish(payload);
        navigate(`/dish/${newId}`);
      }
    } catch (err) {
      showToast('儲存失敗,可能是本地儲存空間不足,請稍後再試', 'error');
      setSaving(false);
    }
  };

  if (loadingData) return <div style={{ padding: 'var(--space-4)' }}>讀取中...</div>;

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 600, margin: '0 auto', paddingBottom: 96 }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          font: 'var(--font-caption)',
          color: 'var(--color-text-secondary)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        ‹ 上一頁
      </button>
      <h1 style={{ font: 'var(--font-title)', color: 'var(--color-text)', margin: 'var(--space-3) 0 var(--space-4)' }}>
        {isEditMode ? '編輯菜色' : '新增菜色'}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Input
            label="名稱 *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如:番茄炒蛋"
            error={nameError || undefined}
          />
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input
                label="類型"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                placeholder="例如:蛋類,按 Enter 新增"
                suggestions={categoryOptions.filter((c) => !category.includes(c))}
                onSuggestionSelect={addCategoryValue}
              />
            </div>
            <Button type="button" variant="secondary" onClick={addCategory}>新增</Button>
          </div>
          {category.length > 0 && (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
              {category.map((c, i) => (
                <Tag key={i} onClick={() => removeCategory(i)}>{c} ×</Tag>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input
                label="標籤"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="例如:快速,按 Enter 新增"
                hint="自由輸入,例如簡單、快速、素食、宴客,跟「類型」分開,用來做更細的描述"
                suggestions={tagOptions.filter((t) => !tags.includes(t))}
                onSuggestionSelect={addTagValue}
              />
            </div>
            <Button type="button" variant="secondary" onClick={addTag}>新增</Button>
          </div>
          {tags.length > 0 && (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
              {tags.map((t, i) => (
                <Tag key={i} color="green" onClick={() => removeTag(i)}>{t} ×</Tag>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <label style={{ font: 'var(--font-label)', color: 'var(--color-text)', display: 'block', marginBottom: 'var(--space-2)' }}>
            餐點分類
          </label>
          <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
            可複選,對應「菜單規劃」的六個分類,選好之後未來排菜單挑選時會更方便篩選
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {COURSE_ORDER.map((course) => {
              const selected = courseTypes.includes(course);
              return (
                <button
                  key={course}
                  type="button"
                  onClick={() => toggleCourseType(course)}
                  style={{
                    padding: '6px var(--space-4)',
                    borderRadius: 'var(--radius-pill)',
                    border: selected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: selected ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                    color: selected ? 'var(--color-primary-hover)' : 'var(--color-text)',
                    cursor: 'pointer',
                    font: selected ? '600 13px var(--font-family)' : 'var(--font-caption)',
                  }}
                >
                  {selected ? '✓ ' : ''}{COURSE_LABELS[course]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input
                label="食材"
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                placeholder="例如:番茄,按 Enter 新增"
                suggestions={ingredientOptions.filter((i) => !ingredients.includes(i))}
                onSuggestionSelect={addIngredientValue}
              />
            </div>
            <Button type="button" variant="secondary" onClick={addIngredient}>新增</Button>
          </div>

          {ingredients.length > 0 && (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {ingredients.map((ing, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IngredientTag name={ing} colorKey={ingredientCategoryMap[ing]?.color} />
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', font: 'var(--font-caption)', color: 'var(--color-text-secondary)' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {pendingIngredient && (
            <Card style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', borderStyle: 'dashed' }}>
              <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
                「{pendingIngredient}」是新食材,幫它選個分類(之後可在食材管理頁調整):
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                {ingredientCategories.map((c) => {
                  const color = getColor(c.color);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => assignCategory(c.id)}
                      style={{ background: color.bg, color: color.text, border: 'none', borderRadius: 'var(--radius-control)', padding: '4px 10px', cursor: 'pointer', font: 'var(--font-caption)' }}
                    >
                      {c.name}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  + 新分類
                </button>
                <button
                  type="button"
                  onClick={() => assignCategory(null)}
                  style={{ font: 'var(--font-caption)', color: 'var(--color-text-placeholder)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  先跳過
                </button>
              </div>
              {showNewCategoryInput && (
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
                  <Button type="button" size="sm" onClick={handleCreateCategory}>建立並套用</Button>
                </div>
              )}
            </Card>
          )}
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Checkbox label="可預先製作" checked={prepAhead} onChange={(e) => setPrepAhead(e.target.checked)} />
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Input
            label="來源"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="選填,例如:阿嬤的做法、某本食譜書"
            hint="自由填寫,不一定要是網址;食譜的原始連結請填在下面「有詳細食譜」展開後的欄位"
          />
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Textarea label="備註" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Checkbox label="這道菜有詳細食譜" checked={hasRecipe} onChange={(e) => setHasRecipe(e.target.checked)} />
        </div>

        {hasRecipe && (
          <Card style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)' }}>
            <label style={{ font: 'var(--font-label)', color: 'var(--color-text)', display: 'block', marginBottom: 'var(--space-3)' }}>
              食譜內容
            </label>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Input
                label="食譜原始連結(選填)"
                value={recipeSourceUrl}
                onChange={(e) => setRecipeSourceUrl(e.target.value)}
                placeholder="例如:IG 貼文或食譜網站連結"
                hint="有填的話,詳細頁的食譜內容區塊會出現「查看原始食譜」按鈕"
              />
            </div>
            {content.map((block, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', alignItems: 'flex-start' }}>
                <span style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', minWidth: 40, paddingTop: 10 }}>
                  {block.type === 'text' ? '文字' : '圖片'}
                </span>
                <div style={{ flex: 1 }}>
                  {block.type === 'text' ? (
                    <Textarea value={block.text} onChange={(e) => updateBlock(i, e.target.value)} />
                  ) : (
                    <Input
                      value={block.path}
                      onChange={(e) => updateBlock(i, e.target.value)}
                      placeholder="本地圖片選取功能尚未完成,暫用文字路徑代替"
                    />
                  )}
                </div>
                <IconButton icon="🗑" label="刪除這個區塊" danger onClick={() => removeBlock(i)} />
              </div>
            ))}
            {recipeError && (
              <p style={{ color: 'var(--color-danger)', font: 'var(--font-caption)', marginBottom: 'var(--space-2)' }}>{recipeError}</p>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Button type="button" variant="secondary" size="sm" onClick={addTextBlock}>+ 新增文字段落</Button>
              <Button type="button" variant="secondary" size="sm" onClick={addImageBlock}>+ 新增圖片(暫用路徑)</Button>
            </div>
          </Card>
        )}

        {nameError && (
          <p style={{ color: 'var(--color-danger)', font: 'var(--font-caption)', marginBottom: 'var(--space-3)' }}>{nameError}</p>
        )}

        <Button type="submit" loading={saving} fullWidth>
          {saving ? '儲存中...' : isEditMode ? '更新菜色' : '儲存菜色'}
        </Button>
      </form>
    </div>
  );
}

export default DishFormPage;