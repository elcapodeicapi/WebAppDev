import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage'; 
import RegisterPage from './pages/RegisterPage'; 
import CalenderPage from './pages/CalendarPage'; // Placeholder for future calendar page


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/calendar" element={<CalenderPage />} />
      </Routes>
    </Router>
  );
}

export default App;
