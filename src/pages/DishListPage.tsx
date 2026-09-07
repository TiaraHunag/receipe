import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getAllDishes, exportDishesToJSON, importDishesFromJSON, Dish } from '../db';

function DishListPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDishes = async () => {
    try {
      const results = await getAllDishes();
      setDishes(results);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDishes();
  }, []);

  const handleExport = async () => {
    try {
      const json = await exportDishesToJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `receipe_backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('備份檔案已下載');
    } catch (err) {
      setError('匯出失敗:' + String(err));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('匯入會覆蓋內容相同(同一道菜)的資料,確定要繼續嗎?')) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const count = await importDishesFromJSON(text);
      setMessage(`成功匯入 ${count} 筆資料`);
      await loadDishes();
    } catch (err) {
      setError('匯入失敗,請確認檔案格式是否正確:' + String(err));
    } finally {
      e.target.value = '';
    }
  };

  if (loading) return <div style={{ padding: 20 }}>讀取中...</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>菜色列表</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link to="/new">
          <button>+ 新增菜色</button>
        </Link>
        <Link to="/menu">
          <button>📅 菜單規劃</button>
        </Link>
        <button type="button" onClick={handleExport}>⬇ 匯出備份</button>
        <button type="button" onClick={handleImportClick}>⬆ 匯入還原</button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {message && (
        <p style={{ color: 'green', background: '#eefbee', padding: 8, borderRadius: 4 }}>
          {message}
        </p>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {dishes.length === 0 ? (
        <p>目前沒有資料</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {dishes.map((dish) => (
            <li
              key={dish.id}
              style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12, marginBottom: 8 }}
            >
              <Link to={`/dish/${dish.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{dish.name}</strong>
                {dish.hasRecipe && <span style={{ marginLeft: 8, fontSize: 12, color: 'green' }}>有食譜</span>}
                {dish.category.length > 0 && (
                  <div style={{ fontSize: 14, color: '#666' }}>{dish.category.join(', ')}</div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DishListPage;