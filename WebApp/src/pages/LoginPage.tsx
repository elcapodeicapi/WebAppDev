import '../App.css';
import Navbar from '../components/NavBar';
// ==========================
// 🔒 Google Login (commented out)
// import { initializeApp, getApps } from 'firebase/app';
// import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
// ==========================
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();

  // ==========================
  // 🔒 Firebase config (commented out)
  // const firebaseConfig = {
  //   apiKey: 'YOUR_API_KEY',
  //   authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  //   projectId: 'YOUR_PROJECT_ID',
  //   appId: 'YOUR_APP_ID',
  // };

  // if (!getApps().length) {
  //   initializeApp(firebaseConfig);
  // }

  // const auth = getAuth();
  // const provider = new GoogleAuthProvider();

  // const handleGoogleLogin = async () => {
  //   try {
  //     const res = await signInWithPopup(auth, provider);
  //     console.log('Signed in:', res.user?.email);
  //     navigate('/dashboard'); // adjust destination as needed
  //   } catch (err) {
  //     console.error(err);
  //     alert('Google sign-in failed');
  //   }
  // };
  // ==========================

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
            <button className="primary" type="submit">
              Login
            </button>
          </form>

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

          {/* 🔒 Google Sign-In (commented out) */}
          {/* <button
            type="button"
            onClick={handleGoogleLogin}
            className="primary"
            style={{ background: '#fff', color: '#000', border: '1px solid #e5e7eb' }}
          >
            Continue with Google
          </button> */}

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
