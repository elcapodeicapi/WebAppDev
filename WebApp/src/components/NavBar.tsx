import '../App.css';
import logo from '../assets/Cavent logo.png'; 
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../lib/api';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tomorrowEvents, setTomorrowEvents] = useState<Array<{ id: number; title: string; eventDate: string; location?: string }>>([]);
  const [inviteCount, setInviteCount] = useState(0);

  function dateKeyLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      if (!user) {
        setTomorrowEvents([]);
        setInviteCount(0);
        return;
      }

      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = dateKeyLocal(tomorrow);

        const mine = await apiGet<any[]>('/api/events/mine');
        const mineTomorrow = (mine || [])
          .filter(e => {
            const dt = new Date(e.eventDate);
            return dateKeyLocal(dt) === tomorrowKey;
          })
          .map(e => ({ id: e.id, title: e.title, eventDate: e.eventDate, location: e.location }));

        const invited = await apiGet<any[]>('/api/events/invited');

        if (cancelled) return;
        setTomorrowEvents(mineTomorrow);
        setInviteCount((invited || []).length);
      } catch {
        if (cancelled) return;
        // Notifications are non-critical; fail silently.
        setTomorrowEvents([]);
        setInviteCount(0);
      }
    }

    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
            {user?.role !== 'Admin' && (
              <div style={{ position: 'relative' }}>
                <button
                  className="primary"
                  type="button"
                  onClick={() => setNotificationsOpen(o => !o)}
                  aria-label="Notifications"
                >
                  Notifications ({tomorrowEvents.length + inviteCount})
                </button>

                {notificationsOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: 320,
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      padding: 12,
                      zIndex: 50,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Your notifications</div>

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600 }}>Tomorrow</div>
                      {tomorrowEvents.length === 0 ? (
                        <div style={{ color: '#666' }}>No events tomorrow.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                          {tomorrowEvents.map(e => (
                            <button
                              key={e.id}
                              type="button"
                              onClick={() => {
                                setNotificationsOpen(false);
                                navigate('/calendar');
                              }}
                              style={{
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                color: '#333',
                              }}
                            >
                              {e.title}{e.location ? ` (${e.location})` : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontWeight: 600 }}>Invitations</div>
                      {inviteCount === 0 ? (
                        <div style={{ color: '#666' }}>No pending invitations.</div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate('/invitations');
                          }}
                          style={{
                            marginTop: 4,
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: '#333',
                          }}
                        >
                          You have {inviteCount} pending invitation{inviteCount === 1 ? '' : 's'}.
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
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

