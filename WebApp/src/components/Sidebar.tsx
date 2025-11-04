// src/components/Sidebar.tsx
import type { JSX } from 'react';
import type { MeetingRoom } from '../MockedData/MockedData';
import { AddEditEventForm } from './AddEditEventForm';
import { Button } from './Button';

interface SidebarProps {
  selectedMeeting: MeetingRoom | null;
  isAdding: boolean;
  editingMeeting: MeetingRoom | null;
  onEditClick: (meeting: MeetingRoom) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
  onSave: (event: MeetingRoom) => void;
}

export function Sidebar({
  selectedMeeting,
  isAdding,
  editingMeeting,
  onEditClick,
  onDelete,
  onCancel,
  onSave
}: SidebarProps): JSX.Element {

  const handleAddClick = () => {
    onCancel(); // reset previous selections
  };

  return (
    <div className="sidebar">
      {isAdding || editingMeeting ? (
        <AddEditEventForm
          event={editingMeeting || undefined}
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
        <button className="btn primary add-event-btn" onClick={handleAddClick}>
          Add New Event
        </button>
      )}
    </div>
  );
}
