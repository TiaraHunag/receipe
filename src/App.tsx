import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DishListPage from './pages/DishListPage';
import DishFormPage from './pages/DishFormPage';
import DishDetailPage from './pages/DishDetailPage';
import MenuPage from './pages/MenuPage';
import IngredientManagementPage from './pages/IngredientManagementPage';
import { initDB } from './db';

function App() {
  useEffect(() => {
    initDB().catch((err) => console.error('資料庫初始化失敗', err));
  }, []);

  return (
    <Routes>
      <Route path="/" element={<DishListPage />} />
      <Route path="/new" element={<DishFormPage />} />
      <Route path="/edit/:id" element={<DishFormPage />} />
      <Route path="/dish/:id" element={<DishDetailPage />} />
      <Route path="/ingredients" element={<IngredientManagementPage />} />
      <Route path="*" element={<Navigate to="/" />} />
      <Route path="/menu" element={<MenuPage />} />
    </Routes>
  );
}

export default App;