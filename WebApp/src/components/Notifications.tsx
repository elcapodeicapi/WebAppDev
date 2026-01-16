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

interface NotificationsProps {
  notifications: Notification[];
  totalCount: number;
  onClose: () => void;
  onAcceptInvitation?: (eventId: number) => void;
  onDeclineInvitation?: (eventId: number) => void;
}

export default function Notifications({ notifications, totalCount, onClose, onAcceptInvitation, onDeclineInvitation }: NotificationsProps) {
  const navigate = useNavigate();

  const handleAcceptInvitation = (eventId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAcceptInvitation) {
      onAcceptInvitation(eventId);
    }
  };

  const handleDeclineInvitation = (eventId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeclineInvitation) {
      onDeclineInvitation(eventId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
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

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 8px)',
        width: 350,
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: 12,
        zIndex: 50,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxHeight: '400px',
        overflow: 'auto'
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Notifications</span>
        <span style={{ 
          background: '#007bff', 
          color: 'white', 
          borderRadius: '12px', 
          padding: '2px 8px', 
          fontSize: '12px',
          fontWeight: 'normal'
        }}>
          {totalCount}
        </span>
      </div>

      {notifications.length === 0 ? (
        <div style={{ color: '#666', textAlign: 'center', padding: '20px 0' }}>
          No notifications
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                padding: 10,
                border: '1px solid #eee',
                borderRadius: 6,
                background: notification.isRead ? '#f8f9fa' : '#fff',
                transition: 'background-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: '16px', marginTop: '2px' }}>
                  {getNotificationIcon(notification.type)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: 2 }}>
                    {notification.title}
                  </div>
                  <div style={{ color: '#666', fontSize: '13px', marginBottom: 4 }}>
                    {notification.message}
                  </div>
                  <div style={{ color: '#999', fontSize: '11px', marginBottom: 6 }}>
                    {formatDate(notification.createdAt)}
                  </div>
                  {notification.type === 'Invitation' && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => handleAcceptInvitation(parseInt(notification.id.replace('invitation_', '')), e)}
                        style={{
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px',
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={(e) => handleDeclineInvitation(parseInt(notification.id.replace('invitation_', '')), e)}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
                {!notification.isRead && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
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
      )}

      <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #eee', textAlign: 'center' }}>
        <button
          onClick={() => {
            navigate('/notifications');
            onClose();
          }}
          style={{
            background: 'transparent',
            border: '1px solid #007bff',
            color: '#007bff',
            padding: '6px 16px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'background-color 0.2s'
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
          View All Notifications
        </button>
      </div>
    </div>
  );
}
