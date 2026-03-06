import React, { useState, useEffect } from 'react';

const API_BASE = '/api/appointments';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ today: 0, thisWeek: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    customer_name: '',
    phone_number: '',
    service_needed: 2,
    appointment_date: '',
    appointment_time: '18:00',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      setAppointments(data);
      
      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      setStats({
        today: data.filter(r => r.appointment_date === today).length,
        thisWeek: data.filter(r => r.appointment_date >= today && r.appointment_date <= weekFromNow).length,
        total: data.length
      });
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppointment)
      });

      if (res.ok) {
        setShowAddForm(false);
        setNewAppointment({
          customer_name: '',
          phone_number: '',
          service_needed: 2,
          appointment_date: '',
          appointment_time: '18:00',
          notes: ''
        });
        loadData();
        alert('✅ Appointment added and SMS confirmation sent!');
      } else {
        const error = await res.json();
        alert('Failed to add appointment: ' + error.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteAppointment = async (id, name) => {
    if (!confirm(`Delete appointment for ${name}?`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
        alert('✅ Appointment deleted');
      }
    } catch (err) {
      alert('Error deleting appointment: ' + err.message);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🔧 Santa Maria Auto Repair</h1>
        <p>Voice Receptionist Dashboard • Santa Maria, CA</p>
      </div>

      <div className="nav">
        <button 
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`nav-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          🗓️ Appointments
        </button>
        <button 
          className={`nav-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('add');
            setShowAddForm(true);
          }}
        >
          ➕ Add Appointment
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats">
            <div className="stat-card">
              <div className="stat-value">{stats.today}</div>
              <div className="stat-label">Today's Appointments</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.thisWeek}</div>
              <div className="stat-label">This Week</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Appointments</div>
            </div>
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="card">
              <h2>📅 Upcoming Appointments</h2>
              {appointments.length === 0 ? (
                <div className="empty-state">
                  <h3>No appointments yet</h3>
                  <p>Add your first appointment to get started</p>
                </div>
              ) : (
                <table className="appointments-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Name</th>
                      <th>Party</th>
                      <th>Phone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.slice(0, 10).map(res => (
                      <tr key={res.id}>
                        <td>{formatDate(res.appointment_date)}</td>
                        <td>{formatTime(res.appointment_time)}</td>
                        <td>{res.customer_name}</td>
                        <td>{res.service_needed} guests</td>
                        <td>{res.phone_number}</td>
                        <td>
                          <span className={`status-badge status-${res.status}`}>
                            {res.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="card">
              <h2>🗓️ All Appointments</h2>
              {appointments.length === 0 ? (
                <div className="empty-state">
                  <h3>No appointments</h3>
                  <p>Add a appointment to get started</p>
                </div>
              ) : (
                <table className="appointments-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Name</th>
                      <th>Party</th>
                      <th>Phone</th>
                      <th>Notes</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(res => (
                      <tr key={res.id}>
                        <td>{formatDate(res.appointment_date)}</td>
                        <td>{formatTime(res.appointment_time)}</td>
                        <td>{res.customer_name}</td>
                        <td>{res.service_needed} guests</td>
                        <td>{res.phone_number}</td>
                        <td>{res.notes || '-'}</td>
                        <td>
                          <span className={`status-badge status-${res.status}`}>
                            {res.status}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-danger btn-small"
                            onClick={() => handleDeleteAppointment(res.id, res.customer_name)}
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

          {/* Add Appointment Tab */}
          {activeTab === 'add' && showAddForm && (
            <div className="card">
              <h2>➕ Add New Appointment</h2>
              <form className="form" onSubmit={handleAddAppointment}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input
                      type="text"
                      value={newAppointment.customer_name}
                      onChange={(e) => setNewAppointment({...newAppointment, customer_name: e.target.value})}
                      required
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={newAppointment.phone_number}
                      onChange={(e) => setNewAppointment({...newAppointment, phone_number: e.target.value})}
                      required
                      placeholder="805-555-1234"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Service Needed</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={newAppointment.service_needed}
                      onChange={(e) => setNewAppointment({...newAppointment, service_needed: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={newAppointment.appointment_date}
                      onChange={(e) => setNewAppointment({...newAppointment, appointment_date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Time</label>
                    <input
                      type="time"
                      value={newAppointment.appointment_time}
                      onChange={(e) => setNewAppointment({...newAppointment, appointment_time: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Notes (Optional)</label>
                    <input
                      type="text"
                      value={newAppointment.notes}
                      onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                      placeholder="Special requests, allergies, etc."
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">
                  💾 Add Appointment & Send SMS
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
