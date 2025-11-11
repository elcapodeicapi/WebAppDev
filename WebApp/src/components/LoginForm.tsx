import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginForm() {
  const { login, message, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalMessage(null);
    try {
  const u = await login(username, password);
  // redirect by role based on returned user to avoid timing issues
  if (u.role === 'Admin') navigate('/dashboard');
  else navigate('/home');
    } catch (e: any) {
      setLocalMessage(e.message || 'Login failed');
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button className="primary" type="submit" disabled={loading}>
        {loading ? 'Logging in…' : 'Login'}
      </button>
      {(localMessage || message) && (
        <p style={{ color: '#374151' }}>{localMessage || message}</p>
      )}
    </form>
  );
}
