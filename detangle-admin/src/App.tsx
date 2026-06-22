import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Therapists from './pages/Therapists';
import Sessions from './pages/Sessions';
import MoodInsights from './pages/MoodInsights';
import AdminManagement from './pages/AdminManagement';
import Settings from './pages/Settings';
import Placeholder from './pages/Placeholder';
import Login from './pages/Login';
import { setAdminToken, getAdminToken, clearAdminToken } from './api/client';

function Layout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  return (
    <div className="layout">
      <Sidebar onLogout={onLogout} />
      <div className="main-content">
        <Topbar />
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Check if already logged in
    const token = getAdminToken();
    if (token) setAuthenticated(true);
  }, []);

  const handleLogin = (secret: string) => {
    setAdminToken(secret);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    clearAdminToken();
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/therapists" element={<Therapists />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/earnings" element={<Placeholder title="Earnings" />} />
          <Route path="/mood-insights" element={<MoodInsights />} />
          <Route path="/admin-management" element={<AdminManagement />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
