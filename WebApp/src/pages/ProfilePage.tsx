import React from 'react';
import NavBar from '../components/NavBar';
import '../App.css';
import { useAuth } from '../context/AuthContext';
import { apiPost, apiGet } from '../lib/api';

const ProfilePage: React.FC = () => {
  const { user, initializing } = useAuth();
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({ fullName: user?.fullName ?? '', username: (user as any)?.username ?? '', email: user?.email ?? '', phoneNumber: (user as any)?.phoneNumber ?? '', jobTitle: (user as any)?.jobTitle ?? '' });
  const [events, setEvents] = React.useState<Array<any> | null>(null);

  React.useEffect(() => {
    if (user) {
      setForm({ fullName: user.fullName ?? '', username: (user as any).username ?? '', email: user.email ?? '', phoneNumber: (user as any).phoneNumber ?? '', jobTitle: (user as any).jobTitle ?? '' });
    }
  }, [user]);



  // Fetch upcoming events
  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiGet<any[]>('/api/events/upcoming');
        if (mounted) setEvents(res || []);
      } catch (err) {
        console.error('Failed to load events', err);
        if (mounted) setEvents([]);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);
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
      <main className="profile-container" style={styles.container}>
        <section className="profile-card" style={styles.profileCard}>
          <div className="profile-header" style={styles.profileHeader}>
            <div className="profile-avatar avatar-initials" style={styles.avatar}>{initials}</div>
            <div style={styles.headerInfo}>
              <h1 style={styles.name}>{user.fullName}</h1>
              <p style={styles.username}>@{(user as any).username ?? '—'}</p>
              <p style={styles.email}>{user.email}</p>
              <p style={styles.role}>Role: {user.role}</p>
            </div>
            <button className="primary" style={styles.editButton} onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit Profile'}</button>
          </div>

          {editing ? (
            <div style={styles.editForm}>
              <h2 style={styles.sectionTitle}>Edit Profile</h2>
              <input style={styles.input} placeholder="Full name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              <input style={styles.input} placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              <input style={styles.input} placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <input style={styles.input} placeholder="Phone number" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} />
              <input style={styles.input} placeholder="Job title" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="primary" style={styles.saveButton} onClick={() => saveProfile()}>Save Changes</button>
                <button style={styles.cancelButton} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Upcoming Events</h2>
                {events === null ? (
                  <div>Loading events…</div>
                ) : events.length === 0 ? (
                  <div>No events planned.</div>
                ) : (
                  <ul style={styles.list}>
                    {events.map((e, i) => (
                      <li key={i} style={styles.listItem}>
                        <div style={styles.itemHeader}>{e.title} — {new Date(e.eventDate).toLocaleDateString()}</div>
                        <div>{e.description}</div>
                        {e.location ? <div style={styles.itemDetails}>Location: {e.location}</div> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

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
  editButton: {
    marginLeft: 'auto',
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
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
  statsContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '1rem 0',
    borderBottom: '1px solid #e0e0e0',
    marginBottom: '1.5rem',
  },
  stat: {
    textAlign: 'center',
  },
  section: {
    marginTop: '1.5rem',
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
  itemDetails: {
    color: '#555',
    fontSize: '0.9rem',
  },
};
