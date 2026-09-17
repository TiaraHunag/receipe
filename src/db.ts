// ============================================================================
// src/db.ts (完整覆蓋 — 照片改存本機檔案,資料庫只存路徑;新增/更新/刪除食譜、
// 匯出/匯入都要跟著處理照片檔案的寫入/清理,詳見各函式內的說明)
// ============================================================================
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { savePhotoFile, deletePhotoFile, readPhotoAsDataUrl } from './photoStorage';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;

const CREATE_DISHES_TABLE = `
CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  ingredients TEXT,
  prepAhead INTEGER DEFAULT 0,
  source TEXT,
  notes TEXT,
  hasRecipe INTEGER DEFAULT 0,
  recipeCoverPhotoPath TEXT,
  recipeSourceUrl TEXT,
  recipeContent TEXT,
  courseTypes TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  createdAt TEXT,
  updatedAt TEXT
);
`;

// 舊版本已建立的 dishes 資料表可能缺少後來才加的欄位,
// CREATE TABLE IF NOT EXISTS 不會補齊既有資料表的欄位,所以開機時需檢查並手動補上。
async function ensureDishesSchema(database: SQLiteDBConnection): Promise<void> {
  const res = await database.query('PRAGMA table_info(dishes);');
  const columns = (res.values || []).map((row: any) => row.name as string);
  const requiredColumns: { name: string; ddl: string }[] = [
    { name: 'courseTypes', ddl: "ALTER TABLE dishes ADD COLUMN courseTypes TEXT DEFAULT '[]';" },
    { name: 'tags', ddl: "ALTER TABLE dishes ADD COLUMN tags TEXT DEFAULT '[]';" },
    { name: 'recipeSourceUrl', ddl: "ALTER TABLE dishes ADD COLUMN recipeSourceUrl TEXT DEFAULT '';" },
  ];
  for (const col of requiredColumns) {
    if (!columns.includes(col.name)) {
      await database.execute(col.ddl);
    }
  }
}

const CREATE_INGREDIENT_CATEGORIES_TABLE = `
CREATE TABLE IF NOT EXISTS ingredient_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL
);
`;

const CREATE_INGREDIENTS_MASTER_TABLE = `
CREATE TABLE IF NOT EXISTS ingredients_master (
  name TEXT PRIMARY KEY,
  categoryId TEXT,
  inStock INTEGER DEFAULT 0
);
`;

// 舊版本的 ingredients_master 沒有 inStock 欄位,補上(欄位本身保留,但下面已經不再用它記錄冰箱狀態了,只是舊資料搬移時會讀一次)。
async function ensureIngredientsMasterSchema(database: SQLiteDBConnection): Promise<void> {
  const res = await database.query('PRAGMA table_info(ingredients_master);');
  const columns = (res.values || []).map((row: any) => row.name as string);
  if (!columns.includes('inStock')) {
    await database.execute('ALTER TABLE ingredients_master ADD COLUMN inStock INTEGER DEFAULT 0;');
  }
}

const CREATE_MENUS_TABLE = `
CREATE TABLE IF NOT EXISTS menus (
  date TEXT PRIMARY KEY,
  breakfast TEXT DEFAULT '{}',
  lunch TEXT DEFAULT '{}',
  dinner TEXT DEFAULT '{}',
  updatedAt TEXT
);
`;

// 通用設定表(key-value),目前用於「一週起始日」,之後有其他個人化設定也可以放這裡。
const CREATE_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

// 採買清單裡「跟菜單無關、臨時想到要買」的額外項目。
const CREATE_SHOPPING_EXTRA_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS shopping_extra_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  checked INTEGER DEFAULT 0,
  createdAt TEXT
);
`;

// 冰箱裡「真正現在有」的食材清單(獨立於食譜/分類系統,使用者自己新增/刪除)。
const CREATE_FRIDGE_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS fridge_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  createdAt TEXT
);
`;

const FRIDGE_MIGRATED_SETTING_KEY = 'fridgeMigratedFromInStock';

