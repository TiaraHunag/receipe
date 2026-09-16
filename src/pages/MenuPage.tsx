import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMenusInRange, getAllDishes, getWeekStartDay, MenuDay, MealType, COURSE_ORDER, Dish } from '../db';
import { Skeleton } from '../components';
import styles from './MenuPage.module.css';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner'];
const MEAL_SHORT: Record<MealType, string> = {
  breakfast: '早',
  lunch: '午',
  dinner: '晚',
};
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 依「一週起始日」設定計算某天所在週的第一天,weekStartDay 0-6 對應 Date.getDay() */
function startOfWeek(d: Date, weekStartDay: number): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const diff = (copy.getDay() - weekStartDay + 7) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dishNamesForMeal(day: MenuDay | undefined, meal: MealType, allDishes: Dish[]): string[] {
  if (!day) return [];
  const ids: string[] = [];
  COURSE_ORDER.forEach((course) => {
    (day[meal][course] || []).forEach((id) => ids.push(id));
  });
  return ids.map((id) => allDishes.find((d) => d.id === id)?.name || '(已刪除的菜色)');
}

function dayHasAnyMenu(day: MenuDay | undefined): boolean {
  if (!day) return false;
  return MEAL_ORDER.some((meal) => COURSE_ORDER.some((course) => (day[meal][course] || []).length > 0));
}

/** 首次載入骨架屏:貼近七列日期卡的外型,取代原本的表格骨架屏 */
function MenuWeekSkeleton() {
  return (
    <div className={styles.dayList}>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className={`${styles.dayCard} ${styles.dayCardFilled}`}>
          <div className={styles.dayLeft}>
            <Skeleton width={20} height={11} />
            <Skeleton width={22} height={17} />
          </div>
          <div className={styles.dayRight}>
            <Skeleton width="70%" height={13} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuPage() {
  const navigate = useNavigate();
  const [weekStartDayNum, setWeekStartDayNum] = useState(0);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), 0));
  const [menus, setMenus] = useState<Record<string, MenuDay>>({});
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = weekDays[6];

  useEffect(() => {
    getAllDishes().then(setAllDishes);
    getWeekStartDay().then((day) => {
      setWeekStartDayNum(day);
      setWeekStart(startOfWeek(new Date(), day));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getMenusInRange(formatDate(weekStart), formatDate(addDays(weekStart, 6)))
      .then(setMenus)
      .finally(() => setLoading(false));
  }, [weekStart]);

  const goPrevWeek = () => setWeekStart((d) => addDays(d, -7));
  const goNextWeek = () => setWeekStart((d) => addDays(d, 7));

  const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} – ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}（週${
    WEEKDAY_LABELS[weekStartDayNum]
  }起）`;

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>菜單</h1>

      <div className={styles.switcher}>
        <button type="button" className={styles.arrowBtn} onClick={goPrevWeek} aria-label="上一週">
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <span className={styles.weekLabel}>{weekLabel}</span>
        <button type="button" className={styles.arrowBtn} onClick={goNextWeek} aria-label="下一週">
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>

      {loading ? (
        <MenuWeekSkeleton />
      ) : (
        <div className={styles.dayList}>
          {weekDays.map((date) => {
            const dateStr = formatDate(date);
            const day = menus[dateStr];
            const hasMenu = dayHasAnyMenu(day);

            return (
              <button
                key={dateStr}
                type="button"
                className={`${styles.dayCard} ${hasMenu ? styles.dayCardFilled : styles.dayCardEmpty}`}
                onClick={() => navigate(`/menu/${dateStr}`)}
              >
                <div className={styles.dayLeft}>
                  <span className={styles.weekdayLabel}>週{WEEKDAY_LABELS[date.getDay()]}</span>
                  <span className={`${styles.dateNum} ${hasMenu ? '' : styles.dateNumEmpty}`}>{date.getDate()}</span>
                </div>
                <div className={styles.dayRight}>
                  {hasMenu ? (
                    MEAL_ORDER.filter((meal) => dishNamesForMeal(day, meal, allDishes).length > 0).map((meal) => (
                      <div key={meal} className={styles.mealRow}>
                        <span className={styles.mealLabel}>{MEAL_SHORT[meal]}</span>
                        <span className={styles.mealDishes}>{dishNamesForMeal(day, meal, allDishes).join('・')}</span>
                      </div>
                    ))
                  ) : (
                    <span className={styles.noMenuText}>還沒排</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MenuPage;
