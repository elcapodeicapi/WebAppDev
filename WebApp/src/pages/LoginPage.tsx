import '../App.css';
import Navbar from '../components/NavBar';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  return (
    <div className="homepage">
      <Navbar /> 

      <div className="homepage-content">
        <div className="homepage-text">
          <h1>Login</h1>
          <LoginForm />

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
