// ============================================================================
// src/db.ts (完整覆蓋 — 新增 fridge_items 真實庫存表,取代 ingredients_master.inStock)
// ============================================================================
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

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

export async function updateDish(
  id: string,
  data: Omit<Dish, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const database = await getDB();
  const now = new Date().toISOString();
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
}

export async function deleteDish(id: string): Promise<void> {
  const database = await getDB();
  await database.run('DELETE FROM dishes WHERE id = ?;', [id]);
  await persistToStore();
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

export interface DishExport {
  version: number;
  exportedAt: string;
  dishes: Dish[];
}

export async function exportDishesToJSON(): Promise<string> {
  const dishes = await getAllDishes();
  const payload: DishExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    dishes,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importDishesFromJSON(jsonText: string): Promise<number> {
  const parsed = JSON.parse(jsonText);
  const dishes: Dish[] = Array.isArray(parsed) ? parsed : parsed.dishes;
  if (!Array.isArray(dishes)) {
    throw new Error('檔案格式不正確,請確認是本 App 匯出的 JSON 檔');
  }

  const database = await getDB();
  for (const d of dishes) {
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
        d.recipe?.coverPhotoPath || '',
        d.recipe?.sourceUrl || '',
        JSON.stringify(d.recipe?.content || []),
        JSON.stringify(d.courseTypes || []),
        JSON.stringify(d.tags || []),
        d.createdAt || new Date().toISOString(),
        d.updatedAt || new Date().toISOString(),
      ]
    );
    await syncIngredientsToMaster(d.ingredients || []);
  }
  await persistToStore();
  return dishes.length;
}