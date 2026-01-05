import { useEffect, useMemo, useState } from 'react';

import '../App.css';
import '../CalendarPage.css';
import Navbar from '../components/NavBar';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type UserSummary = {
  id: number;
  name: string;
  username: string;
  role: string;
};

type EventParticipation = {
  userId: number;
  eventId: number;
  status: string;
  user?: UserSummary | null;
};

type EventReview = {
  id: number;
  eventId: number;
  userId: number;
  rating?: number | null;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user?: UserSummary | null;
};

type EventItem = {
  id: number;
  title: string;
  description: string;
  eventDate: string; // ISO from backend
  durationHours: number;
  host: string;
  attendees: string;
  location: string;
  createdBy?: number;
  eventParticipation?: EventParticipation[];
  reviews?: EventReview[];
};

type CreateReviewRequest = { rating?: number | null; comment: string };

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewYear, setViewYear] = useState<number | null>(null);
  const [viewMonth, setViewMonth] = useState<number | null>(null); // 0-11
  const [currentIndex, setCurrentIndex] = useState(0);

  const [reviewRating, setReviewRating] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

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

  async function refreshEvents(keepEventId?: number) {
    const res = await apiGet<EventItem[]>('/api/events');
    const sorted = [...(res || [])].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    setEvents(sorted);
    if (keepEventId) {
      const idx = sorted.findIndex(e => e.id === keepEventId);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    (events || []).forEach(e => {
      const d = new Date(e.eventDate);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  useEffect(() => {
    if (events && events.length > 0) {
      const first = new Date(events[0].eventDate);
      if (!selectedDate) {
        const key = first.toISOString().slice(0, 10);
        setSelectedDate(key);
      }
      if (viewYear === null || viewMonth === null) {
        setViewYear(first.getFullYear());
        setViewMonth(first.getMonth());
      }
    } else if (viewYear === null || viewMonth === null) {
      const today = new Date();
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
  }, [events, selectedDate, viewYear, viewMonth]);

  useEffect(() => {
    if (!events || events.length === 0) return;
    const idx = Math.min(Math.max(currentIndex, 0), events.length - 1);
    const ev = events[idx];
    const d = new Date(ev.eventDate);
    const key = d.toISOString().slice(0, 10);
    if (key !== selectedDate) {
      setSelectedDate(key);
    }
  }, [currentIndex, events, selectedDate]);

  useEffect(() => {
    setReviewMsg(null);
    if (!user || !events || events.length === 0) {
      setReviewRating('');
      setReviewComment('');
      return;
    }
    const idx = Math.min(Math.max(currentIndex, 0), events.length - 1);
    const ev = events[idx];
    const myReview = (ev.reviews || []).find(r => r.userId === user.id);
    setReviewRating(myReview?.rating != null ? String(myReview.rating) : '');
    setReviewComment(myReview?.comment ?? '');
  }, [currentIndex, events, user]);

  function changeMonth(direction: 'prev' | 'next') {
    if (viewYear === null || viewMonth === null) return;
    let year = viewYear;
    let month = viewMonth + (direction === 'next' ? 1 : -1);
    if (month < 0) {
      month = 11;
      year -= 1;
    } else if (month > 11) {
      month = 0;
      year += 1;
    }
    setViewYear(year);
    setViewMonth(month);
  }

  function handleDateSearch(value: string) {
    setSelectedDate(value);
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        const key = d.toISOString().slice(0, 10);
        const idx = events.findIndex(e => new Date(e.eventDate).toISOString().slice(0, 10) === key);
        if (idx >= 0) {
          setCurrentIndex(idx);
        }
      }
    }
  }

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
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Left: full month calendar */}
            <div style={{ flex: 1.1, minWidth: '280px' }}>
              {(() => {
                const today = new Date();
                const year = viewYear ?? today.getFullYear();
                const monthIndex = viewMonth ?? today.getMonth();
                const firstDay = new Date(year, monthIndex, 1).getDay();
                const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

                const weeks: Array<Array<number | null>> = [];
                let currentDay = 1;
                let currentWeek: Array<number | null> = [];

                for (let i = 0; i < firstDay; i++) {
                  currentWeek.push(null);
                }
                while (currentDay <= daysInMonth) {
                  currentWeek.push(currentDay);
                  if (currentWeek.length === 7) {
                    weeks.push(currentWeek);
                    currentWeek = [];
                  }
                  currentDay++;
                }
                if (currentWeek.length > 0) {
                  while (currentWeek.length < 7) currentWeek.push(null);
                  weeks.push(currentWeek);
                }

                const baseDate = new Date(year, monthIndex, 1);
                const monthLabel = baseDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

                return (
                  <div style={{ borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1rem', backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button className="btn" style={{ padding: '0.25rem 0.6rem' }} onClick={() => changeMonth('prev')}>
                          ←
                        </button>
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{monthLabel}</div>
                        <button className="btn" style={{ padding: '0.25rem 0.6rem' }} onClick={() => changeMonth('next')}>
                          →
                        </button>
                      </div>
                      <div>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={e => handleDateSearch(e.target.value)}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: 4, border: '1px solid #ccc', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem', fontSize: '0.85rem' }}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} style={{ textAlign: 'center', fontWeight: 600, color: '#555' }}>{d}</div>
                      ))}
                      {weeks.map((week, wi) =>
                        week.map((day, di) => {
                          if (!day) {
                            return <div key={`${wi}-${di}`} style={{ height: '2rem' }} />;
                          }
                          const dateObj = new Date(year, monthIndex, day);
                          const key = dateObj.toISOString().slice(0, 10);
                          const hasEvent = !!eventsByDate[key];
                          const isSelected = selectedDate === key;
                          return (
                            <button
                              key={`${wi}-${di}`}
                              style={{
                                height: '2rem',
                                borderRadius: 6,
                                border: hasEvent ? '1px solid #007bff' : '1px solid transparent',
                                backgroundColor: isSelected ? '#007bff' : hasEvent ? '#e7f1ff' : 'transparent',
                                color: isSelected ? '#fff' : '#333',
                                textAlign: 'center',
                                cursor: hasEvent ? 'pointer' : 'default',
                                fontSize: '0.85rem',
                              }}
                              onClick={() => {
                                if (!hasEvent) return;
                                setSelectedDate(key);
                                const idx = events.findIndex(e => new Date(e.eventDate).toISOString().slice(0, 10) === key);
                                if (idx >= 0) setCurrentIndex(idx);
                              }}
                              disabled={!hasEvent}
                            >
                              {day}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right: events list for selected day */}
            <div style={{ flex: 1, minWidth: '260px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Events</h2>
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>
                {events.length > 0 && selectedDate
                  ? `Event on ${new Date(selectedDate).toLocaleDateString()}`
                  : 'Select a day on the calendar to see its events.'}
              </div>
              {loading && <div>Loading events…</div>}
              {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
              {!loading && !error && events.length === 0 && (
                <div>There are currently no events for the selected day.</div>
              )}
              {!loading && !error && events.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn"
                        style={{ padding: '0.25rem 0.6rem' }}
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}
                      >
                        ← Previous
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '0.25rem 0.6rem' }}
                        disabled={currentIndex >= events.length - 1}
                        onClick={() => setCurrentIndex(i => Math.min(i + 1, events.length - 1))}
                      >
                        Next →
                      </button>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>{currentIndex + 1} of {events.length}</span>
                  </div>
                  {(() => {
                    const safeIndex = Math.min(Math.max(currentIndex, 0), events.length - 1);
                    const event = events[safeIndex];

                    const start = new Date(event.eventDate);
                    const end = new Date(start.getTime() + event.durationHours * 60 * 60 * 1000);
                    const isPast = start.getTime() < Date.now();

                    const myPart = user
                      ? (event.eventParticipation || []).find(p => p.userId === user.id)
                      : undefined;
                    const isHost = !!user && (
                      (event.createdBy != null && event.createdBy === user.id) ||
                      (myPart?.status === 'Host')
                    );

                    const canWriteReview = !!user && user.role === 'Employee' && !!myPart && (myPart.status === 'Going' || myPart.status === 'Host');
                    const reviews = event.reviews || [];
                    const myReview = user ? reviews.find(r => r.userId === user.id) : undefined;

                    async function submitReview() {
                      if (!user) return;
                      setReviewMsg(null);
                      const comment = reviewComment.trim();
                      if (!comment) {
                        setReviewMsg('Please write a short review.');
                        return;
                      }

                      const ratingNum = reviewRating ? parseInt(reviewRating, 10) : null;
                      if (ratingNum != null && (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)) {
                        setReviewMsg('Rating must be between 1 and 5.');
                        return;
                      }

                      setReviewBusy(true);
                      try {
                        const body: CreateReviewRequest = { comment, rating: ratingNum };
                        await apiPost<CreateReviewRequest, any>(`/api/events/${event.id}/reviews`, body);
                        setReviewMsg('Saved.');
                        await refreshEvents(event.id);
                      } catch (e: any) {
                        setReviewMsg(e.message || 'Failed to save review');
                      } finally {
                        setReviewBusy(false);
                      }
                    }

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

                        {canWriteReview && (
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #eee' }}>
                            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Write a review</div>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>Rating</span>
                                <select
                                  value={reviewRating}
                                  onChange={e => setReviewRating(e.target.value)}
                                  style={{ padding: '0.35rem 0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
                                  disabled={reviewBusy}
                                >
                                  <option value="">(optional)</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                  <option value="4">4</option>
                                  <option value="5">5</option>
                                </select>
                              </label>
                            </div>

                            <textarea
                              value={reviewComment}
                              onChange={e => setReviewComment(e.target.value)}
                              rows={3}
                              placeholder="Write a short review..."
                              style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #ccc', resize: 'vertical' }}
                              disabled={reviewBusy}
                            />

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                              <button className="primary" onClick={submitReview} disabled={reviewBusy}>
                                {reviewBusy ? 'Saving…' : 'Save review'}
                              </button>
                              {reviewMsg && <span style={{ color: reviewMsg === 'Saved.' ? 'green' : 'red' }}>{reviewMsg}</span>}
                            </div>

                            {/* After saving, show only the employee's own review (not others) */}
                            {myReview && (
                              <div style={{ marginTop: '0.75rem' }}>
                                <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Your review</div>
                                <div style={{ padding: '0.5rem 0.6rem', border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div style={{ fontWeight: 600 }}>{myReview.rating != null ? `${myReview.rating}/5` : 'No rating'}</div>
                                    <div style={{ color: '#777', fontSize: '0.85rem' }}>{new Date(myReview.updatedAt || myReview.createdAt).toLocaleString()}</div>
                                  </div>
                                  <div style={{ marginTop: '0.25rem', color: '#333' }}>{myReview.comment}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {isHost && (
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #eee' }}>
                            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Reviews</div>
                            {reviews.length === 0 ? (
                              <div style={{ color: '#666' }}>No reviews yet.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {reviews.map(r => {
                                  const name = r.user?.name || r.user?.username || `User ${r.userId}`;
                                  const when = new Date(r.createdAt).toLocaleString();
                                  return (
                                    <div key={r.id} style={{ padding: '0.5rem 0.6rem', border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <div style={{ fontWeight: 600 }}>{name}{r.rating != null ? ` — ${r.rating}/5` : ''}</div>
                                        <div style={{ color: '#777', fontSize: '0.85rem' }}>{when}</div>
                                      </div>
                                      <div style={{ marginTop: '0.25rem', color: '#333' }}>{r.comment}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}