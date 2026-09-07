import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDishById, deleteDish, Dish } from '../db';

function DishDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dish, setDish] = useState<Dish | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDish = async () => {
      if (!id) return;
      const result = await getDishById(id);
      setDish(result);
      setLoading(false);
    };
    fetchDish();
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>讀取中...</div>;
  if (!dish) return <div style={{ padding: 20 }}>找不到這道菜</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <Link to="/">← 返回列表</Link>
      <h1>{dish.name}</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Link to={`/edit/${id}`}>
          <button type="button">編輯</button>
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
          style={{ color: 'red' }}
        >
          刪除
        </button>
      </div>
      {dish.category.length > 0 && <p>類型:{dish.category.join(', ')}</p>}
      {dish.ingredients.length > 0 && <p>食材:{dish.ingredients.join('、')}</p>}
      <p>可預先製作:{dish.prepAhead ? '是' : '否'}</p>
      {dish.source && <p>來源:{dish.source}</p>}
      {dish.notes && <p>備註:{dish.notes}</p>}

      {dish.hasRecipe && dish.recipe && (
        <div style={{ marginTop: 20, borderTop: '1px solid #ccc', paddingTop: 16 }}>
          <h2>食譜內容</h2>
          {dish.recipe.content.map((block, i) =>
            block.type === 'text' ? (
              <p key={i}>{block.text}</p>
            ) : (
              <img key={i} src={block.path} alt="" style={{ maxWidth: '100%', margin: '8px 0' }} />
            )
          )}
        </div>
      )}
    </div>
  );
}

export default DishDetailPage;