// 舊版本用 ingredients_master.inStock 記錄「冰箱有沒有」,現在改成獨立的 fridge_items 表。
// 這裡做一次性搬移,把舊資料轉過去,只跑一次(用 settings 表記錄是否已搬移過)。
async function migrateInStockToFridgeItems(database: SQLiteDBConnection): Promise<void> {
  const flagRes = await database.query('SELECT value FROM settings WHERE key = ?;', [FRIDGE_MIGRATED_SETTING_KEY]);
  if (flagRes.values && flagRes.values.length > 0) return;

  const res = await database.query('SELECT name FROM ingredients_master WHERE inStock = 1;');
  const now = new Date().toISOString();
  for (const row of res.values || []) {
    await database.run('INSERT OR IGNORE INTO fridge_items (id, name, createdAt) VALUES (?, ?, ?);', [
      crypto.randomUUID(),
      row.name,
      now,
    ]);
  }
  await database.run(
    `INSERT INTO settings (key, value) VALUES (?, '1')
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [FRIDGE_MIGRATED_SETTING_KEY]
  );
}

export async function initDB(): Promise<SQLiteDBConnection> {
  if (db) return db;

  if (Capacitor.getPlatform() === 'web') {
    await customElements.whenDefined('jeep-sqlite');
    await sqlite.initWebStore();
  }

  db = await sqlite.createConnection('receipe_db', false, 'no-encryption', 1, false);
  await db.open();
  await db.execute(CREATE_DISHES_TABLE);
  await ensureDishesSchema(db);
  await db.execute(CREATE_INGREDIENT_CATEGORIES_TABLE);
  await db.execute(CREATE_INGREDIENTS_MASTER_TABLE);
  await ensureIngredientsMasterSchema(db);
  await db.execute(CREATE_MENUS_TABLE);
  await db.execute(CREATE_SETTINGS_TABLE);
  await db.execute(CREATE_SHOPPING_EXTRA_ITEMS_TABLE);
  await db.execute(CREATE_FRIDGE_ITEMS_TABLE);
  await migrateInStockToFridgeItems(db);

  return db;
}

export async function getDB(): Promise<SQLiteDBConnection> {
  if (!db) {
    return await initDB();
  }
  return db;
}

async function persistToStore(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore('receipe_db');
  }
}

/** 星期標籤,index 對應 JS 的 Date.getDay()(0 = 週日)。菜單規劃/採買清單/個人設定共用。 */
export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export interface Dish {
  id: string;
  name: string;
  category: string[];
  ingredients: string[];
  prepAhead: boolean;
  source: string;
  notes: string;
  hasRecipe: boolean;
  recipe?: {
    coverPhotoPath: string;
    sourceUrl: string;
    content: { type: 'text' | 'image'; text?: string; path?: string }[];
  } | null;
  courseTypes: CourseType[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

function rowToDish(row: any): Dish {
  return {
    id: row.id,
    name: row.name,
    category: row.category ? JSON.parse(row.category) : [],
    ingredients: row.ingredients ? JSON.parse(row.ingredients) : [],
    prepAhead: Boolean(row.prepAhead),
    source: row.source || '',
    notes: row.notes || '',
    hasRecipe: Boolean(row.hasRecipe),
    recipe: row.hasRecipe
      ? {
          coverPhotoPath: row.recipeCoverPhotoPath || '',
          sourceUrl: row.recipeSourceUrl || '',
          content: row.recipeContent ? JSON.parse(row.recipeContent) : [],
        }
      : null,
    courseTypes: row.courseTypes ? JSON.parse(row.courseTypes) : [],
    tags: row.tags ? JSON.parse(row.tags) : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function syncIngredientsToMaster(names: string[]): Promise<void> {
  const database = await getDB();
  for (const n of names) {
    await database.run('INSERT OR IGNORE INTO ingredients_master (name, categoryId, inStock) VALUES (?, NULL, 0);', [n]);
  }
}

export async function getAllDishes(): Promise<Dish[]> {
  const database = await getDB();
  const res = await database.query('SELECT * FROM dishes ORDER BY updatedAt DESC;');
  return (res.values || []).map(rowToDish);
}

export async function getDishById(id: string): Promise<Dish | null> {
  const database = await getDB();
  const res = await database.query('SELECT * FROM dishes WHERE id = ?;', [id]);
  if (!res.values || res.values.length === 0) return null;
  return rowToDish(res.values[0]);
}

export async function insertDish(
  data: Omit<Dish, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const database = await getDB();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await database.run(
    `INSERT INTO dishes
      (id, name, category, ingredients, prepAhead, source, notes, hasRecipe, recipeCoverPhotoPath, recipeSourceUrl, recipeContent, courseTypes, tags, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      data.name,
      JSON.stringify(data.category),
      JSON.stringify(data.ingredients),
      data.prepAhead ? 1 : 0,
      data.source,
      data.notes,
      data.hasRecipe ? 1 : 0,
      data.recipe?.coverPhotoPath || '',
      data.recipe?.sourceUrl || '',
      JSON.stringify(data.recipe?.content || []),
      JSON.stringify(data.courseTypes || []),
      JSON.stringify(data.tags || []),
      now,
      now,
    ]
  );
  await syncIngredientsToMaster(data.ingredients);
  await persistToStore();
  return id;
}

