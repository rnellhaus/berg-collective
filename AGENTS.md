<claude-mem-context>
# Memory Context

# [berg-react] recent context, 2026-08-06 8:21am EDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (22,817t read) | 960,204t work | 98% savings

### Jul 17, 2026
S1462 Debug and fix missing Luma link for network summer mixer event on bergcollective.org/events; discovered and fixed mobile navigation gaps during investigation (Jul 17 at 7:17 PM)
S1466 Debug missing luma link for Summer Mixer event; evolved into implementing branded event flyer display system (Jul 17 at 7:46 PM)
S1467 Confirmed generated flyers approach; delivered complete BERGHAUS mock platform with full user flow ready for team review (Jul 17 at 8:14 PM)
S1468 Updated admin interface from personal to organizational language; identified and deployed change; found remaining personal references in support queue awaiting direction (Jul 17 at 8:14 PM)
S1469 Standardized platform branding by removing personal names from admin interface and support queue; deployed changes and awaiting feedback before team sharing (Jul 17 at 8:17 PM)
S1470 User provided Neon organization ID (org-holy-thunder-81648945) for database connectivity; clarification needed on how to wire the database connection (Jul 17 at 8:20 PM)
S1471 Neon database provisioning and schema migration for berg-platform; established DATABASE_URL connection and verified all 7 tables created (Jul 17 at 8:37 PM)
S1472 User decided to hold real-data conversion work; pausing development for team review of mock demo before proceeding to live features (Jul 17 at 8:46 PM)
S1473 Change navigation group label from "General" to "Connect" in the nav bar (Jul 17 at 8:47 PM)
### Jul 18, 2026
S1476 Build meeting preparation materials to facilitate discussion on BERGHAUS UI/UX design choices — specifically typography and logo design rationale (Jul 18 at 11:50 AM)
### Aug 6, 2026
9806 1:29a 🔴 Fixed magic link destination for local development by setting PUBLIC_SITE_URL
9807 1:30a ✅ Local API server restarted with corrected magic-link environment variables
9808 " 🔵 Verified magic-link fix: local server now uses correct destination URL
9809 1:37a 🔵 Existing bingo game infrastructure at berg-react
9810 1:38a 🔵 Existing bingo game architecture and component structure mapped
9811 1:39a 🔵 Design token system and typography architecture defined via CSS custom properties and @fontsource
9812 " 🔵 Game lifecycle, QR scanning system, leaderboards, and admin control room fully implemented
9813 1:40a 🔵 Comprehensive responsive CSS architecture with layered z-indexing, animations, and dark-themed UI patterns
9814 " ✅ UX refinements: added Epilogue font, progress indicators, "pass" terminology, and improved sign-up copy
9815 1:41a ✅ Comprehensive CSS system refresh: typography consolidation, border-radius tokens, shadow scales, and refined component aesthetics
9816 1:42a ✅ Admin panel CSS refinement: Epilogue typography, consistent border-radius tokens, shadow hierarchy, and polished component styling
9817 " 🔵 Build verification successful: Epilogue font bundled, modules transformed, no linting errors
9818 1:47a 🔵 Mobile title layout debugging via Puppeteer inspection
9819 " 🔵 Enhanced mobile text layout debugging with per-line measurements
9820 1:55a 🔵 QR Code Scanner Player Code Implementation Research
9821 2:02a ⚖️ First-run onboarding with product screenshots planned for Berg Bingo
9822 " 🟣 Automated screenshot capture for Bingo onboarding flow
9823 2:03a 🟣 Onboarding screenshots successfully captured from live game flow
9824 " 🟣 Onboarding screenshot assets verified and optimized
9825 " 🟣 HowToPlayWalkthrough component with first-run onboarding implemented
9826 2:05a 🟣 Comprehensive CSS styling for walkthrough modal and help UI
9827 2:06a 🔵 Build and linting verification passed for onboarding implementation
9828 " 🔵 ESLint error found: setState called synchronously in effect body
9829 " 🔴 Fixed react-hooks/set-state-in-effect ESLint violation in HowToPlayWalkthrough
9830 " 🔵 ESLint validation passed after refactoring HowToPlayWalkthrough
9831 " 🟣 Visual regression tests added for onboarding walkthrough modal
9832 2:07a 🔵 Visual test timeout: walkthrough modal selector not found
9833 2:08a 🔴 Fixed test infrastructure: explicitly clear walkthrough localStorage when testing first-run
9834 " 🔵 Visual regression tests passed: onboarding walkthrough verified on all screen sizes
9835 2:09a 🟣 Onboarding Walkthrough Flow Testing Added
9836 2:10a 🟣 Onboarding Walkthrough Automated Testing Added
9837 " 🔵 Walkthrough Dialog Animation Timing Calibrated
9844 2:21a 🔵 Leaderboard shows top 10 connectors; finishers ranked by place; CSV export available
9845 2:22a 🔵 Leaderboard limits set to 25 (not 10); finish place assigned atomically via next_finish_place counter
9846 " 🔵 No congratulatory messaging for top 3/10 finishers; system shows ranking only
9847 " 🔵 Admin dashboard limits connection leaders to top 10; leaderboards show top 25; no tiered congratulations anywhere
9848 2:31a 🟣 E2E visual regression testing script for bingo winner announcement and leaderboard views
9849 2:33a 🟣 Networking Bingo game system implemented with admin controls, live leaderboard, and recap exports
9850 8:12a 🔵 Contact sharing and admin prompt-count controls already implemented
9851 " 🔵 Rate limiting and connection-code resilience patterns in place
9852 8:13a 🔵 System verification complete: all three features ready for 250-person live event
9853 " 🔵 Infrastructure platform limits verified for 250-person concurrent event
9854 8:14a 🔵 Production deployment verified ready; environment variables confirmed in place
9855 8:15a 🔵 Reciprocal-connection duplication bug in bingo connection tracking
9856 " 🔵 Email rate limiting risk at 250-concurrent signup scale
9857 " 🔵 Shared-IP rate limiting behavior under 250-concurrent test conditions
9858 " 🟣 Optional contact-sharing fields with player consent implemented and verified
9859 " 🟣 Admin prompt-count control with flexible range 3-50
9860 " 🔵 Infrastructure verified ready for 250-concurrent player test today
9861 " ⚖️ Production readiness recommendation: GO for today's test with documented mitigations

Access 960k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>