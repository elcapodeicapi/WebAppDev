import { useState, useEffect } from 'react';
import type { MeetingRoom } from '../MockedData/MockedData';
import { CalendarTable } from '../components/CalendarTable';
import { Sidebar } from '../components/Sidebar';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getDateString, calculateEndTime } from '../components/constants';
import { apiGet, apiDelete, apiPost } from '../lib/api';
import '../CalendarPage.css';
import Navbar from '../components/NavBar';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function CalendarPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - day);
    return sunday;
  });

  const [meetings, setMeetings] = useState<MeetingRoom[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRoom | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitedEvents, setInvitedEvents] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<string | number | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveEventId, setLeaveEventId] = useState<string | number | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const [mine, invited] = await Promise.all([
          apiGet<any[]>('/api/events/mine'),
          apiGet<any[]>('/api/events/invited').catch(() => [] as any[]),
        ]);
        setInvitedEvents(invited);
        const mapped = mine.map((evt: any) => {
          const eventDateTime = new Date(evt.eventDate);
          
          const hours = eventDateTime.getHours();
          const isAM = hours < 12;
          const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
          const startTimeStr = `${displayHour} ${isAM ? 'AM' : 'PM'}`;
          
          return {
            id: evt.id.toString(),
            title: evt.title,
            date: eventDateTime.toISOString().split('T')[0], // YYYY-MM-DD
            startTime: startTimeStr,
            endTime: calculateEndTime(startTimeStr, evt.durationHours),
            duration: evt.durationHours,
            host: evt.host,
            attendees: evt.attendees ? evt.attendees.split(',').map((s: string) => s.trim()) : [],
            description: evt.description,
            location: evt.location,
            createdBy: evt.createdBy
          };
        });
        setMeetings(mapped);
      } catch (err: any) {
        console.error('Failed to fetch events:', err);
        setError('Failed to load events');
        setMeetings([]);
        setInvitedEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const changeWeek = (dir: 'next' | 'prev') => {
    const newWeek = new Date(weekStart);
    newWeek.setDate(newWeek.getDate() + (dir === 'next' ? 7 : -7));
    setWeekStart(newWeek);
  };

  const handleAddClick = () => {
    setEditingMeeting(null);
    setIsAdding(true);
    setSelectedMeeting(null);
  };

  const handleSaveEvent = () => {
    const fetchEvents = async () => {
      try {
        const response = await apiGet<any[]>('/api/events/mine');
        const mapped = response.map((evt: any) => {
          const eventDateTime = new Date(evt.eventDate);
          const hours = eventDateTime.getHours();
          const isAM = hours < 12;
          const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
          const startTimeStr = `${displayHour} ${isAM ? 'AM' : 'PM'}`;
          
          return {
            id: evt.id.toString(),
            title: evt.title,
            date: eventDateTime.toISOString().split('T')[0],
            startTime: startTimeStr,
            endTime: calculateEndTime(startTimeStr, evt.durationHours),
            duration: evt.durationHours,
            host: evt.host,
            attendees: evt.attendees ? evt.attendees.split(',').map((s: string) => s.trim()) : [],
            description: evt.description,
            location: evt.location,
            createdBy: evt.createdBy
          };
        });
        setMeetings(mapped);
      } catch (err) {
        console.error('Failed to refresh events:', err);
      }
    };
    fetchEvents();
    setIsAdding(false);
    setEditingMeeting(null);
    setSelectedMeeting(null);
  };

  const handleDeleteEvent = (id: string | number) => {
    setDeleteEventId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteEventId) return;
    
    try {
      await apiDelete(`/api/calendarevents/${deleteEventId}`);
      const response = await apiGet<any[]>('/api/events/mine');
      const mapped = response.map((evt: any) => {
        const eventDateTime = new Date(evt.eventDate);
        const hours = eventDateTime.getHours();
        const isAM = hours < 12;
        const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        const startTimeStr = `${displayHour} ${isAM ? 'AM' : 'PM'}`;
        
        return {
          id: evt.id.toString(),
          title: evt.title,
          date: eventDateTime.toISOString().split('T')[0],
          startTime: startTimeStr,
          endTime: calculateEndTime(startTimeStr, evt.durationHours),
          duration: evt.durationHours,
          host: evt.host,
          attendees: evt.attendees ? evt.attendees.split(',').map((s: string) => s.trim()) : [],
          description: evt.description,
          location: evt.location,
          createdBy: evt.createdBy
        };
      });
      setMeetings(mapped);
      setSelectedMeeting(null);
      setEditingMeeting(null);
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Failed to delete event');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteEventId(null);
    }
  };

  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditingMeeting(null);
    setSelectedMeeting(null);
  };

  const handleLeaveEvent = async (id: string | number) => {
    setLeaveEventId(id);
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = async () => {
    if (!leaveEventId) return;

    try {
      await apiPost(`/api/events/${leaveEventId}/decline`, {});
      const response = await apiGet<any[]>('/api/events/mine');
      const mapped = response.map((evt: any) => {
        const eventDateTime = new Date(evt.eventDate);
        const hours = eventDateTime.getHours();
        const isAM = hours < 12;
        const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        const startTimeStr = `${displayHour} ${isAM ? 'AM' : 'PM'}`;
        
        return {
          id: evt.id.toString(),
          title: evt.title,
          date: eventDateTime.toISOString().split('T')[0],
          startTime: startTimeStr,
          endTime: calculateEndTime(startTimeStr, evt.durationHours),
          duration: evt.durationHours,
          host: evt.host,
          attendees: evt.attendees ? evt.attendees.split(',').map((s: string) => s.trim()) : [],
          description: evt.description,
          location: evt.location,
          createdBy: evt.createdBy
        };
      });
      setMeetings(mapped);
      setSelectedMeeting(null);
    } catch (err: any) {
      console.error('Failed to leave event:', err);
      // Don't show alert here - backend already shows success message
    } finally {
      setShowLeaveConfirm(false);
      setLeaveEventId(null);
    }
  };

  const handleMeetingClick = (meeting: MeetingRoom) => {
    setSelectedMeeting(meeting);
    setEditingMeeting(null);
    setIsAdding(false);
  };

  const handleEditClick = (meeting: MeetingRoom) => {
    setEditingMeeting(meeting);
    setSelectedMeeting(null);
    setIsAdding(true);
  };

  console.log('CalendarPage state:', { loading, error, meetingsCount: meetings.length });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getDateString(tomorrow);
  const tomorrowMeetings = meetings.filter(m => m.date === tomorrowKey);

  const invitedItems = invitedEvents
    .map((evt: any) => {
      const dt = new Date(evt.eventDate);
      const hours = dt.getHours();
      const isAM = hours < 12;
      const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
      const startTimeStr = `${displayHour} ${isAM ? 'AM' : 'PM'}`;
      return {
        id: evt.id?.toString?.() ?? String(evt.id),
        title: evt.title,
        date: dt.toISOString().split('T')[0],
        startTime: startTimeStr,
        location: evt.location,
      };
    })
    .filter(Boolean);

  return (
    <div className="calendar-page-container" style={{ color: '#000', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar />
      {error && <div style={{ color: 'red', padding: '1rem' }}>{error}</div>}
      {loading && <div style={{ padding: '1rem' }}>Loading events...</div>}
      <div className="calendar-main-content">
        <div className="calendar-container" style={{ color: '#000' }}>
          <h1>Weekly Calendar</h1>

          <div
            style={{
              margin: '0.75rem 0',
              padding: '0.75rem 1rem',
              border: '1px solid #ddd',
              borderRadius: 8,
              background: '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>Notifications</div>
              {invitedItems.length > 0 && (
                <Link to="/invitations" style={{ fontSize: '0.9rem' }}>
                  View invitations ({invitedItems.length})
                </Link>
              )}
            </div>

            {invitedItems.length === 0 && tomorrowMeetings.length === 0 ? (
              <div style={{ color: '#666', marginTop: '0.5rem' }}>No notifications.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {invitedItems.map(inv => (
                  <div key={`inv-${inv.id}`} style={{ color: '#333' }}>
                    <strong>Invitation:</strong> {inv.title} — {inv.date} {inv.startTime}{inv.location ? ` (${inv.location})` : ''}
                  </div>
                ))}

                {tomorrowMeetings.map(m => (
                  <div key={`rem-${m.id}`} style={{ color: '#333' }}>
                    <strong>Reminder (tomorrow):</strong> {m.startTime} — {m.title}{m.location ? ` (${m.location})` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="week-controls">
            <Button text="← Previous" onClick={() => changeWeek('prev')} />
            <Button text="Next →" onClick={() => changeWeek('next')} />
          </div>

          <CalendarTable
            weekStart={weekStart}
            meetings={meetings}
            onAddMeeting={(date, hour) => {
              setEditingMeeting({
                id: '',
                title: '',
                date: getDateString(date),
                startTime: hour,
                endTime: calculateEndTime(hour, 1),
                duration: 1,
                host: '',
                attendees: [],
                description: '',
                location: '',
              });
              setIsAdding(true);
              setSelectedMeeting(null);
            }}
            onMeetingClick={handleMeetingClick}
          />
        </div>

        <Sidebar
          selectedMeeting={selectedMeeting}
          isAdding={isAdding}
          editingMeeting={editingMeeting}
          onAddClick={handleAddClick}
          onEditClick={handleEditClick}
          onDelete={handleDeleteEvent}
          onLeave={handleLeaveEvent}
          onCancel={handleCancelEdit}
          onSave={handleSaveEvent}
          currentUserId={user?.id}
        />
      </div>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={loading}
      />
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        title="Leave Event"
        message="Are you sure you want to leave this event?"
        confirmText="Leave"
        cancelText="Cancel"
        onConfirm={handleConfirmLeave}
        onCancel={() => setShowLeaveConfirm(false)}
        isLoading={loading}
      />
    </div>
  );
}