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
  error?: string;
}

export function AddEditEventForm({ event, isAdding, onSave, onCancel, onDelete, error }: AddEditEventFormProps): JSX.Element {
  const { user } = useAuth();
  // Helper to extract date from either EventResponse or MeetingRoom
  const getDateValue = () => {
    if (!event) return '';
    if ('eventDate' in event) {
      // EventResponse format
      return new Date(event.eventDate).toISOString().split('T')[0];
    }
    // MeetingRoom format - check if location is a number (Room ID)
    if ('date' in event && typeof event.location === 'number') {
      return (event as any).date;
    }
    return (event as any).date || '';
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
    if ('date' in event && typeof event.location === 'number') {
      return (event as any).startTime || '';
    }
    return (event as any).startTime || '';
  };

  // Helper to get duration
  const getDurationValue = () => {
    if (!event) return 1;
    if ('durationHours' in event) {
      return (event as EventResponse).durationHours;
    }
    // MeetingRoom format
    if ('date' in event && typeof event.location === 'number') {
      return (event as any).duration || 1;
    }
    return (event as any).duration || 1;
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
  // Host selection - only for admins
  const [selectedHost, setSelectedHost] = useState(event?.host || user?.username || user?.fullName || '');
  
  // Fetch users for attendee selection and host selection (admin only)
  type UserLite = { id: number; username: string; fullName: string };
  const [users, setUsers] = useState<UserLite[]>([]);
  
  // Fetch rooms for location selection
  type Room = { id: number; RoomName: string };
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const initialAttendees = useMemo<string[]>(() => {
    const att = getAttendeesValue();
    if (!att) return [];
    return att.split(',').map(s => s.trim()).filter(Boolean);
  }, []);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(initialAttendees);
  const [description, setDescription] = useState(event?.description || '');
  const [location, setLocation] = useState(event?.location ? event.location.toString() : '');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formError, setFormError] = useState('');

  // Function to check room availability
  const checkRoomAvailability = async (roomId: string, date: string, startTime: string, duration: number): Promise<boolean> => {
    if (!roomId || !date || !startTime) return true; // No room selected or missing data
    
    console.log('=== ROOM AVAILABILITY CHECK ===');
    console.log('Room ID:', roomId);
    console.log('Date:', date);
    console.log('Start Time:', startTime);
    console.log('Duration:', duration);
    
    try {
      // Check room bookings first
      const apiUrl = `/api/roombookings/available-rooms?date=${date}&startTime=${startTime}&durationHours=${duration}`;
      console.log('API URL:', apiUrl);
      
      const response = await apiGet<any[]>(apiUrl);
      console.log('Available rooms response:', response);
      
      const isAvailableFromBookings = response.some(room => (room.Id || room.id)?.toString() === roomId);
      console.log('Room available from bookings check:', isAvailableFromBookings);
      
      // Also check existing events in the same room
      const eventsUrl = `/api/events`;
      console.log('Events API URL:', eventsUrl);
      
      const eventsResponse = await apiGet<any[]>(eventsUrl);
      console.log('Events response:', eventsResponse);
      
      // Filter events for the same date and room
      const sameDateEvents = eventsResponse.filter(event => {
        const eventDate = new Date(event.eventDate);
        return eventDate.toDateString() === new Date(date).toDateString();
      });
      
      console.log('Events on same date:', sameDateEvents);
      
      // Parse start time to check for conflicts
      const timeMatch = startTime.match(/(\d+)\s*(AM|PM)/i);
      if (!timeMatch) return true; // Invalid time format
      
      const [, hourStr, period] = timeMatch;
      let eventStartHour = parseInt(hourStr);
      
      // Convert to 24-hour format
      if (period.toUpperCase() === 'PM' && eventStartHour !== 12) {
        eventStartHour += 12;
      } else if (period.toUpperCase() === 'AM' && eventStartHour === 12) {
        eventStartHour = 0;
      }
      
      const eventEndHour = eventStartHour + duration;
      
      const hasEventConflict = sameDateEvents.some(dbEvent => {
        // Skip the current event when editing - handle both string and number IDs
        if (dbEvent?.id?.toString() === event?.id?.toString()) return false;
        
        if (!dbEvent.location || dbEvent.location.toString() !== roomId) return false;
        
        // Parse event start time
        const eventDate = new Date(dbEvent.eventDate);
        const eventStartHourFromDb = eventDate.getHours();
        const eventDuration = dbEvent.durationHours || 1;
        const eventEndHourFromDb = eventStartHourFromDb + eventDuration;
        
        // Check for time overlap
        const hasOverlap = (eventStartHour < eventEndHourFromDb) && (eventEndHour > eventStartHourFromDb);
        
        if (hasOverlap) {
          console.log('Found conflicting event:', dbEvent.title, 'at', dbEvent.eventDate);
        }
        
        return hasOverlap;
      });
      
      console.log('Has event conflict:', hasEventConflict);
      
      const isAvailable = isAvailableFromBookings && !hasEventConflict;
      console.log('Room available overall:', isAvailable);
      console.log('===============================');
      
      return isAvailable;
    } catch (error) {
      console.error('Error checking room availability:', error);
      console.log('===============================');
      return true; // Assume available if check fails
    }
  };

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
    async function loadRooms() {
      setLoadingRooms(true);
      try {
        const data = await apiGet('/api/rooms');
        if (Array.isArray(data)) {
          const normalizedRooms = data.map((room: any) => ({
            id: room.Id || room.id || room.RoomId,
            RoomName: room.RoomName || room.roomName || room.Name || `Room ${room.Id || room.id || room.RoomId}`
          }));
          setRooms(normalizedRooms);
        }
      } catch {
        // ignore silently; UI will show hardcoded fallback
      } finally {
        setLoadingRooms(false);
      }
    }
    loadRooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');

    console.log('=== SUBMIT DEBUG ===');
    console.log('Location selected:', location);
    console.log('Date:', date);
    console.log('Start time:', startTime);
    console.log('Duration:', duration);

    try {
      // Check room availability if a room is selected
      if (location) {
        console.log('Checking room availability...');
        const isRoomAvailable = await checkRoomAvailability(location, date, startTime, duration);
        if (!isRoomAvailable) {
          setFormError('The selected room is already booked for this time slot. Please choose a different room or time.');
          return;
        }
      } else {
        console.log('No room selected, skipping availability check');
      }

      // First create event without attendees
      const payload = {
        title,
        date,
        startTime,
        durationHours: duration,
        host: selectedHost,
        attendees: selectedAttendees.join(','), // Include selected attendees
        description,
        location: location || ""
      };

      console.log('Creating event with payload:', payload);

      if (event?.id) {
        // Edit existing event - use PUT
        await apiPut<any, any>(`/api/calendarevents/${event.id}`, payload);
      } else {
        // Create new event - use POST
        await apiPost<any, { eventId: number }>('/api/calendarevents', payload);
      }
      
      // Notify parent to refresh events
      onSave();
    } catch (err: any) {
      const msg = err?.message || (err?.response?.data?.message as string) || 'Failed to save event';
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (event?.id && onDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (event?.id && onDelete) {
      setShowDeleteConfirm(false);
      onDelete(event.id);
    }
  };

  return (
    <div className="event-form-container">
      <h2>{isAdding ? 'Add New Event' : 'Edit Event'}</h2>
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>Error: {error}</div>}
      {formError && <div style={{ color: 'red', marginBottom: '1rem' }}>Error: {formError}</div>}
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
        {user?.role === 'Admin' && (
          <div className="form-group">
            <label>Host:</label>
            <select value={selectedHost} onChange={e => setSelectedHost(e.target.value)} required>
              <option value="">Select a host</option>
              {users.length === 0 ? (
                <option value="">No users available</option>
              ) : (
                users.map(u => (
                  <option key={u.id} value={u.username}>
                    {u.fullName} ({u.username})
                  </option>
                ))
              )}
            </select>
          </div>
        )}
        <div className="form-group">
          <label>Attendees:</label>
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #ddd', padding: 8, borderRadius: 4 }}>
            {users.length === 0 ? (
              <div style={{ color: '#777' }}>No users available</div>
            ) : (
              users.filter(u => u.username !== user?.username).map(u => (
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
           <select value={location} onChange={e => setLocation(e.target.value)}>
            <option value="">Select a room (optional)</option>
            {loadingRooms ? (
              <option value="">Loading rooms...</option>
            ) : rooms.length > 0 ? (
              rooms.map(room => (
                <option key={room.id} value={room.id.toString()}>
                  {room.RoomName}
                </option>
              ))
            ) : (
              <>
                <option value="1">Room 1</option>
                <option value="2">Room 2</option>
                <option value="3">Room 3</option>
                <option value="4">Room 4</option>
                <option value="5">Room 5</option>
                <option value="6">Room 6</option>
                <option value="7">Room 7</option>
                <option value="8">Room 8</option>
                <option value="9">Room 9</option>
              </>
            )}
          </select>
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
