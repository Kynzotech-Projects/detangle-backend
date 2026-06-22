import { useEffect, useState } from 'react';
import { Video, Phone, MessageCircle } from 'lucide-react';
import { fetchSessions } from '../api/admin';

interface Session {
  _id: string;
  userId?: { firstName: string; lastName: string };
  therapistId?: { firstName: string; lastName: string };
  sessionType: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, [page, filter]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchSessions({ page, limit: 15, status: filter });
      setSessions(data.sessions);
      setTotalPages(data.pagination.totalPages);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { confirmed: 'badge-blue', completed: 'badge-green', pending: 'badge-yellow', cancelled: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const typeIcon = (t: string) => {
    if (t === 'audio') return <Phone size={14} />;
    if (t === 'message') return <MessageCircle size={14} />;
    return <Video size={14} />;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Sessions</h1>
        <p>All therapy sessions across the platform</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['all', 'confirmed', 'completed', 'pending', 'cancelled'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilter(s); setPage(1); }}>
              {s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading...</div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>No sessions found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Therapist</th>
                <th>Type</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s._id}>
                  <td>{s.userId ? `${s.userId.firstName} ${s.userId.lastName}` : '—'}</td>
                  <td>{s.therapistId ? `Dr. ${s.therapistId.firstName} ${s.therapistId.lastName}` : '—'}</td>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{typeIcon(s.sessionType)} {s.sessionType}</span></td>
                  <td>{new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>{s.startTime} - {s.endTime}</td>
                  <td>{statusBadge(s.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span style={{ padding: '6px 12px', fontSize: 13 }}>Page {page} of {totalPages}</span>
            <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
