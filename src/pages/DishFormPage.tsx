import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  url?: string;
}

function DishFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // 編輯模式:載入既有資料
  useEffect(() => {
    if (!isEditMode || !id) return;
    const fetchData = async () => {
      const docRef = doc(db, 'dishes', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || '');
        setCategory(data.category || []);
        setIngredients(data.ingredients || []);
        setPrepAhead(data.prepAhead || false);
        setSource(data.source || '');
        setNotes(data.notes || '');
        setHasRecipe(data.hasRecipe || false);
        setContent(data.recipe?.content || []);
      }
      setLoadingData(false);
    };
    fetchData();
  }, [id, isEditMode]);

  const addCategory = () => {
    const trimmed = categoryInput.trim();
    if (trimmed && !category.includes(trimmed)) {
      setCategory([...category, trimmed]);
    }
    setCategoryInput('');
  };
  const removeCategory = (index: number) => {
    setCategory(category.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed) {
      setIngredients([...ingredients, trimmed]);
    }
    setIngredientInput('');
  };
  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addTextBlock = () => {
    setContent([...content, { type: 'text', text: '' }]);
  };
  const addImageBlock = () => {
    setContent([...content, { type: 'image', url: '' }]);
  };
  const updateBlock = (index: number, value: string) => {
    const updated = [...content];
    if (updated[index].type === 'text') {
      updated[index] = { ...updated[index], text: value };
    } else {
      updated[index] = { ...updated[index], url: value };
    }
    setContent(updated);
  };
  const removeBlock = (index: number) => {
    setContent(content.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
        setError('請輸入菜名');
        return;
    }
    if (ingredients.length === 0) {
        setError('請至少新增一項食材');
        return;
    }
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
        recipe: hasRecipe ? { coverPhotoUrl: '', content } : null,
        updatedAt: serverTimestamp(),
      };

      if (isEditMode && id) {
        await updateDoc(doc(db, 'dishes', id), payload);
        navigate(`/dish/${id}`);
      } else {
        const docRef = await addDoc(collection(db, 'dishes'), {
          ...payload,
          ownerId: user?.uid,
          createdAt: serverTimestamp(),
        });
        navigate(`/dish/${docRef.id}`);
      }
    } catch (err: any) {
        if (err.code === 'permission-denied') {
          setError('沒有權限執行此操作,請確認已登入');
        } else if (err.code === 'unavailable') {
          setError('網路連線失敗,請檢查網路狀態後再試一次');
        } else {
          setError('儲存失敗,請稍後再試');
        }
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
            />
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
            />
            <button type="button" onClick={addIngredient}>新增</button>
          </div>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            {ingredients.map((ing, i) => (
              <li key={i}>
                {ing}{' '}
                <button type="button" onClick={() => removeIngredient(i)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
              </li>
            ))}
          </ul>
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
                    value={block.url}
                    onChange={(e) => updateBlock(i, e.target.value)}
                    style={{ flex: 1, padding: 8 }}
                    placeholder="貼上圖片網址(照片上傳功能尚未完成)"
                  />
                )}
                <button type="button" onClick={() => removeBlock(i)}>刪除</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" onClick={addTextBlock}>+ 新增文字段落</button>
              <button type="button" onClick={addImageBlock}>+ 新增圖片(暫用網址)</button>
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