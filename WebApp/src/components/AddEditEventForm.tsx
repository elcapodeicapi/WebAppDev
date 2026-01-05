// src/components/AddEditEventForm.tsx
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

  type AvailableRoom = {
    RoomId: number;
    RoomName: string;
    Capacity: number;
    Location: string;
    TimeSlots: Array<{ Time: string; Available: boolean }>;
  };

  function startTimeToHour24(value: string): number | null {
    const match = value.trim().match(/^(\d{1,2})\s*(AM|PM)$/i);
    if (!match) return null;
    const hour12 = parseInt(match[1], 10);
    const isPM = match[2].toUpperCase() === 'PM';
    if (Number.isNaN(hour12) || hour12 < 1 || hour12 > 12) return null;
    if (hour12 === 12) return isPM ? 12 : 0;
    return isPM ? hour12 + 12 : hour12;
  }

  function slotStartHour24(timeRange: string): number | null {
    // e.g. "08:00 - 09:00" -> 8
    const match = (timeRange || '').match(/^(\d{2}):\d{2}\s*-/);
    if (!match) return null;
    const hour = parseInt(match[1], 10);
    return Number.isNaN(hour) ? null : hour;
  }
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

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

  useEffect(() => {
    if (date) {
      fetchAvailableRooms();
    } else {
      setAvailableRooms([]);
      setSelectedRoomId(null);
    }
  }, [date]);

  async function fetchAvailableRooms() {
    setLoadingRooms(true);
    setBookingError('');
    try {
      const data = await apiGet(`/api/roombookings/available?date=${date}`);
      setAvailableRooms((data as any[]) as AvailableRoom[]);
    } catch (e: any) {
      console.warn('Room availability fetch failed:', e);
      setBookingError('');
      setAvailableRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }

  const availableForSelection = useMemo(() => {
    const startHour = startTimeToHour24(startTime);
    if (!date || startHour === null || !duration || duration < 1) return [];
    const requiredHours = Array.from({ length: duration }, (_, i) => startHour + i);
    return availableRooms.filter(r => {
      if (!Array.isArray(r.TimeSlots)) return false;
      return requiredHours.every(h => {
        const slot = r.TimeSlots.find(s => slotStartHour24(s.Time) === h);
        return !!slot?.Available;
      });
    });
  }, [availableRooms, date, duration, startTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Debug: Log all form values
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

    // Validation check
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

    try {
      // First create the event
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

      console.log('Sending event payload:', payload);

      if (event?.id) {
        // Edit existing event - use PUT
        await apiPut(`/api/events/${event.id}`, payload);
      } else {
        // Create new event - use POST
        await apiPost('/api/events', payload);
      }
      
      console.log('Event created successfully');

      // If creating a new event with a room, book the room
      if (!event?.id && location && date && startTime && duration) {
        try {
          // Prefer the selected room from the availability list.
          // (The seeded rooms use names like "A", so extracting digits from the location often fails.)
          const roomIdFromSelection = selectedRoomId;

          // Backwards-compatible fallback if someone typed "Room 1".
          const roomIdMatch = roomIdFromSelection ? null : location.match(/\d+/);
          const roomId = roomIdFromSelection ?? (roomIdMatch ? parseInt(roomIdMatch[0]) : null);
          
          console.log('Attempting room booking:', { location, roomId });
          
          if (roomId) {
            await apiPost('/api/roombookings/book', {
              roomId,
              date,
              startTime,
              durationHours: duration,
              purpose: `Event: ${title}`
            });
            console.log('Room booking successful');
          } else {
            console.warn('Could not extract room ID from location:', location);
            setError('Event created, but room booking failed - no room selected');
          }
        } catch (bookingErr: any) {
          // If room booking fails, show warning but don't fail the event creation
          console.warn('Room booking failed:', bookingErr.message);
          setError(`Event created successfully, but room booking failed: ${bookingErr.message}`);
        }
      }
      
      // Notify parent to refresh events
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
<<<<<<< HEAD
          <label>Location:</label>
          <input
            type="text"
            value={location}
            onChange={e => {
              setLocation(e.target.value);
              setSelectedRoomId(null);
            }}
            placeholder="Select a room below or type a location"
          />

          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Available rooms (click to select)</div>
            {bookingError && <div style={{ color: 'red', marginBottom: 6 }}>{bookingError}</div>}
            {loadingRooms ? (
              <div>Loading rooms…</div>
            ) : !date ? (
              <div style={{ color: '#777' }}>Select a date to see available rooms.</div>
            ) : availableForSelection.length === 0 ? (
              <div style={{ color: '#777' }}>No rooms available for this time.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {availableForSelection.map(r => (
                  <button
                    key={r.RoomId}
                    type="button"
                    className={selectedRoomId === r.RoomId ? 'btn primary' : 'btn'}
                    style={{ padding: '6px 10px' }}
                    onClick={() => {
                      setSelectedRoomId(r.RoomId);
                      setLocation(`Room ${r.RoomName}`);
                      setBookingError('');
                    }}
                  >
                    Room {r.RoomName}
                  </button>
                ))}
              </div>
            )}
          </div>
=======
          <label>Location (Room):</label>
          <select value={location} onChange={e => setLocation(e.target.value)}>
            <option value="">Select a room (optional)</option>
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
>>>>>>> LastAmmarBrnch
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