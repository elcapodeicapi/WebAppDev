import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import LoginPage from './LoginPage'; // You’ll need to create this
import RegisterPage from './RegisterPage'; // ✅ Add this // Create this too
import CalenderPage from './CalendarPage'; // Placeholder for future calendar page
import Dashboard from './Dashboard';
import EventsPage from './EventsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/calendar" element={<CalenderPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events" element={<EventsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
