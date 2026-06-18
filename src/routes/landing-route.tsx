/**
 * src/routes/landing-route.tsx — Route wrapper for /
 *
 * Lightweight shell that renders LandingPage.
 * All business logic and UI live in pages/landing/landing-page.tsx.
 */

import LandingPage from "@/pages/landing/landing-page";

export default function LandingRoute() {
  return <LandingPage />;
}
