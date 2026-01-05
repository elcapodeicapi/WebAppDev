import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { HOURS } from './constants';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';

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

  type RoomLite = { id: number; roomName: string };

  const getDateValue = () => {
    if (!event) return '';
    if ('eventDate' in event) {
      return new Date(event.eventDate).toISOString().split('T')[0];
    }
    return (event as MeetingRoom).date;
  };

  const getStartTimeValue = () => {
    if (!event) return HOURS[0];
    if ('eventDate' in event) {
      const dt = new Date(event.eventDate);
      const hours = dt.getHours();
      const isAM = hours < 12;
      const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
      return `${displayHour} ${isAM ? 'AM' : 'PM'}`;
    }
    return (event as MeetingRoom).startTime;
  };

  const getDurationValue = () => {
    if (!event) return 1;
    if ('durationHours' in event) {
      return (event as EventResponse).durationHours;
    }
    return (event as MeetingRoom).duration;
  };

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
  const host = user?.username || user?.fullName || '';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [availableRooms, setAvailableRooms] = useState<RoomLite[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const list = await apiGet<UserLite[]>('/api/users');
        setUsers(list);
      } catch {
      }
    }
    loadUsers();
  }, []);

  useEffect(() => {
    const myUsername = user?.username;
    if (!myUsername) return;
    setSelectedAttendees(prev => prev.filter(u => u !== myUsername));
  }, [user?.username]);

  useEffect(() => {
    async function loadRooms() {
      if (!date) {
        setAvailableRooms([]);
        setSelectedRoomId(null);
        setLocation('');
        return;
      }

      setLoadingRooms(true);
      setBookingError('');
      try {
        const qs = new URLSearchParams({
          date,
          startTime,
          durationHours: String(duration)
        });
        const list = await apiGet<RoomLite[]>(`/api/roombookings/available-rooms?${qs.toString()}`);
        setAvailableRooms(list);

        if (selectedRoomId && !list.some(r => r.id === selectedRoomId)) {
          setSelectedRoomId(null);
          setLocation('');
        }
      } catch (e: any) {
        console.warn('Room availability fetch failed:', e);
        setBookingError('Failed to load rooms');
        setAvailableRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    }

    loadRooms();
  }, [date, startTime, duration, selectedRoomId]);

  useEffect(() => {
    if (!location) return;
    if (selectedRoomId) return;
    if (availableRooms.length === 0) return;

    const match = availableRooms.find(r => r.roomName === location);
    if (match) {
      setSelectedRoomId(match.id);
      return;
    }

    setLocation('');
  }, [availableRooms, location, selectedRoomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('Form submission debug:', {
      title,
      date,
      startTime,
      duration,
      host,
      selectedAttendees,
      description,
      location,
      attendeesString: selectedAttendees.join(',')
    });

    if (!title || !date || !startTime || !duration || !host) {
      console.error('Validation failed - missing required fields:', {
        title: !!title,
        date: !!date,
        startTime: !!startTime,
        duration: !!duration,
        host: !!host
      });
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (location) {
      const validRoom = availableRooms.find(r => r.roomName === location || r.id === selectedRoomId);
      if (!validRoom) {
        setError('Please select an available room (or leave it empty).');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        title,
        date,
        startTime,
        durationHours: duration,
        host,
        attendees: selectedAttendees.join(','),
        description,
        location,
        roomId: selectedRoomId
      };

      console.log('Sending event payload:', payload);

      if (event?.id) {
        await apiPut(`/api/events/${event.id}`, payload);
      } else {
        await apiPost('/api/events', payload);
      }
      
      console.log('Event created successfully');

      
      onSave();
    } catch (err: any) {
      console.error('Event creation failed:', err);
      const msg = err?.message || (err?.response?.data?.message as string) || 'Failed to save event';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (event?.id && onDelete) {
      setShowDeleteConfirm(false);
      onDelete(event.id);
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
            {users.filter(u => u.id !== user?.id).length === 0 ? (
              <div style={{ color: '#777' }}>No other users available</div>
            ) : (
              users.filter(u => u.id !== user?.id).map(u => (
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
          <select
            value={selectedRoomId ?? ''}
            onChange={e => {
              const raw = e.target.value;
              if (!raw) {
                setSelectedRoomId(null);
                setLocation('');
                return;
              }
              const rid = parseInt(raw, 10);
              const room = availableRooms.find(r => r.id === rid);
              setSelectedRoomId(Number.isNaN(rid) ? null : rid);
              setLocation(room?.roomName || '');
            }}
            disabled={!date || loadingRooms}
          >
            <option value="">Select a room (optional)</option>
            {availableRooms.map(r => (
              <option key={r.id} value={r.id}>{r.roomName}</option>
            ))}
          </select>
          {loadingRooms && <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 6 }}>Loading rooms…</div>}
          {!loadingRooms && bookingError && <div style={{ fontSize: '0.85rem', color: 'red', marginTop: 6 }}>{bookingError}</div>}
          {!loadingRooms && date && availableRooms.length === 0 && (
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 6 }}>No rooms available.</div>
          )}
        </div>
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          <button type="button" className="btn" onClick={onCancel} disabled={loading}>Cancel</button>
          {!isAdding && event && onDelete && (
            <button type="button" className="btn delete" onClick={handleDelete} disabled={loading}>Delete</button>
          )}
        </div>
      </form>
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
    </div>
  );
}