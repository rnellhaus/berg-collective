import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/AdminLayout';
import DashboardPage from './pages/DashboardPage';

function ComingSoon({ label }) {
  return (
    <div style={{ color: '#6b5752', fontStyle: 'italic', padding: '12px 0' }}>
      {label} — coming soon.
    </div>
  );
}

function AdminRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fbfaf9',
          color: '#8b3223',
          fontSize: '0.95rem',
        }}
      >
        Loading…
      </div>
    );
  }

  if (!user && location.pathname !== '/admin/login') {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="pages" element={<ComingSoon label="Pages" />} />
        <Route path="pages/:slug" element={<ComingSoon label="Page editor" />} />
        <Route path="events" element={<ComingSoon label="Events" />} />
        <Route path="events/new" element={<ComingSoon label="New event" />} />
        <Route path="events/:id" element={<ComingSoon label="Event editor" />} />
        <Route path="media" element={<ComingSoon label="Media Library" />} />
        <Route path="users" element={<ComingSoon label="Users" />} />
        <Route path="settings" element={<ComingSoon label="Settings" />} />
      </Route>
    </Routes>
  );
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <AdminRoutes />
    </AuthProvider>
  );
}
