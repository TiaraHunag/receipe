// ============================================================================
// src/pages/MenuDayPage.tsx (完整覆蓋 — 點餐別空白處＝新增，點菜色項目＝編輯)
// ============================================================================
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import {
  Card,
  Button,
  IconButton,
  Checkbox,
  Input,
  Modal,
  Fab,
  SwipeableRow,
  DateSwitcher,
  EmptyState,
  Spinner,
} from '../components';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 從網址參數 (yyyy-mm-dd) 還原成 Date,格式不對就退回今天 */
function parseDate(dateStr: string | undefined): Date {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const parsed = new Date(y, m - 1, d);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/** 新增流程分三步:先選餐別(早/午/晚),再選分類,最後勾選菜色。
 *  入口從原本「每餐各自一個 + 按鈕」合併成畫面右下角單一 FAB;
 *  點某一餐卡片的空白處會直接帶入該餐別,跳過選餐別那一步。 */
type PickerState = {
  step: 'meal' | 'course' | 'dish';
  meal?: MealType;
  course?: CourseType;
} | null;

function MenuDayPage() {
  const navigate = useNavigate();
  const { date: dateParam } = useParams<{ date: string }>();

  const [currentDate, setCurrentDate] = useState<Date>(() => parseDate(dateParam));
  const [menu, setMenu] = useState<MenuDay | null>(null);
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
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

  const goToday = () => setCurrentDate(new Date());

  const dishNameOf = (dishId: string): string => {
    const dish = allDishes.find((d) => d.id === dishId);
    return dish ? dish.name : '(已刪除的菜色)';
  };

  const openPicker = () => setPicker({ step: 'meal' });
  const chooseMeal = (meal: MealType) => setPicker({ step: 'course', meal });
  const chooseCourse = (course: CourseType) => {
    if (!picker?.meal) return;
    setSelectedDishIds([]);
    setPicker({ step: 'dish', meal: picker.meal, course });
  };
  const backToMeal = () => {
    setPicker({ step: 'meal' });
    setSelectedDishIds([]);
    setNewDishName('');
  };
  const backToCourse = () => {
    if (!picker?.meal) return;
    setPicker({ step: 'course', meal: picker.meal });
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
    if (!picker?.meal || !picker.course || selectedDishIds.length === 0) return;
    setSaving(true);
    try {
      for (const dishId of selectedDishIds) {
        await addDishToMeal(dateStr, picker.meal, picker.course, dishId);
      }
      await fetchDayMenu();
      closePicker();
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
        courseTypes: picker?.course ? [picker.course] : [],
        tags: [],
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

  const dateLabel = `週${WEEKDAY_LABELS[currentDate.getDay()]} ${dateStr}`;

  const pickerTitle = !picker
    ? undefined
    : picker.step === 'meal'
    ? '新增菜色——選擇餐別'
    : picker.step === 'course'
    ? `新增到${MEAL_LABELS[picker.meal!]}——選擇分類`
    : `勾選要加入「${COURSE_LABELS[picker.course!]}」的菜色`;

  return (
    <div
      style={{
        padding: 'var(--space-4)',
        maxWidth: 480,
        margin: '0 auto',
        paddingBottom: 96,
        position: 'relative',
        minHeight: '100vh',
      }}
    >
      <div style={{ margin: 'var(--space-3) 0' }}>
        <IconButton icon="‹" label="回到週總覽" onClick={() => navigate('/menu')} />
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <DateSwitcher label={dateLabel} isToday={isToday} onToday={goToday} hideArrows />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5) 0' }}>
          <Spinner />
        </div>
      ) : dayIsEmpty ? (
        <EmptyState icon="📅" title="這天還沒有安排菜單" description="按右下角的 + 開始安排這天的餐點" />
      ) : (
        (['breakfast', 'lunch', 'dinner'] as const).map((meal) => {
          const mealIsEmpty = COURSE_ORDER.every((course) => (menu?.[meal][course] || []).length === 0);

          return (
            <Card
              key={meal}
              onClick={() => chooseMeal(meal)}
              style={{
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  font: 'var(--font-subtitle)',
                  color: 'var(--color-text)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                {MEAL_LABELS[meal]}
              </div>

              {mealIsEmpty ? (
                <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-placeholder)', margin: 0 }}>
                  還沒安排
                </p>
              ) : (
                COURSE_ORDER.map((course) => {
                  const dishIds = menu?.[meal][course] || [];
                  if (dishIds.length === 0) return null;
                  return (
                    <div
                      key={course}
                      style={{
                        marginBottom: 'var(--space-2)',
                        paddingLeft: 'var(--space-2)',
                        borderLeft: '3px solid var(--color-border)',
                      }}
                    >
                      <div
                        style={{
                          font: 'var(--font-caption)',
                          color: 'var(--color-text-secondary)',
                          marginBottom: 'var(--space-1)',
                        }}
                      >
                        {COURSE_LABELS[course]}
                      </div>
                      <div>
                        {dishIds.map((dishId) => (
                          <SwipeableRow
                            key={dishId}
                            actions={[
                              {
                                label: '編輯',
                                onClick: () => navigate(`/edit/${dishId}`),
                              },
                              {
                                label: '刪除',
                                danger: true,
                                onClick: () => handleRemoveDish(meal, course, dishId),
                              },
                            ]}
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/edit/${dishId}`);
                              }}
                              style={{
                                padding: 'var(--space-2) 4px',
                                borderBottom: '1px solid var(--color-surface-sunken)',
                                font: 'var(--font-body)',
                                cursor: 'pointer',
                              }}
                            >
                              {dishNameOf(dishId)}
                            </div>
                          </SwipeableRow>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </Card>
          );
        })
      )}

      <Modal open={!!picker} onClose={closePicker} title={pickerTitle}>
        {picker?.step === 'meal' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
              <Button key={meal} variant="secondary" onClick={() => chooseMeal(meal)}>
                {MEAL_LABELS[meal]}
              </Button>
            ))}
          </div>
        )}

        {picker?.step === 'course' && (
          <>
            <button
              type="button"
              onClick={backToMeal}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                font: 'var(--font-caption)',
                color: 'var(--color-text-secondary)',
                padding: 0,
                marginBottom: 'var(--space-3)',
              }}
            >
              ‹ 換一個餐別
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {COURSE_ORDER.map((course) => (
                <Button key={course} variant="secondary" size="sm" onClick={() => chooseCourse(course)}>
                  {COURSE_LABELS[course]}
                </Button>
              ))}
            </div>
          </>
        )}

        {picker?.step === 'dish' && (
          <>
            <button
              type="button"
              onClick={backToCourse}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                font: 'var(--font-caption)',
                color: 'var(--color-text-secondary)',
                padding: 0,
                marginBottom: 'var(--space-3)',
              }}
            >
              ‹ 換一個分類
            </button>

            <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 'var(--space-3)' }}>
              {allDishes.length === 0 ? (
                <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-placeholder)' }}>
                  還沒有菜色可選
                </p>
              ) : (
                allDishes.map((dish) => (
                  <div key={dish.id} style={{ padding: 'var(--space-1) 0' }}>
                    <Checkbox
                      label={dish.name}
                      checked={selectedDishIds.includes(dish.id)}
                      onChange={() => toggleSelect(dish.id)}
                    />
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: 'var(--space-3)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
                找不到想要的菜?直接新增:
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    value={newDishName}
                    onChange={(e) => setNewDishName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateAndAdd())}
                    placeholder="輸入新菜名"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={handleCreateAndAdd}
                  loading={creating}
                  disabled={!newDishName.trim()}
                >
                  建立並勾選
                </Button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="secondary" fullWidth onClick={closePicker}>
                取消
              </Button>
              <Button
                fullWidth
                onClick={handleConfirmAdd}
                loading={saving}
                disabled={selectedDishIds.length === 0}
              >
                確認新增{selectedDishIds.length > 0 ? `(${selectedDishIds.length})` : ''}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Fab label="新增菜色" onClick={openPicker} />
    </div>
  );
}

export default MenuDayPage;