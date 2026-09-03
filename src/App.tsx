import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

interface Dish {
  id: string;
  name: string;
  category?: string[];
  ingredients?: string[];
}

function App() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'dishes'));
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
  }, []);

  if (loading) return <div style={{ padding: 20 }}>讀取中...</div>;
  if (error)
    return <div style={{ padding: 20, color: 'red' }}>錯誤:{error}</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>食譜列表(測試)</h1>
      {dishes.length === 0 ? (
        <p>目前沒有資料</p>
      ) : (
        <ul>
          {dishes.map((dish) => (
            <li key={dish.id}>
              <strong>{dish.name}</strong>
              {dish.category && `(${dish.category.join(', ')})`}
              {dish.ingredients && ` — 食材:${dish.ingredients.join('、')}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
