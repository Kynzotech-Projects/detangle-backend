import { useState } from 'react';
import { Save } from 'lucide-react';

export default function Settings() {
  const [appName] = useState('Detangle');
  const [supportEmail, setSupportEmail] = useState('support@detangle.in');
  const [telemanasNumber, setTelemanasNumber] = useState('1800-89-14416');
  const [crisisNumber, setCrisisNumber] = useState('9152987821');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>App configuration and preferences</p>
      </div>

      <div className="card" style={{ padding: 28, maxWidth: 600 }}>
        <h3 style={{ marginBottom: 20, fontSize: 16 }}>General Settings</h3>

        <div className="modal-field">
          <label>App Name</label>
          <input value={appName} disabled style={{ opacity: 0.6 }} />
        </div>

        <div className="modal-field">
          <label>Support Email</label>
          <input value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
        </div>

        <div className="modal-field">
          <label>TeleMANAS Helpline Number</label>
          <input value={telemanasNumber} onChange={e => setTelemanasNumber(e.target.value)} />
        </div>

        <div className="modal-field">
          <label>Crisis Helpline Number</label>
          <input value={crisisNumber} onChange={e => setCrisisNumber(e.target.value)} />
        </div>

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={14} /> {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
