import { useState, useRef, useEffect, type JSX } from 'react';
import '../CalendarPage.css';

// =================== TYPES ===================
type MeetingRoom = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
};

// =================== CONSTANTS ===================
const HOURS = ['9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM']; //not whole hours
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// =================== UTILITY ===================
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function calculateEndTime(startTime: string, duration: number): string {
  const startIndex = HOURS.indexOf(startTime);
  const endIndex = Math.min(startIndex + duration - 1, HOURS.length - 1);
  return HOURS[endIndex];
}

function getMeeting(hour: string, dayStr: string, meetings: MeetingRoom[]): MeetingRoom | undefined {
  return meetings.find(m => {
    if (m.date !== dayStr) return false;
    const startIndex = HOURS.indexOf(m.startTime);
    const currentIndex = HOURS.indexOf(hour);
    return currentIndex >= startIndex && currentIndex < startIndex + m.duration;
  });
}

function addMeeting(
  date: Date,
  startTime: string,
  meetings: MeetingRoom[],
  setMeetings: React.Dispatch<React.SetStateAction<MeetingRoom[]>>
): void {
  const title = prompt('Meeting title:'); //dont use prompt, since it doesnt let you use decimal time
  if (!title) return;
  const durationStr = prompt('Duration (hours):', '1');
  const duration = parseInt(durationStr || '1');
  const endTime = calculateEndTime(startTime, duration);
  const newMeeting: MeetingRoom = {
    id: Date.now().toString(),
    title,
    date: getDateString(date),
    startTime,
    endTime,
    duration
  };
  setMeetings([...meetings, newMeeting]);
}

// =================== COMPONENTS ===================
function Button({ text, onClick }: { text: string; onClick: () => void }): JSX.Element {
  return (
    <button className="btn" onClick={onClick}>{text}</button>
  );
}

function TableHeader({ weekStart }: { weekStart: Date }): JSX.Element {
  return (
    <tr>
      <th className="th-time">Time</th>
      {DAYS.map((day, idx) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + idx);
        return (
          <th key={idx} className="th-day">
            {day} <br /> {d.getDate()}/{d.getMonth()+1}
          </th>
        );
      })}
    </tr>
  );
}

function TableRow({
  hour,
  weekStart,
  meetings,
  onAddMeeting,
  onMeetingClick
}: {
  hour: string;
  weekStart: Date;
  meetings: MeetingRoom[];
  onAddMeeting: (date: Date, hour: string) => void;
  onMeetingClick: (meeting: MeetingRoom) => void;
}): JSX.Element {
  return (
    <tr>
      <td className="td-time">{hour}</td>
      {DAYS.map((_, idx) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + idx);
        const dateStr = getDateString(date);
        const meeting = getMeeting(hour, dateStr, meetings);
        return (
          <TableCell
            key={idx}
            meeting={meeting}
            hour={hour}
            date={date}
            onAddMeeting={onAddMeeting}
            onMeetingClick={onMeetingClick}
          />
        );
      })}
    </tr>
  );
}

function TableCell({
  meeting,
  hour,
  date,
  onAddMeeting,
  onMeetingClick
}: {
  meeting: MeetingRoom | undefined;
  hour: string;
  date: Date;
  onAddMeeting: (date: Date, hour: string) => void;
  onMeetingClick: (meeting: MeetingRoom) => void;
}): JSX.Element {
  return (
    <td
      className={`td-cell ${meeting ? 'occupied' : 'empty'}`}
      onClick={() => meeting ? onMeetingClick(meeting) : onAddMeeting(date, hour)}
    >
      {meeting && hour === meeting.startTime && (
        <div className="meeting-block">
          <strong>{meeting.title}</strong>
          <br />
          <small>{meeting.startTime} - {meeting.endTime}</small>
        </div>
      )}
    </td>
  );
}

function Modal({ meeting, onClose }: { meeting: MeetingRoom; onClose: () => void }): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if(dialogRef.current) dialogRef.current.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <div className="modal-content">
        <h2>{meeting.title}</h2>
        <p>Date: {meeting.date}</p>
        <p>Time: {meeting.startTime} - {meeting.endTime}</p>
        <button className="btn" onClick={() => { dialogRef.current?.close(); onClose(); }}>Close</button>
      </div>
    </dialog>
  );
}

// =================== MAIN COMPONENT ===================
function CalendarPage(): JSX.Element {
  const [weekStart, setWeekStart] = useState(new Date());
  const [meetings, setMeetings] = useState<MeetingRoom[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRoom | null>(null);

  const changeWeek = (dir: 'next' | 'prev') => {
    const newWeek = new Date(weekStart);
    newWeek.setDate(newWeek.getDate() + (dir === 'next' ? 7 : -7));
    setWeekStart(newWeek);
  };

  return (
    <div className="calendar-container">
      <h1>📅 Weekly Calendar</h1>
      <div className="week-controls">
        <Button text="← Previous" onClick={() => changeWeek('prev')} />
        <Button text="Next →" onClick={() => changeWeek('next')} />
      </div>

      <table className="calendar-table">
        <thead>
          <TableHeader weekStart={weekStart} />
        </thead>
        <tbody>
          {HOURS.map(hour => (
            <TableRow
              key={hour}
              hour={hour}
              weekStart={weekStart}
              meetings={meetings}
              onAddMeeting={(date, h) => addMeeting(date, h, meetings, setMeetings)}
              onMeetingClick={setSelectedMeeting}
            />
          ))}
        </tbody>
      </table>

      {selectedMeeting && <Modal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />}
    </div>
  );
}

export default CalendarPage;
