import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Users, UserCheck, CalendarDays, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchDashboard } from '../api/admin';

interface DashboardData {
  stats: {
    totalUsers: number;
    usersThisMonth: number;
    usersLastMonth: number;
    usersGrowthPercent: string | null;
  };
  charts: {
    dailySignups: { label: string; value: number }[];
    weeklySignups: { label: string; value: number }[];
  };
  providerBreakdown: { _id: string; count: number }[];
  genderBreakdown: { _id: string; count: number }[];
  recentUsers: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
    profilePictureUrl?: string;
    createdAt: string;
    firebaseProvider: string;
  }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState<'1W' | '1M' | '3M'>('1W');

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const growth = data?.stats.usersGrowthPercent;
  const growthNum = growth ? parseFloat(growth) : null;

  // Fake extra stats for visual richness (replace with real data when available)
  const mockStats = [
    {
      label: 'Total Therapists',
      value: '142',
      change: '+12%',
      direction: 'up',
      icon: UserCheck,
      iconBg: '#fef3c7',
      iconColor: '#d97706',
    },
    {
      label: 'Active Clients',
      value: data ? data.stats.totalUsers.toLocaleString() : '—',
      change: growthNum !== null ? `${growthNum >= 0 ? '+' : ''}${growth}%` : '—',
      direction: growthNum !== null ? (growthNum >= 0 ? 'up' : 'down') : 'neutral',
      icon: Users,
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
    },
    {
      label: 'Sessions Today',
      value: '312',
      change: '-0.0%',
      direction: 'neutral',
      icon: CalendarDays,
      iconBg: '#fce7f3',
      iconColor: '#db2777',
    },
  ];

  const mockStats2 = [
    {
      label: 'Total Sessions (Month)',
      value: '8,405',
      change: '+9.2%',
      direction: 'up',
      dark: false,
    },
    {
      label: 'Platform Revenue',
      value: '₹1,24,500',
      change: '+15.3%',
      direction: 'up',
      dark: true,
    },
    {
      label: 'Therapist Payouts',
      value: '₹98,200',
      change: '-21%',
      direction: 'down',
      dark: false,
    },
  ];

  const topTherapists = [
    { name: 'Dr. Sarah Jenkins', specialty: 'Anxiety & Stress', sessions: 124 },
    { name: 'Michael Chen, LMFT', specialty: 'Couples Therapy', sessions: 98 },
    { name: 'Elena Rodriguez', specialty: 'Trauma Support', sessions: 85 },
  ];

  const peakSlots = [
    { label: 'Evenings (6PM - 9PM)', pct: 45 },
    { label: 'Lunch (12PM - 2PM)', pct: 30 },
    { label: 'Mornings (8AM - 11AM)', pct: 15 },
    { label: 'Afternoons (2PM - 5PM)', pct: 10 },
  ];

  const moodData = [
    { name: 'Improved', value: 68, color: '#10b981' },
    { name: 'Stable', value: 22, color: '#f59e0b' },
    { name: 'Declined', value: 10, color: '#ef4444' },
  ];

  if (loading) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Overview</h1>
            <p>Platform performance and wellness metrics.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-sm">
              <CalendarDays size={14} /> This Month
            </button>
            <button className="btn btn-primary btn-sm">
              <Download size={14} /> Export Report
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 1 stat cards ── */}
      <div className="stat-grid">
        {mockStats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card-header">
              <div className="stat-label">{s.label}</div>
              <div className="stat-icon" style={{ background: s.iconBg }}>
                <s.icon size={18} color={s.iconColor} />
              </div>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-change ${s.direction}`}>
              {s.direction === 'up' && <TrendingUp size={12} />}
              {s.direction === 'down' && <TrendingDown size={12} />}
              {s.change}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                vs last month
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2 stat cards ── */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {mockStats2.map((s) => (
          <div
            className={`stat-card ${s.dark ? 'card-dark' : ''}`}
            key={s.label}
            style={s.dark ? { background: '#1a2e1a' } : {}}
          >
            <div className="stat-label" style={s.dark ? { color: 'rgba(255,255,255,0.6)' } : {}}>
              {s.label}
            </div>
            <div className="stat-value" style={s.dark ? { color: 'white' } : {}}>
              {s.value}
            </div>
            <div className={`stat-change ${s.direction}`}>
              {s.direction === 'up' && <TrendingUp size={12} />}
              {s.direction === 'down' && <TrendingDown size={12} />}
              {s.change}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                vs last month
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="charts-row">
        {/* Sessions Over Time (area chart) */}
        <div className="card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Sessions Over Time</div>
              <div className="chart-subtitle">Daily session volume across all therapies</div>
            </div>
            <div className="chart-tabs">
              {(['1W', '1M', '3M'] as const).map((r) => (
                <button
                  key={r}
                  className={`chart-tab ${chartRange === r ? 'active' : ''}`}
                  onClick={() => setChartRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data?.charts.dailySignups || []}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a2e1a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1a2e1a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2d5a27"
                  strokeWidth={2}
                  fill="url(#colorVal)"
                  dot={{ r: 3, fill: '#2d5a27' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend (bar chart) */}
        <div className="card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Revenue Trend</div>
              <div className="chart-subtitle">Weekly breakdown</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.charts.weeklySignups || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#D29C7D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="bottom-row">
        {/* Top Therapists */}
        <div className="card">
          <div className="chart-header" style={{ marginBottom: 12 }}>
            <div className="chart-title">Top Therapists</div>
            <a href="/therapists" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              View All
            </a>
          </div>
          {topTherapists.map((t) => (
            <div className="therapist-row" key={t.name}>
              <div className="avatar-group">
                <div className="avatar">{t.name[0]}</div>
                <div>
                  <div className="avatar-name">{t.name}</div>
                  <div className="avatar-sub">{t.specialty}</div>
                </div>
              </div>
              <div className="therapist-sessions">
                {t.sessions}
                <span>sessions</span>
              </div>
            </div>
          ))}
        </div>

        {/* Peak Time Slots */}
        <div className="card">
          <div className="chart-header" style={{ marginBottom: 16 }}>
            <div className="chart-title">Peak Time Slots</div>
          </div>
          {peakSlots.map((p) => (
            <div className="peak-row" key={p.label}>
              <div className="peak-row-header">
                <span className="peak-row-label">{p.label}</span>
                <span className="peak-row-pct">{p.pct}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${p.pct}%`, background: p.pct > 30 ? '#ef4444' : p.pct > 15 ? '#f59e0b' : '#10b981' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Aggregate Mood Trends */}
        <div className="card">
          <div className="chart-header" style={{ marginBottom: 8 }}>
            <div className="chart-title">Aggregate Mood Trends</div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <div className="donut-wrapper">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={moodData}
                  innerRadius={46}
                  outerRadius={65}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {moodData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mood-pct">68%</div>
          <div className="mood-label">IMPROVED</div>
          <div className="donut-legend" style={{ marginTop: 12 }}>
            {moodData.map((m) => (
              <div className="donut-legend-item" key={m.name}>
                <div className="donut-dot" style={{ background: m.color }} />
                <span>{m.name} ({m.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
