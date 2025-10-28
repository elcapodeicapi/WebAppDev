import React from 'react';
import NavBar from '../components/NavBar'; 
import '../App.css'; 

const Dashboard: React.FC = () => {
  const userName = "User Name"; 

  const upcomingEvents = [
    { id: 1, title: "Move Night", date: "Oct 30" },
    { id: 2, title: "Game Night", date: "Nov 5" },
    { id: 3, title: "Sport Night", date: "Nov 12" },
  ];

  return (
    <div>
      <NavBar /> {}
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