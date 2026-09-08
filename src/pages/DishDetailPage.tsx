import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDishById, deleteDish, Dish, getIngredientCategoryMap, IngredientWithCategory } from '../db';
import IngredientTag from '../components/IngredientTag';
import { Button, Tag, ConfirmDialog, Spinner, useToast } from '../components';

function linkify(text: string): (string | JSX.Element)[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-danger)', wordBreak: 'break-all' }}>
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
  const { showToast } = useToast();
  const [dish, setDish] = useState<Dish | null>(null);
  const [ingredientMap, setIngredientMap] = useState<Record<string, IngredientWithCategory>>({});
  const [loading, setLoading] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    );
  }
  if (!dish) return <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>找不到這道菜</div>;

  const sourceIsUrl = !!dish.source && /^https?:\/\//.test(dish.source);
  const recipeSourceUrl = dish.recipe?.sourceUrl || '';

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteDish(id);
      navigate('/');
    } catch (err) {
      showToast('刪除失敗:' + String(err), 'error');
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <div style={{ padding: 'var(--space-4) var(--space-4) 96px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <Link to="/" style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>← 返回列表</Link>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to={`/edit/${id}`} style={{ textDecoration: 'none' }}>
            <Button type="button" variant="secondary" size="sm">編輯</Button>
          </Link>
          <Button type="button" variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>刪除</Button>
        </div>
      </div>

      <h1 style={{ font: 'var(--font-title)', fontSize: 26, color: 'var(--color-text)', margin: '0 0 var(--space-3)', lineHeight: 1.3 }}>
        {dish.name}
      </h1>

      {dish.category.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginBottom: dish.tags?.length ? 'var(--space-2)' : 'var(--space-5)' }}>
          {dish.category.map((c) => (
            <Tag key={c}>{c}</Tag>
          ))}
        </div>
      )}

      {dish.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginBottom: 'var(--space-5)' }}>
          {dish.tags.map((t) => (
            <Tag key={t} color="green">{t}</Tag>
          ))}
        </div>
      )}

      {dish.ingredients.length > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>食材</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {dish.ingredients.map((ing) => (
              <IngredientTag key={ing} name={ing} colorKey={ingredientMap[ing]?.color} />
            ))}
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', font: 'var(--font-body)', color: 'var(--color-text)', marginBottom: dish.source ? 'var(--space-2)' : 0 }}>
          <span style={{ color: dish.prepAhead ? 'var(--color-primary)' : 'var(--color-text-placeholder)' }}>{dish.prepAhead ? '✓' : '–'}</span>
          <span>{dish.prepAhead ? '可預先製作' : '不可預先製作'}</span>
        </div>
        {dish.source && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', font: 'var(--font-body)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>來源</span>
            {sourceIsUrl ? (
              <a href={dish.source} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-danger)', wordBreak: 'break-all' }}>
                {dish.source}
              </a>
            ) : (
              <span style={{ color: 'var(--color-text)' }}>{dish.source}</span>
            )}
          </div>
        )}
      </div>

      {dish.notes && (
        <div
          style={{
            borderLeft: '3px solid var(--color-primary)',
            paddingLeft: 'var(--space-3)',
            marginBottom: 'var(--space-5)',
            font: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            fontStyle: 'italic',
            lineHeight: 1.6,
          }}
        >
          {dish.notes}
        </div>
      )}

      {dish.hasRecipe && dish.recipe && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <h2 style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)', margin: '0 0 var(--space-3)' }}>食譜內容</h2>

          {recipeSourceUrl && (
            <a href={recipeSourceUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 'var(--space-4)' }}>
              <Button type="button" variant="danger" size="sm">🔗 查看原始食譜</Button>
            </a>
          )}

          {dish.recipe.content?.map((block, i) =>
            block.type === 'text' ? (
              <p
                key={i}
                style={{
                  whiteSpace: 'pre-wrap',
                  font: 'var(--font-body)',
                  fontSize: 15.5,
                  lineHeight: 1.8,
                  color: 'var(--color-text)',
                  margin: '0 0 var(--space-3)',
                }}
              >
                {linkify(block.text || '')}
              </p>
            ) : (
              <img
                key={i}
                src={block.path}
                alt=""
                style={{ maxWidth: '100%', borderRadius: 'var(--radius-card)', margin: '8px 0 var(--space-3)' }}
              />
            )
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="刪除菜色"
        description={`確定要刪除「${dish.name}」嗎?此操作無法復原。`}
        confirmLabel="刪除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', zIndex: 200 }}>
          <Spinner />
        </div>
      )}
    </div>
  );
}

export default DishDetailPage;
