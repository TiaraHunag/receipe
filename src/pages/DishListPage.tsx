import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllDishes, getAllCategories, getAllIngredients, Dish } from '../db';

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

  if (loading) return <div style={{ padding: 20 }}>讀取中...</div>;

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 80, position: 'relative', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 20, margin: '12px 0' }}>食譜</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: '#666' }}>篩選:</span>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: 6 }}
        >
          <option value="">所有類型</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterIngredient}
          onChange={(e) => setFilterIngredient(e.target.value)}
          style={{ padding: 6 }}
        >
          <option value="">所有食材</option>
          {ingredientOptions.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        {(filterCategory || filterIngredient) && (
          <button
            type="button"
            onClick={() => { setFilterCategory(''); setFilterIngredient(''); }}
            style={{ fontSize: 13 }}
          >
            清除篩選
          </button>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {filteredDishes.length === 0 ? (
        <p>{dishes.length === 0 ? '目前沒有資料' : '沒有符合篩選條件的菜色'}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {filteredDishes.map((dish) => (
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

<Link
        to="/quick-add"
        style={{
          position: 'fixed',
          right: 24,
          bottom: 152,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: '#fff',
          color: '#1a73e8',
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          border: '1px solid #1a73e8',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          zIndex: 90,
        }}
        title="貼上連結/文字快速新增"
      >
        🔗
      </Link>
      <Link
        to="/new"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 84,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#1a73e8',
          color: '#fff',
          fontSize: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
          zIndex: 90,
        }}
      >
        +
      </Link>
    </div>
  );
}

export default DishListPage;