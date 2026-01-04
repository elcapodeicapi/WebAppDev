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
  RoomId: number;
  RoomName: string;
  Capacity: number;
  Location: string;
  TimeSlots: Array<{
    Time: string;
    Available: boolean;
    Booking: any;
  }>;
};

export default function RoomBookingPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<BookingFormState>({
    roomId: '',
    date: '',
    startTime: '9 AM',
    durationHours: '1',
    purpose: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Fetch available rooms when date changes
  useEffect(() => {
    if (form.date) {
      fetchAvailableRooms();
    } else {
      setRooms([]);
      setSelectedRoom(null);
    }
  }, [form.date]);

  async function fetchAvailableRooms() {
    setLoadingRooms(true);
    setError(null);
    try {
      console.log('Fetching rooms for date:', form.date);
      
      // First, let's test if the basic rooms API works
      try {
        const basicRooms = await apiGet('/api/rooms');
        console.log('Basic rooms data:', JSON.stringify(basicRooms, null, 2));
        
        if (!Array.isArray(basicRooms)) {
          throw new Error('Basic rooms API did not return an array');
        }
      } catch (basicError) {
        console.error('Basic rooms API failed:', basicError);
        throw new Error('Backend API is not accessible. Please check if the backend is running.');
      }
      
      // Now try the availability API
      const data = await apiGet(`/api/roombookings/available?date=${form.date}`);
      console.log('Raw room data from API:', JSON.stringify(data, null, 2));
      
      // Check if data is an array and has the expected structure
      if (!Array.isArray(data)) {
        console.error('API did not return an array:', typeof data);
        console.error('Full response:', data);
        throw new Error(`Invalid API response format. Expected array, got ${typeof data}`);
      }
      
      // Ensure the data is properly formatted
      const formattedData = (data as any[]).map(room => {
        console.log('Processing room:', room);
        
        // Check if TimeSlots exists and is an array
        if (!room.TimeSlots || !Array.isArray(room.TimeSlots)) {
          console.warn('Room has no TimeSlots or TimeSlots is not an array:', room);
          return {
            RoomId: room.RoomId || room.id || room.Id,
            RoomName: room.RoomName || room.roomName || `Room ${room.RoomId || room.id || room.Id}`,
            Capacity: room.Capacity || room.capacity || room.Capacity || 0,
            Location: room.Location || room.location || room.Location || 'Unknown',
            TimeSlots: [] // Empty array if no TimeSlots
          };
        }
        
        return {
          RoomId: room.RoomId || room.id || room.Id,
          RoomName: room.RoomName || room.roomName || `Room ${room.RoomId || room.id || room.Id}`,
          Capacity: room.Capacity || room.capacity || room.Capacity || 0,
          Location: room.Location || room.location || room.Location || 'Unknown',
          TimeSlots: room.TimeSlots || room.timeSlots || []
        };
      });
      
      console.log('Formatted room data:', JSON.stringify(formattedData, null, 2));
      setRooms(formattedData);
    } catch (e: any) {
      console.error('Error fetching rooms:', e);
      setError(e.message || 'Failed to fetch room availability');
      
      // Fallback: try to get basic room list
      try {
        const basicRooms = await apiGet('/api/rooms');
        console.log('Fallback room data:', basicRooms);
        const fallbackData = (basicRooms as any[]).map(room => ({
          RoomId: room.Id || room.id,
          RoomName: room.RoomName || room.roomName || `Room ${room.Id || room.id}`,
          Capacity: room.Capacity || room.capacity || 0,
          Location: room.Location || room.location || 'Unknown',
          TimeSlots: []
        }));
        console.log('Formatted fallback data:', fallbackData);
        setRooms(fallbackData);
        setError('Showing basic room info. Time slot availability unavailable.');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        setRooms([]);
        setError('Unable to connect to backend. Please ensure the backend is running on port 5001.');
      }
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

    console.log('User authenticated:', user);

    // Debug: Log current form state
    console.log('Room booking form submission:', {
      roomId: form.roomId,
      date: form.date,
      startTime: form.startTime,
      durationHours: form.durationHours,
      purpose: form.purpose,
      selectedRoom: selectedRoom
    });

    // Validation check with better error messages
    const missingFields = [];
    if (!form.roomId) missingFields.push('Room ID');
    if (!form.date) missingFields.push('Date');
    if (!form.startTime) missingFields.push('Start Time');
    if (!form.durationHours) missingFields.push('Duration');

    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      // Ensure date is in correct format (yyyy-MM-dd)
      const formattedDate = new Date(form.date).toISOString().split('T')[0];
      
      // Convert time format to something DateTime.TryParse can handle
      // Try multiple formats that .NET DateTime.TryParse can parse
      let formattedTime = form.startTime;
      
      // Convert "9 AM" -> "9:00:00 AM", "2 PM" -> "2:00:00 PM"
      if (!formattedTime.includes(':')) {
        formattedTime = formattedTime.replace(' AM', ':00:00 AM').replace(' PM', ':00:00 PM');
      }
      
      // Alternative: Try 24-hour format "9 AM" -> "09:00", "2 PM" -> "14:00"
      const hour24 = parseInt(formattedTime.split(':')[0]);
      const isPM = formattedTime.includes('PM');
      const hour24Format = isPM && hour24 !== 12 ? hour24 + 12 : (hour24 === 12 ? 0 : hour24);
      const time24Hour = `${hour24Format.toString().padStart(2, '0')}:00`;
      
      // Try the 24-hour format first (most reliable for DateTime.TryParse)
      const finalTimeFormat = time24Hour;
      
      const bookingPayload = {
        roomId: Number(form.roomId),
        date: formattedDate,
        startTime: finalTimeFormat,
        durationHours: Number(form.durationHours),
        purpose: form.purpose || 'Meeting',
      };

      console.log('=== ROOM BOOKING DEBUG ===');
      console.log('Original form.date:', form.date);
      console.log('Formatted date:', formattedDate);
      console.log('Original startTime:', form.startTime);
      console.log('12-hour format:', formattedTime);
      console.log('24-hour format:', time24Hour);
      console.log('Final time being sent:', finalTimeFormat);
      console.log('RoomId:', Number(form.roomId));
      console.log('DurationHours:', Number(form.durationHours));
      console.log('Purpose:', form.purpose || 'Meeting');
      console.log('Full payload:', bookingPayload);
      console.log('========================');

      const response = await apiPost('/api/roombookings/book', bookingPayload);
      
      console.log('Room booking successful:', response);
      setSuccess('Room booked successfully!');
      
      // Reset form
      setForm({
        roomId: '',
        date: form.date,
        startTime: '9 AM',
        durationHours: '1',
        purpose: '',
      });
      setSelectedRoom(null);
      
      // Refresh room availability
      fetchAvailableRooms();
    } catch (e: any) {
      console.error('=== ROOM BOOKING ERROR ===');
      console.error('Error object:', e);
      console.error('Error message:', e.message);
      console.error('Error response:', e.response);
      console.error('Error status:', e.response?.status);
      console.error('Error status text:', e.response?.statusText);
      console.error('Error data:', e.response?.data);
      console.error('Full error:', JSON.stringify(e, null, 2));
      console.error('========================');
      
      // Extract detailed error message from backend
      let errorMessage = 'Failed to book room';
      if (e.response?.data?.message) {
        errorMessage = `Backend error: ${e.response.data.message}`;
      } else if (e.response?.data) {
        errorMessage = `Backend response: ${JSON.stringify(e.response.data)}`;
      } else if (e.message) {
        errorMessage = `Network error: ${e.message}`;
      } else if (e.response?.status === 400) {
        errorMessage = 'Bad Request (400) - Invalid data sent to server';
      } else if (e.response?.status === 401) {
        errorMessage = 'Unauthorized (401) - You need to be logged in';
      } else if (e.response?.status === 404) {
        errorMessage = 'Not Found (404) - Room not found';
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const handleTimeSlotSelect = (room: Room, timeSlot: string) => {
    try {
      console.log('Selecting time slot:', room.RoomName, timeSlot);
      console.log('Room data:', room);
      
      setSelectedRoom(room);
      
      // Extract the start time from the slot (e.g., "09:00 - 10:00" -> "9 AM")
      const startTime = timeSlot.split(' - ')[0].trim();
      let formattedTime = startTime;
      
      // Convert 24-hour format to 12-hour format
      if (startTime.includes(':')) {
        const [hours] = startTime.split(':');
        const hour = parseInt(hours);
        const isAM = hour < 12;
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        formattedTime = `${displayHour} ${isAM ? 'AM' : 'PM'}`;
      }
      
      const newFormState = {
        ...form,
        roomId: room.RoomId.toString(),
        startTime: formattedTime
      };
      
      console.log('Setting form state:', newFormState);
      setForm(newFormState);
    } catch (e) {
      console.error('Error selecting time slot:', e);
      setError('Failed to select time slot');
    }
  };

  return (
    <div className="room-booking-page">
      <Navbar />
      <div className="booking-container">
        <div className="booking-header">
          <h1>🏢 Room Booking</h1>
          <p>Select a date and choose an available time slot to book a room</p>
        </div>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <div className="booking-content">
          <div className="date-selection">
            <label className="form-label">
              Select Date
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
                className="form-input"
              />
            </label>
          </div>

          {form.date && (
            <div className="rooms-section">
              <h2>Available Rooms</h2>
              {loadingRooms ? (
                <div className="loading">Loading room availability...</div>
              ) : rooms.length > 0 ? (
                <div className="rooms-grid">
                  {rooms.map((room, roomIndex) => {
                    try {
                      return (
                        <div key={room.RoomId} className="room-card">
                          <div className="room-header">
                            <h3>{room.RoomName || `Room ${room.RoomId}`}</h3>
                            <div className="room-details">
                              <span>👥 {room.Capacity || 'N/A'} people</span>
                              <span>📍 {room.Location || 'No location'}</span>
                            </div>
                          </div>
                          <div className="time-slots">
                            <h4>
                              {room.TimeSlots && room.TimeSlots.length > 0 
                                ? 'Available Time Slots (Hourly)' 
                                : 'Room Information (Time slots unavailable)'}
                            </h4>
                            <div className="slots-grid">
                              {room.TimeSlots && room.TimeSlots.length > 0 ? (
                                room.TimeSlots.map((slot, slotIndex) => {
                                  try {
                                    console.log('Processing slot:', slot);
                                    const isAvailable = slot.Available;
                                    const timeDisplay = slot.Time || 'Unknown time';
                                    
                                    return (
                                      <button
                                        key={slotIndex}
                                        type="button"
                                        disabled={!isAvailable}
                                        onClick={() => isAvailable && handleTimeSlotSelect(room, slot.Time)}
                                        className={`time-slot ${!isAvailable ? 'booked' : 'available'} ${selectedRoom?.RoomId === room.RoomId && form.startTime === timeDisplay.split(' - ')[0].trim() ? 'selected' : ''}`}
                                        title={isAvailable ? `Click to book ${timeDisplay}` : `Already booked: ${timeDisplay}`}
                                      >
                                        <span className="time">{timeDisplay}</span>
                                        {!isAvailable && <span className="status">Booked</span>}
                                        {isAvailable && <span className="status">Available</span>}
                                      </button>
                                    );
                                  } catch (slotError) {
                                    console.error('Error rendering time slot:', slotError);
                                    return <div key={slotIndex} className="time-slot booked">Error</div>;
                                  }
                                })
                              ) : (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1rem' }}>
                                  <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                                    Time slot availability not available for this room.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleTimeSlotSelect(room, '9 AM')}
                                    className="time-slot available"
                                    style={{ marginTop: '0.5rem' }}
                                  >
                                    Select This Room
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    } catch (roomError) {
                      console.error('Error rendering room:', roomError);
                      return <div key={roomIndex} className="room-card error">Error loading room</div>;
                    }
                  })}
                </div>
              ) : (
                <div className="no-rooms">No rooms available for the selected date.</div>
              )}
            </div>
          )}

          <div className="booking-form-section">
            <h2>Booking Details</h2>
            <form onSubmit={handleSubmit} className="booking-form">
              <div className="form-group">
                <label className="form-label">
                  Selected Room
                  <input
                    type="text"
                    value={selectedRoom ? `${selectedRoom.RoomName} (${selectedRoom.Location})` : 'Please select a room and time slot above'}
                    readOnly
                    className="form-input readonly"
                  />
                </label>
              </div>

              {/* Fallback room selection */}
              <div className="form-group">
                <label className="form-label">
                  Or Select Room Manually
                  <select
                    value={form.roomId}
                    onChange={e => setForm({ ...form, roomId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select a room...</option>
                    {rooms.map(room => (
                      <option key={room.RoomId} value={room.RoomId}>
                        {room.RoomName} - {room.Capacity} people - {room.Location}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Start Time
                  <select
                    value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    className="form-select"
                    required
                  >
                    <option value="8 AM">8 AM</option>
                    <option value="9 AM">9 AM</option>
                    <option value="10 AM">10 AM</option>
                    <option value="11 AM">11 AM</option>
                    <option value="12 PM">12 PM</option>
                    <option value="1 PM">1 PM</option>
                    <option value="2 PM">2 PM</option>
                    <option value="3 PM">3 PM</option>
                    <option value="4 PM">4 PM</option>
                    <option value="5 PM">5 PM</option>
                  </select>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Duration (hours)
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={form.durationHours}
                    onChange={e => setForm({ ...form, durationHours: e.target.value })}
                    className="form-input"
                    required
                  />
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Purpose
                  <input
                    type="text"
                    value={form.purpose}
                    onChange={e => setForm({ ...form, purpose: e.target.value })}
                    placeholder="e.g., Team meeting, client presentation"
                    className="form-input"
                  />
                </label>
              </div>

              <button 
                type="submit" 
                className="btn-primary"
                disabled={submitting || !selectedRoom}
              >
                {submitting ? 'Booking...' : '📅 Book Room'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
