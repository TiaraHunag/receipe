# UI 改版 Step3 — 畫面4「菜單週總覽」+ 畫面5「單日菜單」

這次只有 4 個檔案，都在 src/pages/ 底下，直接照路徑覆蓋/新增進去就好。
（tokens.css、BottomTabBar、Chip、AddToMenu、Toggle、package.json 那些
上次的 upload 已經在 repo 裡了，這次沒有再重複附。）

## 修改
- src/pages/MenuPage.tsx（README 畫面4：週總覽改成七列日期卡，
  一週起始日用你設定的 getWeekStartDay，載入中改用 Skeleton）
- src/pages/MenuDayPage.tsx（README 畫面5：早/午/晚三段切換 + 六個
  固定順序的餐點類型區塊，每區塊右上角＋鈕會打開「快速加菜」sheet）

## 新增
- src/pages/MenuPage.module.css
- src/pages/MenuDayPage.module.css

## 取捨/跟舊版行為不同的地方

- **MenuDayPage 拿掉了「點菜色列可以直接編輯」跟左滑刪除**：README 這頁的
  設計是每列右邊固定一顆 ×（移除），沒有點列進編輯的互動。要編輯菜色本身，
  現在要從「食譜」分頁點進那道菜的詳情頁再編輯。如果你覺得這個捷徑很常用、
  想留著，跟我說一聲，我可以在 × 旁邊多加一顆編輯用的小按鈕。
- **MenuDayPage 拿掉了「找不到想要的菜?直接新增」這個內建的建立新菜流程**：
  這個需求現在由「快速加菜」sheet 自己的「＋建立新菜色並排入」處理（沒有結果
  時會出現），邏輯統一成一套,不用兩個地方各寫一次。
- **MenuPage 週總覽不再限制只顯示主食/主菜/副菜三類**：README 是「該餐所有
  餐點類型的菜名串起來」，所以現在會顯示這一餐所有六種類型的菜(用「・」串接)，
  沒有省略。如果哪天塞太多菜名撐爆那一格，可以再回來加省略邏輯。
- **兩頁的「移除」都是點了立刻生效，沒有確認對話框**——這是照 README「原型裡的
  移除是即時的,不需確認」寫的，跟菜色本身的刪除(有 ConfirmDialog)不一樣。

已經照你最新的 `40c43e0` commit 重新拉一次確認過，`npx tsc --noEmit`、
`npx vite build` 都過關，而且沒有動到 ColorDot/Skeleton/DishListPage 等其他檔案。

## 別忘了
`src/components/BottomTabBar.tsx` 這個舊檔案上次提過，目前 GitHub 上還在，
記得找時間手動刪掉（跟這次的東西沒關係，只是再提醒一次）。