/** 從一筆 dishes 原始 row 取出目前用到的所有照片相對路徑(封面 + 內容區塊)。 */
function extractPhotoPaths(row: { hasRecipe?: unknown; recipeCoverPhotoPath?: string; recipeContent?: string }): Set<string> {
  const paths = new Set<string>();
  if (!row?.hasRecipe) return paths;
  if (row.recipeCoverPhotoPath) paths.add(row.recipeCoverPhotoPath);
  try {
    const content = row.recipeContent ? JSON.parse(row.recipeContent) : [];
    (content as { type?: string; path?: string }[]).forEach((b) => {
      if (b?.type === 'image' && b.path) paths.add(b.path);
    });
  } catch {
    // 內容解析失敗就當作沒有照片,不影響其他清理
  }
  return paths;
}

/** 從送進 insertDish/updateDish 的 payload 取出目前用到的所有照片相對路徑。 */
function extractPayloadPhotoPaths(data: Pick<Dish, 'recipe'>): Set<string> {
  const paths = new Set<string>();
  if (data.recipe?.coverPhotoPath) paths.add(data.recipe.coverPhotoPath);
  data.recipe?.content?.forEach((b) => {
    if (b.type === 'image' && b.path) paths.add(b.path);
  });
  return paths;
}

export async function updateDish(
  id: string,
  data: Omit<Dish, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const database = await getDB();
  const now = new Date().toISOString();

  // 照片現在是本機獨立檔案,更新前先記下舊資料用到哪些路徑,
  // 更新完之後拿新資料實際還在用的路徑比對,不再用到的舊檔案就清掉,
  // 不然編輯時換照片、刪步驟圖都會留下孤兒檔案越積越多。
  const oldRes = await database.query(
    'SELECT hasRecipe, recipeCoverPhotoPath, recipeContent FROM dishes WHERE id = ?;',
    [id]
  );
  const oldPaths = extractPhotoPaths((oldRes.values || [])[0] || {});

  await database.run(
    `UPDATE dishes SET
      name = ?, category = ?, ingredients = ?, prepAhead = ?, source = ?, notes = ?,
      hasRecipe = ?, recipeCoverPhotoPath = ?, recipeSourceUrl = ?, recipeContent = ?, courseTypes = ?, tags = ?, updatedAt = ?
     WHERE id = ?;`,
    [
      data.name,
      JSON.stringify(data.category),
      JSON.stringify(data.ingredients),
      data.prepAhead ? 1 : 0,
      data.source,
      data.notes,
      data.hasRecipe ? 1 : 0,
      data.recipe?.coverPhotoPath || '',
      data.recipe?.sourceUrl || '',
      JSON.stringify(data.recipe?.content || []),
      JSON.stringify(data.courseTypes || []),
      JSON.stringify(data.tags || []),
      now,
      id,
    ]
  );
  await syncIngredientsToMaster(data.ingredients);
  await persistToStore();

  const newPaths = extractPayloadPhotoPaths(data);
  for (const p of oldPaths) {
    if (!newPaths.has(p)) await deletePhotoFile(p);
  }
}

export async function deleteDish(id: string): Promise<void> {
  const database = await getDB();
  const res = await database.query(
    'SELECT hasRecipe, recipeCoverPhotoPath, recipeContent FROM dishes WHERE id = ?;',
    [id]
  );
  const photoPaths = extractPhotoPaths((res.values || [])[0] || {});

  await database.run('DELETE FROM dishes WHERE id = ?;', [id]);
  await persistToStore();

  // 照片是獨立檔案,不會因為刪 SQLite 那筆資料就自動消失,要另外清掉。
  for (const p of photoPaths) {
    await deletePhotoFile(p);
  }
}

export async function getAllCategories(): Promise<string[]> {
  const dishes = await getAllDishes();
  const set = new Set<string>();
  dishes.forEach((d) => d.category.forEach((c) => set.add(c)));
  return Array.from(set).sort();
}

export async function getAllTags(): Promise<string[]> {
  const dishes = await getAllDishes();
  const set = new Set<string>();
  dishes.forEach((d) => (d.tags || []).forEach((t) => set.add(t)));
  return Array.from(set).sort();
}

export async function getAllIngredients(): Promise<string[]> {
  const dishes = await getAllDishes();
  const set = new Set<string>();
  dishes.forEach((d) => d.ingredients.forEach((i) => set.add(i)));
  return Array.from(set).sort();
}

