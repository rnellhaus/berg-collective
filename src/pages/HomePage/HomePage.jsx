import usePageMeta from '../../hooks/usePageMeta';
import HomePage from '../../components/HomePage/HomePage';

export default function HomePageWrapper() {
  usePageMeta(null, 'BERG Collective — Empowering Black excellence through leadership development, career advancement, and community building.');
  return <HomePage />;
}
