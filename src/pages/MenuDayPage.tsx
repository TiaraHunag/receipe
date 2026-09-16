import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Clock } from 'lucide-react';
import {
  getMenusInRange,
  removeDishFromMeal,
  getAllDishes,
  MenuDay,
  MealType,
  CourseType,
  COURSE_LABELS,
  COURSE_ORDER,
  Dish,
} from '../db';
import { Chip, SegmentedControl, Skeleton, useAddToMenu } from '../components';
import styles from './MenuDayPage.module.css';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

const EMPTY_MENU_DAY_COURSES = { staple: [], main: [], side: [], vegetable: [], soup: [], extra: [] };

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

/** 沒有從上一頁帶入餐別時,依現在時間猜一個,跟「快速加菜」sheet 用同一套邏輯。 */
function defaultMealByTime(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 16) return 'lunch';
  return 'dinner';
}

function MenuDayPage() {
  const navigate = useNavigate();
  const { date: dateParam } = useParams<{ date: string }>();
  const { openAddToMenu } = useAddToMenu();

  const [currentDate] = useState<Date>(() => parseDate(dateParam));
  const [meal, setMeal] = useState<MealType>(() => defaultMealByTime());
  const [menu, setMenu] = useState<MenuDay | null>(null);
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  const dateStr = formatDate(currentDate);

  useEffect(() => {
    getAllDishes().then(setAllDishes);
  }, []);

  const fetchDayMenu = async () => {
    setLoading(true);
    const map = await getMenusInRange(dateStr, dateStr);
    setMenu(
      map[dateStr] || {
        date: dateStr,
        breakfast: { ...EMPTY_MENU_DAY_COURSES },
        lunch: { ...EMPTY_MENU_DAY_COURSES },
        dinner: { ...EMPTY_MENU_DAY_COURSES },
      }
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchDayMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  const dishOf = (dishId: string): Dish | undefined => allDishes.find((d) => d.id === dishId);

  const handleRemoveDish = async (course: CourseType, dishId: string) => {
    await removeDishFromMeal(dateStr, meal, course, dishId);
    fetchDayMenu();
  };

  const handleAdd = (course: CourseType) => {
    openAddToMenu({ date: dateStr, meal, course });
  };

  const countForMeal = (m: MealType): number => {
    if (!menu) return 0;
    return COURSE_ORDER.reduce((sum, course) => sum + (menu[m][course]?.length || 0), 0);
  };

  const dateLabel = `${currentDate.getMonth() + 1}/${currentDate.getDate()}（週${WEEKDAY_LABELS[currentDate.getDay()]}）`;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/menu')} aria-label="回到週總覽">
          <ArrowLeft size={19} strokeWidth={2.5} />
        </button>
        <h1 className={styles.pageTitle}>{dateLabel}</h1>
      </div>

      <SegmentedControl
        className={styles.mealSwitch}
        options={MEAL_ORDER.map((m) => ({
          value: m,
          label: loading ? MEAL_LABELS[m] : `${MEAL_LABELS[m]} ${countForMeal(m)}`,
        }))}
        value={meal}
        onChange={(v) => setMeal(v as MealType)}
      />

      {loading ? (
        <>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.section}>
              <Skeleton width={56} height={13} />
              <div style={{ marginTop: 8 }}>
                <Skeleton height={44} radius="var(--radius-row)" />
              </div>
            </div>
          ))}
        </>
      ) : (
        COURSE_ORDER.map((course) => {
          const dishIds = menu?.[meal][course] || [];
          return (
            <div key={course} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>{COURSE_LABELS[course]}</span>
                <span className={styles.sectionLine} />
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => handleAdd(course)}
                  aria-label={`新增到${COURSE_LABELS[course]}`}
                >
                  <Plus size={16} strokeWidth={2.75} />
                </button>
              </div>

              {dishIds.length === 0 ? (
                <div className={styles.emptyRow}>—</div>
              ) : (
                dishIds.map((dishId) => {
                  const dish = dishOf(dishId);
                  return (
                    <div key={dishId} className={styles.dishRow}>
                      <div className={styles.dishInfo}>
                        <div className={styles.dishNameLine}>
                          <span className={styles.dishName}>{dish ? dish.name : '(已刪除的菜色)'}</span>
                          {dish?.prepAhead && (
                            <Chip tone="prepAhead" variant="badge" icon={<Clock size={10} strokeWidth={3} />}>
                              可先做
                            </Chip>
                          )}
                        </div>
                        {dish && dish.ingredients.length > 0 && (
                          <div className={styles.ingredientLine}>{dish.ingredients.join('、')}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => handleRemoveDish(course, dishId)}
                        aria-label={`從${COURSE_LABELS[course]}移除${dish ? dish.name : ''}`}
                      >
                        <X size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default MenuDayPage;