export interface IngredientCategory {
  id: string;
  name: string;
  color: string;
}

export interface IngredientWithCategory {
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  color: string | null;
}

export async function getAllIngredientCategories(): Promise<IngredientCategory[]> {
  const database = await getDB();
  const res = await database.query('SELECT * FROM ingredient_categories ORDER BY name;');
  return (res.values || []) as IngredientCategory[];
}

export async function createIngredientCategory(name: string, color: string): Promise<string> {
  const database = await getDB();
  const id = crypto.randomUUID();
  await database.run('INSERT INTO ingredient_categories (id, name, color) VALUES (?, ?, ?);', [
    id,
    name.trim(),
    color,
  ]);
  await persistToStore();
  return id;
}

export async function deleteIngredientCategory(id: string): Promise<void> {
  const database = await getDB();
  await database.run('UPDATE ingredients_master SET categoryId = NULL WHERE categoryId = ?;', [id]);
  await database.run('DELETE FROM ingredient_categories WHERE id = ?;', [id]);
  await persistToStore();
}

export async function getIngredientCategoryMap(): Promise<Record<string, IngredientWithCategory>> {
  const database = await getDB();
  const res = await database.query(`
    SELECT im.name as name, im.categoryId as categoryId, ic.name as categoryName, ic.color as color
    FROM ingredients_master im
    LEFT JOIN ingredient_categories ic ON im.categoryId = ic.id;
  `);
  const map: Record<string, IngredientWithCategory> = {};
  (res.values || []).forEach((row: any) => {
    map[row.name] = {
      name: row.name,
      categoryId: row.categoryId || null,
      categoryName: row.categoryName || null,
      color: row.color || null,
    };
  });
  return map;
}

export async function setIngredientCategory(
  ingredientName: string,
  categoryId: string | null
): Promise<void> {
  const database = await getDB();
  await database.run(
    `INSERT INTO ingredients_master (name, categoryId, inStock) VALUES (?, ?, 0)
     ON CONFLICT(name) DO UPDATE SET categoryId = excluded.categoryId;`,
    [ingredientName, categoryId]
  );
  await persistToStore();
}

export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type CourseType = 'staple' | 'main' | 'side' | 'vegetable' | 'soup' | 'extra';

export const COURSE_LABELS: Record<CourseType, string> = {
  staple: '主食',
  main: '主菜',
  side: '副菜',
  vegetable: '蔬菜',
  soup: '湯品',
  extra: '附餐',
};

export const COURSE_ORDER: CourseType[] = ['staple', 'main', 'side', 'vegetable', 'soup', 'extra'];

export interface MealCourses {
  staple: string[];
  main: string[];
  side: string[];
  vegetable: string[];
  soup: string[];
  extra: string[];
}

function emptyMealCourses(): MealCourses {
  return { staple: [], main: [], side: [], vegetable: [], soup: [], extra: [] };
}

function parseMealCourses(raw: string | null): MealCourses {
  if (!raw) return emptyMealCourses();
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return { ...emptyMealCourses(), main: parsed };
  }
  return { ...emptyMealCourses(), ...parsed };
}

export interface MenuDay {
  date: string;
  breakfast: MealCourses;
  lunch: MealCourses;
  dinner: MealCourses;
}

function rowToMenuDay(row: any): MenuDay {
  return {
    date: row.date,
    breakfast: parseMealCourses(row.breakfast),
    lunch: parseMealCourses(row.lunch),
    dinner: parseMealCourses(row.dinner),
  };
}

export async function getMenusInRange(startDate: string, endDate: string): Promise<Record<string, MenuDay>> {
  const database = await getDB();
  const res = await database.query(
    'SELECT * FROM menus WHERE date >= ? AND date <= ?;',
    [startDate, endDate]
  );
  const map: Record<string, MenuDay> = {};
  (res.values || []).forEach((row: any) => {
    map[row.date] = rowToMenuDay(row);
  });
  return map;
}

async function getOrCreateMenuDay(date: string): Promise<MenuDay> {
  const database = await getDB();
  const res = await database.query('SELECT * FROM menus WHERE date = ?;', [date]);
  if (res.values && res.values.length > 0) {
    return rowToMenuDay(res.values[0]);
  }
  return { date, breakfast: emptyMealCourses(), lunch: emptyMealCourses(), dinner: emptyMealCourses() };
}

