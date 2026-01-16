import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/api';
import NavBar from '../components/NavBar';
import Spinner from '../components/Spinner';
import { AddEditEventForm } from '../components/AddEditEventForm';
import '../AdminDashboard.css';

export default function Dashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch events only
      const eventsResponse = await fetch(`${API_BASE_URL}/api/events/mine`, { credentials: 'include' });

      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const eventsData = await eventsResponse.json();
      setEvents(eventsData);
      
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    setEditingEvent(undefined);
    setIsAdding(true);
    setShowForm(true);
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setIsAdding(false);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEvent(undefined);
  };

  const handleDeleteEvent = async (id: string | number) => {
    // If delete is initiated from AddEditEventForm, it already shows a confirmation dialog.
    if (!showForm && !window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/calendarevents/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to delete event');
      }
      await fetchData();

      // If we deleted the event we were editing, close the form.
      if (showForm && editingEvent?.id?.toString?.() === id?.toString?.()) {
        handleCancelForm();
      }
      
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete event');
    }
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

  if (error && !showForm) {
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
      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>My Events</h2>
          <button 
            className="btn btn-primary"
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

        {showForm && (
          <AddEditEventForm
            event={editingEvent}
            isAdding={isAdding}
            onSave={() => {
              void fetchData();
              handleCancelForm();
            }}
            onCancel={handleCancelForm}
            onDelete={handleDeleteEvent}
            error={''}
          />
        )}

        {!showForm && (
          <div className="row">
            {events.length === 0 ? (
              <div className="col-12 text-center py-5">
                <h4 className="text-muted">No events found</h4>
                <p className="text-muted">Create your first event to get started!</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="col-md-6 col-lg-4 mb-4">
                  <div className="card h-100">
                    <div className="card-body">
                      <h5 className="card-title">{event.title}</h5>
                      <p className="card-text">
                        <strong>Date:</strong> {event.date}<br />
                        <strong>Time:</strong> {event.startTime}<br />
                        <strong>Duration:</strong> {event.durationHours} hours<br />
                        <strong>Location:</strong> {event.location}<br />
                        <strong>Host:</strong> {event.host || 'You'}
                      </p>
                      {event.attendees && (
                        <p className="card-text">
                          <strong>Attendees:</strong> {event.attendees}
                        </p>
                      )}
                    </div>
                    <div className="card-footer d-flex gap-2">
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => handleEditEvent(event)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDeleteEvent(event.id!)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
