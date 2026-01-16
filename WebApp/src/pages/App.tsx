import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import CalenderPage from './CalendarPage';
import RoomBookingPage from './RoomBookingPage';
import OfficeAttendancePage from './OfficeAttendancePage';
import AdminDashboard from './AdminDashboard';
import ProfilePage from './ProfilePage';
import EventsPage from './EventsPage';
import EventDetail from './EventDetail';
import MyFriends from './MyFriends';
import FriendDetailPage from './FriendDetail';
import InvitationsPage from './Invitations';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalenderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room-booking"
            element={
              <ProtectedRoute>
                <RoomBookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/office-attendance"
            element={
              <ProtectedRoute>
                <OfficeAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <EventsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/event/:id"
            element={
              <ProtectedRoute>
                <EventDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-friends"
            element={
              <ProtectedRoute>
                <MyFriends />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friend/:id"
            element={
              <ProtectedRoute>
                <FriendDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invitations"
            element={
              <ProtectedRoute>
                <InvitationsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<LoginPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
export default App;