async function saveMenuDay(day: MenuDay): Promise<void> {
  const database = await getDB();
  const now = new Date().toISOString();
  await database.run(
    `INSERT INTO menus (date, breakfast, lunch, dinner, updatedAt) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET breakfast = excluded.breakfast, lunch = excluded.lunch, dinner = excluded.dinner, updatedAt = excluded.updatedAt;`,
    [day.date, JSON.stringify(day.breakfast), JSON.stringify(day.lunch), JSON.stringify(day.dinner), now]
  );
  await persistToStore();
}

export async function addDishToMeal(
  date: string,
  meal: MealType,
  course: CourseType,
  dishId: string
): Promise<void> {
  const day = await getOrCreateMenuDay(date);
  day[meal][course] = [...day[meal][course], dishId];
  await saveMenuDay(day);
}

export async function removeDishFromMeal(
  date: string,
  meal: MealType,
  course: CourseType,
  dishId: string
): Promise<void> {
  const day = await getOrCreateMenuDay(date);
  day[meal][course] = day[meal][course].filter((d) => d !== dishId);
  await saveMenuDay(day);
}

// ---------------------------------------------------------------------------
// 個人設定(settings 表,key-value)
// ---------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDB();
  const res = await database.query('SELECT value FROM settings WHERE key = ?;', [key]);
  if (!res.values || res.values.length === 0) return null;
  return res.values[0].value as string;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDB();
  await database.run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, value]
  );
  await persistToStore();
}

const WEEK_START_DAY_KEY = 'weekStartDay';

/** 一週起始日,0-6 對應 Date.getDay()(0 = 週日)。預設週日,可在「個人」頁修改。 */
export async function getWeekStartDay(): Promise<number> {
  const raw = await getSetting(WEEK_START_DAY_KEY);
  const n = raw !== null ? parseInt(raw, 10) : 0;
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : 0;
}

export async function setWeekStartDay(day: number): Promise<void> {
  await setSetting(WEEK_START_DAY_KEY, String(day));
}

// ---------------------------------------------------------------------------
// 冰箱庫存(真正的「現在有什麼」,跟食材分類、食譜完全獨立)
// ---------------------------------------------------------------------------

export interface FridgeItem {
  id: string;
  name: string;
  createdAt: string;
}

/** 冰箱管理頁顯示用:目前真正在冰箱裡的食材清單(使用者自己新增/刪除,不是從食譜推算)。 */
export async function getFridgeItems(): Promise<FridgeItem[]> {
  const database = await getDB();
  const res = await database.query('SELECT * FROM fridge_items ORDER BY name;');
  return (res.values || []) as FridgeItem[];
}

export async function addFridgeItem(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const database = await getDB();
  await database.run('INSERT OR IGNORE INTO fridge_items (id, name, createdAt) VALUES (?, ?, ?);', [
    crypto.randomUUID(),
    trimmed,
    new Date().toISOString(),
  ]);
  await persistToStore();
}

/** 用完了就從冰箱庫存移除;採買清單勾選「冰箱有」取消時也是呼叫這個。 */
export async function removeFridgeItem(name: string): Promise<void> {
  const database = await getDB();
  await database.run('DELETE FROM fridge_items WHERE name = ?;', [name]);
  await persistToStore();
}

// ---------------------------------------------------------------------------
// 採買清單
// ---------------------------------------------------------------------------

export interface ShoppingListItem {
  name: string;
  /** 這項食材被這週菜單裡的哪些菜色用到 */
  dishNames: string[];
  categoryId: string | null;
  categoryName: string | null;
  color: string | null;
  /** 冰箱內目前有沒有(來自 fridge_items) */
  inStock: boolean;
}

/**
 * 依日期區間(通常是一週)彙整菜單規劃裡用到的所有食材,
 * 附上分類顏色與冰箱庫存狀態,供採買清單頁使用。
 * 因為食材不記數量,這裡只做「有沒有用到 / 冰箱有沒有」的清單式彙整,不做採購量計算。
 */
