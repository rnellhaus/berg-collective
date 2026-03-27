/**
 * BERG Collective — Homepage
 *
 * Assembles all homepage sections in order:
 *   1. HeroSection
 *   2. PartnerMarquee
 *   3. MissionSection
 *   4. ImpactStats
 *   5. ProgramsSection
 *   6. CommunityImpact
 *   7. MembershipTeaser
 *   8. EventsSection
 *   9. CtaBanner
 */

import HeroSection      from './HeroSection';
import PartnerMarquee   from './PartnerMarquee';
import MissionSection   from './MissionSection';
import ImpactStats      from './ImpactStats';
import ProgramsSection  from './ProgramsSection';
import CommunityImpact  from './CommunityImpact';
import MembershipTeaser from './MembershipTeaser';
import EventsSection    from './EventsSection';
import CtaBanner        from './CtaBanner';

export default function HomePage() {
  return (
    <main id="main-content">
      <HeroSection />
      <PartnerMarquee />
      <MissionSection />
      <ImpactStats />
      <ProgramsSection />
      <CommunityImpact />
      <MembershipTeaser />
      <EventsSection />
      <CtaBanner />
    </main>
  );
}
