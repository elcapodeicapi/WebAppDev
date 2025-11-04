// src/components/CalendarTable.tsx
import type { JSX } from 'react';
import type { MeetingRoom } from '../MockedData/MockedData';
import { Event } from './Event';
import { HOURS, DAYS, getDateString } from './constants';

export function CalendarTable({
  weekStart,
  meetings,
  onAddMeeting,
  onMeetingClick
}: {
  weekStart: Date;
  meetings: MeetingRoom[];
  onAddMeeting: (date: Date, hour: string) => void;
  onMeetingClick: (meeting: MeetingRoom) => void;
}): JSX.Element {

  const getMeeting = (hour: string, dateStr: string) => {
    return meetings.find(m => {
      const startIndex = HOURS.indexOf(m.startTime);
      const currentIndex = HOURS.indexOf(hour);
      return m.date === dateStr && currentIndex >= startIndex && currentIndex < startIndex + m.duration;
    });
  };

  return (
    <table className="calendar-table">
      <thead>
        <tr>
          <th className="th-time">Time</th>
          {DAYS.map((day, idx) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + idx);
            return <th key={idx}>{day}<br/>{d.getDate()}/{d.getMonth()+1}</th>;
          })}
        </tr>
      </thead>
      <tbody>
        {HOURS.map(hour => (
          <tr key={hour}>
            <td className="td-time">{hour}</td>
            {DAYS.map((_, idx) => {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + idx);
              const dateStr = getDateString(date);
              const meeting = getMeeting(hour, dateStr);

              return (
                <td
                  key={idx}
                  className={`td-cell ${meeting ? 'occupied' : 'empty'}`}
                  onClick={() => meeting ? onMeetingClick(meeting) : onAddMeeting(date, hour)}
                >
                  {meeting && hour === meeting.startTime && <Event meeting={meeting} onMeetingClick={onMeetingClick} />}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}