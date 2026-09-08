import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { insertDish } from '../db';
import { Input, Textarea, Button } from '../components';

function extractUrl(text: string): string {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : '';
}

function QuickAddPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setTextError(null);

    let hasError = false;
    if (!name.trim()) {
      setNameError('請幫這道菜取個名字');
      hasError = true;
    }
    if (!pastedText.trim()) {
      setTextError('請貼上連結或文字內容');
      hasError = true;
    }
    if (hasError) return;

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
        courseTypes: [],
        tags: [],
      });
      navigate(`/edit/${newId}`);
    } catch (err) {
      setTextError('儲存失敗,請稍後再試');
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 480, margin: '0 auto', paddingBottom: 96 }}>
      <Link to="/" style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>← 返回列表</Link>
      <h1 style={{ font: 'var(--font-title)', color: 'var(--color-text)', margin: 'var(--space-3) 0' }}>快速新增(貼上連結/文字)</h1>
      <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
        從 IG、Threads 或其他地方複製連結或文字內容,貼在下面,系統會先幫你建立一筆草稿,之後再回來補齊食材跟步驟。
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Input
            label="菜名 *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="幫這道菜取個名字"
            error={nameError || undefined}
          />
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Textarea
            label="貼上連結或文字內容 *"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={7}
            placeholder="例如:IG 貼文連結,或整段複製下來的做法文字"
            error={textError || undefined}
            hint={textError ? undefined : '如果內容裡有網址,會自動偵測存到「來源」欄位;其餘文字會先整段存進食譜內容,之後可以再拆成一步一步的步驟。'}
          />
        </div>

        <Button type="submit" loading={saving} fullWidth>
          {saving ? '建立中...' : '建立草稿並繼續編輯'}
        </Button>
      </form>
    </div>
  );
}

export default QuickAddPage;
