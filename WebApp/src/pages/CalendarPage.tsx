import { useState } from 'react';
import { generateMockMeetings } from '../MockedData/MockedData';
import type { MeetingRoom } from '../MockedData/MockedData';
import { CalendarTable } from '../components/CalendarTable';
import { Sidebar } from '../components/Sidebar';
import { Button } from '../components/Button';
import { getDateString, calculateEndTime } from '../components/constants';
import '../CalendarPage.css';
import Navbar from '../components/NavBar';

export default function CalendarPage() {
  // ---- STATE ----
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - day);
    return sunday;
  });

  const [meetings, setMeetings] = useState<MeetingRoom[]>(generateMockMeetings());
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRoom | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingRoom | null>(null);

  // ---- WEEK NAVIGATION ----
  const changeWeek = (dir: 'next' | 'prev') => {
    const newWeek = new Date(weekStart);
    newWeek.setDate(newWeek.getDate() + (dir === 'next' ? 7 : -7));
    setWeekStart(newWeek);
  };

  // ---- EVENT HANDLERS ----
  const handleAddClick = () => {
    // Open lege Add-formulier
    setEditingMeeting(null);
    setIsAdding(true);
    setSelectedMeeting(null);
  };

  const handleSaveEvent = (event: MeetingRoom) => {
    const exists = meetings.some(m => m.id === event.id);
    const updatedMeetings = exists
      ? meetings.map(m => (m.id === event.id ? event : m))
      : [...meetings, { ...event, id: Date.now().toString() }];

    setMeetings(updatedMeetings);
    setIsAdding(false);
    setEditingMeeting(null);
    setSelectedMeeting(null);
  };

  const handleDeleteEvent = (id: string) => {
    setMeetings(meetings.filter(m => m.id !== id));
    setIsAdding(false);
    setEditingMeeting(null);
    setSelectedMeeting(null);
  };

  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditingMeeting(null);
    setSelectedMeeting(null);
  };

  const handleMeetingClick = (meeting: MeetingRoom) => {
    setSelectedMeeting(meeting);
    setEditingMeeting(null);
    setIsAdding(false);
  };

  const handleEditClick = (meeting: MeetingRoom) => {
    setEditingMeeting(meeting);
    setSelectedMeeting(null);
    setIsAdding(true);
  };

  return (
    <div className="calendar-page-container">
      <Navbar />
      <div className="calendar-main-content">
        <div className="calendar-container">
          <h1>📅 Weekly Calendar</h1>

          <div className="week-controls">
            <Button text="← Previous" onClick={() => changeWeek('prev')} />
            <Button text="Next →" onClick={() => changeWeek('next')} />
          </div>

          <CalendarTable
            weekStart={weekStart}
            meetings={meetings}
            onAddMeeting={(date, hour) => {
              setEditingMeeting({
                id: '',
                title: '',
                date: getDateString(date),
                startTime: hour,
                endTime: calculateEndTime(hour, 1),
                duration: 1,
                host: '',
                attendees: [],
                description: '',
                location: '',
              });
              setIsAdding(true);
              setSelectedMeeting(null);
            }}
            onMeetingClick={handleMeetingClick}
          />
        </div>

        <Sidebar
          selectedMeeting={selectedMeeting}
          isAdding={isAdding}
          editingMeeting={editingMeeting}
          onAddClick={handleAddClick}
          onEditClick={handleEditClick}
          onDelete={handleDeleteEvent}
          onCancel={handleCancelEdit}
          onSave={handleSaveEvent}
        />
      </div>
    </div>
  );
  }