import { useEffect, useMemo, useState } from 'react';

import '../App.css';
import '../CalendarPage.css';
import Navbar from '../components/NavBar';
import { apiGet } from '../lib/api';

type EventItem = {
  id: number;
  title: string;
  description: string;
  eventDate: string; // ISO from backend
  durationHours: number;
  host: string;
  attendees: string;
  location: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<EventItem[]>('/api/events');
        const sorted = [...(res || [])].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
        setEvents(sorted);
      } catch (e: any) {
        setError(e.message || 'Failed to load events');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredEvents = useMemo(() => {
    if (!selectedDate) return events;
    return events.filter(e => {
      const eventDay = new Date(e.eventDate).toISOString().slice(0, 10);
      return eventDay === selectedDate;
    });
  }, [events, selectedDate]);

  useEffect(() => {
    // reset current index when filter or data changes
    setCurrentIndex(0);
  }, [selectedDate, events.length]);

  return (
    <div className="calendar-page-container">
      <Navbar />
      <div className="calendar-main-content">
        <div className="calendar-container">
          <header className="header">
            <h1>All events</h1>
            <p>
              Browse all scheduled events with the correct dates, times, and locations.
            </p>
          </header>

          {/* Filters and navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '0.9rem', color: '#555', marginRight: '0.5rem' }}>Filter by date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 4, border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn"
                disabled={filteredEvents.length === 0 || currentIndex === 0}
                onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}
              >
                ← Previous
              </button>
              <button
                className="btn"
                disabled={filteredEvents.length === 0 || currentIndex >= filteredEvents.length - 1}
                onClick={() => setCurrentIndex(i => Math.min(i + 1, filteredEvents.length - 1))}
              >
                Next →
              </button>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>
                {filteredEvents.length > 0 ? `${currentIndex + 1} of ${filteredEvents.length}` : 'No events to browse'}
              </span>
            </div>
          </div>

          {/* Highlighted current event */}
          {!loading && !error && filteredEvents.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Selected event</h2>
              {(() => {
                const event = filteredEvents[currentIndex];
                const start = new Date(event.eventDate);
                const end = new Date(start.getTime() + event.durationHours * 60 * 60 * 1000);
                const isPast = start.getTime() < Date.now();
                return (
                  <div className="event-card" style={{ border: '2px solid #007bff' }}>
                    <div className="event-card-header">
                      <h2>{event.title}</h2>
                      <span className={`event-badge ${isPast ? 'event-badge-past' : 'event-badge-upcoming'}`}>
                        {isPast ? 'Past' : 'Upcoming'}
                      </span>
                    </div>
                    <p>
                      <strong>Date & time:</strong> {start.toLocaleString()} 
                      {event.durationHours > 0 && <> — {end.toLocaleString()}</>}
                    </p>
                    {event.location && (
                      <p>
                        <strong>Location:</strong> {event.location}
                      </p>
                    )}
                    {event.host && (
                      <p>
                        <strong>Host:</strong> {event.host}
                      </p>
                    )}
                    {event.attendees && (
                      <p>
                        <strong>Attendees:</strong> {event.attendees}
                      </p>
                    )}
                    <p>{event.description}</p>
                  </div>
                );
              })()}
            </div>
          )}

          <main className="events-container">
            {loading && <div>Loading events…</div>}
            {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
            {!loading && !error && filteredEvents.length === 0 && (
              <div>There are currently no events.</div>
            )}
            {!loading && !error && filteredEvents.map((event) => {
              const start = new Date(event.eventDate);
              const end = new Date(start.getTime() + event.durationHours * 60 * 60 * 1000);
              const isPast = start.getTime() < Date.now();
              return (
                <div key={event.id} className="event-card">
                  <div className="event-card-header">
                    <h2>{event.title}</h2>
                    <span className={`event-badge ${isPast ? 'event-badge-past' : 'event-badge-upcoming'}`}>
                      {isPast ? 'Past' : 'Upcoming'}
                    </span>
                  </div>
                  <p>
                    <strong>Date & time:</strong> {start.toLocaleString()} 
                    {event.durationHours > 0 && <> — {end.toLocaleString()}</>}
                  </p>
                  {event.location && (
                    <p>
                      <strong>Location:</strong> {event.location}
                    </p>
                  )}
                  {event.host && (
                    <p>
                      <strong>Host:</strong> {event.host}
                    </p>
                  )}
                  {event.attendees && (
                    <p>
                      <strong>Attendees:</strong> {event.attendees}
                    </p>
                  )}
                  <p>{event.description}</p>
                </div>
              );
            })}
          </main>
        </div>
      </div>
    </div>
  );
}