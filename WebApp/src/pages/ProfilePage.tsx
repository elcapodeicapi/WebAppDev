import React from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import '../App.css';
import '../CalendarPage.css';
import { useAuth } from '../context/AuthContext';
import { apiPost, apiGet } from '../lib/api';

const ProfilePage: React.FC = () => {
  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({ fullName: user?.fullName ?? '', username: (user as any)?.username ?? '', email: user?.email ?? '', phoneNumber: (user as any)?.phoneNumber ?? '', jobTitle: (user as any)?.jobTitle ?? '' });
  const [events, setEvents] = React.useState<Array<any> | null>(null);
  const [roomBookings, setRoomBookings] = React.useState<Array<any> | null>(null);
  const [refreshBookings, setRefreshBookings] = React.useState(0);

  React.useEffect(() => {
    if (user) {
      setForm({ fullName: user.fullName ?? '', username: (user as any).username ?? '', email: user.email ?? '', phoneNumber: (user as any).phoneNumber ?? '', jobTitle: (user as any).jobTitle ?? '' });
    }
  }, [user]);



  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const now = new Date();

        let res = await apiGet<any[]>('/api/events/mine');
        let upcoming = (res || [])
          .filter(e => new Date(e.eventDate) >= now)
          .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

        if (upcoming.length === 0) {
          res = await apiGet<any[]>('/api/events/upcoming');
          upcoming = (res || [])
            .filter(e => new Date(e.eventDate) >= now)
            .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
        }

        if (mounted) setEvents(upcoming);
      } catch (err) {
        console.error('Failed to load events', err);
        if (mounted) setEvents([]);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    async function loadBookings() {
      try {
        console.log('=== PROFILE: Starting room bookings fetch ===');
        console.log('User authenticated:', !!user);
        console.log('User ID:', (user as any)?.id);
        
        if (!user) {
          console.log('=== PROFILE: No user found, skipping bookings fetch ===');
          if (mounted) setRoomBookings([]);
          return;
        }
        
        console.log('=== PROFILE: Fetching room bookings from API ===');
        const res = await apiGet<any[]>('/api/roombookings/mine');
        console.log('Raw API response:', res);
        console.log('Response type:', typeof res);
        console.log('Is array:', Array.isArray(res));
        console.log('Array length:', res?.length);
        
        if (Array.isArray(res)) {
          console.log('=== PROFILE: Room bookings data analysis ===');
          res.forEach((booking, index) => {
            console.log(`Booking ${index}:`, {
              id: booking.Id,
              roomName: booking.RoomName,
              numberOfPeople: booking.NumberOfPeople || booking.numberOfPeople,
              bookingDate: booking.BookingDate,
              startTime: booking.StartTime,
              endTime: booking.EndTime,
              purpose: booking.Purpose,
              durationHours: booking.DurationHours
            });
          });
        }
        
        if (mounted) setRoomBookings(res || []);
      } catch (err: any) {
        console.error('=== PROFILE: Failed to load room bookings ===');
        console.error('Error:', err);
        console.error('Error response:', err.response);
        console.error('Error status:', err.response?.status);
        console.error('Error message:', err.message);
        
        if (err.response?.status === 401) {
          console.log('=== PROFILE: Authentication error - user not logged in ===');
          if (mounted) setRoomBookings([]);
        } else {
          if (mounted) setRoomBookings([]);
        }
      }
    }
    loadBookings();
    return () => { mounted = false; };
  }, [refreshBookings, user]); // Re-fetch when refreshBookings changes or user changes
  if (initializing) {
    return (
      <div>
        <NavBar />
        <main className="profile-container">Loading profile…</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <NavBar />
        <main className="profile-container">No logged-in user found. Please log in to view your profile.</main>
      </div>
    );
  }

  const initials = user.fullName
    ? user.fullName.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()
    : (user.email || '').slice(0,2).toUpperCase();

  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [pastFrom, setPastFrom] = React.useState<string | null>(null);
  const [pastTo, setPastTo] = React.useState<string | null>(null);

  const eventsByDate = React.useMemo(() => {
    const map: Record<string, Array<any>> = {};
    (events || []).forEach(e => {
      const d = new Date(e.eventDate);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  const selectedEvents = React.useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] || [];
  }, [selectedDate, eventsByDate]);

  React.useEffect(() => {
    if (!selectedDate && events && events.length > 0) {
      const first = events[0];
      const d = new Date(first.eventDate);
      const key = d.toISOString().slice(0, 10);
      setSelectedDate(key);
    }
  }, [events, selectedDate]);

  const myUpcomingEvents = React.useMemo(() => {
    if (!events) return [];
    return events.slice(0, 3);
  }, [events]);

  const pastEvents = React.useMemo(() => {
    if (!events) return [];
    const now = new Date();
    return events
      .filter(e => new Date(e.eventDate) < now)
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }, [events]);

  const filteredPastEvents = React.useMemo(() => {
    if (!pastEvents.length) return [];
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (pastFrom) {
      fromDate = new Date(pastFrom);
    }
    if (pastTo) {
      toDate = new Date(pastTo);
      toDate.setHours(23, 59, 59, 999);
    }

    return pastEvents.filter(e => {
      const d = new Date(e.eventDate);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    }).slice(0, 5);
  }, [pastEvents, pastFrom, pastTo]);


  
  

  async function saveProfile() {
    try {
      const body = {
        sessionId: (window.localStorage.getItem('auth') ? JSON.parse(window.localStorage.getItem('auth') || '{}').sessionId : null),
        fullName: form.fullName,
        username: form.username,
        email: form.email,
        phoneNumber: form.phoneNumber,
        jobTitle: form.jobTitle
      };

      const res = await apiPost<any, any>('/api/auth/profile', body);
      console.log('profile update response', res);

      if (!res || !res.success) {
        alert(res?.message || 'Update failed');
        return;
      }

      const raw = window.localStorage.getItem('auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.user = { id: res.userId, email: res.email, fullName: res.fullName, username: res.username, role: res.role };
        window.localStorage.setItem('auth', JSON.stringify(parsed));
      }
      window.location.reload();
    } catch (err: any) {
      alert(err?.message || 'Network error');
    }
  }

  return (
    <div className="calendar-page-container">
      <NavBar />
      <div className="calendar-main-content">
        <div className="calendar-container" style={styles.container}>
          {/* Dashboard header */}
          <div className="profile-header" style={styles.profileHeader}>
            <h1 style={styles.pageTitle}>My profile</h1>
            <div style={styles.headerActions}>
              <button
                style={styles.eventsButton}
                onClick={() => navigate('/events')}
              >
                View all events
              </button>
            </div>
          </div>

          {/* Main content */}
          {editing ? (
            <div style={styles.editForm}>
              <h2 style={styles.sectionTitle}>Edit Profile</h2>
              <div style={styles.formGrid}>
                <div style={styles.formColumn}>
                  <label style={styles.label}>Full name</label>
                  <input
                    style={styles.input}
                    value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  />

                  <label style={styles.label}>Username</label>
                  <input
                    style={styles.input}
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  />

                  <label style={styles.label}>Email</label>
                  <input
                    style={styles.input}
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div style={styles.formColumn}>
                  <label style={styles.label}>Phone number</label>
                  <input
                    style={styles.input}
                    value={form.phoneNumber}
                    onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                  />

                  <label style={styles.label}>Job title</label>
                  <input
                    style={styles.input}
                    value={form.jobTitle}
                    onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                <button className="primary" style={styles.saveButton} onClick={() => saveProfile()}>Save Changes</button>
                <button style={styles.cancelButton} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={styles.sectionRow}>
              {/* Left: compact profile panel */}
              <div style={styles.sectionProfile}>
                <div style={styles.profileColumnHeader}>
                  <div className="profile-avatar avatar-initials" style={styles.avatar}>{initials}</div>
                  <div>
                    <h2 style={styles.profileColumnTitle}>{user.fullName}</h2>
                    <p style={styles.username}>@{(user as any).username ?? '—'}</p>
                    <p style={styles.email}>{user.email}</p>
                    <p style={styles.role}>Role: {user.role}</p>
                  </div>
                </div>
                <button
                  className="primary"
                  style={styles.smallEditButton}
                  onClick={() => setEditing(true)}
                >
                  Edit profile
                </button>

                <h2 style={{ ...styles.sectionTitle, marginTop: '1.25rem' }}>Profile details</h2>
                <div style={styles.detailRow}><span style={styles.detailLabel}>Full name</span><span>{user.fullName}</span></div>
                <div style={styles.detailRow}><span style={styles.detailLabel}>Username</span><span>@{(user as any).username ?? '—'}</span></div>
                <div style={styles.detailRow}><span style={styles.detailLabel}>Email</span><span>{user.email}</span></div>
                <div style={styles.detailRow}><span style={styles.detailLabel}>Phone</span><span>{(user as any).phoneNumber ?? '—'}</span></div>
                <div style={styles.detailRow}><span style={styles.detailLabel}>Job title</span><span>{(user as any).jobTitle ?? '—'}</span></div>
                <div style={styles.detailRow}><span style={styles.detailLabel}>Role</span><span>{user.role}</span></div>

                {/* Room Bookings Section */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', margin: 0 }}>My Room Bookings</h3>
                    <button
                      onClick={() => setRefreshBookings(prev => prev + 1)}
                      style={{
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Refresh
                    </button>
                  </div>
                  {!user ? (
                    <div style={{ fontSize: '0.9rem', color: '#dc2626', padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                      You need to be logged in to view your room bookings.
                      <br />
                      <a href="/login" style={{ color: '#4f46e5', textDecoration: 'underline' }}>Click here to log in</a>
                    </div>
                  ) : roomBookings === null ? (
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>Loading room bookings...</div>
                  ) : roomBookings.length === 0 ? (
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      No upcoming room bookings.
                      <br />
                      <small style={{ color: '#999' }}>Book a room to see it here!</small>
                    </div>
                  ) : (
                    <ul style={styles.list}>
                      {roomBookings.map((booking, i) => (
                        <li key={i} style={{ ...styles.listItem, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '0.5rem' }}>
                          <div style={styles.itemHeader}>
                            Room: {booking.RoomName || booking.roomName || 'Unknown Room'}
                          </div>
                          <div style={styles.itemMeta}>
                            Date: {(booking.BookingDate || booking.bookingDate) ? (() => {
                              try {
                                const dateStr = booking.BookingDate || booking.bookingDate;
                                const date = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');
                                return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
                              } catch {
                                return booking.BookingDate || booking.bookingDate;
                              }
                            })() : 'Unknown date'} • 
                            Time: {(booking.StartTime || booking.startTime) || 'Unknown'} - {(booking.EndTime || booking.endTime) || 'Unknown'}
                          </div>
                          <div style={styles.itemDetails}>
                            People: {booking.NumberOfPeople || booking.numberOfPeople || 'Unknown'}
                          </div>
                          {(booking.Purpose || booking.purpose) && (
                            <div style={styles.itemDetails}>Purpose: {booking.Purpose || booking.purpose}</div>
                          )}
                          {(booking.DurationHours || booking.durationHours) && (
                            <div style={styles.itemDetails}>Duration: {booking.DurationHours || booking.durationHours} hours</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Past events with date range filter (moved under profile details) */}
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Past events</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={styles.label}>From</label>
                      <input
                        style={{ ...styles.input, maxWidth: '180px' }}
                        type="date"
                        value={pastFrom || ''}
                        onChange={e => setPastFrom(e.target.value || null)}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>To</label>
                      <input
                        style={{ ...styles.input, maxWidth: '180px' }}
                        type="date"
                        value={pastTo || ''}
                        onChange={e => setPastTo(e.target.value || null)}
                      />
                    </div>
                  </div>

                  {filteredPastEvents.length === 0 ? (
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>No past events in this range.</div>
                  ) : (
                    <ul style={styles.list}>
                      {filteredPastEvents.map((e, i) => {
                        const start = new Date(e.eventDate);
                        const end = new Date(start.getTime() + (e.durationHours || 0) * 60 * 60 * 1000);
                        return (
                          <li key={i} style={styles.listItem}>
                            <div style={styles.itemHeader}>{e.title}</div>
                            <div style={styles.itemMeta}>{start.toLocaleString()} {e.durationHours ? `— ${end.toLocaleString()}` : ''}</div>
                            <div>{e.description}</div>
                            {e.location ? <div style={styles.itemDetails}>Location: {e.location}</div> : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Right: my upcoming events and calendar */}
              <div style={styles.sectionCalendar}>
                <h2 style={styles.sectionTitle}>
                  My upcoming events
                  {myUpcomingEvents.length > 0 && (
                    <span
                      style={styles.upcomingBadge}
                      title={myUpcomingEvents[0]?.title || 'Upcoming event'}
                    >
                      {myUpcomingEvents.length}
                    </span>
                  )}
                </h2>
                {events === null ? (
                  <div>Loading events…</div>
                ) : events.length === 0 ? (
                  <div>No events planned.</div>
                ) : (
                  <>
                    {/* Prominent upcoming list inside a highlighted card */}
                    <div style={styles.upcomingCard}>
                      <ul style={styles.list}>
                        {myUpcomingEvents.map((e, i) => {
                          const start = new Date(e.eventDate);
                          const end = new Date(start.getTime() + (e.durationHours || 0) * 60 * 60 * 1000);
                          return (
                            <li key={i} style={styles.listItem}>
                              <div style={styles.itemHeader}>{e.title}</div>
                              <div style={styles.itemMeta}>{start.toLocaleString()} {e.durationHours ? `— ${end.toLocaleString()}` : ''}</div>
                              <div>{e.description}</div>
                              {e.location ? <div style={styles.itemDetails}>Location: {e.location}</div> : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid #eee' }} />

                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Events by date</h3>
                    {/* Small month calendar */}
                    <div style={styles.miniCalendar}>
                      {(() => {
                        const today = new Date();
                        const year = today.getFullYear();
                        const monthIndex = today.getMonth();
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

                        const monthLabel = today.toLocaleString(undefined, { month: 'long', year: 'numeric' });

                        return (
                          <>
                            <div style={styles.miniCalendarHeader}>{monthLabel}</div>
                            <div style={styles.miniCalendarGrid}>
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                <div key={d} style={{ ...styles.miniCalendarDay, fontWeight: 600, color: '#555' }}>{d}</div>
                              ))}
                              {weeks.map((week, wi) =>
                                week.map((day, di) => {
                                  if (!day) {
                                    return <div key={`${wi}-${di}`} style={styles.miniCalendarDay} />;
                                  }
                                  const dateObj = new Date(year, monthIndex, day);
                                  const key = dateObj.toISOString().slice(0, 10);
                                  const hasEvent = !!eventsByDate[key];
                                  const isSelected = selectedDate === key;
                                  return (
                                    <button
                                      key={`${wi}-${di}`}
                                      style={{
                                        ...styles.miniCalendarDay,
                                        ...(hasEvent ? styles.miniCalendarDayHasEvent : {}),
                                        ...(isSelected ? styles.miniCalendarDaySelected : {}),
                                      }}
                                      onClick={() => hasEvent && setSelectedDate(key)}
                                      disabled={!hasEvent}
                                    >
                                      {day}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Details for selected day */}
                    <div style={{ marginTop: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Events on selected day</h3>
                      {selectedEvents.length === 0 ? (
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>Select a highlighted day to see its events.</div>
                      ) : (
                        <ul style={styles.list}>
                          {selectedEvents.map((e, i) => {
                            const start = new Date(e.eventDate);
                            const end = new Date(start.getTime() + (e.durationHours || 0) * 60 * 60 * 1000);
                            return (
                              <li key={i} style={styles.listItem}>
                                <div style={styles.itemHeader}>{e.title}</div>
                                <div style={styles.itemMeta}>{start.toLocaleString()} {e.durationHours ? `— ${end.toLocaleString()}` : ''}</div>
                                <div>{e.description}</div>
                                {e.location ? <div style={styles.itemDetails}>Location: {e.location}</div> : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '2rem',
    backgroundColor: '#f4f7f6',
  },
  profileCard: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    padding: '2rem',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1.5rem',
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: '1.5rem',
    marginBottom: '1.5rem',
  },
  avatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    fontWeight: 'bold',
  },
  headerInfo: {
    flexGrow: 1,
  },
  pageTitle: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 600,
  },
  name: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 600,
  },
  username: {
    margin: '0.25rem 0',
    color: '#666',
  },
  email: {
    margin: '0.25rem 0',
    color: '#666',
  },
  role: {
    margin: '0.25rem 0',
    color: '#333',
    fontWeight: 500,
  },
  headerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    alignItems: 'flex-end',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  eventsButton: {
    padding: '0.4rem 0.9rem',
    backgroundColor: 'transparent',
    color: '#007bff',
    border: '1px solid #007bff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  saveButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  section: {
    marginTop: '1.5rem',
  },
  sectionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2rem',
    marginTop: '1.5rem',
  },
  sectionHalf: {
    flex: 1,
    minWidth: '260px',
  },
  sectionCalendar: {
    flex: 1.3,
    minWidth: '280px',
  },
  sectionProfile: {
    flex: 0.9,
    minWidth: '240px',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '1rem',
    borderBottom: '1px solid #eee',
    paddingBottom: '0.5rem',
  },
  list: {
    listStyle: 'none',
    padding: 0,
  },
  listItem: {
    padding: '1rem',
    borderBottom: '1px solid #f0f0f0',
  },
  itemHeader: {
    fontWeight: 600,
    marginBottom: '0.25rem',
  },
  itemMeta: {
    fontSize: '0.9rem',
    color: '#666',
    marginBottom: '0.25rem',
  },
  itemDetails: {
    color: '#555',
    fontSize: '0.9rem',
  },
  formGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem',
  },
  formColumn: {
    flex: 1,
    minWidth: '240px',
  },
  label: {
    display: 'block',
    marginBottom: '0.25rem',
    fontSize: '0.9rem',
    color: '#555',
    fontWeight: 500,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.4rem 0',
    borderBottom: '1px solid #f7f7f7',
    fontSize: '0.95rem',
  },
  detailLabel: {
    color: '#777',
  },
  secondaryLinkButton: {
    marginTop: '0.75rem',
    padding: '0.4rem 0.75rem',
    background: 'none',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: '0.9rem',
    textAlign: 'left',
  },
  upcomingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '0.5rem',
    padding: '0.1rem 0.4rem',
    minWidth: '1.3rem',
    borderRadius: '999px',
    backgroundColor: '#007bff',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'default',
  },
  upcomingCard: {
    borderRadius: '10px',
    backgroundColor: '#e7f1ff',
    padding: '0.75rem 0.75rem 0.5rem',
    border: '1px solid #c4d7ff',
  },
  profileColumnHeader: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  profileColumnTitle: {
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: 600,
  },
  smallEditButton: {
    marginTop: '0.25rem',
    padding: '0.4rem 0.9rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  miniCalendar: {
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    padding: '0.75rem',
    backgroundColor: '#fafafa',
  },
  miniCalendarHeader: {
    fontSize: '0.95rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  miniCalendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '0.25rem',
    fontSize: '0.8rem',
  },
  miniCalendarDay: {
    border: 'none',
    borderRadius: '4px',
    padding: '0.25rem 0',
    backgroundColor: 'transparent',
    textAlign: 'center',
    cursor: 'default',
    fontSize: '0.8rem',
  },
  miniCalendarDayHasEvent: {
    cursor: 'pointer',
    border: '1px solid #007bff',
    backgroundColor: '#e7f1ff',
  },
  miniCalendarDaySelected: {
    backgroundColor: '#007bff',
    color: '#fff',
    fontWeight: 600,
  },
};
