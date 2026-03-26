import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';

const HomePage = lazy(() => import('./pages/HomePage/HomePage'));
const AboutPage = lazy(() => import('./pages/AboutPage/AboutPage'));
const ProgramsPage = lazy(() => import('./pages/ProgramsPage/ProgramsPage'));
const ChaptersPage = lazy(() => import('./pages/ChaptersPage/ChaptersPage'));
const EventsPage = lazy(() => import('./pages/EventsPage/EventsPage'));
const ImpactPage = lazy(() => import('./pages/ImpactPage/ImpactPage'));
const DonatePage = lazy(() => import('./pages/DonatePage/DonatePage'));
const JoinPage = lazy(() => import('./pages/JoinPage/JoinPage'));
const ContactPage = lazy(() => import('./pages/ContactPage/ContactPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage/NotFoundPage'));

function Loading() {
  return <div style={{ padding: '100px 24px', textAlign: 'center', color: '#8e5f57' }}>Loading...</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <main id="main-content" role="main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/chapters" element={<ChaptersPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
