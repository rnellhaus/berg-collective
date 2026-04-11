import usePageMeta from '../../hooks/usePageMeta';
import HomePage from '../../components/HomePage/HomePage';

export default function HomePageWrapper() {
  usePageMeta(
    null,
    'BERG Collective is a 501(c)(3) network for Black Employee Resource Groups — connecting ERGs across tech, sports, and entertainment to build leadership, community impact, and generational wealth.',
    { path: '/' }
  );
  return <HomePage />;
}
