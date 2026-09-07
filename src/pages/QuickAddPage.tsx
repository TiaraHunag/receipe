import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { insertDish } from '../db';

function extractUrl(text: string): string {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : '';
}

function QuickAddPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('請幫這道菜取個名字');
      return;
    }
    if (!pastedText.trim()) {
      setError('請貼上連結或文字內容');
      return;
    }

    setSaving(true);
    try {
      const url = extractUrl(pastedText);
      const newId = await insertDish({
        name: name.trim(),
        category: [],
        ingredients: [],
        prepAhead: false,
        source: url,
        notes: '',
        hasRecipe: true,
        recipe: {
          coverPhotoPath: '',
          content: [{ type: 'text', text: pastedText.trim() }],
        },
      });
      navigate(`/edit/${newId}`);
    } catch (err) {
      setError('儲存失敗,請稍後再試');
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 80 }}>
      <Link to="/" style={{ fontSize: 15 }}>← 返回列表</Link>
      <h1 style={{ fontSize: 20, margin: '12px 0' }}>快速新增(貼上連結/文字)</h1>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
        從 IG、Threads 或其他地方複製連結或文字內容,貼在下面,系統會先幫你建立一筆草稿,之後再回來補齊食材跟步驟。
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>菜名 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: 10, fontSize: 15 }}
            placeholder="幫這道菜取個名字"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>貼上連結或文字內容 *</label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            style={{ width: '100%', padding: 10, fontSize: 15, minHeight: 160 }}
            placeholder="例如:IG 貼文連結,或整段複製下來的做法文字"
          />
          <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            如果內容裡有網址,會自動偵測存到「來源」欄位;其餘文字會先整段存進食譜內容,之後可以再拆成一步一步的步驟。
          </p>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button
          type="submit"
          disabled={saving}
          style={{ width: '100%', padding: 12, fontSize: 16, fontWeight: 'bold' }}
        >
          {saving ? '建立中...' : '建立草稿並繼續編輯'}
        </button>
      </form>
    </div>
  );
}

export default QuickAddPage;