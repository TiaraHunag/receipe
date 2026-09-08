import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllDishes, getAllCategories, getAllIngredients, Dish } from '../db';
import { Card, Select, Fab, IconButton, EmptyState, Tag, Spinner } from '../components';

function DishListPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterIngredient, setFilterIngredient] = useState('');

  const loadDishes = async () => {
    try {
      const results = await getAllDishes();
      setDishes(results);
      const [cats, ings] = await Promise.all([getAllCategories(), getAllIngredients()]);
      setCategoryOptions(cats);
      setIngredientOptions(ings);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDishes();
  }, []);

  const filteredDishes = dishes.filter((dish) => {
    if (filterCategory && !dish.category.includes(filterCategory)) return false;
    if (filterIngredient && !dish.ingredients.includes(filterIngredient)) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 480, margin: '0 auto', paddingBottom: 96, position: 'relative', minHeight: '100vh' }}>
      <h1 style={{ font: 'var(--font-title)', color: 'var(--color-text)', margin: '12px 0' }}>食譜</h1>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Select
            aria-label="依類型篩選"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            placeholder="所有類型"
            options={categoryOptions.map((c) => ({ value: c, label: c }))}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Select
            aria-label="依食材篩選"
            value={filterIngredient}
            onChange={(e) => setFilterIngredient(e.target.value)}
            placeholder="所有食材"
            options={ingredientOptions.map((i) => ({ value: i, label: i }))}
          />
        </div>
        {(filterCategory || filterIngredient) && (
          <IconButton
            icon="✕"
            label="清除篩選"
            onClick={() => { setFilterCategory(''); setFilterIngredient(''); }}
          />
        )}
      </div>

      {error && (
        <p style={{ color: 'var(--color-danger)', font: 'var(--font-caption)', marginBottom: 'var(--space-3)' }}>
          {error}
        </p>
      )}

      {filteredDishes.length === 0 ? (
        <EmptyState
          icon="🍳"
          title={dishes.length === 0 ? '目前沒有資料' : '沒有符合篩選條件的菜色'}
          description={dishes.length === 0 ? '按右下角的 + 開始新增第一道菜色' : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredDishes.map((dish) => (
            <Link key={dish.id} to={`/dish/${dish.id}`} style={{ textDecoration: 'none' }}>
              <Card interactive style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: dish.category.length ? 'var(--space-2)' : 0 }}>
                  <strong style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)' }}>{dish.name}</strong>
                  {dish.hasRecipe && (
                    <span style={{ font: 'var(--font-caption)', color: 'var(--color-primary)' }}>有食譜</span>
                  )}
                </div>
                {dish.category.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                    {dish.category.map((c) => (
                      <Tag key={c}>{c}</Tag>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div style={{ position: 'fixed', right: 20, bottom: 84, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', zIndex: 90 }}>
        <Link to="/quick-add" title="貼上連結/文字快速新增" style={{ textDecoration: 'none' }}>
          <IconButton icon="🔗" label="貼上連結/文字快速新增" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-float)' }} />
        </Link>
        <Link to="/new" style={{ textDecoration: 'none' }}>
          <Fab label="新增菜色" />
        </Link>
      </div>
    </div>
  );
}

export default DishListPage;
