import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage'; // You’ll need to create this
import RegisterPage from './pages/RegisterPage'; // ✅ Add this
import ContactPage from './pages/ContactPage'; // Create this too
import CalenderPage from './pages/CalendarPage'; // Placeholder for future calendar page
import EventsPage from './pages/EventsPage';
import Dashboard from './pages/Dashboard'; // Import the new Dashboard component


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/calendar" element={<CalenderPage />} />
        <Route path="/Events" element={<EventsPage />} />
        <Route path="/dashboard" element={<Dashboard />} /> {/* Route for Dashboard */}
      </Routes>
    </Router>
  );
}

export default App;
