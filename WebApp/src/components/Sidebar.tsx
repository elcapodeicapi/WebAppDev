// src/components/Sidebar.tsx
import type { JSX } from 'react';
import { AddEditEventForm } from './AddEditEventForm';

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

interface SidebarProps {
  selectedMeeting: MeetingRoom | null;
  isAdding: boolean;
  editingMeeting: MeetingRoom | null;
  onAddClick: () => void;
  onEditClick: (meeting: MeetingRoom) => void;
  onDelete: (id: string | number) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function Sidebar({
  selectedMeeting,
  isAdding,
  editingMeeting,
  onAddClick,
  onEditClick,
  onDelete,
  onCancel,
  onSave
}: SidebarProps): JSX.Element {
  return (
    <div className="sidebar">
      {isAdding || editingMeeting ? (
        <AddEditEventForm
          event={editingMeeting || undefined}
          isAdding={isAdding}
          onSave={onSave}
          onCancel={onCancel}
          onDelete={editingMeeting ? onDelete : undefined}
        />
      ) : selectedMeeting ? (
        <div className="selected-event-details">
          <h2>{selectedMeeting.title}</h2>
          <p>Date: {selectedMeeting.date}</p>
          <p>Time: {selectedMeeting.startTime} - {selectedMeeting.endTime}</p>
          <p>Host: {selectedMeeting.host}</p>
          <p>Attendees: {selectedMeeting.attendees.join(', ')}</p>
          <p>Description: {selectedMeeting.description}</p>
          <p>Location: {selectedMeeting.location}</p>
          <div className="event-actions">
            <button className="btn" onClick={() => onEditClick(selectedMeeting)}>Edit</button>
            <button className="btn delete" onClick={() => onDelete(selectedMeeting.id)}>Delete</button>
          </div>
        </div>
      ) : (
        <button className="btn primary add-event-btn" onClick={onAddClick}>
          Add New Event
        </button>
      )}
    </div>
  );
}