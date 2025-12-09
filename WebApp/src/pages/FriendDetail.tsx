import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet } from '../lib/api';
import NavBar from '../components/NavBar';
import '../App.css';

type FriendDetail = {
  id: number;
  username: string;
  online: boolean;
  sharesBookingToday: boolean;
  upcomingBookings: Array<{ RoomId: number; BookingDate: string; StartTime: string; EndTime: string }> | any[];
  sharesEventToday?: boolean;
  upcomingEvents?: Array<{ id: number; title: string; start: string; end: string; location: string }> | any[];
};

export default function FriendDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<FriendDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const res = await apiGet<FriendDetail>(`/api/friends/detail/${id}`);
        setData(res);
      } catch (e: any) {
        setError(e.message || 'Failed to load friend');
      }
    }
    load();
  }, [id]);

  return (
    <div>
      <NavBar />
      <main className="profile-container" style={{ color: '#000' }}>
        <section className="profile-card">
          <div className="profile-left">
            <div className="profile-avatar avatar-initials">FD</div>
          </div>
          <div className="profile-right" style={{ color: '#000' }}>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            {!data ? (
              <div>Loading…</div>
            ) : (
              <>
                <h1 className="profile-name">{data.username}</h1>
                <p>{data.online ? '🟢 Online' : '⚪ Offline'}</p>
                <p>{data.sharesBookingToday ? 'Shares a booking today' : 'No shared booking today'}</p>
                <p>{data.sharesEventToday ? 'Shares an event today' : 'No shared event today'}</p>
                <h3 style={{ marginTop: 12 }}>Upcoming Bookings</h3>
                {Array.isArray(data.upcomingBookings) && data.upcomingBookings.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {data.upcomingBookings.map((b: any, i: number) => (
                      <li key={i} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                        <div>Room {b.RoomId} — {new Date(b.BookingDate).toLocaleDateString()}</div>
                        <div>{b.StartTime} — {b.EndTime}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>No upcoming bookings.</div>
                )}

                <h3 style={{ marginTop: 12 }}>Upcoming Events</h3>
                {Array.isArray(data.upcomingEvents) && data.upcomingEvents.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {data.upcomingEvents.map((e: any, i: number) => (
                      <li key={i} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                        <div style={{ fontWeight: 600 }}>{e.title}</div>
                        <div>{new Date(e.start).toLocaleString()} — {new Date(e.end).toLocaleString()}</div>
                        <div>{e.location}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>No upcoming events.</div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
