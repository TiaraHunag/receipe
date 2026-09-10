import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllDishes,
  getAllIngredients,
  getAllTags,
  addDishToMeal,
  Dish,
  MealType,
  CourseType,
  COURSE_ORDER,
  COURSE_LABELS,
} from '../db';
import {
  Card,
  Input,
  Button,
  Fab,
  IconButton,
  EmptyState,
  Tag,
  Spinner,
  SegmentedControl,
  Modal,
  useToast,
} from '../components';
import type { TagColorKey } from '../components';
import { COURSE_TAG_COLOR } from '../courseColors';

type GroupMode = 'course' | 'category';
type QuickAddStep = 'date' | 'meal' | 'course';

const UNCATEGORIZED_LABEL = '未分類';
const QUICK_ADD_DAY_COUNT = 7;

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

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** 自訂類型(自由文字)沒有固定色盤,用簡單雜湊固定映射到 9 色其中幾色,讓同一個類型名稱每次顏色都一樣 */
const CATEGORY_COLOR_POOL: TagColorKey[] = ['brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
function colorForCategory(name: string): TagColorKey {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CATEGORY_COLOR_POOL[hash % CATEGORY_COLOR_POOL.length];
}

interface Group {
  key: string;
  label: string;
  color: TagColorKey;
  dishes: Dish[];
}

function DishListPage() {
  const { showToast } = useToast();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ingredientOptions, setIngredientOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [groupMode, setGroupMode] = useState<GroupMode>('course');
  const [searchIngredient, setSearchIngredient] = useState('');

  const [quickAddDish, setQuickAddDish] = useState<Dish | null>(null);
  const [quickAddStep, setQuickAddStep] = useState<QuickAddStep>('date');
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [quickAddMeal, setQuickAddMeal] = useState<MealType | null>(null);
  const [quickAdding, setQuickAdding] = useState(false);

  const loadDishes = async () => {
    try {
      const results = await getAllDishes();
      setDishes(results);
      const ings = await getAllIngredients();
      setIngredientOptions(ings);
      const tags = await getAllTags();
      setTagOptions(tags);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDishes();
  }, []);

  const searchTerm = searchIngredient.trim().toLowerCase();
  const isSearching = searchTerm.length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return dishes.filter(
      (dish) =>
        dish.ingredients.some((ing) => ing.toLowerCase().includes(searchTerm)) ||
        (dish.tags || []).some((tag) => tag.toLowerCase().includes(searchTerm))
    );
  }, [dishes, searchTerm, isSearching]);

  /** 搜尋自動建議:合併食材與標籤,去重 */
  const searchSuggestions = useMemo(
    () => Array.from(new Set([...ingredientOptions, ...tagOptions])).sort(),
    [ingredientOptions, tagOptions]
  );

  const groups: Group[] = useMemo(() => {
    if (isSearching) return [];

    if (groupMode === 'course') {
      const courseGroups: Group[] = COURSE_ORDER.map((course) => ({
        key: course,
        label: COURSE_LABELS[course],
        color: COURSE_TAG_COLOR[course],
        dishes: dishes.filter((d) => d.courseTypes.includes(course)),
      }));
      const uncategorized = dishes.filter((d) => !d.courseTypes || d.courseTypes.length === 0);
      return [
        ...courseGroups.filter((g) => g.dishes.length > 0),
        ...(uncategorized.length > 0
          ? [{ key: '__none__', label: UNCATEGORIZED_LABEL, color: 'grey' as TagColorKey, dishes: uncategorized }]
          : []),
      ];
    }

    const categoryNames = Array.from(new Set(dishes.flatMap((d) => d.category))).sort();
    const categoryGroups: Group[] = categoryNames.map((name) => ({
      key: name,
      label: name,
      color: colorForCategory(name),
      dishes: dishes.filter((d) => d.category.includes(name)),
    }));
    const uncategorized = dishes.filter((d) => !d.category || d.category.length === 0);
    return [
      ...categoryGroups,
      ...(uncategorized.length > 0
        ? [{ key: '__none__', label: UNCATEGORIZED_LABEL, color: 'grey' as TagColorKey, dishes: uncategorized }]
        : []),
    ];
  }, [dishes, groupMode, isSearching]);

  /** 卡片上的次要標籤:跟目前分組依據「相反」的那個欄位,補充資訊用,避免跟區塊標題重複 */
  const secondaryTagsOf = (dish: Dish): string[] =>
    groupMode === 'course' ? dish.category : dish.courseTypes.map((c) => COURSE_LABELS[c]);

  const quickAddDayOptions = useMemo(() => {
    const today = new Date();
    return Array.from({ length: QUICK_ADD_DAY_COUNT }, (_, i) => addDays(today, i));
  }, []);

  const openQuickAdd = (dish: Dish) => {
    setQuickAddDish(dish);
    setQuickAddDate(null);
    setQuickAddMeal(null);
    setQuickAddStep('date');
  };
  const closeQuickAdd = () => {
    setQuickAddDish(null);
    setQuickAddDate(null);
    setQuickAddMeal(null);
    setQuickAddStep('date');
  };

  const chooseQuickAddDate = (date: Date) => {
    setQuickAddDate(date);
    setQuickAddStep('meal');
  };

  const confirmQuickAdd = async (course: CourseType) => {
    if (!quickAddDish || !quickAddDate || !quickAddMeal || quickAdding) return;
    setQuickAdding(true);
    try {
      const dateStr = formatDate(quickAddDate);
      await addDishToMeal(dateStr, quickAddMeal, course, quickAddDish.id);
      const isToday = dateStr === formatDate(new Date());
      const dayText = isToday ? '今天' : `${quickAddDate.getMonth() + 1}/${quickAddDate.getDate()}`;
      showToast(`已加入${dayText}${MEAL_LABELS[quickAddMeal]}的${COURSE_LABELS[course]}`, 'success');
      closeQuickAdd();
    } catch (err) {
      showToast('加入失敗,請再試一次', 'error');
    } finally {
      setQuickAdding(false);
    }
  };

  const QuickAddButton = ({ dish }: { dish: Dish }) => (
    <IconButton
      icon="＋"
      label={`加入「${dish.name}」到菜單`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openQuickAdd(dish);
      }}
      style={{ position: 'absolute', top: 2, right: 2 }}
    />
  );

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    );
  }

  const todayStr = formatDate(new Date());
  const quickAddDateLabel = quickAddDate
    ? `${quickAddDate.getMonth() + 1}/${quickAddDate.getDate()}(週${WEEKDAY_LABELS[quickAddDate.getDay()]})`
    : '';

  const quickAddTitle = !quickAddDish
    ? undefined
    : quickAddStep === 'date'
    ? `「${quickAddDish.name}」加到菜單——選擇日期`
    : quickAddStep === 'meal'
    ? `「${quickAddDish.name}」加到${quickAddDateLabel}——選擇餐別`
    : `「${quickAddDish.name}」加到${quickAddDateLabel}${MEAL_LABELS[quickAddMeal!]}——選擇分類`;

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

      <div style={{ marginBottom: 'var(--space-2)' }}>
        <SegmentedControl
          options={[
            { value: 'course', label: '餐點分類' },
            { value: 'category', label: '餐點類型' },
          ]}
          value={groupMode}
          onChange={(v) => setGroupMode(v as GroupMode)}
        />
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Input
          aria-label="搜尋食材或標籤"
          value={searchIngredient}
          onChange={(e) => setSearchIngredient(e.target.value)}
          placeholder="搜尋食材或標籤,例如:雞肉"
          suggestions={searchSuggestions}
        />
      </div>

      {error && (
        <p style={{ color: 'var(--color-danger)', font: 'var(--font-caption)', marginBottom: 'var(--space-3)' }}>
          {error}
        </p>
      )}

      {dishes.length === 0 ? (
        <EmptyState
          icon="🍳"
          title="目前沒有資料"
          description="按右下角的 + 開始新增第一道菜色"
        />
      ) : isSearching ? (
        searchResults.length === 0 ? (
          <EmptyState icon="🔍" title={`沒有食譜含有「${searchIngredient.trim()}」`} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {searchResults.map((dish) => (
              <div key={dish.id} style={{ position: 'relative' }}>
                <Link to={`/dish/${dish.id}`} style={{ textDecoration: 'none' }}>
                  <Card interactive style={{ padding: 'var(--space-4)' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-2)',
                        paddingRight: 32,
                      }}
                    >
                      <strong style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)' }}>
                        {dish.name}
                      </strong>
                      {dish.hasRecipe && (
                        <span style={{ font: 'var(--font-caption)', color: 'var(--color-primary)' }}>有食譜</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                      {dish.category.map((c) => (
                        <Tag key={c} color={colorForCategory(c)}>
                          {c}
                        </Tag>
                      ))}
                      {dish.courseTypes.map((c) => (
                        <Tag key={c} color={COURSE_TAG_COLOR[c]}>
                          {COURSE_LABELS[c]}
                        </Tag>
                      ))}
                      {(dish.tags || []).map((t) => (
                        <Tag key={t} color="grey">
                          #{t}
                        </Tag>
                      ))}
                    </div>
                  </Card>
                </Link>
                <QuickAddButton dish={dish} />
              </div>
            ))}
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {groups.map((group) => (
            <div key={group.key}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-2)',
                }}
              >
                <span style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)' }}>{group.label}</span>
                <span style={{ font: 'var(--font-caption)', color: 'var(--color-text-placeholder)' }}>
                  {group.dishes.length} 道
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  overflowX: 'auto',
                  paddingBottom: 4,
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {group.dishes.map((dish) => {
                  const secondary = secondaryTagsOf(dish);
                  return (
                    <div key={dish.id} style={{ position: 'relative', flex: '0 0 auto' }}>
                      <Link to={`/dish/${dish.id}`} style={{ textDecoration: 'none' }}>
                        <Card
                          interactive
                          style={{
                            width: 136,
                            minHeight: 108,
                            padding: 'var(--space-3)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                font: 'var(--font-label)',
                                color: 'var(--color-text)',
                                paddingRight: 24,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {dish.name}
                            </div>
                            {secondary.length > 0 && (
                              <div
                                style={{
                                  font: 'var(--font-caption)',
                                  color: 'var(--color-text-secondary)',
                                  marginTop: 4,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {secondary.join('、')}
                              </div>
                            )}
                          </div>
                          {dish.hasRecipe && (
                            <span style={{ font: 'var(--font-caption)', color: 'var(--color-primary)' }}>
                              有食譜
                            </span>
                          )}
                        </Card>
                      </Link>
                      <QuickAddButton dish={dish} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!quickAddDish} onClose={closeQuickAdd} title={quickAddTitle}>
        {quickAddDish && quickAddStep === 'date' && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 4 }}>
            {quickAddDayOptions.map((date) => {
              const dateStr = formatDate(date);
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => chooseQuickAddDate(date)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 2px 4px',
                    flex: '0 0 auto',
                  }}
                >
                  <span style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)' }}>
                    週{WEEKDAY_LABELS[date.getDay()]}
                  </span>
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-pill)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      font: 'var(--font-label)',
                      background: isToday ? 'var(--color-primary)' : 'var(--color-surface-sunken)',
                      color: isToday ? 'var(--color-text-inverse)' : 'var(--color-text)',
                    }}
                  >
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {quickAddDish && quickAddStep === 'meal' && (
          <>
            <button
              type="button"
              onClick={() => setQuickAddStep('date')}
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
              ‹ 換一天
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                <Button
                  key={meal}
                  variant="secondary"
                  onClick={() => {
                    setQuickAddMeal(meal);
                    setQuickAddStep('course');
                  }}
                >
                  {MEAL_LABELS[meal]}
                </Button>
              ))}
            </div>
          </>
        )}

        {quickAddDish && quickAddStep === 'course' && quickAddMeal && (
          <>
            <button
              type="button"
              onClick={() => setQuickAddStep('meal')}
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
                <Button
                  key={course}
                  variant="secondary"
                  size="sm"
                  disabled={quickAdding}
                  onClick={() => confirmQuickAdd(course)}
                >
                  {COURSE_LABELS[course]}
                </Button>
              ))}
            </div>
          </>
        )}
      </Modal>

      <div
        style={{
          position: 'fixed',
          right: 20,
          bottom: 84,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          zIndex: 90,
        }}
      >
        <Link to="/quick-add" title="貼上連結/文字快速新增" style={{ textDecoration: 'none' }}>
          <IconButton
            icon="🔗"
            label="貼上連結/文字快速新增"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-float)' }}
          />
        </Link>
        <Link to="/new" style={{ textDecoration: 'none' }}>
          <Fab label="新增菜色" />
        </Link>
      </div>
    </div>
  );
}

export default DishListPage;
