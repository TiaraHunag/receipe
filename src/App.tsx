import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DishListPage from './pages/DishListPage';
import DishFormPage from './pages/DishFormPage';
import DishDetailPage from './pages/DishDetailPage';
import MenuPage from './pages/MenuPage';
import IngredientManagementPage from './pages/IngredientManagementPage';
import ShoppingListPage from './pages/ShoppingListPage';
import ProfilePage from './pages/ProfilePage';
import QuickAddPage from './pages/QuickAddPage';
import BottomTabBar from './components/BottomTabBar';
import { initDB } from './db';

function App() {
  useEffect(() => {
    initDB().catch((err) => console.error('資料庫初始化失敗', err));
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<DishListPage />} />
        <Route path="/new" element={<DishFormPage />} />
        <Route path="/quick-add" element={<QuickAddPage />} />
        <Route path="/edit/:id" element={<DishFormPage />} />
        <Route path="/dish/:id" element={<DishDetailPage />} />
        <Route path="/menu" element={<MenuPage />} />
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