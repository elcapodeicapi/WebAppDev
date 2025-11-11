import '../App.css';
import logo from '../assets/Cavent logo.png'; 
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const showLoginButton = !user && (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register');

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      {/* Left: Logo */}
      <div className="navbar-left">
        <Link to="/home">
          <img src={logo} alt="Logo" className="navbar-logo" />
        </Link>
      </div>

      {/* Center: Nav links */}
      <div className="navbar-center">
        <Link to="/home">Home</Link>
        <Link to="/dashboard">My Profile</Link>
        <Link to="/calendar">Calendar</Link> {/* ✅ new page */}
      </div>

      {/* Right: Login button */}
      <div className="navbar-right">
        {showLoginButton ? (
          <Link to="/login">
            <button className="primary">Login</button>
          </Link>
        ) : user ? (
          <button className="primary" onClick={handleLogout}>Logout</button>
        ) : null}
      </div>
    </nav>
  );
}

