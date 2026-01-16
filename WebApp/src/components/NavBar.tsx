import '../App.css';
import logo from '../assets/Cavent logo.png'; 
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Notifications from './Notifications';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let intervalId: NodeJS.Timeout | null = null;
    
    async function loadNotificationSummary() {
      if (!user) {
        setNotifications([]);
        setNotificationCount(0);
        return;
      }

      try {
        const response = await fetch('/api/notifications/summary', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }
        
        const summary = await response.json();
        
        if (cancelled) return;
        setNotificationCount(summary?.totalCount || 0);
      } catch {
        if (cancelled) return;
        setNotificationCount(0);
      }
    }

    loadNotificationSummary();
    
    // Check for new notifications every 30 seconds
    if (user) {
      intervalId = setInterval(loadNotificationSummary, 30000);
    }
    
    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user]);

  async function loadNotifications() {
    if (!user) return;
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
      
      const data = await response.json();
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    }
  }

  async function acceptInvitation(eventId: number) {
    try {
      const response = await fetch(`/api/events/${eventId}/accept`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to accept invitation: ${response.status}`);
      }
      
      // Reload notifications after accepting
      await loadNotifications();
      // Reload summary to update count
      const summaryResponse = await fetch('/api/notifications/summary', {
        method: 'GET',
        credentials: 'include'
      });
      if (summaryResponse.ok) {
        const summary = await summaryResponse.json();
        setNotificationCount(summary?.totalCount || 0);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation');
    }
  }

  async function declineInvitation(eventId: number) {
    try {
      const response = await fetch(`/api/events/${eventId}/decline`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to decline invitation: ${response.status}`);
      }
      
      // Reload notifications after declining
      await loadNotifications();
      // Reload summary to update count
      const summaryResponse = await fetch('/api/notifications/summary', {
        method: 'GET',
        credentials: 'include'
      });
      if (summaryResponse.ok) {
        const summary = await summaryResponse.json();
        setNotificationCount(summary?.totalCount || 0);
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      alert('Failed to decline invitation');
    }
  }

  useEffect(() => {
    if (notificationsOpen && user) {
      loadNotifications();
    }
  }, [notificationsOpen, user]);

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
          <>
            <Link to="/dashboard">Dashboard</Link>
          </>
        ) : (
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
                  Notifications ({notificationCount})
                </button>

                {notificationsOpen && (
                  <Notifications
                    notifications={notifications}
                    totalCount={notificationCount}
                    onClose={() => setNotificationsOpen(false)}
                    onAcceptInvitation={acceptInvitation}
                    onDeclineInvitation={declineInvitation}
                  />
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

