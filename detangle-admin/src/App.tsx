import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Therapists from './pages/Therapists';
import Placeholder from './pages/Placeholder';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/therapists" element={<Therapists />} />
          <Route path="/sessions" element={<Placeholder title="Sessions" />} />
          <Route path="/earnings" element={<Placeholder title="Earnings" />} />
          <Route path="/mood-insights" element={<Placeholder title="Mood Insights" />} />
          <Route path="/admin-management" element={<Placeholder title="Admin Management" />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
