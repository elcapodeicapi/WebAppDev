import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'Event' | 'Invitation';
  title: string;
  message: string;
  createdAt: string;
  actionUrl: string;
  isRead: boolean;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
      
      const data = await response.json();
      setNotifications(data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
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
    } catch (err) {
      console.error('Error accepting invitation:', err);
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
    } catch (err) {
      console.error('Error declining invitation:', err);
      alert('Failed to decline invitation');
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    navigate(notification.actionUrl);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'Event':
        return '📅';
      case 'Invitation':
        return '📧';
      default:
        return '🔔';
    }
  };

  const getNotificationsByType = (type: string) => {
    return notifications.filter(n => n.type === type);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading notifications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>
        <button onClick={loadNotifications} className="primary">
          Try Again
        </button>
      </div>
    );
  }

  const eventNotifications = getNotificationsByType('Event');
  const invitationNotifications = getNotificationsByType('Invitation');

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            background: 'transparent', 
            border: '1px solid #ccc', 
            padding: '8px 16px', 
            borderRadius: '4px', 
            cursor: 'pointer',
            marginRight: '16px'
          }}
        >
          ← Back
        </button>
        <h1 style={{ display: 'inline', margin: 0 }}>Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          color: '#666',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>No notifications</div>
          <div style={{ fontSize: '14px' }}>You're all caught up!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {eventNotifications.length > 0 && (
            <div>
              <h2 style={{ marginBottom: '16px', color: '#333' }}>
                📅 Events ({eventNotifications.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {eventNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      padding: '16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: notification.isRead ? '#f8f9fa' : '#fff',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f8ff';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = notification.isRead ? '#f8f9fa' : '#fff';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                          {notification.title}
                        </div>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                          {notification.message}
                        </div>
                        <div style={{ color: '#999', fontSize: '12px' }}>
                          {formatDate(notification.createdAt)}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: '#007bff',
                            marginTop: 4,
                            flexShrink: 0
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invitationNotifications.length > 0 && (
            <div>
              <h2 style={{ marginBottom: '16px', color: '#333' }}>
                📧 Invitations ({invitationNotifications.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {invitationNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      background: notification.isRead ? '#f8f9fa' : '#fff',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ fontSize: '24px', marginTop: '2px' }}>
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                          {notification.title}
                        </div>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                          {notification.message}
                        </div>
                        <div style={{ color: '#999', fontSize: '12px', marginBottom: '12px' }}>
                          {formatDate(notification.createdAt)}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptInvitation(parseInt(notification.id.replace('invitation_', '')));
                            }}
                            style={{
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#218838';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#28a745';
                            }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              declineInvitation(parseInt(notification.id.replace('invitation_', '')));
                            }}
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#c82333';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#dc3545';
                            }}
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleNotificationClick(notification)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #007bff',
                              color: '#007bff',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#007bff';
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#007bff';
                            }}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: '#28a745',
                            marginTop: 4,
                            flexShrink: 0
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
