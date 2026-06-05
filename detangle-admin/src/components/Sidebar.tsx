import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, CalendarDays,
  IndianRupee, Brain, ShieldCheck, Settings, LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/therapists', icon: UserCheck, label: 'Therapists' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/sessions', icon: CalendarDays, label: 'Sessions' },
  { to: '/earnings', icon: IndianRupee, label: 'Earnings' },
  { to: '/mood-insights', icon: Brain, label: 'Mood Insights' },
];

const systemItems = [
  { to: '/admin-management', icon: ShieldCheck, label: 'Admin Management' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  onLogout?: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Detangle</div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        <div className="sidebar-section-label">System</div>

        {systemItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-avatar">A</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-user-name">Admin User</div>
          <div className="sidebar-user-email">admin@detangle.in</div>
        </div>
        <LogOut
          size={14}
          style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, cursor: 'pointer' }}
          onClick={onLogout}
        />
      </div>
    </aside>
  );
}
