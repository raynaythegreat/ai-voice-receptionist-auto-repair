import React, { useState, useEffect } from 'react';

const SETTINGS_KEYS = [
  { name: 'OPENAI_API_KEY', label: 'OpenAI API Key' },
  { name: 'TWILIO_ACCOUNT_SID', label: 'Twilio Account SID' },
  { name: 'TWILIO_AUTH_TOKEN', label: 'Twilio Auth Token' },
  { name: 'TWILIO_PHONE_NUMBER', label: 'Twilio Phone Number' }
];

const buildEmptyState = () => {
  return SETTINGS_KEYS.reduce((acc, key) => {
    acc[key.name] = '';
    return acc;
  }, {});
};

const buildStatusMap = () => {
  return SETTINGS_KEYS.reduce((acc, key) => {
    acc[key.name] = false;
    return acc;
  }, {});
};

const SettingsPage = () => {
  const [values, setValues] = useState(buildEmptyState);
  const [status, setStatus] = useState(buildStatusMap);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [statusError, setStatusError] = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    setStatusError('');
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) {
        throw new Error('Unable to load settings status');
      }
      const data = await res.json();
      setStatus(data.configured || buildStatusMap());
    } catch (err) {
      console.error(err);
      setStatusError('Unable to load configuration status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleChange = (name, inputValue) => {
    setValues(prev => ({ ...prev, [name]: inputValue }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSuccessMessage('');

    const payload = SETTINGS_KEYS.reduce((acc, key) => {
      acc[key.name] = values[key.name] || '';
      return acc;
    }, {});

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.error || 'Unable to save settings');
      }

      const data = await res.json();
      setStatus(data.configured || buildStatusMap());
      setSuccessMessage('API keys saved successfully.');
    } catch (err) {
      console.error(err);
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card settings-card">
      <h2>⚙️ Settings</h2>
      <p className="settings-description">
        Store the API keys used by the receptionist service. We never display the values here.
      </p>

      {(successMessage || saveError || statusError) && (
        <div className="settings-messages">
          {successMessage && <p className="settings-message settings-success">{successMessage}</p>}
          {saveError && <p className="settings-message settings-error">{saveError}</p>}
          {statusError && <p className="settings-message settings-error">{statusError}</p>}
        </div>
      )}

      {loading && (
        <p className="settings-loading">Fetching current configuration status…</p>
      )}

      <div className="settings-grid">
        {SETTINGS_KEYS.map(key => (
          <div key={key.name} className="settings-field">
            <div className="settings-field-header">
              <label htmlFor={key.name}>{key.label}</label>
              <span className={`settings-status ${status[key.name] ? 'status-ok' : 'status-missing'}`}>
                {status[key.name] ? '✅ Configured' : '❌ Missing'}
              </span>
            </div>
            <input
              id={key.name}
              type="password"
              value={values[key.name]}
              onChange={(e) => handleChange(key.name, e.target.value)}
              placeholder="Enter value"
              className="settings-input"
            />
          </div>
        ))}
      </div>

      <div className="settings-actions">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
