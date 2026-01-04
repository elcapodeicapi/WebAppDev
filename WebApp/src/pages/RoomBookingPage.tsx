import { useState } from 'react';
import Navbar from '../components/NavBar';
import { apiPost } from '../lib/api';

type BookingFormState = {
  roomId: string;
  date: string;
  startTime: string;
  durationHours: string;
  purpose: string;
};

export default function RoomBookingPage() {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.roomId || !form.date || !form.startTime || !form.durationHours) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/api/roombookings/book', {
        roomId: Number(form.roomId),
        date: form.date,
        startTime: form.startTime,
        durationHours: Number(form.durationHours),
        purpose: form.purpose || undefined,
      });
      setSuccess('Room booked successfully.');
    } catch (e: any) {
      setError(e.message || 'Failed to book room');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Navbar />
      <main className="profile-container" style={{ color: '#000' }}>
        <section className="profile-card">
          <div className="profile-left">
            <div className="profile-avatar avatar-initials">RB</div>
          </div>
          <div className="profile-right" style={{ color: '#000' }}>
            <h1 className="profile-name">Book a Room</h1>
            {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: 12 }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
              <label>
                Room ID
                <input
                  type="number"
                  value={form.roomId}
                  onChange={e => setForm({ ...form, roomId: e.target.value })}
                  required
                />
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  required
                />
              </label>
              <label>
                Start time
                <select
                  value={form.startTime}
                  onChange={e => setForm({ ...form, startTime: e.target.value })}
                >
                  <option value="9 AM">9 AM</option>
                  <option value="10 AM">10 AM</option>
                  <option value="11 AM">11 AM</option>
                  <option value="12 PM">12 PM</option>
                  <option value="1 PM">1 PM</option>
                  <option value="2 PM">2 PM</option>
                  <option value="3 PM">3 PM</option>
                  <option value="4 PM">4 PM</option>
                </select>
              </label>
              <label>
                Duration (hours)
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={form.durationHours}
                  onChange={e => setForm({ ...form, durationHours: e.target.value })}
                  required
                />
              </label>
              <label>
                Purpose (optional)
                <input
                  type="text"
                  value={form.purpose}
                  onChange={e => setForm({ ...form, purpose: e.target.value })}
                />
              </label>
              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? 'Booking...' : 'Book Room'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
