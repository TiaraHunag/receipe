import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Clock } from 'lucide-react';
import { getAllDishes, getIngredientCategoryMap, Dish, IngredientWithCategory, COURSE_LABELS, COURSE_ORDER } from '../db';
import { resolveIngredientCategoryColor } from '../ingredientCategoryColors';
import { Chip, EmptyState, LocalPhoto, SegmentedControl, Skeleton, useAddToMenu } from '../components';
import styles from './DishListPage.module.css';

type GroupMode = 'category' | 'course';

const ALL_TAGS_KEY = '__all__';
const UNCATEGORIZED_LABEL = '未分類';

interface DishGroup {
  key: string;
  label: string;
  dishes: Dish[];
}

/** 首次載入骨架屏:貼近新版單欄列表的外型(搜尋框、分段切換、幾個列高的區塊) */
function DishListSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <Skeleton width={40} height={13} radius="var(--radius-pill)" />
          <div style={{ marginTop: 6 }}>
            <Skeleton width={80} height={26} />
          </div>
        </div>
        <Skeleton width={88} height={44} radius="var(--radius-pill)" />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Skeleton height={44} radius="var(--radius-pill)" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <Skeleton height={38} radius="var(--radius-pill)" />
      </div>
      {[0, 1].map((groupIdx) => (
        <div key={groupIdx} style={{ marginBottom: 20 }}>
          <Skeleton width={64} height={13} />
          {[0, 1, 2].map((rowIdx) => (
            <div key={rowIdx} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
              <Skeleton width="60%" height={18} />
              <div style={{ marginTop: 6 }}>
                <Skeleton width="40%" height={12} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DishListPage() {
  const navigate = useNavigate();
  const { openAddToMenu } = useAddToMenu();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryMap, setCategoryMap] = useState<Record<string, IngredientWithCategory>>({});

  const [query, setQuery] = useState('');
  const [groupMode, setGroupMode] = useState<GroupMode>('course');
  const [tagFilter, setTagFilter] = useState<string>(ALL_TAGS_KEY);

  useEffect(() => {
    const load = async () => {
      const [allDishes, map] = await Promise.all([getAllDishes(), getIngredientCategoryMap()]);
      setDishes(allDishes);
      setCategoryMap(map);
      setLoading(false);
    };
    load();
  }, []);

  // getAllCategories()/getAllTags() 內部其實也只是重新 getAllDishes() 再算一次,
  // 這裡已經有完整的 dishes 了,直接在前端算標籤選項,省一次資料庫查詢。
  const tagOptions = useMemo(
    () => Array.from(new Set(dishes.flatMap((d) => d.tags))).sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [dishes]
  );

  const searchTerm = query.trim().toLowerCase();

  const filteredDishes = useMemo(() => {
    return dishes.filter((d) => {
      if (searchTerm) {
        const hit =
          d.name.toLowerCase().includes(searchTerm) ||
          d.ingredients.some((ing) => ing.toLowerCase().includes(searchTerm)) ||
          d.tags.some((t) => t.toLowerCase().includes(searchTerm));
        if (!hit) return false;
      }
      if (tagFilter !== ALL_TAGS_KEY && !d.tags.includes(tagFilter)) return false;
      return true;
    });
  }, [dishes, searchTerm, tagFilter]);

  const groups: DishGroup[] = useMemo(() => {
    if (groupMode === 'course') {
      const courseGroups: DishGroup[] = COURSE_ORDER.map((c) => ({
        key: c,
        label: COURSE_LABELS[c],
        dishes: filteredDishes.filter((d) => d.courseTypes.includes(c)),
      })).filter((g) => g.dishes.length > 0);
      const uncategorized = filteredDishes.filter((d) => !d.courseTypes || d.courseTypes.length === 0);
      return uncategorized.length > 0
        ? [...courseGroups, { key: '__none__', label: UNCATEGORIZED_LABEL, dishes: uncategorized }]
        : courseGroups;
    }

    const categoryNames = Array.from(new Set(dishes.flatMap((d) => d.category))).sort((a, b) =>
      a.localeCompare(b, 'zh-Hant')
    );
    const categoryGroups: DishGroup[] = categoryNames
      .map((name) => ({
        key: name,
        label: name,
        dishes: filteredDishes.filter((d) => d.category.includes(name)),
      }))
      .filter((g) => g.dishes.length > 0);
    const uncategorized = filteredDishes.filter((d) => !d.category || d.category.length === 0);
    return uncategorized.length > 0
      ? [...categoryGroups, { key: '__none__', label: UNCATEGORIZED_LABEL, dishes: uncategorized }]
      : categoryGroups;
  }, [filteredDishes, dishes, groupMode]);

  const hasAnyDish = dishes.length > 0;
  const noResult = filteredDishes.length === 0;

  const handlePlan = (dish: Dish) => {
    openAddToMenu({
      course: dish.courseTypes[0],
      query: dish.name,
    });
  };

  if (loading) {
    return <DishListSkeleton />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.countLabel}>{dishes.length} 道</div>
          <h1 className={styles.pageTitle}>食譜</h1>
        </div>
        <Link to="/new" className={styles.addBtn}>
          <Plus size={17} strokeWidth={2.75} />
          新增
        </Link>
      </div>

      <input
        className={styles.searchInput}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋菜名、食材或標籤"
      />

      <SegmentedControl
        className={styles.groupModeSwitch}
        options={[
          { value: 'category', label: '餐點分類' },
          { value: 'course', label: '餐點類型' },
        ]}
        value={groupMode}
        onChange={(v) => setGroupMode(v as GroupMode)}
      />

      {tagOptions.length > 0 && (
        <div className={styles.tagRow}>
          <button
            type="button"
            className={[styles.tagFilterChip, tagFilter === ALL_TAGS_KEY ? styles.tagFilterChipActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setTagFilter(ALL_TAGS_KEY)}
          >
            全部標籤
          </button>
          {tagOptions.map((tag) => (
            <button
              key={tag}
              type="button"
              className={[styles.tagFilterChip, tagFilter === tag ? styles.tagFilterChipActive : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setTagFilter(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {noResult ? (
        <EmptyState
          icon={<div className={styles.emptyCircle} />}
          title={hasAnyDish ? '沒有符合的菜' : '還沒有任何食譜'}
          description={hasAnyDish ? '換個關鍵字或清掉標籤篩選。' : '新增你的第一道菜,開始累積食譜庫。'}
          action={
            <button type="button" className={styles.addBtn} onClick={() => navigate('/new')}>
              <Plus size={17} strokeWidth={2.75} />
              新增一道菜
            </button>
          }
        />
      ) : (
        groups.map((group) => (
          <div key={group.key} className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupLabel}>{group.label}</span>
              <span className={styles.groupCount}>{group.dishes.length} 道</span>
              <span className={styles.groupLine} />
            </div>

            {group.dishes.map((dish) => (
              <div key={dish.id} className={styles.row}>
                <Link to={`/dish/${dish.id}`} className={styles.thumbLink}>
                  {dish.recipe?.coverPhotoPath ? (
                    <LocalPhoto path={dish.recipe.coverPhotoPath} className={styles.thumbImg} />
                  ) : (
                    <div className={styles.thumbPlaceholder} />
                  )}
                </Link>
                <Link to={`/dish/${dish.id}`} className={styles.rowMain}>
                  <div className={styles.rowTitleLine}>
                    <span className={styles.dishName}>{dish.name}</span>
                    {dish.hasRecipe && (
                      <Chip tone="recipe" variant="badge">
                        食譜
                      </Chip>
                    )}
                    {dish.prepAhead && (
                      <Chip tone="prepAhead" variant="badge" icon={<Clock size={10} strokeWidth={3} />}>
                        可先做
                      </Chip>
                    )}
                  </div>

                  {dish.ingredients.length > 0 && (
                    <div className={styles.ingredientLine}>
                      {dish.ingredients.map((ing, i) => (
                        <span key={ing} className={styles.ingredientItem}>
                          <span
                            className={styles.ingredientDot}
                            style={{ background: resolveIngredientCategoryColor(categoryMap[ing]?.color) }}
                          />
                          {ing}
                          {i < dish.ingredients.length - 1 ? '、' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {(dish.category.length > 0 || dish.courseTypes.length > 0 || dish.tags.length > 0) && (
                    <div className={styles.chipRow}>
                      {dish.category.map((c) => (
                        <Chip key={`c-${c}`} tone="category">
                          {c}
                        </Chip>
                      ))}
                      {dish.courseTypes.map((c) => (
                        <Chip key={`t-${c}`} tone="course">
                          {COURSE_LABELS[c]}
                        </Chip>
                      ))}
                      {dish.tags.map((tag) => (
                        <Chip key={`g-${tag}`} tone="tag">
                          #{tag}
                        </Chip>
                      ))}
                    </div>
                  )}
                </Link>

                <button type="button" className={styles.planBtn} onClick={() => handlePlan(dish)}>
                  排菜單
                </button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default DishListPage;
