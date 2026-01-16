import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/api';
import NavBar from '../components/NavBar';
import Spinner from '../components/Spinner';
import { AddEditEventForm } from '../components/AddEditEventForm';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../AdminDashboard.css';

interface User {
  id: number;
  username: string;
  fullName: string;
  name: string; // Backend uses 'Name' field
  email?: string;
  role?: string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  durationHours: number;
  host: string;
  attendees: string;
  location: string;
  createdBy: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'events' | 'users'>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Event form states
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);
  const [isAddingEvent, setIsAddingEvent] = useState(true);
  const [formError, setFormError] = useState('');
  
  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: number, type: 'event' | 'user'} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // User edit/delete states
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [userFormError, setUserFormError] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (activeTab === 'events') {
        console.log('Fetching events...');
        // Fetch ALL events (not just user's events)
        const eventsResponse = await fetch(`${API_BASE_URL}/api/events`, { credentials: 'include' });
        if (!eventsResponse.ok) throw new Error('Failed to fetch events');
        const eventsData = await eventsResponse.json();
        setEvents(eventsData);
        console.log('Events fetched successfully');
      } else {
        console.log('Fetching users...');
        // Fetch all users from admin endpoint using direct URL
        const usersResponse = await fetch('http://localhost:5001/api/admin/users', { credentials: 'include' });
        if (!usersResponse.ok) throw new Error('Failed to fetch users');
        const usersData = await usersResponse.json();
        setUsers(usersData);
        console.log('Users fetched successfully');
      }
    } catch (err: any) {
      console.error('FetchData error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Event management functions
  const handleCreateEvent = () => {
    setEditingEvent(undefined);
    setIsAddingEvent(true);
    setShowEventForm(true);
    setFormError('');
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsAddingEvent(false);
    setShowEventForm(true);
    setFormError('');
  };

  const handleCancelEventForm = () => {
    setShowEventForm(false);
    setEditingEvent(undefined);
    setFormError('');
  };

  const handleDeleteEvent = (id: number) => {
    setItemToDelete({id, type: 'event'});
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete === null) return;
    
    setIsDeleting(true);
    try {
      let response;
      if (itemToDelete.type === 'event') {
        response = await fetch(`${API_BASE_URL}/api/calendarevents/${itemToDelete.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } else {
        // Use direct URL for admin user deletion
        response = await fetch(`http://localhost:5001/api/admin/users/${itemToDelete.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Failed to delete ${itemToDelete.type}`);
      }
      
      await fetchData();
      setShowDeleteDialog(false);
      setItemToDelete(null);
      
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message || `Failed to delete ${itemToDelete?.type}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setItemToDelete(null);
  };

  // User management functions
  const handleEditUser = (user: User) => {
    setEditingUser({
      ...user,
      name: user.fullName || user.name // Ensure name field is set
    });
    setShowUserForm(true);
    setUserFormError('');
  };

  const handleCancelUserForm = () => {
    setShowUserForm(false);
    setEditingUser(undefined);
    setUserFormError('');
  };

  const handleSaveUser = async (userData: Partial<User>) => {
    if (!editingUser) return;
    
    setIsSavingUser(true);
    setUserFormError('');
    
    try {
      console.log('Saving user with data:', userData);
      
      // Temporarily use full URL to test
      const response = await fetch(`http://localhost:5001/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response text:', errorText);
        throw new Error(errorText || 'Failed to update user');
      }
      
      console.log('User update successful');
      await fetchData();
      handleCancelUserForm();
      
    } catch (err: any) {
      console.error('User update error:', err);
      setUserFormError(err.message || 'Failed to update user');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = (id: number) => {
    setItemToDelete({id, type: 'user'});
    setShowDeleteDialog(true);
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="container mt-4 text-center">
          <Spinner />
        </div>
      </>
    );
  }

  if (error && !showEventForm) {
    return (
      <>
        <NavBar />
        <div className="container mt-4">
          <div className="alert alert-danger" role="alert">
            {error}
            <button 
              className="btn btn-outline-primary btn-sm ms-3"
              onClick={fetchData}
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="admin-dashboard">
        <div className="dashboard-content">
          <h1>Admin Dashboard</h1>
          <p>Manage events and users</p>

          {/* Tabs */}
          <div className="tabs">
            <button 
              className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Events Management
            </button>
            <button 
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users Management
            </button>
          </div>

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="tab-content">
              <div className="header-with-btn">
                <h2>All Events</h2>
                <button 
                  className="btn btn-small"
                  onClick={handleCreateEvent}
                >
                  + Add New Event
                </button>
              </div>

              {error && (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              )}

              {showEventForm && (
                <AddEditEventForm
                  event={editingEvent}
                  isAdding={isAddingEvent}
                  onSave={() => {
                    // This will be called after form submission
                    // We need to refresh the events list
                    fetchData();
                  }}
                  onCancel={handleCancelEventForm}
                  onDelete={(id: string | number) => handleDeleteEvent(Number(id))}
                  error={formError}
                />
              )}

              {!showEventForm && (
                <div className="event-list">
                  {events.length === 0 ? (
                    <div className="text-center py-5">
                      <h4 className="text-muted">No events found</h4>
                      <p className="text-muted">Create your first event to get started!</p>
                    </div>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className="event-row">
                        <div>
                          <strong>{event.title}</strong><br />
                          <small>
                            Date: {new Date(event.eventDate).toLocaleDateString()} | 
                            Time: {new Date(event.eventDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} | 
                            Duration: {event.durationHours}h | 
                            Location: {event.location || 'N/A'} | 
                            Host: {event.host}
                          </small>
                          {event.attendees && (
                            <><br /><small>Attendees: {event.attendees}</small></>
                          )}
                        </div>
                        <div>
                          <button 
                            className="btn-edit"
                            onClick={() => handleEditEvent(event)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="tab-content">
              <h2>All Users</h2>

              {error && (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              )}

              {showUserForm && (
                <div className="form-box">
                  <h3>Edit User</h3>
                  {userFormError && <div style={{ color: 'red', marginBottom: '1rem' }}>{userFormError}</div>}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveUser({
                      username: editingUser?.username,
                      name: editingUser?.fullName,
                      email: editingUser?.email,
                      role: editingUser?.role
                    });
                  }}>
                    <div className="form-group">
                      <label>Username:</label>
                      <input 
                        type="text" 
                        value={editingUser?.username || ''} 
                        onChange={(e) => setEditingUser(prev => prev ? {...prev, username: e.target.value} : undefined)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Full Name:</label>
                      <input 
                        type="text" 
                        value={editingUser?.fullName || ''} 
                        onChange={(e) => setEditingUser(prev => prev ? {
                          ...prev, 
                          fullName: e.target.value,
                          name: e.target.value // Keep both fields in sync
                        } : undefined)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Email:</label>
                      <input 
                        type="email" 
                        value={editingUser?.email || ''} 
                        onChange={(e) => setEditingUser(prev => prev ? {...prev, email: e.target.value} : undefined)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Role:</label>
                      <select 
                        value={editingUser?.role || 'User'} 
                        onChange={(e) => setEditingUser(prev => prev ? {...prev, role: e.target.value} : undefined)}
                      >
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <div className="form-buttons">
                      <button type="submit" className="btn-submit" disabled={isSavingUser}>
                        {isSavingUser ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" className="btn-cancel" onClick={handleCancelUserForm}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {users.length === 0 ? (
                <div className="text-center py-5">
                  <h4 className="text-muted">No users found</h4>
                </div>
              ) : (
                <table className="simple-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.username}</td>
                        <td>{user.fullName}</td>
                        <td>{user.email || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${user.role === 'Admin' ? 'admin' : 'user'}`}>
                            {user.role || 'User'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn-edit"
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title={`Delete ${itemToDelete?.type === 'event' ? 'Event' : 'User'}`}
        message={`Are you sure you want to delete this ${itemToDelete?.type === 'event' ? 'event' : 'user'}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
