import React from 'react';
import NavBar from '../components/NavBar'; // Assuming NavBar is in this path
import '../App.css'; // For general styling, adjust as needed

const Dashboard: React.FC = () => {
  const userName = "User Name"; // Placeholder for dynamic user name

  const upcomingEvents = [
    { id: 1, title: "Hackathon", date: "Oct 30" },
    { id: 2, title: "Board Game Night", date: "Nov 5" },
    { id: 3, title: "Workshop", date: "Nov 12" },
  ];

  return (
    <div>
      <NavBar /> {/* Assuming NavBar handles its own links */}
      <div className="dashboard-container">
        <h1>Welcome, {userName}!</h1>

        <h2>Upcoming Events</h2>
        <div className="event-list">
          {upcomingEvents.map(event => (
            <div key={event.id} className="event-card">
              <h3>Title: {event.title}</h3>
              <p>Date: {event.date}</p>
              <p>Click to see details and attend.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
