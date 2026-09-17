import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Link2, Trash2, Clock } from 'lucide-react';
import { getDishById, deleteDish, getFridgeItems, getIngredientCategoryMap, Dish, IngredientWithCategory, COURSE_LABELS } from '../db';
import { resolveIngredientCategoryColor } from '../ingredientCategoryColors';
import { ConfirmDialog, LocalPhoto, Spinner, useToast, useAddToMenu } from '../components';
import styles from './DishDetailPage.module.css';

function linkify(text: string): (string | JSX.Element)[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => (urlRegex.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : part));
}

function DishDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { openAddToMenu } = useAddToMenu();

  const [dish, setDish] = useState<Dish | null>(null);
  const [fridgeNames, setFridgeNames] = useState<Set<string>>(new Set());
  const [categoryMap, setCategoryMap] = useState<Record<string, IngredientWithCategory>>({});
  const [loading, setLoading] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const [result, fridgeItems, map] = await Promise.all([
        getDishById(id),
        getFridgeItems(),
        getIngredientCategoryMap(),
      ]);
      setDish(result);
      setFridgeNames(new Set(fridgeItems.map((f) => f.name)));
      setCategoryMap(map);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner />
      </div>
    );
  }

  if (!dish) {
    return <div className={styles.notFound}>找不到這道菜</div>;
  }

  const sourceIsUrl = !!dish.source && /^https?:\/\//.test(dish.source);
  const recipeSourceUrl = dish.recipe?.sourceUrl || '';
  const hasMeta = !!dish.source || !!dish.notes;
  const inStockCount = dish.ingredients.filter((ing) => fridgeNames.has(ing)).length;

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteDish(id);
      navigate('/');
    } catch (err) {
      showToast('刪除失敗:' + String(err), 'error');
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const handlePlan = () => {
    openAddToMenu({ course: dish.courseTypes[0], query: dish.name });
  };

  return (
    <div className={styles.page}>
      <div className={styles.cover}>
        {dish.recipe?.coverPhotoPath ? (
          <LocalPhoto path={dish.recipe.coverPhotoPath} className={styles.coverImg} />
        ) : (
          <span className={styles.coverPill}>沒有封面照片</span>
        )}
        <Link to="/" className={`${styles.roundBtn} ${styles.backBtn}`} aria-label="返回">
          <ArrowLeft size={20} strokeWidth={2.75} />
        </Link>
        <Link to={`/edit/${id}`} className={`${styles.roundBtn} ${styles.editBtn}`} aria-label="編輯">
          <Pencil size={19} strokeWidth={2.75} />
        </Link>
      </div>

      <div className={styles.content}>
        <h1 className={styles.dishName}>{dish.name}</h1>

        <div className={styles.chipRow}>
          {dish.category.map((c) => (
            <span key={`c-${c}`} className={`${styles.detailChip} ${styles.chipCategory}`}>
              {c}
            </span>
          ))}
          {dish.courseTypes.map((c) => (
            <span key={`t-${c}`} className={`${styles.detailChip} ${styles.chipCourse}`}>
              {COURSE_LABELS[c]}
            </span>
          ))}
          {dish.prepAhead && (
            <span className={`${styles.detailChip} ${styles.chipPrepAhead}`}>
              <Clock size={10} strokeWidth={3} />
              可先做
            </span>
          )}
          {dish.tags.map((t) => (
            <span key={`g-${t}`} className={`${styles.detailChip} ${styles.chipTag}`}>
              #{t}
            </span>
          ))}
        </div>

        {hasMeta && (
          <div className={styles.metaCard}>
            {dish.source && (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>來源</span>
                <span className={styles.metaValue}>
                  {sourceIsUrl ? (
                    <a href={dish.source} target="_blank" rel="noopener noreferrer">
                      {dish.source}
                    </a>
                  ) : (
                    dish.source
                  )}
                </span>
              </div>
            )}
            {dish.notes && (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>備註</span>
                <span className={styles.metaValue}>{dish.notes}</span>
              </div>
            )}
          </div>
        )}

        {dish.ingredients.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>食材 {dish.ingredients.length}</span>
              <span className={styles.sectionMeta}>{inStockCount} 項冰箱有</span>
            </div>
            <div className={styles.ingredientCard}>
              {dish.ingredients.map((ing) => {
                const info = categoryMap[ing];
                const inStock = fridgeNames.has(ing);
                return (
                  <div key={ing} className={styles.ingredientRow}>
                    <span
                      className={styles.categoryDot}
                      style={{ background: resolveIngredientCategoryColor(info?.color) }}
                    />
                    <div className={styles.ingredientInfo}>
                      <div className={styles.ingredientName}>{ing}</div>
                      {info?.categoryName && (
                        <div className={styles.ingredientCategoryName}>{info.categoryName}</div>
                      )}
                    </div>
                    <span className={`${styles.stockPill} ${inStock ? styles.stockPillIn : styles.stockPillOut}`}>
                      {inStock ? '冰箱有' : '要買'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {dish.hasRecipe && dish.recipe ? (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>食譜內容</span>
              {recipeSourceUrl && (
                <a href={recipeSourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sectionLink}>
                  <Link2 size={14} strokeWidth={2.5} />
                  原始連結
                </a>
              )}
            </div>
            {dish.recipe.content?.map((block, i) =>
              block.type === 'text' ? (
                <p key={i} className={styles.recipeParagraph}>
                  {linkify(block.text || '')}
                </p>
              ) : (
                <LocalPhoto key={i} path={block.path} className={styles.recipeImage} />
              )
            )}
          </div>
        ) : (
          <div className={styles.section}>
            <div className={styles.noRecipeCard}>
              <div className={styles.noRecipeTitle}>這道菜還沒有食譜</div>
              <div className={styles.noRecipeDesc}>只記了食材,之後想寫做法或貼照片都可以補。</div>
              <Link to={`/edit/${id}`} className={styles.sectionLink}>
                補上食譜
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.planBtn} onClick={handlePlan}>
          排進菜單
        </button>
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={() => setConfirmingDelete(true)}
          aria-label="刪除這道菜"
        >
          <Trash2 size={20} strokeWidth={2.25} />
        </button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="刪除菜色"
        description={`確定要刪除「${dish.name}」嗎?此操作無法復原。`}
        confirmLabel="刪除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
      {deleting && (
        <div className={styles.deletingOverlay}>
          <Spinner />
        </div>
      )}
    </div>
  );
}

export default DishDetailPage;
