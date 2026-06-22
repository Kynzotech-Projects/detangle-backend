import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchMoodInsights } from '../api/admin';

const MOOD_COLORS: Record<string, string> = {
  very_pleasant: '#F39C12',
  pleasant: '#F1C40F',
  slightly_pleasant: '#B5D320',
  neutral: '#1ABC9C',
  slightly_unpleasant: '#E67E22',
  unpleasant: '#E74C3C',
  very_unpleasant: '#9B59B6',
};

const MOOD_LABELS: Record<string, string> = {
  very_pleasant: 'Very Pleasant',
  pleasant: 'Pleasant',
  slightly_pleasant: 'Slightly Pleasant',
  neutral: 'Neutral',
  slightly_unpleasant: 'Slightly Unpleasant',
  unpleasant: 'Unpleasant',
  very_unpleasant: 'Very Unpleasant',
};

interface MoodData {
  totalLogs: number;
  moodBreakdown: { _id: string; count: number }[];
  recentLogs: {
    _id: string;
    mood: string;
    loggedDate: string;
    influences?: string[];
    userId?: { firstName: string; lastName: string };
  }[];
}

export default function MoodInsights() {
  const [data, setData] = useState<MoodData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMoodInsights()
      .then(setData)
      .catch(() => setData({ totalLogs: 0, moodBreakdown: [], recentLogs: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Loading...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Failed to load</div>;

  const chartData = data.moodBreakdown.map(m => ({
    name: MOOD_LABELS[m._id] || m._id,
    value: m.count,
    color: MOOD_COLORS[m._id] || '#999',
  }));

  return (
    <div>
      <div className="page-header">
        <h1>Mood Insights</h1>
        <p>Platform-wide mood logging analytics (last 30 days)</p>
      </div>

      {/* Stats row */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#D19371' }}>{data.totalLogs}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Total Mood Logs</div>
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{data.moodBreakdown.length}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Mood Categories Used</div>
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#6366f1' }}>{data.recentLogs.length}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Recent Logs</div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>Mood Distribution (30 days)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent logs table */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>Recent Mood Logs</h3>
        {data.recentLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>No mood logs yet</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Mood</th>
                <th>Date</th>
                <th>Influences</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLogs.map(log => (
                <tr key={log._id}>
                  <td>{log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : '—'}</td>
                  <td>
                    <span className="badge" style={{ background: MOOD_COLORS[log.mood] || '#999', color: '#fff' }}>
                      {MOOD_LABELS[log.mood] || log.mood}
                    </span>
                  </td>
                  <td>{log.loggedDate || '—'}</td>
                  <td>{log.influences?.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
