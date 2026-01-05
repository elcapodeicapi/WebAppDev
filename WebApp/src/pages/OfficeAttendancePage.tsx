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

type TodayAttendanceRecord = {
  Id: number;
  Name: string;
  Username: string;
  Status: string;
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
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendanceRecord[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);

  // Fetch attendance history and today's attendance on component mount
  useEffect(() => {
    fetchAttendanceHistory();
    fetchTodayAttendance();
  }, []);

  async function fetchAttendanceHistory() {
    setLoadingHistory(true);
    try {
      const data = await apiGet('/api/officeattendance/mine');
      console.log('Office Attendance API Response:', data);
      if (Array.isArray(data)) {
        console.log('First record:', data[0]);
      }
      setAttendanceHistory(data as AttendanceRecord[]);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch attendance history');
    } finally {
      setLoadingHistory(false);
    }
  }

  async function fetchTodayAttendance() {
    setLoadingToday(true);
    try {
      const data = await apiGet('/api/officeattendance/today');
      setTodayAttendance(data as TodayAttendanceRecord[]);
    } catch (e: any) {
      console.error('Failed to fetch today\'s attendance:', e);
    } finally {
      setLoadingToday(false);
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
      // Refresh history and today's attendance after successful submission
      fetchAttendanceHistory();
      fetchTodayAttendance();
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
        <section className="profile-card" style={{ display: 'flex', gap: '24px' }}>
          <div className="profile-left">
            <div className="profile-avatar avatar-initials">OA</div>
          </div>
          <div className="profile-right" style={{ flex: 1, color: '#000' }}>
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
                      {attendanceHistory.map(record => {
                        // Handle both PascalCase and camelCase property names
                        const recordId = (record as any).Id ?? (record as any).id;
                        const recordDate = (record as any).Date ?? (record as any).date;
                        const recordStatus = (record as any).Status ?? (record as any).status ?? '';
                        const recordUpdatedAt = (record as any).UpdatedAt ?? (record as any).updatedAt;
                        
                        // Parse date safely
                        let dateDisplay = 'Invalid Date';
                        if (recordDate) {
                          try {
                            const dateObj = new Date(recordDate);
                            if (!isNaN(dateObj.getTime())) {
                              dateDisplay = dateObj.toLocaleDateString();
                            }
                          } catch (e) {
                            console.error('Error parsing date:', recordDate, e);
                          }
                        }
                        
                        // Parse updated timestamp safely
                        let updatedDisplay = 'Invalid Date';
                        if (recordUpdatedAt) {
                          try {
                            const dateObj = new Date(recordUpdatedAt);
                            if (!isNaN(dateObj.getTime())) {
                              updatedDisplay = dateObj.toLocaleString();
                            }
                          } catch (e) {
                            console.error('Error parsing updatedAt:', recordUpdatedAt, e);
                          }
                        }
                        
                        return (
                          <tr key={recordId} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}>{dateDisplay}</td>
                            <td style={{ padding: '8px' }}>
                              <span 
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: '12px',
                                  backgroundColor: 
                                    recordStatus === 'InOffice' ? '#e8f5e9' :
                                    recordStatus === 'Remote' ? '#e3f2fd' :
                                    '#fff3e0',
                                  color:
                                    recordStatus === 'InOffice' ? '#2e7d32' :
                                    recordStatus === 'Remote' ? '#1565c0' :
                                    '#f57c00'
                                }}
                              >
                                {recordStatus || 'Unknown'}
                              </span>
                            </td>
                            <td style={{ padding: '8px', fontSize: '12px' }}>
                              {updatedDisplay}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>No attendance records found.</div>
              )}
            </div>
          </div>
          <div style={{ flex: '0 0 300px', minWidth: '250px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600 }}>
              Today's Attendance
            </h3>
            {loadingToday ? (
              <div>Loading...</div>
            ) : todayAttendance.length > 0 ? (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todayAttendance.map(user => {
                    const userStatus = (user as any).Status ?? (user as any).status ?? 'Not Set';
                    const userName = (user as any).Name ?? (user as any).name ?? 'Unknown';
                    const userId = (user as any).Id ?? (user as any).id;
                    
                    return (
                      <div
                        key={userId}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0',
                          backgroundColor: '#fafafa'
                        }}
                      >
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>{userName}</div>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '11px',
                            display: 'inline-block',
                            backgroundColor:
                              userStatus === 'InOffice' ? '#e8f5e9' :
                              userStatus === 'Remote' ? '#e3f2fd' :
                              userStatus === 'Off' ? '#fff3e0' :
                              '#f5f5f5',
                            color:
                              userStatus === 'InOffice' ? '#2e7d32' :
                              userStatus === 'Remote' ? '#1565c0' :
                              userStatus === 'Off' ? '#f57c00' :
                              '#666'
                          }}
                        >
                          {userStatus === 'InOffice' ? 'In Office' :
                           userStatus === 'Remote' ? 'Remote' :
                           userStatus === 'Off' ? 'Off' :
                           'Not Set'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>No attendance data available.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
