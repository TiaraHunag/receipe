import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { insertDish } from '../db';
import { Input, Textarea, Button, Card, Spinner } from '../components';
import { fetchIgPreview, isInstagramUrl, IgPreview } from '../igPreview';

function extractUrl(text: string): string {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : '';
}

type IgPreviewStatus = 'idle' | 'loading' | 'found' | 'not-found';

function QuickAddPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const sharedText = (location.state as { sharedText?: string } | undefined)?.sharedText;

  const [name, setName] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);

  const [igPreviewStatus, setIgPreviewStatus] = useState<IgPreviewStatus>('idle');
  const [igPreview, setIgPreview] = useState<IgPreview | null>(null);

  const detectedUrl = useMemo(() => extractUrl(pastedText), [pastedText]);
  const isIgUrl = useMemo(() => (detectedUrl ? isInstagramUrl(detectedUrl) : false), [detectedUrl]);

  // 網址內容變了(使用者換貼一則新連結),先前的預覽結果就失效,清掉避免誤導
  useEffect(() => {
    setIgPreviewStatus('idle');
    setIgPreview(null);
  }, [detectedUrl]);

  const handleFetchIgPreview = async () => {
    if (!detectedUrl) return;
    setIgPreviewStatus('loading');
    setIgPreview(null);
    const result = await fetchIgPreview(detectedUrl);
    if (result) {
      setIgPreview(result);
      setIgPreviewStatus('found');
    } else {
      setIgPreviewStatus('not-found');
    }
  };

  // 從 Share Sheet 分享進來的內容,直接帶入既有的貼上欄位
  useEffect(() => {
    if (sharedText) {
      setPastedText(sharedText);
    }
  }, [sharedText]);

  // 分享進來的剛好是 IG 連結的話,自動抓一次預覽,省去使用者手動按一次
  useEffect(() => {
    if (sharedText && isIgUrl && igPreviewStatus === 'idle') {
      handleFetchIgPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedText, isIgUrl, igPreviewStatus]);

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
        source: '',
        notes: '',
        hasRecipe: true,
        recipe: {
          coverPhotoPath: '',
          sourceUrl: url,
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

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Textarea
            label="貼上連結或文字內容 *"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={7}
            placeholder="例如:IG 貼文連結,或整段複製下來的做法文字"
            error={textError || undefined}
            hint={textError ? undefined : '如果內容裡有網址,會自動偵測存到「食譜原始連結」;其餘文字會先整段存進食譜內容,之後可以再拆成一步一步的步驟。'}
          />
        </div>

        {isIgUrl && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            {igPreviewStatus === 'idle' && (
              <Button type="button" variant="secondary" onClick={handleFetchIgPreview}>
                🔍 確認一下抓到的是哪則貼文
              </Button>
            )}

            {igPreviewStatus === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Spinner size="sm" />
                <span style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)' }}>
                  正在讀取預覽…(僅原生 App 環境可用,StackBlitz 預覽會抓不到)
                </span>
              </div>
            )}

            {igPreviewStatus === 'found' && igPreview && (
              <Card style={{ padding: 'var(--space-3)' }}>
                <div style={{ font: 'var(--font-label)', color: 'var(--color-text)', marginBottom: 4 }}>
                  @{igPreview.account}
                </div>
                <div style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)' }}>
                  {igPreview.snippet}
                </div>
                <div style={{ font: 'var(--font-caption)', color: 'var(--color-text-placeholder)', marginTop: 8 }}>
                  僅供確認貼文,食譜內容還是要自己貼上或補齊喔
                </div>
              </Card>
            )}

            {igPreviewStatus === 'not-found' && (
              <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)' }}>
                抓不到這則貼文的預覽,沒關係,直接繼續用文字內容就好。
              </p>
            )}
          </div>
        )}

        <Button type="submit" loading={saving} fullWidth>
          {saving ? '建立中...' : '建立草稿並繼續編輯'}
        </Button>
      </form>
    </div>
  );
}

export default QuickAddPage;
