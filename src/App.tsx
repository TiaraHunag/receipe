import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import DishListPage from './pages/DishListPage';
import DishFormPage from './pages/DishFormPage';
import DishDetailPage from './pages/DishDetailPage';
import MenuPage from './pages/MenuPage';
import { initDB } from './db';

useEffect(() => {
  initDB().catch((err) => console.error('資料庫初始化失敗', err));
}, []);

function App() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div style={{ padding: 20 }}>載入中...</div>;

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 20px', background: '#f5f5f5' }}>
        <span style={{ marginRight: 12, fontSize: 14, color: '#666' }}>{user.email}</span>
        <button type="button" onClick={logout} style={{ fontSize: 14 }}>登出</button>
      </div>
      <Routes>
        <Route path="/" element={<DishListPage />} />
        <Route path="/new" element={<DishFormPage />} />
        <Route path="/edit/:id" element={<DishFormPage />} />
        <Route path="/dish/:id" element={<DishDetailPage />} />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/menu" element={<MenuPage />} />
      </Routes>
    </div>
  );
}

export default App;