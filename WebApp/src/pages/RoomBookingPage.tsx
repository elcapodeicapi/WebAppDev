import { useState, useEffect } from 'react';
import Navbar from '../components/NavBar';
import { apiPost, apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './RoomBookingPage.css';

type BookingFormState = {
  roomId: string;
  date: string;
  startTime: string;
  durationHours: string;
  purpose: string;
};

type Room = {
  id: number;
  RoomName: string;
  Capacity: number;
  Location: string;
};

export default function RoomBookingPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<BookingFormState>({
    roomId: '',
    date: '',
    startTime: '09:00',
    durationHours: '1',
    purpose: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Fetch rooms when component loads
  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    setLoadingRooms(true);
    setError(null);
    try {
      console.log('Fetching rooms...');
      
      // Get basic rooms list
      const data = await apiGet('/api/rooms');
      console.log('Rooms data:', data);
      
      if (Array.isArray(data)) {
        // Normalize room data
        const normalizedRooms = data.map((room: any) => ({
          id: room.Id || room.id || room.RoomId,
          RoomName: room.RoomName || room.roomName || room.Name || `Room ${room.Id || room.id || room.RoomId}`,
          Capacity: room.Capacity || room.capacity || 0,
          Location: room.Location || room.location || 'Unknown'
        }));
        
        console.log('Normalized rooms:', normalizedRooms);
        setRooms(normalizedRooms);
      } else {
        throw new Error('Invalid rooms data format');
      }
    } catch (e: any) {
      console.error('Error fetching rooms:', e);
      setError('Failed to load rooms. Please try again.');
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Check if user is authenticated
    if (!user) {
      setError('You must be logged in to book a room');
      return;
    }

    // Validation
    if (!form.roomId || !form.date || !form.startTime || !form.durationHours) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Create booking payload
      const bookingPayload = {
        roomId: parseInt(form.roomId),
        date: form.date,
        startTime: form.startTime,
        durationHours: parseInt(form.durationHours),
        purpose: form.purpose || 'Meeting',
      };

      console.log('=== BOOKING REQUEST DEBUG ===');
      console.log('Sending booking request:', bookingPayload);
      console.log('User authentication check:', user);

      // Make the API call with better error handling
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/roombookings/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
        credentials: 'include',
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      console.log('Content type:', contentType);

      if (!response.ok) {
        // Try to get error details
        let errorText = '';
        try {
          const responseText = await response.text();
          console.log('Error response text:', responseText);
          errorText = responseText;
          
          // If it's HTML, it's likely a server error page
          if (contentType && contentType.includes('text/html')) {
            throw new Error('Server returned an HTML error page. Check backend logs for details.');
          }
          
          // Try to parse as JSON if possible
          if (contentType && contentType.includes('application/json')) {
            const errorData = JSON.parse(responseText);
            throw new Error(errorData.message || 'Booking failed');
          }
        } catch (parseError) {
          throw new Error(`Booking failed: ${errorText.substring(0, 200)}...`);
        }
      }

      // Parse successful response
      const data = await response.json();
      console.log('Booking successful! Response:', data);
      
      // Show detailed success message
      if (data.booking) {
        setSuccess(`🎉 Room booked successfully! 
📍 ${data.booking.RoomName}
📅 ${data.booking.BookingDate}
⏰ ${data.booking.StartTime} - ${data.booking.EndTime}
📝 ${data.booking.Purpose || 'No purpose'}
Booking ID: ${data.bookingId}`);
      } else {
        setSuccess('Room booked successfully! 🎉');
      }
      
      // Reset form
      setForm({
        roomId: '',
        date: '',
        startTime: '09:00',
        durationHours: '1',
        purpose: '',
      });
      setSelectedRoom(null);
      
      // Refresh profile bookings by triggering a re-fetch
      console.log('Booking successful - profile should show this booking now');
      
    } catch (e: any) {
      console.error('=== BOOKING ERROR DEBUG ===');
      console.error('Error:', e);
      console.error('Error message:', e.message);
      console.error('Error stack:', e.stack);
      
      setError(e.message || 'Failed to book room');
    } finally {
      setSubmitting(false);
    }
  }

  const handleRoomSelect = (room: Room) => {
    console.log('Selecting room:', room);
    setSelectedRoom(room);
    setForm({
      ...form,
      roomId: room.id.toString()
    });
  };

  return (
    <div className="room-booking-page">
      <Navbar />
      <div className="booking-container">
        <div className="booking-header">
          <h1>🏢 Room Booking</h1>
          <p>Book a room for your meeting or event</p>
        </div>
        
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        {/* Simple Room Selection */}
        <div className="room-selection-section">
          <h2>📍 Select a Room</h2>
          {loadingRooms ? (
            <div className="loading">Loading rooms...</div>
          ) : rooms.length > 0 ? (
            <div className="rooms-grid">
              {rooms.map(room => (
                <div 
                  key={room.id} 
                  className={`room-card ${selectedRoom?.id === room.id ? 'selected' : ''}`}
                  onClick={() => handleRoomSelect(room)}
                >
                  <div className="room-info">
                    <h3>{room.RoomName}</h3>
                    <p>👥 {room.Capacity} people</p>
                    <p>📍 {room.Location}</p>
                  </div>
                  <div className="room-select-indicator">
                    {selectedRoom?.id === room.id ? '✅ Selected' : '👆 Click to select'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-rooms">No rooms available</div>
          )}
        </div>

        {/* Booking Form */}
        {selectedRoom && (
          <div className="booking-form-section">
            <h2>📅 Booking Details</h2>
            <div className="selected-room-info">
              <p><strong>Selected Room:</strong> {selectedRoom.RoomName}</p>
              <p><strong>Capacity:</strong> {selectedRoom.Capacity} people</p>
              <p><strong>Location:</strong> {selectedRoom.Location}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="booking-form">
              <div className="form-row">
                <div className="form-group">
                  <label>📅 Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label>⏰ Start Time *</label>
                  <select
                    value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    required
                  >
                    <option value="08:00">8:00 AM</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="17:00">5:00 PM</option>
                    <option value="18:00">6:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>⏱️ Duration *</label>
                  <select
                    value={form.durationHours}
                    onChange={e => setForm({ ...form, durationHours: e.target.value })}
                    required
                  >
                    <option value="1">1 hour</option>
                    <option value="2">2 hours</option>
                    <option value="3">3 hours</option>
                    <option value="4">4 hours</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>📝 Purpose</label>
                  <input
                    type="text"
                    value={form.purpose}
                    onChange={e => setForm({ ...form, purpose: e.target.value })}
                    placeholder="Meeting, Study Session, etc."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? '⏳ Booking...' : '🎯 Book Room'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedRoom(null);
                    setForm({
                      roomId: '',
                      date: '',
                      startTime: '09:00',
                      durationHours: '1',
                      purpose: '',
                    });
                  }}
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
