import React from 'react';
import NavBar from '../components/NavBar';
import '../App.css';

const ProfilePage: React.FC = () => {
  const user = {
    name: 'User Name',
    email: 'user@example.com',
    bio: 'Enthousiaste community member. Houdt van spelletjes en evenementen organiseren.',
    avatar: '/assets/default-avatar.png', // fallback — ensure asset exists or replace with URL
    stats: {
      eventsCreated: 12,
      eventsAttended: 34,
      friends: 48
    },
    upcoming: [
      { id: 1, title: 'Move Night', date: 'Oct 30' },
      { id: 2, title: 'Game Night', date: 'Nov 5' }
    ]
  };

  return (
    <div>
      <NavBar />
      <main className="profile-container">
        <section className="profile-card">
          <div className="profile-left">
            <img src={user.avatar} alt="Avatar" className="profile-avatar" />
            <button className="primary profile-edit">Edit Profile</button>
          </div>

          <div className="profile-right">
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-email">{user.email}</p>
            <p className="profile-bio">{user.bio}</p>

            <div className="profile-stats">
              <div className="stat">
                <strong>{user.stats.eventsCreated}</strong>
                <span>Created</span>
              </div>
              <div className="stat">
                <strong>{user.stats.eventsAttended}</strong>
                <span>Attended</span>
              </div>
              <div className="stat">
                <strong>{user.stats.friends}</strong>
                <span>Friends</span>
              </div>
            </div>

            <h2 className="section-title">Upcoming Events</h2>
            <div className="upcoming-list">
              {user.upcoming.map(ev => (
                <div key={ev.id} className="upcoming-item">
                  <div className="upcoming-title">{ev.title}</div>
                  <div className="upcoming-date">{ev.date}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
