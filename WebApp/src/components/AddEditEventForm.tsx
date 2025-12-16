// src/components/AddEditEventForm.tsx
import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { HOURS } from './constants';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface EventResponse {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  durationHours: number;
  host: string;
  attendees: string;
  location: string;
  createdBy: number;
}

// Support both EventResponse and local MeetingRoom format
interface MeetingRoom {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  host: string;
  attendees: string[];
  description: string;
  location: string;
}

type EventData = EventResponse | MeetingRoom;

interface AddEditEventFormProps {
  event?: EventData;
  isAdding: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: (id: string | number) => void;
}

export function AddEditEventForm({ event, isAdding, onSave, onCancel, onDelete }: AddEditEventFormProps): JSX.Element {
  const { user } = useAuth();
  // Helper to extract date from either EventResponse or MeetingRoom
  const getDateValue = () => {
    if (!event) return '';
    if ('eventDate' in event) {
      // EventResponse format
      return new Date(event.eventDate).toISOString().split('T')[0];
    }
    // MeetingRoom format
    return (event as MeetingRoom).date;
  };

  // Helper to extract startTime from either EventResponse or MeetingRoom
  const getStartTimeValue = () => {
    if (!event) return HOURS[0];
    if ('eventDate' in event) {
      // EventResponse format
      const dt = new Date(event.eventDate);
      const hours = dt.getHours();
      const isAM = hours < 12;
      const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
      return `${displayHour} ${isAM ? 'AM' : 'PM'}`;
    }
    // MeetingRoom format
    return (event as MeetingRoom).startTime;
  };

  // Helper to get duration
  const getDurationValue = () => {
    if (!event) return 1;
    if ('durationHours' in event) {
      return (event as EventResponse).durationHours;
    }
    return (event as MeetingRoom).duration;
  };

  // Helper to get attendees as string
  const getAttendeesValue = () => {
    if (!event) return '';
    if ('attendees' in event) {
      const att = (event as any).attendees;
      if (typeof att === 'string') return att;
      if (Array.isArray(att)) return att.join(',');
    }
    return '';
  };

  const [title, setTitle] = useState(event?.title || '');
  const [date, setDate] = useState(getDateValue());
  const [startTime, setStartTime] = useState(getStartTimeValue());
  const [duration, setDuration] = useState(getDurationValue());
  // Host is always the logged-in user (no input field)
  const host = user?.username || user?.fullName || '';
  // Fetch users for attendee selection
  type UserLite = { id: number; username: string; fullName: string };
  const [users, setUsers] = useState<UserLite[]>([]);
  const initialAttendees = useMemo<string[]>(() => {
    const att = getAttendeesValue();
    if (!att) return [];
    return att.split(',').map(s => s.trim()).filter(Boolean);
  }, []);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(initialAttendees);
  const [description, setDescription] = useState(event?.description || '');
  const [location, setLocation] = useState(event?.location || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        const list = await apiGet<UserLite[]>('/api/users');
        setUsers(list);
      } catch {
        // ignore silently; UI will show no users
      }
    }
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        title,
        date,
        startTime,
        durationHours: duration,
        host,
        attendees: selectedAttendees.join(','),
        description,
        location
      };

      if (event?.id) {
        // Edit existing event - use PUT
        await apiPut(`/api/events/${event.id}`, payload);
      } else {
        // Create new event - use POST
        await apiPost('/api/events', payload);
      }
      
      // Notify parent to refresh events
      onSave();
    } catch (err: any) {
      const msg = err?.message || (err?.response?.data?.message as string) || 'Failed to save event';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-form-container">
      <h2>{isAdding ? 'Add New Event' : 'Edit Event'}</h2>
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>Error: {error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title:</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Date:</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Start Time:</label>
          <select value={startTime} onChange={e => setStartTime(e.target.value)} required>
            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Duration (hours):</label>
          <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value))} min={1} required />
        </div>
        <div className="form-group">
          <label>Host:</label>
          <input type="text" value={host} readOnly disabled />
        </div>
        <div className="form-group">
          <label>Attendees:</label>
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #ddd', padding: 8, borderRadius: 4 }}>
            {users.length === 0 ? (
              <div style={{ color: '#777' }}>No users available</div>
            ) : (
              users.map(u => (
                <label key={u.id} style={{ display: 'block', marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={selectedAttendees.includes(u.username)}
                    onChange={(e) => {
                      setSelectedAttendees(prev => {
                        if (e.target.checked) return Array.from(new Set([...prev, u.username]));
                        return prev.filter(x => x !== u.username);
                      });
                    }}
                  />
                  <span style={{ marginLeft: 8 }}>{u.fullName} ({u.username})</span>
                </label>
              ))
            )}
          </div>
        </div>
        <div className="form-group">
          <label>Description:</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}></textarea>
        </div>
        <div className="form-group">
          <label>Location (Room):</label>
          <select value={location} onChange={e => setLocation(e.target.value)} required>
            <option value="">Select a room</option>
            <option value="A">Room A</option>
            <option value="B">Room B</option>
            <option value="C">Room C</option>
            <option value="D">Room D</option>
            <option value="E">Room E</option>
            <option value="F">Room F</option>
            <option value="G">Room G</option>
            <option value="H">Room H</option>
            <option value="I">Room I</option>
            <option value="J">Room J</option>
          </select>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          <button type="button" className="btn" onClick={onCancel} disabled={loading}>Cancel</button>
          {!isAdding && event && onDelete && (
            <button type="button" className="btn delete" onClick={() => onDelete(event.id)} disabled={loading}>Delete</button>
          )}
        </div>
      </form>
    </div>
  );
}