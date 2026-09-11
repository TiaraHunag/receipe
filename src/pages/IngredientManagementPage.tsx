// ============================================================================
// src/pages/IngredientManagementPage.tsx (完整覆蓋 — 只保留冰箱庫存)
// ============================================================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getIngredientCategoryMap,
  getAllIngredients,
  getFridgeItems,
  addFridgeItem,
  removeFridgeItem,
  IngredientWithCategory,
  FridgeItem,
} from '../db';
import { getColor } from '../components';
import { Card, Input, Button, IconButton, EmptyState, Spinner, useToast } from '../components';

function IngredientManagementPage() {
  const [ingredientMap, setIngredientMap] = useState<Record<string, IngredientWithCategory>>({});
  const [recipeIngredientNames, setRecipeIngredientNames] = useState<string[]>([]);
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFridgeItemName, setNewFridgeItemName] = useState('');
  const [addingFridgeItem, setAddingFridgeItem] = useState(false);
  const { showToast } = useToast();

  const load = async () => {
    const [map, names, fridge] = await Promise.all([
      getIngredientCategoryMap(),
      getAllIngredients(),
      getFridgeItems(),
    ]);
    setIngredientMap(map);
    setRecipeIngredientNames(names);
    setFridgeItems(fridge);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAddFridgeItem = async () => {
    const trimmed = newFridgeItemName.trim();
    if (!trimmed) return;
    setAddingFridgeItem(true);
    try {
      await addFridgeItem(trimmed);
      setNewFridgeItemName('');
      const fridge = await getFridgeItems();
      setFridgeItems(fridge);
    } catch (err) {
      showToast('新增失敗:' + String(err), 'error');
    } finally {
      setAddingFridgeItem(false);
    }
  };

  const handleRemoveFridgeItem = async (name: string) => {
    setFridgeItems((prev) => prev.filter((it) => it.name !== name));
    try {
      await removeFridgeItem(name);
    } catch (err) {
      showToast('移除失敗:' + String(err), 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 700, margin: '0 auto', paddingBottom: 96 }}>
      <Link to="/" style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>← 返回菜色列表</Link>

      <h2 style={{ font: 'var(--font-subtitle)', color: 'var(--color-text)', margin: '0 0 var(--space-1)' }}>
        🧊 冰箱庫存({fridgeItems.length})
      </h2>
      <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
        這裡列出的是冰箱裡真正現在有的東西,不是食譜曾經用過的所有食材。買了就加進來,用完了就移除;採買清單勾選「冰箱有」時也會自動加進這裡。
      </p>
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input
              value={newFridgeItemName}
              onChange={(e) => setNewFridgeItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFridgeItem())}
              placeholder="例如:雞蛋、青江菜"
              suggestions={recipeIngredientNames}
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleAddFridgeItem}
            loading={addingFridgeItem}
            disabled={!newFridgeItemName.trim()}
          >
            新增
          </Button>
        </div>

        {fridgeItems.length === 0 ? (
          <EmptyState icon="🧊" title="冰箱目前是空的" description="新增一項,或去採買清單勾選「冰箱有」也會自動加進來。" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {fridgeItems.map((item) => {
              const info = ingredientMap[item.name];
              const color = getColor(info?.color);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-2) 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <span
                    style={{
                      background: color.bg,
                      color: color.text,
                      padding: '2px var(--space-2)',
                      borderRadius: 'var(--radius-control)',
                      font: 'var(--font-caption)',
                    }}
                  >
                    {item.name}
                  </span>
                  <IconButton
                    icon="×"
                    label="用完了,從冰箱移除"
                    danger
                    onClick={() => handleRemoveFridgeItem(item.name)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-placeholder)', textAlign: 'center', marginTop: 'var(--space-4)' }}>
        食材分類(顏色標籤)設定已搬到「個人」頁。
      </p>
    </div>
  );
}

export default IngredientManagementPage;