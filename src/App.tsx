import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import DishListPage from './pages/DishListPage';
import DishFormPage from './pages/DishFormPage';
import DishDetailPage from './pages/DishDetailPage';
import MenuPage from './pages/MenuPage';
import MenuDayPage from './pages/MenuDayPage';
import IngredientManagementPage from './pages/IngredientManagementPage';
import ShoppingListPage from './pages/ShoppingListPage';
import ProfilePage from './pages/ProfilePage';
import QuickAddPage from './pages/QuickAddPage';
import BottomTabBar from './components/BottomTabBar';
import { initDB } from './db';
import SharedContent from './plugins/sharedContent';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    initDB().catch((err) => console.error('資料庫初始化失敗', err));

    // Share Extension 會把分享內容寫進 App Group 共用的 UserDefaults,自己再用
    // 自訂 URL scheme 把 App 帶到前景。冷啟動時 Capacitor 的 getLaunchUrl/appUrlOpen
    // 在 Scene-based 專案上不保證能收到那個啟動網址(實測會漏接),所以不依賴比對網址,
    // 而是每次「App 啟動」或「回到前景」都直接檢查一次有沒有待處理的分享內容——
    // 沒有分享時這個檢查幾乎零成本(只是讀一個本機 key,讀完就清空,不會重複觸發)。
    const checkPendingShare = async () => {
      const pending = await SharedContent.getPendingShare();
      const sharedText = pending.text || pending.url;
      if (sharedText) {
        navigate('/quick-add', { state: { sharedText } });
      }
    };

    checkPendingShare();

    const listenerPromise = CapacitorApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        checkPendingShare();
      }
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, [navigate]);

  return (
    <>
      <Routes>
        <Route path="/" element={<DishListPage />} />
        <Route path="/new" element={<DishFormPage />} />
        <Route path="/quick-add" element={<QuickAddPage />} />
        <Route path="/edit/:id" element={<DishFormPage />} />
        <Route path="/dish/:id" element={<DishDetailPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/menu/:date" element={<MenuDayPage />} />
        <Route path="/ingredients" element={<IngredientManagementPage />} />
        <Route path="/shopping" element={<ShoppingListPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomTabBar />
    </>
  );
}

export default App;
