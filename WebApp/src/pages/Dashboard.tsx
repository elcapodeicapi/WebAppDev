import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import Spinner from '../components/Spinner';
import '../AdminDashboard.css';

interface Participant {
  id: number;
  name: string;
  username: string;
  status: string;
}

interface AdminEvent {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  durationHours: number;
  host: string;
  location: string;
  createdByUser: string;
  participantCount: number;
  participants: Participant[];
}

interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'users'>('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [showAttendeeDropdown, setShowAttendeeDropdown] = useState(false);
  const [showHostDropdown, setShowHostDropdown] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    durationHours: 1,
    host: '',
    location: '',
    attendees: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [eventsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/events/admin/all`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/users`, { credentials: 'include' }),
      ]);

      if (!eventsRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const eventsData = await eventsRes.json();
      const usersData = await usersRes.json();

      setEvents(eventsData);
      setUsers(usersData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    });
  };

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const formatTimeForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toTimeString().slice(0, 5);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      startTime: '',
      durationHours: 1,
      host: '',
      location: '',
      attendees: '',
    });
    setEditingEventId(null);
  };

  const startCreateEvent = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const startEditEvent = (event: AdminEvent) => {
    const attendeeUsernames = event.participants
      .filter(p => p.status !== 'Host')
      .map(p => p.username)
      .join(',');
    const hostParticipant = event.participants.find(p => p.status === 'Host');
    
    setEditingEventId(event.id);
    setFormData({
      title: event.title,
      description: event.description,
      date: formatDateForInput(event.eventDate),
      startTime: formatTimeForInput(event.eventDate),
      durationHours: event.durationHours,
      host: hostParticipant?.name || event.host,
      location: event.location,
      attendees: attendeeUsernames,
    });
    setShowCreateForm(true);
  };

  const handleCreateOrUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        startTime: formData.startTime,
        durationHours: parseInt(formData.durationHours.toString()),
        host: formData.host,
        location: formData.location,
        attendees: formData.attendees,
      };

      const url = editingEventId
        ? `${API_BASE_URL}/api/events/${editingEventId}`
        : `${API_BASE_URL}/api/events`;

      const method = editingEventId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingEventId ? 'update' : 'create'} event`);
      }

      setShowCreateForm(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      setError(err.message || `Failed to ${editingEventId ? 'update' : 'create'} event`);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      setShowDeleteConfirm(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="admin-dashboard">
      <NavBar />

      <div className="dashboard-content">
        <h1>Admin Dashboard</h1>
        <p>Welcome {user?.fullName}</p>

        {error && <div className="error-message">{error}</div>}

        <div className="stats">
          <div className="stat">
            <div className="stat-number">{events.length}</div>
            <div className="stat-label">Total Events</div>
          </div>
          <div className="stat">
            <div className="stat-number">{users.length}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>

        <div className="tabs">
          <button
            className={activeTab === 'events' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('events')}
          >
            Events
          </button>
          <button
            className={activeTab === 'users' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'overview' && (
            <div>
              <h2>Recent Events</h2>
              {events.length === 0 ? (
                <p>No events</p>
              ) : (
                <div className="event-list">
                  {events.slice(0, 5).map((event) => (
                    <div key={event.id} className="event-row">
                      <div>
                        <strong>{event.title}</strong><br />
                        {formatDate(event.eventDate)} | {event.location}
                      </div>
                      <div>{event.participantCount} attendees</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <div className="header-with-btn">
                <h2>All Events</h2>
                <button className="btn-small" onClick={() => {
                  resetForm();
                  startCreateEvent();
                }}>
                  {showCreateForm ? 'Close' : 'Create Event'}
                </button>
              </div>

              {showCreateForm && (
                <div className="form-box">
                  <h3>{editingEventId ? 'Edit Event' : 'New Event'}</h3>
                  <form onSubmit={handleCreateOrUpdateEvent}>
                    <input
                      type="text"
                      placeholder="Title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                    <textarea
                      placeholder="Description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Duration (hours)"
                      min="1"
                      value={formData.durationHours}
                      onChange={(e) => setFormData({ ...formData, durationHours: parseInt(e.target.value) })}
                    />
                    <div className="custom-dropdown">
                      <button
                        type="button"
                        className="dropdown-trigger"
                        onClick={() => setShowHostDropdown(!showHostDropdown)}
                      >
                        Select Host
                      </button>
                      {showHostDropdown && (
                        <div className="dropdown-menu">
                          {users.map((u) => (
                            <label key={u.id} className="dropdown-checkbox">
                              <input
                                type="checkbox"
                                checked={formData.host === u.name}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, host: u.name });
                                    setShowHostDropdown(false);
                                  } else {
                                    setFormData({ ...formData, host: '' });
                                  }
                                }}
                              />
                              <span>{u.name} (@{u.username})</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="custom-dropdown">
                      <button
                        type="button"
                        className="dropdown-trigger"
                        onClick={() => setShowAttendeeDropdown(!showAttendeeDropdown)}
                      >
                        Select Attendees
                      </button>
                      {showAttendeeDropdown && (
                        <div className="dropdown-menu">
                          {users.map((u) => (
                            <label key={u.id} className="dropdown-checkbox">
                              <input
                                type="checkbox"
                                value={u.username}
                                checked={formData.attendees.split(',').filter(a => a.trim()).includes(u.username)}
                                onChange={(e) => {
                                  const attendeeList = formData.attendees.split(',').filter(a => a.trim());
                                  if (e.target.checked) {
                                    attendeeList.push(u.username);
                                  } else {
                                    const idx = attendeeList.indexOf(u.username);
                                    if (idx > -1) attendeeList.splice(idx, 1);
                                  }
                                  setFormData({ ...formData, attendees: attendeeList.join(',') });
                                }}
                              />
                              <span>{u.name} (@{u.username})</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                    <div className="form-buttons">
                      <button type="submit" className="btn-submit">
                        {editingEventId ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => {
                          setShowCreateForm(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <table className="simple-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Host</th>
                    <th>Attendees</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>{event.title}</td>
                      <td>{formatDate(event.eventDate)}</td>
                      <td>{event.location}</td>
                      <td>{event.host}</td>
                      <td>
                        <button
                          className="btn-count"
                          onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                        >
                          {event.participantCount}
                        </button>
                      </td>
                      <td className="action-cell">
                        <button
                          className="btn-edit"
                          onClick={() => startEditEvent(event)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => setShowDeleteConfirm(event.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {expandedEvent && (
                <div className="modal-overlay" onClick={() => setExpandedEvent(null)}>
                  <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <h3>Attendees</h3>
                    <div className="attendees-list">
                      {events
                        .find((e) => e.id === expandedEvent)
                        ?.participants.map((p) => (
                          <div key={p.id} className="attendee-row">
                            <div>{p.name}</div>
                            <div className="status-badge">{p.status}</div>
                          </div>
                        ))}
                    </div>
                    <button className="btn-cancel" onClick={() => setExpandedEvent(null)}>
                      Close
                    </button>
                  </div>
                </div>
              )}

              {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
                  <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <h3>Delete Event?</h3>
                    <p>Are you sure?</p>
                    <div className="modal-buttons">
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteEvent(showDeleteConfirm)}
                      >
                        Delete
                      </button>
                      <button
                        className="btn-cancel"
                        onClick={() => setShowDeleteConfirm(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h2>All Users</h2>
              <table className="simple-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;