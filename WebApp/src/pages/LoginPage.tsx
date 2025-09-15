import '../App.css';
import Navbar from '../components/NavBar';

export default function LoginPage() {
  return (
    <div className="homepage">
      <Navbar /> {/* ✅ Consistent navbar */}

      <div className="homepage-content">
        <div className="homepage-text">
          <h1>Login</h1>
          <form
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxWidth: '400px',
            }}
          >
            <input type="email" placeholder="Email" required />
            <input type="password" placeholder="Password" required />
            <button className="primary" type="submit">Login</button>
          </form>

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
