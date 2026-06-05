import { useEffect, useState, useCallback } from 'react';
import { Search, Eye, Trash2, X } from 'lucide-react';
import { fetchUsers, deleteUser, updateUser } from '../api/admin';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  profilePictureUrl?: string;
  firebaseProvider: string;
  registrationStatus: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function UserModal({ user, onClose, onSave }: {
  user: User;
  onClose: () => void;
  onSave: (id: string, data: Record<string, string>) => void;
}) {
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    gender: user.gender || '',
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Edit User</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="modal-field" style={{ flex: 1 }}>
              <label>First Name</label>
              <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="modal-field" style={{ flex: 1 }}>
              <label>Last Name</label>
              <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="modal-field">
            <label>Email</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="modal-field">
            <label>Phone Number</label>
            <input value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} />
          </div>
          <div className="modal-field">
            <label>Gender</label>
            <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">— select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>
          <div className="modal-field">
            <label>Provider</label>
            <input value={user.firebaseProvider} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="modal-field">
            <label>Joined</label>
            <input value={new Date(user.createdAt).toLocaleDateString()} disabled style={{ opacity: 0.6 }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(user._id, form)}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default function Clients() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers({ page, limit: 15, search, provider: provider || undefined });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, provider]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await deleteUser(id);
    load();
  };

  const handleSave = async (id: string, data: Record<string, string>) => {
    await updateUser(id, data);
    setSelectedUser(null);
    load();
  };

  const providerBadge = (p: string) => {
    if (p === 'google.com') return <span className="badge badge-blue">Google</span>;
    if (p === 'phone') return <span className="badge badge-green">Phone</span>;
    if (p === 'apple.com') return <span className="badge badge-gray">Apple</span>;
    return <span className="badge badge-gray">{p}</span>;
  };

  const initials = (u: User) =>
    `${u.firstName[0] || ''}${u.lastName[0] || ''}`.toUpperCase();

  return (
    <div>
      <div className="page-header">
        <h1>Clients</h1>
        <p>All registered users on the platform.</p>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              style={{ paddingLeft: 32, width: '100%' }}
              placeholder="Search by name, email or phone..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <select value={provider} onChange={e => { setProvider(e.target.value); setPage(1); }}>
            <option value="">All Providers</option>
            <option value="phone">Phone</option>
            <option value="google.com">Google</option>
            <option value="apple.com">Apple</option>
          </select>
          {pagination && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {pagination.total} total
            </span>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Provider</th>
                <th>Verified</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}><div className="loading-center"><div className="spinner" /></div></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state">No users found</div></td></tr>
              ) : users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="avatar-group">
                      <div className="avatar">
                        {u.profilePictureUrl
                          ? <img src={u.profilePictureUrl} alt="" />
                          : initials(u)}
                      </div>
                      <div>
                        <div className="avatar-name">{u.firstName} {u.lastName}</div>
                        <div className="avatar-sub">{u._id.slice(-8)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{u.email || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{u.phoneNumber || '—'}</div>
                  </td>
                  <td>{providerBadge(u.firebaseProvider)}</td>
                  <td>
                    {u.phoneVerified || u.emailVerified
                      ? <span className="badge badge-green">✓ Verified</span>
                      : <span className="badge badge-yellow">Pending</span>}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setSelectedUser(u)}>
                        <Eye size={13} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: '0 4px' }}>…</span>}
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                </>
              ))}
            <button className="page-btn" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {selectedUser && (
        <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} onSave={handleSave} />
      )}
    </div>
  );
}
