# UI 改版 Step3 — 畫面8「冰箱與食材」+ 畫面9「我的」（最後兩個畫面）

## 新增
- src/ingredientCategoryColors.ts —— README 新的六色食材分類色盤
  （肉類/海鮮/蔬菜/豆製品/調味料/乾貨）+ 顏色解析工具函式
- src/pages/IngredientManagementPage.module.css
- src/pages/ProfilePage.module.css

## 修改
- src/pages/IngredientManagementPage.tsx（README 畫面8：分頁切換成「冰箱有什麼」
  ／「食材分類」兩個分頁，食材分類管理從個人頁搬回這裡）
- src/pages/ProfilePage.tsx（README 畫面9：拿掉食材分類管理，一週起始日
  改成 7 個等寬按鈕，資料備份改成滿寬列表按鈕）
- src/components/ColorDot/ColorDot.tsx（拿掉對舊版九色 ColorOption 型別的
  綁定，改成一個通用的 {key,label,bg} 形狀，新增 size prop）
- src/pages/DishFormPage.tsx（新增食材分類時的顏色選擇，改用新的六色盤
  取代舊的九色盤）
- src/pages/DishDetailPage.tsx／src/pages/ShoppingListPage.tsx
  （分類色點改呼叫 ingredientCategoryColors.ts 的共用函式，取代我前幾次
  各自寫的暫時性替代邏輯）

## 最重要的一個變化：食材分類顏色系統換成新的六色盤

之前「新增食材分類」用的是舊版 9 色標籤盤（存的是 'green'／'brown' 這種
key 字串）。這次照 README 換成新的六色盤（肉類/海鮮/蔬菜/豆製品/調味料/
乾貨），**新建立的分類會直接把 hex 值存進 `ingredient_categories.color`**，
不再存 key 字串。

**舊資料完全相容，不需要手動搬移**：如果分類是很久以前用舊 9 色盤建的，
`color` 欄位還是存著舊的 key 字串，畫面上的圓點顏色會透過
`resolveIngredientCategoryColor()` 自動用舊色盤的顏色顯示，不會壞掉、
也不會消失——只是新舊分類的顏色風格可能不太一致（新的是六色盤裡的顏色，
舊的還是舊9色盤的顏色）。如果你想讓舊分類也換成新色盤,最簡單的做法是
到「冰箱與食材」→「食材分類」把舊分類刪掉重建(食材會變成未分類,再重新
用建議 chip 快速加回去)，或者跟我說,我可以寫一個小工具幫你把舊分類的
顏色一次性轉成新色盤裡最接近的顏色。

## 其他取捨

- 冰箱新增食材的輸入框改用跟其他頁面一致的自動完成建議(共用 Input 元件)，
  原本試過瀏覽器原生 `<input list>`，體驗比較弱就換掉了。
- 「常備品」這次還是完全沒做，等你之後確認 schema 再一起加。

已經照最新的 commit 重新拉一次確認過，`npx tsc --noEmit`、`npx vite build`
都過關，沒有動到你自己在做的 MenuPage/MenuDayPage 等其他頁面。

---

**這是 README 九個畫面的最後一批**，Step1～Step3 全部畫面都做完了。
