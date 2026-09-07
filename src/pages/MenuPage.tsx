import { Link } from 'react-router-dom';

function MenuPage() {
  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <Link to="/">← 返回菜色列表</Link>
      <h1>菜單規劃</h1>
      <p style={{ color: '#666' }}>這個功能還在開發中,將在本地儲存架構下重新實作,敬請期待。</p>
    </div>
  );
}

export default MenuPage;