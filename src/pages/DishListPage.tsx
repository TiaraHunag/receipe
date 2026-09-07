import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

interface Dish {
  id: string;
  name: string;
  category?: string[];
  ingredients?: string[];
  hasRecipe?: boolean;
}

function DishListPage() {
  const { user } = useAuth();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        if (!user) return;
        const q = query(collection(db, 'dishes'), where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const results: Dish[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Dish[];
        setDishes(results);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchDishes();
  }, [user]);

  if (loading) return <div style={{ padding: 20 }}>讀取中...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>錯誤:{error}</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>菜色列表</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Link to="/new">
            <button>+ 新增菜色</button>
        </Link>
        <Link to="/menu">
        <button>📅 菜單規劃</button>
        </Link>
      </div>
      {dishes.length === 0 ? (
        <p>目前沒有資料</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {dishes.map((dish) => (
            <li
              key={dish.id}
              style={{
                border: '1px solid #ccc',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Link to={`/dish/${dish.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{dish.name}</strong>
                {dish.hasRecipe && <span style={{ marginLeft: 8, fontSize: 12, color: 'green' }}>有食譜</span>}
                {dish.category && <div style={{ fontSize: 14, color: '#666' }}>{dish.category.join(', ')}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DishListPage;