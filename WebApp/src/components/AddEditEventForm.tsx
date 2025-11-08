// src/components/AddEditEventForm.tsx
import { useState } from 'react';
import type { JSX } from 'react';
import type { MeetingRoom } from '../MockedData/MockedData';
import { HOURS, calculateEndTime } from './constants';

interface AddEditEventFormProps {
  event?: MeetingRoom;
  isAdding: boolean; // 👈 toegevoegd
  onSave: (event: MeetingRoom) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export function AddEditEventForm({ event, isAdding, onSave, onCancel, onDelete }: AddEditEventFormProps): JSX.Element {
  const [title, setTitle] = useState(event?.title || '');
  const [date, setDate] = useState(event?.date || '');
  const [startTime, setStartTime] = useState(event?.startTime || HOURS[0]);
  const [duration, setDuration] = useState(event?.duration || 1);
  const [host, setHost] = useState(event?.host || '');
  const [attendees, setAttendees] = useState(event?.attendees.join(', ') || '');
  const [description, setDescription] = useState(event?.description || '');
  const [location, setLocation] = useState(event?.location || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: MeetingRoom = {
      id: event?.id || Date.now().toString(),
      title,
      date,
      startTime,
      endTime: calculateEndTime(startTime, duration),
      duration,
      host,
      attendees: attendees.split(',').map(s => s.trim()).filter(s => s),
      description,
      location
    };
    onSave(newEvent);
  };

  return (
    <div className="event-form-container">
      <h2>{isAdding ? 'Add New Event' : 'Edit Event'}</h2>
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
          <button type="submit" className="btn primary">Save</button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          {!isAdding && event && onDelete && (
            <button type="button" className="btn delete" onClick={() => onDelete(event.id)}>Delete</button>
          )}
        </div>
      </form>
    </div>
  );
}