export async function getShoppingListForRange(
  startDate: string,
  endDate: string
): Promise<ShoppingListItem[]> {
  const menus = await getMenusInRange(startDate, endDate);
  const dishIdSet = new Set<string>();
  Object.values(menus).forEach((day) => {
    (['breakfast', 'lunch', 'dinner'] as MealType[]).forEach((meal) => {
      COURSE_ORDER.forEach((course) => {
        (day[meal][course] || []).forEach((id) => dishIdSet.add(id));
      });
    });
  });

  if (dishIdSet.size === 0) return [];

  const database = await getDB();
  const ids = Array.from(dishIdSet);
  const placeholders = ids.map(() => '?').join(',');
  const res = await database.query(
    `SELECT id, name, ingredients FROM dishes WHERE id IN (${placeholders});`,
    ids
  );

  const ingredientToDishNames = new Map<string, Set<string>>();
  (res.values || []).forEach((row: any) => {
    const dishName = row.name as string;
    const ingredients: string[] = row.ingredients ? JSON.parse(row.ingredients) : [];
    ingredients.forEach((ing) => {
      if (!ingredientToDishNames.has(ing)) ingredientToDishNames.set(ing, new Set());
      ingredientToDishNames.get(ing)!.add(dishName);
    });
  });

  const categoryMap = await getIngredientCategoryMap();
  const fridgeItems = await getFridgeItems();
  const fridgeNames = new Set(fridgeItems.map((f) => f.name));

  const items: ShoppingListItem[] = Array.from(ingredientToDishNames.entries()).map(
    ([name, dishNamesSet]) => {
      const info = categoryMap[name];
      return {
        name,
        dishNames: Array.from(dishNamesSet).sort(),
        categoryId: info?.categoryId || null,
        categoryName: info?.categoryName || null,
        color: info?.color || null,
        inStock: fridgeNames.has(name),
      };
    }
  );

  items.sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? 1 : -1;
    return a.name.localeCompare(b.name, 'zh-Hant');
  });

  return items;
}

export interface ShoppingExtraItem {
  id: string;
  name: string;
  /** 是否已買(勾選後仍保留在清單,方便之後一次清除) */
  checked: boolean;
  createdAt: string;
}

/** 跟菜單無關、臨時想到要買的項目,例如衛生紙、調味料補貨等。 */
export async function getShoppingExtraItems(): Promise<ShoppingExtraItem[]> {
  const database = await getDB();
  const res = await database.query('SELECT * FROM shopping_extra_items ORDER BY createdAt ASC;');
  return (res.values || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    checked: Boolean(row.checked),
    createdAt: row.createdAt,
  }));
}

export async function addShoppingExtraItem(name: string): Promise<string> {
  const database = await getDB();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await database.run(
    'INSERT INTO shopping_extra_items (id, name, checked, createdAt) VALUES (?, ?, 0, ?);',
    [id, name.trim(), now]
  );
  await persistToStore();
  return id;
}

export async function toggleShoppingExtraItem(id: string, checked: boolean): Promise<void> {
  const database = await getDB();
  await database.run('UPDATE shopping_extra_items SET checked = ? WHERE id = ?;', [
    checked ? 1 : 0,
    id,
  ]);
  await persistToStore();
}

export async function renameShoppingExtraItem(id: string, name: string): Promise<void> {
  const database = await getDB();
  await database.run('UPDATE shopping_extra_items SET name = ? WHERE id = ?;', [name.trim(), id]);
  await persistToStore();
}

export async function deleteShoppingExtraItem(id: string): Promise<void> {
  const database = await getDB();
  await database.run('DELETE FROM shopping_extra_items WHERE id = ?;', [id]);
  await persistToStore();
}

export async function clearCheckedShoppingExtraItems(): Promise<void> {
  const database = await getDB();
  await database.run('DELETE FROM shopping_extra_items WHERE checked = 1;');
  await persistToStore();
}

// ---------------------------------------------------------------------------
// 備份匯出/匯入
// 涵蓋全部使用者資料:食譜(dishes)、菜單規劃(menus)、食材分類(ingredient_categories)、
// 食材分類指派(ingredients_master.categoryId)、冰箱庫存(fridge_items)、
// 其他採買項目(shopping_extra_items)、個人設定(settings,如一週起始日)。
// version 1 是舊格式(只有 dishes),version 2 起涵蓋全部資料表;
// 匯入時兩種格式都要能讀,新格式裡任一區塊缺漏也不影響其他區塊正常匯入。
// ---------------------------------------------------------------------------

interface RawMenuRow {
  date: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  updatedAt: string;
}

interface IngredientAssignmentRow {
  name: string;
  categoryId: string | null;
}

interface SettingRow {
  key: string;
  value: string;
}

export interface AllDataExport {
  version: number;
  exportedAt: string;
  dishes: Dish[];
  menus: RawMenuRow[];
  ingredientCategories: IngredientCategory[];
  ingredientAssignments: IngredientAssignmentRow[];
  fridgeItems: FridgeItem[];
  shoppingExtraItems: ShoppingExtraItem[];
  settings: SettingRow[];
}

export interface ImportSummary {
  dishes: number;
  menus: number;
  categories: number;
  fridgeItems: number;
  shoppingExtraItems: number;
}

