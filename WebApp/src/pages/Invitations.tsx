import { useEffect, useMemo, useState } from 'react';
import NavBar from '../components/NavBar';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import '../App.css';

type EventParticipation = { userId: number; eventId: number; status: string };
type EventItem = {
  id: number;
  title: string;
  description: string;
  eventDate: string; // ISO
  durationHours: number;
  host: string;
  attendees: string;
  location: string;
  createdBy: number;
  eventParticipation?: EventParticipation[];
};

export default function InvitationsPage() {
  useAuth(); // ensure auth is initialized (cookie), no direct usage needed here
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const invited = await apiGet<EventItem[]>('/api/events/invited');
        setEvents(invited);
      } catch (e: any) {
        setError(e.message || 'Failed to load invitations');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const myInvites = useMemo(() => (events || []), [events]);

  async function respond(eventId: number, status: 'Going' | 'Declined') {
    setError(null);
    try {
      // Use new attendance endpoint: require userId; infer from session via backend, but keep shape
      // If backend expects userId, Invitations page can omit it; our API layer adds cookies for session
      await apiPost(`/api/attendance`, { eventId, status });
      // refresh invitations
      const invited = await apiGet<EventItem[]>('/api/events/invited');
      setEvents(invited);
    } catch (e: any) {
      setError(e.message || 'Failed to respond');
    }
  }

  // Load participants for each event
  const [participants, setParticipants] = useState<Record<number, Array<{ id: number; username: string; status: string }>>>({});
  useEffect(() => {
    async function loadParts() {
      const map: Record<number, Array<{ id: number; username: string; status: string }>> = {};
      await Promise.all((events || []).map(async (e) => {
        try {
          const list = await apiGet<Array<{ id: number; username: string; status: string }>>(`/api/attendance/${e.id}/attendees`);
          map[e.id] = list;
        } catch {}
      }));
      setParticipants(map);
    }
    if (events && events.length > 0) loadParts();
  }, [events]);

  return (
    <div>
      <NavBar />
      <main className="profile-container" style={{ color: '#000' }}>
        <section className="profile-card">
          <div className="profile-left">
            <div className="profile-avatar avatar-initials">IV</div>
          </div>
          <div className="profile-right" style={{ color: '#000' }}>
            <h1 className="profile-name">Invitations</h1>
            {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
            {loading ? (
              <div>Loading…</div>
            ) : myInvites.length === 0 ? (
              <div>No invitations at the moment.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {myInvites.map(e => {
                  const start = new Date(e.eventDate);
                  const end = new Date(start.getTime() + e.durationHours * 60 * 60 * 1000);
                  return (
                    <li key={e.id} style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{e.title}</div>
                          <div>{start.toLocaleString()} — {end.toLocaleString()}</div>
                          <div>{e.location}</div>
                          <div style={{ color: '#555' }}>{e.description}</div>
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontWeight: 600 }}>Participants</div>
                            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                              {(participants[e.id] || []).map(p => (
                                <li key={p.id} style={{ color: '#333' }}>{p.username} — {p.status}</li>
                              ))}
                              {(!participants[e.id] || participants[e.id].length === 0) && (
                                <li style={{ color: '#777' }}>No participants yet</li>
                              )}
                            </ul>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="primary" onClick={() => respond(e.id, 'Going')}>Accept</button>
                          <button onClick={() => respond(e.id, 'Declined')}>Decline</button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
