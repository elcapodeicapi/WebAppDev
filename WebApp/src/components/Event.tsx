// src/components/Event.tsx
import type { JSX } from 'react';
import type { MeetingRoom } from '../MockedData/MockedData';

export function Event({ meeting, onMeetingClick }: { meeting: MeetingRoom; onMeetingClick: (meeting: MeetingRoom) => void }): JSX.Element {
  return (
    <div className="meeting-block" onClick={() => onMeetingClick(meeting)}>
      <strong>{meeting.title}</strong>
      <br />
      <small>{meeting.startTime} - {meeting.endTime}</small>
    </div>
  );
}
