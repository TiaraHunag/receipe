import { useState } from 'react';
import { useAuth } from '../AuthContext';

function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
        const code = err.code || '';
        const messages: Record<string, string> = {
          'auth/invalid-credential': '帳號或密碼錯誤,請重新輸入',
          'auth/invalid-email': 'Email 格式不正確',
          'auth/email-already-in-use': '這個 Email 已經註冊過了,請改用登入',
          'auth/weak-password': '密碼強度不足,至少需要 6 個字元',
          'auth/too-many-requests': '嘗試次數過多,請稍後再試',
          'auth/network-request-failed': '網路連線失敗,請檢查網路狀態',
        };
        setError(messages[code] || '發生錯誤,請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 400, margin: '60px auto' }}>
      <h1>{isRegister ? '註冊帳號' : '登入'}</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>密碼</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', width: '100%' }}>
          {loading ? '處理中...' : isRegister ? '註冊' : '登入'}
        </button>
      </form>
      <p style={{ marginTop: 16, textAlign: 'center' }}>
        {isRegister ? '已經有帳號了?' : '還沒有帳號?'}{' '}
        <button
          type="button"
          onClick={() => { setIsRegister(!isRegister); setError(null); }}
          style={{ border: 'none', background: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isRegister ? '改為登入' : '改為註冊'}
        </button>
      </p>
    </div>
  );
}

export default LoginPage;