/** 匯出用:把一筆 dish 的封面/步驟圖路徑換成內嵌的 base64 data URL,
 *  這樣 JSON 備份檔本身就是完整的,換裝置用 JSON 還原時照片也在。
 *  只影響匯出時產生的這份「複本」,不會動到資料庫裡實際存的路徑。 */
async function embedPhotosForExport(dish: Dish): Promise<Dish> {
  if (!dish.hasRecipe || !dish.recipe) return dish;
  const coverPhotoPath = dish.recipe.coverPhotoPath
    ? (await readPhotoAsDataUrl(dish.recipe.coverPhotoPath)) || dish.recipe.coverPhotoPath
    : dish.recipe.coverPhotoPath;
  const content = await Promise.all(
    dish.recipe.content.map(async (block) => {
      if (block.type !== 'image' || !block.path) return block;
      const embedded = await readPhotoAsDataUrl(block.path);
      return embedded ? { ...block, path: embedded } : block;
    })
  );
  return { ...dish, recipe: { ...dish.recipe, coverPhotoPath, content } };
}

export async function exportAllDataToJSON(): Promise<string> {
  const database = await getDB();
  const rawDishes = await getAllDishes();
  const dishes = await Promise.all(rawDishes.map(embedPhotosForExport));
  const menusRes = await database.query('SELECT date, breakfast, lunch, dinner, updatedAt FROM menus;');
  const categoriesRes = await database.query('SELECT id, name, color FROM ingredient_categories;');
  const assignmentsRes = await database.query(
    'SELECT name, categoryId FROM ingredients_master WHERE categoryId IS NOT NULL;'
  );
  const fridgeItems = await getFridgeItems();
  const shoppingExtraItems = await getShoppingExtraItems();
  const settingsRes = await database.query('SELECT key, value FROM settings;');

  const payload: AllDataExport = {
    version: 2,
    exportedAt: new Date().toISOString(),
    dishes,
    menus: (menusRes.values || []) as RawMenuRow[],
    ingredientCategories: (categoriesRes.values || []) as IngredientCategory[],
    ingredientAssignments: (assignmentsRes.values || []) as IngredientAssignmentRow[],
    fridgeItems,
    shoppingExtraItems,
    settings: (settingsRes.values || []) as SettingRow[],
  };
  return JSON.stringify(payload, null, 2);
}

/** 匯入用:把內嵌的 base64(data: 開頭)寫成本機新檔案,回傳新路徑;
 *  已經是路徑格式(沒有 data: 前綴)就直接沿用,不重新寫檔。
 *  寫檔失敗就當作沒有照片,不中斷整筆資料的匯入。 */
async function resolvePhotoForImport(value: string | undefined): Promise<string> {
  if (!value) return '';
  if (!value.startsWith('data:')) return value;
  const base64 = value.split(',')[1] || '';
  if (!base64) return '';
  try {
    return await savePhotoFile(base64);
  } catch {
    return '';
  }
}

