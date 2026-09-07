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
  recipeContent TEXT,
  createdAt TEXT,
  updatedAt TEXT
);
`;

export async function initDB(): Promise<SQLiteDBConnection> {
  if (db) return db;

  if (Capacitor.getPlatform() === 'web') {
    await customElements.whenDefined('jeep-sqlite');
    await sqlite.initWebStore();
  }

  db = await sqlite.createConnection('receipe_db', false, 'no-encryption', 1, false);
  await db.open();
  await db.execute(CREATE_DISHES_TABLE);

  return db;
}

export async function getDB(): Promise<SQLiteDBConnection> {
  if (!db) {
    return await initDB();
  }
  return db;
}

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
    content: { type: 'text' | 'image'; text?: string; path?: string }[];
  } | null;
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
          content: row.recipeContent ? JSON.parse(row.recipeContent) : [],
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
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
      (id, name, category, ingredients, prepAhead, source, notes, hasRecipe, recipeCoverPhotoPath, recipeContent, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
      JSON.stringify(data.recipe?.content || []),
      now,
      now,
    ]
  );
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
      hasRecipe = ?, recipeCoverPhotoPath = ?, recipeContent = ?, updatedAt = ?
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
      JSON.stringify(data.recipe?.content || []),
      now,
      id,
    ]
  );
}

export async function deleteDish(id: string): Promise<void> {
  const database = await getDB();
  await database.run('DELETE FROM dishes WHERE id = ?;', [id]);
}