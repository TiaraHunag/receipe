import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Calendar, ShoppingBasket, User } from 'lucide-react';
import styles from './BottomTabBar.module.css';
import { getShoppingListForRange, getShoppingExtraItems } from '../../db';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

interface TabDef {
  path: string;
  label: string;
  Icon: typeof BookOpen;
  /** 判斷目前路徑是否算這個分頁「選中」，不是單純比對 to 這個字串
   *  (例如 /menu/2026-09-15 這種單日菜單也要算在「菜單」分頁裡選中)。 */
  isActive: (pathname: string) => boolean;
  /** 是否要在未選中時顯示待辦數字 badge (目前只有「採買」分頁有)。 */
  showBadge?: boolean;
}

const TABS: TabDef[] = [
  { path: '/', label: '食譜', Icon: BookOpen, isActive: (p) => p === '/' },
  {
    path: '/menu',
    label: '菜單',
    Icon: Calendar,
    isActive: (p) => p === '/menu' || p.startsWith('/menu/'),
  },
  {
    path: '/shopping',
    label: '採買',
    Icon: ShoppingBasket,
    // 冰箱與食材頁是從採買頁右上角進去的下一層，不是獨立分頁，
    // 但停留在那頁時「採買」分頁視覺上應該還是選中的狀態。
    isActive: (p) => p === '/shopping' || p.startsWith('/ingredients'),
    showBadge: true,
  },
  { path: '/profile', label: '我的', Icon: User, isActive: (p) => p === '/profile' },
];

/**
 * 底部分頁列的待買數字：本週採買清單裡還沒 inStock 的食材數，
 * 加上還沒勾選(買到)的額外項目數。跟 ShoppingListPage 用的是同一批
 * db.ts 查詢，只是這裡只需要總數，不需要完整清單內容。
 */
function useShoppingPendingCount(pathname: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const today = new Date();
        // 分頁列的 badge 只是一個粗略的「有沒有東西還沒買」提醒，
        // 不需要跟採買頁一樣精準對齊使用者設定的「一週起始日」，
        // 固定用「今天往前 6 天」抓一週範圍即可，省一次 getWeekStartDay 查詢。
        const weekStart = addDays(today, -6);
        const [items, extras] = await Promise.all([
          getShoppingListForRange(formatDate(weekStart), formatDate(today)),
          getShoppingExtraItems(),
        ]);
        if (cancelled) return;
        const needBuy = items.filter((it) => !it.inStock).length;
        const uncheckedExtra = extras.filter((it) => !it.checked).length;
        setCount(needBuy + uncheckedExtra);
      } catch {
        if (!cancelled) setCount(0);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // 路徑變動時重抓一次，這樣從採買頁勾選完東西切回食譜頁,
    // badge 數字會跟著更新。
  }, [pathname]);

  return count;
}

function BottomTabBar() {
  const location = useLocation();
  const pendingCount = useShoppingPendingCount(location.pathname);

  return (
    <nav className={styles.bar} aria-label="主要導覽">
      <div className={styles.pill}>
        {TABS.map((tab) => {
          const active = tab.isActive(location.pathname);
          const { Icon } = tab;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={[styles.tab, active ? styles.active : ''].filter(Boolean).join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <span className={styles.iconWrap}>
                <Icon size={21} strokeWidth={2.75} />
                {tab.showBadge && !active && pendingCount > 0 && (
                  <span className={styles.badge}>{pendingCount > 99 ? '99+' : pendingCount}</span>
                )}
              </span>
              {active && <span className={styles.label}>{tab.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomTabBar;
