import React from 'react';
import NavBar from '../components/NavBar';
import '../App.css';
import { useAuth } from '../context/AuthContext';
import { apiPost, apiGet } from '../lib/api';

const ProfilePage: React.FC = () => {
  const { user, initializing } = useAuth();
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({ fullName: user?.fullName ?? '', username: (user as any)?.username ?? '', email: user?.email ?? '', phoneNumber: (user as any)?.phoneNumber ?? '', jobTitle: (user as any)?.jobTitle ?? '' });
  const [bookings, setBookings] = React.useState<Array<{ roomId: number; roomName: string; bookingDate: string; startTime: string; endTime: string; purpose?: string }> | null>(null);

  React.useEffect(() => {
    if (user) {
      setForm({ fullName: user.fullName ?? '', username: (user as any).username ?? '', email: user.email ?? '', phoneNumber: (user as any).phoneNumber ?? '', jobTitle: (user as any).jobTitle ?? '' });
    }
  }, [user]);

  // Fetch upcoming bookings for this user
  React.useEffect(() => {
    let mounted = true;
    async function load() {
      const raw = window.localStorage.getItem('auth');
      const sid = raw ? (JSON.parse(raw || '{}').sessionId as string | undefined) : undefined;
      if (!sid) {
        if (mounted) setBookings([]);
        return;
      }
      try {
        const res = await apiGet<any>(`/api/auth/bookings?sid=${encodeURIComponent(sid)}`);
        if (mounted) setBookings(res || []);
      } catch (err) {
        console.error('Failed to load bookings', err);
        if (mounted) setBookings([]);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user]);
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
        <main className="profile-container">Geen ingelogde gebruiker gevonden. Log in om je profiel te zien.</main>
      </div>
    );
  }

  const initials = user.fullName
    ? user.fullName.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()
    : (user.email || '').slice(0,2).toUpperCase();

  // Placeholder stats / upcoming events — replace with real data when available
  const stats = { eventsCreated: 0, eventsAttended: 0, friends: 0 };
  
  

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

      // call API
      // Use apiPost helper which surfaces server messages
      const res = await apiPost<any, any>('/api/auth/profile', body);
      console.log('profile update response', res);

      if (!res || !res.success) {
        alert(res?.message || 'Update failed');
        return;
      }

      // update localStorage and reload to refresh AuthContext
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
    <div>
      <NavBar />
      <main className="profile-container">
        <section className="profile-card">
          <div className="profile-left">
            {/* show initials avatar fallback */}
            <div className="profile-avatar avatar-initials">{initials}</div>
            <button className="primary profile-edit">Edit Profile</button>
          </div>

          <div className="profile-right">
            <h1 className="profile-name">{user.fullName}</h1>
            <p className="profile-username">@{(user as any).username ?? '—'}</p>
            <p className="profile-email">{user.email}</p>
            <p className="profile-bio">Role: {user.role}</p>

            <div className="profile-stats">
              <div className="stat">
                <strong>{stats.eventsCreated}</strong>
                <span>Created</span>
              </div>
              <div className="stat">
                <strong>{stats.eventsAttended}</strong>
                <span>Attended</span>
              </div>
              <div className="stat">
                <strong>{stats.friends}</strong>
                <span>Friends</span>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3>Upcoming Meetings</h3>
              {bookings === null ? (
                <div>Loading meetings…</div>
              ) : bookings.length === 0 ? (
                <div>No meetings planned.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {bookings.map((b, i) => (
                    <li key={i} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                      <div style={{ fontWeight: 600 }}>{b.roomName} — {new Date(b.bookingDate).toLocaleDateString()}</div>
                      <div>{b.startTime} — {b.endTime}</div>
                      {b.purpose ? <div style={{ color: '#555' }}>{b.purpose}</div> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>


            <div style={{ marginTop: 18 }}>
              {!editing ? (
                <button className="primary" onClick={() => setEditing(true)}>Edit Profile</button>
              ) : (
                <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
                  <input placeholder="Full name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                  <input placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
                  <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  <input placeholder="Phone number" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} />
                  <input placeholder="Job title" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="primary" onClick={() => saveProfile()}>Save</button>
                    <button onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
