import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDishById, deleteDish, Dish, getIngredientCategoryMap, IngredientWithCategory } from '../db';
import IngredientTag from '../components/IngredientTag';

function linkify(text: string): (string | JSX.Element)[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#B23A2E', wordBreak: 'break-all' }}>
        {part}
      </a>
    ) : (
      part
    )
  );
}

function DishDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dish, setDish] = useState<Dish | null>(null);
  const [ingredientMap, setIngredientMap] = useState<Record<string, IngredientWithCategory>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDish = async () => {
      if (!id) return;
      const [result, map] = await Promise.all([getDishById(id), getIngredientCategoryMap()]);
      setDish(result);
      setIngredientMap(map);
      setLoading(false);
    };
    fetchDish();
  }, [id]);

  if (loading) return <div style={{ padding: 20, color: '#8A7F72' }}>讀取中...</div>;
  if (!dish) return <div style={{ padding: 20, color: '#8A7F72' }}>找不到這道菜</div>;

  const sourceIsUrl = !!dish.source && /^https?:\/\//.test(dish.source);

  return (
    <div style={{ background: '#FAF6F0', minHeight: '100vh' }}>
      <div style={{ padding: '20px 20px 80px', fontFamily: '-apple-system, "PingFang TC", "Noto Sans TC", sans-serif', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Link to="/" style={{ fontSize: 14, color: '#8A7F72', textDecoration: 'none' }}>← 返回列表</Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/edit/${id}`} style={{ textDecoration: 'none' }}>
              <button
                type="button"
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  borderRadius: 20,
                  border: '1px solid #DCD3C4',
                  background: '#fff',
                  color: '#2B2420',
                }}
              >
                編輯
              </button>
            </Link>
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(`確定要刪除「${dish.name}」嗎?此操作無法復原。`)) {
                  if (id) {
                    await deleteDish(id);
                    navigate('/');
                  }
                }
              }}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                borderRadius: 20,
                border: '1px solid #E9D6D2',
                background: '#fff',
                color: '#B23A2E',
              }}
            >
              刪除
            </button>
          </div>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#2B2420', margin: '0 0 10px', lineHeight: 1.3 }}>
          {dish.name}
        </h1>

        {dish.category.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {dish.category.map((c) => (
              <span
                key={c}
                style={{
                  fontSize: 13,
                  padding: '3px 11px',
                  borderRadius: 20,
                  background: '#F1ECE1',
                  color: '#6B6154',
                }}
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {dish.ingredients.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 13, color: '#8A7F72', marginBottom: 8 }}>食材</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {dish.ingredients.map((ing) => (
                <IngredientTag key={ing} name={ing} colorKey={ingredientMap[ing]?.color} />
              ))}
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid #EDE6D8', paddingTop: 16, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, color: '#2B2420', marginBottom: dish.source ? 10 : 0 }}>
            <span style={{ color: dish.prepAhead ? '#5C6E4F' : '#C4BCAE' }}>{dish.prepAhead ? '✓' : '–'}</span>
            <span>{dish.prepAhead ? '可預先製作' : '不可預先製作'}</span>
          </div>
          {dish.source && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14.5 }}>
              <span style={{ color: '#8A7F72' }}>來源</span>
              {sourceIsUrl ? (
                <a href={dish.source} target="_blank" rel="noopener noreferrer" style={{ color: '#B23A2E', wordBreak: 'break-all' }}>
                  {dish.source}
                </a>
              ) : (
                <span style={{ color: '#2B2420' }}>{dish.source}</span>
              )}
            </div>
          )}
        </div>

        {dish.notes && (
          <div
            style={{
              borderLeft: '3px solid #5C6E4F',
              paddingLeft: 14,
              marginBottom: 22,
              fontSize: 14.5,
              color: '#5C5347',
              fontStyle: 'italic',
              lineHeight: 1.6,
            }}
          >
            {dish.notes}
          </div>
        )}

        {dish.hasRecipe && dish.recipe && (
          <div style={{ borderTop: '1px solid #EDE6D8', paddingTop: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2B2420', margin: '0 0 14px' }}>食譜內容</h2>

            {sourceIsUrl && (
              
                <a
                href={dish.source}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  marginBottom: 16,
                  padding: '8px 16px',
                  background: '#B23A2E',
                  color: '#fff',
                  borderRadius: 20,
                  textDecoration: 'none',
                  fontSize: 13.5,
                }}
              >
                🔗 查看原始食譜
              </a>
            )}

            {dish.recipe.content?.map((block, i) =>
              block.type === 'text' ? (
                <p
                  key={i}
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: 15.5,
                    lineHeight: 1.8,
                    color: '#3A332C',
                    margin: '0 0 14px',
                  }}
                >
                  {linkify(block.text || '')}
                </p>
              ) : (
                <img
                  key={i}
                  src={block.path}
                  alt=""
                  style={{ maxWidth: '100%', borderRadius: 10, margin: '8px 0 14px' }}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DishDetailPage;