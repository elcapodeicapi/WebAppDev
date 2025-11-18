import '../App.css';
import Navbar from '../components/NavBar';
import { useState } from 'react';
import { apiPost, type AuthResponse } from '../lib/api';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
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
        { fullName: string; username: string; email: string; password: string },
        AuthResponse
      >('/api/auth/register', { fullName, username, email, password });
      setMessage(res.message || 'Registered successfully');
      setFullName('');
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setMessage(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="homepage">
      <Navbar />
      <div className="homepage-content">
        <div className="homepage-text">
          <h1>Create an Account</h1>
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Registering…' : 'Register'}
            </button>
          </form>
          {message && (
            <p style={{ marginTop: '0.5rem', color: '#374151' }}>{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
