import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import NavBar from '../components/NavBar';
import '../App.css';

type FriendInfo = {
  id: number;
  username: string;
  online: boolean;
  sameBooking: boolean;
  sameEvent?: boolean;
};

type FriendRequest = {
  requesterId: number;
  username: string;
};

export default function MyFriends() {
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestTarget, setRequestTarget] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<FriendInfo[]>('/api/friends');
      setFriends(data);
      const reqs = await apiGet<FriendRequest[]>('/api/friends/requests');
      setRequests(reqs);
    } catch (e: any) {
      setError(e.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function sendRequest() {
    setError(null);
    try {
      const username = requestTarget.trim();
      if (!username) { setError('Username is required'); return; }
      await apiPost<{ username: string }, unknown>('/api/friends/request', { username });
      setRequestTarget('');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to send request');
    }
  }

  async function accept(requesterUsername: string) {
    setError(null);
    try {
      await apiPost<{ username: string }, unknown>('/api/friends/accept', { username: requesterUsername });
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to accept');
    }
  }

  async function decline(requesterUsername: string) {
    setError(null);
    setError(`Decline not implemented server-side (pending from ${requesterUsername})`);
  }

  return (
    <div>
      <NavBar />
      <main className="profile-container" style={{ color: '#000' }}>
        <section className="profile-card">
          <div className="profile-left">
            <div className="profile-avatar avatar-initials">FR</div>
          </div>
          <div className="profile-right" style={{ color: '#000' }}>
            <h1 className="profile-name">My Friends</h1>
            {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Username to friend"
                value={requestTarget}
                onChange={(e) => setRequestTarget(e.target.value)}
              />
              <button className="primary" onClick={sendRequest}>Send Request</button>
            </div>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <>
              <h3>Incoming Friend Requests</h3>
              {requests.length === 0 ? <div>No incoming requests.</div> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {requests.map(r => (
                    <li key={r.requesterId} style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontWeight: 600 }}>{r.username}</div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button className="primary" onClick={() => accept(r.username)}>Accept</button>
                        <button onClick={() => decline(r.username)}>Decline</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <h3 style={{ marginTop: 16 }}>Your Friends</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {friends.map(f => (
                  <li key={f.id} style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontWeight: 600 }}>{f.username}</div>
                    <div>{f.online ? '🟢 Online' : '⚪ Offline'}</div>
                    <div>{f.sameBooking ? 'Also on your booking' : 'Not in your booking'}</div>
                    <div>{f.sameEvent ? 'Attending same event today' : 'No shared event today'}</div>
                    <div style={{ marginLeft: 'auto' }}>
                      <a className="primary" href={`/friend/${f.id}`}>View Details</a>
                    </div>
                  </li>
                ))}
              </ul>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
