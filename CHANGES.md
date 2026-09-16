# UI 改版 Step3 — 畫面7「採買清單」

## 修改
- src/pages/ShoppingListPage.tsx（README 畫面7整個重寫）
- src/components/Checkbox/Checkbox.tsx（加 shape="circle"／hideLabel 兩個 prop）
- src/components/Checkbox/Checkbox.module.css（圓形勾選圈樣式）

## 新增
- src/pages/ShoppingListPage.module.css

## 這頁做的取捨

- **不再分「需採買」/「冰箱已有」兩張卡片**，改成 README 要的單一清單，
  依食材分類分段(用你在「食材分類」設定的分類與順序)，冰箱已有的項目排到
  每段最後、加刪除線,不是搬到另一張卡片。
- **額外項目的改名**：原本是彈出 Modal 對話框改名，README 要的是「該列直接
  變成輸入框 + 完成按鈕」，這次照這樣改了，拿掉了原本的 Modal。也拿掉了
  SwipeableRow 左滑手勢——README 明確要求編輯/刪除要有「看得到的按鈕」
  （已經做了：鉛筆／垃圾桶兩顆 40×44 的按鈕），滑動手勢變成多餘的，
  怕跟「點下去變成輸入框」這個新互動衝突就先不留著；如果你很習慣左滑
  刪除,跟我說一聲我可以評估要不要兩個都留。
- **拿掉右下角浮動 FAB**，改成 README 要的「底部常駐輸入列」(在分頁列
  上方,固定式,input + 圓形 ＋ 鈕)。空白按 ＋ 會跳 Toast 提示,不再靜默失敗。
- **勾選/取消勾選、刪除額外項目都各補了一則 Toast**（README 的 Interactions
  段落列了好幾個 toast 文案範例，這頁之前完全沒有任何 toast 提示）。
- 拿掉了頁尾那句「食材不記數量…」的說明文字——README 的採買清單畫面規格
  裡沒有這行，如果你想留著提醒使用者，跟我說我再加回去（可以用小字放在
  「其他要買的」段落下面）。
- 「冰箱」按鈕 → `/ingredients`；README 說這個入口未來要整合進「冰箱與食材」
  畫面（下一步 Step8 才會做），現在先連到既有的 `IngredientManagementPage`，
  等 Step8 做完那頁換了新樣子之後這個連結行為不變、畫面會自動更新。

一樣照最新的 commit 重新拉一次驗證過，`npx tsc --noEmit`、`npx vite build`
都過關，沒有動到 MenuPage/MenuDayPage/DishListPage 等其他已經做過的頁面，
也沒有動到你自己在做的 ProfilePage/IngredientManagementPage。
