import '../App.css';
import Navbar from '../components/NavBar';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { apiPost, type AuthResponse } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await apiPost<
        { email: string; password: string },
        AuthResponse
      >('/api/auth/login', { email, password });
      setMessage(res.message || 'Login successful');
      // Very basic: navigate to dashboard/home on success
      navigate('/');
    } catch (err: any) {
      setMessage(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="homepage">
      <Navbar /> 

      <div className="homepage-content">
        <div className="homepage-text">
          <h1>Login</h1>
          <form
            onSubmit={onSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxWidth: '400px',
            }}
          >
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
            </button>
          </form>

          {message && (
            <p style={{ marginTop: '0.5rem', color: '#374151' }}>{message}</p>
          )}

          {/* Divider */}
          <div
            style={{
              margin: '1rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            <span style={{ color: '#6b7280' }}>or</span>
            <span style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          </div>

        

          {/* ✅ Register link below form */}
          <p style={{ marginTop: '1rem' }}>
            Don’t have an account?{' '}
            <a href="/register" style={{ color: '#646cff', fontWeight: '600' }}>
              Register here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
