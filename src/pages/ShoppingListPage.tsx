import { EmptyState } from '../components';

function ShoppingListPage() {
  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 480, margin: '0 auto', paddingBottom: 96 }}>
      <h1 style={{ font: 'var(--font-title)', color: 'var(--color-text)', margin: '12px 0' }}>採買清單</h1>
      <EmptyState
        icon="🛒"
        title="這個功能還在開發中"
        description="將依照菜單規劃自動計算需要採買的食材,敬請期待。"
      />
    </div>
  );
}

export default ShoppingListPage;
