import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMenusInRange,
  addDishToMeal,
  removeDishFromMeal,
  getAllDishes,
  insertDish,
  MenuDay,
  MealType,
  CourseType,
  COURSE_LABELS,
  COURSE_ORDER,
  Dish,
} from '../db';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

type PickerState = {
  meal: MealType;
  step: 'course' | 'dish';
  course?: CourseType;
} | null;

function MenuPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [menu, setMenu] = useState<MenuDay | null>(null);
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [picker, setPicker] = useState<PickerState>(null);
  const [selectedDishIds, setSelectedDishIds] = useState<string[]>([]);
  const [newDishName, setNewDishName] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const dateStr = formatDate(currentDate);

  const loadDishes = async () => {
    const dishes = await getAllDishes();
    setAllDishes(dishes);
  };

  useEffect(() => {
    loadDishes();
  }, []);

  const fetchDayMenu = async () => {
    setLoading(true);
    const map = await getMenusInRange(dateStr, dateStr);
    setMenu(
      map[dateStr] || {
        date: dateStr,
        breakfast: { staple: [], main: [], side: [], vegetable: [], soup: [], extra: [] },
        lunch: { staple: [], main: [], side: [], vegetable: [], soup: [], extra: [] },
        dinner: { staple: [], main: [], side: [], vegetable: [], soup: [], extra: [] },
      }
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchDayMenu();
    setPicker(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  const goPrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const goNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  const dishNameOf = (dishId: string): string => {
    const dish = allDishes.find((d) => d.id === dishId);
    return dish ? dish.name : '(已刪除的菜色)';
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    setPicker(null);
    setSelectedDishIds([]);
  };

  const openPicker = (meal: MealType) => setPicker({ meal, step: 'course' });
  const chooseCourse = (course: CourseType) => {
    if (!picker) return;
    setSelectedDishIds([]);
    setPicker({ ...picker, step: 'dish', course });
  };
  const backToCourse = () => {
    if (!picker) return;
    setPicker({ meal: picker.meal, step: 'course' });
    setSelectedDishIds([]);
    setNewDishName('');
  };
  const closePicker = () => {
    setPicker(null);
    setSelectedDishIds([]);
    setNewDishName('');
  };

  const toggleSelect = (dishId: string) => {
    setSelectedDishIds((prev) =>
      prev.includes(dishId) ? prev.filter((id) => id !== dishId) : [...prev, dishId]
    );
  };

  const handleConfirmAdd = async () => {
    if (!picker || !picker.course || selectedDishIds.length === 0) return;
    setSaving(true);
    try {
      for (const dishId of selectedDishIds) {
        await addDishToMeal(dateStr, picker.meal, picker.course, dishId);
      }
      await fetchDayMenu();
      backToCourse();
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDish = async (meal: MealType, course: CourseType, dishId: string) => {
    await removeDishFromMeal(dateStr, meal, course, dishId);
    fetchDayMenu();
  };

  const handleCreateAndAdd = async () => {
    const trimmed = newDishName.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const newId = await insertDish({
        name: trimmed,
        category: [],
        ingredients: [],
        prepAhead: false,
        source: '',
        notes: '',
        hasRecipe: false,
        recipe: null,
      });
      setNewDishName('');
      await loadDishes();
      setSelectedDishIds((prev) => [...prev, newId]);
    } finally {
      setCreating(false);
    }
  };

  const isToday = dateStr === formatDate(new Date());
  const dayIsEmpty =
    !!menu &&
    (['breakfast', 'lunch', 'dinner'] as const).every((meal) =>
      COURSE_ORDER.every((course) => (menu[meal][course] || []).length === 0)
    );

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ fontSize: 15 }}>← 返回菜色列表</Link>
        <button
          onClick={toggleEditMode}
          style={{
            fontSize: 14,
            padding: '6px 14px',
            borderRadius: 6,
            background: editMode ? '#1a73e8' : '#f0f0f0',
            color: editMode ? '#fff' : '#333',
            border: 'none',
          }}
        >
          {editMode ? '完成編輯' : '編輯'}
        </button>
      </div>
      <h1 style={{ fontSize: 20, margin: '12px 0' }}>菜單規劃</h1>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={goPrevDay} style={{ fontSize: 20, padding: '8px 16px', minWidth: 48 }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 'bold' }}>
            週{WEEKDAY_LABELS[currentDate.getDay()]}
          </div>
          <div style={{ fontSize: 14, color: '#666' }}>{dateStr}</div>
          {!isToday && (
            <button onClick={goToday} style={{ fontSize: 12, color: '#1a73e8', border: 'none', background: 'none', cursor: 'pointer', marginTop: 2 }}>
              回到今天
            </button>
          )}
        </div>
        <button onClick={goNextDay} style={{ fontSize: 20, padding: '8px 16px', minWidth: 48 }}>›</button>
      </div>

      {loading ? (
        <p>讀取中...</p>
      ) : dayIsEmpty && !editMode ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          <p style={{ fontSize: 15, marginBottom: 12 }}>這天還沒有安排菜單</p>
          <button onClick={toggleEditMode} style={{ padding: '10px 20px', fontSize: 14, borderRadius: 6 }}>
            開始安排
          </button>
        </div>
      ) : (
        (['breakfast', 'lunch', 'dinner'] as const).map((meal) => {
          const mealIsEmpty = COURSE_ORDER.every((course) => (menu?.[meal][course] || []).length === 0);
          if (mealIsEmpty && !editMode) return null;

          return (
            <div key={meal} style={{ border: '1px solid #ddd', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 10 }}>{MEAL_LABELS[meal]}</div>

              {COURSE_ORDER.map((course) => {
                const dishIds = menu?.[meal][course] || [];
                if (dishIds.length === 0) return null;
                return (
                  <div key={course} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: '3px solid #eee' }}>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{COURSE_LABELS[course]}</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {dishIds.map((dishId) => (
                        <li
                          key={dishId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 4px',
                            borderBottom: '1px solid #f5f5f5',
                            fontSize: 14,
                          }}
                        >
                          {dishNameOf(dishId)}
                          {editMode && (
                            <button
                              onClick={() => handleRemoveDish(meal, course, dishId)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'red', fontSize: 16, padding: '2px 8px' }}
                            >
                              ×
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              {mealIsEmpty && editMode && (
                <p style={{ fontSize: 14, color: '#bbb', margin: '2px 0 10px' }}>還沒安排</p>
              )}

              {editMode && (
                picker?.meal === meal ? (
                  <div style={{ border: '1px solid #eee', borderRadius: 8, marginTop: 8 }}>
                    {picker.step === 'course' ? (
                      <>
                        <p style={{ fontSize: 13, color: '#666', padding: '10px 10px 4px' }}>要新增哪個分類?</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 10px 10px' }}>
                          {COURSE_ORDER.map((course) => (
                            <button
                              key={course}
                              onClick={() => chooseCourse(course)}
                              style={{ padding: '8px 14px', fontSize: 14, borderRadius: 6 }}
                            >
                              {COURSE_LABELS[course]}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={closePicker}
                          style={{ width: '100%', padding: 10, fontSize: 14, border: 'none', background: '#f5f5f5' }}
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 4px' }}>
                          <button
                            onClick={backToCourse}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}
                          >
                            ‹
                          </button>
                          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                            勾選要加入「{COURSE_LABELS[picker.course!]}」的菜色
                          </p>
                        </div>
                        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                          {allDishes.length === 0 ? (
                            <div style={{ fontSize: 13, color: '#999', padding: 8 }}>還沒有菜色可選</div>
                          ) : (
                            allDishes.map((dish) => (
                              <label
                                key={dish.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  fontSize: 14,
                                  padding: '10px 10px',
                                  borderBottom: '1px solid #f5f5f5',
                                  cursor: 'pointer',
                                  background: selectedDishIds.includes(dish.id) ? '#eef6ff' : 'transparent',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedDishIds.includes(dish.id)}
                                  onChange={() => toggleSelect(dish.id)}
                                />
                                {dish.name}
                              </label>
                            ))
                          )}
                        </div>
                        <div style={{ padding: 8, borderTop: '1px solid #eee', background: '#fafafa' }}>
                          <p style={{ fontSize: 12, color: '#999', margin: '0 0 6px' }}>找不到想要的菜?直接新增:</p>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              type="text"
                              value={newDishName}
                              onChange={(e) => setNewDishName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateAndAdd())}
                              placeholder="輸入新菜名"
                              style={{ flex: 1, padding: 6, fontSize: 14 }}
                            />
                            <button
                              onClick={handleCreateAndAdd}
                              disabled={creating || !newDishName.trim()}
                              style={{ padding: '6px 10px', fontSize: 13 }}
                            >
                              {creating ? '建立中...' : '建立並勾選'}
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, padding: 8 }}>
                          <button
                            onClick={closePicker}
                            style={{ flex: 1, padding: 10, fontSize: 14 }}
                          >
                            取消
                          </button>
                          <button
                            onClick={handleConfirmAdd}
                            disabled={saving || selectedDishIds.length === 0}
                            style={{ flex: 1, padding: 10, fontSize: 14, fontWeight: 'bold' }}
                          >
                            {saving ? '儲存中...' : `確認新增${selectedDishIds.length > 0 ? `(${selectedDishIds.length})` : ''}`}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => openPicker(meal)}
                    style={{ width: '100%', padding: 10, fontSize: 15, borderRadius: 6, marginTop: 4 }}
                  >
                    + 新增菜色
                  </button>
                )
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default MenuPage;