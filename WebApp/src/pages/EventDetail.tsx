import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/NavBar';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import '../App.css';

interface Event {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  durationHours: number;
  host: string;
  attendees: string;
  location: string;
  createdBy?: number;
  eventParticipation?: EventParticipation[];
}

interface EventParticipation {
  userId: number;
  eventId: number;
  status: string;
}

interface CurrentUser {
  id?: number;
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    async function loadEventAndUser() {
      if (!id) {
        setError('Event ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const eventData = await apiGet<Event>(`/api/events/${id}`);
        setEvent(eventData);

        const sessionData = await apiGet<any>('/api/auth/session');
        if (sessionData?.active && sessionData?.userId) {
          setCurrentUser({ id: sessionData.userId });
        }
      } catch (err: any) {
        console.error('Failed to load event:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    }

    loadEventAndUser();
  }, [id]);

  const formatEventDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEndTime = (dateStr: string, durationHours: number): string => {
    const date = new Date(dateStr);
    const endDate = new Date(date.getTime() + durationHours * 60 * 60 * 1000);
    return endDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteEvent = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      setIsDeleting(true);
      await apiDelete(`/api/calendarevents/${id}`);
      alert('Event deleted successfully');
      navigate('/home');
    } catch (err: any) {
      alert('Failed to delete event: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeaveEvent = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to leave this event?')) return;

    try {
      setIsLeaving(true);
      await apiPost(`/api/events/${id}/decline`, {});
      alert('You have left the event');
      navigate('/home');
    } catch (err: any) {
      alert('Failed to leave event: ' + err.message);
    } finally {
      setIsLeaving(false);
    }
  };

  const isCreator = event && currentUser?.id === event.createdBy;

  if (loading) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading event...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
          {error || 'Event not found'}
        </div>
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const attendeesList = event.attendees
    ? event.attendees.split(',').map(a => a.trim()).filter(Boolean)
    : [];

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <button
          onClick={() => navigate('/home')}
          style={{
            marginBottom: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          ← Back to Events
        </button>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{ color: '#007bff', marginBottom: '1rem' }}>{event.title}</h1>

          <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e0e0e0' }}>
            <p style={{ margin: '0.5rem 0', fontSize: '1.1rem' }}>
              <strong>Date & Time:</strong> {formatEventDate(event.eventDate)}
            </p>
            <p style={{ margin: '0.5rem 0', fontSize: '1rem' }}>
              <strong>End Time:</strong> {getEndTime(event.eventDate, event.durationHours)}
            </p>
            <p style={{ margin: '0.5rem 0', fontSize: '1rem' }}>
              <strong>Duration:</strong> {event.durationHours} hour{event.durationHours !== 1 ? 's' : ''}
            </p>
            <p style={{ margin: '0.5rem 0', fontSize: '1rem' }}>
              <strong>Location:</strong> {event.location}
            </p>
            <p style={{ margin: '0.5rem 0', fontSize: '1rem' }}>
              <strong>Host:</strong> {event.host}
            </p>
          </div>

          {event.description && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3>Description</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                {event.description}
              </p>
            </div>
          )}

          {attendeesList.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3>Attendees</h3>
              <ul style={{ marginLeft: '1.5rem', color: '#666' }}>
                {attendeesList.map((attendee, idx) => (
                  <li key={idx}>{attendee}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {isCreator && (
              <button
                onClick={() => navigate(`/events/${id}/edit`)}
                style={{
                  padding: '0.8rem 1.5rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Edit Event
              </button>
            )}
            
            {isCreator ? (
              <button
                onClick={handleDeleteEvent}
                disabled={isDeleting}
                style={{
                  padding: '0.8rem 1.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Event'}
              </button>
            ) : (
              <button
                onClick={handleLeaveEvent}
                disabled={isLeaving}
                style={{
                  padding: '0.8rem 1.5rem',
                  backgroundColor: '#ffc107',
                  color: '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLeaving ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  opacity: isLeaving ? 0.6 : 1
                }}
              >
                {isLeaving ? 'Leaving...' : 'Leave Event'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
