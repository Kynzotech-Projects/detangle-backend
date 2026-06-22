import { useState } from 'react';
import { ShieldCheck, Key, RefreshCw } from 'lucide-react';

export default function AdminManagement() {
  const [showChangeSecret, setShowChangeSecret] = useState(false);
  const [newSecret, setNewSecret] = useState('');
  const [confirmMsg, setConfirmMsg] = useState('');

  const handleChangeSecret = () => {
    if (newSecret.length < 8) {
      setConfirmMsg('Secret must be at least 8 characters');
      return;
    }
    // In a real app this would call the backend
    setConfirmMsg('Admin secret updated! (Note: Update your .env and restart server)');
    setShowChangeSecret(false);
    setNewSecret('');
  };

  return (
    <div>
      <div className="page-header">
        <h1>Admin Management</h1>
        <p>Security and access control</p>
      </div>

      {/* Current Admin Info */}
      <div className="card" style={{ padding: 28, marginBottom: 20, maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#D19371', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Super Admin</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Full access to all modules</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Auth Method</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Bearer Token (ADMIN_SECRET)</div>
          </div>
          <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Access Level</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Full Access</div>
          </div>
        </div>
      </div>

      {/* Change Secret */}
      <div className="card" style={{ padding: 28, maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Key size={18} />
          <h3 style={{ fontSize: 16, margin: 0 }}>Security</h3>
        </div>

        {!showChangeSecret ? (
          <button className="btn btn-secondary" onClick={() => setShowChangeSecret(true)}>
            <RefreshCw size={14} /> Change Admin Secret
          </button>
        ) : (
          <div>
            <div className="modal-field">
              <label>New Admin Secret</label>
              <input type="password" value={newSecret} onChange={e => setNewSecret(e.target.value)} placeholder="Minimum 8 characters" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleChangeSecret}>Update Secret</button>
              <button className="btn btn-secondary" onClick={() => { setShowChangeSecret(false); setNewSecret(''); }}>Cancel</button>
            </div>
          </div>
        )}

        {confirmMsg && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#ecfdf5', color: '#065f46', fontSize: 13 }}>
            {confirmMsg}
          </div>
        )}
      </div>
    </div>
  );
}
