import { useState, useEffect } from 'react';
import type { MeetingRoom } from '../MockedData/MockedData';
import { CalendarTable } from '../components/CalendarTable';
import { Sidebar } from '../components/Sidebar';
import { Button } from '../components/Button';
import { getDateString, calculateEndTime } from '../components/constants';
import { apiGet, apiDelete } from '../lib/api';
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

  const [meetings, setMeetings] = useState<MeetingRoom[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRoom | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch events from API on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        // Show only events the logged-in user is participating in (e.g., Going)
        const response = await apiGet<any[]>('/api/events/mine');
        // Map backend response to MeetingRoom format
        const mapped = response.map((evt: any) => {
          const eventDateTime = new Date(evt.eventDate);
          
          // Extract time from eventDate as "H AM/PM" format
          const hours = eventDateTime.getHours();
          const isAM = hours < 12;
          const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
          const startTimeStr = `${displayHour} ${isAM ? 'AM' : 'PM'}`;
          
          return {
            id: evt.id.toString(),
            title: evt.title,
            date: eventDateTime.toISOString().split('T')[0], // YYYY-MM-DD
            startTime: startTimeStr,
            endTime: calculateEndTime(startTimeStr, evt.durationHours),
            duration: evt.durationHours,
            host: evt.host,
            attendees: evt.attendees ? evt.attendees.split(',').map((s: string) => s.trim()) : [],
            description: evt.description,
            location: evt.location
          };
        });
        setMeetings(mapped);
      } catch (err: any) {
        console.error('Failed to fetch events:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

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

  const handleSaveEvent = () => {
    // Event was already saved to backend in AddEditEventForm
    // Refresh the events list to show the newly created event
    const fetchEvents = async () => {
      try {
        const response = await apiGet<any[]>('/api/events/mine');
        const mapped = response.map((evt: any) => {
          const eventDateTime = new Date(evt.eventDate);
          const hours = eventDateTime.getHours();
          const isAM = hours < 12;
          const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
          const startTimeStr = `${displayHour} ${isAM ? 'AM' : 'PM'}`;
          
          return {
            id: evt.id.toString(),
            title: evt.title,
            date: eventDateTime.toISOString().split('T')[0],
            startTime: startTimeStr,
            endTime: calculateEndTime(startTimeStr, evt.durationHours),
            duration: evt.durationHours,
            host: evt.host,
            attendees: evt.attendees ? evt.attendees.split(',').map((s: string) => s.trim()) : [],
            description: evt.description,
            location: evt.location
          };
        });
        setMeetings(mapped);
      } catch (err) {
        console.error('Failed to refresh events:', err);
      }
    };
    fetchEvents();
    setIsAdding(false);
    setEditingMeeting(null);
    setSelectedMeeting(null);
  };

  const handleDeleteEvent = (id: string | number) => {
    const confirmed = window.confirm('Are you sure you want to delete this event?');
    if (!confirmed) return;

    const deleteEvent = async () => {
      try {
        await apiDelete(`/api/events/${id}`);
        // Refresh events list
        const response = await apiGet<any[]>('/api/events/mine');
        const mapped = response.map((evt: any) => {
          const eventDateTime = new Date(evt.eventDate);
          const hours = eventDateTime.getHours();
          const isAM = hours < 12;
          const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
          const startTimeStr = `${displayHour} ${isAM ? 'AM' : 'PM'}`;
          
          return {
            id: evt.id.toString(),
            title: evt.title,
            date: eventDateTime.toISOString().split('T')[0],
            startTime: startTimeStr,
            endTime: calculateEndTime(startTimeStr, evt.durationHours),
            duration: evt.durationHours,
            host: evt.host,
            attendees: evt.attendees ? evt.attendees.split(',').map((s: string) => s.trim()) : [],
            description: evt.description,
            location: evt.location
          };
        });
        setMeetings(mapped);
        setSelectedMeeting(null);
        setEditingMeeting(null);
        setIsAdding(false);
      } catch (err) {
        console.error('Failed to delete event:', err);
        alert('Failed to delete event');
      }
    };
    deleteEvent();
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
    <div className="calendar-page-container" style={{ color: '#000' }}>
      <Navbar />
      {error && <div style={{ color: 'red', padding: '1rem' }}>{error}</div>}
      {loading && <div style={{ padding: '1rem' }}>Loading events...</div>}
      <div className="calendar-main-content">
        <div className="calendar-container" style={{ color: '#000' }}>
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