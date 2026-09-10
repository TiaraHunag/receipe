// ============================================================================
// src/pages/MenuPage.tsx (完整覆蓋 — 每格上限 2 → 3,讓主食/主菜/副菜都能顯示)
// ============================================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMenusInRange,
  getAllDishes,
  getWeekStartDay,
  MenuDay,
  MealType,
  CourseType,
  MealCourses,
  WEEKDAY_LABELS,
  Dish,
} from '../db';
import { Card, DateSwitcher, Spinner, Tag } from '../components';
import { COURSE_TAG_COLOR } from '../courseColors';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

/** 每個餐格最多顯示幾道菜名,超過的用「+N」代替(主食/主菜/副菜三個分類都要露出,所以設 3) */
const MAX_CHIPS_PER_MEAL = 3;

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

interface MealItem {
  dishId: string;
  course: CourseType;
}

/** 週總覽顯示主食/主菜/副菜,其他分類(蔬菜、湯品、附餐)太瑣碎,只在單日編輯頁才完整呈現。 */
const WEEK_OVERVIEW_COURSES: CourseType[] = ['staple', 'main', 'side'];

function flattenMeal(courses: MealCourses): MealItem[] {
  const list: MealItem[] = [];
  WEEK_OVERVIEW_COURSES.forEach((course) => {
    (courses[course] || []).forEach((dishId) => list.push({ dishId, course }));
  });
  return list;
}

function MenuPage() {
  const navigate = useNavigate();
  const [weekStartDay, setWeekStartDayState] = useState(0);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), 0));
  const [menus, setMenus] = useState<Record<string, MenuDay>>({});
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = formatDate(new Date());
  const isCurrentWeek = weekDays.some((d) => formatDate(d) === todayStr);

  useEffect(() => {
    getAllDishes().then(setAllDishes);
    getWeekStartDay().then((day) => {
      setWeekStartDayState(day);
      setWeekStart(startOfWeek(new Date(), day));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getMenusInRange(formatDate(weekStart), formatDate(addDays(weekStart, 6)))
      .then(setMenus)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const dishNameOf = (dishId: string): string => {
    const dish = allDishes.find((d) => d.id === dishId);
    return dish ? dish.name : '(已刪除的菜色)';
  };

  const goPrevWeek = () => setWeekStart((d) => addDays(d, -7));
  const goNextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goThisWeek = () => setWeekStart(startOfWeek(new Date(), weekStartDay));

  const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} – ${
    weekEnd.getMonth() + 1
  }/${weekEnd.getDate()}`;

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 480, margin: '0 auto', paddingBottom: 96 }}>
      <div style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <DateSwitcher
          label={weekLabel}
          onPrev={goPrevWeek}
          onNext={goNextWeek}
          isToday={isCurrentWeek}
          onToday={goThisWeek}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5) 0' }}>
          <Spinner />
        </div>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '52px repeat(3, 1fr)',
              padding: 'var(--space-2) var(--space-3)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span />
            {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
              <span
                key={meal}
                style={{
                  font: 'var(--font-caption)',
                  color: 'var(--color-text-placeholder)',
                  textAlign: 'center',
                }}
              >
                {MEAL_LABELS[meal]}
              </span>
            ))}
          </div>

          {weekDays.map((date, i) => {
            const dateStr = formatDate(date);
            const day = menus[dateStr];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                onClick={() => navigate(`/menu/${dateStr}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/menu/${dateStr}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '52px repeat(3, 1fr)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderBottom: i < 6 ? '1px solid var(--color-border)' : 'none',
                  background: isToday ? 'var(--color-primary-soft)' : 'transparent',
                  cursor: 'pointer',
                  alignItems: 'flex-start',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)' }}>
                    週{WEEKDAY_LABELS[date.getDay()]}
                  </span>
                  <span
                    style={{
                      font: 'var(--font-label)',
                      color: isToday ? 'var(--color-primary)' : 'var(--color-text)',
                    }}
                  >
                    {date.getMonth() + 1}/{date.getDate()}
                  </span>
                </div>

                {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => {
                  const items = day ? flattenMeal(day[meal]) : [];
                  const shown = items.slice(0, MAX_CHIPS_PER_MEAL);
                  const remaining = items.length - shown.length;

                  return (
                    <div
                      key={meal}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        minWidth: 0,
                      }}
                    >
                      {shown.length === 0 ? (
                        <span style={{ font: 'var(--font-caption)', color: 'var(--color-text-placeholder)' }}>
                          +
                        </span>
                      ) : (
                        <>
                          {shown.map(({ dishId, course }) => (
                            <Tag key={dishId} color={COURSE_TAG_COLOR[course]}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  maxWidth: 72,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  verticalAlign: 'bottom',
                                }}
                              >
                                {dishNameOf(dishId)}
                              </span>
                            </Tag>
                          ))}
                          {remaining > 0 && (
                            <span
                              style={{ font: 'var(--font-caption)', color: 'var(--color-text-placeholder)' }}
                            >
                              +{remaining}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Card>
      )}

      <p
        style={{
          font: 'var(--font-caption)',
          color: 'var(--color-text-placeholder)',
          textAlign: 'center',
          marginTop: 'var(--space-3)',
        }}
      >
        點任一天可進入編輯
      </p>
    </div>
  );
}

export default MenuPage;