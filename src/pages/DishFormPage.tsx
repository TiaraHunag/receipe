import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, X, Camera, Image as ImageIcon } from 'lucide-react';
import {
  getDishById,
  insertDish,
  updateDish,
  getAllCategories,
  getAllTags,
  getAllIngredients,
  getAllIngredientCategories,
  getIngredientCategoryMap,
  setIngredientCategory,
  createIngredientCategory,
  IngredientCategory,
  IngredientWithCategory,
  CourseType,
  COURSE_LABELS,
  COURSE_ORDER,
} from '../db';
import { compressAndSavePhoto, deletePhotoFile } from '../photoStorage';
import { INGREDIENT_CATEGORY_COLORS } from '../ingredientCategoryColors';
import {
  Input,
  Textarea,
  Button,
  Toggle,
  ColorDot,
  ConfirmDialog,
  LocalPhoto,
  useToast,
} from '../components';
import styles from './DishFormPage.module.css';

interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  path?: string;
}

function DishFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [prepAhead, setPrepAhead] = useState(false);
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  const [category, setCategory] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');

  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState('');

  const [hasRecipe, setHasRecipe] = useState(false);
  const [coverPhotoPath, setCoverPhotoPath] = useState('');
  const [content, setContent] = useState<ContentBlock[]>([]);
  const [recipeSourceUrl, setRecipeSourceUrl] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [nameError, setNameError] = useState<string | null>(null);

  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<string[]>([]);

  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategory[]>([]);
  const [ingredientCategoryMap, setIngredientCategoryMap] = useState<Record<string, IngredientWithCategory>>({});
  const [pendingIngredient, setPendingIngredient] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(INGREDIENT_CATEGORY_COLORS[0].key);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  // ---- 離開保護:表單有未儲存變更時,攔截返回動作 ----
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const initialSnapshotRef = useRef<string>('');
  const guardActiveRef = useRef(false);
  const justSavedRef = useRef(false);

  // ---- 封面/內文圖片挑選(瀏覽器/WKWebView 內建的相簿選擇器,選完會壓縮後存進
  //      本機檔案系統,表單狀態只存路徑) ----
  const coverInputRef = useRef<HTMLInputElement>(null);
  const blockImageInputRef = useRef<HTMLInputElement>(null);
  const pendingBlockIndexRef = useRef<number | null>(null);

  // 記錄「這次進表單編輯之前,資料庫裡就已經存在」的照片路徑(新增模式是空集合)。
  // 這次編輯過程中新寫入、但最後沒被實際存檔用到的照片檔案(換照片時被取代掉的、
  // 或整個表單直接放棄不儲存的),都要主動清掉,不然會變成孤兒檔案越積越多;
  // 反之,屬於這個集合裡的路徑代表「本來就在資料庫」,不管這次編輯有沒有存檔
  // 都不能提前刪除,交給 updateDish/deleteDish 在真正異動資料庫時處理。
  const originalPathsRef = useRef<Set<string>>(new Set());

  /** 刪掉「這次編輯過程中新寫入、但不是原本就在資料庫裡」的照片檔案。 */
  const deleteIfSessionOwned = (path?: string) => {
    if (path && !originalPathsRef.current.has(path)) {
      deletePhotoFile(path);
    }
  };

  const serializeFormState = () =>
    JSON.stringify({
      name,
      category,
      tags,
      courseTypes,
      ingredients,
      prepAhead,
      source,
      notes,
      hasRecipe,
      coverPhotoPath,
      content,
      recipeSourceUrl,
    });

  const loadIngredientMeta = async () => {
    const [cats, map] = await Promise.all([getAllIngredientCategories(), getIngredientCategoryMap()]);
    setIngredientCategories(cats);
    setIngredientCategoryMap(map);
  };

  useEffect(() => {
    getAllCategories().then(setCategoryOptions);
    getAllTags().then(setTagOptions);
    getAllIngredients().then(setIngredientOptions);
    loadIngredientMeta();
  }, []);

  // 從「快速加菜」sheet 的「建立新菜色並排入」帶入的預填值(只在新增模式套用一次)
  useEffect(() => {
    if (isEditMode) return;
    const state = location.state as { prefillName?: string; prefillCourse?: CourseType } | undefined;
    if (state?.prefillName) setName(state.prefillName);
    if (state?.prefillCourse) setCourseTypes([state.prefillCourse]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isEditMode || !id) return;
    const fetchData = async () => {
      const data = await getDishById(id);
      if (data) {
        setName(data.name);
        setCategory(data.category);
        setCourseTypes(data.courseTypes || []);
        setTags(data.tags || []);
        setIngredients(data.ingredients);
        setPrepAhead(data.prepAhead);
        setSource(data.source);
        setNotes(data.notes);
        setHasRecipe(data.hasRecipe);
        setCoverPhotoPath(data.recipe?.coverPhotoPath || '');
        setContent(data.recipe?.content || []);
        setRecipeSourceUrl(data.recipe?.sourceUrl || '');

        const existingPaths = new Set<string>();
        if (data.recipe?.coverPhotoPath) existingPaths.add(data.recipe.coverPhotoPath);
        (data.recipe?.content || []).forEach((b) => {
          if (b.type === 'image' && b.path) existingPaths.add(b.path);
        });
        originalPathsRef.current = existingPaths;
      }
      setLoadingData(false);
    };
    fetchData();
  }, [id, isEditMode]);

  // 資料載入完成後記一份「初始快照」,之後拿目前表單內容跟這份快照比對,
  // 就知道使用者有沒有做過任何異動。
  useEffect(() => {
    if (loadingData) return;
    if (initialSnapshotRef.current === '') {
      initialSnapshotRef.current = serializeFormState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingData]);

  const isDirty =
    !loadingData && initialSnapshotRef.current !== '' && serializeFormState() !== initialSnapshotRef.current;

  useEffect(() => {
    if (!isDirty) {
      guardActiveRef.current = false;
      return;
    }
    if (!guardActiveRef.current) {
      window.history.pushState(null, '', window.location.href);
      guardActiveRef.current = true;
    }
    const handlePopState = () => {
      if (justSavedRef.current) {
        justSavedRef.current = false;
        return;
      }
      setShowLeaveConfirm(true);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleBackClick = () => {
    if (isDirty) {
      window.history.back();
    } else {
      navigate(-1);
    }
  };

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    // 放棄這次編輯:目前表單上還留著的照片,只要不是原本就在資料庫裡的,
    // 都是這次編輯過程中新寫入卻沒存檔的孤兒檔案,一併清掉。
    deleteIfSessionOwned(coverPhotoPath);
    content.forEach((b) => {
      if (b.type === 'image' && b.path) deleteIfSessionOwned(b.path);
    });
    navigate(-1);
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirm(false);
    window.history.pushState(null, '', window.location.href);
  };

  const addCategoryValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !category.includes(trimmed)) setCategory([...category, trimmed]);
    setCategoryInput('');
  };
  const addCategory = () => addCategoryValue(categoryInput);
  const toggleCategory = (name: string) => {
    setCategory((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };
  const addTagValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) setTags([...tags, trimmed]);
    setTagInput('');
  };
  const addTag = () => addTagValue(tagInput);

  const toggleCourseType = (course: CourseType) => {
    setCourseTypes((prev) => (prev.includes(course) ? prev.filter((c) => c !== course) : [...prev, course]));
  };

  const addIngredientValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
      // 只看「這個名字存不存在於 ingredientCategoryMap」不夠準——任何食材只要存過一次
      // (哪怕當時沒選分類)就會留在 ingredients_master 裡,map 裡一定查得到,
      // 這樣永遠不會再跳出分類提示。真正要看的是「有沒有實際指定 categoryId」。
      if (!ingredientCategoryMap[trimmed]?.categoryId) {
        setPendingIngredient(trimmed);
      }
    }
    setIngredientInput('');
  };
  const addIngredient = () => addIngredientValue(ingredientInput);
  const removeIngredient = (index: number) => setIngredients(ingredients.filter((_, i) => i !== index));

  const ingredientSuggestions = ingredientOptions.filter((n) => !ingredients.includes(n)).slice(0, 6);

  const assignCategory = async (categoryId: string | null) => {
    if (!pendingIngredient) return;
    await setIngredientCategory(pendingIngredient, categoryId);
    await loadIngredientMeta();
    setPendingIngredient(null);
    setShowNewCategoryInput(false);
  };

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const newId = await createIngredientCategory(trimmed, newCategoryColor);
    setNewCategoryName('');
    await assignCategory(newId);
  };

  const addTextBlock = () => setContent([...content, { type: 'text', text: '' }]);
  const addImageBlock = () => setContent([...content, { type: 'image', path: '' }]);
  const updateBlockText = (index: number, value: string) => {
    setContent((prev) => prev.map((b, i) => (i === index ? { ...b, text: value } : b)));
  };
  const removeBlock = (index: number) => {
    const block = content[index];
    if (block?.type === 'image' && block.path) deleteIfSessionOwned(block.path);
    setContent(content.filter((_, i) => i !== index));
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      const newPath = await compressAndSavePhoto(file);
      deleteIfSessionOwned(coverPhotoPath);
      setCoverPhotoPath(newPath);
    } catch {
      showToast('讀取圖片失敗,請再試一次', 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const openBlockFilePicker = (index: number) => {
    pendingBlockIndexRef.current = index;
    blockImageInputRef.current?.click();
  };

  const handleBlockFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const index = pendingBlockIndexRef.current;
    e.target.value = '';
    pendingBlockIndexRef.current = null;
    if (!file || index === null) return;
    setPhotoBusy(true);
    try {
      const newPath = await compressAndSavePhoto(file);
      const oldPath = content[index]?.path;
      deleteIfSessionOwned(oldPath);
      setContent((prev) => prev.map((b, i) => (i === index ? { ...b, path: newPath } : b)));
    } catch {
      showToast('讀取圖片失敗,請再試一次', 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);

    if (!name.trim()) {
      setNameError('菜名不能空白');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        ingredients,
        prepAhead,
        source,
        notes,
        hasRecipe,
        recipe: hasRecipe ? { coverPhotoPath, sourceUrl: recipeSourceUrl.trim(), content } : null,
        courseTypes,
        tags,
      };

      if (isEditMode && id) {
        await updateDish(id, payload);
        justSavedRef.current = true;
        if (guardActiveRef.current) {
          window.history.go(-2);
        } else {
          navigate(-1);
        }
      } else {
        const newId = await insertDish(payload);
        justSavedRef.current = true;
        navigate(`/dish/${newId}`);
      }
    } catch (err) {
      showToast('儲存失敗,可能是本地儲存空間不足,請稍後再試', 'error');
      setSaving(false);
    }
  };

  if (loadingData) {
    return <div className={styles.loading}>讀取中...</div>;
  }

  return (
    <div className={styles.page}>
      <form onSubmit={handleSubmit}>
        <div className={styles.topRow}>
          <button type="button" className={styles.backBtn} onClick={handleBackClick} aria-label="返回">
            <ArrowLeft size={19} strokeWidth={2.5} />
          </button>
          <Button type="submit" loading={saving} className={styles.saveBtnTop}>
            {saving ? '儲存中...' : '儲存'}
          </Button>
        </div>

        <h1 className={styles.pageTitle}>{isEditMode ? '編輯食譜' : '新增食譜'}</h1>

        <div className={styles.field}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如:三杯雞"
            error={nameError || undefined}
            style={{ minHeight: 48, fontSize: 15 }}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>餐點分類</label>
          <div className={styles.chipWrap}>
            {categoryOptions.map((c) => (
              <button
                key={c}
                type="button"
                className={[styles.selectChip, category.includes(c) ? styles.selectChipActive : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => toggleCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className={styles.addRow}>
            <Input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              placeholder="新增分類"
              style={{ minHeight: 44 }}
            />
            <button
              type="button"
              className={styles.roundAddBtn}
              onClick={addCategory}
              disabled={!categoryInput.trim()}
              aria-label="新增分類"
            >
              <Plus size={18} strokeWidth={2.75} />
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>餐點類型</label>
          <div className={styles.chipWrap}>
            {COURSE_ORDER.map((course) => (
              <button
                key={course}
                type="button"
                className={[styles.selectChip, courseTypes.includes(course) ? styles.selectChipActive : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => toggleCourseType(course)}
              >
                {COURSE_LABELS[course]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>食材</label>
          {ingredients.length > 0 && (
            <div className={styles.chipWrap}>
              {ingredients.map((ing, i) => (
                <span key={ing} className={styles.ingredientChip}>
                  {ing}
                  <button
                    type="button"
                    className={styles.ingredientRemoveBtn}
                    onClick={() => removeIngredient(i)}
                    aria-label={`移除${ing}`}
                  >
                    <X size={14} strokeWidth={2.75} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className={styles.addRow}>
            <Input
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
              placeholder="例如:番茄"
              suggestions={ingredientOptions.filter((i) => !ingredients.includes(i))}
              onSuggestionSelect={addIngredientValue}
              style={{ minHeight: 44 }}
            />
            <button
              type="button"
              className={styles.roundAddBtn}
              onClick={addIngredient}
              disabled={!ingredientInput.trim()}
              aria-label="新增食材"
            >
              <Plus size={18} strokeWidth={2.75} />
            </button>
          </div>

          {ingredientSuggestions.length > 0 && (
            <div className={[styles.chipWrap, styles.field].join(' ')} style={{ marginTop: 10, marginBottom: 0 }}>
              {ingredientSuggestions.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={styles.ingredientSuggestChip}
                  onClick={() => addIngredientValue(n)}
                >
                  ＋ {n}
                </button>
              ))}
            </div>
          )}

          {pendingIngredient && (
            <div className={styles.pendingCard}>
              <p className={styles.pendingHint}>
                「{pendingIngredient}」是新食材,幫它選個分類(之後可在「冰箱與食材」頁調整):
              </p>
              <div className={styles.pendingCatRow}>
                {ingredientCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={styles.pendingCatBtn}
                    style={{ background: 'var(--surface-3)', color: 'var(--primary-dark)' }}
                    onClick={() => assignCategory(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.pendingLinkBtn}
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                >
                  ＋ 新分類
                </button>
                <button type="button" className={styles.pendingLinkBtn} onClick={() => assignCategory(null)}>
                  先跳過
                </button>
              </div>
              {showNewCategoryInput && (
                <div className={styles.newCatRow}>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="新分類名稱"
                    className={styles.newCatInput}
                    style={{ minHeight: 38 }}
                  />
                  {INGREDIENT_CATEGORY_COLORS.map((c) => (
                    <ColorDot
                      key={c.key}
                      color={c}
                      selected={newCategoryColor === c.key}
                      onClick={() => setNewCategoryColor(c.key)}
                    />
                  ))}
                  <Button type="button" size="sm" onClick={handleCreateCategory}>
                    建立並套用
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>標籤</label>
          {tagOptions.length > 0 && (
            <div className={styles.chipWrap}>
              {tagOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={[styles.tagChip, tags.includes(t) ? styles.tagChipActive : ''].filter(Boolean).join(' ')}
                  onClick={() => toggleTag(t)}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
          <div className={styles.addRow}>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="例如:快速、宴客"
              style={{ minHeight: 44 }}
            />
            <button
              type="button"
              className={styles.roundAddBtn}
              onClick={addTag}
              disabled={!tagInput.trim()}
              aria-label="新增標籤"
            >
              <Plus size={18} strokeWidth={2.75} />
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.toggleCard}>
            <div>
              <div className={styles.toggleTitle}>可先做</div>
              <div className={styles.toggleDesc}>前一天做好也不影響風味</div>
            </div>
            <Toggle checked={prepAhead} onChange={setPrepAhead} label="可先做" />
          </div>
        </div>

        <div className={styles.field}>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="例如:阿嬤、某個食譜網站"
            className={styles.sourceInput}
            style={{ minHeight: 46 }}
          />
        </div>

        <div className={styles.field}>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={styles.notesTextarea}
            style={{ minHeight: 88, padding: '14px 18px', font: '400 14px/1.7 var(--font-family)' }}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.toggleCard}>
            <div>
              <div className={styles.toggleTitle}>有食譜</div>
              <div className={styles.toggleDesc}>打開才需要填封面、連結與內容</div>
            </div>
            <Toggle checked={hasRecipe} onChange={setHasRecipe} label="有食譜" />
          </div>
        </div>

        {hasRecipe && (
          <div className={styles.recipeCard}>
            <button
              type="button"
              className={styles.coverUpload}
              onClick={() => coverInputRef.current?.click()}
              disabled={photoBusy}
            >
              {coverPhotoPath ? (
                <>
                  <LocalPhoto path={coverPhotoPath} className={styles.coverPreview} />
                  <span
                    role="button"
                    tabIndex={-1}
                    className={styles.coverRemoveBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteIfSessionOwned(coverPhotoPath);
                      setCoverPhotoPath('');
                    }}
                    aria-label="移除封面照片"
                  >
                    <X size={14} strokeWidth={3} />
                  </span>
                </>
              ) : (
                <>
                  <Camera size={16} strokeWidth={2.5} style={{ marginRight: 6 }} />
                  {photoBusy ? '處理中…' : '＋ 封面照片'}
                </>
              )}
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenFileInput}
              onChange={handleCoverFileChange}
            />

            <Input
              value={recipeSourceUrl}
              onChange={(e) => setRecipeSourceUrl(e.target.value)}
              placeholder="食譜原始連結(選填)"
              className={styles.urlInput}
              style={{ minHeight: 46 }}
            />

            {content.map((block, i) => (
              <div key={i} className={styles.block}>
                <span className={styles.blockIndex}>{i + 1}</span>
                <div className={styles.blockBody}>
                  {block.type === 'text' ? (
                    <Textarea
                      value={block.text || ''}
                      onChange={(e) => updateBlockText(i, e.target.value)}
                      placeholder="這一段的做法"
                      className={styles.blockTextarea}
                      style={{ minHeight: 70 }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={styles.blockImageBox}
                      onClick={() => openBlockFilePicker(i)}
                      disabled={photoBusy}
                    >
                      {block.path ? (
                        <LocalPhoto path={block.path} className={styles.blockImagePreview} />
                      ) : (
                        <>
                          <ImageIcon size={16} strokeWidth={2.5} style={{ marginRight: 6 }} />
                          {photoBusy ? '處理中…' : '點擊選擇圖片'}
                        </>
                      )}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.blockRemoveBtn}
                  onClick={() => removeBlock(i)}
                  aria-label="移除這個區塊"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            ))}
            <input
              ref={blockImageInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenFileInput}
              onChange={handleBlockFileChange}
            />

            <div className={styles.recipeBtnRow}>
              <button type="button" className={styles.recipeDashedBtn} onClick={addTextBlock}>
                ＋ 文字段
              </button>
              <button type="button" className={styles.recipeDashedBtn} onClick={addImageBlock}>
                ＋ 照片
              </button>
            </div>
          </div>
        )}
      </form>

      <ConfirmDialog
        open={showLeaveConfirm}
        title="放棄未儲存的內容?"
        description="這道菜的編輯內容還沒儲存,離開後會遺失,確定要離開嗎?"
        confirmLabel="離開"
        danger
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
      />
    </div>
  );
}

export default DishFormPage;
