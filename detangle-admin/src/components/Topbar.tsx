import { Search, Bell } from 'lucide-react';

export default function Topbar() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <header className="topbar">
      <div className="topbar-search">
        <Search size={14} color="#9ca3af" />
        <input placeholder="Search therapists, clients, or sessions..." />
      </div>
      <div className="topbar-right">
        <Bell size={18} color="#6b7280" style={{ cursor: 'pointer' }} />
        <div className="topbar-date">
          <div className="topbar-date-day">{dateStr}</div>
          <div>{timeStr}</div>
        </div>
      </div>
    </header>
  );
}
