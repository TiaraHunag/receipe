# UI 改版 Step1 + Step2 + Step3(畫面1/2/3) — 最終版

這份是根據你 GitHub 上最新 commit（`069e28b`，含 ColorDot/Skeleton）重新做的完整版本，
取代之前那份 zip。一樣是「疊加」用：把裡面的檔案照原本的資料夾結構複製進
`TiaraHunag/receipe` repo 根目錄覆蓋即可。

## 完全沒有動到的檔案(確認過，你自己在做的東西不受影響)
- src/pages/MenuPage.tsx
- src/pages/MenuDayPage.tsx
- src/pages/ShoppingListPage.tsx
- src/pages/ProfilePage.tsx
- src/pages/IngredientManagementPage.tsx
- src/pages/QuickAddPage.tsx
- src/components/ColorDot/*、src/components/Skeleton/*（沿用你已經寫好的版本，
  只是把 ColorDot 補進 index.ts 的匯出清單——它原本就存在，但沒被匯出，
  現在食譜表單頁 DishFormPage 也實際用到它了）

## 需要手動刪除的舊檔案
- `src/components/BottomTabBar.tsx`
  （已經搬成資料夾 `src/components/BottomTabBar/`，這個單一舊檔案要手動刪掉）

## 新增檔案
- src/components/AddToMenu/AddToMenuContext.tsx
- src/components/AddToMenu/AddToMenuSheet.tsx
- src/components/AddToMenu/AddToMenuSheet.module.css
- src/components/BottomTabBar/BottomTabBar.tsx
- src/components/BottomTabBar/BottomTabBar.module.css
- src/components/BottomTabBar/index.ts
- src/components/Chip/Chip.tsx
- src/components/Chip/Chip.module.css
- src/components/Toggle/Toggle.tsx
- src/components/Toggle/Toggle.module.css
- src/pages/DishListPage.module.css
- src/pages/DishDetailPage.module.css
- src/pages/DishFormPage.module.css

## 修改檔案
- package.json / package-lock.json（新增 lucide-react，覆蓋完記得 `npm install`）
- src/App.tsx（包 AddToMenuProvider）
- src/index.css
- src/components/index.ts（補上 Chip / AddToMenuContext / ColorDot / Toggle 的匯出，
  ColorDot 那行是修正——它原本就存在卻沒被匯出）
- src/components/tokens.css（全面覆蓋，鼠尾草色票 + 新圓角/字級 token）
- src/components/Button/Button.module.css
- src/components/EmptyState/EmptyState.module.css
- src/components/Input/Input.module.css
- src/components/Modal/Modal.module.css
- src/components/SegmentedControl/SegmentedControl.module.css
- src/components/Select/Select.module.css
- src/components/Textarea/Textarea.module.css
- src/components/Toast/Toast.module.css
- src/components/Toast/ToastProvider.tsx
- src/pages/DishListPage.tsx（README 畫面 1，載入中改用你的 Skeleton 元件而不是轉圈圈）
- src/pages/DishDetailPage.tsx（README 畫面 2）
- src/pages/DishFormPage.tsx（README 畫面 3，「新增食材分類」的顏色選擇改用 ColorDot 元件）

## 這次跟 README 的取捨/待確認

**DishDetailPage(畫面2)**
- 食材狀態目前只有「冰箱有」跟「要買」兩種，沒有「常備」——常備品 schema 你先前說要跳過，
  之後補上再一起加。
- 分類色圓點暫時借用舊版 9 色標籤盤裡「文字色」那個較深的顏色，等「冰箱與食材」畫面
  換成 README 的六色盤後這裡可以直接改用真正的 hex 值，會更準。

**DishFormPage(畫面3)**
- 封面照片／食譜內文圖片：沒有裝 Capacitor Camera 套件，改用瀏覽器/WKWebView 內建的
  `<input type="file">` 選圖，讀成 base64 存進 `coverPhotoPath`/`content[].path`。
  可以選相簿裡的照片、也能實際存檔，但沒有原生相機介面那麼精緻；如果之後想要更好的
  拍照/選圖體驗，可以再加 `@capacitor/camera`。
- 拿掉了舊版「勾了『有詳細食譜』但沒填任何內容段落就擋存檔」的驗證，改成完全照 README
  的「只有菜名必填,其餘全部可空」。
- 從「快速加菜」sheet 的「建立新菜色並排入」按鈕過來時，會自動帶入搜尋字當菜名、
  選到的餐點類型當預設分類。

已經用這個 repo（對照你最新 commit `069e28b`）實際跑過 `npx tsc --noEmit` 跟
`npx vite build`，兩個都過關，而且確認過沒有動到你自己在做的那些檔案。
