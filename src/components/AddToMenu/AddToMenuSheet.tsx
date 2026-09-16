import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  getAllDishes,
  addDishToMeal,
  Dish,
  MealType,
  CourseType,
  COURSE_LABELS,
  COURSE_ORDER,
} from '../../db';
import { Modal } from '../Modal/Modal';
import { SegmentedControl } from '../SegmentedControl/SegmentedControl';
import { useToast } from '../Toast/ToastProvider';
import styles from './AddToMenuSheet.module.css';
import type { AddToMenuTarget } from './AddToMenuContext';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner'];
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

function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function shortDateLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function weekdayLabel(dateStr: string): string {
  return `週${WEEKDAY_LABELS[parseDateStr(dateStr).getDay()]}`;
}

/** 沒有指定餐別時，依現在時間猜一個，省去使用者多點一次的機會。 */
function defaultMealByTime(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 16) return 'lunch';
  return 'dinner';
}

interface AddToMenuSheetProps {
  open: boolean;
  target: AddToMenuTarget | null;
  onClose: () => void;
}

/**
 * 全域「快速加菜」底部 sheet。對齊 README 的「6. 快速加菜」畫面。
 * 這裡刻意不用 Modal 的 title prop，因為 README 要求標題列右側要放一顆
 * 「關閉」文字鈕，跟 Modal 內建「只有一個置中標題」的樣式不同，
 * 整個標題列自己在 children 裡排版。
 */
export function AddToMenuSheet({ open, target, onClose }: AddToMenuSheetProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [meal, setMeal] = useState<MealType>('dinner');
  const [course, setCourse] = useState<CourseType>('main');
  const [query, setQuery] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);

  // 每次打開 sheet，用當次帶入的 target 重新初始化內部狀態,
  // 並重抓一次最新的菜色清單(避免打開期間有新增/刪除菜色沒同步)。
  useEffect(() => {
    if (!open || !target) return;
    setMeal(target.meal ?? defaultMealByTime());
    setCourse(target.course ?? 'main');
    setQuery(target.query ?? '');
    setAddingId(null);
    getAllDishes().then(setDishes);
  }, [open, target]);

  const dateStr = target?.date ?? formatDate(new Date());

  const searchTerm = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!searchTerm) return dishes;
    return dishes.filter(
      (d) =>
        d.name.toLowerCase().includes(searchTerm) ||
        d.ingredients.some((ing) => ing.toLowerCase().includes(searchTerm))
    );
  }, [dishes, searchTerm]);

  const handleAdd = async (dish: Dish) => {
    if (addingId) return;
    setAddingId(dish.id);
    try {
      await addDishToMeal(dateStr, meal, course, dish.id);
      showToast(
        `${dish.name} 已加入 ${shortDateLabel(dateStr)} ${MEAL_LABELS[meal]}・${COURSE_LABELS[course]}`,
        'success'
      );
      setQuery('');
      onClose();
    } catch (err) {
      showToast('加入失敗，請再試一次', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const handleCreateNew = () => {
    const prefillName = query.trim();
    onClose();
    // DishFormPage 目前還沒有讀取這個 state 做預填,等該頁改版時會接上;
    // 現階段先傳,不影響現有行為(表單會照舊開出空白新增畫面)。
    navigate('/new', { state: { prefillName, prefillCourse: course } });
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.header}>
        <span className={styles.title}>快速加菜</span>
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          關閉
        </button>
      </div>
      <div className={styles.targetDate}>
        {shortDateLabel(dateStr)}（{weekdayLabel(dateStr)}）
      </div>

      <SegmentedControl
        options={MEAL_ORDER.map((m) => ({ value: m, label: MEAL_LABELS[m] }))}
        value={meal}
        onChange={(v) => setMeal(v as MealType)}
        className={styles.mealSwitch}
      />

      <div className={styles.courseRow}>
        {COURSE_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            className={[styles.courseChip, c === course ? styles.courseChipActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setCourse(c)}
          >
            {COURSE_LABELS[c]}
          </button>
        ))}
      </div>

      <input
        className={styles.searchInput}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋菜名或食材"
      />

      <div className={styles.results}>
        {results.length === 0 ? (
          <button type="button" className={styles.createNewBtn} onClick={handleCreateNew}>
            ＋ 建立新菜色並排入
          </button>
        ) : (
          results.map((dish) => (
            <div key={dish.id} className={styles.resultCard}>
              <div className={styles.resultInfo}>
                <div className={styles.resultName}>{dish.name}</div>
                {dish.ingredients.length > 0 && (
                  <div className={styles.resultIngredients}>{dish.ingredients.join('、')}</div>
                )}
              </div>
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => handleAdd(dish)}
                disabled={addingId === dish.id}
                aria-label={`把「${dish.name}」加入`}
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
