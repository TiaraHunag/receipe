import { NavLink } from 'react-router-dom';

const TABS = [
  { path: '/', label: '食譜', icon: '🍳', end: true },
  { path: '/shopping', label: '採買清單', icon: '🛒', end: false },
  { path: '/menu', label: '菜單規劃', icon: '📅', end: false },
  { path: '/ingredients', label: '冰箱管理', icon: '🧊', end: false },
  { path: '/profile', label: '個人', icon: '👤', end: false },
];

function BottomTabBar() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        background: '#fff',
        borderTop: '1px solid #e0e0e0',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100,
      }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.end}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 0 6px',
            textDecoration: 'none',
            color: isActive ? '#1a73e8' : '#888',
            fontSize: 11,
          })}
        >
          <span style={{ fontSize: 22, marginBottom: 2 }}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomTabBar;