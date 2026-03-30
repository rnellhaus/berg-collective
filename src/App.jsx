import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import FooterNew from './components/FooterNew/FooterNew';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const HomePage = lazy(() => import('./pages/HomePage/HomePage'));
const AboutPage = lazy(() => import('./pages/AboutPage/AboutPage'));
const ProgramsPage = lazy(() => import('./pages/ProgramsPage/ProgramsPage'));
const ChaptersPage = lazy(() => import('./pages/ChaptersPage/ChaptersPage'));
const EventsPage = lazy(() => import('./pages/EventsPage/EventsPage'));
const ImpactPage = lazy(() => import('./pages/ImpactPage/ImpactPage'));
const DonatePage = lazy(() => import('./pages/DonatePage/DonatePage'));
const JoinPage = lazy(() => import('./pages/JoinPage/JoinPage'));
const ContactPage = lazy(() => import('./pages/ContactPage/ContactPage'));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage/NewsletterPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage/NotFoundPage'));
const PartnershipsPage = lazy(() => import('./pages/PartnershipsPage/PartnershipsPage'));
const VolunteerPage = lazy(() => import('./pages/VolunteerPage/VolunteerPage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function Loading() {
  return <div style={{ padding: '100px 24px', textAlign: 'center', color: '#8e5f57' }}>Loading...</div>;
}

function PublicLayout() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main id="main-content" role="main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/chapters" element={<ChaptersPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/partnerships" element={<PartnershipsPage />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/membership" element={<JoinPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/volunteer" element={<VolunteerPage />} />
            <Route path="/newsletter" element={<NewsletterPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <FooterNew />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/*" element={<PublicLayout />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
