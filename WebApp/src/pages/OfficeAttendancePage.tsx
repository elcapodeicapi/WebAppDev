import { useState, useEffect } from 'react';
import Navbar from '../components/NavBar';
import { apiPost, apiGet } from '../lib/api';

type AttendanceFormState = {
  date: string;
  status: string;
};

type AttendanceRecord = {
  Id: number;
  Date: string;
  Status: string;
  CreatedAt: string;
  UpdatedAt: string;
};

export default function OfficeAttendancePage() {
  const [form, setForm] = useState<AttendanceFormState>({
    date: '',
    status: 'InOffice',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch attendance history on component mount
  useEffect(() => {
    fetchAttendanceHistory();
  }, []);

  async function fetchAttendanceHistory() {
    setLoadingHistory(true);
    try {
      const data = await apiGet('/api/officeattendance/mine');
      setAttendanceHistory(data as AttendanceRecord[]);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch attendance history');
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.date || !form.status) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/api/officeattendance', {
        date: form.date,
        status: form.status,
      });
      setSuccess('Attendance saved successfully.');
      // Refresh history after successful submission
      fetchAttendanceHistory();
    } catch (e: any) {
      setError(e.message || 'Failed to save attendance');
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
            <div className="profile-avatar avatar-initials">OA</div>
          </div>
          <div className="profile-right" style={{ color: '#000' }}>
            <h1 className="profile-name">Office Attendance</h1>
            {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: 12 }}>{success}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400, marginBottom: 32 }}>
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
                Status
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  <option value="InOffice">In Office</option>
                  <option value="Remote">Remote</option>
                  <option value="Off">Off</option>
                </select>
              </label>
              
              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Attendance'}
              </button>
            </form>

            <div>
              <h3>Your Attendance History</h3>
              {loadingHistory ? (
                <div>Loading attendance history...</div>
              ) : attendanceHistory.length > 0 ? (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #ccc' }}>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceHistory.map(record => (
                        <tr key={record.Id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px' }}>{new Date(record.Date).toLocaleDateString()}</td>
                          <td style={{ padding: '8px' }}>
                            <span 
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '12px',
                                backgroundColor: 
                                  record.Status === 'InOffice' ? '#e8f5e9' :
                                  record.Status === 'Remote' ? '#e3f2fd' :
                                  '#fff3e0',
                                color:
                                  record.Status === 'InOffice' ? '#2e7d32' :
                                  record.Status === 'Remote' ? '#1565c0' :
                                  '#f57c00'
                              }}
                            >
                              {record.Status}
                            </span>
                          </td>
                          <td style={{ padding: '8px', fontSize: '12px' }}>
                            {new Date(record.UpdatedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>No attendance records found.</div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
