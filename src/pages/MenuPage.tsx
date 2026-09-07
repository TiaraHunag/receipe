import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

interface MenuDoc {
  id: string;
  date: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
}

interface DishOption {
  id: string;
  name: string;
}

type MealType = 'breakfast' | 'lunch' | 'dinner';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function MenuPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [menus, setMenus] = useState<Record<string, MenuDoc>>({});
  const [dishNames, setDishNames] = useState<Record<string, string>>({});
  const [allDishes, setAllDishes] = useState<DishOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<{ date: string; meal: MealType } | null>(null);

  const weekDates: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // 撈自己所有的菜色,給選單挑選用
  useEffect(() => {
    if (!user) return;
    const fetchAllDishes = async () => {
      const q = query(collection(db, 'dishes'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      setAllDishes(
        snapshot.docs.map((d) => ({ id: d.id, name: d.data().name || '(未命名)' }))
      );
    };
    fetchAllDishes();
  }, [user]);

  const fetchWeekMenus = async () => {
    if (!user) return;
    setLoading(true);
    const startStr = formatDate(weekDates[0]);
    const endStr = formatDate(weekDates[6]);

    const q = query(
      collection(db, 'menus'),
      where('ownerId', '==', user.uid),
      where('date', '>=', startStr),
      where('date', '<=', endStr)
    );
    const snapshot = await getDocs(q);

    const menuMap: Record<string, MenuDoc> = {};
    const allDishIds = new Set<string>();

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const menu: MenuDoc = {
        id: docSnap.id,
        date: data.date,
        breakfast: data.breakfast || [],
        lunch: data.lunch || [],
        dinner: data.dinner || [],
      };
      menuMap[menu.date] = menu;
      [...menu.breakfast, ...menu.lunch, ...menu.dinner].forEach((id) => allDishIds.add(id));
    });

    setMenus(menuMap);

    const nameMap: Record<string, string> = {};
    await Promise.all(
      Array.from(allDishIds).map(async (dishId) => {
        const dishSnap = await getDoc(doc(db, 'dishes', dishId));
        nameMap[dishId] = dishSnap.exists() ? dishSnap.data().name || '(未命名)' : '(已刪除的菜色)';
      })
    );
    setDishNames(nameMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchWeekMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weekStart]);

  const goPrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const goNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  // 新增菜色到某天某餐
  const addDishToMeal = async (dateStr: string, meal: MealType, dishId: string) => {
    if (!user) return;
    const existing = menus[dateStr];

    if (existing) {
      await updateDoc(doc(db, 'menus', existing.id), {
        [meal]: arrayUnion(dishId),
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'menus'), {
        ownerId: user.uid,
        date: dateStr,
        breakfast: meal === 'breakfast' ? [dishId] : [],
        lunch: meal === 'lunch' ? [dishId] : [],
        dinner: meal === 'dinner' ? [dishId] : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    setPicker(null);
    fetchWeekMenus();
  };

  // 從某天某餐移除菜色
  const removeDishFromMeal = async (dateStr: string, meal: MealType, dishId: string) => {
    const existing = menus[dateStr];
    if (!existing) return;
    await updateDoc(doc(db, 'menus', existing.id), {
      [meal]: arrayRemove(dishId),
      updatedAt: serverTimestamp(),
    });
    fetchWeekMenus();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <Link to="/">← 返回菜色列表</Link>
      <h1>菜單規劃</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={goPrevWeek}>← 上一週</button>
        <span>
          {formatDate(weekDates[0])} ~ {formatDate(weekDates[6])}
        </span>
        <button onClick={goNextWeek}>下一週 →</button>
      </div>

      {loading ? (
        <p>讀取中...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {weekDates.map((d, i) => {
            const dateStr = formatDate(d);
            const menu = menus[dateStr];
            return (
              <div key={dateStr} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 8 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                  週{WEEKDAY_LABELS[i]}
                  <div style={{ fontSize: 12, color: '#666' }}>{dateStr}</div>
                </div>
                {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                  <div key={meal} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: '#999' }}>{MEAL_LABELS[meal]}</div>
                    <ul style={{ paddingLeft: 16, margin: '4px 0' }}>
                      {menu?.[meal].map((dishId) => (
                        <li key={dishId} style={{ fontSize: 13 }}>
                          {dishNames[dishId] || '讀取中...'}{' '}
                          <button
                            onClick={() => removeDishFromMeal(dateStr, meal, dishId)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'red', fontSize: 12 }}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>

                    {picker && picker.date === dateStr && picker.meal === meal ? (
                      <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: 4, marginTop: 4 }}>
                        {allDishes.length === 0 ? (
                          <div style={{ fontSize: 12, color: '#999' }}>還沒有菜色可選</div>
                        ) : (
                          allDishes.map((dish) => (
                            <div
                              key={dish.id}
                              onClick={() => addDishToMeal(dateStr, meal, dish.id)}
                              style={{ fontSize: 13, padding: '4px 6px', cursor: 'pointer' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              {dish.name}
                            </div>
                          ))
                        )}
                        <button
                          onClick={() => setPicker(null)}
                          style={{ fontSize: 12, marginTop: 4, width: '100%' }}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPicker({ date: dateStr, meal })}
                        style={{ fontSize: 12, padding: '2px 8px' }}
                      >
                        + 新增
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MenuPage;