export async function importAllDataFromJSON(jsonText: string): Promise<ImportSummary> {
  const parsed = JSON.parse(jsonText);
  const dishes: Dish[] = Array.isArray(parsed) ? parsed : parsed.dishes;
  if (!Array.isArray(dishes)) {
    throw new Error('檔案格式不正確,請確認是本 App 匯出的 JSON 檔');
  }

  const database = await getDB();
  const summary: ImportSummary = { dishes: 0, menus: 0, categories: 0, fridgeItems: 0, shoppingExtraItems: 0 };

  // 1) 食材分類要先匯入,dishes/assignments 的 categoryId 才有對應的分類可以參照
  const categories: IngredientCategory[] = Array.isArray(parsed?.ingredientCategories)
    ? parsed.ingredientCategories
    : [];
  for (const c of categories) {
    if (!c?.id || !c?.name) continue;
    await database.run(
      `INSERT INTO ingredient_categories (id, name, color) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color;`,
      [c.id, c.name, c.color]
    );
    summary.categories++;
  }

  // 2) 食譜。照片欄位如果是內嵌的 base64(data: 開頭,匯出時嵌進去的,或舊版
  //    架構直接把 dataURL 存進資料庫時代留下的)就寫成本機新檔案,換回路徑;
  //    已經是路徑格式就直接沿用。同一個 id 如果原本就有資料(覆蓋匯入),
  //    完成後把舊資料用到、新資料沒再用到的照片檔案清掉,避免孤兒檔案越積越多。
  for (const d of dishes) {
    const oldRes = await database.query(
      'SELECT hasRecipe, recipeCoverPhotoPath, recipeContent FROM dishes WHERE id = ?;',
      [d.id]
    );
    const oldPaths = extractPhotoPaths((oldRes.values || [])[0] || {});

    const coverPhotoPath = await resolvePhotoForImport(d.recipe?.coverPhotoPath);
    const content = d.recipe?.content
      ? await Promise.all(
          d.recipe.content.map(async (block) =>
            block.type === 'image' ? { ...block, path: await resolvePhotoForImport(block.path) } : block
          )
        )
      : [];

    await database.run(
      `INSERT OR REPLACE INTO dishes
        (id, name, category, ingredients, prepAhead, source, notes, hasRecipe, recipeCoverPhotoPath, recipeSourceUrl, recipeContent, courseTypes, tags, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        d.id,
        d.name,
        JSON.stringify(d.category || []),
        JSON.stringify(d.ingredients || []),
        d.prepAhead ? 1 : 0,
        d.source || '',
        d.notes || '',
        d.hasRecipe ? 1 : 0,
        coverPhotoPath,
        d.recipe?.sourceUrl || '',
        JSON.stringify(content),
        JSON.stringify(d.courseTypes || []),
        JSON.stringify(d.tags || []),
        d.createdAt || new Date().toISOString(),
        d.updatedAt || new Date().toISOString(),
      ]
    );
    await syncIngredientsToMaster(d.ingredients || []);

    const newPaths = new Set<string>();
    if (coverPhotoPath) newPaths.add(coverPhotoPath);
    content.forEach((b) => {
      if (b.type === 'image' && b.path) newPaths.add(b.path);
    });
    for (const p of oldPaths) {
      if (!newPaths.has(p)) await deletePhotoFile(p);
    }

    summary.dishes++;
  }

  // 3) 食材分類指派(要排在 dishes 之後:上一步 syncIngredientsToMaster 只會在食材名稱
  //    不存在時補一筆 categoryId=NULL 的資料,不會蓋掉這裡才要寫入的真正分類指派)
  const assignments: IngredientAssignmentRow[] = Array.isArray(parsed?.ingredientAssignments)
    ? parsed.ingredientAssignments
    : [];
  for (const a of assignments) {
    if (!a?.name) continue;
    await database.run(
      `INSERT INTO ingredients_master (name, categoryId, inStock) VALUES (?, ?, 0)
       ON CONFLICT(name) DO UPDATE SET categoryId = excluded.categoryId;`,
      [a.name, a.categoryId ?? null]
    );
  }

  // 4) 菜單規劃
  const menus: RawMenuRow[] = Array.isArray(parsed?.menus) ? parsed.menus : [];
  for (const m of menus) {
    if (!m?.date) continue;
    await database.run(
      `INSERT INTO menus (date, breakfast, lunch, dinner, updatedAt) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET breakfast = excluded.breakfast, lunch = excluded.lunch, dinner = excluded.dinner, updatedAt = excluded.updatedAt;`,
      [m.date, m.breakfast ?? '{}', m.lunch ?? '{}', m.dinner ?? '{}', m.updatedAt || new Date().toISOString()]
    );
    summary.menus++;
  }

  // 5) 冰箱庫存
  const fridgeItems: FridgeItem[] = Array.isArray(parsed?.fridgeItems) ? parsed.fridgeItems : [];
  for (const f of fridgeItems) {
    if (!f?.name) continue;
    await database.run('INSERT OR IGNORE INTO fridge_items (id, name, createdAt) VALUES (?, ?, ?);', [
      f.id || crypto.randomUUID(),
      f.name,
      f.createdAt || new Date().toISOString(),
    ]);
    summary.fridgeItems++;
  }

  // 6) 其他採買項目
  const extras: ShoppingExtraItem[] = Array.isArray(parsed?.shoppingExtraItems) ? parsed.shoppingExtraItems : [];
  for (const s of extras) {
    if (!s?.id || !s?.name) continue;
    await database.run(
      `INSERT INTO shopping_extra_items (id, name, checked, createdAt) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, checked = excluded.checked;`,
      [s.id, s.name, s.checked ? 1 : 0, s.createdAt || new Date().toISOString()]
    );
    summary.shoppingExtraItems++;
  }

  // 7) 個人設定(例如一週起始日)
  const settings: SettingRow[] = Array.isArray(parsed?.settings) ? parsed.settings : [];
  for (const s of settings) {
    if (!s?.key) continue;
    await database.run(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [s.key, s.value]
    );
  }

  await persistToStore();
  return summary;
}