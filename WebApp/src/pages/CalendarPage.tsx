import '../App.css';
import Navbar from '../components/NavBar';


export default function CalendarPage() {
  return (
    <div className="homepage">
      <Navbar />

      <div className="calendar-content">
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📅 Calendar</h1>
          <p style={{ fontSize: '1.5rem', color: '#666' }}>
            🚧 Coming Soon – Stay tuned for updates!
          </p>
        </div>
      </div>
    </div>
  );
}
