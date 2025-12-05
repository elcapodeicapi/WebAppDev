// src/components/AddEditEventForm.tsx
import { useState } from 'react';
import type { JSX } from 'react';
import { HOURS } from './constants';
import { apiPost, apiPut } from '../lib/api';

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
  onSave: (event: EventData) => void;
  onCancel: () => void;
  onDelete?: (id: string | number) => void;
}

export function AddEditEventForm({ event, isAdding, onSave, onCancel, onDelete }: AddEditEventFormProps): JSX.Element {
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
  const [host, setHost] = useState(event?.host || '');
  const [attendees, setAttendees] = useState(getAttendeesValue());
  const [description, setDescription] = useState(event?.description || '');
  const [location, setLocation] = useState(event?.location || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        attendees,
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
      
      // Refresh by calling the onSave callback which will refresh events
      onSave({ ...event, ...payload } as any);
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
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
          <input type="text" value={host} onChange={e => setHost(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Attendees (comma separated):</label>
          <input type="text" value={attendees} onChange={e => setAttendees(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Description:</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}></textarea>
        </div>
        <div className="form-group">
          <label>Location:</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)} />
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