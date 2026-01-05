import '../App.css';
import logo from '../assets/Cavent logo.png'; 
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function getInitials(text: string) {
    const cleaned = (text || '').trim();
    if (!cleaned) return '??';
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : (parts[0]?.[1] ?? '');
    return (first + last).toUpperCase();
  }

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
        {user?.role === 'Admin' ? (
          // Admin navigation
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/events">Events</Link>
          </>
        ) : (
          // Employee navigation
          <>
            <Link to="/home">Home</Link>
            <Link to="/profile">My Profile</Link>
            <Link to="/calendar">Calendar</Link>
            <Link to="/events">Events</Link>
            {user && <Link to="/room-booking">Room Booking</Link>}
            {user && <Link to="/office-attendance">Office Attendance</Link>}
            {user && <Link to="/my-friends">My Friends</Link>}
            {user && <Link to="/invitations">Invitations</Link>}
          </>
        )}
      </div>

      {/* Right: Login button */}
      <div className="navbar-right">
        {showLoginButton ? (
          <Link to="/login">
            <button className="primary">Login</button>
          </Link>
        ) : user ? (
          <>
            <button className="primary" onClick={handleLogout}>Logout</button>
            <Link
              to="/profile"
              className="navbar-avatar"
              aria-label="Profile"
              title={user.fullName}
            >
              {(user as any)?.avatarUrl ? (
                <img className="navbar-avatar-img" src={(user as any).avatarUrl} alt={user.fullName} />
              ) : (
                <span className="navbar-avatar-initials">
                  {getInitials(user.fullName || user.username || user.email)}
                </span>
              )}
            </Link>
          </>
        ) : null}
      </div>
    </nav>
  );
}

