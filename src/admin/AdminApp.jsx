import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import AdminLayout from './components/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import PagesListPage from './pages/PagesListPage';
import PageEditorPage from './pages/PageEditorPage';
import MediaLibraryPage from './pages/MediaLibraryPage';
import UsersPage from './pages/UsersPage';
import EventsListPage from './pages/EventsListPage';
import EventEditorPage from './pages/EventEditorPage';
import FormSubmissionsPage from './pages/FormSubmissionsPage';
import FormSubmissionDetailPage from './pages/FormSubmissionDetailPage';
import DocumentsPage from './pages/DocumentsPage';
import SurveyResultsPage from './pages/SurveyResultsPage';

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

  useEffect(() => {
    let meta = document.head.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');

    let fontLink = document.getElementById('material-symbols-font');
    if (!fontLink) {
      fontLink = document.createElement('link');
      fontLink.id = 'material-symbols-font';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0';
      document.head.appendChild(fontLink);
    }

    return () => {
      const existing = document.head.querySelector('meta[name="robots"]');
      if (existing) existing.remove();
    };
  }, []);

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

  const publicPaths = ['/admin/login', '/admin/accept-invite', '/admin/forgot-password', '/admin/reset-password'];
  if (!user && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route path="accept-invite" element={<AcceptInvitePage />} />
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="pages" element={<PagesListPage />} />
        <Route path="pages/:slug" element={<PageEditorPage />} />
        <Route path="events" element={<EventsListPage />} />
        <Route path="events/new" element={<EventEditorPage />} />
        <Route path="events/:id" element={<EventEditorPage />} />
        <Route path="forms" element={<FormSubmissionsPage />} />
        <Route path="forms/:id" element={<FormSubmissionDetailPage />} />
        <Route path="surveys/aisummit" element={<SurveyResultsPage />} />
        <Route path="media" element={<MediaLibraryPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="users" element={<UsersPage />} />
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
